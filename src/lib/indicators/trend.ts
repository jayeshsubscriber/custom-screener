/**
 * Trend indicators: ADX, +DI, -DI, Parabolic SAR, Ichimoku, Aroon.
 */
import { wilderSmooth, trueRange, rollingMax, rollingMin } from "./math";

export function adx(
  highs: number[], lows: number[], closes: number[], period: number
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const len = highs.length;
  const tr = trueRange(highs, lows, closes);

  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const smoothTR = wilderSmooth(tr, period);
  const smoothPlusDM = wilderSmooth(plusDM, period);
  const smoothMinusDM = wilderSmooth(minusDM, period);

  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];

  for (let i = 0; i < len; i++) {
    const sTR = smoothTR[i];
    const pdi = sTR > 0 && !Number.isNaN(smoothPlusDM[i]) ? (smoothPlusDM[i] / sTR) * 100 : NaN;
    const mdi = sTR > 0 && !Number.isNaN(smoothMinusDM[i]) ? (smoothMinusDM[i] / sTR) * 100 : NaN;
    plusDI.push(pdi);
    minusDI.push(mdi);
    const sum = pdi + mdi;
    dx.push(!Number.isNaN(pdi) && !Number.isNaN(mdi) && sum > 0
      ? (Math.abs(pdi - mdi) / sum) * 100
      : NaN);
  }

  const adxVals = wilderSmooth(dx.map((v) => (Number.isNaN(v) ? 0 : v)), period);
  const adxOut = dx.map((v, i) => (Number.isNaN(v) ? NaN : adxVals[i]));

  return { adx: adxOut, plusDI, minusDI };
}

export function parabolicSar(
  highs: number[], lows: number[], step: number, max: number
): number[] {
  const len = highs.length;
  if (len < 2) return new Array(len).fill(NaN);

  const sar: number[] = new Array(len).fill(NaN);
  let isLong = highs[1] > highs[0];
  let af = step;
  let ep = isLong ? highs[0] : lows[0];
  sar[0] = isLong ? lows[0] : highs[0];

  for (let i = 1; i < len; i++) {
    let currentSar = sar[i - 1] + af * (ep - sar[i - 1]);

    if (isLong) {
      currentSar = Math.min(currentSar, lows[i - 1], i > 1 ? lows[i - 2] : lows[i - 1]);
      if (lows[i] < currentSar) {
        isLong = false;
        currentSar = ep;
        ep = lows[i];
        af = step;
      } else {
        if (highs[i] > ep) {
          ep = highs[i];
          af = Math.min(af + step, max);
        }
      }
    } else {
      currentSar = Math.max(currentSar, highs[i - 1], i > 1 ? highs[i - 2] : highs[i - 1]);
      if (highs[i] > currentSar) {
        isLong = true;
        currentSar = ep;
        ep = highs[i];
        af = step;
      } else {
        if (lows[i] < ep) {
          ep = lows[i];
          af = Math.min(af + step, max);
        }
      }
    }
    sar[i] = currentSar;
  }
  return sar;
}

export function ichimokuTenkan(highs: number[], lows: number[], period: number): number[] {
  const hh = rollingMax(highs, period);
  const ll = rollingMin(lows, period);
  return hh.map((h, i) => (Number.isNaN(h) || Number.isNaN(ll[i]) ? NaN : (h + ll[i]) / 2));
}

export function ichimokuKijun(highs: number[], lows: number[], period: number): number[] {
  return ichimokuTenkan(highs, lows, period);
}

export function ichimokuSenkouA(
  highs: number[], lows: number[], tenkanP: number, kijunP: number
): number[] {
  const tenkan = ichimokuTenkan(highs, lows, tenkanP);
  const kijun = ichimokuTenkan(highs, lows, kijunP);
  return tenkan.map((t, i) =>
    Number.isNaN(t) || Number.isNaN(kijun[i]) ? NaN : (t + kijun[i]) / 2
  );
}

export function ichimokuSenkouB(highs: number[], lows: number[], period: number): number[] {
  return ichimokuTenkan(highs, lows, period);
}

export function aroonUp(highs: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i < period) { out.push(NaN); continue; }
    let maxIdx = i - period;
    for (let j = i - period + 1; j <= i; j++) {
      if (highs[j] >= highs[maxIdx]) maxIdx = j;
    }
    out.push(((period - (i - maxIdx)) / period) * 100);
  }
  return out;
}

export function aroonDown(lows: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < lows.length; i++) {
    if (i < period) { out.push(NaN); continue; }
    let minIdx = i - period;
    for (let j = i - period + 1; j <= i; j++) {
      if (lows[j] <= lows[minIdx]) minIdx = j;
    }
    out.push(((period - (i - minIdx)) / period) * 100);
  }
  return out;
}
