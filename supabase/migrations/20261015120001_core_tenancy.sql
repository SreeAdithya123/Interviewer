-- Phase 2 data model: core tenancy.
-- Tables: colleges, batches, profiles, invitations.
-- See docs/BUILD_SPEC.md Part 4.1 (roles and tenancy) and Part 5 (data model).
--
-- Written and self-reviewed without a live Postgres/Supabase instance
-- available in this environment. See supabase/migrations/README.md for
-- exactly what was and wasn't verified before this applies to a real
-- project.

-- pgcrypto gives us gen_random_uuid() (uuid primary keys) and
-- gen_random_bytes() (invitation tokens below). Supabase projects ship it
-- enabled by default; this makes that explicit and is safe to re-run.
create extension if not exists pgcrypto;

-- Generic "bump updated_at on every UPDATE" trigger function, reused by
-- every table in this migration and later ones that has an updated_at
-- column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- colleges
-- ---------------------------------------------------------------------------
create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text,
  state text,
  website_url text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger colleges_set_updated_at
  before update on public.colleges
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- batches: a college's cohort, e.g. "2026 B.Tech CSE".
-- ---------------------------------------------------------------------------
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  department text,
  graduation_year int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, name)
);

create index batches_college_id_idx on public.batches(college_id);

create trigger batches_set_updated_at
  before update on public.batches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row, the spine described in Part 4.2.
-- id intentionally equals auth.users.id (and therefore auth.uid()).
--
-- NOTE: a brand-new student signs up (email OTP / Google) before any
-- college/batch is known — that only gets filled in once they accept a
-- college's invitation. So college_id/batch_id are nullable even for
-- role = 'student'; Part 4.1's "every student belongs to one college and
-- one batch" is an onboarding-completion invariant enforced by the
-- application (when accepting an invite), not a table CHECK constraint,
-- because a CHECK here would reject the normal signup-before-onboarding
-- row that handle_new_user() below has to be able to insert.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student'
    check (role in ('student', 'college_admin', 'platform_admin')),
  college_id uuid references public.colleges(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  department text,
  graduation_year int,
  full_name text,
  email text not null unique,
  phone text,
  avatar_url text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_college_id_idx on public.profiles(college_id);
create index profiles_batch_id_idx on public.profiles(batch_id);
create index profiles_role_idx on public.profiles(role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Bootstraps a profiles row for every new Supabase auth user. Defined
-- security definer so the insert succeeds regardless of RLS (added later,
-- in 0007); it also runs as the table owner, which Postgres always exempts
-- from a table's row level security unless FORCE ROW LEVEL SECURITY is set
-- (it is not, here), so this keeps working once 0007 enables RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Blocks a client-authenticated UPDATE from self-escalating role, college_id
-- or batch_id (e.g. a direct PATCH .../profiles?id=eq.<self> through the
-- API). auth.uid() reads the caller's JWT "sub" claim; it is null for any
-- write that isn't going through PostgREST with an end-user JWT (the
-- service role, a raw SQL/migration session, or this trigger's own table-
-- owner context), so those are left alone and only a real end-user session
-- is checked.
create or replace function public.guard_profile_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into acting_role from public.profiles where id = auth.uid();

  if acting_role = 'platform_admin' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.college_id is distinct from old.college_id
     or new.batch_id is distinct from old.batch_id then
    raise exception 'only a platform_admin may change role, college_id or batch_id';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privilege_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_columns();

-- ---------------------------------------------------------------------------
-- invitations: a college admin invites students (CSV upload or invite
-- link); platform_admin can invite anyone. Acceptance (matching the token,
-- then setting the invitee's profiles.role/college_id/batch_id) is an
-- application/engine flow using the service role, not a client-side table
-- policy — before accepting, the invitee isn't yet the authenticated owner
-- of this row.
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  email text not null,
  role text not null default 'student'
    check (role in ('student', 'college_admin')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index invitations_college_id_idx on public.invitations(college_id);
create index invitations_email_idx on public.invitations(email);

-- Only one live (pending) invite per college+email at a time.
create unique index invitations_pending_college_email_idx
  on public.invitations(college_id, email)
  where status = 'pending';
