/**
 * Volatility indicators: Bollinger Bands, ATR, Supertrend, Keltner Channels.
 */
import { sma, ema, stdDev, trueRange, wilderSmooth, rollingMax, rollingMin } from "./math";

export function bollingerUpper(
  closes: number[],
  period: number,
  mult: number
): number[] {
  const mid = sma(closes, period);
  const sd = stdDev(closes, period);
  return mid.map((m, i) => (Number.isNaN(m) ? NaN : m + mult * sd[i]));
}

export function bollingerMiddle(closes: number[], period: number): number[] {
  return sma(closes, period);
}

export function bollingerLower(
  closes: number[],
  period: number,
  mult: number
): number[] {
  const mid = sma(closes, period);
  const sd = stdDev(closes, period);
  return mid.map((m, i) => (Number.isNaN(m) ? NaN : m - mult * sd[i]));
}

export function bollingerBandwidth(
  closes: number[],
  period: number,
  mult: number
): number[] {
  const mid = sma(closes, period);
  const sd = stdDev(closes, period);
  return mid.map((m, i) => {
    if (Number.isNaN(m) || m === 0) return NaN;
    return ((2 * mult * sd[i]) / m) * 100;
  });
}

export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const tr = trueRange(highs, lows, closes);
  return wilderSmooth(tr, period);
}

export function supertrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
  multiplier: number
): number[] {
  const atrVals = atr(highs, lows, closes, period);
  const len = closes.length;
  const st: number[] = new Array(len).fill(NaN);
  const upperBand: number[] = new Array(len).fill(0);
  const lowerBand: number[] = new Array(len).fill(0);
  const direction: number[] = new Array(len).fill(1);

  for (let i = 0; i < len; i++) {
    if (Number.isNaN(atrVals[i])) continue;
    const hl2 = (highs[i] + lows[i]) / 2;
    let ub = hl2 + multiplier * atrVals[i];
    let lb = hl2 - multiplier * atrVals[i];

    if (i > 0 && !Number.isNaN(upperBand[i - 1])) {
      ub = ub < upperBand[i - 1] || closes[i - 1] > upperBand[i - 1] ? ub : upperBand[i - 1];
      lb = lb > lowerBand[i - 1] || closes[i - 1] < lowerBand[i - 1] ? lb : lowerBand[i - 1];
    }

    upperBand[i] = ub;
    lowerBand[i] = lb;

    if (i === 0 || Number.isNaN(st[i - 1])) {
      direction[i] = closes[i] > ub ? 1 : -1;
    } else if (direction[i - 1] === 1) {
      direction[i] = closes[i] < lowerBand[i] ? -1 : 1;
    } else {
      direction[i] = closes[i] > upperBand[i] ? 1 : -1;
    }

    st[i] = direction[i] === 1 ? lowerBand[i] : upperBand[i];
  }
  return st;
}

export function keltnerUpper(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
  multiplier: number
): number[] {
  const mid = ema(closes, period);
  const atrVals = atr(highs, lows, closes, period);
  return mid.map((m, i) =>
    Number.isNaN(m) || Number.isNaN(atrVals[i]) ? NaN : m + multiplier * atrVals[i]
  );
}

export function keltnerLower(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
  multiplier: number
): number[] {
  const mid = ema(closes, period);
  const atrVals = atr(highs, lows, closes, period);
  return mid.map((m, i) =>
    Number.isNaN(m) || Number.isNaN(atrVals[i]) ? NaN : m - multiplier * atrVals[i]
  );
}

export function bollingerPctB(
  closes: number[], period: number, mult: number
): number[] {
  const upper = bollingerUpper(closes, period, mult);
  const lower = bollingerLower(closes, period, mult);
  return closes.map((c, i) => {
    if (Number.isNaN(upper[i]) || Number.isNaN(lower[i])) return NaN;
    const range = upper[i] - lower[i];
    return range === 0 ? 0.5 : (c - lower[i]) / range;
  });
}

export function atrPercent(
  highs: number[], lows: number[], closes: number[], period: number
): number[] {
  const atrVals = atr(highs, lows, closes, period);
  return atrVals.map((a, i) =>
    Number.isNaN(a) || closes[i] === 0 ? NaN : (a / closes[i]) * 100
  );
}

export function donchianUpper(highs: number[], period: number): number[] {
  return rollingMax(highs, period);
}

export function donchianLower(lows: number[], period: number): number[] {
  return rollingMin(lows, period);
}

export function historicalVolatility(closes: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(NaN); continue; }
    const returns: number[] = [];
    for (let j = i - period + 1; j <= i; j++) {
      returns.push(Math.log(closes[j] / closes[j - 1]));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    out.push(Math.sqrt(variance * 252) * 100);
  }
  return out;
}
