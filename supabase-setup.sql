-- Run this in Supabase SQL Editor for the JAA Survey project.
create extension if not exists pgcrypto;

create table if not exists public.survey_submissions (
  id uuid primary key default gen_random_uuid(),
  public_name text not null check (char_length(public_name) between 1 and 90),
  answers jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  schema_version integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.survey_submissions enable row level security;
revoke all on public.survey_submissions from anon, authenticated;
grant insert (public_name, answers, is_public, schema_version) on public.survey_submissions to anon, authenticated;
grant select (id, public_name, answers, is_public, schema_version, created_at) on public.survey_submissions to anon, authenticated;

drop policy if exists "Anonymous can submit survey" on public.survey_submissions;
create policy "Anonymous can submit survey"
  on public.survey_submissions for insert to anon, authenticated
  with check (char_length(public_name) between 1 and 90);

drop policy if exists "Only public submissions are readable" on public.survey_submissions;
create policy "Only public submissions are readable"
  on public.survey_submissions for select to anon, authenticated
  using (is_public = true);

-- No anonymous UPDATE or DELETE policies: submitted records cannot be changed
-- or removed by public visitors. Manage moderation/export in Supabase Studio.
