/**
 * Positional MACD indicators — self-contained (no external dependency).
 * Logic matches Technical Scanner: MACD 12/26/9, crossover in last N bars,
 * Bullish Cross Building (negative/positive) on latest bar.
 */

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const FAST_PERIOD = 12;
const SLOW_PERIOD = 26;
const SIGNAL_PERIOD = 9;
const MIN_BARS = 35; // 26 + 9 for first valid signal

function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period && i < values.length; i++) {
    sum += values[i]!;
    out.push(NaN);
  }
  if (values.length < period) return out;
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export interface MacdPoint {
  macd: number;
  signal: number;
  histogram: number;
}

/** MACD (12, 26, 9). Result index i aligns with candle index i. First valid MACD at index SLOW_PERIOD-1; first valid signal at SLOW_PERIOD-1+SIGNAL_PERIOD-1. */
export function calculateMACD(closePrices: number[]): MacdPoint[] {
  if (closePrices.length < SLOW_PERIOD) return [];
  const fastEma = ema(closePrices, FAST_PERIOD);
  const slowEma = ema(closePrices, SLOW_PERIOD);
  const macdLine: number[] = [];
  for (let i = 0; i < closePrices.length; i++) {
    if (fastEma[i] == null || slowEma[i] == null || Number.isNaN(fastEma[i]!) || Number.isNaN(slowEma[i]!)) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEma[i]! - slowEma[i]!);
    }
  }
  const result: MacdPoint[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    result.push({ macd: macdLine[i]!, signal: NaN, histogram: NaN });
  }
  const validMacdStart = SLOW_PERIOD - 1;
  const validMacdSlice = macdLine.slice(validMacdStart).filter((v) => !Number.isNaN(v));
  if (validMacdSlice.length < SIGNAL_PERIOD) return result;
  const signalEma = ema(macdLine.slice(validMacdStart), SIGNAL_PERIOD);
  const signalStart = validMacdStart + SIGNAL_PERIOD - 1;
  for (let i = signalStart; i < macdLine.length; i++) {
    const macd = macdLine[i]!;
    const sigVal = signalEma[i - validMacdStart];
    const signal = sigVal != null && !Number.isNaN(sigVal) ? sigVal : NaN;
    const histogram = Number.isNaN(signal) ? NaN : macd - signal;
    result[i] = { macd, signal, histogram };
  }
  return result;
}

function detectAllCrossovers(
  macdResults: MacdPoint[]
): { type: "bullish" | "bearish"; index: number; point: MacdPoint }[] {
  const crossovers: { type: "bullish" | "bearish"; index: number; point: MacdPoint }[] = [];
  for (let i = 1; i < macdResults.length; i++) {
    const curr = macdResults[i]!;
    const prev = macdResults[i - 1]!;
    if (
      Number.isNaN(curr.macd) ||
      Number.isNaN(curr.signal) ||
      Number.isNaN(prev.macd) ||
      Number.isNaN(prev.signal)
    )
      continue;
    if (prev.macd <= prev.signal && curr.macd > curr.signal) {
      crossovers.push({ type: "bullish", index: i, point: curr });
    }
    if (prev.macd >= prev.signal && curr.macd < curr.signal) {
      crossovers.push({ type: "bearish", index: i, point: curr });
    }
  }
  return crossovers;
}

export interface MacdCrossoverScanResult {
  match: boolean;
  crossoverDate?: string;
  macdValue?: number;
  signalValue?: number;
  histogramValue?: number;
  todayClose: number;
}

/**
 * MACD bullish crossover in the last N bars (e.g. last 30 days for 1D, last 30 months for 1M).
 * Uses same logic as Technical Scanner: sort by date, detect all crossovers, keep those in last N bars.
 */
