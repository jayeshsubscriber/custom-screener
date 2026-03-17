import { supabase } from "@/lib/supabase";
import type { OhlcvRow, GroupState } from "@/types/screener";
import type {
  BacktestConfig,
  ExitRules,
  Trade,
  BacktestResult,
  BacktestProgress,
  EquityPoint,
  PeriodReturns,
  ExitReason,
} from "@/types/backtest";
import { precomputeCondition, evalConditionAtBar, type PrecomputedCondition } from "@/lib/conditionEvaluator";
import { getInstrumentList } from "@/lib/scannerDataPipeline";

// ─── OHLCV loading (reuses same Supabase tables as scanner) ──────────────────

type CandleTable = "stock_candles_1d" | "stock_candles_15m" | "stock_candles_1m";

const TIMEFRAME_TABLE: Record<string, CandleTable> = {
  "1d": "stock_candles_1d",
  "15m": "stock_candles_15m",
  "1M": "stock_candles_1m",
};

async function loadOhlcv(symbol: string, table: CandleTable): Promise<OhlcvRow[]> {
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

  if (table === "stock_candles_1m") {
    const { data, error } = await supabase
      .from(table)
      .select("month, open, high, low, close, volume")
      .eq("symbol", symbol)
      .order("month", { ascending: true })
      .limit(500);
    if (error || !data) return [];
    return data.map((r) => ({
      date: (r.month as string).slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
    }));
  }

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

// ─── Per-group pre-computation ───────────────────────────────────────────────

interface PrecomputedGroup {
  logic: "AND" | "OR";
  conditions: PrecomputedCondition[];
}

function precomputeGroups(
  groups: GroupState[],
  data: OhlcvRow[]
): PrecomputedGroup[] {
  return groups.map((g) => {
    const pcs: PrecomputedCondition[] = [];
    for (const c of g.conditions) {
      const pc = precomputeCondition(c, data);
      if (pc) pcs.push(pc);
    }
    return { logic: g.logic, conditions: pcs };
  });
}

function evalGroupsAtBar(
  groups: PrecomputedGroup[],
  barIdx: number,
  connectors: ("AND" | "OR")[]
): boolean {
  if (groups.length === 0) return false;

  const groupResults = groups.map((g) => {
    if (g.conditions.length === 0) return false;
    if (g.logic === "AND") {
      return g.conditions.every((pc) => evalConditionAtBar(pc, barIdx));
    }
    return g.conditions.some((pc) => evalConditionAtBar(pc, barIdx));
  });

  let result = groupResults[0];
  for (let i = 1; i < groupResults.length; i++) {
    if (connectors[i] === "OR") {
      result = result || groupResults[i];
    } else {
      result = result && groupResults[i];
    }
  }
  return result;
}

// ─── Single-stock backtest ───────────────────────────────────────────────────

interface OpenPosition {
  entryIdx: number;
  entryPrice: number;
  highSinceEntry: number;
}

function backtestStock(
  symbol: string,
  name: string,
  data: OhlcvRow[],
  entryGroups: GroupState[],
  exitRules: ExitRules,
  scanStartIdx: number,
  scanEndIdx: number
): Trade[] {
  if (scanStartIdx >= scanEndIdx || scanEndIdx > data.length) return [];

  const entryPre = precomputeGroups(entryGroups, data);
  const entryConnectors = entryGroups.map((g) => g.connector);
  const hasExitConditions = exitRules.exitConditions.length > 0 &&
    exitRules.exitConditions.some((g) => g.conditions.some((c) => c.leftIndicatorId && c.operator));
  const exitPre = hasExitConditions ? precomputeGroups(exitRules.exitConditions, data) : [];
  const exitConnectors = exitRules.exitConditions.map((g) => g.connector);

  const trades: Trade[] = [];
  let pos: OpenPosition | null = null;

  for (let i = scanStartIdx; i < scanEndIdx; i++) {
    const bar = data[i];

    if (pos) {
      if (bar.high > pos.highSinceEntry) pos.highSinceEntry = bar.high;

      let exitReason: ExitReason | null = null;
      let exitPrice = bar.close;

      if (exitRules.stopLossPct > 0) {
        const stopPrice = pos.entryPrice * (1 - exitRules.stopLossPct / 100);
        if (bar.low <= stopPrice) {
          exitReason = "stop_loss";
          exitPrice = stopPrice;
        }
      }

      if (!exitReason && exitRules.targetProfitPct > 0) {
        const targetPrice = pos.entryPrice * (1 + exitRules.targetProfitPct / 100);
        if (bar.high >= targetPrice) {
          exitReason = "target";
          exitPrice = targetPrice;
        }
      }

      if (!exitReason && exitRules.trailingStopPct > 0) {
        const trailPrice = pos.highSinceEntry * (1 - exitRules.trailingStopPct / 100);
        if (bar.low <= trailPrice) {
          exitReason = "trailing_stop";
          exitPrice = trailPrice;
        }
      }

      if (!exitReason && exitRules.maxHoldingBars > 0) {
        const barsHeld = i - pos.entryIdx;
        if (barsHeld >= exitRules.maxHoldingBars) {
          exitReason = "max_holding";
          exitPrice = bar.close;
        }
      }

      if (!exitReason && exitPre.length > 0) {
        if (evalGroupsAtBar(exitPre, i, exitConnectors)) {
          exitReason = "exit_condition";
          exitPrice = bar.close;
        }
      }

      if (exitReason) {
        const pnlRs = exitPrice - pos.entryPrice;
        const pnlPct = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100;
        trades.push({
          symbol,
          name,
          entryDate: data[pos.entryIdx].date,
          entryPrice: Math.round(pos.entryPrice * 100) / 100,
          exitDate: bar.date,
          exitPrice: Math.round(exitPrice * 100) / 100,
          pnlRs: Math.round(pnlRs * 100) / 100,
          pnlPct: Math.round(pnlPct * 100) / 100,
          barsHeld: i - pos.entryIdx,
          exitReason,
        });
        pos = null;
      }
      continue;
    }

    // No open position: check entry
    if (evalGroupsAtBar(entryPre, i, entryConnectors)) {
      if (i + 1 < data.length) {
        const entryPrice = data[i + 1].open;
        if (entryPrice > 0) {
          pos = { entryIdx: i + 1, entryPrice, highSinceEntry: entryPrice };
        }
      }
    }
  }

  // Force-close if still open at end
  if (pos) {
    const lastBar = data[data.length - 1];
    const pnlRs = lastBar.close - pos.entryPrice;
    const pnlPct = ((lastBar.close - pos.entryPrice) / pos.entryPrice) * 100;
    trades.push({
      symbol,
      name,
      entryDate: data[pos.entryIdx].date,
      entryPrice: Math.round(pos.entryPrice * 100) / 100,
      exitDate: lastBar.date,
      exitPrice: Math.round(lastBar.close * 100) / 100,
      pnlRs: Math.round(pnlRs * 100) / 100,
      pnlPct: Math.round(pnlPct * 100) / 100,
      barsHeld: data.length - 1 - pos.entryIdx,
      exitReason: "end_of_data",
    });
  }

  return trades;
}

// ─── Metric computation ──────────────────────────────────────────────────────

function computeEquityCurve(
  trades: Trade[],
  initialCapital: number,
  allocationMode: "fixed" | "percent",
  allocationValue: number
): EquityPoint[] {
  if (trades.length === 0) return [{ date: new Date().toISOString().slice(0, 10), equity: initialCapital }];

  const sorted = [...trades].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  let equity = initialCapital;

  const points: EquityPoint[] = [{ date: sorted[0].entryDate, equity }];

  for (const t of sorted) {
    const positionSize = allocationMode === "fixed"
      ? Math.min(allocationValue, equity)
      : equity * (allocationValue / 100);

    if (positionSize <= 0) continue;

    const shares = positionSize / t.entryPrice;
    const tradePnl = shares * (t.exitPrice - t.entryPrice);
    equity += tradePnl;
    points.push({ date: t.exitDate, equity: Math.round(equity * 100) / 100 });
  }

  return points;
}

function computePeriodReturns(equityCurve: EquityPoint[]): PeriodReturns {
  if (equityCurve.length < 2) {
    return { "1W": null, "1M": null, "3M": null, "6M": null, "9M": null, "1Y": null };
  }

  const endEquity = equityCurve[equityCurve.length - 1].equity;
  const endDate = new Date(equityCurve[equityCurve.length - 1].date);
  const startDate = new Date(equityCurve[0].date);

  function getReturnSince(daysBack: number): number | null {
    const target = new Date(endDate);
    target.setDate(target.getDate() - daysBack);
    if (target < startDate) return null;

    let closest = equityCurve[0];
    for (const p of equityCurve) {
      if (new Date(p.date) <= target) closest = p;
      else break;
    }
    if (closest.equity === 0) return null;
    return Math.round(((endEquity - closest.equity) / closest.equity) * 10000) / 100;
  }

  return {
    "1W": getReturnSince(7),
    "1M": getReturnSince(30),
    "3M": getReturnSince(90),
    "6M": getReturnSince(180),
    "9M": getReturnSince(270),
    "1Y": getReturnSince(365),
  };
}

function computeMetrics(
  trades: Trade[],
  equityCurve: EquityPoint[],
  initialCapital: number
): Omit<BacktestResult, "trades" | "equityCurve" | "periodReturns" | "initialCapital"> {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnlPct > 0);
  const losses = trades.filter((t) => t.pnlPct <= 0);
  const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 10000) / 100 : 0;

  const avgWinPct = wins.length > 0
    ? Math.round((wins.reduce((s, t) => s + t.pnlPct, 0) / wins.length) * 100) / 100
    : 0;
  const avgLossPct = losses.length > 0
    ? Math.round((losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length) * 100) / 100
    : 0;

  const avgHoldingBars = totalTrades > 0
    ? Math.round(trades.reduce((s, t) => s + t.barsHeld, 0) / totalTrades)
    : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnlPct, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPct, 0));
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0;

  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const totalReturnRs = Math.round((finalEquity - initialCapital) * 100) / 100;
  const totalReturnPct = initialCapital > 0
    ? Math.round(((finalEquity - initialCapital) / initialCapital) * 10000) / 100
    : 0;

  // Max drawdown from equity curve
  let peak = initialCapital;
  let maxDd = 0;
  for (const p of equityCurve) {
    if (p.equity > peak) peak = p.equity;
    const dd = peak > 0 ? ((peak - p.equity) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }
  const maxDrawdownPct = Math.round(maxDd * 100) / 100;

  // Sharpe ratio (annualized, assumes daily returns)
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    if (prev > 0) returns.push((equityCurve[i].equity - prev) / prev);
  }
  let sharpeRatio = 0;
  if (returns.length > 1) {
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? Math.round((avgReturn / stdDev) * Math.sqrt(252) * 100) / 100 : 0;
  }

  return {
    totalReturnPct,
    totalReturnRs,
    winRate,
    totalTrades,
    winningTrades: wins.length,
    losingTrades: losses.length,
    maxDrawdownPct,
    profitFactor,
    sharpeRatio,
    avgWinPct,
    avgLossPct,
    avgHoldingBars,
    finalEquity: Math.round(finalEquity * 100) / 100,
  };
}

