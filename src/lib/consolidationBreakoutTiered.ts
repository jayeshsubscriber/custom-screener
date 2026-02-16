/**
 * Tier-Based Consolidation Breakout Scanner
 *
 * Classifies stocks into:
 * - Tier 1: Ready to Trade - All criteria pass, breakout confirmed
 * - Tier 2A: Imminent Breakout - Good base, within 2% of breakout
 * - Tier 2B: Watchlist - Good base, within 5% of breakout
 *
 * Supports two contexts:
 * - swing: Short-term bases (5–25 days), 20d prior move, 60 bars min. Suited for Chart/short swing.
 * - positional: Longer bases (10–60 days), 40d prior move, 120 bars min. Suited for weeks-to-months holds.
 */

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ScanContext = "swing" | "positional";

type ThresholdsConfig = {
  CONSOLIDATION_MIN_DAYS: number;
  CONSOLIDATION_MAX_DAYS: number;
  MAX_RANGE_PCT: number;
  MIN_SUPPORT_TOUCHES: number;
  MIN_RESISTANCE_TOUCHES: number;
  LARGE_RED_CANDLE_THRESHOLD: number;
  PRIOR_MOVE_WINDOW: number;
  PRIOR_MOVE_WINDOW_EXTENDED: number;
  MIN_PRIOR_MOVE_PCT: number;
  MIN_PRIOR_MOVE_PCT_RELAXED: number;
  PRIOR_MOVE_DIRECTION_PCT: number;
  MAX_VOLUME_CONTRACTION_RATIO: number;
  MAX_VOLUME_CONTRACTION_RATIO_RELAXED: number;
  MIN_CLOSE_POSITION: number;
  MIN_BREAKOUT_VOLUME_RATIO: number;
  BREAKOUT_BUFFER: number;
  TIER_2A_DISTANCE_PCT: number;
  TIER_2B_DISTANCE_PCT: number;
};

// ============== THRESHOLDS ==============
// Swing: short bases, 20d prior, tighter watchlist. Good for Chart page and short swing.
const SWING_THRESHOLDS: ThresholdsConfig = {
  CONSOLIDATION_MIN_DAYS: 5,
  CONSOLIDATION_MAX_DAYS: 25,
  MAX_RANGE_PCT: 10,
  MIN_SUPPORT_TOUCHES: 2,
  MIN_RESISTANCE_TOUCHES: 2,
  LARGE_RED_CANDLE_THRESHOLD: 0.03,
  PRIOR_MOVE_WINDOW: 20,
  PRIOR_MOVE_WINDOW_EXTENDED: 40,
  MIN_PRIOR_MOVE_PCT: 15,
  MIN_PRIOR_MOVE_PCT_RELAXED: 10,
  PRIOR_MOVE_DIRECTION_PCT: 10,
  MAX_VOLUME_CONTRACTION_RATIO: 0.60,
  MAX_VOLUME_CONTRACTION_RATIO_RELAXED: 0.70,
  MIN_CLOSE_POSITION: 0.60,
  MIN_BREAKOUT_VOLUME_RATIO: 1.5,
  BREAKOUT_BUFFER: 1.005,
  TIER_2A_DISTANCE_PCT: 2.0,
  TIER_2B_DISTANCE_PCT: 5.0,
};

// Positional (weeks–months): longer bases 10–60d, 40d/60d prior trend, slightly looser volume/range,
// wider watchlist 2.5% / 8% so more names qualify; min 120 bars so prior + base have enough history.
const POSITIONAL_THRESHOLDS: ThresholdsConfig = {
  CONSOLIDATION_MIN_DAYS: 10,
  CONSOLIDATION_MAX_DAYS: 60,
  MAX_RANGE_PCT: 12,
  MIN_SUPPORT_TOUCHES: 2,
  MIN_RESISTANCE_TOUCHES: 2,
  LARGE_RED_CANDLE_THRESHOLD: 0.035,
  PRIOR_MOVE_WINDOW: 40,
  PRIOR_MOVE_WINDOW_EXTENDED: 60,
  MIN_PRIOR_MOVE_PCT: 12,
  MIN_PRIOR_MOVE_PCT_RELAXED: 8,
  PRIOR_MOVE_DIRECTION_PCT: 10,
  MAX_VOLUME_CONTRACTION_RATIO: 0.65,
  MAX_VOLUME_CONTRACTION_RATIO_RELAXED: 0.75,
  MIN_CLOSE_POSITION: 0.55,
  MIN_BREAKOUT_VOLUME_RATIO: 1.3,
  BREAKOUT_BUFFER: 1.005,
  TIER_2A_DISTANCE_PCT: 2.5,
  TIER_2B_DISTANCE_PCT: 8.0,
};

