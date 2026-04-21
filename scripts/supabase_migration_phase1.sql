-- ============================================================
-- Phase 1: Supabase Schema for QMS Records Migration
-- Replaces Google Sheets as the single source of truth
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- Table: records (replaces Google Sheets "Data" sheet)
-- ============================================================
create table if not exists public.records (
  id uuid default uuid_generate_v4() primary key,
  row_index integer not null,            -- Original sheet row number (1-indexed)
  category text not null default '',      -- Column A: Sales, Operations, Quality, etc.
  code text not null,                     -- Column B: F/08, F/12, etc.
  record_name text not null default '',    -- Column C: Order Form, etc.
  description text not null default '',   -- Column D
  when_to_fill text not null default '',   -- Column E
  template_link text not null default '',  -- Column F
  folder_link text not null default '',    -- Column G
  last_serial text not null default '',    -- Column H
  last_file_date text not null default '', -- Column I
  days_ago text not null default '',       -- Column J
  next_serial text not null default '',    -- Column K
  audit_status text not null default '',   -- Column L
  reviewed boolean not null default false,  -- Column R
  reviewed_by text not null default '',    -- Column N
  review_date text not null default '',    -- Column O
  file_reviews jsonb not null default '{}', -- Column P: JSON blob
  -- Computed/enriched fields
  audit_issues text[] default '{}',        -- Parsed audit issues from file_reviews
  record_status text not null default 'pending', -- Parsed status from file_reviews
  last_audit_date timestamptz,            -- Parsed from file_reviews
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(code)                             -- Each form code is unique
);

-- ============================================================
-- Table: audit_log (tracks all record changes)
-- ============================================================
create table if not exists public.audit_log (
  id uuid default uuid_generate_v4() primary key,
  record_id uuid not null references public.records(id) on delete cascade,
  action text not null check (action in ('create', 'update', 'delete', 'status_change')),
  changed_fields jsonb not null default '{}',
  previous_values jsonb not null default '{}',
  new_values jsonb not null default '{}',
  performed_by text not null default 'system',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_records_code on public.records(code);
create index if not exists idx_records_category on public.records(category);
create index if not exists idx_records_status on public.records(record_status);
create index if not exists idx_audit_log_record_id on public.audit_log(record_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================
alter table public.records enable row level security;
alter table public.audit_log enable row level security;

-- Allow all authenticated users to read records
create policy "Authenticated users can read records"
  on public.records for select
  to authenticated
  using (true);

-- Allow all authenticated users to insert records
create policy "Authenticated users can insert records"
  on public.records for insert
  to authenticated
  with check (true);

-- Allow all authenticated users to update records
create policy "Authenticated users can update records"
  on public.records for update
  to authenticated
  using (true)
  with check (true);

-- Allow all authenticated users to delete records
create policy "Authenticated users can delete records"
  on public.records for delete
  to authenticated
  using (true);

-- Allow all authenticated users to read audit_log
create policy "Authenticated users can read audit_log"
  on public.audit_log for select
  to authenticated
  using (true);

-- Allow all authenticated users to insert audit_log
create policy "Authenticated users can insert audit_log"
  on public.audit_log for insert
  to authenticated
  with check (true);

-- Also allow anon key access (for local dev without auth)
create policy "Anon can read records"
  on public.records for select
  to anon
  using (true);

create policy "Anon can insert records"
  on public.records for insert
  to anon
  with check (true);

create policy "Anon can update records"
  on public.records for update
  to anon
  using (true)
  with check (true);

create policy "Anon can delete records"
  on public.records for delete
  to anon
  using (true);

create policy "Anon can read audit_log"
  on public.audit_log for select
  to anon
  using (true);

create policy "Anon can insert audit_log"
  on public.audit_log for insert
  to anon
  with check (true);

-- ============================================================
-- Auto-update updated_at timestamp
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.records
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- Auto-log record changes
-- ============================================================
create or replace function public.log_record_change()
returns trigger as $$
declare
  changed_fields jsonb := '{}';
  prev_vals jsonb := '{}';
  new_vals jsonb := '{}';
  field_name text;
begin
  -- Compare old and new values to find changed fields
  for field_name in select json_object_keys(to_jsonb(old)) loop
    if to_jsonb(old) ->> field_name is distinct from to_jsonb(new) ->> field_name then
      changed_fields := changed_fields || jsonb_build_object(field_name, true);
      prev_vals := prev_vals || jsonb_build_object(field_name, to_jsonb(old) -> field_name);
      new_vals := new_vals || jsonb_build_object(field_name, to_jsonb(new) -> field_name);
    end if;
  end loop;

  if changed_fields <> '{}'::jsonb then
    insert into public.audit_log (record_id, action, changed_fields, previous_values, new_values, performed_by)
    values (
      coalesce(new.id, old.id),
      case when tg_op = 'INSERT' then 'create' when tg_op = 'UPDATE' then 'update' else 'delete' end,
      changed_fields,
      prev_vals,
      new_vals,
      'system'
    );
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger record_change_logger
  after insert or update or delete on public.records
  for each row
  execute function public.log_record_change();