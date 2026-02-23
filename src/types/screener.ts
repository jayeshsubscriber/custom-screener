import type { OperatorId } from "@/data/indicators";

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ConditionState {
  id: string;
  leftIndicatorId: string;
  leftParams: Record<string, number | string>;
  operator: OperatorId | "";
  rightType: "value" | "indicator";
  rightValue: string;
  rightIndicatorId: string;
  rightParams: Record<string, number | string>;
  rightMultiplier: number;
  rightValue2: string;
  hasTimeModifier: boolean;
  timeModifierMode: "within_last" | "exactly_ago" | "all_of_last";
  timeModifierBars: number;
}

export interface GroupState {
  id: string;
  logic: "AND" | "OR";
  timeframe: string;
  connector: "AND" | "OR";
  conditions: ConditionState[];
}

export interface QueryState {
  name: string;
  universe: string;
  groups: GroupState[];
}

export interface IndicatorColumn {
  key: string;
  label: string;
  indicatorId: string;
  params: Record<string, number | string>;
}

export interface ScanResultRow {
  symbol: string;
  name: string;
  close: number;
  change1d: number;
  volume: number;
  matchedGroups: number;
  indicatorValues: Record<string, number>;
}

export interface ScanProgress {
  phase: "loading_data" | "computing" | "done" | "error";
  message: string;
  matched?: number;
  total?: number;
}
