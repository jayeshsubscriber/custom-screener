/**
 * Candlestick pattern detection.
 * Each function returns number[] (1 = detected, 0 = not) aligned with OHLCV input.
 */
import type { OhlcvRow } from "@/types/screener";

function bodySize(o: number, c: number) {
  return Math.abs(c - o);
}
function range(h: number, l: number) {
  return h - l;
}
function isBullish(o: number, c: number) {
  return c > o;
}
function isBearish(o: number, c: number) {
  return c < o;
}
function upperShadow(o: number, h: number, c: number) {
  return h - Math.max(o, c);
}
function lowerShadow(o: number, l: number, c: number) {
  return Math.min(o, c) - l;
}

export function doji(data: OhlcvRow[]): number[] {
  return data.map((d) => {
    const body = bodySize(d.open, d.close);
    const r = range(d.high, d.low);
    return r > 0 && body / r < 0.1 ? 1 : 0;
  });
}

export function hammer(data: OhlcvRow[]): number[] {
  return data.map((d) => {
    const body = bodySize(d.open, d.close);
    const r = range(d.high, d.low);
    const ls = lowerShadow(d.open, d.low, d.close);
    const us = upperShadow(d.open, d.high, d.close);
    if (r === 0) return 0;
    return ls >= 2 * body && us <= body * 0.3 && body / r >= 0.1 ? 1 : 0;
  });
}

export function invertedHammer(data: OhlcvRow[]): number[] {
  return data.map((d) => {
    const body = bodySize(d.open, d.close);
    const r = range(d.high, d.low);
    const us = upperShadow(d.open, d.high, d.close);
    const ls = lowerShadow(d.open, d.low, d.close);
    if (r === 0) return 0;
    return us >= 2 * body && ls <= body * 0.3 && body / r >= 0.1 ? 1 : 0;
  });
}

export function spinningTop(data: OhlcvRow[]): number[] {
  return data.map((d) => {
    const body = bodySize(d.open, d.close);
    const r = range(d.high, d.low);
    const us = upperShadow(d.open, d.high, d.close);
    const ls = lowerShadow(d.open, d.low, d.close);
    if (r === 0) return 0;
    return body / r < 0.3 && us > body && ls > body ? 1 : 0;
  });
}

export function marubozu(data: OhlcvRow[]): number[] {
  return data.map((d) => {
    const body = bodySize(d.open, d.close);
    const r = range(d.high, d.low);
    if (r === 0) return 0;
    return body / r >= 0.95 ? 1 : 0;
  });
}

export function hangingMan(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const body = bodySize(d.open, d.close);
    const r = range(d.high, d.low);
    const ls = lowerShadow(d.open, d.low, d.close);
    const us = upperShadow(d.open, d.high, d.close);
    const prevUp = data[i - 1].close > data[i - 1].open;
    if (r === 0) return 0;
    return prevUp && ls >= 2 * body && us <= body * 0.3 && body / r >= 0.1 ? 1 : 0;
  });
}

export function shootingStar(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const body = bodySize(d.open, d.close);
    const r = range(d.high, d.low);
    const us = upperShadow(d.open, d.high, d.close);
    const ls = lowerShadow(d.open, d.low, d.close);
    const prevUp = data[i - 1].close > data[i - 1].open;
    if (r === 0) return 0;
    return prevUp && us >= 2 * body && ls <= body * 0.3 && body / r >= 0.1 ? 1 : 0;
  });
}

export function bullishEngulfing(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    return isBearish(prev.open, prev.close) &&
      isBullish(d.open, d.close) &&
      d.open <= prev.close &&
      d.close >= prev.open
      ? 1
      : 0;
  });
}

export function bearishEngulfing(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    return isBullish(prev.open, prev.close) &&
      isBearish(d.open, d.close) &&
      d.open >= prev.close &&
      d.close <= prev.open
      ? 1
      : 0;
  });
}

export function piercingLine(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    const prevMid = (prev.open + prev.close) / 2;
    return isBearish(prev.open, prev.close) &&
      isBullish(d.open, d.close) &&
      d.open < prev.close &&
      d.close > prevMid &&
      d.close < prev.open
      ? 1
      : 0;
  });
}

export function darkCloudCover(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    const prevMid = (prev.open + prev.close) / 2;
    return isBullish(prev.open, prev.close) &&
      isBearish(d.open, d.close) &&
      d.open > prev.close &&
      d.close < prevMid &&
      d.close > prev.open
      ? 1
      : 0;
  });
}

