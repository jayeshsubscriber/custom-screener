/**
 * Positional trading scanners.
 * Each scanner takes OHLCV (daily) and returns match + metadata for results table.
 * Logic is tuned for positional (weeks to months) time horizon.
 */

import { scanPositionalCupAndHandle } from "./positionalCupAndHandle";
import {
  scanMacdCrossoverInLastN,
  scanBullishCrossBuildingNegative,
  scanBullishCrossBuildingPositive,
  type MacdCrossoverScanResult,
  type BullishCrossBuildingScanResult,
} from "./positionalMacdIndicators";

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TRADING_DAYS_52W = 252;
const LOOKBACK_20D = 20;
const RSI_PERIOD = 14;
const EMA50_PERIOD = 50;

// ---------- Helpers ----------
function ema(values: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period - 1; i++) result.push(NaN);
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function rsi(closes: number[], period: number): number[] {
  const out: number[] = new Array(period).fill(NaN);
  for (let i = period; i < closes.length; i++) {
    const slice = closes.slice(i - period, i + 1);
    let gains = 0, losses = 0;
    for (let j = 1; j < slice.length; j++) {
      const d = slice[j]! - slice[j - 1]!;
      if (d > 0) gains += d; else losses -= d;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) {
      out.push(100);
    } else {
      const rs = avgGain / avgLoss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

// ---------- 1. Fresh 52-Week Highs ----------
/** Logic: Stock makes a new 52-week high today. 52w high = max(high) over last 252 days; today's high >= that level. */
export interface Fresh52WeekHighResult {
  match: boolean;
  high52w: number;
  todayHigh: number;
  todayClose: number;
  pctFrom52wHigh: number;
}

export function scanFresh52WeekHigh(ohlcv: OhlcvRow[]): Fresh52WeekHighResult {
  if (ohlcv.length < 2) {
    return { match: false, high52w: 0, todayHigh: 0, todayClose: 0, pctFrom52wHigh: 0 };
  }
  const last = ohlcv[ohlcv.length - 1]!;
  const prior = ohlcv.slice(0, -1);
  const lookback = prior.slice(-Math.min(TRADING_DAYS_52W, prior.length));
  const high52w = Math.max(...lookback.map((r) => r.high));
  const todayHigh = last.high;
  const todayClose = last.close;
  const pctFrom52wHigh = high52w > 0 ? ((todayClose - high52w) / high52w) * 100 : 0;
  const match = high52w > 0 && todayHigh >= high52w;
  return { match, high52w, todayHigh, todayClose, pctFrom52wHigh };
}

// ---------- 2. All-Time High Breakout ----------
/** Logic: Breaking above all-time high. ATH = max(high) of full history; today's close > ATH. */
export interface AllTimeHighBreakoutResult {
  match: boolean;
  ath: number;
  todayClose: number;
  pctAboveAth: number;
}

export function scanAllTimeHighBreakout(ohlcv: OhlcvRow[]): AllTimeHighBreakoutResult {
  if (ohlcv.length < 2) {
    return { match: false, ath: 0, todayClose: 0, pctAboveAth: 0 };
  }
  const allButToday = ohlcv.slice(0, -1);
  const ath = Math.max(...allButToday.map((r) => r.high));
  const last = ohlcv[ohlcv.length - 1]!;
  const todayClose = last.close;
  const pctAboveAth = ath > 0 ? ((todayClose - ath) / ath) * 100 : 0;
  const match = ath > 0 && todayClose > ath;
  return { match, ath, todayClose, pctAboveAth };
}

// ---------- 3. Relative Strength Leaders ----------
/** Logic: Outperforming Nifty by 2%+ over 20 days. Stock 20d return - benchmark 20d return >= 2%. */
export interface RelativeStrengthLeadersResult {
  match: boolean;
  stockReturn20d: number;
  benchmarkReturn20d: number;
  outperformance: number;
  todayClose: number;
}

export function scanRelativeStrengthLeaders(
  ohlcv: OhlcvRow[],
  benchmarkReturn20d: number
): RelativeStrengthLeadersResult {
  if (ohlcv.length < LOOKBACK_20D + 1) {
    return {
      match: false,
      stockReturn20d: 0,
      benchmarkReturn20d,
      outperformance: 0,
      todayClose: ohlcv[ohlcv.length - 1]?.close ?? 0,
    };
  }
  const startClose = ohlcv[ohlcv.length - 1 - LOOKBACK_20D]!.close;
  const endClose = ohlcv[ohlcv.length - 1]!.close;
  const stockReturn20d = ((endClose - startClose) / startClose) * 100;
  const outperformance = stockReturn20d - benchmarkReturn20d;
  const match = outperformance >= 2;
  return {
    match,
    stockReturn20d,
    benchmarkReturn20d,
    outperformance,
    todayClose: endClose,
  };
}

// ---------- 4. Pullback to 50 EMA ----------
/** Logic: Uptrend (price was above 50 EMA in recent past) and deeper pullback to 50 EMA (close within 2% of EMA50). */
export interface Pullback50EmaResult {
  match: boolean;
  ema50: number;
  todayClose: number;
  pctFromEma50: number;
  ema50Rising: boolean;
}

export function scanPullback50Ema(ohlcv: OhlcvRow[]): Pullback50EmaResult {
  if (ohlcv.length < EMA50_PERIOD + 20) {
    return { match: false, ema50: 0, todayClose: 0, pctFromEma50: 0, ema50Rising: false };
  }
  const closes = ohlcv.map((r) => r.close);
  const ema50Series = ema(closes, EMA50_PERIOD);
  const ema50 = ema50Series[ema50Series.length - 1]!;
  const ema50_10dAgo = ema50Series[ema50Series.length - 11];
  const last = ohlcv[ohlcv.length - 1]!;
  const todayClose = last.close;
  const pctFromEma50 = ema50 > 0 ? ((todayClose - ema50) / ema50) * 100 : 0;
  const ema50Rising = typeof ema50_10dAgo === "number" && ema50 > ema50_10dAgo;
  // Uptrend: 10 days ago close was above EMA50
  const idx10dAgo = ohlcv.length - 11;
  const close10dAgo = ohlcv[idx10dAgo]?.close;
  const ema10dAgo = ema50Series[idx10dAgo];
  const wasAboveEma = typeof close10dAgo === "number" && typeof ema10dAgo === "number" && close10dAgo >= ema10dAgo * 0.98;
  // Pullback: close within 2% of EMA50 (above or below)
  const nearEma = Math.abs(pctFromEma50) <= 2;
  const match = wasAboveEma && nearEma && ema50Rising;
  return { match, ema50, todayClose, pctFromEma50, ema50Rising };
}

// ---------- 5. Bullish RSI Divergence ----------
/** Logic: Price making lower lows, RSI making higher lows over last ~30 days. */
export interface BullishRsiDivergenceResult {
  match: boolean;
  rsiCurrent: number;
  priceLow1: number;
  priceLow2: number;
  rsi1: number;
  rsi2: number;
  todayClose: number;
}

export function scanBullishRsiDivergence(ohlcv: OhlcvRow[]): BullishRsiDivergenceResult {
  const lookback = 30;
  if (ohlcv.length < lookback + RSI_PERIOD) {
    const last = ohlcv[ohlcv.length - 1];
    return {
      match: false,
      rsiCurrent: 0,
      priceLow1: 0,
      priceLow2: 0,
      rsi1: 0,
      rsi2: 0,
      todayClose: last?.close ?? 0,
    };
  }
  const slice = ohlcv.slice(-(lookback + RSI_PERIOD));
  const closes = slice.map((r) => r.close);
  const lows = slice.map((r) => r.low);
  const rsiSeries = rsi(closes, RSI_PERIOD);
  const rsiValid = rsiSeries.slice(RSI_PERIOD);
  const lowsValid = lows.slice(RSI_PERIOD);
  if (lowsValid.length < 10) {
    const last = ohlcv[ohlcv.length - 1]!;
    return {
      match: false,
      rsiCurrent: rsiSeries[rsiSeries.length - 1] ?? 0,
      priceLow1: 0,
      priceLow2: 0,
      rsi1: 0,
      rsi2: 0,
      todayClose: last.close,
    };
  }
  const rsiCurrent = rsiSeries[rsiSeries.length - 1] ?? 0;
  const todayClose = ohlcv[ohlcv.length - 1]!.close;
  // Find two distinct lows: first in first half, second in second half
  const mid = Math.floor(lowsValid.length / 2);
  const firstHalf = lowsValid.slice(0, mid);
  const secondHalf = lowsValid.slice(mid);
  const minFirstIdx = firstHalf.indexOf(Math.min(...firstHalf));
  const minSecondIdx = secondHalf.indexOf(Math.min(...secondHalf));
  const priceLow1 = firstHalf[minFirstIdx] ?? 0;
  const priceLow2 = secondHalf[minSecondIdx] ?? 0;
  const rsi1 = rsiValid[minFirstIdx] ?? 0;
  const rsi2 = rsiValid[mid + minSecondIdx] ?? 0;
  const priceLowerLow = priceLow2 < priceLow1;
  const rsiHigherLow = typeof rsi2 === "number" && typeof rsi1 === "number" && rsi2 > rsi1;
  const match = priceLowerLow && rsiHigherLow && rsiCurrent < 50;
  return {
    match,
    rsiCurrent,
    priceLow1,
    priceLow2,
    rsi1,
    rsi2,
    todayClose,
  };
}

// ---------- 6. Support Zone Test ----------
/** Logic: Price testing a major support (e.g. 20d low) with signs of holding — low within 2% of support, close above support. */
export interface SupportZoneTestResult {
  match: boolean;
  supportLevel: number;
  todayLow: number;
  todayClose: number;
  pctFromSupport: number;
}

export function scanSupportZoneTest(ohlcv: OhlcvRow[]): SupportZoneTestResult {
  if (ohlcv.length < 22) {
    return { match: false, supportLevel: 0, todayLow: 0, todayClose: 0, pctFromSupport: 0 };
  }
  const last = ohlcv[ohlcv.length - 1]!;
  const prior20 = ohlcv.slice(ohlcv.length - 21, -1);
  const supportLevel = Math.min(...prior20.map((r) => r.low));
  const todayLow = last.low;
  const todayClose = last.close;
  const pctFromSupport = supportLevel > 0 ? ((todayClose - supportLevel) / supportLevel) * 100 : 0;
  const touchedSupport = todayLow <= supportLevel * 1.02;
  const heldAbove = todayClose >= supportLevel * 0.98;
  const match = touchedSupport && heldAbove && supportLevel > 0;
  return { match, supportLevel, todayLow, todayClose, pctFromSupport };
}

// ---------- 7. Cup and Handle (simplified) ----------
/** Logic: Rounded bottom (lows in middle) then shallower pullback (handle); price near recent high. */
export interface CupHandleResult {
  match: boolean;
  cupLow: number;
  handleLow: number;
  resistanceLevel: number;
  todayClose: number;
  pctFromResistance: number;
}

export function scanCupAndHandle(ohlcv: OhlcvRow[]): CupHandleResult {
  const result = scanPositionalCupAndHandle(ohlcv);
  return {
    match: result.match,
    cupLow: result.cupLow,
    handleLow: result.handleLow,
    resistanceLevel: result.resistanceLevel,
    todayClose: result.todayClose,
    pctFromResistance: result.pctFromResistance,
  };
}

// ---------- 8. Double Bottom ----------
/** Logic: Two distinct lows within 3% of each other with a bounce between (W shape). */
export interface DoubleBottomResult {
  match: boolean;
  firstLow: number;
  secondLow: number;
  neckline: number;
  todayClose: number;
  pctFromNeckline: number;
}

export function scanDoubleBottom(ohlcv: OhlcvRow[]): DoubleBottomResult {
  if (ohlcv.length < 35) {
    return { match: false, firstLow: 0, secondLow: 0, neckline: 0, todayClose: 0, pctFromNeckline: 0 };
  }
  const lookback = ohlcv.slice(-35);
  const mid = Math.floor(lookback.length / 2);
  const firstHalf = lookback.slice(0, mid);
  const secondHalf = lookback.slice(mid);
  const firstLow = Math.min(...firstHalf.map((r) => r.low));
  const secondLow = Math.min(...secondHalf.map((r) => r.low));
  const neckline = Math.max(...lookback.map((r) => r.high));
  const last = ohlcv[ohlcv.length - 1]!;
  const todayClose = last.close;
  const pctFromNeckline = neckline > 0 ? ((todayClose - neckline) / neckline) * 100 : 0;
  const lowsSimilar = Math.abs(firstLow - secondLow) / Math.min(firstLow, secondLow) <= 0.03;
  const bounce = todayClose > (firstLow + secondLow) / 2 * 1.02;
  const match = lowsSimilar && bounce && neckline > 0;
  return { match, firstLow, secondLow, neckline, todayClose, pctFromNeckline };
}

// ---------- 9. Morning Star (3-candle reversal) ----------
/** Logic: Day1 big red, Day2 small body (gap down), Day3 big green closing well into Day1 range. */
export interface MorningStarResult {
  match: boolean;
  day1BodyPct: number;
  day3BodyPct: number;
  todayClose: number;
}

export function scanMorningStar(ohlcv: OhlcvRow[]): MorningStarResult {
  if (ohlcv.length < 3) {
    return { match: false, day1BodyPct: 0, day3BodyPct: 0, todayClose: 0 };
  }
  const d1 = ohlcv[ohlcv.length - 3]!;
  const d2 = ohlcv[ohlcv.length - 2]!;
  const d3 = ohlcv[ohlcv.length - 1]!;
  const body1 = d1.open > d1.close ? (d1.open - d1.close) / d1.open : 0;
  const body3 = d3.close > d3.open ? (d3.close - d3.open) / d3.open : 0;
  const smallBody2 = Math.abs(d2.close - d2.open) / d2.open <= 0.015;
  const starGap = d2.high < d1.low * 1.001;
  const d3Strong = d3.close > (d1.open + d1.close) / 2 && body3 >= 0.01;
  const match = body1 >= 0.02 && smallBody2 && starGap && d3Strong;
  return { match, day1BodyPct: body1 * 100, day3BodyPct: body3 * 100, todayClose: d3.close };
}

// ---------- 10. Accumulation Phase ----------
/** Logic: Low volatility (10d range < 80% of 20d range) and volume trend up (5d avg vol > 20d avg * 1.1). */
export interface AccumulationPhaseResult {
  match: boolean;
  volatilityRatio: number;
  volumeRatio: number;
  todayClose: number;
}

export function scanAccumulationPhase(ohlcv: OhlcvRow[]): AccumulationPhaseResult {
  if (ohlcv.length < 25) {
    return { match: false, volatilityRatio: 0, volumeRatio: 0, todayClose: 0 };
  }
  const last10 = ohlcv.slice(-10);
  const last20 = ohlcv.slice(-20);
  const range10 = Math.max(...last10.map((r) => r.high)) - Math.min(...last10.map((r) => r.low));
  const range20 = Math.max(...last20.map((r) => r.high)) - Math.min(...last20.map((r) => r.low));
  const vol5 = ohlcv.slice(-5).reduce((s, r) => s + r.volume, 0) / 5;
  const vol20 = ohlcv.slice(-20).reduce((s, r) => s + r.volume, 0) / 20;
  const volatilityRatio = range20 > 0 ? range10 / range20 : 0;
  const volumeRatio = vol20 > 0 ? vol5 / vol20 : 0;
  const lowVol = volatilityRatio <= 0.85;
  const volumeRising = volumeRatio >= 1.1;
  const match = lowVol && volumeRising;
  return {
    match,
    volatilityRatio: Math.round(volatilityRatio * 100) / 100,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    todayClose: ohlcv[ohlcv.length - 1]!.close,
  };
}

export type PositionalScannerId =
  | "fresh-52w-high"
  | "ath-breakout"
  | "rs-leaders"
  | "pullback-50ema"
  | "bullish-divergence"
  | "consolidation-breakout"
  | "support-test"
  | "cup-handle"
  | "double-bottom"
  | "morning-star"
  | "accumulation-pattern"
  | "macd-crossover-1d"
  | "macd-crossover-1mo"
  | "bullish-cross-building-negative"
  | "bullish-cross-building-positive";

export interface ScannerResultBase {
  symbol: string;
  name: string;
  todayClose: number;
}

export type PositionalScanResult =
  | (ScannerResultBase & { scannerId: "fresh-52w-high"; data: Fresh52WeekHighResult })
  | (ScannerResultBase & { scannerId: "ath-breakout"; data: AllTimeHighBreakoutResult })
  | (ScannerResultBase & { scannerId: "rs-leaders"; data: RelativeStrengthLeadersResult })
  | (ScannerResultBase & { scannerId: "pullback-50ema"; data: Pullback50EmaResult })
  | (ScannerResultBase & { scannerId: "bullish-divergence"; data: BullishRsiDivergenceResult })
  | (ScannerResultBase & { scannerId: "support-test"; data: SupportZoneTestResult })
  | (ScannerResultBase & { scannerId: "cup-handle"; data: CupHandleResult })
  | (ScannerResultBase & { scannerId: "double-bottom"; data: DoubleBottomResult })
  | (ScannerResultBase & { scannerId: "morning-star"; data: MorningStarResult })
  | (ScannerResultBase & { scannerId: "accumulation-pattern"; data: AccumulationPhaseResult })
  | (ScannerResultBase & { scannerId: "macd-crossover-1d"; data: MacdCrossoverScanResult })
  | (ScannerResultBase & { scannerId: "macd-crossover-1mo"; data: MacdCrossoverScanResult })
  | (ScannerResultBase & { scannerId: "bullish-cross-building-negative"; data: BullishCrossBuildingScanResult })
  | (ScannerResultBase & { scannerId: "bullish-cross-building-positive"; data: BullishCrossBuildingScanResult });

export function runPositionalScanner(
  scannerId: PositionalScannerId,
  ohlcv: OhlcvRow[],
  symbol: string,
  name: string,
  benchmarkReturn20d: number
): PositionalScanResult | null {
  const last = ohlcv[ohlcv.length - 1];
  const todayClose = last?.close ?? 0;
  const base: ScannerResultBase = { symbol, name, todayClose };

  switch (scannerId) {
    case "fresh-52w-high": {
      const data = scanFresh52WeekHigh(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "fresh-52w-high", data };
    }
    case "ath-breakout": {
      const data = scanAllTimeHighBreakout(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "ath-breakout", data };
    }
    case "rs-leaders": {
      const data = scanRelativeStrengthLeaders(ohlcv, benchmarkReturn20d);
      if (!data.match) return null;
      return { ...base, scannerId: "rs-leaders", data };
    }
    case "pullback-50ema": {
      const data = scanPullback50Ema(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "pullback-50ema", data };
    }
    case "bullish-divergence": {
      const data = scanBullishRsiDivergence(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "bullish-divergence", data };
    }
    case "support-test": {
      const data = scanSupportZoneTest(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "support-test", data };
    }
    case "cup-handle": {
      const data = scanCupAndHandle(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "cup-handle", data };
    }
    case "double-bottom": {
      const data = scanDoubleBottom(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "double-bottom", data };
    }
    case "morning-star": {
      const data = scanMorningStar(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "morning-star", data };
    }
    case "accumulation-pattern": {
      const data = scanAccumulationPhase(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "accumulation-pattern", data };
    }
    case "macd-crossover-1d": {
      const data = scanMacdCrossoverInLastN(ohlcv, 30);
      if (!data.match) return null;
      return { ...base, scannerId: "macd-crossover-1d", data };
    }
    case "macd-crossover-1mo": {
      const data = scanMacdCrossoverInLastN(ohlcv, 30);
      if (!data.match) return null;
      return { ...base, scannerId: "macd-crossover-1mo", data };
    }
    case "bullish-cross-building-negative": {
      const data = scanBullishCrossBuildingNegative(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "bullish-cross-building-negative", data };
    }
    case "bullish-cross-building-positive": {
      const data = scanBullishCrossBuildingPositive(ohlcv);
      if (!data.match) return null;
      return { ...base, scannerId: "bullish-cross-building-positive", data };
    }
    default:
      return null;
  }
}
