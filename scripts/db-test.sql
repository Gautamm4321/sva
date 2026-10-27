-- Verifies the waitlist migration against a Supabase-like role setup.
-- Run on a THROWAWAY database only:
--   psql -v ON_ERROR_STOP=1 -f scripts/supabase-roles.sql -f supabase/migrations/*.sql -f scripts/db-test.sql
\set QUIET on
\pset format unaligned
\pset tuples_only on

-- 1. Service role can insert; duplicate email is ignored (0 rows), not an error.
set role service_role;
insert into public.waitlist (name, email, marketing_consent, consent_timestamp, source)
  values ('Asha', 'asha@example.com', true, now(), 'sva-coming-soon');
with ins as (
  insert into public.waitlist (name, email, marketing_consent, consent_timestamp)
  values ('Asha again', 'asha@example.com', true, now())
  on conflict (email) do nothing returning id
) select 'T1 duplicate ignored: ' || (count(*) = 0)::text from ins;
select 'T1 rows for email: ' || count(*) from public.waitlist where email = 'asha@example.com';
reset role;

-- 2. Un-normalized email is rejected by the database itself.
do $$ begin
  insert into public.waitlist (name, email) values ('X', 'Mixed@Example.com');
  raise notice 'T2 FAIL: mixed-case accepted';
exception when check_violation then raise notice 'T2 mixed-case rejected: true';
end $$;

-- 3. Consent without a timestamp is rejected.
do $$ begin
  insert into public.waitlist (name, email, marketing_consent) values ('Y', 'y@example.com', true);
  raise notice 'T3 FAIL: consent without timestamp accepted';
exception when check_violation then raise notice 'T3 consent needs timestamp: true';
end $$;

-- 4. Public roles can neither read nor write.
set role anon;
do $$ begin
  perform 1 from public.waitlist limit 1;
  raise notice 'T4 FAIL: anon can select';
exception when insufficient_privilege then raise notice 'T4 anon select denied: true';
end $$;
do $$ begin
  insert into public.waitlist (name, email) values ('Z', 'z@example.com');
  raise notice 'T4 FAIL: anon can insert';
exception when insufficient_privilege then raise notice 'T4 anon insert denied: true';
end $$;
reset role;
set role authenticated;
do $$ begin
  perform 1 from public.waitlist limit 1;
  raise notice 'T5 FAIL: authenticated can select';
exception when insufficient_privilege then raise notice 'T5 authenticated select denied: true';
end $$;
reset role;

-- 6. RLS is on.
select 'T6 rls enabled: ' || relrowsecurity::text from pg_class where oid = 'public.waitlist'::regclass;
