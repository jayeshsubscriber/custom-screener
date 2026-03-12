-- Add optional description to saved screeners.
alter table public.saved_screeners
  add column if not exists description text default '';