export function bullishHarami(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    return isBearish(prev.open, prev.close) &&
      isBullish(d.open, d.close) &&
      d.open > prev.close &&
      d.close < prev.open
      ? 1
      : 0;
  });
}

export function bearishHarami(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    return isBullish(prev.open, prev.close) &&
      isBearish(d.open, d.close) &&
      d.open < prev.close &&
      d.close > prev.open
      ? 1
      : 0;
  });
}

export function tweezerTop(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    const tol = range(d.high, d.low) * 0.05;
    return isBullish(prev.open, prev.close) &&
      isBearish(d.open, d.close) &&
      Math.abs(d.high - prev.high) <= Math.max(tol, 0.01)
      ? 1
      : 0;
  });
}

export function tweezerBottom(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    const prev = data[i - 1];
    const tol = range(d.high, d.low) * 0.05;
    return isBearish(prev.open, prev.close) &&
      isBullish(d.open, d.close) &&
      Math.abs(d.low - prev.low) <= Math.max(tol, 0.01)
      ? 1
      : 0;
  });
}

export function morningStar(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i < 2) return 0;
    const first = data[i - 2];
    const mid = data[i - 1];
    const last = d;
    const midBody = bodySize(mid.open, mid.close);
    const firstBody = bodySize(first.open, first.close);
    return isBearish(first.open, first.close) &&
      firstBody > 0 &&
      midBody < firstBody * 0.3 &&
      isBullish(last.open, last.close) &&
      last.close > (first.open + first.close) / 2
      ? 1
      : 0;
  });
}

export function eveningStar(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i < 2) return 0;
    const first = data[i - 2];
    const mid = data[i - 1];
    const last = d;
    const midBody = bodySize(mid.open, mid.close);
    const firstBody = bodySize(first.open, first.close);
    return isBullish(first.open, first.close) &&
      firstBody > 0 &&
      midBody < firstBody * 0.3 &&
      isBearish(last.open, last.close) &&
      last.close < (first.open + first.close) / 2
      ? 1
      : 0;
  });
}

export function threeWhiteSoldiers(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i < 2) return 0;
    const a = data[i - 2], b = data[i - 1], c = d;
    return isBullish(a.open, a.close) &&
      isBullish(b.open, b.close) &&
      isBullish(c.open, c.close) &&
      b.close > a.close &&
      c.close > b.close &&
      b.open > a.open &&
      c.open > b.open
      ? 1
      : 0;
  });
}

export function threeBlackCrows(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i < 2) return 0;
    const a = data[i - 2], b = data[i - 1], c = d;
    return isBearish(a.open, a.close) &&
      isBearish(b.open, b.close) &&
      isBearish(c.open, c.close) &&
      b.close < a.close &&
      c.close < b.close &&
      b.open < a.open &&
      c.open < b.open
      ? 1
      : 0;
  });
}

export function threeInsideUp(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i < 2) return 0;
    const a = data[i - 2], b = data[i - 1], c = d;
    return isBearish(a.open, a.close) &&
      isBullish(b.open, b.close) &&
      b.open > a.close &&
      b.close < a.open &&
      isBullish(c.open, c.close) &&
      c.close > a.open
      ? 1
      : 0;
  });
}

export function threeInsideDown(data: OhlcvRow[]): number[] {
  return data.map((d, i) => {
    if (i < 2) return 0;
    const a = data[i - 2], b = data[i - 1], c = d;
    return isBullish(a.open, a.close) &&
      isBearish(b.open, b.close) &&
      b.open < a.close &&
      b.close > a.open &&
      isBearish(c.open, c.close) &&
      c.close < a.open
      ? 1
      : 0;
  });
}

/** Map of pattern ID → detection function */
export const CANDLESTICK_FNS: Record<string, (data: OhlcvRow[]) => number[]> = {
  doji,
  hammer,
  inverted_hammer: invertedHammer,
  spinning_top: spinningTop,
  marubozu,
  hanging_man: hangingMan,
  shooting_star: shootingStar,
  bullish_engulfing: bullishEngulfing,
  bearish_engulfing: bearishEngulfing,
  piercing_line: piercingLine,
  dark_cloud_cover: darkCloudCover,
  bullish_harami: bullishHarami,
  bearish_harami: bearishHarami,
  tweezer_top: tweezerTop,
  tweezer_bottom: tweezerBottom,
  morning_star: morningStar,
  evening_star: eveningStar,
  three_white_soldiers: threeWhiteSoldiers,
  three_black_crows: threeBlackCrows,
  three_inside_up: threeInsideUp,
  three_inside_down: threeInsideDown,
};
