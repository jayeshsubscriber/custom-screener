/**
 * Positional Consolidation Breakout — redesigned for positional trading (weeks-to-months).
 *
 * Key differences from swing:
 * 1. Longer timeframes: 65d + 130d prior uptrend, 20-80d base, 200+ bars needed
 * 2. 200 DMA + 50 DMA context (golden cross, close above 200 DMA)
 * 3. Base stage detection (1st/2nd/3rd+ breakout)
 * 4. Relative strength vs Nifty 50 (65d return ratio)
 * 5. Volume contraction pattern (last 1/3 vs first 1/3 of base) + 1.5x breakout vol
 * 6. Measured-move target + risk/reward ratio; Tier 1 requires R:R >= 2
 * 7. Weighted scoring: trend 20, advance 15, tightness 15, vol 15, RS 10, stage 10, structure 10, clean 5
 */

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_BARS = 200; // need 6+ months of data

// Consolidation
const CONSOL_MIN_DAYS = 20;
const CONSOL_MAX_DAYS = 80;
const MAX_RANGE_PCT = 15; // positional bases can be slightly wider
const MIN_SUPPORT_TOUCHES = 1;
const MIN_RESISTANCE_TOUCHES = 1;
const LARGE_RED_BODY_PCT = 0.045;
const MAX_VOLUME_RATIO_CONSOL_VS_PRIOR = 0.90; // softer; volume contraction scored separately

// Prior uptrend
const PRIOR_65D_MIN_ADVANCE_PCT = 8; // 3-month advance
// 130d advance is scored (not a hard gate); threshold defined inline in scoring function
const MAX_20D_PULLBACK_INTO_BASE_PCT = 10;
const MIN_BASE_POSITION_PCT = 85;

// Breakout
const BREAKOUT_BUFFER = 1.005;
const MIN_BREAKOUT_VOL_RATIO_T1 = 1.5; // raised from 1.2 for positional
const TIER_2A_DISTANCE_PCT = 3;
const TIER_2B_DISTANCE_PCT = 6;

// Risk/Reward
const MIN_RR_FOR_TIER1 = 2.0;

// Scoring minimum
const MIN_SCORE_TO_QUALIFY = 50;

export type PositionalConsolidationTier = "1" | "2A" | "2B" | "3";

export interface PositionalConsolidationResult {
  match: boolean;
  tier: PositionalConsolidationTier | null;
  tierName: string;
  consolidationStart: string;
  consolidationEnd: string;
  consolidationHigh: number;
  consolidationLow: number;
  rangePct: number;
  breakoutLevel: number;
  todayClose: number;
  distanceToBreakoutPct: number;
  priorAdvancePct: number;
  scorePct: number;
  suggestedStop: number;
  // New positional fields
  target: number;
  riskRewardRatio: number;
  baseStage: number; // 1, 2, 3+
  rsRatio: number; // stock 65d return / nifty 65d return
  aboveDma200: boolean;
  goldenCross: boolean; // 50 DMA > 200 DMA
  volumeContracting: boolean;
  failReason?: string;
}

// ─── Helper: Simple Moving Average ────────────────────────────────────────────

function computeSMA(closes: number[], period: number): number[] {
  const sma: number[] = new Array(closes.length).fill(0);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) {
      sma[i] = sum / period;
    }
  }
  return sma;
}

// ─── Helper: Support/Resistance Touches ───────────────────────────────────────

function countSupportResistanceTouches(
  data: OhlcvRow[],
  high: number,
  low: number
): { support: number; resistance: number } {
  const range = high - low;
  const supportZone = low + range * 0.3;
  const resistanceZone = high - range * 0.3;
  const support = data.filter((r) => r.low <= supportZone).length;
  const resistance = data.filter((r) => r.high >= resistanceZone).length;
  return { support, resistance };
}

// ─── Helper: Lower Lows / Large Red ──────────────────────────────────────────

function hasLowerLowsAfterDay3(data: OhlcvRow[]): boolean {
  if (data.length < 4) return false;
  const lowAt3 = Math.min(...data.slice(0, 3).map((r) => r.low));
  return data.slice(3).some((r) => r.low < lowAt3 * 0.998);
}

function hasLargeRedCandles(data: OhlcvRow[], threshold: number): boolean {
  return data.some((r) => {
    if (r.open <= r.close) return false;
    return (r.open - r.close) / r.open > threshold;
  });
}

// ─── Helper: V-Shape / Whipsaw Rejection ──────────────────────────────────────

