/**
 * Condition evaluator: takes a screener query + OHLCV data for one stock,
 * evaluates all conditions/groups, returns match result.
 */
import type { OhlcvRow, ConditionState, GroupState, QueryState } from "@/types/screener";
import { computeIndicator } from "@/lib/indicators";
import { getIndicator } from "@/data/indicators";

export interface EvalResult {
  match: boolean;
  matchedGroups: number;
  details: GroupEvalResult[];
}

interface GroupEvalResult {
  groupId: string;
  match: boolean;
  conditionResults: { conditionId: string; match: boolean }[];
}

/**
 * Evaluate a single comparison operator between two values at a specific bar index.
 */
function evalOperator(
  op: string,
  leftVals: number[],
  rightVals: number[] | null,
  rightScalar: number | null,
  multiplier: number,
  idx: number,
  rightValue2: number | null
): boolean {
  const left = leftVals[idx];
  if (Number.isNaN(left) || left === undefined) return false;

  let right: number;
  if (rightVals) {
    const rv = rightVals[idx];
    if (Number.isNaN(rv) || rv === undefined) return false;
    right = rv * multiplier;
  } else if (rightScalar !== null) {
    right = rightScalar;
  } else {
    right = 0;
  }

  switch (op) {
    case "greater_than":
      return left > right;
    case "less_than":
      return left < right;
    case "greater_equal":
      return left >= right;
    case "less_equal":
      return left <= right;
    case "is_between":
      return rightScalar !== null && rightValue2 !== null
        ? left >= rightScalar && left <= rightValue2
        : false;
    case "crossed_above": {
      if (idx === 0) return false;
      const prevLeft = leftVals[idx - 1];
      const prevRight = rightVals
        ? (rightVals[idx - 1] ?? NaN) * multiplier
        : right;
      if (Number.isNaN(prevLeft) || Number.isNaN(prevRight)) return false;
      return prevLeft <= prevRight && left > right;
    }
    case "crossed_below": {
      if (idx === 0) return false;
      const prevLeft = leftVals[idx - 1];
      const prevRight = rightVals
        ? (rightVals[idx - 1] ?? NaN) * multiplier
        : right;
      if (Number.isNaN(prevLeft) || Number.isNaN(prevRight)) return false;
      return prevLeft >= prevRight && left < right;
    }
    case "detected":
      return left === 1;
    case "is_increasing": {
      if (idx === 0) return false;
      const prev = leftVals[idx - 1];
      return !Number.isNaN(prev) && left > prev;
    }
    case "is_decreasing": {
      if (idx === 0) return false;
      const prev = leftVals[idx - 1];
      return !Number.isNaN(prev) && left < prev;
    }
    default:
      return false;
  }
}

/**
 * Evaluate a single condition with time modifiers against OHLCV data.
 */