// ─── Main backtest runner ────────────────────────────────────────────────────

/**
 * Compute a default scan-start index when no start date is specified.
 * Uses 2× the longest indicator period so values have time to stabilize.
 * Never exceeds half the available data so there is always a scan range.
 */
function defaultScanStart(
  entryGroups: GroupState[],
  exitGroups: GroupState[],
  dataLen: number
): number {
  let maxPeriod = 0;
  for (const g of [...entryGroups, ...exitGroups]) {
    for (const c of g.conditions) {
      for (const v of Object.values(c.leftParams)) {
        if (typeof v === "number" && v > maxPeriod) maxPeriod = v;
      }
      for (const v of Object.values(c.rightParams)) {
        if (typeof v === "number" && v > maxPeriod) maxPeriod = v;
      }
    }
  }

  const warmup = Math.max(maxPeriod * 3, 30);
  return Math.min(warmup, Math.floor(dataLen / 2));
}

export async function runBacktest(
  config: BacktestConfig,
  entryGroups: GroupState[],
  exitRules: ExitRules,
  onProgress?: (p: BacktestProgress) => void
): Promise<BacktestResult> {
  if (!supabase) throw new Error("Supabase not configured");

  const table = TIMEFRAME_TABLE[config.timeframe];
  if (!table) throw new Error(`Timeframe "${config.timeframe}" not supported.`);

  onProgress?.({ phase: "loading", message: "Loading instruments..." });
  const instruments = await getInstrumentList(config.universe);
  const total = instruments.length;

  onProgress?.({ phase: "computing", message: `Backtesting ${total} stocks...`, current: 0, total });

  const allTrades: Trade[] = [];
  const batchSize = 5;
  let skippedStocks = 0;

  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (inst) => {
        const ohlcv = await loadOhlcv(inst.symbol, table);
        if (ohlcv.length < 10) { skippedStocks++; return []; }

        let scanStart: number;
        let scanEnd: number;

        if (config.startDate) {
          const idx = ohlcv.findIndex((r) => r.date.slice(0, 10) >= config.startDate);
          scanStart = idx === -1 ? ohlcv.length : idx;
        } else {
          scanStart = defaultScanStart(entryGroups, exitRules.exitConditions, ohlcv.length);
        }

        if (config.endDate) {
          scanEnd = ohlcv.length;
          for (let j = ohlcv.length - 1; j >= 0; j--) {
            if (ohlcv[j].date.slice(0, 10) <= config.endDate) {
              scanEnd = j + 1;
              break;
            }
          }
        } else {
          scanEnd = ohlcv.length;
        }

        if (scanStart >= scanEnd) { skippedStocks++; return []; }

        return backtestStock(inst.symbol, inst.name, ohlcv, entryGroups, exitRules, scanStart, scanEnd);
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.length > 0) {
        allTrades.push(...r.value);
      }
    }

    onProgress?.({
      phase: "computing",
      message: `Backtested ${Math.min(i + batchSize, total)} / ${total} stocks`,
      current: Math.min(i + batchSize, total),
      total,
    });
  }

  const equityCurve = computeEquityCurve(allTrades, config.initialCapital, config.allocationMode, config.allocationValue);
  const periodReturns = computePeriodReturns(equityCurve);
  const metrics = computeMetrics(allTrades, equityCurve, config.initialCapital);

  const scanned = total - skippedStocks;
  const doneMsg = allTrades.length > 0
    ? `Backtest complete. ${allTrades.length} trades found across ${scanned} stocks.`
    : `Backtest complete. 0 trades found across ${scanned} stocks.${skippedStocks > 0 ? ` ${skippedStocks} stocks had insufficient data.` : ""} Try a different timeframe or adjust entry conditions.`;
  onProgress?.({ phase: "done", message: doneMsg, current: total, total });

  return {
    trades: allTrades.sort((a, b) => a.entryDate.localeCompare(b.entryDate)),
    equityCurve,
    periodReturns,
    initialCapital: config.initialCapital,
    ...metrics,
  };
}
