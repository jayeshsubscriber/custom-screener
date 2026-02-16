/**
 * Diagnostic Consolidation Breakout Scanner
 * 
 * Unlike the standard scanner that stops at first failure, this evaluates ALL criteria
 * for every stock and returns detailed diagnostic information including:
 * - Score (criteria passed / total)
 * - Individual criterion results with actual vs required values
 * - Near-miss analysis with relaxed thresholds
 * - Best consolidation window even if imperfect
 */

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============== THRESHOLDS ==============
const THRESHOLDS = {
  // Consolidation window
  CONSOLIDATION_MIN_DAYS: 5,
  CONSOLIDATION_MAX_DAYS: 25,
  
  // C2: Range
  MAX_RANGE_PCT: 10,
  RELAXED_RANGE_PCT_12: 12,
  RELAXED_RANGE_PCT_15: 15,
  
  // C3, C4: Support/Resistance touches
  MIN_SUPPORT_TOUCHES: 2,
  MIN_RESISTANCE_TOUCHES: 2,
  RELAXED_MIN_TOUCHES: 1,
  
  // C6: Large red candle
  LARGE_RED_CANDLE_THRESHOLD: 0.03, // 3%
  
  // C7: Prior move
  PRIOR_MOVE_WINDOW: 20,
  MIN_PRIOR_MOVE_PCT: 15,
  RELAXED_PRIOR_MOVE_PCT_12: 12,
  RELAXED_PRIOR_MOVE_PCT_10: 10,
  
  // C8: Prior move direction
  PRIOR_MOVE_DIRECTION_PCT: 10, // end must be 10% above start
  RELAXED_DIRECTION_ANY_UP: 0, // any upward move
  
  // C9: Volume contraction
  MAX_VOLUME_CONTRACTION_RATIO: 0.60,
  RELAXED_VOLUME_CONTRACTION_RATIO: 0.70,
  
  // C10: Breakout candle
  MIN_CLOSE_POSITION: 0.60,
  MIN_BREAKOUT_VOLUME_RATIO: 1.5,
  BREAKOUT_BUFFER: 1.005,
  MAX_GAP_PCT: 0.03, // 3%
};

// ============== RESULT INTERFACES ==============

export interface CriterionResult {
  passed: boolean;
  actual: number | boolean | string;
  required?: number | boolean | string;
  required_min?: number;
  required_max?: number;
  note?: string;
  // Additional fields for specific criteria
  [key: string]: unknown;
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
}

export interface RelaxedThresholdsAnalysis {
  would_pass_with_12pct_range: boolean;
  would_pass_with_15pct_range: boolean;
  would_pass_with_12pct_prior_move: boolean;
  would_pass_with_10pct_prior_move: boolean;
  would_pass_with_1_support_touch: boolean;
  would_pass_with_1_resistance_touch: boolean;
  would_pass_with_70pct_vol_contraction: boolean;
  would_pass_if_all_relaxed: boolean;
}

export interface DiagnosticScore {
  criteria_passed: number;
  criteria_total: number;
  score_pct: number;
}

export interface DiagnosticResult {
  symbol: string;
  scan_date: string;
  match: boolean;
  score: DiagnosticScore;
  consolidation_analysis: ConsolidationAnalysis;
  criteria_results: {
    C1_consolidation_found: CriterionResult;
    C2_range_pct: CriterionResult;
    C3_support_touches: CriterionResult;
    C4_resistance_touches: CriterionResult;
    C5_no_lower_lows_after_day3: CriterionResult;
    C6_no_large_red_candles: CriterionResult;
    C7_prior_move_pct: CriterionResult;
    C8_prior_move_direction: CriterionResult;
    C9_volume_contraction: CriterionResult;
    C10_breakout_candle_quality: CriterionResult;
  };
  relaxed_thresholds_analysis: RelaxedThresholdsAnalysis;
  failure_reasons: string[];
}

