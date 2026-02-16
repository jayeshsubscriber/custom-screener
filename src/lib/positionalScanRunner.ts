/**
 * Runs positional scanners across a universe (Nifty 50 / Nifty 750).
 * Fetches 1D data from Upstox, converts to OHLCV, runs the selected scanner.
 */

import { getHistoricalCandleV2 } from "@/lib/upstox";
import type { ChartCandle } from "@/lib/chartData";
import { fetchChartData } from "@/lib/chartData";
import type { OhlcvRow } from "@/lib/positionalScanners";
import {
  runPositionalScanner,
  type PositionalScannerId,
  type PositionalScanResult,
} from "@/lib/positionalScanners";
import { scanPositionalConsolidationBreakout } from "@/lib/positionalConsolidationBreakout";

const FROM_DATE = "2023-01-01";
const NIFTY_50_INDEX_KEY = "NSE_INDEX|Nifty 50";
const MIN_BARS_CONSOLIDATION = 200; // positional consolidation needs 200+ bars

function todayIST(): string {
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function candleToDateStr(c: ChartCandle): string {
  const d = new Date(c.time * 1000);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function chartCandlesToOhlcv(candles: ChartCandle[]): OhlcvRow[] {
  return candles.map((c) => ({
    date: candleToDateStr(c),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

/** Fetch Nifty 50 index 1D and compute returns for Relative Strength / consolidation scanners. */
export async function getBenchmarkReturns(): Promise<{
  return20d: number;
  return65d: number;
}> {
  try {
    const res = await getHistoricalCandleV2(
      NIFTY_50_INDEX_KEY,
      "day",
      todayIST(),
      FROM_DATE
    );
    const candles = res.data?.candles ?? [];
    if (candles.length < 22) return { return20d: 0, return65d: 0 };
    const raw = candles as [string, number, number, number, number, number, number][];
    const closes = raw.map((r) => r[4]);
    const end = closes[closes.length - 1] ?? 0;

    const start20 = closes[closes.length - 1 - 20] ?? 0;
    const return20d = start20 > 0 ? ((end - start20) / start20) * 100 : 0;

    const start65 = closes.length > 65 ? (closes[closes.length - 1 - 65] ?? 0) : 0;
    const return65d = start65 > 0 ? ((end - start65) / start65) * 100 : 0;

    return { return20d, return65d };
  } catch {
    return { return20d: 0, return65d: 0 };
  }
}

/** Backwards-compatible wrapper for scanners that only need 20d return. */
export async function getBenchmarkReturn20d(): Promise<number> {
  const { return20d } = await getBenchmarkReturns();
  return return20d;
}

/** Result row for Consolidation Breakout scanner (positional). */
export interface ConsolidationBreakoutScanResult {
  symbol: string;
  name: string;
  scannerId: "consolidation-breakout";
  todayClose: number;
  data: {
    tier: "1" | "2A" | "2B" | "3";
    tier_name: string;
    consolidation_high: number;
    consolidation_low: number;
    breakout_level: number;
    score_pct: number;
    suggested_stop?: number;
    distance_to_breakout_pct?: number;
    // New positional fields
    target: number;
    rr_ratio: number;
    base_stage: number;
    rs_ratio: number;
    above_dma200: boolean;
    golden_cross: boolean;
    volume_contracting: boolean;
  };
}

export type AnyScanResult = PositionalScanResult | ConsolidationBreakoutScanResult;

export interface ScanProgress {
  current: number;
  total: number;
  matched: number;
  errors: number;
  /** Accumulated matches so far; update UI with this to show results as they are found */
  results: AnyScanResult[];
}

export interface PositionalScanRunnerOptions {
  scannerId: PositionalScannerId;
  instrumentKeys: { symbol: string; name: string; instrument_key: string }[];
  onProgress?: (progress: ScanProgress) => void;
  onMatch?: (result: AnyScanResult) => void;
  shouldSkip?: () => boolean;
  batchSize?: number;
  delayMs?: number;
}

export async function runPositionalScan(
  options: PositionalScanRunnerOptions
): Promise<AnyScanResult[]> {
  const {
    scannerId,
    instrumentKeys,
    onProgress,
    onMatch,
    shouldSkip,
    batchSize = 3,
    delayMs = 1200,
  } = options;

  // Fetch benchmark data upfront for scanners that need it
  let benchmarkReturn20d = 0;
  let benchmarkReturn65d = 0;
  if (scannerId === "rs-leaders" || scannerId === "consolidation-breakout") {
    const benchmarks = await getBenchmarkReturns();
    benchmarkReturn20d = benchmarks.return20d;
    benchmarkReturn65d = benchmarks.return65d;
  }

  const results: AnyScanResult[] = [];
  let errors = 0;

  const minBars =
    scannerId === "consolidation-breakout"
      ? MIN_BARS_CONSOLIDATION
      : scannerId === "rs-leaders"
        ? 25
        : scannerId === "bullish-divergence"
          ? 45
          : scannerId === "fresh-52w-high" || scannerId === "ath-breakout"
            ? 22
            : scannerId === "support-test"
              ? 22
              : scannerId === "cup-handle"
                ? 120
                : scannerId === "double-bottom"
                  ? 35
                  : scannerId === "morning-star"
                    ? 5
                    : scannerId === "accumulation-pattern"
                      ? 25
                      : scannerId === "macd-crossover-1d" ||
                          scannerId === "macd-crossover-1mo" ||
                          scannerId === "bullish-cross-building-negative" ||
                          scannerId === "bullish-cross-building-positive"
                        ? 35
                        : 50;

  const isConsolidationBreakout = scannerId === "consolidation-breakout";
  const useMonthlyData =
    scannerId === "macd-crossover-1mo" ||
    scannerId === "bullish-cross-building-negative" ||
    scannerId === "bullish-cross-building-positive";
  const chartInterval = useMonthlyData ? "1M" : "1D";

  for (let i = 0; i < instrumentKeys.length; i += batchSize) {
    if (shouldSkip?.()) break;
    const batch = instrumentKeys.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (stock) => {
        try {
          const candles = await fetchChartData(stock.instrument_key, chartInterval);
          if (candles.length < minBars) return { status: "skip" as const, result: null };
          const ohlcv = chartCandlesToOhlcv(candles);

          if (isConsolidationBreakout) {
            const res = scanPositionalConsolidationBreakout(ohlcv, stock.symbol, benchmarkReturn65d);
            if (!res.match || !res.tier) return { status: "no_match" as const, result: null };
            const row: ConsolidationBreakoutScanResult = {
              symbol: stock.symbol,
              name: stock.name,
              scannerId: "consolidation-breakout",
              todayClose: res.todayClose,
              data: {
                tier: res.tier,
                tier_name: res.tierName,
                consolidation_high: res.consolidationHigh,
                consolidation_low: res.consolidationLow,
                breakout_level: res.breakoutLevel,
                score_pct: res.scorePct,
                suggested_stop: res.suggestedStop,
                distance_to_breakout_pct: res.distanceToBreakoutPct,
                target: res.target,
                rr_ratio: res.riskRewardRatio,
                base_stage: res.baseStage,
                rs_ratio: res.rsRatio,
                above_dma200: res.aboveDma200,
                golden_cross: res.goldenCross,
                volume_contracting: res.volumeContracting,
              },
            };
            return { status: "match" as const, result: row };
          }

          const result = runPositionalScanner(
            scannerId,
            ohlcv,
            stock.symbol,
            stock.name,
            benchmarkReturn20d
          );
          return result ? { status: "match" as const, result } : { status: "no_match" as const, result: null };
        } catch (e) {
          if (errors === 0) console.warn("[positionalScan] First error:", e);
          return { status: "error" as const, result: null };
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === "match" && r.result) {
        results.push(r.result);
        onMatch?.(r.result);
      }
      if (r.status === "error") errors++;
    }
    onProgress?.({
      current: Math.min(i + batchSize, instrumentKeys.length),
      total: instrumentKeys.length,
      matched: results.length,
      errors,
      results: [...results],
    });

    if (i + batchSize < instrumentKeys.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return results;
}
