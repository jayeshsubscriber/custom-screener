/**
 * Oscillator indicators: RSI, Stochastic, StochRSI, Williams %R, CCI, ROC, MFI.
 */
import { sma, rollingMax, rollingMin } from "./math";

export function rsi(closes: number[], period: number): number[] {
  const out: number[] = [NaN];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i < period) {
        out.push(NaN);
      } else {
        avgGain /= period;
        avgLoss /= period;
        out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    }
  }
  return out;
}

export function stochasticK(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number,
  smooth: number
): number[] {
  const rawK: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      rawK.push(NaN);
      continue;
    }
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    rawK.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
  }
  return smooth > 1 ? sma(rawK.map((v) => (Number.isNaN(v) ? 0 : v)), smooth).map((v, i) => (Number.isNaN(rawK[i]) ? NaN : v)) : rawK;
}

export function stochasticD(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number,
  dPeriod: number,
  smooth: number
): number[] {
  const k = stochasticK(highs, lows, closes, kPeriod, smooth);
  const kValid = k.map((v) => (Number.isNaN(v) ? 0 : v));
  const d = sma(kValid, dPeriod);
  return k.map((v, i) => (Number.isNaN(v) ? NaN : d[i]));
}

export function stochRsiK(
  closes: number[],
  rsiPeriod: number,
  stochPeriod: number,
  kSmooth: number
): number[] {
  const rsiVals = rsi(closes, rsiPeriod);
  const rsiValid = rsiVals.map((v) => (Number.isNaN(v) ? 0 : v));
  const hh = rollingMax(rsiValid, stochPeriod);
  const ll = rollingMin(rsiValid, stochPeriod);

  const rawK = rsiVals.map((r, i) => {
    if (Number.isNaN(r) || Number.isNaN(hh[i]) || Number.isNaN(ll[i])) return NaN;
    const range = hh[i] - ll[i];
    return range === 0 ? 50 : ((r - ll[i]) / range) * 100;
  });

  if (kSmooth <= 1) return rawK;
  const smoothed = sma(rawK.map((v) => (Number.isNaN(v) ? 0 : v)), kSmooth);
  return rawK.map((v, i) => (Number.isNaN(v) ? NaN : smoothed[i]));
}

export function stochRsiD(
  closes: number[],
  rsiPeriod: number,
  stochPeriod: number,
  kSmooth: number,
  dSmooth: number
): number[] {
  const k = stochRsiK(closes, rsiPeriod, stochPeriod, kSmooth);
  const kValid = k.map((v) => (Number.isNaN(v) ? 0 : v));
  const d = sma(kValid, dSmooth);
  return k.map((v, i) => (Number.isNaN(v) ? NaN : d[i]));
}

export function williamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    out.push(hh === ll ? -50 : ((hh - closes[i]) / (hh - ll)) * -100);
  }
  return out;
}

export function cci(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const tpSma = sma(tp, period);
  const out: number[] = [];
  for (let i = 0; i < tp.length; i++) {
    if (Number.isNaN(tpSma[i])) {
      out.push(NaN);
      continue;
    }
    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) {
      meanDev += Math.abs(tp[j] - tpSma[i]);
    }
    meanDev /= period;
    out.push(meanDev === 0 ? 0 : (tp[i] - tpSma[i]) / (0.015 * meanDev));
  }
  return out;
}

export function roc(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      out.push(NaN);
      continue;
    }
    const prev = values[i - period];
    out.push(prev === 0 ? 0 : ((values[i] - prev) / prev) * 100);
  }
  return out;
}

export function mfi(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period: number
): number[] {
  const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const rawMF = tp.map((t, i) => t * volumes[i]);

  const out: number[] = [NaN];
  for (let i = 1; i < tp.length; i++) {
    if (i < period) {
      out.push(NaN);
      continue;
    }
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) posFlow += rawMF[j];
      else if (tp[j] < tp[j - 1]) negFlow += rawMF[j];
    }
    out.push(negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow));
  }
  return out;
}