/**
 * Reject V-shaped crash-and-recovery patterns that are NOT real consolidation.
 * A real base has the majority of closes clustered in the middle of the range.
 * A V-shape has closes concentrated near the extremes (low early, high late or vice versa).
 *
 * Method: Split the base into two halves. Check that neither half's average close
 * is too far from the midpoint of the range. Also check that the max drawdown from
 * the first bar's close to the base low is not too deep relative to the range
 * (i.e., the first few bars should not be a crash into the low).
 *
 * Returns true if this looks like a V-shape (should be rejected).
 */
function isVShapePattern(data: OhlcvRow[], baseHigh: number, baseLow: number): boolean {
  if (data.length < 6) return false;
  const range = baseHigh - baseLow;
  if (range <= 0) return false;
  // Check 1: The first 1/3 avg close vs last 1/3 avg close.
  // If the difference is >= 55% of the range, it's a directional move, not a base.
  const third = Math.floor(data.length / 3);
  const firstThirdAvgClose = data.slice(0, third).reduce((s, r) => s + r.close, 0) / third;
  const lastThirdAvgClose = data.slice(-third).reduce((s, r) => s + r.close, 0) / third;
  const driftPct = Math.abs(lastThirdAvgClose - firstThirdAvgClose) / range;
  if (driftPct >= 0.55) return true;

  // Check 2: How many bars are in the "middle 50%" of the range?
  const lowerBound = baseLow + range * 0.25;
  const upperBound = baseHigh - range * 0.25;
  const barsInMiddle = data.filter((r) => r.close >= lowerBound && r.close <= upperBound).length;
  const middlePct = barsInMiddle / data.length;
  if (middlePct < 0.25) return true;

  // Check 3: Low in first 40% and high in last 40% (or vice versa) = crash-recovery / V-shape.
  // Require at least 50% of bars in the middle zone to treat as real consolidation.
  const lowIdx = data.findIndex((r) => r.low === baseLow);
  const highIdx = data.findIndex((r) => r.high === baseHigh);
  const earlyZone = data.length * 0.4;
  const lateZone = data.length * 0.6;
  if ((lowIdx < earlyZone && highIdx >= lateZone) || (highIdx < earlyZone && lowIdx >= lateZone)) {
    if (middlePct < 0.52) return true;
  }

  // Not a V-shape
  return false;
}

// ─── Helper: Volume Contraction Pattern ───────────────────────────────────────

/** Returns true if last 1/3 of base has lower avg volume than first 1/3 (drying up). */
function checkVolumeContraction(data: OhlcvRow[]): boolean {
  if (data.length < 6) return false;
  const third = Math.floor(data.length / 3);
  const first = data.slice(0, third);
  const last = data.slice(-third);
  const avgFirst = first.reduce((s, r) => s + r.volume, 0) / first.length;
  const avgLast = last.reduce((s, r) => s + r.volume, 0) / last.length;
  return avgFirst > 0 && avgLast < avgFirst;
}

// ─── Helper: Base Stage Detection ─────────────────────────────────────────────

/**
 * Count prior consolidation-breakout cycles in the 250 bars before the current base.
 * A "cycle" = price traded above a recent high, then pulled back forming another base.
 * Returns 1 for first base, 2 for second, etc.
 */
function detectBaseStage(ohlcv: OhlcvRow[], currentBaseStartIdx: number): number {
  // Look at the 250 bars before the current base
  const lookbackEnd = currentBaseStartIdx;
  const lookbackStart = Math.max(0, lookbackEnd - 250);
  if (lookbackEnd - lookbackStart < 60) return 1; // not enough history, assume stage 1

  const slice = ohlcv.slice(lookbackStart, lookbackEnd);
  const closes = slice.map((r) => r.close);
  const highs = slice.map((r) => r.high);

  // Find peaks: local highs followed by at least 8% decline then recovery above the peak
  let stages = 0;
  let i = 0;
  while (i < closes.length - 20) {
    // Find a 20-bar rolling high
    const windowEnd = Math.min(i + 20, closes.length);
    const peakVal = Math.max(...highs.slice(i, windowEnd));
    const peakIdx = i + highs.slice(i, windowEnd).indexOf(peakVal);

    // Look for a decline of at least 8% from peak
    let foundDecline = false;
    let troughIdx = peakIdx;
    for (let j = peakIdx + 1; j < Math.min(peakIdx + 60, closes.length); j++) {
      if (closes[j] <= peakVal * 0.92) {
        foundDecline = true;
        troughIdx = j;
        break;
      }
    }

    if (foundDecline) {
      // Look for recovery above the peak (a breakout)
      for (let j = troughIdx + 1; j < Math.min(troughIdx + 60, closes.length); j++) {
        if (closes[j] > peakVal) {
          stages++;
          i = j; // skip past this cycle
          break;
        }
      }
    }
    i += 20; // move to next window
  }

  return stages + 1; // current base is the next stage
}

