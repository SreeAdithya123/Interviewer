-- Phase 2 data model: the curated knowledge base behind the prep
-- assistant's retrieval, and the chat feature built on it.
-- Tables: kb_documents, kb_chunks (pgvector), chat_sessions, chat_messages.
-- See docs/BUILD_SPEC.md Part 4.6 (prep assistant) and Part 4.8 (knowledge
-- base review workflow).
--
-- kb_documents and kb_chunks are platform-curated content, not user- or
-- college-scoped, so they are deliberately left without row level security
-- in 0007 — see that file's header comment for their access model instead.

-- pgvector, for kb_chunks.embedding and its similarity index. Requires
-- pgvector >= 0.5.0 for the hnsw index type used below; Supabase has
-- shipped that for a while, but this was not checked against a live
-- project (see supabase/migrations/README.md).
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- kb_documents
-- ---------------------------------------------------------------------------
create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text
    check (category is null or category in (
      'senior_experience', 'company_pattern', 'topic_resource', 'placement_info'
    )),
  company_name text,
  source_url text,
  raw_text text not null,
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'retired')),
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kb_documents_status_idx on public.kb_documents(status);

create trigger kb_documents_set_updated_at
  before update on public.kb_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- kb_chunks: created by the embedding pipeline once a document is approved.
-- embedding is sized for the current Gemini text embedding model (768
-- dimensions; keep in sync with services/engine/app/config/models.yaml).
-- pgvector fixes the dimension per column, so switching to a
-- differently-sized embedding model later needs either a column rebuild or
-- a fresh column plus a backfill, not just a config change.
-- ---------------------------------------------------------------------------
create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768),
  token_count int,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index kb_chunks_document_id_idx on public.kb_chunks(document_id);

-- Cosine-distance HNSW index for the engine's similarity search.
create index kb_chunks_embedding_idx
  on public.kb_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- chat_sessions / chat_messages: the prep assistant's conversation history.
-- college_id is denormalized from the owning profile, matching interviews.
-- ---------------------------------------------------------------------------
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete set null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_sessions_user_id_idx on public.chat_sessions(user_id);

create trigger chat_sessions_set_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

-- citations is '[]' for every user message, and for an assistant message
-- that declined to answer (Part 4.6: "it says it doesn't have reliable
-- information... and suggests related topics").
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]',
  declined boolean not null default false,
  model_id text,
  created_at timestamptz not null default now()
);

create index chat_messages_session_id_idx on public.chat_messages(session_id);
