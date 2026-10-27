-- svā labs — waitlist
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run
-- (or `supabase db push` if you use the Supabase CLI).

create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id                 uuid primary key default gen_random_uuid(),
  name               text        not null check (char_length(name) between 1 and 80),
  email              text        not null check (char_length(email) between 3 and 254),
  marketing_consent  boolean     not null default false,
  consent_timestamp  timestamptz,
  consent_version    text,
  source             text        not null default 'sva-coming-soon' check (char_length(source) <= 64),
  created_at         timestamptz not null default now(),

  -- Emails are stored normalized (trimmed, lower-case) by the API;
  -- the check makes that a database guarantee, the unique constraint dedupes.
  constraint waitlist_email_normalized check (email = lower(btrim(email))),
  constraint waitlist_email_unique unique (email),
  constraint waitlist_consent_has_time check (not marketing_consent or consent_timestamp is not null)
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

comment on table public.waitlist is 'svā labs coming-soon waitlist. Written only by the server (service role).';

-- Lock it down: RLS on, no policies → the public anon/authenticated roles can
-- neither read nor write. Only the service role (used server-side) bypasses RLS.
alter table public.waitlist enable row level security;
alter table public.waitlist force row level security;

revoke all on table public.waitlist from anon, authenticated;
grant select, insert on table public.waitlist to service_role;
