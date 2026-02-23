/**
 * Divergence detection: RSI, MACD, Stochastic, OBV, CCI.
 * Returns 1 at bars where divergence is detected, 0 otherwise.
 */
import type { OhlcvRow } from "@/types/screener";
import { rsi, stochasticK, cci as computeCci } from "./oscillators";
import { macd as computeMacd } from "./macd";
import { obv as computeObv } from "./volume";

type DivType = "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish";

interface Pivot {
  index: number;
  value: number;
}

/**
 * Find swing lows/highs using pivot strength.
 * A swing low at i means values[i] is <= all values in [i-strength, i+strength].
 */
function findSwingLows(values: number[], strength: number): Pivot[] {
  const pivots: Pivot[] = [];
  for (let i = strength; i < values.length - strength; i++) {
    if (Number.isNaN(values[i])) continue;
    let isLow = true;
    for (let j = i - strength; j <= i + strength; j++) {
      if (j !== i && !Number.isNaN(values[j]) && values[j] < values[i]) {
        isLow = false;
        break;
      }
    }
    if (isLow) pivots.push({ index: i, value: values[i] });
  }
  return pivots;
}

function findSwingHighs(values: number[], strength: number): Pivot[] {
  const pivots: Pivot[] = [];
  for (let i = strength; i < values.length - strength; i++) {
    if (Number.isNaN(values[i])) continue;
    let isHigh = true;
    for (let j = i - strength; j <= i + strength; j++) {
      if (j !== i && !Number.isNaN(values[j]) && values[j] > values[i]) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) pivots.push({ index: i, value: values[i] });
  }
  return pivots;
}

/**
 * Generic divergence detector.
 * Compares price pivots with oscillator pivots in a lookback window.
 */
function detectDivergence(
  closes: number[],
  oscillator: number[],
  divType: DivType,
  lookback: number,
  pivotStrength: number
): number[] {
  const len = closes.length;
  const result = new Array(len).fill(0);

  const priceLows = findSwingLows(closes, pivotStrength);
  const priceHighs = findSwingHighs(closes, pivotStrength);
  const oscLows = findSwingLows(oscillator, pivotStrength);
  const oscHighs = findSwingHighs(oscillator, pivotStrength);

  for (let i = lookback; i < len; i++) {
    const windowStart = i - lookback;

    if (divType === "bullish") {
      // Price makes lower low, oscillator makes higher low
      const recentPriceLows = priceLows.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      const recentOscLows = oscLows.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      if (recentPriceLows.length >= 2 && recentOscLows.length >= 2) {
        const pl = recentPriceLows;
        const ol = recentOscLows;
        const lastPL = pl[pl.length - 1];
        const prevPL = pl[pl.length - 2];
        const lastOL = ol[ol.length - 1];
        const prevOL = ol[ol.length - 2];
        if (lastPL.value < prevPL.value && lastOL.value > prevOL.value) {
          result[i] = 1;
        }
      }
    } else if (divType === "bearish") {
      // Price makes higher high, oscillator makes lower high
      const recentPriceHighs = priceHighs.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      const recentOscHighs = oscHighs.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      if (recentPriceHighs.length >= 2 && recentOscHighs.length >= 2) {
        const ph = recentPriceHighs;
        const oh = recentOscHighs;
        const lastPH = ph[ph.length - 1];
        const prevPH = ph[ph.length - 2];
        const lastOH = oh[oh.length - 1];
        const prevOH = oh[oh.length - 2];
        if (lastPH.value > prevPH.value && lastOH.value < prevOH.value) {
          result[i] = 1;
        }
      }
    } else if (divType === "hidden_bullish") {
      // Price makes higher low, oscillator makes lower low
      const recentPriceLows = priceLows.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      const recentOscLows = oscLows.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      if (recentPriceLows.length >= 2 && recentOscLows.length >= 2) {
        const pl = recentPriceLows;
        const ol = recentOscLows;
        const lastPL = pl[pl.length - 1];
        const prevPL = pl[pl.length - 2];
        const lastOL = ol[ol.length - 1];
        const prevOL = ol[ol.length - 2];
        if (lastPL.value > prevPL.value && lastOL.value < prevOL.value) {
          result[i] = 1;
        }
      }
    } else if (divType === "hidden_bearish") {
      // Price makes lower high, oscillator makes higher high
      const recentPriceHighs = priceHighs.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      const recentOscHighs = oscHighs.filter(
        (p) => p.index >= windowStart && p.index <= i
      );
      if (recentPriceHighs.length >= 2 && recentOscHighs.length >= 2) {
        const ph = recentPriceHighs;
        const oh = recentOscHighs;
        const lastPH = ph[ph.length - 1];
        const prevPH = ph[ph.length - 2];
        const lastOH = oh[oh.length - 1];
        const prevOH = oh[oh.length - 2];
        if (lastPH.value < prevPH.value && lastOH.value > prevOH.value) {
          result[i] = 1;
        }
      }
    }
  }

  return result;
}

export function rsiDivergence(
  data: OhlcvRow[],
  divType: DivType,
  rsiPeriod: number,
  lookback: number,
  pivotStrength: number
): number[] {
  const closes = data.map((d) => d.close);
  const rsiVals = rsi(closes, rsiPeriod);
  return detectDivergence(closes, rsiVals, divType, lookback, pivotStrength);
}

export function macdDivergence(
  data: OhlcvRow[],
  divType: DivType,
  fast: number,
  slow: number,
  signal: number,
  lookback: number,
  pivotStrength: number
): number[] {
  const closes = data.map((d) => d.close);
  const { histogram } = computeMacd(closes, fast, slow, signal);
  return detectDivergence(closes, histogram, divType, lookback, pivotStrength);
}

export function stochDivergence(
  data: OhlcvRow[],
  divType: DivType,
  kPeriod: number,
  dPeriod: number,
  smooth: number,
  lookback: number,
  pivotStrength: number
): number[] {
  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const k = stochasticK(highs, lows, closes, kPeriod, smooth);
  void dPeriod; // %K is used for divergence detection
  return detectDivergence(closes, k, divType, lookback, pivotStrength);
}

export function obvDivergence(
  data: OhlcvRow[],
  divType: DivType,
  lookback: number,
  pivotStrength: number
): number[] {
  const closes = data.map((d) => d.close);
  const volumes = data.map((d) => d.volume);
  const obvVals = computeObv(closes, volumes);
  return detectDivergence(closes, obvVals, divType, lookback, pivotStrength);
}

export function cciDivergence(
  data: OhlcvRow[],
  divType: DivType,
  period: number,
  lookback: number,
  pivotStrength: number
): number[] {
  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const cciVals = computeCci(highs, lows, closes, period);
  return detectDivergence(closes, cciVals, divType, lookback, pivotStrength);
}