export function scanMacdCrossoverInLastN(
  ohlcv: OhlcvRow[],
  lookbackBars: number
): MacdCrossoverScanResult {
  const last = ohlcv[ohlcv.length - 1];
  const todayClose = last?.close ?? 0;
  const defaultResult: MacdCrossoverScanResult = { match: false, todayClose };

  if (ohlcv.length < MIN_BARS) return defaultResult;

  const sorted = [...ohlcv].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((r) => r.close);
  const macdResults = calculateMACD(closes);
  const allCrossovers = detectAllCrossovers(macdResults);

  const fromBarIndex = Math.max(0, sorted.length - lookbackBars);
  let best: { candleIndex: number; c: (typeof allCrossovers)[0] } | null = null;
  for (const c of allCrossovers) {
    const candleIndex = c.index;
    if (c.type === "bullish" && candleIndex >= fromBarIndex && candleIndex < sorted.length) {
      if (!best || candleIndex > best.candleIndex) best = { candleIndex, c };
    }
  }
  if (best) {
    const candle = sorted[best.candleIndex]!;
    return {
      match: true,
      crossoverDate: candle.date,
      macdValue: best.c.point.macd,
      signalValue: best.c.point.signal,
      histogramValue: best.c.point.histogram,
      todayClose,
    };
  }
  return defaultResult;
}

export interface BullishCrossBuildingScanResult {
  match: boolean;
  macdValue?: number;
  signalValue?: number;
  currentHistogram?: number;
  previousHistogram?: number;
  histogramChange?: number;
  todayClose: number;
}

/**
 * Bullish Cross Building (Negative): MACD & Signal negative, histogram improving (1M interval).
 * Both MACD and Signal are negative; histogram is negative but has improved vs previous bar.
 */
export function scanBullishCrossBuildingNegative(ohlcv: OhlcvRow[]): BullishCrossBuildingScanResult {
  const last = ohlcv[ohlcv.length - 1];
  const todayClose = last?.close ?? 0;
  const defaultResult: BullishCrossBuildingScanResult = { match: false, todayClose };

  if (ohlcv.length < MIN_BARS) return defaultResult;

  const sorted = [...ohlcv].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((r) => r.close);
  const macdResults = calculateMACD(closes);
  if (macdResults.length < 2) return defaultResult;

  const current = macdResults[macdResults.length - 1]!;
  const previous = macdResults[macdResults.length - 2]!;

  if (
    Number.isNaN(current.macd) ||
    Number.isNaN(current.signal) ||
    Number.isNaN(current.histogram) ||
    Number.isNaN(previous.histogram)
  )
    return defaultResult;

  const macdNegative = current.macd < 0;
  const signalNegative = current.signal < 0;
  const histogramNegative = current.histogram < 0;
  const histogramImproved = current.histogram > previous.histogram;

  if (macdNegative && signalNegative && histogramNegative && histogramImproved) {
    return {
      match: true,
      macdValue: current.macd,
      signalValue: current.signal,
      currentHistogram: current.histogram,
      previousHistogram: previous.histogram,
      histogramChange: current.histogram - previous.histogram,
      todayClose,
    };
  }
  return defaultResult;
}

/**
 * Bullish Cross Building (Positive): MACD & Signal positive, histogram negative but rising (1M interval).
 * Both MACD and Signal are positive; histogram is negative but rising (improving) vs previous bar.
 */
export function scanBullishCrossBuildingPositive(ohlcv: OhlcvRow[]): BullishCrossBuildingScanResult {
  const last = ohlcv[ohlcv.length - 1];
  const todayClose = last?.close ?? 0;
  const defaultResult: BullishCrossBuildingScanResult = { match: false, todayClose };

  if (ohlcv.length < MIN_BARS) return defaultResult;

  const sorted = [...ohlcv].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((r) => r.close);
  const macdResults = calculateMACD(closes);
  if (macdResults.length < 2) return defaultResult;

  const current = macdResults[macdResults.length - 1]!;
  const previous = macdResults[macdResults.length - 2]!;

  if (
    Number.isNaN(current.macd) ||
    Number.isNaN(current.signal) ||
    Number.isNaN(current.histogram) ||
    Number.isNaN(previous.histogram)
  )
    return defaultResult;

  const macdPositive = current.macd > 0;
  const signalPositive = current.signal > 0;
  const histogramNegative = current.histogram < 0;
  const histogramRising = current.histogram > previous.histogram;

  if (macdPositive && signalPositive && histogramNegative && histogramRising) {
    return {
      match: true,
      macdValue: current.macd,
      signalValue: current.signal,
      currentHistogram: current.histogram,
      previousHistogram: previous.histogram,
      histogramChange: current.histogram - previous.histogram,
      todayClose,
    };
  }
  return defaultResult;
}
