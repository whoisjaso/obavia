-- Obavia persistence, slice S00P (ADR-0008, ADR-0015).
-- Object model per docs/architecture/DOMAIN.md, restricted to what the
-- current slices consume. Text ids keep the app's existing id scheme.
-- RLS is enabled on every table. The server talks to Postgres with the
-- service role and enforces authorization in lib/store; RLS is the second
-- wall for any future direct client access (auth.uid() = membership user id
-- for staff, = person id for customers).

create table if not exists orgs (
  id text primary key,
  name text not null,
  city text not null,
  gdn text,
  verified_by_founder_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  user_id text not null,
  org_id text not null references orgs(id),
  role text not null check (role in ('owner','manager','title_clerk','employee')),
  primary key (user_id, org_id)
);

create table if not exists people (
  id text primary key,
  name text not null,
  phone text,
  email text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en','es'))
);

create table if not exists deals (
  id text primary key,
  org_id text not null references orgs(id),
  vin text not null,
  year int,
  make text,
  model text,
  decode_source text not null default 'manual' check (decode_source in ('vpic','manual')),
  buyer_id text not null references people(id),
  sale_type text not null default 'cash_retail',
  created_at timestamptz not null default now(),
  created_by text not null,
  states jsonb not null,
  last_check_id text,
  review_eligible_at timestamptz
);
create index if not exists deals_org_created on deals(org_id, created_at desc);

create table if not exists documents (
  id text primary key,
  deal_id text not null references deals(id),
  kind text not null,
  version int not null,
  file_name text not null,
  sha256 text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by text not null,
  supersedes_id text,
  executed boolean not null default false,
  unique (deal_id, kind, version)
);

create table if not exists checks (
  id text primary key,
  deal_id text not null references deals(id),
  ran_at timestamptz not null default now(),
  rule_set_version text not null,
  verdict text not null check (verdict in ('NO_KNOWN_BLOCKER','REVIEW_REQUIRED','BLOCKING_ISSUE_DETECTED')),
  findings jsonb not null
);

create table if not exists relationships (
  id text primary key,
  org_id text not null references orgs(id),
  person_id text not null references people(id),
  deal_id text not null references deals(id),
  status text not null check (status in ('invited','accepted','declined','expired','disputed')),
  invite_token text not null unique,
  invite_channel text not null check (invite_channel in ('email','sms')),
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz
);
create index if not exists relationships_deal on relationships(deal_id, invited_at desc);
create index if not exists relationships_person on relationships(person_id);

create table if not exists deliveries (
  id text primary key,
  deal_id text not null references deals(id),
  at timestamptz not null default now(),
  evidence_class text not null check (evidence_class in ('photo','signed_receipt','dealer_attestation')),
  note text
);

create table if not exists registration_evidence (
  id text primary key,
  deal_id text not null references deals(id),
  at timestamptz not null default now(),
  kind text not null check (kind in ('webdealer_receipt','county_receipt','other')),
  file_name text not null
);

create table if not exists audit_events (
  id text primary key,
  at timestamptz not null default now(),
  actor_id text not null,
  deal_id text references deals(id),
  action text not null,
  detail jsonb
);
create index if not exists audit_deal on audit_events(deal_id, at desc);

create table if not exists inquiries (
  id text primary key,
  org_id text not null references orgs(id),
  created_at timestamptz not null default now(),
  name text not null,
  contact text not null,
  locale text not null default 'en' check (locale in ('en','es')),
  vehicle text not null default '',
  payment_low int not null default 0,
  payment_high int not null default 0,
  down_payment int not null default 0,
  credit_band text not null default '',
  status text not null default 'new' check (status in ('new','contacted'))
);
create index if not exists inquiries_org_created on inquiries(org_id, created_at desc);

-- ---------- row-level security ----------
alter table orgs enable row level security;
alter table memberships enable row level security;
alter table people enable row level security;
alter table deals enable row level security;
alter table documents enable row level security;
alter table checks enable row level security;
alter table relationships enable row level security;
alter table deliveries enable row level security;
alter table registration_evidence enable row level security;
alter table audit_events enable row level security;
alter table inquiries enable row level security;

-- Helper: orgs the current auth user belongs to. security definer so the
-- policy can read memberships without a recursive policy check.
create or replace function obavia_my_orgs() returns setof text
language sql stable security definer set search_path = public as $$
  select org_id from memberships where user_id = auth.uid()::text
$$;

-- Helper: deals the current auth user may read: staff of the deal's org, or
-- the customer with an accepted/disputed relationship.
create or replace function obavia_my_deals() returns setof text
language sql stable security definer set search_path = public as $$
  select d.id from deals d where d.org_id in (select obavia_my_orgs())
  union
  select r.deal_id from relationships r
    where r.person_id = auth.uid()::text and r.status in ('accepted','disputed')
$$;

drop policy if exists orgs_read on orgs;
create policy orgs_read on orgs for select to authenticated
  using (id in (select obavia_my_orgs()) or id in (select org_id from relationships where person_id = auth.uid()::text));

drop policy if exists memberships_read on memberships;
create policy memberships_read on memberships for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists people_read on people;
create policy people_read on people for select to authenticated
  using (id = auth.uid()::text or id in (select buyer_id from deals where id in (select obavia_my_deals())));

drop policy if exists deals_read on deals;
create policy deals_read on deals for select to authenticated
  using (id in (select obavia_my_deals()));

drop policy if exists documents_read on documents;
create policy documents_read on documents for select to authenticated
  using (deal_id in (select obavia_my_deals()));

drop policy if exists checks_read on checks;
create policy checks_read on checks for select to authenticated
  using (deal_id in (select obavia_my_deals()));

drop policy if exists relationships_read on relationships;
create policy relationships_read on relationships for select to authenticated
  using (org_id in (select obavia_my_orgs()) or person_id = auth.uid()::text);

drop policy if exists deliveries_read on deliveries;
create policy deliveries_read on deliveries for select to authenticated
  using (deal_id in (select obavia_my_deals()));

drop policy if exists registration_read on registration_evidence;
create policy registration_read on registration_evidence for select to authenticated
  using (deal_id in (select obavia_my_deals()));

-- Audit is staff-only: buyers see states and evidence, not the internal log.
drop policy if exists audit_read on audit_events;
create policy audit_read on audit_events for select to authenticated
  using (deal_id in (select id from deals where org_id in (select obavia_my_orgs())));

drop policy if exists inquiries_read on inquiries;
create policy inquiries_read on inquiries for select to authenticated
  using (org_id in (select obavia_my_orgs()));

-- No insert/update/delete policies for authenticated: every write goes through
-- the server (service role), where lib/store enforces authorization and
-- records audit events. Executed documents are immutable by trigger.
create or replace function obavia_documents_immutable() returns trigger
language plpgsql as $$
begin
  if old.executed then
    raise exception 'executed document versions are immutable';
  end if;
  return new;
end $$;
drop trigger if exists documents_immutable on documents;
create trigger documents_immutable before update or delete on documents
  for each row execute function obavia_documents_immutable();