let _scanContext: ScanContext = "swing";

function getThresholds(): ThresholdsConfig {
  return _scanContext === "positional" ? POSITIONAL_THRESHOLDS : SWING_THRESHOLDS;
}

export const MIN_BARS_SWING = 60;
export const MIN_BARS_POSITIONAL = 120;

// ============== RESULT INTERFACES ==============

export interface C8Result {
  passed: boolean | "partial";
  type: "continuation" | "pullback_in_uptrend" | "recovery_base" | "neutral_base" | "downtrend";
  confidence: "high" | "medium" | "low" | "none";
  direction_20d: number;
  direction_40d: number;
  higher_lows?: boolean;
}

export interface C9Result {
  passed: boolean;
  passed_relaxed: boolean;
  actual: number;
  threshold_strict: number;
  threshold_relaxed: number;
  avg_vol_prior: number;
  avg_vol_consolidation: number;
}

export interface C10Result {
  status: "BREAKOUT_CONFIRMED" | "BREAKOUT_WEAK_VOLUME" | "BREAKOUT_NO_VOLUME" | "IMMINENT" | "WATCHLIST" | "TOO_FAR";
  is_breakout: boolean;
  distance_pct: number;
  breakout_level: number;
  current_price: number;
  volume_ratio: number;
  close_position: number;
  avg_volume_50d: number;
  tier_eligible: 1 | 2 | null;
  caveat?: string;
  price_above_ema50: boolean;
  ema50_rising: boolean;
  ema50: number;
  ema50_10d_ago: number;
}

export interface TierClassification {
  tier: "1" | "2A" | "2B" | null;
  tier_name: "Ready to Trade" | "Imminent Breakout" | "Watchlist" | "No Pattern";
  confidence: "high" | "medium" | "low" | "none";
  action: string | null;
}

export interface ConsolidationAnalysis {
  best_window_found: boolean;
  window_duration?: number;
  window_start_date?: string;
  window_end_date?: string;
  consolidation_high?: number;
  consolidation_low?: number;
  range_pct?: number;
  quality_score?: number;
  start_idx?: number;
}

export interface CriterionResult {
  passed: boolean | "partial";
  actual: number | boolean | string;
  required?: number | boolean | string;
  required_min?: number;
  required_max?: number;
  note?: string;
  [key: string]: unknown;
}

export interface TieredScanResult {
  symbol: string;
  scan_date: string;
  tier_classification: TierClassification;
  score: {
    criteria_passed: number;
    criteria_total: number;
    score_pct: number;
  };
  consolidation_analysis: ConsolidationAnalysis;
  criteria_results: {
    C1_consolidation_found: CriterionResult;
    C2_range_pct: CriterionResult;
    C3_support_touches: CriterionResult;
    C4_resistance_touches: CriterionResult;
    C5_no_lower_lows_after_day3: CriterionResult;
    C6_no_large_red_candles: CriterionResult;
    C7_prior_move_pct: CriterionResult;
    C8_prior_move_direction: C8Result & CriterionResult;
    C9_volume_contraction: C9Result & CriterionResult;
    C10_breakout_status: C10Result & CriterionResult;
  };
  caveats: string[];
  price_info?: {
    current_price: number;
    breakout_level: number;
    distance_to_breakout: string;
    consolidation_low: number;
    suggested_stop: number;
  };
  volume_info?: {
    avg_volume_50d: number;
    volume_trigger: string;
    today_volume_ratio: string;
  };
}

export interface TieredScanOutput {
  scan_date: string;
  scan_summary: {
    total_scanned: number;
    tier_1_count: number;
    tier_2a_count: number;
    tier_2b_count: number;
    market_note: string;
  };
  tier_1_ready_to_trade: TieredScanResult[];
  tier_2a_imminent_breakout: TieredScanResult[];
  tier_2b_watchlist: TieredScanResult[];
}

// ============== HELPER FUNCTIONS ==============

