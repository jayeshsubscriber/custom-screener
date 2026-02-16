/**
 * Positional Cup and Handle — textbook pattern identification.
 * Uses OhlcvRow (date, open, high, low, close, volume).
 *
 * Stages: Left rim → Prior uptrend → Cup bottom → Depth/shape/roundedness →
 * Right rim (within 3% of left) → Cup duration/symmetry → Handle (depth, position, shape) →
 * Handle complete → Confidence score.
 */

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Result shape for positional scanner (compatible with CupHandleResult in positionalScanners). */
export interface PositionalCupHandleResult {
  match: boolean;
  cupLow: number;
  handleLow: number;
  resistanceLevel: number;
  todayClose: number;
  pctFromResistance: number;
  /** Optional: confidence 0-100 when match is true */
  confidence?: number;
  /** Optional: measured-move target (breakout + cup depth) */
  target?: number;
}

// -----------------------------------------------------------------------------
// Pattern thresholds (textbook cup-and-handle rules)
// -----------------------------------------------------------------------------

const Config = {
  CUP_MIN_DEPTH_PERCENT: 0.12,
  CUP_MAX_DEPTH_PERCENT: 0.35,
  CUP_MIN_DURATION_DAYS: 30,
  CUP_MAX_DURATION_DAYS: 150,
  CUP_IDEAL_DURATION_MIN: 50,
  CUP_IDEAL_DURATION_MAX: 100,
  CUP_MIN_ROUNDEDNESS: 1.3,
  CUP_SYMMETRY_MIN: 0.5,
  CUP_SYMMETRY_MAX: 2.0,
  CUP_BOTTOM_POSITION_MIN: 0.30,
  CUP_BOTTOM_POSITION_MAX: 0.70,
  CUP_BOTTOM_FLATNESS_MAX: 0.03,
  HANDLE_MIN_DURATION_DAYS: 5,
  HANDLE_MAX_DURATION_DAYS: 40,
  HANDLE_IDEAL_DURATION_MIN: 10,
  HANDLE_IDEAL_DURATION_MAX: 20,
  HANDLE_MAX_DEPTH_PERCENT: 0.15,
  HANDLE_MAX_DEPTH_OF_CUP: 0.50,
  HANDLE_MUST_BE_IN_UPPER_THIRD: true,
  PRIOR_UPTREND_MIN_GAIN: 0.30,
  PRIOR_UPTREND_LOOKBACK_DAYS: 120,
  RIGHT_RIM_TOLERANCE: 0.03,
  LEFT_RIM_MIN_DAYS_FROM_END: 35,
  LEFT_RIM_MIN_PROMINENCE: 0.10,
  LEFT_RIM_MIN_LOWER_HIGHS: 3,
  MIN_CONFIDENCE_SCORE: 75,
  BREAKOUT_PROXIMITY_MAX: 0.10,
  ALLOW_POST_BREAKOUT: true,
};

const MAX_DAYS_LOOKBACK = 250;

interface PivotPoint {
  index: number;
  price: number;
  date: string;
  pivotType: "high" | "low";
}

interface HandleInfo {
  startIndex: number;
  endIndex: number;
  high: number;
  low: number;
  duration: number;
  depthPercent: number;
  avgVolume: number;
}

