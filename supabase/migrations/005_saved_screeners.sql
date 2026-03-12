-- Saved screeners: name, universe, and full query (conditions) as JSON.
create table if not exists public.saved_screeners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  universe text not null default 'nifty50',
  query jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_saved_screeners_updated on public.saved_screeners(updated_at desc);

alter table public.saved_screeners enable row level security;

drop policy if exists "Allow all for saved_screeners" on public.saved_screeners;
create policy "Allow all for saved_screeners"
  on public.saved_screeners for all using (true) with check (true);