export interface ScanSummary {
  total_stocks_scanned: number;
  total_matches: number;
  stocks_by_score: {
    "90_to_100": number;
    "80_to_89": number;
    "70_to_79": number;
    "60_to_69": number;
    "below_60": number;
  };
  criteria_failure_frequency: {
    C1_consolidation_found: number;
    C2_range_pct: number;
    C3_support_touches: number;
    C4_resistance_touches: number;
    C5_no_lower_lows_after_day3: number;
    C6_no_large_red_candles: number;
    C7_prior_move_pct: number;
    C8_prior_move_direction: number;
    C9_volume_contraction: number;
    C10_breakout_candle_quality: number;
  };
  top_near_misses: Array<{
    symbol: string;
    score_pct: number;
    failed_criteria: string[];
  }>;
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
  // Quality score calculation as specified
  const rangeScore = rangePct <= 10 ? 25 : rangePct <= 15 ? 12.5 : 0;
  const supportScore = (Math.min(supportTouches, 3) / 3) * 25;
  const resistanceScore = (Math.min(resistanceTouches, 3) / 3) * 25;
  const lowerLowsScore = hasLowerLows ? 0 : 15;
  const largeRedScore = hasLargeRed ? 0 : 10;
  
  return rangeScore + supportScore + resistanceScore + lowerLowsScore + largeRedScore;
}

/**
 * Find the best consolidation window, even if imperfect.
 * Returns the window with the highest quality score.
 */
