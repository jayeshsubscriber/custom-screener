/**
 * Core math primitives for technical indicator computation.
 * All functions take number[] and return number[], with NaN for insufficient data.
 */

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period && i < values.length; i++) {
    sum += values[i];
    out.push(NaN);
  }
  if (values.length < period) return out;
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function wma(values: number[], period: number): number[] {
  const out: number[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j] * (j + 1);
    }
    out.push(sum / denom);
  }
  return out;
}

export function dema(values: number[], period: number): number[] {
  const e1 = ema(values, period);
  const e1Valid = e1.map((v) => (Number.isNaN(v) ? 0 : v));
  const e2 = ema(e1Valid, period);
  return e1.map((v, i) => {
    if (Number.isNaN(v) || Number.isNaN(e2[i])) return NaN;
    return 2 * v - e2[i];
  });
}

export function tema(values: number[], period: number): number[] {
  const e1 = ema(values, period);
  const e1Valid = e1.map((v) => (Number.isNaN(v) ? 0 : v));
  const e2 = ema(e1Valid, period);
  const e2Valid = e2.map((v) => (Number.isNaN(v) ? 0 : v));
  const e3 = ema(e2Valid, period);
  return e1.map((v, i) => {
    if (Number.isNaN(v) || Number.isNaN(e2[i]) || Number.isNaN(e3[i])) return NaN;
    return 3 * v - 3 * e2[i] + e3[i];
  });
}

export function hullMa(values: number[], period: number): number[] {
  const half = Math.max(1, Math.floor(period / 2));
  const sqrtP = Math.max(1, Math.round(Math.sqrt(period)));
  const wmaFull = wma(values, period);
  const wmaHalf = wma(values, half);
  const diff = wmaHalf.map((v, i) => {
    if (Number.isNaN(v) || Number.isNaN(wmaFull[i])) return NaN;
    return 2 * v - wmaFull[i];
  });
  const validDiff = diff.map((v) => (Number.isNaN(v) ? 0 : v));
  const hull = wma(validDiff, sqrtP);
  return diff.map((v, i) => (Number.isNaN(v) ? NaN : hull[i]));
}

export function vwma(
  closes: number[],
  volumes: number[],
  period: number
): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let sumPV = 0;
    let sumV = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumPV += closes[j] * volumes[j];
      sumV += volumes[j];
    }
    out.push(sumV > 0 ? sumPV / sumV : NaN);
  }
  return out;
}

export function stdDev(values: number[], period: number): number[] {
  const means = sma(values, period);
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (Number.isNaN(means[i])) {
      out.push(NaN);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = values[j] - means[i];
      sumSq += d * d;
    }
    out.push(Math.sqrt(sumSq / period));
  }
  return out;
}

export function trueRange(
  highs: number[],
  lows: number[],
  closes: number[]
): number[] {
  const out: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    out.push(Math.max(hl, hc, lc));
  }
  return out;
}

/** Wilder's smoothed moving average (used by ATR, ADX) */
export function wilderSmooth(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      sum += values[i];
      out.push(i === period - 1 ? sum / period : NaN);
    } else {
      const prev = out[i - 1];
      out.push((prev * (period - 1) + values[i]) / period);
    }
  }
  return out;
}

/** Rolling max over a window */
export function rollingMax(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let mx = -Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] > mx) mx = values[j];
    }
    out.push(mx);
  }
  return out;
}

/** Rolling min over a window */
export function rollingMin(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let mn = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] < mn) mn = values[j];
    }
    out.push(mn);
  }
  return out;
}
