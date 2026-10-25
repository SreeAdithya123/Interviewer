-- Migration: Add extended profile details (bio, career preferences, socials)
-- and biometric face verification credentials (id_photo_url, face_embedding, id_verified_at).

alter table public.profiles
  add column if not exists bio text,
  add column if not exists target_role text,
  add column if not exists target_companies text,
  add column if not exists linkedin_url text,
  add column if not exists github_url text,
  add column if not exists portfolio_url text,
  add column if not exists id_photo_url text,
  add column if not exists face_embedding jsonb,
  add column if not exists id_verified_at timestamptz;