function findBestConsolidationWindow(ohlcv: OhlcvRow[]): ConsolidationWindow | null {
  let bestWindow: ConsolidationWindow | null = null;
  let bestScore = -1;
  
  for (let duration = THRESHOLDS.CONSOLIDATION_MIN_DAYS; duration <= THRESHOLDS.CONSOLIDATION_MAX_DAYS; duration++) {
    const consolData = ohlcv.slice(-(duration + 1), -1);
    if (consolData.length < duration) continue;
    
    const consolHigh = Math.max(...consolData.map((r) => r.high));
    const consolLow = Math.min(...consolData.map((r) => r.low));
    const rangePct = ((consolHigh - consolLow) / consolLow) * 100;
    
    const { supportTouches, resistanceTouches } = countSupportResistanceTouches(
      consolData, consolHigh, consolLow
    );
    
    const hasLowerLows = hasLowerLowsAfterDay3(consolData);
    const hasLargeRed = hasLargeRedCandles(consolData, THRESHOLDS.LARGE_RED_CANDLE_THRESHOLD);
    
    const qualityScore = calculateWindowQualityScore(
      rangePct, supportTouches, resistanceTouches, hasLowerLows, hasLargeRed
    );
    
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

// ============== MAIN DIAGNOSTIC FUNCTION ==============

export function scanStockDiagnostic(
  ohlcv: OhlcvRow[],
  symbol: string
): DiagnosticResult {
  const scanDate = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].date : "";
  const today = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1] : null;
  const yesterday = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2] : null;
  
  // Initialize result structure
  const result: DiagnosticResult = {
    symbol,
    scan_date: scanDate,
    match: false,
    score: { criteria_passed: 0, criteria_total: 10, score_pct: 0 },
    consolidation_analysis: { best_window_found: false },
    criteria_results: {
      C1_consolidation_found: { passed: false, actual: false, required: true },
      C2_range_pct: { passed: false, actual: 0, required_max: THRESHOLDS.MAX_RANGE_PCT },
      C3_support_touches: { passed: false, actual: 0, required_min: THRESHOLDS.MIN_SUPPORT_TOUCHES },
      C4_resistance_touches: { passed: false, actual: 0, required_min: THRESHOLDS.MIN_RESISTANCE_TOUCHES },
      C5_no_lower_lows_after_day3: { passed: false, actual: true, required: false },
      C6_no_large_red_candles: { passed: false, actual: true, required: false },
      C7_prior_move_pct: { passed: false, actual: 0, required_min: THRESHOLDS.MIN_PRIOR_MOVE_PCT },
      C8_prior_move_direction: { passed: false, actual: "down", required: "up" },
      C9_volume_contraction: { passed: false, actual: 0, required_max: THRESHOLDS.MAX_VOLUME_CONTRACTION_RATIO },
      C10_breakout_candle_quality: { passed: false, actual: 0, required_min: THRESHOLDS.MIN_CLOSE_POSITION },
    },
    relaxed_thresholds_analysis: {
      would_pass_with_12pct_range: false,
      would_pass_with_15pct_range: false,
      would_pass_with_12pct_prior_move: false,
      would_pass_with_10pct_prior_move: false,
      would_pass_with_1_support_touch: false,
      would_pass_with_1_resistance_touch: false,
      would_pass_with_70pct_vol_contraction: false,
      would_pass_if_all_relaxed: false,
    },
    failure_reasons: [],
  };
  
  // Check minimum data requirement
  if (ohlcv.length < 60 || !today) {
    result.failure_reasons.push(`Insufficient data: ${ohlcv.length} rows, need 60`);
    return result;
  }
  
  // Calculate EMAs and average volume
  const closes = ohlcv.map((r) => r.close);
  const ema50Series = ema(closes, 50);
  const ema50 = ema50Series[ema50Series.length - 1];
  const ema50_10dAgo = ema50Series[ema50Series.length - 11];
  const avgVolume50d = ohlcv.slice(-50).reduce((s, r) => s + r.volume, 0) / 50;
  
  // ============== C1: Find best consolidation window ==============
  const bestWindow = findBestConsolidationWindow(ohlcv);
  
  if (bestWindow) {
    result.criteria_results.C1_consolidation_found = {
      passed: true,
      actual: true,
      required: true,
    };
    
    result.consolidation_analysis = {
      best_window_found: true,
      window_duration: bestWindow.duration,
      window_start_date: bestWindow.start_date,
      window_end_date: bestWindow.end_date,
      consolidation_high: Math.round(bestWindow.high * 100) / 100,
      consolidation_low: Math.round(bestWindow.low * 100) / 100,
      range_pct: Math.round(bestWindow.range_pct * 100) / 100,
      quality_score: Math.round(bestWindow.quality_score * 100) / 100,
    };
    
    // ============== C2: Range percentage ==============
    const rangePassed = bestWindow.range_pct <= THRESHOLDS.MAX_RANGE_PCT;
    result.criteria_results.C2_range_pct = {
      passed: rangePassed,
      actual: Math.round(bestWindow.range_pct * 100) / 100,
      required_max: THRESHOLDS.MAX_RANGE_PCT,
      note: !rangePassed && bestWindow.range_pct <= THRESHOLDS.RELAXED_RANGE_PCT_12 
        ? "NEAR MISS - would pass with 12% threshold"
        : !rangePassed && bestWindow.range_pct <= THRESHOLDS.RELAXED_RANGE_PCT_15
          ? "NEAR MISS - would pass with 15% threshold"
          : undefined,
    };
    result.relaxed_thresholds_analysis.would_pass_with_12pct_range = bestWindow.range_pct <= THRESHOLDS.RELAXED_RANGE_PCT_12;
    result.relaxed_thresholds_analysis.would_pass_with_15pct_range = bestWindow.range_pct <= THRESHOLDS.RELAXED_RANGE_PCT_15;
    
    // ============== C3: Support touches ==============
    const supportPassed = bestWindow.support_touches >= THRESHOLDS.MIN_SUPPORT_TOUCHES;
    result.criteria_results.C3_support_touches = {
      passed: supportPassed,
      actual: bestWindow.support_touches,
      required_min: THRESHOLDS.MIN_SUPPORT_TOUCHES,
      note: !supportPassed && bestWindow.support_touches >= THRESHOLDS.RELAXED_MIN_TOUCHES
        ? "NEAR MISS - would pass with threshold of 1"
        : undefined,
    };
    result.relaxed_thresholds_analysis.would_pass_with_1_support_touch = bestWindow.support_touches >= THRESHOLDS.RELAXED_MIN_TOUCHES;
    
    // ============== C4: Resistance touches ==============
    const resistancePassed = bestWindow.resistance_touches >= THRESHOLDS.MIN_RESISTANCE_TOUCHES;
    result.criteria_results.C4_resistance_touches = {
      passed: resistancePassed,
      actual: bestWindow.resistance_touches,
      required_min: THRESHOLDS.MIN_RESISTANCE_TOUCHES,
      note: !resistancePassed && bestWindow.resistance_touches >= THRESHOLDS.RELAXED_MIN_TOUCHES
        ? "NEAR MISS - would pass with threshold of 1"
        : undefined,
    };
    result.relaxed_thresholds_analysis.would_pass_with_1_resistance_touch = bestWindow.resistance_touches >= THRESHOLDS.RELAXED_MIN_TOUCHES;
    
    // ============== C5: No lower lows after day 3 ==============
    const lowerLowsPassed = !bestWindow.has_lower_lows_after_day3;
    result.criteria_results.C5_no_lower_lows_after_day3 = {
      passed: lowerLowsPassed,
      actual: bestWindow.has_lower_lows_after_day3,
      required: false, // We require NO lower lows (false)
    };
    
    // ============== C6: No large red candles ==============
    const largeRedPassed = !bestWindow.has_large_red_candles;
    result.criteria_results.C6_no_large_red_candles = {
      passed: largeRedPassed,
      actual: bestWindow.has_large_red_candles,
      required: false, // We require NO large red candles (false)
    };
    
    // ============== C7: Prior move percentage ==============
    const priorEndIdx = ohlcv.length - bestWindow.duration - 1;
    const priorStartIdx = Math.max(0, priorEndIdx - THRESHOLDS.PRIOR_MOVE_WINDOW);
    const priorData = ohlcv.slice(priorStartIdx, priorEndIdx);
    
    let priorMovePct = 0;
    let priorLow = 0;
    let priorHigh = 0;
    
    if (priorData.length > 0) {
      priorLow = Math.min(...priorData.map((r) => r.low));
      priorHigh = Math.max(...priorData.map((r) => r.high));
      priorMovePct = ((priorHigh - priorLow) / priorLow) * 100;
    }
    
    const priorMovePassed = priorMovePct >= THRESHOLDS.MIN_PRIOR_MOVE_PCT;
    result.criteria_results.C7_prior_move_pct = {
      passed: priorMovePassed,
      actual: Math.round(priorMovePct * 100) / 100,
      required_min: THRESHOLDS.MIN_PRIOR_MOVE_PCT,
      prior_low: Math.round(priorLow * 100) / 100,
      prior_high: Math.round(priorHigh * 100) / 100,
      note: !priorMovePassed && priorMovePct >= THRESHOLDS.RELAXED_PRIOR_MOVE_PCT_12
        ? "NEAR MISS - would pass with 12% threshold"
        : !priorMovePassed && priorMovePct >= THRESHOLDS.RELAXED_PRIOR_MOVE_PCT_10
          ? "NEAR MISS - would pass with 10% threshold"
          : undefined,
    };
    result.relaxed_thresholds_analysis.would_pass_with_12pct_prior_move = priorMovePct >= THRESHOLDS.RELAXED_PRIOR_MOVE_PCT_12;
    result.relaxed_thresholds_analysis.would_pass_with_10pct_prior_move = priorMovePct >= THRESHOLDS.RELAXED_PRIOR_MOVE_PCT_10;
    
    // ============== C8: Prior move direction ==============
    let priorDirectionPassed = false;
    let directionPct = 0;
    let startClose = 0;
    let endClose = 0;
    
    if (priorData.length > 0) {
      startClose = priorData[0].close;
      endClose = priorData[priorData.length - 1].close;
      directionPct = ((endClose - startClose) / startClose) * 100;
      priorDirectionPassed = endClose >= startClose * (1 + THRESHOLDS.PRIOR_MOVE_DIRECTION_PCT / 100);
    }
    
    result.criteria_results.C8_prior_move_direction = {
      passed: priorDirectionPassed,
      actual: directionPct > 0 ? "up" : "down",
      required: "up",
      start_close: Math.round(startClose * 100) / 100,
      end_close: Math.round(endClose * 100) / 100,
      direction_pct: Math.round(directionPct * 100) / 100,
      note: !priorDirectionPassed && directionPct > 0
        ? "NEAR MISS - upward but less than 10%"
        : undefined,
    };
    
    // ============== C9: Volume contraction ==============
    const avgVolPrior = priorData.length > 0 
      ? priorData.reduce((s, r) => s + r.volume, 0) / priorData.length 
      : 1;
    const avgVolConsol = bestWindow.data.reduce((s, r) => s + r.volume, 0) / bestWindow.data.length;
    const volContractionRatio = avgVolConsol / avgVolPrior;
    
    const volContractionPassed = volContractionRatio <= THRESHOLDS.MAX_VOLUME_CONTRACTION_RATIO;
    result.criteria_results.C9_volume_contraction = {
      passed: volContractionPassed,
      actual: Math.round(volContractionRatio * 100) / 100,
      required_max: THRESHOLDS.MAX_VOLUME_CONTRACTION_RATIO,
      avg_vol_prior: Math.round(avgVolPrior),
      avg_vol_consolidation: Math.round(avgVolConsol),
      note: !volContractionPassed && volContractionRatio <= THRESHOLDS.RELAXED_VOLUME_CONTRACTION_RATIO
        ? "NEAR MISS - would pass with 0.70 threshold"
        : undefined,
    };
    result.relaxed_thresholds_analysis.would_pass_with_70pct_vol_contraction = volContractionRatio <= THRESHOLDS.RELAXED_VOLUME_CONTRACTION_RATIO;
    
    // ============== C10: Breakout candle quality ==============
    const breakoutLevel = bestWindow.high * THRESHOLDS.BREAKOUT_BUFFER;
    const isBreakout = today.close > breakoutLevel;
    const candleRange = today.high - today.low;
    const closePosition = candleRange > 0 ? (today.close - today.low) / candleRange : 0;
    const breakoutVolumeRatio = today.volume / avgVolume50d;
    const gapPct = yesterday ? (today.open - yesterday.close) / yesterday.close : 0;
    
    const closePositionPassed = closePosition >= THRESHOLDS.MIN_CLOSE_POSITION;
    const volumePassed = breakoutVolumeRatio >= THRESHOLDS.MIN_BREAKOUT_VOLUME_RATIO;
    const gapPassed = gapPct <= THRESHOLDS.MAX_GAP_PCT;
    const priceAboveEma50 = today.close >= ema50;
    const ema50Rising = ema50 >= ema50_10dAgo;
    
    const breakoutQualityPassed = isBreakout && closePositionPassed && volumePassed && gapPassed && priceAboveEma50 && ema50Rising;
    
    const breakoutIssues: string[] = [];
    if (!isBreakout) breakoutIssues.push(`No breakout: close ${today.close.toFixed(2)} <= level ${breakoutLevel.toFixed(2)}`);
    if (!closePositionPassed) breakoutIssues.push(`Weak close position: ${(closePosition * 100).toFixed(0)}% < 60%`);
    if (!volumePassed) breakoutIssues.push(`Low volume: ${breakoutVolumeRatio.toFixed(2)}x < 1.5x`);
    if (!gapPassed) breakoutIssues.push(`Gap too large: ${(gapPct * 100).toFixed(1)}% > 3%`);
    if (!priceAboveEma50) breakoutIssues.push(`Price below EMA50: ${today.close.toFixed(2)} < ${ema50.toFixed(2)}`);
    if (!ema50Rising) breakoutIssues.push(`EMA50 falling: ${ema50.toFixed(2)} < ${ema50_10dAgo.toFixed(2)}`);
    
    result.criteria_results.C10_breakout_candle_quality = {
      passed: breakoutQualityPassed,
      actual: closePosition,
      required_min: THRESHOLDS.MIN_CLOSE_POSITION,
      is_breakout: isBreakout,
      today_close: Math.round(today.close * 100) / 100,
      breakout_level: Math.round(breakoutLevel * 100) / 100,
      close_position_in_range: Math.round(closePosition * 100) / 100,
      breakout_volume_ratio: Math.round(breakoutVolumeRatio * 100) / 100,
      required_min_volume_ratio: THRESHOLDS.MIN_BREAKOUT_VOLUME_RATIO,
      gap_pct: Math.round(gapPct * 10000) / 100,
      price_above_ema50: priceAboveEma50,
      ema50_rising: ema50Rising,
      ema50: Math.round(ema50 * 100) / 100,
      ema50_10d_ago: Math.round(ema50_10dAgo * 100) / 100,
      issues: breakoutIssues.length > 0 ? breakoutIssues : undefined,
    };
    
  } else {
    // No consolidation window found
    result.failure_reasons.push("No consolidation window found (5-25 days)");
  }
  
  // ============== Calculate final score ==============
  const criteriaKeys = Object.keys(result.criteria_results) as Array<keyof typeof result.criteria_results>;
  const passedCount = criteriaKeys.filter(k => result.criteria_results[k].passed).length;
  
  result.score = {
    criteria_passed: passedCount,
    criteria_total: criteriaKeys.length,
    score_pct: Math.round((passedCount / criteriaKeys.length) * 100),
  };
  
  // ============== Determine match ==============
  result.match = passedCount === criteriaKeys.length;
  
  // ============== Collect failure reasons ==============
  for (const [key, criterion] of Object.entries(result.criteria_results)) {
    if (!criterion.passed) {
      let reason = `${key}: actual ${criterion.actual}`;
      if (criterion.required_min !== undefined) {
        reason += ` < required_min ${criterion.required_min}`;
      } else if (criterion.required_max !== undefined) {
        reason += ` > required_max ${criterion.required_max}`;
      } else if (criterion.required !== undefined) {
        reason += ` vs required ${criterion.required}`;
      }
      if (criterion.note) {
        reason += ` (${criterion.note})`;
      }
      result.failure_reasons.push(reason);
    }
  }
  
  // ============== Calculate relaxed pass ==============
  // Would it pass if all thresholds were relaxed?
  const relaxedChecks = result.relaxed_thresholds_analysis;
  const c2Relaxed = result.criteria_results.C2_range_pct.passed || relaxedChecks.would_pass_with_15pct_range;
  const c3Relaxed = result.criteria_results.C3_support_touches.passed || relaxedChecks.would_pass_with_1_support_touch;
  const c4Relaxed = result.criteria_results.C4_resistance_touches.passed || relaxedChecks.would_pass_with_1_resistance_touch;
  const c7Relaxed = result.criteria_results.C7_prior_move_pct.passed || relaxedChecks.would_pass_with_10pct_prior_move;
  const c9Relaxed = result.criteria_results.C9_volume_contraction.passed || relaxedChecks.would_pass_with_70pct_vol_contraction;
  
  // Criteria that can't be relaxed: C1, C5, C6, C8, C10
  const fixedCriteriaPassed = 
    result.criteria_results.C1_consolidation_found.passed &&
    result.criteria_results.C5_no_lower_lows_after_day3.passed &&
    result.criteria_results.C6_no_large_red_candles.passed &&
    result.criteria_results.C8_prior_move_direction.passed &&
    result.criteria_results.C10_breakout_candle_quality.passed;
  
  relaxedChecks.would_pass_if_all_relaxed = fixedCriteriaPassed && c2Relaxed && c3Relaxed && c4Relaxed && c7Relaxed && c9Relaxed;
  
  return result;
}

