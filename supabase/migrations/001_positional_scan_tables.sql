-- Positional scanner results: one row per scanner, results stored as JSONB.
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

create table if not exists public.positional_scan_results (
  scanner_id text primary key,
  results jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Metadata for "last full scan" (all scanners run) timestamp.
create table if not exists public.positional_scan_meta (
  key text primary key,
  value timestamptz not null
);

-- Optional: allow anonymous read/write for client-only app. Tighten with RLS when you add auth.
alter table public.positional_scan_results enable row level security;
alter table public.positional_scan_meta enable row level security;

create policy "Allow all for positional_scan_results"
  on public.positional_scan_results for all
  using (true)
  with check (true);

create policy "Allow all for positional_scan_meta"
  on public.positional_scan_meta for all
  using (true)
  with check (true);
