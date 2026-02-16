/**
 * Consolidation breakout scanner.
 * Input: OHLCV rows sorted by date ascending, at least 60 rows.
 * Output: Full scan result or null.
 */

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PRIOR_MOVE_WINDOW = 20;
const MIN_PRIOR_MOVE_PERCENT = 15;
const CONSOLIDATION_MIN_DAYS = 5;
const CONSOLIDATION_MAX_DAYS = 25;
const MAX_CONSOLIDATION_RANGE = 0.1; // 10%
const VOLUME_CONTRACTION_THRESHOLD = 0.6;
const BREAKOUT_BUFFER = 1.005;
const MIN_BREAKOUT_VOLUME_RATIO = 1.5;

function hasLowerLowsAfterDay3(consol: OhlcvRow[]): boolean {
  if (consol.length < 4) return false;
  const lowAtDay3 = Math.min(...consol.slice(0, 3).map((r) => r.low));
  const subsequent = consol.slice(3).map((r) => r.low);
  return subsequent.some((l) => l < lowAtDay3 * 0.998);
}

function hasSupportResistanceTouches(
  consol: OhlcvRow[],
  consolHigh: number,
  consolLow: number
): boolean {
  const range = consolHigh - consolLow;
  const supportZone = consolLow + range * 0.3;
  const resistanceZone = consolHigh - range * 0.3;
  const supportTouches = consol.filter((r) => r.low <= supportZone).length;
  const resistanceTouches = consol.filter((r) => r.high >= resistanceZone).length;
  return supportTouches >= 2 && resistanceTouches >= 2;
}

function hasLargeRedCandles(consol: OhlcvRow[], threshold = 0.03): boolean {
  return consol.some((r) => {
    if (r.open <= r.close) return false;
    const bodyPct = (r.open - r.close) / r.open;
    return bodyPct > threshold;
  });
}