function ema(series: number[], span: number): number[] {
  const out: number[] = [];
  const k = 2 / (span + 1);
  for (let i = 0; i < series.length; i++) {
    if (i === 0) out.push(series[0]);
    else out.push(series[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

interface ConsolidationWindow {
  duration: number;
  data: OhlcvRow[];
  high: number;
  low: number;
  range_pct: number;
  start_date: string;
  end_date: string;
  start_idx: number;
  support_touches: number;
  resistance_touches: number;
  has_lower_lows_after_day3: boolean;
  has_large_red_candles: boolean;
  quality_score: number;
}

function hasLowerLowsAfterDay3(consol: OhlcvRow[]): boolean {
  if (consol.length < 4) return false;
  const lowAtDay3 = Math.min(...consol.slice(0, 3).map((r) => r.low));
  const subsequent = consol.slice(3).map((r) => r.low);
  return subsequent.some((l) => l < lowAtDay3 * 0.998);
}

function countSupportResistanceTouches(
  consol: OhlcvRow[],
  consolHigh: number,
  consolLow: number
): { supportTouches: number; resistanceTouches: number } {
  const range = consolHigh - consolLow;
  const supportZone = consolLow + range * 0.3;
  const resistanceZone = consolHigh - range * 0.3;
  const supportTouches = consol.filter((r) => r.low <= supportZone).length;
  const resistanceTouches = consol.filter((r) => r.high >= resistanceZone).length;
  return { supportTouches, resistanceTouches };
}

function hasLargeRedCandles(consol: OhlcvRow[], threshold = 0.03): boolean {
  return consol.some((r) => {
    if (r.open <= r.close) return false;
    const bodyPct = (r.open - r.close) / r.open;
    return bodyPct > threshold;
  });
}

function calculateWindowQualityScore(
  rangePct: number,
  supportTouches: number,
  resistanceTouches: number,
  hasLowerLows: boolean,
  hasLargeRed: boolean
): number {
  const rangeScore = rangePct <= 10 ? 25 : rangePct <= 15 ? 12.5 : 0;
  const supportScore = (Math.min(supportTouches, 3) / 3) * 25;
  const resistanceScore = (Math.min(resistanceTouches, 3) / 3) * 25;
  const lowerLowsScore = hasLowerLows ? 0 : 15;
  const largeRedScore = hasLargeRed ? 0 : 10;
  return rangeScore + supportScore + resistanceScore + lowerLowsScore + largeRedScore;
}

/**
 * Check if consolidation is forming higher lows (bullish pattern).
 */
function checkHigherLows(consolidationData: OhlcvRow[]): boolean {
  if (consolidationData.length < 6) return false;
  
  const third = Math.floor(consolidationData.length / 3);
  const firstThirdLow = Math.min(...consolidationData.slice(0, third).map(r => r.low));
  const lastThirdLow = Math.min(...consolidationData.slice(-third).map(r => r.low));
  
  return lastThirdLow > firstThirdLow * 0.99; // Allow 1% tolerance
}

function findBestConsolidationWindow(ohlcv: OhlcvRow[]): ConsolidationWindow | null {
  let bestWindow: ConsolidationWindow | null = null;
  let bestScore = -1;
  
  for (let duration = getThresholds().CONSOLIDATION_MIN_DAYS; duration <= getThresholds().CONSOLIDATION_MAX_DAYS; duration++) {
    const startIdx = ohlcv.length - duration - 1;
    if (startIdx < 0) continue;
    
    const consolData = ohlcv.slice(startIdx, ohlcv.length - 1);
    if (consolData.length < duration) continue;
    
    const consolHigh = Math.max(...consolData.map((r) => r.high));
    const consolLow = Math.min(...consolData.map((r) => r.low));
    const rangePct = ((consolHigh - consolLow) / consolLow) * 100;
    
    const { supportTouches, resistanceTouches } = countSupportResistanceTouches(consolData, consolHigh, consolLow);
    const hasLowerLows = hasLowerLowsAfterDay3(consolData);
    const hasLargeRed = hasLargeRedCandles(consolData, getThresholds().LARGE_RED_CANDLE_THRESHOLD);
    
    const qualityScore = calculateWindowQualityScore(rangePct, supportTouches, resistanceTouches, hasLowerLows, hasLargeRed);
    
    if (qualityScore > bestScore) {
      bestScore = qualityScore;
      bestWindow = {
        duration,
        data: consolData,
        high: consolHigh,
        low: consolLow,
        range_pct: rangePct,
        start_date: consolData[0].date,
        end_date: consolData[consolData.length - 1].date,
        start_idx: startIdx,
        support_touches: supportTouches,
        resistance_touches: resistanceTouches,
        has_lower_lows_after_day3: hasLowerLows,
        has_large_red_candles: hasLargeRed,
        quality_score: qualityScore,
      };
    }
  }
  
  return bestWindow;
}

// ============== C8: PRIOR MOVE DIRECTION (EXTENDED) ==============

function evaluateC8PriorMoveDirection(
  ohlcv: OhlcvRow[],
  consolidationStartIdx: number,
  consolidationData: OhlcvRow[]
): C8Result & CriterionResult {
  const t = getThresholds();
  const windowShort = t.PRIOR_MOVE_WINDOW;
  const windowExtended = t.PRIOR_MOVE_WINDOW_EXTENDED;
  const startIdxShort = Math.max(0, consolidationStartIdx - windowShort);
  const startCloseShort = ohlcv[startIdxShort].close;
  const endClose = ohlcv[consolidationStartIdx - 1]?.close ?? ohlcv[consolidationStartIdx].close;
  const direction20d = ((endClose - startCloseShort) / startCloseShort) * 100;
  const startIdxExtended = Math.max(0, consolidationStartIdx - windowExtended);
  const startCloseExtended = ohlcv[startIdxExtended].close;
  const direction40d = ((endClose - startCloseExtended) / startCloseExtended) * 100;
  
  // Check for higher lows in consolidation (recovery pattern)
  const higherLows = checkHigherLows(consolidationData);
  
  // FULL PASS CONDITIONS
  if (direction20d > 0) {
    return {
      passed: true,
      type: "continuation",
      confidence: "high",
      direction_20d: Math.round(direction20d * 100) / 100,
      direction_40d: Math.round(direction40d * 100) / 100,
      actual: "up",
      required: "up",
    };
  }
  
  if (direction40d >= 5) { // Up 5%+ over 40 days despite recent weakness
    return {
      passed: true,
      type: "pullback_in_uptrend",
      confidence: "high",
      direction_20d: Math.round(direction20d * 100) / 100,
      direction_40d: Math.round(direction40d * 100) / 100,
      actual: "pullback_in_uptrend",
      required: "up",
    };
  }
  
  // PARTIAL PASS CONDITIONS (for Tier 2)
  if (higherLows && direction20d > -15) { // Down <15% but forming higher lows
    return {
      passed: "partial",
      type: "recovery_base",
      confidence: "medium",
      direction_20d: Math.round(direction20d * 100) / 100,
      direction_40d: Math.round(direction40d * 100) / 100,
      higher_lows: true,
      actual: "recovery_base",
      required: "up",
      note: "Recovery base - forming higher lows despite prior weakness",
    };
  }
  
  if (direction40d > -10) { // Not down more than 10% over 40 days
    return {
      passed: "partial",
      type: "neutral_base",
      confidence: "low",
      direction_20d: Math.round(direction20d * 100) / 100,
      direction_40d: Math.round(direction40d * 100) / 100,
      actual: "neutral_base",
      required: "up",
      note: "Neutral trend context - not a classic continuation setup",
    };
  }
  
  // FAIL
  return {
    passed: false,
    type: "downtrend",
    confidence: "none",
    direction_20d: Math.round(direction20d * 100) / 100,
    direction_40d: Math.round(direction40d * 100) / 100,
    actual: "downtrend",
    required: "up",
  };
}

// ============== C9: VOLUME CONTRACTION (WITH RELAXED) ==============

function evaluateC9VolumeContraction(
  ohlcv: OhlcvRow[],
  consolidationStartIdx: number,
  consolidationData: OhlcvRow[]
): C9Result & CriterionResult {
  const priorWindow = getThresholds().PRIOR_MOVE_WINDOW;
  const priorStartIdx = Math.max(0, consolidationStartIdx - priorWindow);
  const priorData = ohlcv.slice(priorStartIdx, consolidationStartIdx);
  const avgVolPrior = priorData.length > 0 
    ? priorData.reduce((s, r) => s + r.volume, 0) / priorData.length 
    : 1;
  
  const avgVolConsol = consolidationData.reduce((s, r) => s + r.volume, 0) / consolidationData.length;
  const ratio = avgVolConsol / avgVolPrior;
  
  return {
    passed: ratio <= getThresholds().MAX_VOLUME_CONTRACTION_RATIO,
    passed_relaxed: ratio <= getThresholds().MAX_VOLUME_CONTRACTION_RATIO_RELAXED,
    actual: Math.round(ratio * 100) / 100,
    threshold_strict: getThresholds().MAX_VOLUME_CONTRACTION_RATIO,
    threshold_relaxed: getThresholds().MAX_VOLUME_CONTRACTION_RATIO_RELAXED,
    avg_vol_prior: Math.round(avgVolPrior),
    avg_vol_consolidation: Math.round(avgVolConsol),
    required_max: getThresholds().MAX_VOLUME_CONTRACTION_RATIO,
  };
}

// ============== C10: BREAKOUT STATUS (WITH DISTANCE) ==============

function evaluateC10BreakoutStatus(
  ohlcv: OhlcvRow[],
  consolidationHigh: number,
  _consolidationLow: number
): C10Result & CriterionResult {
  const today = ohlcv[ohlcv.length - 1];
  const currentClose = today.close;
  const todayVolume = today.volume;
  const todayHigh = today.high;
  const todayLow = today.low;
  
  // Calculate EMAs
  const closes = ohlcv.map(r => r.close);
  const ema50Series = ema(closes, 50);
  const ema50 = ema50Series[ema50Series.length - 1];
  const ema50_10dAgo = ema50Series[ema50Series.length - 11] ?? ema50;
  
  const avgVolume50d = ohlcv.slice(-50).reduce((s, r) => s + r.volume, 0) / Math.min(50, ohlcv.length);
  
  // Breakout level = consolidation high + 0.5% buffer
  const breakoutLevel = consolidationHigh * getThresholds().BREAKOUT_BUFFER;
  
  // Calculate distance to breakout
  const distancePct = ((breakoutLevel - currentClose) / currentClose) * 100;
  
  // Volume ratio
  const volumeRatio = todayVolume / avgVolume50d;
  
  // Close position in day's range
  const closePosition = todayHigh !== todayLow 
    ? (currentClose - todayLow) / (todayHigh - todayLow) 
    : 0.5;
  
  const priceAboveEma50 = currentClose >= ema50;
  const ema50Rising = ema50 >= ema50_10dAgo;
  
  const baseResult = {
    breakout_level: Math.round(breakoutLevel * 100) / 100,
    current_price: Math.round(currentClose * 100) / 100,
    distance_pct: Math.round(distancePct * 100) / 100,
    volume_ratio: Math.round(volumeRatio * 100) / 100,
    close_position: Math.round(closePosition * 100) / 100,
    avg_volume_50d: Math.round(avgVolume50d),
    price_above_ema50: priceAboveEma50,
    ema50_rising: ema50Rising,
    ema50: Math.round(ema50 * 100) / 100,
    ema50_10d_ago: Math.round(ema50_10dAgo * 100) / 100,
    actual: distancePct,
    required_max: 0,
  };
  
  // TIER 1: Confirmed breakout with strong volume
  if (currentClose > breakoutLevel && volumeRatio >= 1.5 && closePosition >= 0.6) {
    return {
      ...baseResult,
      status: "BREAKOUT_CONFIRMED",
      is_breakout: true,
      tier_eligible: 1,
      passed: true,
    };
  }
  
  // TIER 1 (weak): Breakout with moderate volume
  if (currentClose > breakoutLevel && volumeRatio >= 1.0) {
    return {
      ...baseResult,
      status: "BREAKOUT_WEAK_VOLUME",
      is_breakout: true,
      tier_eligible: 1,
      caveat: "Breakout confirmed but volume below ideal (< 1.5x)",
      passed: true,
    };
  }
  
  // TIER 1 (weak): Breakout with weak volume - demote to Tier 2
  if (currentClose > breakoutLevel) {
    return {
      ...baseResult,
      status: "BREAKOUT_NO_VOLUME",
      is_breakout: true,
      tier_eligible: 2,
      caveat: "Price broke out but volume not confirming",
      passed: "partial" as unknown as boolean,
    };
  }
  
  // TIER 2A: Imminent breakout (within 2%)
  if (distancePct <= getThresholds().TIER_2A_DISTANCE_PCT) {
    return {
      ...baseResult,
      status: "IMMINENT",
      is_breakout: false,
      tier_eligible: 2,
      passed: false,
    };
  }
  
  // TIER 2B: Watchlist (within 5%)
  if (distancePct <= getThresholds().TIER_2B_DISTANCE_PCT) {
    return {
      ...baseResult,
      status: "WATCHLIST",
      is_breakout: false,
      tier_eligible: 2,
      passed: false,
    };
  }
  
  // Not eligible for Tier 1 or 2
  return {
    ...baseResult,
    status: "TOO_FAR",
    is_breakout: false,
    tier_eligible: null,
    passed: false,
  };
}

// ============== TIER CLASSIFICATION ==============

function classifyStockTier(criteriaResults: TieredScanResult["criteria_results"]): TierClassification {
  // Extract results
  const c1 = criteriaResults.C1_consolidation_found.passed === true;
  const c2 = criteriaResults.C2_range_pct.passed === true;
  const c3 = criteriaResults.C3_support_touches.passed === true;
  const c4 = criteriaResults.C4_resistance_touches.passed === true;
  const c5 = criteriaResults.C5_no_lower_lows_after_day3.passed === true;
  const c6 = criteriaResults.C6_no_large_red_candles.passed === true;
  
  const c7Passed = criteriaResults.C7_prior_move_pct.passed === true;
  const c7Actual = criteriaResults.C7_prior_move_pct.actual as number;
  const c7Relaxed = c7Actual >= getThresholds().MIN_PRIOR_MOVE_PCT_RELAXED;
  
  const c8Result = criteriaResults.C8_prior_move_direction;
  const c8Passed = c8Result.passed === true;
  const c8Partial = c8Result.passed === "partial" || c8Passed;
  
  const c9Result = criteriaResults.C9_volume_contraction;
  const c9Passed = c9Result.passed === true;
  const c9Relaxed = c9Result.passed_relaxed;
  
  const c10Result = criteriaResults.C10_breakout_status;
  const c10Status = c10Result.status;
  const distancePct = c10Result.distance_pct;
  
  // Base quality check (C1-C6)
  const baseQualityStrict = c1 && c2 && c3 && c4 && c5 && c6;
  const baseQualityRelaxed = c1 && c2 && c3 && c4 && (c5 || c6); // Allow one of C5/C6 to fail
  
  // TIER 1: Ready to Trade
  if (baseQualityStrict && 
      c7Passed && 
      c8Passed && 
      c9Passed && 
      (c10Status === "BREAKOUT_CONFIRMED" || c10Status === "BREAKOUT_WEAK_VOLUME")) {
    return {
      tier: "1",
      tier_name: "Ready to Trade",
      confidence: "high",
      action: `Enter now with stop below consolidation low`,
    };
  }
  
  // TIER 2A: Imminent Breakout (within 2%)
  if (baseQualityStrict && 
      (c7Passed || c7Relaxed) && 
      c8Partial && 
      (c9Passed || c9Relaxed) && 
      distancePct <= getThresholds().TIER_2A_DISTANCE_PCT) {
    return {
      tier: "2A",
      tier_name: "Imminent Breakout",
      confidence: "high",
      action: `Enter on break above ${c10Result.breakout_level} with volume surge`,
    };
  }
  
  // TIER 2B: Watchlist (within 5%)
  if (baseQualityRelaxed && 
      (c7Passed || c7Relaxed) && 
      c8Partial && 
      (c9Passed || c9Relaxed) && 
      distancePct <= getThresholds().TIER_2B_DISTANCE_PCT) {
    return {
      tier: "2B",
      tier_name: "Watchlist",
      confidence: "medium",
      action: `Watch for break above ${c10Result.breakout_level}`,
    };
  }
  
  // TIER 2B: Breakout without volume (demoted from Tier 1)
  if (baseQualityRelaxed && 
      c8Partial && 
      c10Status === "BREAKOUT_NO_VOLUME") {
    return {
      tier: "2B",
      tier_name: "Watchlist",
      confidence: "low",
      action: "Broke out but needs volume confirmation. Watch for follow-through.",
    };
  }
  
  // No tier
  return {
    tier: null,
    tier_name: "No Pattern",
    confidence: "none",
    action: null,
  };
}

// ============== CAVEATS GENERATION ==============

function generateCaveats(criteriaResults: TieredScanResult["criteria_results"]): string[] {
  const caveats: string[] = [];
  
  const c8Result = criteriaResults.C8_prior_move_direction;
  const c9Result = criteriaResults.C9_volume_contraction;
  const c10Result = criteriaResults.C10_breakout_status;
  
  // C8 caveats
  if (c8Result.passed === "partial") {
    if (c8Result.type === "recovery_base") {
      caveats.push("⚠️ Recovery base - prior trend was down, higher risk");
    } else if (c8Result.type === "neutral_base") {
      caveats.push("⚠️ Neutral trend context - not a classic continuation setup");
    }
  }
  
  if (c8Result.direction_20d < -10) {
    caveats.push(`⚠️ Prior 20-day trend down ${c8Result.direction_20d}%`);
  }
  
  // C9 caveats
  if (!c9Result.passed && c9Result.passed_relaxed) {
    caveats.push(`⚠️ Volume contraction ${c9Result.actual}x slightly high (ideal < 0.6x)`);
  }
  
  // C10 caveats
  if (c10Result.status === "BREAKOUT_WEAK_VOLUME") {
    caveats.push("⚠️ Breakout on below-average volume - watch for follow-through");
  }
  
  if (c10Result.status === "BREAKOUT_NO_VOLUME") {
    caveats.push("🚨 Breakout with very low volume - high risk of false breakout");
  }
  
  // EMA caveats
  if (!c10Result.price_above_ema50) {
    caveats.push("⚠️ Price below 50 EMA - trend not fully confirmed");
  }
  
  if (!c10Result.ema50_rising) {
    caveats.push("⚠️ 50 EMA still falling - wait for trend confirmation");
  }
  
  return caveats;
}

// ============== MAIN SCAN FUNCTION ==============

export function scanStockTiered(
  ohlcv: OhlcvRow[],
  symbol: string,
  context: ScanContext = "swing"
): TieredScanResult {
  const prevContext = _scanContext;
  _scanContext = context;
  const minBars = context === "positional" ? MIN_BARS_POSITIONAL : MIN_BARS_SWING;

  const scanDate = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].date : "";

  // Initialize result
  const result: TieredScanResult = {
    symbol,
    scan_date: scanDate,
    tier_classification: { tier: null, tier_name: "No Pattern", confidence: "none", action: null },
    score: { criteria_passed: 0, criteria_total: 10, score_pct: 0 },
    consolidation_analysis: { best_window_found: false },
    criteria_results: {
      C1_consolidation_found: { passed: false, actual: false, required: true },
      C2_range_pct: { passed: false, actual: 0, required_max: getThresholds().MAX_RANGE_PCT },
      C3_support_touches: { passed: false, actual: 0, required_min: getThresholds().MIN_SUPPORT_TOUCHES },
      C4_resistance_touches: { passed: false, actual: 0, required_min: getThresholds().MIN_RESISTANCE_TOUCHES },
      C5_no_lower_lows_after_day3: { passed: false, actual: true, required: false },
      C6_no_large_red_candles: { passed: false, actual: true, required: false },
      C7_prior_move_pct: { passed: false, actual: 0, required_min: getThresholds().MIN_PRIOR_MOVE_PCT },
      C8_prior_move_direction: { 
        passed: false, type: "downtrend", confidence: "none", 
        direction_20d: 0, direction_40d: 0, actual: "downtrend", required: "up" 
      },
      C9_volume_contraction: { 
        passed: false, passed_relaxed: false, actual: 0, 
        threshold_strict: 0.6, threshold_relaxed: 0.7,
        avg_vol_prior: 0, avg_vol_consolidation: 0, required_max: 0.6
      },
      C10_breakout_status: {
        status: "TOO_FAR", is_breakout: false, distance_pct: 100,
        breakout_level: 0, current_price: 0, volume_ratio: 0,
        close_position: 0, avg_volume_50d: 0, tier_eligible: null,
        price_above_ema50: false, ema50_rising: false, ema50: 0, ema50_10d_ago: 0,
        passed: false, actual: 100, required_max: 0
      },
    },
    caveats: [],
  };
  
  // Check minimum data (context-dependent: swing 60, positional 120)
  if (ohlcv.length < minBars) {
    result.caveats.push(`Insufficient data: ${ohlcv.length} rows, need ${minBars}`);
    _scanContext = prevContext;
    return result;
  }

  // Find best consolidation window
  const bestWindow = findBestConsolidationWindow(ohlcv);
  
  if (!bestWindow) {
    result.caveats.push("No valid consolidation window found");
    _scanContext = prevContext;
    return result;
  }

  // C1: Consolidation found
  result.criteria_results.C1_consolidation_found = { passed: true, actual: true, required: true };
  
  result.consolidation_analysis = {
    best_window_found: true,
    window_duration: bestWindow.duration,
    window_start_date: bestWindow.start_date,
    window_end_date: bestWindow.end_date,
    consolidation_high: Math.round(bestWindow.high * 100) / 100,
    consolidation_low: Math.round(bestWindow.low * 100) / 100,
    range_pct: Math.round(bestWindow.range_pct * 100) / 100,
    quality_score: Math.round(bestWindow.quality_score * 100) / 100,
    start_idx: bestWindow.start_idx,
  };
  
  // C2: Range percentage
  const rangePassed = bestWindow.range_pct <= getThresholds().MAX_RANGE_PCT;
  result.criteria_results.C2_range_pct = {
    passed: rangePassed,
    actual: Math.round(bestWindow.range_pct * 100) / 100,
    required_max: getThresholds().MAX_RANGE_PCT,
  };
  
  // C3: Support touches
  const supportPassed = bestWindow.support_touches >= getThresholds().MIN_SUPPORT_TOUCHES;
  result.criteria_results.C3_support_touches = {
    passed: supportPassed,
    actual: bestWindow.support_touches,
    required_min: getThresholds().MIN_SUPPORT_TOUCHES,
  };
  
  // C4: Resistance touches
  const resistancePassed = bestWindow.resistance_touches >= getThresholds().MIN_RESISTANCE_TOUCHES;
  result.criteria_results.C4_resistance_touches = {
    passed: resistancePassed,
    actual: bestWindow.resistance_touches,
    required_min: getThresholds().MIN_RESISTANCE_TOUCHES,
  };
  
  // C5: No lower lows after day 3
  const lowerLowsPassed = !bestWindow.has_lower_lows_after_day3;
  result.criteria_results.C5_no_lower_lows_after_day3 = {
    passed: lowerLowsPassed,
    actual: bestWindow.has_lower_lows_after_day3,
    required: false,
  };
  
  // C6: No large red candles
  const largeRedPassed = !bestWindow.has_large_red_candles;
  result.criteria_results.C6_no_large_red_candles = {
    passed: largeRedPassed,
    actual: bestWindow.has_large_red_candles,
    required: false,
  };
  
  // C7: Prior move percentage
  const priorEndIdx = bestWindow.start_idx;
  const priorStartIdx = Math.max(0, priorEndIdx - getThresholds().PRIOR_MOVE_WINDOW);
  const priorData = ohlcv.slice(priorStartIdx, priorEndIdx);
  
  let priorMovePct = 0;
  if (priorData.length > 0) {
    const priorLow = Math.min(...priorData.map(r => r.low));
    const priorHigh = Math.max(...priorData.map(r => r.high));
    priorMovePct = ((priorHigh - priorLow) / priorLow) * 100;
  }
  
  const priorMovePassed = priorMovePct >= getThresholds().MIN_PRIOR_MOVE_PCT;
  result.criteria_results.C7_prior_move_pct = {
    passed: priorMovePassed,
    actual: Math.round(priorMovePct * 100) / 100,
    required_min: getThresholds().MIN_PRIOR_MOVE_PCT,
  };
  
  // C8: Prior move direction (extended)
  result.criteria_results.C8_prior_move_direction = evaluateC8PriorMoveDirection(
    ohlcv, bestWindow.start_idx, bestWindow.data
  );
  
  // C9: Volume contraction
  result.criteria_results.C9_volume_contraction = evaluateC9VolumeContraction(
    ohlcv, bestWindow.start_idx, bestWindow.data
  );
  
  // C10: Breakout status
  result.criteria_results.C10_breakout_status = evaluateC10BreakoutStatus(
    ohlcv, bestWindow.high, bestWindow.low
  );
  
  // Calculate score
  let passedCount = 0;
  for (const [_key, criterion] of Object.entries(result.criteria_results)) {
    if (criterion.passed === true) passedCount++;
    // Partial passes count as 0.5
    if (criterion.passed === "partial") passedCount += 0.5;
  }
  
  result.score = {
    criteria_passed: Math.round(passedCount),
    criteria_total: 10,
    score_pct: Math.round(passedCount * 10),
  };
  
  // Classify tier
  result.tier_classification = classifyStockTier(result.criteria_results);
  
  // Generate caveats
  result.caveats = generateCaveats(result.criteria_results);
  
  // Add price info and volume info for tiered stocks
  if (result.tier_classification.tier) {
    const c10 = result.criteria_results.C10_breakout_status;
    result.price_info = {
      current_price: c10.current_price,
      breakout_level: c10.breakout_level,
      distance_to_breakout: `${c10.distance_pct.toFixed(2)}%`,
      consolidation_low: result.consolidation_analysis.consolidation_low ?? 0,
      suggested_stop: Math.round((result.consolidation_analysis.consolidation_low ?? 0) * 0.99 * 100) / 100,
    };
    
    result.volume_info = {
      avg_volume_50d: c10.avg_volume_50d,
      volume_trigger: Math.round(c10.avg_volume_50d * 1.5).toLocaleString(),
      today_volume_ratio: `${c10.volume_ratio.toFixed(2)}x`,
    };
  }

  _scanContext = prevContext;
  return result;
}

// ============== GENERATE TIERED OUTPUT ==============

function generateMarketNote(tier1Count: number, tier2aCount: number): string {
  if (tier1Count >= 5) {
    return "🟢 Healthy market - multiple confirmed breakouts";
  } else if (tier1Count >= 1) {
    return "🟡 Selective opportunities - few confirmed breakouts";
  } else if (tier2aCount >= 10) {
    return "🟡 Building momentum - multiple stocks near breakout";
  } else {
    return "🔴 Correction phase - breakout setups require patience";
  }
}

export function generateTieredScanOutput(results: TieredScanResult[]): TieredScanOutput {
  const tier1Stocks = results.filter(r => r.tier_classification.tier === "1");
  const tier2aStocks = results.filter(r => r.tier_classification.tier === "2A");
  const tier2bStocks = results.filter(r => r.tier_classification.tier === "2B");
  
  // Sort by distance to breakout (closest first)
  const sortByDistance = (a: TieredScanResult, b: TieredScanResult) => {
    const distA = a.criteria_results.C10_breakout_status.distance_pct;
    const distB = b.criteria_results.C10_breakout_status.distance_pct;
    return distA - distB;
  };
  
  tier2aStocks.sort(sortByDistance);
  tier2bStocks.sort(sortByDistance);
  
  const scanDate = results.length > 0 ? results[0].scan_date : new Date().toISOString().slice(0, 10);
  
  return {
    scan_date: scanDate,
    scan_summary: {
      total_scanned: results.length,
      tier_1_count: tier1Stocks.length,
      tier_2a_count: tier2aStocks.length,
      tier_2b_count: tier2bStocks.length,
      market_note: generateMarketNote(tier1Stocks.length, tier2aStocks.length),
    },
    tier_1_ready_to_trade: tier1Stocks,
    tier_2a_imminent_breakout: tier2aStocks,
    tier_2b_watchlist: tier2bStocks,
  };
}