// ─── Positional Scoring (weighted) ────────────────────────────────────────────

interface ScoreInputs {
  aboveDma200: boolean;
  goldenCross: boolean;
  prior130dAdvPct: number;
  rangePct: number;
  volumeContracting: boolean;
  rsRatio: number;
  baseStage: number;
  support: number;
  resistance: number;
  noLowerLows: boolean;
  noLargeRed: boolean;
}

function computePositionalScore(inp: ScoreInputs): number {
  let s = 0;

  // Trend alignment (20 pts): above 200 DMA + golden cross
  if (inp.aboveDma200 && inp.goldenCross) s += 20;
  else if (inp.aboveDma200 || inp.goldenCross) s += 10;

  // Prior advance strength (15 pts): 130d advance
  if (inp.prior130dAdvPct >= 25) s += 15;
  else if (inp.prior130dAdvPct >= 15) s += 10;
  else if (inp.prior130dAdvPct >= 8) s += 5;

  // Base tightness (15 pts): range %
  if (inp.rangePct < 8) s += 15;
  else if (inp.rangePct < 10) s += 10;
  else if (inp.rangePct <= 15) s += 5;

  // Volume contraction pattern (15 pts)
  if (inp.volumeContracting) s += 15;

  // Relative strength vs Nifty (10 pts)
  if (inp.rsRatio > 1.5) s += 10;
  else if (inp.rsRatio > 1.2) s += 7;
  else if (inp.rsRatio > 1.0) s += 3;

  // Base stage (10 pts): stage 1 best
  if (inp.baseStage === 1) s += 10;
  else if (inp.baseStage === 2) s += 7;
  else s += 2;

  // Support/resistance structure (10 pts)
  if (inp.support >= 2 && inp.resistance >= 2) s += 10;
  else if (inp.support >= 1 && inp.resistance >= 1) s += 5;

  // No lower lows + no large red (5 pts)
  if (inp.noLowerLows && inp.noLargeRed) s += 5;
  else if (inp.noLowerLows || inp.noLargeRed) s += 2;

  return s; // max 100
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

/**
 * Scan for positional consolidation breakout.
 * @param niftyReturn65d - Nifty 50 65-day return in %; pass 0 if unavailable.
 */
export function scanPositionalConsolidationBreakout(
  ohlcv: OhlcvRow[],
  _symbol: string,
  niftyReturn65d: number = 0
): PositionalConsolidationResult {
  const defaultFail = (
    failReason: string
  ): PositionalConsolidationResult => ({
    match: false,
    tier: null,
    tierName: "No Pattern",
    consolidationStart: "",
    consolidationEnd: "",
    consolidationHigh: 0,
    consolidationLow: 0,
    rangePct: 0,
    breakoutLevel: 0,
    todayClose: ohlcv[ohlcv.length - 1]?.close ?? 0,
    distanceToBreakoutPct: 0,
    priorAdvancePct: 0,
    scorePct: 0,
    suggestedStop: 0,
    target: 0,
    riskRewardRatio: 0,
    baseStage: 0,
    rsRatio: 0,
    aboveDma200: false,
    goldenCross: false,
    volumeContracting: false,
    failReason,
  });

  if (ohlcv.length < MIN_BARS) {
    return defaultFail(`Need ${MIN_BARS}+ bars, got ${ohlcv.length}`);
  }

  const today = ohlcv[ohlcv.length - 1]!;
  const todayClose = today.close;
  const todayVol = today.volume;
  const avgVol50 = ohlcv.slice(-50).reduce((s, r) => s + r.volume, 0) / 50;

  // ─── Compute 50 DMA and 200 DMA ──────────────────────────────────────
  const allCloses = ohlcv.map((r) => r.close);
  const sma50 = computeSMA(allCloses, 50);
  const sma200 = computeSMA(allCloses, 200);
  const dma50Today = sma50[ohlcv.length - 1];
  const dma200Today = sma200[ohlcv.length - 1];
  const aboveDma200 = dma200Today > 0 && todayClose > dma200Today;
  const goldenCross = dma50Today > 0 && dma200Today > 0 && dma50Today > dma200Today;

  // ─── Compute stock 65d return and RS ratio ────────────────────────────
  const close65dAgo = ohlcv.length > 65 ? ohlcv[ohlcv.length - 1 - 65]?.close ?? 0 : 0;
  const stockReturn65d = close65dAgo > 0 ? ((todayClose - close65dAgo) / close65dAgo) * 100 : 0;
  const rsRatio = niftyReturn65d !== 0 ? stockReturn65d / niftyReturn65d : (stockReturn65d > 0 ? 1.5 : 0.5);

  // ─── Compute 130d advance for scoring ─────────────────────────────────
  const close130dAgo = ohlcv.length > 130 ? ohlcv[ohlcv.length - 1 - 130]?.close ?? 0 : 0;
  const advance130d = close130dAgo > 0 ? ((todayClose - close130dAgo) / close130dAgo) * 100 : 0;

  // ─── Search for best consolidation window ─────────────────────────────
  let best: {
    startIdx: number;
    duration: number;
    endDate: string;
    high: number;
    low: number;
    rangePct: number;
    support: number;
    resistance: number;
    noLowerLows: boolean;
    noLargeRed: boolean;
    volumeContracting: boolean;
    score: number;
    priorAdvancePct: number;
    baseStage: number;
    priorPeakHigh: number; // the real overhead resistance before the base
  } | null = null;

  for (let duration = CONSOL_MIN_DAYS; duration <= CONSOL_MAX_DAYS; duration++) {
    const startIdx = ohlcv.length - 1 - duration;
    if (startIdx < 0) continue;

    const slice = ohlcv.slice(startIdx, ohlcv.length - 1); // exclude today
    if (slice.length < duration) continue;

    const high = Math.max(...slice.map((r) => r.high));
    const low = Math.min(...slice.map((r) => r.low));
    const rangePct = low > 0 ? ((high - low) / low) * 100 : 0;

    if (rangePct > MAX_RANGE_PCT) continue;

    // Reject V-shaped crash-and-recovery patterns
    if (isVShapePattern(slice, high, low)) continue;

    const { support, resistance } = countSupportResistanceTouches(slice, high, low);
    if (support < MIN_SUPPORT_TOUCHES || resistance < MIN_RESISTANCE_TOUCHES) continue;

    const noLowerLows = !hasLowerLowsAfterDay3(slice);
    const noLargeRed = !hasLargeRedCandles(slice, LARGE_RED_BODY_PCT);

    // Prior 65d uptrend check
    const prior65Start = Math.max(0, startIdx - 65);
    const prior20Start = Math.max(0, startIdx - 20);
    const closeAtBase = ohlcv[startIdx]?.close ?? 0;
    const close65Prior = ohlcv[prior65Start]?.close ?? closeAtBase;
    const close20Prior = ohlcv[prior20Start]?.close ?? closeAtBase;
    const priorAdvPct = close65Prior > 0 ? ((closeAtBase - close65Prior) / close65Prior) * 100 : 0;
    const pullback20d = close20Prior > 0 ? ((closeAtBase - close20Prior) / close20Prior) * 100 : 0;

    if (priorAdvPct < PRIOR_65D_MIN_ADVANCE_PCT) continue;
    if (pullback20d < -MAX_20D_PULLBACK_INTO_BASE_PCT) continue;

    // Base position check: low not a deep correction
    const prior60Start = Math.max(0, startIdx - 60);
    const prior60High = Math.max(...ohlcv.slice(prior60Start, startIdx).map((r) => r.high));
    if (prior60High > 0 && (low / prior60High) * 100 < MIN_BASE_POSITION_PCT) continue;

    // Base low not more than 5% below 200 DMA at base start
    const dma200AtBaseStart = sma200[startIdx];
    if (dma200AtBaseStart > 0 && low < dma200AtBaseStart * 0.95) continue;

    // Volume: overall contraction vs prior
    const prior30Start = Math.max(0, startIdx - 30);
    const avgVolPrior30 = prior30Start < startIdx
      ? ohlcv.slice(prior30Start, startIdx).reduce((s, r) => s + r.volume, 0) / (startIdx - prior30Start)
      : 1;
    const avgVolConsol = slice.reduce((s, r) => s + r.volume, 0) / slice.length;
    if (avgVolPrior30 > 0 && avgVolConsol / avgVolPrior30 > MAX_VOLUME_RATIO_CONSOL_VS_PRIOR) continue;

    // Prior peak: the highest high in the 65 bars before the base.
    // If the base forms BELOW a recent peak, the real breakout level must clear that peak.
    const priorPeakStart = Math.max(0, startIdx - 65);
    const priorPeakHigh = Math.max(...ohlcv.slice(priorPeakStart, startIdx).map((r) => r.high));

    // Volume contraction pattern within the base
    const volContracting = checkVolumeContraction(slice);

    // Base stage
    const baseStage = detectBaseStage(ohlcv, startIdx);

    // Compute score
    const score = computePositionalScore({
      aboveDma200,
      goldenCross,
      prior130dAdvPct: advance130d,
      rangePct,
      volumeContracting: volContracting,
      rsRatio,
      baseStage,
      support,
      resistance,
      noLowerLows,
      noLargeRed,
    });

    if (score < MIN_SCORE_TO_QUALIFY) continue;

    const endDate = slice[slice.length - 1]?.date ?? "";
    if (best === null || score > best.score) {
      best = {
        startIdx,
        duration,
        endDate,
        high,
        low,
        rangePct,
        support,
        resistance,
        noLowerLows,
        noLargeRed,
        volumeContracting: volContracting,
        score,
        priorAdvancePct: priorAdvPct,
        baseStage,
        priorPeakHigh,
      };
    }
  }

  if (best === null) {
    return defaultFail("No valid positional consolidation window found");
  }

  // ─── Breakout level, target, R:R ──────────────────────────────────────
  // Breakout = higher of (consolidation high, prior peak before base) × buffer.
  // If the base formed BELOW a recent peak, price must clear that peak first.
  const effectiveResistance = Math.max(best.high, best.priorPeakHigh);
  const breakoutLevel = effectiveResistance * BREAKOUT_BUFFER;
  const distancePct = ((breakoutLevel - todayClose) / todayClose) * 100;
  const volRatio = avgVol50 > 0 ? todayVol / avgVol50 : 0;

  const suggestedStop = Math.round(best.low * 0.99 * 100) / 100;

  // Measured move target: breakout level + (consolidation range)
  const consolRange = best.high - best.low;
  const target = Math.round((breakoutLevel + consolRange) * 100) / 100;

  // R:R from breakout level
  const risk = breakoutLevel - suggestedStop;
  const reward = target - breakoutLevel;
  const rrRatio = risk > 0 ? reward / risk : 0;

  const scorePct = Math.min(100, Math.round(best.score));

  // ─── Tier determination ───────────────────────────────────────────────
  let tier: PositionalConsolidationTier | null = null;
  let tierName = "No Pattern";

  if (todayClose > breakoutLevel) {
    if (volRatio >= MIN_BREAKOUT_VOL_RATIO_T1 && rrRatio >= MIN_RR_FOR_TIER1) {
      tier = "1";
      tierName = "Ready to Trade";
    } else if (volRatio >= MIN_BREAKOUT_VOL_RATIO_T1) {
      tier = "2A";
      tierName = "Breakout (low R:R)";
    } else {
      tier = "2B";
      tierName = "Breakout (weak volume)";
    }
  } else if (distancePct <= TIER_2A_DISTANCE_PCT) {
    tier = "2A";
    tierName = "Imminent Breakout";
  } else if (distancePct <= TIER_2B_DISTANCE_PCT) {
    tier = "2B";
    tierName = "Watchlist";
  } else {
    tier = "3";
    tierName = "In Consolidation";
  }

  return {
    match: tier !== null,
    tier,
    tierName,
    consolidationStart: ohlcv[best.startIdx]?.date ?? "",
    consolidationEnd: best.endDate,
    consolidationHigh: Math.round(best.high * 100) / 100,
    consolidationLow: Math.round(best.low * 100) / 100,
    rangePct: Math.round(best.rangePct * 100) / 100,
    breakoutLevel: Math.round(breakoutLevel * 100) / 100,
    todayClose: Math.round(todayClose * 100) / 100,
    distanceToBreakoutPct: Math.round(distancePct * 100) / 100,
    priorAdvancePct: Math.round(best.priorAdvancePct * 100) / 100,
    scorePct,
    suggestedStop,
    target,
    riskRewardRatio: Math.round(rrRatio * 100) / 100,
    baseStage: best.baseStage,
    rsRatio: Math.round(rsRatio * 100) / 100,
    aboveDma200,
    goldenCross,
    volumeContracting: best.volumeContracting,
  };
}