function ema(series: number[], span: number): number[] {
  const out: number[] = [];
  const k = 2 / (span + 1);
  for (let i = 0; i < series.length; i++) {
    if (i === 0) out.push(series[0]);
    else out.push(series[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export interface ConsolidationBreakoutResult {
  symbol: string;
  scan_date: string;
  consolidation: {
    start_date: string;
    end_date: string;
    duration_days: number;
    high: number;
    low: number;
    range_percent: number;
  };
  prior_move: {
    start_date: string;
    end_date: string;
    low: number;
    high: number;
    move_percent: number;
  };
  volume_analysis: {
    avg_volume_prior_move: number;
    avg_volume_consolidation: number;
    contraction_ratio: number;
    breakout_day_volume: number;
    volume_surge_ratio: number;
    avg_volume_50d: number;
  };
  breakout_candle: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    close_position_in_range: number;
    gap_percent: number;
  };
  trend_context: {
    ema_20: number;
    ema_50: number;
    price_vs_ema50: "above" | "below";
    ema_50_slope: "up" | "down";
  };
  trade_levels: {
    entry: number;
    stop_loss: number;
    target: number;
    risk_reward_ratio: number;
  };
  quality_checks: {
    lower_lows_after_day_3: boolean;
    support_touches: number;
    resistance_touches: number;
    large_red_candles: boolean;
  };
}

/** Debug info for why a scan didn't match */
export interface ScanDebugInfo {
  reason: string;
  details: Record<string, unknown>;
  step: number;
}

export function scanConsolidationBreakout(
  ohlcv: OhlcvRow[],
  symbol: string,
  returnDebug = false
): ConsolidationBreakoutResult | null | { match: false; debug: ScanDebugInfo } {
  
  const log = (step: number, msg: string, data?: unknown) => {
    console.log(`[${symbol}] Step ${step}: ${msg}`, data || '');
  };

  log(1, `Starting scan with ${ohlcv.length} rows`);
  
  if (ohlcv.length < 60) {
    log(1, `FAIL - insufficient data: ${ohlcv.length} < 60`);
    return returnDebug ? { match: false, debug: { step: 1, reason: "insufficient_data", details: { rows: ohlcv.length, required: 60 } } } : null;
  }
  
  const today = ohlcv[ohlcv.length - 1];
  log(2, `Today's candle:`, { date: today.date, open: today.open, high: today.high, low: today.low, close: today.close, volume: today.volume });
  
  const closes = ohlcv.map((r) => r.close);
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const ema20 = ema20Series[ema20Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];
  const ema50_10dAgo = ema50Series[ema50Series.length - 11];
  const avgVolume50d = ohlcv.slice(-50).reduce((s, r) => s + r.volume, 0) / 50;

  log(3, `EMAs:`, { ema20: ema20.toFixed(2), ema50: ema50.toFixed(2), ema50_10dAgo: ema50_10dAgo.toFixed(2), avgVolume50d: Math.round(avgVolume50d) });

  let consolidation: {
    high: number;
    low: number;
    duration: number;
    data: OhlcvRow[];
    start_date: string;
    end_date: string;
  } | null = null;

  let consolDebug: { duration: number; reason: string }[] = [];

  log(4, `Looking for consolidation (${CONSOLIDATION_MIN_DAYS}-${CONSOLIDATION_MAX_DAYS} days, max range ${MAX_CONSOLIDATION_RANGE * 100}%)`);

  for (let duration = CONSOLIDATION_MIN_DAYS; duration <= CONSOLIDATION_MAX_DAYS; duration++) {
    const consolData = ohlcv.slice(-(duration + 1), -1);
    if (consolData.length < duration) {
      consolDebug.push({ duration, reason: "not_enough_data" });
      continue;
    }
    const consolHigh = Math.max(...consolData.map((r) => r.high));
    const consolLow = Math.min(...consolData.map((r) => r.low));
    const rangePct = (consolHigh - consolLow) / consolLow;
    
    if (rangePct > MAX_CONSOLIDATION_RANGE) {
      consolDebug.push({ duration, reason: `range_too_wide: ${(rangePct * 100).toFixed(1)}% > ${MAX_CONSOLIDATION_RANGE * 100}%` });
      continue;
    }
    if (hasLowerLowsAfterDay3(consolData)) {
      consolDebug.push({ duration, reason: "lower_lows_after_day3" });
      continue;
    }
    if (!hasSupportResistanceTouches(consolData, consolHigh, consolLow)) {
      consolDebug.push({ duration, reason: "insufficient_support_resistance_touches" });
      continue;
    }
    if (hasLargeRedCandles(consolData, 0.03)) {
      consolDebug.push({ duration, reason: "large_red_candles_present" });
      continue;
    }
    
    log(4, `FOUND consolidation:`, { duration, high: consolHigh, low: consolLow, rangePct: (rangePct * 100).toFixed(1) + '%' });
    
    consolidation = {
      high: consolHigh,
      low: consolLow,
      duration,
      data: consolData,
      start_date: consolData[0].date,
      end_date: consolData[consolData.length - 1].date,
    };
    break;
  }

  if (!consolidation) {
    log(4, `FAIL - no valid consolidation found. Reasons:`, consolDebug.slice(0, 5));
    return returnDebug ? { match: false, debug: { step: 4, reason: "no_valid_consolidation", details: { tried: consolDebug } } } : null;
  }

  // Step 5: Prior move check
  const priorEndIdx = ohlcv.length - consolidation.duration - 1;
  const priorStartIdx = Math.max(0, priorEndIdx - PRIOR_MOVE_WINDOW);
  const priorData = ohlcv.slice(priorStartIdx, priorEndIdx);
  const priorLow = Math.min(...priorData.map((r) => r.low));
  const priorHigh = Math.max(...priorData.map((r) => r.high));
  const priorMovePct = ((priorHigh - priorLow) / priorLow) * 100;
  
  log(5, `Prior move:`, { priorLow, priorHigh, priorMovePct: priorMovePct.toFixed(1) + '%', required: MIN_PRIOR_MOVE_PERCENT + '%' });
  
  if (priorMovePct < MIN_PRIOR_MOVE_PERCENT) {
    log(5, `FAIL - prior move too small: ${priorMovePct.toFixed(1)}% < ${MIN_PRIOR_MOVE_PERCENT}%`);
    return returnDebug ? { match: false, debug: { step: 5, reason: "prior_move_too_small", details: { priorMovePct: priorMovePct.toFixed(1), required: MIN_PRIOR_MOVE_PERCENT } } } : null;
  }
  
  const priorMoveUpward = priorData[priorData.length - 1].close >= priorData[0].close * 1.1;
  log(5, `Prior move direction:`, { startClose: priorData[0].close, endClose: priorData[priorData.length - 1].close, isUpward: priorMoveUpward });
  
  if (!priorMoveUpward) {
    log(5, `FAIL - prior move not upward (need +10%)`);
    return returnDebug ? { match: false, debug: { step: 5, reason: "prior_move_not_upward", details: { startClose: priorData[0].close, endClose: priorData[priorData.length - 1].close } } } : null;
  }

  // Step 6: Volume contraction
  const avgVolPrior = priorData.reduce((s, r) => s + r.volume, 0) / priorData.length;
  const avgVolConsol = consolidation.data.reduce((s, r) => s + r.volume, 0) / consolidation.data.length;
  const volContraction = avgVolConsol / avgVolPrior;
  
  log(6, `Volume contraction:`, { avgVolPrior: Math.round(avgVolPrior), avgVolConsol: Math.round(avgVolConsol), ratio: volContraction.toFixed(2), maxAllowed: VOLUME_CONTRACTION_THRESHOLD });
  
  if (volContraction > VOLUME_CONTRACTION_THRESHOLD) {
    log(6, `FAIL - no volume contraction: ${volContraction.toFixed(2)} > ${VOLUME_CONTRACTION_THRESHOLD}`);
    return returnDebug ? { match: false, debug: { step: 6, reason: "no_volume_contraction", details: { ratio: volContraction.toFixed(2), maxAllowed: VOLUME_CONTRACTION_THRESHOLD } } } : null;
  }

  // Step 7: Breakout check
  const breakoutLevel = consolidation.high;
  const breakoutRequired = breakoutLevel * BREAKOUT_BUFFER;
  log(7, `Breakout check:`, { todayClose: today.close, consolidationHigh: breakoutLevel, breakoutRequired: breakoutRequired.toFixed(2), isBreakout: today.close > breakoutRequired });
  
  if (today.close <= breakoutRequired) {
    log(7, `FAIL - no breakout today: close ${today.close} <= ${breakoutRequired.toFixed(2)}`);
    return returnDebug ? { match: false, debug: { step: 7, reason: "no_breakout_today", details: { todayClose: today.close, consolidationHigh: breakoutLevel, breakoutRequired: breakoutRequired.toFixed(2) } } } : null;
  }
  
  // Step 8: Breakout volume
  const requiredVolume = avgVolume50d * MIN_BREAKOUT_VOLUME_RATIO;
  log(8, `Breakout volume:`, { todayVolume: today.volume, avgVolume50d: Math.round(avgVolume50d), required: Math.round(requiredVolume), ratio: (today.volume / avgVolume50d).toFixed(2) });
  
  if (today.volume < requiredVolume) {
    log(8, `FAIL - breakout volume too low: ${today.volume} < ${Math.round(requiredVolume)}`);
    return returnDebug ? { match: false, debug: { step: 8, reason: "breakout_volume_too_low", details: { todayVolume: today.volume, required: Math.round(requiredVolume), ratio: (today.volume / avgVolume50d).toFixed(2) } } } : null;
  }

  // Step 9: Candle quality
  const candleRange = today.high - today.low;
  const candlePosition = candleRange > 0 ? (today.close - today.low) / candleRange : 0;
  log(9, `Candle quality:`, { closePosition: candlePosition.toFixed(2), required: '>= 0.6' });
  
  if (candlePosition < 0.6) {
    log(9, `FAIL - weak candle close: position ${candlePosition.toFixed(2)} < 0.6`);
    return returnDebug ? { match: false, debug: { step: 9, reason: "weak_candle_close", details: { closePosition: candlePosition.toFixed(2), required: ">= 0.6" } } } : null;
  }

  // Step 10: Gap check
  const yesterday = ohlcv[ohlcv.length - 2];
  const gapPct = (today.open - yesterday.close) / yesterday.close;
  log(10, `Gap check:`, { yesterdayClose: yesterday.close, todayOpen: today.open, gapPct: (gapPct * 100).toFixed(2) + '%', maxAllowed: '3%' });
  
  if (gapPct > 0.03) {
    log(10, `FAIL - gap up too large: ${(gapPct * 100).toFixed(2)}% > 3%`);
    return returnDebug ? { match: false, debug: { step: 10, reason: "gap_up_too_large", details: { gapPct: (gapPct * 100).toFixed(1) + "%", maxAllowed: "3%" } } } : null;
  }

  // Step 11: Trend context
  log(11, `Trend context:`, { todayClose: today.close, ema50: ema50.toFixed(2), priceAboveEma50: today.close >= ema50, ema50Rising: ema50 >= ema50_10dAgo });
  
  if (today.close < ema50) {
    log(11, `FAIL - price below EMA50: ${today.close} < ${ema50.toFixed(2)}`);
    return returnDebug ? { match: false, debug: { step: 11, reason: "price_below_ema50", details: { todayClose: today.close, ema50: ema50.toFixed(2) } } } : null;
  }
  if (ema50 < ema50_10dAgo) {
    log(11, `FAIL - EMA50 not rising: ${ema50.toFixed(2)} < ${ema50_10dAgo.toFixed(2)}`);
    return returnDebug ? { match: false, debug: { step: 11, reason: "ema50_not_rising", details: { ema50Now: ema50.toFixed(2), ema50_10dAgo: ema50_10dAgo.toFixed(2) } } } : null;
  }
  
  log(12, `SUCCESS - All checks passed!`);

  const rangeHeight = consolidation.high - consolidation.low;
  const supportZone = consolidation.low + rangeHeight * 0.3;
  const resistanceZone = consolidation.high - rangeHeight * 0.3;
  const supportTouches = consolidation.data.filter(
    (r) => r.low <= supportZone
  ).length;
  const resistanceTouches = consolidation.data.filter(
    (r) => r.high >= resistanceZone
  ).length;

  const suggestedStop = consolidation.low * 0.99;
  const suggestedTarget =
    today.close * (1 + (priorMovePct / 100) * 0.5);
  const risk = today.close - suggestedStop;
  const reward = suggestedTarget - today.close;
  const riskReward = risk > 0 ? reward / risk : 0;

  return {
    symbol,
    scan_date: today.date,
    consolidation: {
      start_date: consolidation.start_date,
      end_date: consolidation.end_date,
      duration_days: consolidation.duration,
      high: consolidation.high,
      low: consolidation.low,
      range_percent: (rangeHeight / consolidation.low) * 100,
    },
    prior_move: {
      start_date: priorData[0].date,
      end_date: priorData[priorData.length - 1].date,
      low: priorLow,
      high: priorHigh,
      move_percent: priorMovePct,
    },
    volume_analysis: {
      avg_volume_prior_move: Math.round(avgVolPrior),
      avg_volume_consolidation: Math.round(avgVolConsol),
      contraction_ratio: Math.round((avgVolConsol / avgVolPrior) * 100) / 100,
      breakout_day_volume: today.volume,
      volume_surge_ratio: Math.round((today.volume / avgVolume50d) * 100) / 100,
      avg_volume_50d: Math.round(avgVolume50d),
    },
    breakout_candle: {
      date: today.date,
      open: today.open,
      high: today.high,
      low: today.low,
      close: today.close,
      close_position_in_range: Math.round(candlePosition * 100) / 100,
      gap_percent: Math.round(gapPct * 10000) / 100,
    },
    trend_context: {
      ema_20: Math.round(ema20 * 100) / 100,
      ema_50: Math.round(ema50 * 100) / 100,
      price_vs_ema50: today.close >= ema50 ? "above" : "below",
      ema_50_slope: ema50 >= ema50_10dAgo ? "up" : "down",
    },
    trade_levels: {
      entry: today.close,
      stop_loss: Math.round(suggestedStop * 100) / 100,
      target: Math.round(suggestedTarget * 100) / 100,
      risk_reward_ratio: Math.round(riskReward * 100) / 100,
    },
    quality_checks: {
      lower_lows_after_day_3: hasLowerLowsAfterDay3(consolidation.data),
      support_touches: supportTouches,
      resistance_touches: resistanceTouches,
      large_red_candles: hasLargeRedCandles(consolidation.data, 0.03),
    },
  };
}
