/**
 * Compound setup patterns: crossovers and flips detected as single patterns.
 * Each returns number[] (1 = detected at that bar, 0 = not).
 */
import { ema, sma } from "./math";
import { macd } from "./macd";
import { supertrend } from "./volatility";

export function emaCrossBullish(closes: number[], fast: number, slow: number): number[] {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  return f.map((fv, i) => {
    if (i === 0 || Number.isNaN(fv) || Number.isNaN(s[i]) || Number.isNaN(f[i - 1]) || Number.isNaN(s[i - 1])) return 0;
    return f[i - 1] <= s[i - 1] && fv > s[i] ? 1 : 0;
  });
}

export function emaCrossBearish(closes: number[], fast: number, slow: number): number[] {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  return f.map((fv, i) => {
    if (i === 0 || Number.isNaN(fv) || Number.isNaN(s[i]) || Number.isNaN(f[i - 1]) || Number.isNaN(s[i - 1])) return 0;
    return f[i - 1] >= s[i - 1] && fv < s[i] ? 1 : 0;
  });
}

export function smaCrossBullish(closes: number[], fast: number, slow: number): number[] {
  const f = sma(closes, fast);
  const s = sma(closes, slow);
  return f.map((fv, i) => {
    if (i === 0 || Number.isNaN(fv) || Number.isNaN(s[i]) || Number.isNaN(f[i - 1]) || Number.isNaN(s[i - 1])) return 0;
    return f[i - 1] <= s[i - 1] && fv > s[i] ? 1 : 0;
  });
}

export function smaCrossBearish(closes: number[], fast: number, slow: number): number[] {
  const f = sma(closes, fast);
  const s = sma(closes, slow);
  return f.map((fv, i) => {
    if (i === 0 || Number.isNaN(fv) || Number.isNaN(s[i]) || Number.isNaN(f[i - 1]) || Number.isNaN(s[i - 1])) return 0;
    return f[i - 1] >= s[i - 1] && fv < s[i] ? 1 : 0;
  });
}

export function macdCrossBullish(
  closes: number[], fast: number, slow: number, signal: number
): number[] {
  const { line, signal: sig } = macd(closes, fast, slow, signal);
  return line.map((l, i) => {
    if (i === 0 || Number.isNaN(l) || Number.isNaN(sig[i]) || Number.isNaN(line[i - 1]) || Number.isNaN(sig[i - 1])) return 0;
    return line[i - 1] <= sig[i - 1] && l > sig[i] ? 1 : 0;
  });
}

export function macdCrossBearish(
  closes: number[], fast: number, slow: number, signal: number
): number[] {
  const { line, signal: sig } = macd(closes, fast, slow, signal);
  return line.map((l, i) => {
    if (i === 0 || Number.isNaN(l) || Number.isNaN(sig[i]) || Number.isNaN(line[i - 1]) || Number.isNaN(sig[i - 1])) return 0;
    return line[i - 1] >= sig[i - 1] && l < sig[i] ? 1 : 0;
  });
}

export function supertrendFlipBullish(
  highs: number[], lows: number[], closes: number[], period: number, multiplier: number
): number[] {
  const st = supertrend(highs, lows, closes, period, multiplier);
  return closes.map((c, i) => {
    if (i === 0 || Number.isNaN(st[i]) || Number.isNaN(st[i - 1])) return 0;
    return closes[i - 1] <= st[i - 1] && c > st[i] ? 1 : 0;
  });
}

export function supertrendFlipBearish(
  highs: number[], lows: number[], closes: number[], period: number, multiplier: number
): number[] {
  const st = supertrend(highs, lows, closes, period, multiplier);
  return closes.map((c, i) => {
    if (i === 0 || Number.isNaN(st[i]) || Number.isNaN(st[i - 1])) return 0;
    return closes[i - 1] >= st[i - 1] && c < st[i] ? 1 : 0;
  });
}
