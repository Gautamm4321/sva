-- Minimal stand-in for the roles and default grants a Supabase project has,
-- so the migration can be tested on a plain local Postgres. Test DBs only.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase grants table privileges to the API roles by default; the migration must revoke them.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
