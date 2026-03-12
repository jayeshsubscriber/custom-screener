-- Monthly OHLCV candles (for Nifty 500 scan universe, since Jan 2022).
-- month = first day of month (e.g. 2022-01-01). Current incomplete month uses
-- aggregated OHLCV from 1D (open=first, high=max, low=min, close=last completed day, volume=sum).

create table if not exists public.stock_candles_1m (
  symbol text not null,
  month date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null default 0,
  primary key (symbol, month)
);

create index if not exists idx_candles_1m_symbol on public.stock_candles_1m(symbol);

alter table public.stock_candles_1m enable row level security;

create policy "Allow all for stock_candles_1m"
  on public.stock_candles_1m for all using (true) with check (true);
