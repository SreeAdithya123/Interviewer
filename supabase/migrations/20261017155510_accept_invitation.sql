-- Auth foundation (Phase 2 follow-on): accept_invitation(p_token) lets a
-- signed-in user with no college yet redeem a college's invitation token
-- themselves, from apps/web/app/api/invitations/accept/route.ts via
-- `supabase.rpc('accept_invitation', { p_token })` under the user's own
-- session (not the service role — this environment has no service-role
-- key).
--
-- Why this has to be SECURITY DEFINER: guard_profile_privilege_columns()
-- (migration 20261015120001_core_tenancy.sql) blocks any plain
-- authenticated UPDATE of profiles.role/college_id/batch_id unless the
-- caller is already a platform_admin — a brand-new student obviously isn't,
-- so a direct `.update(...)` call, or an RPC that just ran that UPDATE as
-- the authenticated role, would hit the same guard and fail. This function
-- instead runs as its owner (security definer + `set search_path = public`,
-- so it can't be hijacked by a search_path trick), which both Postgres and
-- the guard trigger treat as a privileged, trusted context (the trigger's
-- own `auth.uid() is null` escape hatch is for exactly this: migration
-- contexts and SECURITY DEFINER functions, not real end-user JWTs). That is
-- safe here specifically because this function does not do a blind column
-- write — it looks up one invitations row by its unique, 32-random-byte
-- token, checks its status and expiry, and only then writes the CALLING
-- user's own profiles row (always auth.uid(), never a client-supplied id).
--
-- Deliberately not enforced: that invitations.email matches the caller's
-- own auth email. The token is the actual bearer secret an invite
-- link/code carries (unguessable, single-use, revocable); requiring an
-- exact email match on top would break the ordinary case of a college
-- admin inviting a student at one address who then signs up with another.
-- Recorded in docs/DECISIONS.md.
create or replace function public.accept_invitation(p_token text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invitation.';
  end if;

  select * into v_invitation
  from public.invitations
  where token = p_token
  for update;

  if v_invitation.id is null then
    raise exception 'Invalid invitation code.';
  end if;

  if v_invitation.status = 'accepted' then
    raise exception 'This invitation has already been used.';
  end if;

  if v_invitation.status = 'revoked' then
    raise exception 'This invitation has been revoked.';
  end if;

  if v_invitation.status = 'expired' or v_invitation.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_invitation.id;
    raise exception 'This invitation has expired.';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();

  if v_profile.college_id is not null then
    raise exception 'Your account is already linked to a college.';
  end if;

  update public.profiles
  set role = v_invitation.role,
      college_id = v_invitation.college_id,
      batch_id = v_invitation.batch_id,
      onboarded_at = coalesce(onboarded_at, now())
  where id = auth.uid()
  returning * into v_profile;

  update public.invitations
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = v_invitation.id;

  return v_profile;
end;
$$;

-- The authenticated role calls this via supabase.rpc(...); nobody else
-- needs to (anon has no session to accept an invite with; service_role
-- already bypasses grants and RLS entirely and doesn't need EXECUTE).
-- `revoke ... from public` alone is not enough: Supabase projects default
-- new functions' EXECUTE to anon/authenticated/service_role directly (via
-- ALTER DEFAULT PRIVILEGES), not through the PUBLIC pseudo-role, so anon
-- needs its own explicit revoke.
revoke all on function public.accept_invitation(text) from public;
revoke all on function public.accept_invitation(text) from anon;
grant execute on function public.accept_invitation(text) to authenticated;