function evalCondition(condition: ConditionState, data: OhlcvRow[]): boolean {
  if (!condition.leftIndicatorId || !condition.operator) return false;
  const leftInd = getIndicator(condition.leftIndicatorId);
  if (!leftInd) return false;

  const leftVals = computeIndicator(condition.leftIndicatorId, condition.leftParams, data);
  const len = data.length;
  if (len === 0) return false;

  // Compute right side
  let rightVals: number[] | null = null;
  let rightScalar: number | null = null;
  let rightValue2: number | null = null;
  const multiplier = condition.rightMultiplier || 1;

  const op = condition.operator;

  if (op === "detected" || op === "is_increasing" || op === "is_decreasing") {
    // No right operand needed
  } else if (condition.rightType === "indicator" && condition.rightIndicatorId) {
    rightVals = computeIndicator(condition.rightIndicatorId, condition.rightParams, data);
  } else {
    rightScalar = condition.rightValue ? Number(condition.rightValue) : null;
    if (rightScalar !== null && Number.isNaN(rightScalar)) rightScalar = null;
    rightValue2 = condition.rightValue2 ? Number(condition.rightValue2) : null;
  }

  const lastIdx = len - 1;

  // Handle "is_increasing" / "is_decreasing" with consecutive bars
  if (op === "is_increasing" || op === "is_decreasing") {
    const bars = condition.timeModifierBars || 3;
    for (let b = 0; b < bars; b++) {
      const idx = lastIdx - b;
      if (idx <= 0) return false;
      const curr = leftVals[idx];
      const prev = leftVals[idx - 1];
      if (Number.isNaN(curr) || Number.isNaN(prev)) return false;
      if (op === "is_increasing" && curr <= prev) return false;
      if (op === "is_decreasing" && curr >= prev) return false;
    }
    return true;
  }

  // No time modifier → evaluate at current (last) bar
  if (!condition.hasTimeModifier) {
    return evalOperator(op, leftVals, rightVals, rightScalar, multiplier, lastIdx, rightValue2);
  }

  const bars = condition.timeModifierBars || 5;
  const mode = condition.timeModifierMode;

  if (mode === "exactly_ago") {
    const idx = lastIdx - bars;
    if (idx < 0) return false;
    return evalOperator(op, leftVals, rightVals, rightScalar, multiplier, idx, rightValue2);
  }

  if (mode === "all_of_last") {
    for (let b = 0; b < bars; b++) {
      const idx = lastIdx - b;
      if (idx < 0) return false;
      if (!evalOperator(op, leftVals, rightVals, rightScalar, multiplier, idx, rightValue2)) {
        return false;
      }
    }
    return true;
  }

  // Default: "within_last" — true if condition was true at any bar in the window
  for (let b = 0; b < bars; b++) {
    const idx = lastIdx - b;
    if (idx < 0) break;
    if (evalOperator(op, leftVals, rightVals, rightScalar, multiplier, idx, rightValue2)) {
      return true;
    }
  }
  return false;
}

/**
 * Evaluate a single group: all conditions combined with AND/OR logic.
 */
function evalGroup(group: GroupState, data: OhlcvRow[]): GroupEvalResult {
  const conditionResults = group.conditions.map((c) => ({
    conditionId: c.id,
    match: evalCondition(c, data),
  }));

  const validResults = conditionResults.filter(
    (_, i) => group.conditions[i].leftIndicatorId && group.conditions[i].operator
  );

  let match: boolean;
  if (validResults.length === 0) {
    match = false;
  } else if (group.logic === "AND") {
    match = validResults.every((r) => r.match);
  } else {
    match = validResults.some((r) => r.match);
  }

  return { groupId: group.id, match, conditionResults };
}

/**
 * Evaluate the full query against OHLCV data keyed by timeframe.
 * Each group can use a different timeframe.
 */
export function evaluateQuery(
  query: QueryState,
  ohlcvByTimeframe: Record<string, OhlcvRow[]>
): EvalResult {
  const details: GroupEvalResult[] = [];
  let matchedGroups = 0;

  for (const group of query.groups) {
    const tf = group.timeframe || "1d";
    const data = ohlcvByTimeframe[tf];
    if (!data || data.length === 0) {
      details.push({ groupId: group.id, match: false, conditionResults: [] });
      continue;
    }
    const result = evalGroup(group, data);
    if (result.match) matchedGroups++;
    details.push(result);
  }

  // Combine groups using connectors: first group's connector is ignored
  let overallMatch = false;
  if (details.length === 0) {
    overallMatch = false;
  } else if (details.length === 1) {
    overallMatch = details[0].match;
  } else {
    overallMatch = details[0].match;
    for (let i = 1; i < details.length; i++) {
      const connector = query.groups[i].connector;
      if (connector === "OR") {
        overallMatch = overallMatch || details[i].match;
      } else {
        overallMatch = overallMatch && details[i].match;
      }
    }
  }

  return { match: overallMatch, matchedGroups, details };
}
