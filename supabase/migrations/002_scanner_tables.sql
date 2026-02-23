-- Scanner instruments table (source of truth for which stocks to scan).
-- Seeded from ind_nifty50list.csv. instrument_key = NSE_EQ|{ISIN} for Upstox.

create table if not exists public.scanner_instruments (
  symbol text primary key,
  name text not null,
  industry text,
  isin text unique not null,
  series text default 'EQ',
  instrument_key text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Daily OHLCV candles (last 365 days)
create table if not exists public.stock_candles_1d (
  symbol text not null,
  date date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null default 0,
  primary key (symbol, date)
);

-- 15-minute OHLCV candles (last 60 days)
create table if not exists public.stock_candles_15m (
  symbol text not null,
  ts timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null default 0,
  primary key (symbol, ts)
);

-- Metadata key-value store (data freshness tracking)
create table if not exists public.stock_candles_meta (
  key text primary key,
  value text not null
);

-- Indexes for fast per-symbol queries
create index if not exists idx_candles_1d_symbol on public.stock_candles_1d(symbol);
create index if not exists idx_candles_15m_symbol on public.stock_candles_15m(symbol);

-- RLS: allow all for now (tighten when auth is added)
alter table public.scanner_instruments enable row level security;
alter table public.stock_candles_1d enable row level security;
alter table public.stock_candles_15m enable row level security;
alter table public.stock_candles_meta enable row level security;

create policy "Allow all for scanner_instruments"
  on public.scanner_instruments for all using (true) with check (true);
create policy "Allow all for stock_candles_1d"
  on public.stock_candles_1d for all using (true) with check (true);
create policy "Allow all for stock_candles_15m"
  on public.stock_candles_15m for all using (true) with check (true);
create policy "Allow all for stock_candles_meta"
  on public.stock_candles_meta for all using (true) with check (true);

-- Seed Nifty 50 instruments from ind_nifty50list.csv
INSERT INTO public.scanner_instruments (symbol, name, industry, isin, series, instrument_key) VALUES
  ('ADANIENT',   'Adani Enterprises Ltd.',                        'Metals & Mining',                      'INE423A01024', 'EQ', 'NSE_EQ|INE423A01024'),
  ('ADANIPORTS', 'Adani Ports and Special Economic Zone Ltd.',    'Services',                             'INE742F01042', 'EQ', 'NSE_EQ|INE742F01042'),
  ('APOLLOHOSP', 'Apollo Hospitals Enterprise Ltd.',              'Healthcare',                           'INE437A01024', 'EQ', 'NSE_EQ|INE437A01024'),
  ('ASIANPAINT', 'Asian Paints Ltd.',                             'Consumer Durables',                    'INE021A01026', 'EQ', 'NSE_EQ|INE021A01026'),
  ('AXISBANK',   'Axis Bank Ltd.',                                'Financial Services',                   'INE238A01034', 'EQ', 'NSE_EQ|INE238A01034'),
  ('BAJAJ-AUTO', 'Bajaj Auto Ltd.',                               'Automobile and Auto Components',       'INE917I01010', 'EQ', 'NSE_EQ|INE917I01010'),
  ('BAJFINANCE', 'Bajaj Finance Ltd.',                            'Financial Services',                   'INE296A01032', 'EQ', 'NSE_EQ|INE296A01032'),
  ('BAJAJFINSV', 'Bajaj Finserv Ltd.',                            'Financial Services',                   'INE918I01026', 'EQ', 'NSE_EQ|INE918I01026'),
  ('BEL',        'Bharat Electronics Ltd.',                       'Capital Goods',                        'INE263A01024', 'EQ', 'NSE_EQ|INE263A01024'),
  ('BHARTIARTL', 'Bharti Airtel Ltd.',                            'Telecommunication',                    'INE397D01024', 'EQ', 'NSE_EQ|INE397D01024'),
  ('CIPLA',      'Cipla Ltd.',                                    'Healthcare',                           'INE059A01026', 'EQ', 'NSE_EQ|INE059A01026'),
  ('COALINDIA',  'Coal India Ltd.',                               'Oil Gas & Consumable Fuels',           'INE522F01014', 'EQ', 'NSE_EQ|INE522F01014'),
  ('DRREDDY',    'Dr. Reddy''s Laboratories Ltd.',                'Healthcare',                           'INE089A01031', 'EQ', 'NSE_EQ|INE089A01031'),
  ('EICHERMOT',  'Eicher Motors Ltd.',                            'Automobile and Auto Components',       'INE066A01021', 'EQ', 'NSE_EQ|INE066A01021'),
  ('ETERNAL',    'Eternal Ltd.',                                  'Consumer Services',                    'INE758T01015', 'EQ', 'NSE_EQ|INE758T01015'),
  ('GRASIM',     'Grasim Industries Ltd.',                        'Construction Materials',               'INE047A01021', 'EQ', 'NSE_EQ|INE047A01021'),
  ('HCLTECH',    'HCL Technologies Ltd.',                         'Information Technology',                'INE860A01027', 'EQ', 'NSE_EQ|INE860A01027'),
  ('HDFCBANK',   'HDFC Bank Ltd.',                                'Financial Services',                   'INE040A01034', 'EQ', 'NSE_EQ|INE040A01034'),
  ('HDFCLIFE',   'HDFC Life Insurance Company Ltd.',              'Financial Services',                   'INE795G01014', 'EQ', 'NSE_EQ|INE795G01014'),
  ('HINDALCO',   'Hindalco Industries Ltd.',                      'Metals & Mining',                      'INE038A01020', 'EQ', 'NSE_EQ|INE038A01020'),
  ('HINDUNILVR', 'Hindustan Unilever Ltd.',                       'Fast Moving Consumer Goods',            'INE030A01027', 'EQ', 'NSE_EQ|INE030A01027'),
  ('ICICIBANK',  'ICICI Bank Ltd.',                               'Financial Services',                   'INE090A01021', 'EQ', 'NSE_EQ|INE090A01021'),
  ('ITC',        'ITC Ltd.',                                      'Fast Moving Consumer Goods',            'INE154A01025', 'EQ', 'NSE_EQ|INE154A01025'),
  ('INFY',       'Infosys Ltd.',                                  'Information Technology',                'INE009A01021', 'EQ', 'NSE_EQ|INE009A01021'),
  ('INDIGO',     'InterGlobe Aviation Ltd.',                      'Services',                             'INE646L01027', 'EQ', 'NSE_EQ|INE646L01027'),
  ('JSWSTEEL',   'JSW Steel Ltd.',                                'Metals & Mining',                      'INE019A01038', 'EQ', 'NSE_EQ|INE019A01038'),
  ('JIOFIN',     'Jio Financial Services Ltd.',                   'Financial Services',                   'INE758E01017', 'EQ', 'NSE_EQ|INE758E01017'),
  ('KOTAKBANK',  'Kotak Mahindra Bank Ltd.',                      'Financial Services',                   'INE237A01036', 'EQ', 'NSE_EQ|INE237A01036'),
  ('LT',         'Larsen & Toubro Ltd.',                          'Construction',                         'INE018A01030', 'EQ', 'NSE_EQ|INE018A01030'),
  ('M&M',        'Mahindra & Mahindra Ltd.',                      'Automobile and Auto Components',       'INE101A01026', 'EQ', 'NSE_EQ|INE101A01026'),
  ('MARUTI',     'Maruti Suzuki India Ltd.',                      'Automobile and Auto Components',       'INE585B01010', 'EQ', 'NSE_EQ|INE585B01010'),
  ('MAXHEALTH',  'Max Healthcare Institute Ltd.',                 'Healthcare',                           'INE027H01010', 'EQ', 'NSE_EQ|INE027H01010'),
  ('NTPC',       'NTPC Ltd.',                                     'Power',                                'INE733E01010', 'EQ', 'NSE_EQ|INE733E01010'),
  ('NESTLEIND',  'Nestle India Ltd.',                             'Fast Moving Consumer Goods',            'INE239A01024', 'EQ', 'NSE_EQ|INE239A01024'),
  ('ONGC',       'Oil & Natural Gas Corporation Ltd.',            'Oil Gas & Consumable Fuels',           'INE213A01029', 'EQ', 'NSE_EQ|INE213A01029'),
  ('POWERGRID',  'Power Grid Corporation of India Ltd.',          'Power',                                'INE752E01010', 'EQ', 'NSE_EQ|INE752E01010'),
  ('RELIANCE',   'Reliance Industries Ltd.',                      'Oil Gas & Consumable Fuels',           'INE002A01018', 'EQ', 'NSE_EQ|INE002A01018'),
  ('SBILIFE',    'SBI Life Insurance Company Ltd.',               'Financial Services',                   'INE123W01016', 'EQ', 'NSE_EQ|INE123W01016'),
  ('SHRIRAMFIN', 'Shriram Finance Ltd.',                          'Financial Services',                   'INE721A01047', 'EQ', 'NSE_EQ|INE721A01047'),
  ('SBIN',       'State Bank of India',                           'Financial Services',                   'INE062A01020', 'EQ', 'NSE_EQ|INE062A01020'),
  ('SUNPHARMA',  'Sun Pharmaceutical Industries Ltd.',            'Healthcare',                           'INE044A01036', 'EQ', 'NSE_EQ|INE044A01036'),
  ('TCS',        'Tata Consultancy Services Ltd.',                'Information Technology',                'INE467B01029', 'EQ', 'NSE_EQ|INE467B01029'),
  ('TATACONSUM', 'Tata Consumer Products Ltd.',                   'Fast Moving Consumer Goods',            'INE192A01025', 'EQ', 'NSE_EQ|INE192A01025'),
  ('TATAMOTORS', 'Tata Motors Ltd.',                              'Automobile and Auto Components',       'INE155A01022', 'EQ', 'NSE_EQ|INE155A01022'),
  ('TATASTEEL',  'Tata Steel Ltd.',                               'Metals & Mining',                      'INE081A01020', 'EQ', 'NSE_EQ|INE081A01020'),
  ('TECHM',      'Tech Mahindra Ltd.',                            'Information Technology',                'INE669C01036', 'EQ', 'NSE_EQ|INE669C01036'),
  ('TITAN',      'Titan Company Ltd.',                            'Consumer Durables',                    'INE280A01028', 'EQ', 'NSE_EQ|INE280A01028'),
  ('TRENT',      'Trent Ltd.',                                    'Consumer Services',                    'INE849A01020', 'EQ', 'NSE_EQ|INE849A01020'),
  ('ULTRACEMCO', 'UltraTech Cement Ltd.',                         'Construction Materials',               'INE481G01011', 'EQ', 'NSE_EQ|INE481G01011'),
  ('WIPRO',      'Wipro Ltd.',                                    'Information Technology',                'INE075A01022', 'EQ', 'NSE_EQ|INE075A01022')
ON CONFLICT (symbol) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  isin = EXCLUDED.isin,
  series = EXCLUDED.series,
  instrument_key = EXCLUDED.instrument_key;
