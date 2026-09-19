-- Test-only shim so the RLS policies written for Supabase run on a plain
-- Postgres. On Supabase the auth schema, auth.uid() and the authenticated
-- role already exist; never apply this file there. Our ids are text, so the
-- shim returns text; the policies cast auth.uid()::text either way.
create schema if not exists auth;
create or replace function auth.uid() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
grant usage on schema public to authenticated;
