/**
 * Data pipeline: incrementally fetches OHLCV from Upstox for scanner instruments,
 * stores in Supabase stock_candles_1d / stock_candles_15m tables.
 *
 * On each refresh it checks the latest stored candle per stock and only
 * fetches what's missing, so the data accumulates over time.
 */
import { supabase } from "@/lib/supabase";
import { getHistoricalCandleV2, getHistoricalCandleV3, getIntradayCandleV3 } from "@/lib/upstox";
import type { RawCandle } from "@/lib/upstox";

export interface Instrument {
  symbol: string;
  name: string;
  instrument_key: string;
}

export interface PipelineProgress {
  phase: "1d" | "15m" | "1M";
  current: number;
  total: number;
  errors: number;
  symbol: string;
  newCandles?: number;
}

const INITIAL_LOOKBACK_1D = 365;
const INITIAL_LOOKBACK_15M = 60;
const MONTHLY_FROM = "2022-01-01"; // First day of Jan 2022

/** First day of current month (YYYY-MM-DD) in IST */
function firstOfCurrentMonthIST(): string {
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Last day of previous month (YYYY-MM-DD) */
function lastCompletedMonthFirstDay(): string {
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setDate(0); // previous month
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function todayIST(): string {
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function daysAgoIST(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function rawCandleToDate(raw: RawCandle): string {
  return raw[0].slice(0, 10);
}

function rawCandleToTimestamp(raw: RawCandle): string {
  return new Date(raw[0]).toISOString();
}

/** Add 1 calendar day to a YYYY-MM-DD string */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Instrument List ────────────────────────────────────────────────────────

/** Map UI universe value to DB index_groups label */
const UNIVERSE_TO_INDEX: Record<string, string> = {
  nifty50: "Nifty 50",
  nifty500: "Nifty 500",
};

/**
 * Load instruments for scan or refresh.
 * @param universe - Optional. When provided (e.g. "nifty50", "nifty500"), filter by index.
 *                   When omitted (e.g. for refresh), return all active instruments (one row per symbol).
 */
export async function getInstrumentList(universe?: string): Promise<Instrument[]> {
  if (!supabase) throw new Error("Supabase not configured");
  let query = supabase
    .from("scanner_instruments")
    .select("symbol, name, instrument_key")
    .eq("is_active", true)
    .order("symbol");
  if (universe) {
    const indexLabel = UNIVERSE_TO_INDEX[universe];
    if (indexLabel) {
      query = query.contains("index_groups", [indexLabel]);
    }
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load instruments: ${error.message}`);
  return (data ?? []) as Instrument[];
}

// ─── Latest stored dates per stock ──────────────────────────────────────────

async function getLatestDailyDates(): Promise<Record<string, string>> {
  if (!supabase) return {};
  // Supabase doesn't support GROUP BY via PostgREST, so fetch max date per symbol
  // using RPC or a simple approach: select all symbols + their max date
  const { data } = await supabase
    .from("stock_candles_1d")
    .select("symbol, date")
    .order("date", { ascending: false })
    .limit(5000);
  if (!data) return {};
  const map: Record<string, string> = {};
  for (const row of data) {
    const sym = row.symbol as string;
    const dt = row.date as string;
    if (!map[sym] || dt > map[sym]) map[sym] = dt;
  }
  return map;
}

async function getLatest15mTimestamps(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase
    .from("stock_candles_15m")
    .select("symbol, ts")
    .order("ts", { ascending: false })
    .limit(5000);
  if (!data) return {};
  const map: Record<string, string> = {};
  for (const row of data) {
    const sym = row.symbol as string;
    const ts = row.ts as string;
    if (!map[sym] || ts > map[sym]) map[sym] = ts;
  }
  return map;
}

// ─── Daily Candles (incremental) ────────────────────────────────────────────

async function fetchDailyIncremental(
  instrumentKey: string,
  fromDate: string
): Promise<RawCandle[]> {
  const to = todayIST();
  if (fromDate > to) return [];
  const res = await getHistoricalCandleV2(instrumentKey, "day", to, fromDate);
  const candles = res.data?.candles ?? [];
  // Also fetch today's live candle
  try {
    const intra = await getIntradayCandleV3(instrumentKey, "days", "1");
    if (intra.data?.candles?.length) candles.push(...intra.data.candles);
  } catch {
    // may not be available outside market hours
  }
  return candles;
}

async function upsertDailyCandles(
  symbol: string,
  candles: RawCandle[]
): Promise<number> {
  if (!supabase || candles.length === 0) return 0;
  const seen = new Set<string>();
  const rows: { symbol: string; date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  for (const c of candles) {
    const date = rawCandleToDate(c);
    if (seen.has(date)) continue;
    seen.add(date);
    rows.push({ symbol, date, open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] ?? 0 });
  }
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from("stock_candles_1d")
      .upsert(chunk, { onConflict: "symbol,date" });
    if (error) console.warn(`Upsert 1d error for ${symbol}:`, error.message);
  }
  return rows.length;
}

// ─── 15-minute Candles (incremental) ────────────────────────────────────────

async function fetch15mIncremental(
  instrumentKey: string,
  fromDate: string
): Promise<RawCandle[]> {
  const today = todayIST();
  if (fromDate > today) return [];
  const all: RawCandle[] = [];

  // V3 API limits 15-min to 1-month range per call
  const chunkDays = 30;
  let cursor = fromDate;
  while (cursor <= today) {
    const chunkEnd = new Date(cursor + "T00:00:00Z");
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + chunkDays - 1);
    let toStr = chunkEnd.toISOString().slice(0, 10);
    if (toStr > today) toStr = today;
    try {
      const res = await getHistoricalCandleV3(instrumentKey, "minutes", "15", toStr, cursor);
      if (res.data?.candles?.length) all.push(...res.data.candles);
    } catch (e) {
      console.warn("15m chunk failed", cursor, toStr, e);
    }
    const next = new Date(cursor + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + chunkDays);
    cursor = next.toISOString().slice(0, 10);
    if (cursor > today) break;
  }

  // Today's live intraday candles
  try {
    const intra = await getIntradayCandleV3(instrumentKey, "minutes", "15");
    if (intra.data?.candles?.length) all.push(...intra.data.candles);
  } catch {
    // ignore
  }
  return all;
}

async function upsert15mCandles(
  symbol: string,
  candles: RawCandle[]
): Promise<number> {
  if (!supabase || candles.length === 0) return 0;
  const seen = new Set<string>();
  const rows: { symbol: string; ts: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  for (const c of candles) {
    const ts = rawCandleToTimestamp(c);
    if (seen.has(ts)) continue;
    seen.add(ts);
    rows.push({ symbol, ts, open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] ?? 0 });
  }
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from("stock_candles_15m")
      .upsert(chunk, { onConflict: "symbol,ts" });
    if (error) console.warn(`Upsert 15m error for ${symbol}:`, error.message);
  }
  return rows.length;
}

// ─── Monthly Candles (1M) ────────────────────────────────────────────────────

async function getLatestMonthlyMonths(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase
    .from("stock_candles_1m")
    .select("symbol, month")
    .order("month", { ascending: false })
    .limit(5000);
  if (!data) return {};
  const map: Record<string, string> = {};
  for (const row of data) {
    const sym = row.symbol as string;
    const month = (row.month as string).slice(0, 10);
    if (!map[sym] || month > map[sym]) map[sym] = month;
  }
  return map;
}

/** Fetch completed monthly candles from Upstox (fromMonth/toMonth = first day of month YYYY-MM-DD). */
async function fetchMonthlyFromUpstox(
  instrumentKey: string,
  fromMonth: string,
  toMonth: string
): Promise<RawCandle[]> {
  const res = await getHistoricalCandleV2(instrumentKey, "month", toMonth, fromMonth);
  const candles = res.data?.candles ?? [];
  return candles;
}

/** RawCandle to month string (first day of month). */
function rawCandleToMonth(raw: RawCandle): string {
  const d = new Date(raw[0]);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

async function upsertMonthlyCandles(
  symbol: string,
  candles: RawCandle[]
): Promise<number> {
  if (!supabase || candles.length === 0) return 0;
  const seen = new Set<string>();
  const rows: { symbol: string; month: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  for (const c of candles) {
    const month = rawCandleToMonth(c);
    if (seen.has(month)) continue;
    seen.add(month);
    rows.push({ symbol, month, open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] ?? 0 });
  }
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from("stock_candles_1m")
      .upsert(chunk, { onConflict: "symbol,month" });
    if (error) console.warn(`Upsert 1M error for ${symbol}:`, error.message);
  }
  return rows.length;
}

/** Build current (incomplete) month candle from 1D data: open=first, high=max, low=min, close=last, volume=sum. */
async function buildCurrentMonthFrom1D(symbol: string): Promise<RawCandle | null> {
  if (!supabase) return null;
  const monthStart = firstOfCurrentMonthIST();
  const today = todayIST();
  const { data } = await supabase
    .from("stock_candles_1d")
    .select("date, open, high, low, close, volume")
    .eq("symbol", symbol)
    .gte("date", monthStart)
    .lte("date", today)
    .order("date", { ascending: true });
  if (!data || data.length === 0) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const open = Number(first.open);
  const close = Number(last.close);
  let high = Number(first.high);
  let low = Number(first.low);
  let volume = Number(first.volume) || 0;
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    high = Math.max(high, Number(r.high));
    low = Math.min(low, Number(r.low));
    volume += Number(r.volume) || 0;
  }
  // Return as RawCandle: [timestampISO, open, high, low, close, volume, openInterest]
  const monthDate = monthStart + "T00:00:00.000Z";
  return [monthDate, open, high, low, close, volume, 0];
}

// ─── Refresh Orchestration (incremental) ────────────────────────────────────

export async function refreshDailyCandles(
  onProgress?: (p: PipelineProgress) => void
): Promise<{ success: number; errors: number; newCandles: number }> {
  const instruments = await getInstrumentList();
  const latestDates = await getLatestDailyDates();
  let errors = 0;
  let totalNew = 0;
  const batchSize = 3;
  const delayMs = 1200;

  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (inst) => {
        const lastStored = latestDates[inst.symbol];
        const fromDate = lastStored ? nextDay(lastStored) : daysAgoIST(INITIAL_LOOKBACK_1D);
        let candles = await fetchDailyIncremental(inst.instrument_key, fromDate);
        if (lastStored) {
          candles = candles.filter((c) => rawCandleToDate(c) > lastStored);
        }
        const inserted = await upsertDailyCandles(inst.symbol, candles);
        return inserted;
      })
    );

    for (const r of results) {
      if (r.status === "rejected") errors++;
      else totalNew += r.value;
    }

    onProgress?.({
      phase: "1d",
      current: Math.min(i + batchSize, instruments.length),
      total: instruments.length,
      errors,
      symbol: batch[batch.length - 1]?.symbol ?? "",
      newCandles: totalNew,
    });

    if (i + batchSize < instruments.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  if (supabase) {
    await supabase.from("stock_candles_meta").upsert(
      { key: "last_refresh_1d", value: new Date().toISOString() },
      { onConflict: "key" }
    );
  }

  return { success: instruments.length - errors, errors, newCandles: totalNew };
}

export async function refresh15mCandles(
  onProgress?: (p: PipelineProgress) => void
): Promise<{ success: number; errors: number; newCandles: number }> {
  const instruments = await getInstrumentList();
  const latestTs = await getLatest15mTimestamps();
  let errors = 0;
  let totalNew = 0;
  const batchSize = 2;
  const delayMs = 1500;

  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (inst) => {
        const lastStored = latestTs[inst.symbol];
        const fromDate = lastStored
          ? lastStored.slice(0, 10)
          : daysAgoIST(INITIAL_LOOKBACK_15M);
        let candles = await fetch15mIncremental(inst.instrument_key, fromDate);
        // Filter out candles we already have (API is date-based, can't avoid re-fetching same day)
        if (lastStored) {
          const cutoff = new Date(lastStored).getTime();
          candles = candles.filter((c) => new Date(c[0]).getTime() > cutoff);
        }
        const inserted = await upsert15mCandles(inst.symbol, candles);
        return inserted;
      })
    );

    for (const r of results) {
      if (r.status === "rejected") errors++;
      else totalNew += r.value;
    }

    onProgress?.({
      phase: "15m",
      current: Math.min(i + batchSize, instruments.length),
      total: instruments.length,
      errors,
      symbol: batch[batch.length - 1]?.symbol ?? "",
      newCandles: totalNew,
    });

    if (i + batchSize < instruments.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  if (supabase) {
    await supabase.from("stock_candles_meta").upsert(
      { key: "last_refresh_15m", value: new Date().toISOString() },
      { onConflict: "key" }
    );
  }

  return { success: instruments.length - errors, errors, newCandles: totalNew };
}

export async function refreshMonthlyCandles(
  onProgress?: (p: PipelineProgress) => void
): Promise<{ success: number; errors: number; newCandles: number }> {
  const instruments = await getInstrumentList();
  const latestMonths = await getLatestMonthlyMonths();
  const lastCompleted = lastCompletedMonthFirstDay();
  let errors = 0;
  let totalNew = 0;
  const batchSize = 2;
  const delayMs = 1500;

  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (inst) => {
        let count = 0;
        const lastStored = latestMonths[inst.symbol];
        const fromMonth = lastStored ? nextMonth(lastStored) : MONTHLY_FROM;
        if (fromMonth <= lastCompleted) {
          const candles = await fetchMonthlyFromUpstox(inst.instrument_key, fromMonth, lastCompleted);
          count += await upsertMonthlyCandles(inst.symbol, candles);
        }
        const partial = await buildCurrentMonthFrom1D(inst.symbol);
        if (partial) {
          count += await upsertMonthlyCandles(inst.symbol, [partial]);
        }
        return count;
      })
    );

    for (const r of results) {
      if (r.status === "rejected") errors++;
      else totalNew += r.value;
    }

    onProgress?.({
      phase: "1M",
      current: Math.min(i + batchSize, instruments.length),
      total: instruments.length,
      errors,
      symbol: batch[batch.length - 1]?.symbol ?? "",
      newCandles: totalNew,
    });

    if (i + batchSize < instruments.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  if (supabase) {
    await supabase.from("stock_candles_meta").upsert(
      { key: "last_refresh_1M", value: new Date().toISOString() },
      { onConflict: "key" }
    );
  }

  return { success: instruments.length - errors, errors, newCandles: totalNew };
}

function nextMonth(monthFirst: string): string {
  const d = new Date(monthFirst + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function refreshAllData(
  onProgress?: (p: PipelineProgress) => void
): Promise<void> {
  await refreshDailyCandles(onProgress);
  await refresh15mCandles(onProgress);
}

// ─── Data Freshness ─────────────────────────────────────────────────────────

export async function getDataFreshness(): Promise<{
  daily: string | null;
  intraday15m: string | null;
  monthly: string | null;
}> {
  if (!supabase) return { daily: null, intraday15m: null, monthly: null };
  const { data } = await supabase
    .from("stock_candles_meta")
    .select("key, value")
    .in("key", ["last_refresh_1d", "last_refresh_15m", "last_refresh_1M"]);

  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    daily: (map.get("last_refresh_1d") as string) ?? null,
    intraday15m: (map.get("last_refresh_15m") as string) ?? null,
    monthly: (map.get("last_refresh_1M") as string) ?? null,
  };
}
