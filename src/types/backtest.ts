import type { GroupState } from "./screener";

export interface BacktestConfig {
  name: string;
  timeframe: string;
  universe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  allocationMode: "fixed" | "percent";
  allocationValue: number;
  maxPositions: number;
}

export interface ExitRules {
  stopLossPct: number;
  targetProfitPct: number;
  trailingStopPct: number;
  maxHoldingBars: number;
  exitConditions: GroupState[];
}

export type ExitReason =
  | "stop_loss"
  | "target"
  | "trailing_stop"
  | "max_holding"
  | "exit_condition"
  | "end_of_data";

export interface Trade {
  symbol: string;
  name: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnlRs: number;
  pnlPct: number;
  barsHeld: number;
  exitReason: ExitReason;
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface PeriodReturns {
  "1W": number | null;
  "1M": number | null;
  "3M": number | null;
  "6M": number | null;
  "9M": number | null;
  "1Y": number | null;
}

export interface BacktestResult {
  trades: Trade[];
  totalReturnPct: number;
  totalReturnRs: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdownPct: number;
  profitFactor: number;
  sharpeRatio: number;
  avgWinPct: number;
  avgLossPct: number;
  avgHoldingBars: number;
  equityCurve: EquityPoint[];
  periodReturns: PeriodReturns;
  initialCapital: number;
  finalEquity: number;
}

export interface BacktestProgress {
  phase: "loading" | "computing" | "done" | "error";
  message: string;
  current?: number;
  total?: number;
}