// ============== SCAN SUMMARY GENERATOR ==============

export function generateScanSummary(results: DiagnosticResult[]): ScanSummary {
  const summary: ScanSummary = {
    total_stocks_scanned: results.length,
    total_matches: results.filter(r => r.match).length,
    stocks_by_score: {
      "90_to_100": 0,
      "80_to_89": 0,
      "70_to_79": 0,
      "60_to_69": 0,
      "below_60": 0,
    },
    criteria_failure_frequency: {
      C1_consolidation_found: 0,
      C2_range_pct: 0,
      C3_support_touches: 0,
      C4_resistance_touches: 0,
      C5_no_lower_lows_after_day3: 0,
      C6_no_large_red_candles: 0,
      C7_prior_move_pct: 0,
      C8_prior_move_direction: 0,
      C9_volume_contraction: 0,
      C10_breakout_candle_quality: 0,
    },
    top_near_misses: [],
  };
  
  for (const r of results) {
    // Score buckets
    const pct = r.score.score_pct;
    if (pct >= 90) summary.stocks_by_score["90_to_100"]++;
    else if (pct >= 80) summary.stocks_by_score["80_to_89"]++;
    else if (pct >= 70) summary.stocks_by_score["70_to_79"]++;
    else if (pct >= 60) summary.stocks_by_score["60_to_69"]++;
    else summary.stocks_by_score["below_60"]++;
    
    // Failure frequency
    for (const [key, criterion] of Object.entries(r.criteria_results)) {
      if (!criterion.passed) {
        const criterionKey = key as keyof typeof summary.criteria_failure_frequency;
        summary.criteria_failure_frequency[criterionKey]++;
      }
    }
  }
  
  // Top near misses (non-matches sorted by score descending)
  const nearMisses = results
    .filter(r => !r.match)
    .sort((a, b) => b.score.score_pct - a.score.score_pct)
    .slice(0, 20)
    .map(r => ({
      symbol: r.symbol,
      score_pct: r.score.score_pct,
      failed_criteria: Object.entries(r.criteria_results)
        .filter(([, c]) => !c.passed)
        .map(([k]) => k.replace("_", "")),
    }));
  
  summary.top_near_misses = nearMisses;
  
  return summary;
}