interface CupInfo {
  leftRim: PivotPoint;
  bottom: PivotPoint;
  rightRim: PivotPoint;
  depthPercent: number;
  duration: number;
  symmetryRatio: number;
  roundednessScore: number;
  bottomFlatness: number;
  bottomWidth: number;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function arrayMax(arr: number[], start: number, end: number): number {
  let max = -Infinity;
  for (let i = start; i < end && i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}

function arrayMin(arr: number[], start: number, end: number): number {
  let min = Infinity;
  for (let i = start; i < end && i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
  }
  return min;
}

function arrayMean(arr: number[], start: number, end: number): number {
  let sum = 0;
  let count = 0;
  for (let i = start; i < end && i < arr.length; i++) {
    sum += arr[i];
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function argMin(arr: number[], start: number, end: number): number {
  let minIdx = start;
  let minVal = Infinity;
  for (let i = start; i < end && i < arr.length; i++) {
    if (arr[i] < minVal) {
      minVal = arr[i];
      minIdx = i;
    }
  }
  return minIdx;
}


// -----------------------------------------------------------------------------
// Detector implementation
// -----------------------------------------------------------------------------

class CupAndHandleDetector {
  private data: OhlcvRow[];
  private closes: number[];
  private highs: number[];
  private lows: number[];
  private volumes: number[];

  constructor(data: OhlcvRow[]) {
    this.data = data;
    this.closes = data.map((d) => d.close);
    this.highs = data.map((d) => d.high);
    this.lows = data.map((d) => d.low);
    this.volumes = data.map((d) => d.volume || 0);
  }

  private findSignificantHighs(
    startIdx: number,
    endIdx: number,
    minProminencePercent: number
  ): PivotPoint[] {
    const significantHighs: PivotPoint[] = [];
    const windowSize = 5;
    const priceRange = arrayMax(this.highs, startIdx, endIdx) - arrayMin(this.lows, startIdx, endIdx);
    const minProminence = priceRange * minProminencePercent;

    for (let i = startIdx + windowSize; i < endIdx - windowSize; i++) {
      const currentHigh = this.highs[i];
      const leftMax = arrayMax(this.highs, i - windowSize, i);
      const rightMax = arrayMax(this.highs, i + 1, i + windowSize + 1);

      if (currentHigh >= leftMax && currentHigh >= rightMax) {
        const leftValley = arrayMin(this.lows, Math.max(startIdx, i - 20), i);
        const rightValley = arrayMin(this.lows, i + 1, Math.min(endIdx, i + 20));
        const prominence = currentHigh - Math.max(leftValley, rightValley);
        if (prominence >= minProminence) {
          significantHighs.push({
            index: i,
            price: currentHigh,
            date: this.data[i].date,
            pivotType: "high",
          });
        }
      }
    }
    significantHighs.sort((a, b) => b.price - a.price);
    return significantHighs;
  }

  private hasConsecutiveLowerHighs(leftRimIdx: number, minCount: number): boolean {
    let count = 0;
    let prevHigh = this.highs[leftRimIdx];
    for (let i = leftRimIdx + 1; i < Math.min(leftRimIdx + minCount + 5, this.data.length); i++) {
      if (this.highs[i] < prevHigh) {
        count++;
        prevHigh = this.highs[i];
        if (count >= minCount) return true;
      } else {
        if (this.highs[i] > prevHigh * 1.01) {
          count = 0;
          prevHigh = this.highs[i];
        }
      }
    }
    return count >= minCount;
  }

  private findCupBottom(leftRim: PivotPoint, maxSearchEnd: number): PivotPoint | null {
    const searchStart = leftRim.index + 10;
    const searchEnd = Math.min(leftRim.index + 120, maxSearchEnd);
    if (searchStart >= searchEnd) return null;
    const absoluteBottomIdx = argMin(this.lows, searchStart, searchEnd);
    return {
      index: absoluteBottomIdx,
      price: this.lows[absoluteBottomIdx],
      date: this.data[absoluteBottomIdx].date,
      pivotType: "low",
    };
  }

  private validateBottomPosition(
    leftRimIdx: number,
    bottomIdx: number,
    rightRimIdx: number
  ): boolean {
    const totalDuration = rightRimIdx - leftRimIdx;
    const bottomPosition = (bottomIdx - leftRimIdx) / totalDuration;
    return (
      bottomPosition >= Config.CUP_BOTTOM_POSITION_MIN &&
      bottomPosition <= Config.CUP_BOTTOM_POSITION_MAX
    );
  }

  private calculateBottomFlatness(
    bottomIdx: number,
    bottomPrice: number
  ): { stdDev: number; width: number } {
    const zoneStart = Math.max(0, bottomIdx - 10);
    const zoneEnd = Math.min(this.data.length, bottomIdx + 10);
    const bottomThreshold = bottomPrice * 1.05;
    const bottomLows: number[] = [];
    let bottomWidth = 0;
    for (let i = zoneStart; i < zoneEnd; i++) {
      if (this.lows[i] <= bottomThreshold) {
        bottomLows.push(this.lows[i]);
        bottomWidth++;
      }
    }
    if (bottomLows.length === 0) return { stdDev: 1, width: 0 };
    const mean = bottomLows.reduce((a, b) => a + b, 0) / bottomLows.length;
    const variance =
      bottomLows.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / bottomLows.length;
    const stdDev = Math.sqrt(variance) / bottomPrice;
    return { stdDev, width: bottomWidth };
  }

  private findRightRim(leftRim: PivotPoint, cupBottom: PivotPoint): PivotPoint | null {
    const leftSideDuration = cupBottom.index - leftRim.index;
    const minRightEnd = cupBottom.index + Math.floor(leftSideDuration * 0.7);
    const maxRightEnd = cupBottom.index + Math.floor(leftSideDuration * 1.5);
    const searchStart = cupBottom.index + 5;
    const searchEnd = Math.min(maxRightEnd, this.data.length - 5);
    void minRightEnd;
    if (searchStart >= searchEnd) return null;

    let bestRim: PivotPoint | null = null;
    let bestRimDiff = Infinity;
    for (let i = searchStart; i < searchEnd; i++) {
      const currentHigh = this.highs[i];
      const windowStart = Math.max(searchStart, i - 3);
      const windowEnd = Math.min(searchEnd, i + 4);
      if (currentHigh < arrayMax(this.highs, windowStart, windowEnd) * 0.995) continue;
      const diff = Math.abs(currentHigh - leftRim.price) / leftRim.price;
      if (diff <= Config.RIGHT_RIM_TOLERANCE && diff < bestRimDiff) {
        bestRimDiff = diff;
        bestRim = {
          index: i,
          price: currentHigh,
          date: this.data[i].date,
          pivotType: "high",
        };
      }
    }
    return bestRim;
  }

  private calculateRoundedness(leftRim: PivotPoint, cupBottom: PivotPoint): number {
    const startIdx = leftRim.index;
    const endIdx = cupBottom.index;
    if (endIdx <= startIdx) return 0;
    let pathLength = 0;
    for (let i = startIdx + 1; i <= endIdx; i++) {
      pathLength += Math.abs(this.closes[i] - this.closes[i - 1]);
    }
    const directDistance = Math.abs(leftRim.price - cupBottom.price);
    if (directDistance === 0) return 0;
    return pathLength / directDistance;
  }

  private calculateSymmetry(
    leftRim: PivotPoint,
    cupBottom: PivotPoint,
    rightRim: PivotPoint
  ): number {
    const leftDuration = cupBottom.index - leftRim.index;
    const rightDuration = rightRim.index - cupBottom.index;
    if (rightDuration === 0) return 0;
    return leftDuration / rightDuration;
  }

  private detectHandle(
    leftRim: PivotPoint,
    cupBottom: PivotPoint,
    rightRim: PivotPoint
  ): HandleInfo | null {
    const handleStart = rightRim.index;
    const handleEnd = this.data.length - 1;
    const handleDuration = handleEnd - handleStart;

    if (handleDuration < Config.HANDLE_MIN_DURATION_DAYS) return null;
    if (handleDuration > Config.HANDLE_MAX_DURATION_DAYS) return null;

    const handleHigh = arrayMax(this.highs, handleStart, handleEnd + 1);
    const handleLow = arrayMin(this.lows, handleStart, handleEnd + 1);
    const handleDepthPercent = (rightRim.price - handleLow) / rightRim.price;

    if (handleDepthPercent > Config.HANDLE_MAX_DEPTH_PERCENT) return null;

    const cupDepthAbsolute = leftRim.price - cupBottom.price;
    const handleDepthAbsolute = rightRim.price - handleLow;
    if (handleDepthAbsolute > cupDepthAbsolute * Config.HANDLE_MAX_DEPTH_OF_CUP) return null;

    const cupRange = leftRim.price - cupBottom.price;
    const upperThird = cupBottom.price + cupRange * 0.67;
    if (handleLow < upperThird) return null;

    const handleAvgVolume = arrayMean(this.volumes, handleStart, handleEnd + 1);
    return {
      startIndex: handleStart,
      endIndex: handleEnd,
      high: handleHigh,
      low: handleLow,
      duration: handleDuration,
      depthPercent: handleDepthPercent,
      avgVolume: handleAvgVolume,
    };
  }

  private validateHandleShape(
    handle: HandleInfo
  ): { valid: boolean; isDownward: boolean; atrContracting: boolean } {
    const handleData = this.data.slice(handle.startIndex, handle.endIndex + 1);
    if (handleData.length < 3) return { valid: false, isDownward: false, atrContracting: false };
    let lowerHighsCount = 0;
    for (let i = 1; i < handleData.length; i++) {
      if (this.highs[handle.startIndex + i] < this.highs[handle.startIndex + i - 1]) {
        lowerHighsCount++;
      }
    }
    const isDownward = lowerHighsCount >= handleData.length * 0.4;
    const handleRange = handle.high - handle.low;
    const handleRangePercent = handleRange / handle.high;
    const atrContracting = handleRangePercent < 0.08;
    return {
      valid: isDownward || atrContracting,
      isDownward,
      atrContracting,
    };
  }

  private isHandleComplete(handle: HandleInfo): boolean {
    const recentStart = Math.max(handle.startIndex, handle.endIndex - 5);
    const recentLows: number[] = [];
    for (let i = recentStart; i <= handle.endIndex; i++) {
      recentLows.push(this.lows[i]);
    }
    if (recentLows.length < 3) return false;
    const lastLow = recentLows[recentLows.length - 1];
    const priorMin = Math.min(...recentLows.slice(0, -1));
    return lastLow >= priorMin * 0.995;
  }

  private validatePriorUptrend(leftRim: PivotPoint): { valid: boolean; gain: number } {
    const lookback = Math.min(leftRim.index, Config.PRIOR_UPTREND_LOOKBACK_DAYS);
    if (lookback < 20) return { valid: false, gain: 0 };
    const priorStart = leftRim.index - lookback;
    const priorLow = arrayMin(this.lows, priorStart, leftRim.index);
    const trendGain = (leftRim.price - priorLow) / priorLow;
    return {
      valid: trendGain >= Config.PRIOR_UPTREND_MIN_GAIN,
      gain: trendGain,
    };
  }

  private calculateConfidenceScore(
    cup: CupInfo,
    handle: HandleInfo,
    priorTrendGain: number,
    handleShapeValid: boolean
  ): number {
    let score = 0;
    if (cup.depthPercent >= 0.15 && cup.depthPercent <= 0.3) score += 15;
    else if (cup.depthPercent >= 0.12 && cup.depthPercent <= 0.35) score += 10;

    if (
      cup.duration >= Config.CUP_IDEAL_DURATION_MIN &&
      cup.duration <= Config.CUP_IDEAL_DURATION_MAX
    ) {
      score += 15;
    } else if (
      cup.duration >= Config.CUP_MIN_DURATION_DAYS &&
      cup.duration <= Config.CUP_MAX_DURATION_DAYS
    ) {
      score += 10;
    }

    if (cup.roundednessScore >= 1.5) score += 15;
    else if (cup.roundednessScore >= 1.4) score += 12;
    else if (cup.roundednessScore >= 1.3) score += 10;

    if (cup.symmetryRatio >= 0.8 && cup.symmetryRatio <= 1.2) score += 10;
    else if (cup.symmetryRatio >= 0.7 && cup.symmetryRatio <= 1.4) score += 7;

    if (cup.bottomFlatness <= 0.02) score += 10;
    else if (cup.bottomFlatness <= 0.03) score += 7;

    if (
      handle.duration >= Config.HANDLE_IDEAL_DURATION_MIN &&
      handle.duration <= Config.HANDLE_IDEAL_DURATION_MAX
    ) {
      score += 8;
    } else score += 5;

    if (handle.depthPercent >= 0.05 && handle.depthPercent <= 0.1) score += 7;
    else if (handle.depthPercent <= 0.15) score += 4;

    if (handleShapeValid) score += 5;
    if (priorTrendGain >= 0.5) score += 5;
    else if (priorTrendGain >= 0.4) score += 4;
    else if (priorTrendGain >= 0.3) score += 3;
    return Math.min(100, score);
  }

  detect(): {
    detected: boolean;
    cup?: CupInfo;
    handle?: HandleInfo;
    breakoutLevel?: number;
    confidence?: number;
    rejectionReason?: string;
  } {
    const n = this.data.length;
    const leftRimSearchEnd = n - Config.LEFT_RIM_MIN_DAYS_FROM_END;
    if (leftRimSearchEnd < 20) {
      return { detected: false, rejectionReason: "Insufficient data (need 60+ days)" };
    }

    const leftRimCandidates = this.findSignificantHighs(
      0,
      leftRimSearchEnd,
      Config.LEFT_RIM_MIN_PROMINENCE
    );
    if (leftRimCandidates.length === 0) {
      return { detected: false, rejectionReason: "No significant highs found" };
    }

    let best: {
      cup: CupInfo;
      handle: HandleInfo;
      breakoutLevel: number;
      confidence: number;
    } | null = null;
    let bestScore = 0;

    for (const leftRim of leftRimCandidates) {
      if (!this.hasConsecutiveLowerHighs(leftRim.index, Config.LEFT_RIM_MIN_LOWER_HIGHS)) continue;

      const priorTrend = this.validatePriorUptrend(leftRim);
      if (!priorTrend.valid) continue;

      const cupBottom = this.findCupBottom(leftRim, n - 30);
      if (!cupBottom) continue;

      const cupDepth = (leftRim.price - cupBottom.price) / leftRim.price;
      if (cupDepth < Config.CUP_MIN_DEPTH_PERCENT || cupDepth > Config.CUP_MAX_DEPTH_PERCENT)
        continue;

      const roundedness = this.calculateRoundedness(leftRim, cupBottom);
      if (roundedness < Config.CUP_MIN_ROUNDEDNESS) continue;

      const bottomAnalysis = this.calculateBottomFlatness(cupBottom.index, cupBottom.price);
      if (bottomAnalysis.stdDev > Config.CUP_BOTTOM_FLATNESS_MAX) continue;

      const rightRim = this.findRightRim(leftRim, cupBottom);
      if (!rightRim) continue;
      if (rightRim.price < leftRim.price * (1 - Config.RIGHT_RIM_TOLERANCE)) continue;

      const cupDuration = rightRim.index - leftRim.index;
      if (
        cupDuration < Config.CUP_MIN_DURATION_DAYS ||
        cupDuration > Config.CUP_MAX_DURATION_DAYS
      )
        continue;
      if (!this.validateBottomPosition(leftRim.index, cupBottom.index, rightRim.index)) continue;

      const symmetry = this.calculateSymmetry(leftRim, cupBottom, rightRim);
      if (symmetry < Config.CUP_SYMMETRY_MIN || symmetry > Config.CUP_SYMMETRY_MAX) continue;

      const handle = this.detectHandle(leftRim, cupBottom, rightRim);
      if (!handle) continue;

      const handleShape = this.validateHandleShape(handle);
      if (!handleShape.valid) continue;
      if (!this.isHandleComplete(handle)) continue;

      const currentPrice = this.closes[n - 1];
      const breakoutLevel = leftRim.price;
      const breakoutOccurred = currentPrice > breakoutLevel;
      if (!Config.ALLOW_POST_BREAKOUT && breakoutOccurred) continue;
      if (!breakoutOccurred) {
        const distanceToBreakout = (breakoutLevel - currentPrice) / breakoutLevel;
        if (distanceToBreakout > Config.BREAKOUT_PROXIMITY_MAX) continue;
      }

      const cupInfo: CupInfo = {
        leftRim,
        bottom: cupBottom,
        rightRim,
        depthPercent: cupDepth,
        duration: cupDuration,
        symmetryRatio: symmetry,
        roundednessScore: roundedness,
        bottomFlatness: bottomAnalysis.stdDev,
        bottomWidth: bottomAnalysis.width,
      };

      const confidence = this.calculateConfidenceScore(
        cupInfo,
        handle,
        priorTrend.gain,
        handleShape.valid
      );
      if (confidence > bestScore) {
        bestScore = confidence;
        best = { cup: cupInfo, handle, breakoutLevel, confidence };
      }
    }

    if (!best || best.confidence < Config.MIN_CONFIDENCE_SCORE) {
      return {
        detected: false,
        rejectionReason: best
          ? `Confidence ${best.confidence} below ${Config.MIN_CONFIDENCE_SCORE}`
          : "No valid pattern after all validations",
      };
    }

    return {
      detected: true,
      cup: best.cup,
      handle: best.handle,
      breakoutLevel: best.breakoutLevel,
      confidence: best.confidence,
    };
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Scan for textbook cup-and-handle pattern (positional).
 * Textbook rules: left rim, cup depth 12-35%, roundedness ≥ 1.3,
 * right rim within 3%, handle 5-40 days in upper third of cup, confidence ≥ 75.
 */
export function scanPositionalCupAndHandle(ohlcv: OhlcvRow[]): PositionalCupHandleResult {
  const defaultResult = (
    match: boolean
  ): PositionalCupHandleResult => ({
    match,
    cupLow: 0,
    handleLow: 0,
    resistanceLevel: 0,
    todayClose: ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].close : 0,
    pctFromResistance: 0,
  });

  if (ohlcv.length < 60) {
    return defaultResult(false);
  }

  const trimmed =
    ohlcv.length > MAX_DAYS_LOOKBACK ? ohlcv.slice(-MAX_DAYS_LOOKBACK) : ohlcv;
  const detector = new CupAndHandleDetector(trimmed);
  const result = detector.detect();

  if (!result.detected || !result.cup || !result.handle || result.breakoutLevel == null) {
    return defaultResult(false);
  }

  const last = trimmed[trimmed.length - 1];
  const todayClose = last.close;
  const resistanceLevel = result.breakoutLevel;
  const pctFromResistance =
    resistanceLevel > 0 ? ((resistanceLevel - todayClose) / resistanceLevel) * 100 : 0;
  const cupDepthAbsolute = result.cup.leftRim.price - result.cup.bottom.price;
  const target = resistanceLevel + cupDepthAbsolute;

  return {
    match: true,
    cupLow: result.cup.bottom.price,
    handleLow: result.handle.low,
    resistanceLevel,
    todayClose,
    pctFromResistance,
    confidence: result.confidence,
    target,
  };
}
