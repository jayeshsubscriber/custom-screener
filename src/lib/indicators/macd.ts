/**
 * MACD indicator: line, signal, histogram.
 */
import { ema } from "./math";

export interface MacdResult {
  line: number[];
  signal: number[];
  histogram: number[];
}

export function macd(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MacdResult {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const line = fastEma.map((f, i) =>
    Number.isNaN(f) || Number.isNaN(slowEma[i]) ? NaN : f - slowEma[i]
  );

  const validStart = line.findIndex((v) => !Number.isNaN(v));
  if (validStart === -1) {
    return {
      line,
      signal: line.map(() => NaN),
      histogram: line.map(() => NaN),
    };
  }

  const lineForSignal = line.slice(validStart).map((v) => (Number.isNaN(v) ? 0 : v));
  const signalRaw = ema(lineForSignal, signalPeriod);

  const signal: number[] = new Array(validStart).fill(NaN);
  const histogram: number[] = new Array(validStart).fill(NaN);

  for (let i = 0; i < signalRaw.length; i++) {
    const lineVal = line[validStart + i];
    const sigVal = signalRaw[i];
    if (Number.isNaN(lineVal) || Number.isNaN(sigVal)) {
      signal.push(NaN);
      histogram.push(NaN);
    } else {
      signal.push(sigVal);
      histogram.push(lineVal - sigVal);
    }
  }

  return { line, signal, histogram };
}
