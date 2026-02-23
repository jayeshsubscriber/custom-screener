/**
 * Volume indicators: OBV, VWAP, Volume SMA, Relative Volume.
 */
import { sma, ema } from "./math";

export function obv(closes: number[], volumes: number[]): number[] {
  const out: number[] = [volumes[0] || 0];
  for (let i = 1; i < closes.length; i++) {
    const prev = out[i - 1];
    if (closes[i] > closes[i - 1]) out.push(prev + volumes[i]);
    else if (closes[i] < closes[i - 1]) out.push(prev - volumes[i]);
    else out.push(prev);
  }
  return out;
}

/**
 * VWAP: cumulative (resets each day for intraday, or running for daily).
 * For daily data this is a running cumulative VWAP.
 * For intraday: the caller should provide only one day's bars for a proper reset.
 * Here we compute a simple running VWAP over all bars.
 */
export function vwap(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number[] {
  const out: number[] = [];
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumPV += tp * volumes[i];
    cumV += volumes[i];
    out.push(cumV > 0 ? cumPV / cumV : NaN);
  }
  return out;
}

export function volumeSma(volumes: number[], period: number): number[] {
  return sma(volumes, period);
}

export function relativeVolume(volumes: number[], period: number): number[] {
  const avg = sma(volumes, period);
  return volumes.map((v, i) => {
    if (Number.isNaN(avg[i]) || avg[i] === 0) return NaN;
    return v / avg[i];
  });
}

export function volumeEma(volumes: number[], period: number): number[] {
  return ema(volumes, period);
}

export function chaikinMoneyFlow(
  highs: number[], lows: number[], closes: number[], volumes: number[], period: number
): number[] {
  const mfv: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const clv = hl === 0 ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / hl;
    mfv.push(clv * volumes[i]);
  }
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { out.push(NaN); continue; }
    let sumMFV = 0, sumVol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumMFV += mfv[j];
      sumVol += volumes[j];
    }
    out.push(sumVol === 0 ? 0 : sumMFV / sumVol);
  }
  return out;
}

export function accumulationDistribution(
  highs: number[], lows: number[], closes: number[], volumes: number[]
): number[] {
  const out: number[] = [];
  let cum = 0;
  for (let i = 0; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const clv = hl === 0 ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / hl;
    cum += clv * volumes[i];
    out.push(cum);
  }
  return out;
}

export function volumeRoc(volumes: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < period) { out.push(NaN); continue; }
    const prev = volumes[i - period];
    out.push(prev === 0 ? 0 : ((volumes[i] - prev) / prev) * 100);
  }
  return out;
}
