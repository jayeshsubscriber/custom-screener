/**
 * Custom scan runner: reads cached OHLCV from Supabase,
 * runs condition evaluator for each stock, returns matches.
 */
import { supabase } from "@/lib/supabase";
import type { OhlcvRow, QueryState, ScanResultRow, ScanProgress, IndicatorColumn } from "@/types/screener";
import { evaluateQuery } from "@/lib/conditionEvaluator";
import { computeIndicator } from "@/lib/indicators";
import { getIndicator } from "@/data/indicators";
import { getInstrumentList, type Instrument } from "@/lib/scannerDataPipeline";

/** Map of timeframe UI values → which Supabase table to query */
const TIMEFRAME_TABLE: Record<string, "stock_candles_1d" | "stock_candles_15m"> = {
  "1d": "stock_candles_1d",
  "15m": "stock_candles_15m",
};

/** Load all OHLCV rows for a given symbol from the correct table.
 *  Uses .limit(5000) to override Supabase's default 1000-row cap. */
async function loadOhlcv(
  symbol: string,
  table: "stock_candles_1d" | "stock_candles_15m"
): Promise<OhlcvRow[]> {
  if (!supabase) return [];

  if (table === "stock_candles_1d") {
    const { data, error } = await supabase
      .from(table)
      .select("date, open, high, low, close, volume")
      .eq("symbol", symbol)
      .order("date", { ascending: true })
      .limit(5000);
    if (error || !data) return [];
    return data.map((r) => ({
      date: r.date as string,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
    }));
  }

  // 15m table — can have 1500+ rows per stock, must exceed default 1000 limit
  const { data, error } = await supabase
    .from(table)
    .select("ts, open, high, low, close, volume")
    .eq("symbol", symbol)
    .order("ts", { ascending: true })
    .limit(5000);
  if (error || !data) return [];
  return data.map((r) => ({
    date: r.ts as string,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

/** Determine which unique timeframes are used across all groups. */
function getRequiredTimeframes(query: QueryState): string[] {
  const tfs = new Set<string>();
  for (const g of query.groups) {
    tfs.add(g.timeframe || "1d");
  }
  return Array.from(tfs);
}

/** Build a unique key for an indicator + params combination. */
function indicatorKey(id: string, params: Record<string, number | string>): string {
  const ind = getIndicator(id);
  if (!ind) return id;
  const paramParts = ind.params
    .filter((p) => p.type === "number")
    .map((p) => String(params[p.key] ?? p.defaultValue));
  return paramParts.length > 0 ? `${id}_${paramParts.join("_")}` : id;
}

function indicatorLabel(id: string, params: Record<string, number | string>): string {
  const ind = getIndicator(id);
  if (!ind) return id;
  const numParams = ind.params.filter((p) => p.type === "number");
  if (numParams.length === 0) return ind.name;
  const vals = numParams.map((p) => params[p.key] ?? p.defaultValue).join(",");
  return `${ind.name}(${vals})`;
}

/** Extract unique indicator columns from the query (both left and right operands). */
export function extractIndicatorColumns(query: QueryState): IndicatorColumn[] {
  const seen = new Set<string>();
  const cols: IndicatorColumn[] = [];

  for (const group of query.groups) {
    for (const cond of group.conditions) {
      if (cond.leftIndicatorId) {
        const ind = getIndicator(cond.leftIndicatorId);
        if (ind && ind.outputType === "numeric") {
          const key = indicatorKey(cond.leftIndicatorId, cond.leftParams);
          if (!seen.has(key)) {
            seen.add(key);
            cols.push({
              key,
              label: indicatorLabel(cond.leftIndicatorId, cond.leftParams),
              indicatorId: cond.leftIndicatorId,
              params: cond.leftParams,
            });
          }
        }
      }
      if (cond.rightType === "indicator" && cond.rightIndicatorId) {
        const ind = getIndicator(cond.rightIndicatorId);
        if (ind && ind.outputType === "numeric") {
          const key = indicatorKey(cond.rightIndicatorId, cond.rightParams);
          if (!seen.has(key)) {
            seen.add(key);
            cols.push({
              key,
              label: indicatorLabel(cond.rightIndicatorId, cond.rightParams),
              indicatorId: cond.rightIndicatorId,
              params: cond.rightParams,
            });
          }
        }
      }
    }
  }
  return cols;
}

/** Compute latest indicator values for a stock given its OHLCV data. */
function computeIndicatorValues(
  columns: IndicatorColumn[],
  ohlcvByTimeframe: Record<string, OhlcvRow[]>,
  defaultTf: string
): Record<string, number> {
  const values: Record<string, number> = {};
  const data = ohlcvByTimeframe[defaultTf] ?? Object.values(ohlcvByTimeframe)[0] ?? [];
  if (data.length === 0) return values;

  for (const col of columns) {
    const series = computeIndicator(col.indicatorId, col.params, data);
    const lastVal = series[series.length - 1];
    values[col.key] = Number.isNaN(lastVal) ? 0 : lastVal;
  }
  return values;
}

export async function runCustomScan(
  query: QueryState,
  onProgress?: (p: ScanProgress) => void
): Promise<ScanResultRow[]> {
  if (!supabase) throw new Error("Supabase not configured");

  onProgress?.({ phase: "loading_data", message: "Loading instruments...", total: 0, matched: 0 });

  const instruments = await getInstrumentList();
  const requiredTfs = getRequiredTimeframes(query);

  // Validate that we only use supported timeframes
  for (const tf of requiredTfs) {
    if (!TIMEFRAME_TABLE[tf]) {
      throw new Error(
        `Timeframe "${tf}" not yet supported. Only Daily (1d) and 15-minute (15m) are available.`
      );
    }
  }

  const indicatorCols = extractIndicatorColumns(query);
  const results: ScanResultRow[] = [];
  const total = instruments.length;

  onProgress?.({ phase: "computing", message: `Evaluating ${total} stocks...`, total, matched: 0 });

  const batchSize = 5;
  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (inst) => {
        return evaluateStock(inst, query, requiredTfs, indicatorCols);
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }

    onProgress?.({
      phase: "computing",
      message: `Evaluated ${Math.min(i + batchSize, total)} / ${total}`,
      total,
      matched: results.length,
    });
  }

  onProgress?.({
    phase: "done",
    message: `Found ${results.length} matches out of ${total} stocks`,
    total,
    matched: results.length,
  });

  return results;
}

async function evaluateStock(
  inst: Instrument,
  query: QueryState,
  requiredTfs: string[],
  indicatorCols: IndicatorColumn[]
): Promise<ScanResultRow | null> {
  try {
    const ohlcvByTimeframe: Record<string, OhlcvRow[]> = {};
    for (const tf of requiredTfs) {
      const table = TIMEFRAME_TABLE[tf];
      if (table) {
        ohlcvByTimeframe[tf] = await loadOhlcv(inst.symbol, table);
      }
    }

    const hasData = Object.values(ohlcvByTimeframe).some((d) => d.length > 0);
    if (!hasData) return null;

    const evalResult = evaluateQuery(query, ohlcvByTimeframe);
    if (!evalResult.match) return null;

    const defaultTf = requiredTfs[0] || "1d";
    const dailyData = ohlcvByTimeframe["1d"] ?? ohlcvByTimeframe["15m"] ?? [];
    const last = dailyData[dailyData.length - 1];
    const prev = dailyData.length >= 2 ? dailyData[dailyData.length - 2] : null;

    const indicatorValues = computeIndicatorValues(indicatorCols, ohlcvByTimeframe, defaultTf);

    return {
      symbol: inst.symbol,
      name: inst.name,
      close: last?.close ?? 0,
      change1d: prev && prev.close > 0 ? ((last!.close - prev.close) / prev.close) * 100 : 0,
      volume: last?.volume ?? 0,
      matchedGroups: evalResult.matchedGroups,
      indicatorValues,
    };
  } catch (e) {
    console.warn(`[scan] Error evaluating ${inst.symbol}:`, e);
    return null;
  }
}
