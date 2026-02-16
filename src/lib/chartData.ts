/**
 * Fetches candle data from Upstox and converts to Lightweight Charts format.
 * Data since Jan 2023; supports 5m, 15m, 30m, 1D, 1M. Appends today's intraday and supports live updates.
 */
import type { UTCTimestamp } from "lightweight-charts";
import type { RawCandle } from "./upstox";
import {
  getHistoricalCandleV3,
  getIntradayCandleV3,
  getHistoricalCandleV2,
} from "./upstox";

export type ChartInterval = "5m" | "15m" | "30m" | "1D" | "1M";

export interface ChartCandle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const FROM_DATE = "2023-01-01";

function parseTimestamp(iso: string): UTCTimestamp {
  return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
}

function rawToChart(raw: RawCandle): ChartCandle {
  return {
    time: parseTimestamp(raw[0]),
    open: raw[1],
    high: raw[2],
    low: raw[3],
    close: raw[4],
    volume: raw[5] ?? 0,
  };
}

function sortCandles(candles: ChartCandle[]): ChartCandle[] {
  return [...candles].sort((a, b) => a.time - b.time);
}

function dedupeByTime(candles: ChartCandle[]): ChartCandle[] {
  const byTime = new Map<number, ChartCandle>();
  for (const c of candles) byTime.set(c.time, c);
  return sortCandles(Array.from(byTime.values()));
}

/** YYYY-MM-DD for today in IST (exchange date). */
function todayIST(): string {
  const d = new Date();
  const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

/** Fetch historical 5m/15m/30m in chunks (V3 limits: 1 month for 1-15m, 1 quarter for >15m). */
async function fetchMinutesHistorical(
  instrumentKey: string,
  interval: "5" | "15" | "30"
): Promise<ChartCandle[]> {
  const intervalNum = parseInt(interval, 10);
  const chunkMonths = intervalNum <= 15 ? 1 : 3;
  const all: RawCandle[] = [];
  let fromStr = FROM_DATE;
  const today = todayIST();

  while (fromStr <= today) {
    const fromDate = new Date(fromStr + "T00:00:00Z");
    const toDate = new Date(fromDate);
    toDate.setUTCMonth(toDate.getUTCMonth() + chunkMonths);
    toDate.setUTCDate(0);
    let toStr = toDate.toISOString().slice(0, 10);
    if (toStr > today) toStr = today;
    try {
      const res = await getHistoricalCandleV3(
        instrumentKey,
        "minutes",
        interval,
        toStr,
        fromStr
      );
      if (res.data?.candles?.length) all.push(...res.data.candles);
    } catch (e) {
      console.warn("Upstox historical chunk failed", fromStr, toStr, e);
    }
    fromDate.setUTCDate(1);
    fromDate.setUTCMonth(fromDate.getUTCMonth() + chunkMonths);
    fromStr = fromDate.toISOString().slice(0, 10);
    if (fromStr > today) break;
  }

  return dedupeByTime(all.map(rawToChart));
}

/** Fetch today's intraday candles (V3 intraday = current trading day). */
async function fetchIntradayToday(
  instrumentKey: string,
  interval: "5" | "15" | "30"
): Promise<ChartCandle[]> {
  const res = await getIntradayCandleV3(instrumentKey, "minutes", interval);
  if (!res.data?.candles?.length) return [];
  return res.data.candles.map(rawToChart);
}

/** 5m: historical by month + today intraday. */
async function fetch5m(instrumentKey: string): Promise<ChartCandle[]> {
  const [hist, intra] = await Promise.all([
    fetchMinutesHistorical(instrumentKey, "5"),
    fetchIntradayToday(instrumentKey, "5"),
  ]);
  return dedupeByTime([...hist, ...intra]);
}

/** 15m: same. */
async function fetch15m(instrumentKey: string): Promise<ChartCandle[]> {
  const [hist, intra] = await Promise.all([
    fetchMinutesHistorical(instrumentKey, "15"),
    fetchIntradayToday(instrumentKey, "15"),
  ]);
  return dedupeByTime([...hist, ...intra]);
}

/** 30m: same. */
async function fetch30m(instrumentKey: string): Promise<ChartCandle[]> {
  const [hist, intra] = await Promise.all([
    fetchMinutesHistorical(instrumentKey, "30"),
    fetchIntradayToday(instrumentKey, "30"),
  ]);
  return dedupeByTime([...hist, ...intra]);
}

/** Today's daily candle (current trading day) from V3 intraday. */
async function fetchIntradayDayToday(instrumentKey: string): Promise<ChartCandle[]> {
  try {
    const res = await getIntradayCandleV3(instrumentKey, "days", "1");
    if (!res.data?.candles?.length) return [];
    return res.data.candles.map(rawToChart);
  } catch {
    return [];
  }
}

/** 1D: V2 day from Jan 2023 + today's candle from intraday so latest day is visible. */
async function fetch1D(instrumentKey: string): Promise<ChartCandle[]> {
  const [histRes, intradayToday] = await Promise.all([
    getHistoricalCandleV2(instrumentKey, "day", todayIST(), FROM_DATE),
    fetchIntradayDayToday(instrumentKey),
  ]);
  const hist = histRes.data?.candles?.length
    ? histRes.data.candles.map(rawToChart)
    : [];
  const merged = dedupeByTime([...hist, ...intradayToday]);
  return sortCandles(merged);
}

/** 1M: V2 month from Jan 2023. */
async function fetch1M(instrumentKey: string): Promise<ChartCandle[]> {
  const res = await getHistoricalCandleV2(
    instrumentKey,
    "month",
    todayIST(),
    FROM_DATE
  );
  if (!res.data?.candles?.length) return [];
  return sortCandles(res.data.candles.map(rawToChart));
}

export async function fetchChartData(
  instrumentKey: string,
  interval: ChartInterval
): Promise<ChartCandle[]> {
  switch (interval) {
    case "5m":
      return fetch5m(instrumentKey);
    case "15m":
      return fetch15m(instrumentKey);
    case "30m":
      return fetch30m(instrumentKey);
    case "1D":
      return fetch1D(instrumentKey);
    case "1M":
      return fetch1M(instrumentKey);
    default:
      return fetch1D(instrumentKey);
  }
}
