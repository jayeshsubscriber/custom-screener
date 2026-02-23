/**
 * Indicator engine entry point.
 * Maps indicator IDs from the UI catalog to actual computation functions.
 */
import type { OhlcvRow } from "@/types/screener";
import { sma, ema, wma, dema, tema, hullMa, vwma as vwmaFn } from "./math";
import { rsi, stochasticK, stochasticD, stochRsiK, stochRsiD, williamsR, cci, roc, mfi } from "./oscillators";
import { macd } from "./macd";
import { bollingerUpper, bollingerMiddle, bollingerLower, bollingerBandwidth, atr, supertrend, keltnerUpper, keltnerLower, bollingerPctB, atrPercent, donchianUpper, donchianLower, historicalVolatility } from "./volatility";
import { obv, vwap, volumeSma, relativeVolume, volumeEma, chaikinMoneyFlow, accumulationDistribution, volumeRoc } from "./volume";
import { CANDLESTICK_FNS } from "./candlestick";
import { rsiDivergence, macdDivergence, stochDivergence, obvDivergence, cciDivergence } from "./divergence";
import { computePivot } from "./pivots";
import { adx, parabolicSar, ichimokuTenkan, ichimokuKijun, ichimokuSenkouA, ichimokuSenkouB, aroonUp, aroonDown } from "./trend";
import { emaCrossBullish, emaCrossBearish, smaCrossBullish, smaCrossBearish, macdCrossBullish, macdCrossBearish, supertrendFlipBullish, supertrendFlipBearish } from "./setups";

type P = Record<string, number | string>;
function n(params: P, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : typeof v === "string" ? Number(v) || fallback : fallback;
}
function s(params: P, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === "string" ? v : String(v ?? fallback);
}

const TRADING_DAYS_52W = 252;

/**
 * Compute an indicator's values for a full OHLCV array.
 * Returns number[] aligned 1:1 with the input array.
 * For pattern indicators, 1 = detected, 0 = not.
 */
export function computeIndicator(
  indicatorId: string,
  params: P,
  data: OhlcvRow[]
): number[] {
  const closes = data.map((d) => d.close);
  const opens = data.map((d) => d.open);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const volumes = data.map((d) => d.volume);

  switch (indicatorId) {
    // ─── Price ────────────────────────────────────────
    case "close":
      return closes;
    case "open":
      return opens;
    case "high":
      return highs;
    case "low":
      return lows;
    case "prev_close":
      return [NaN, ...closes.slice(0, -1)];
    case "high_52w": {
      // Max of previous highs (up to 252 bars back, excluding current bar)
      const out: number[] = [NaN];
      for (let i = 1; i < data.length; i++) {
        const start = Math.max(0, i - TRADING_DAYS_52W);
        let mx = -Infinity;
        for (let j = start; j < i; j++) if (highs[j] > mx) mx = highs[j];
        out.push(mx);
      }
      return out;
    }
    case "low_52w": {
      const out: number[] = [NaN];
      for (let i = 1; i < data.length; i++) {
        const start = Math.max(0, i - TRADING_DAYS_52W);
        let mn = Infinity;
        for (let j = start; j < i; j++) if (lows[j] < mn) mn = lows[j];
        out.push(mn);
      }
      return out;
    }
    case "change_1d_pct":
      return closes.map((c, i) =>
        i === 0 || closes[i - 1] === 0 ? NaN : ((c - closes[i - 1]) / closes[i - 1]) * 100
      );
    case "change_1w_pct":
      return closes.map((c, i) =>
        i < 5 || closes[i - 5] === 0 ? NaN : ((c - closes[i - 5]) / closes[i - 5]) * 100
      );
    case "change_1m_pct":
      return closes.map((c, i) =>
        i < 22 || closes[i - 22] === 0 ? NaN : ((c - closes[i - 22]) / closes[i - 22]) * 100
      );
    case "pct_from_sma": {
      const period = n(params, "period", 200);
      const smaVals = sma(closes, period);
      return closes.map((c, i) =>
        Number.isNaN(smaVals[i]) || smaVals[i] === 0
          ? NaN
          : ((c - smaVals[i]) / smaVals[i]) * 100
      );
    }
    case "pct_from_ema": {
      const period = n(params, "period", 200);
      const emaVals = ema(closes, period);
      return closes.map((c, i) =>
        Number.isNaN(emaVals[i]) || emaVals[i] === 0
          ? NaN
          : ((c - emaVals[i]) / emaVals[i]) * 100
      );
    }
    case "pct_from_52w_high": {
      const h52 = computeIndicator("high_52w", {}, data);
      return closes.map((c, i) =>
        Number.isNaN(h52[i]) || h52[i] === 0 ? NaN : ((c - h52[i]) / h52[i]) * 100
      );
    }
    case "pct_from_52w_low": {
      const l52 = computeIndicator("low_52w", {}, data);
      return closes.map((c, i) =>
        Number.isNaN(l52[i]) || l52[i] === 0 ? NaN : ((c - l52[i]) / l52[i]) * 100
      );
    }

    // ─── Moving Averages ─────────────────────────────
    case "sma":
      return sma(closes, n(params, "period", 20));
    case "ema":
      return ema(closes, n(params, "period", 20));
    case "wma":
      return wma(closes, n(params, "period", 20));
    case "hull_ma":
      return hullMa(closes, n(params, "period", 20));
    case "vwma":
      return vwmaFn(closes, volumes, n(params, "period", 20));
    case "dema":
      return dema(closes, n(params, "period", 20));
    case "tema":
      return tema(closes, n(params, "period", 20));

    // ─── Oscillators ─────────────────────────────────
    case "rsi":
      return rsi(closes, n(params, "period", 14));
    case "stoch_k":
      return stochasticK(highs, lows, closes, n(params, "k_period", 14), n(params, "smooth", 3));
    case "stoch_d":
      return stochasticD(highs, lows, closes, n(params, "k_period", 14), n(params, "d_period", 3), n(params, "smooth", 3));
    case "stoch_rsi_k":
      return stochRsiK(closes, n(params, "rsi_period", 14), n(params, "stoch_period", 14), n(params, "k_smooth", 3));
    case "stoch_rsi_d":
      return stochRsiD(closes, n(params, "rsi_period", 14), n(params, "stoch_period", 14), n(params, "k_smooth", 3), n(params, "d_smooth", 3));
    case "williams_r":
      return williamsR(highs, lows, closes, n(params, "period", 14));
    case "cci":
      return cci(highs, lows, closes, n(params, "period", 20));
    case "roc":
      return roc(closes, n(params, "period", 12));
    case "mfi":
      return mfi(highs, lows, closes, volumes, n(params, "period", 14));

    // ─── MACD ────────────────────────────────────────
    case "macd_line":
      return macd(closes, n(params, "fast", 12), n(params, "slow", 26), n(params, "signal", 9)).line;
    case "macd_signal":
      return macd(closes, n(params, "fast", 12), n(params, "slow", 26), n(params, "signal", 9)).signal;
    case "macd_histogram":
      return macd(closes, n(params, "fast", 12), n(params, "slow", 26), n(params, "signal", 9)).histogram;

    // ─── Volatility ──────────────────────────────────
    case "bb_upper":
      return bollingerUpper(closes, n(params, "period", 20), n(params, "stddev", 2));
    case "bb_middle":
      return bollingerMiddle(closes, n(params, "period", 20));
    case "bb_lower":
      return bollingerLower(closes, n(params, "period", 20), n(params, "stddev", 2));
    case "bb_bandwidth":
      return bollingerBandwidth(closes, n(params, "period", 20), n(params, "stddev", 2));
    case "atr":
      return atr(highs, lows, closes, n(params, "period", 14));
    case "supertrend":
      return supertrend(highs, lows, closes, n(params, "period", 10), n(params, "multiplier", 3));
    case "keltner_upper":
      return keltnerUpper(highs, lows, closes, n(params, "period", 20), n(params, "multiplier", 2));
    case "keltner_lower":
      return keltnerLower(highs, lows, closes, n(params, "period", 20), n(params, "multiplier", 2));

    // ─── Volume ──────────────────────────────────────
    case "volume":
      return volumes;
    case "volume_sma":
      return volumeSma(volumes, n(params, "period", 20));
    case "obv":
      return obv(closes, volumes);
    case "vwap":
      return vwap(highs, lows, closes, volumes);
    case "delivery_pct":
      return data.map(() => NaN); // not available from Upstox candle API
    case "relative_volume":
      return relativeVolume(volumes, n(params, "period", 20));

    // ─── Candlestick Patterns ────────────────────────
    case "doji":
    case "hammer":
    case "inverted_hammer":
    case "spinning_top":
    case "marubozu":
    case "hanging_man":
    case "shooting_star":
    case "bullish_engulfing":
    case "bearish_engulfing":
    case "piercing_line":
    case "dark_cloud_cover":
    case "bullish_harami":
    case "bearish_harami":
    case "tweezer_top":
    case "tweezer_bottom":
    case "morning_star":
    case "evening_star":
    case "three_white_soldiers":
    case "three_black_crows":
    case "three_inside_up":
    case "three_inside_down": {
      const fn = CANDLESTICK_FNS[indicatorId];
      return fn ? fn(data) : data.map(() => 0);
    }

    // ─── Divergence Patterns ─────────────────────────
    case "rsi_divergence":
      return rsiDivergence(
        data,
        s(params, "div_type", "bullish") as "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish",
        n(params, "rsi_period", 14),
        n(params, "lookback", 20),
        n(params, "pivot_strength", 5)
      );
    case "macd_divergence":
      return macdDivergence(
        data,
        s(params, "div_type", "bullish") as "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish",
        n(params, "fast", 12),
        n(params, "slow", 26),
        n(params, "signal", 9),
        n(params, "lookback", 20),
        n(params, "pivot_strength", 5)
      );
    case "stoch_divergence":
      return stochDivergence(
        data,
        s(params, "div_type", "bullish") as "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish",
        n(params, "k_period", 14),
        n(params, "d_period", 3),
        n(params, "smooth", 3),
        n(params, "lookback", 20),
        n(params, "pivot_strength", 5)
      );
    case "obv_divergence":
      return obvDivergence(
        data,
        s(params, "div_type", "bullish") as "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish",
        n(params, "lookback", 20),
        n(params, "pivot_strength", 5)
      );
    case "cci_divergence":
      return cciDivergence(
        data,
        s(params, "div_type", "bullish") as "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish",
        n(params, "period", 20),
        n(params, "lookback", 20),
        n(params, "pivot_strength", 5)
      );

    // ─── Trend ────────────────────────────────────────
    case "adx":
      return adx(highs, lows, closes, n(params, "period", 14)).adx;
    case "plus_di":
      return adx(highs, lows, closes, n(params, "period", 14)).plusDI;
    case "minus_di":
      return adx(highs, lows, closes, n(params, "period", 14)).minusDI;
    case "parabolic_sar":
      return parabolicSar(highs, lows, n(params, "step", 0.02), n(params, "max", 0.2));
    case "ichimoku_tenkan":
      return ichimokuTenkan(highs, lows, n(params, "tenkan", 9));
    case "ichimoku_kijun":
      return ichimokuKijun(highs, lows, n(params, "kijun", 26));
    case "ichimoku_senkou_a":
      return ichimokuSenkouA(highs, lows, n(params, "tenkan", 9), n(params, "kijun", 26));
    case "ichimoku_senkou_b":
      return ichimokuSenkouB(highs, lows, n(params, "senkou_b", 52));
    case "aroon_up":
      return aroonUp(highs, n(params, "period", 25));
    case "aroon_down":
      return aroonDown(lows, n(params, "period", 25));

    // ─── Extra Volatility ────────────────────────────
    case "bb_pct_b":
      return bollingerPctB(closes, n(params, "period", 20), n(params, "stddev", 2));
    case "atr_pct":
      return atrPercent(highs, lows, closes, n(params, "period", 14));
    case "donchian_upper":
      return donchianUpper(highs, n(params, "period", 20));
    case "donchian_lower":
      return donchianLower(lows, n(params, "period", 20));
    case "hist_volatility":
      return historicalVolatility(closes, n(params, "period", 20));

    // ─── Extra Volume ────────────────────────────────
    case "volume_ema":
      return volumeEma(volumes, n(params, "period", 20));
    case "cmf":
      return chaikinMoneyFlow(highs, lows, closes, volumes, n(params, "period", 20));
    case "ad_line":
      return accumulationDistribution(highs, lows, closes, volumes);
    case "volume_roc":
      return volumeRoc(volumes, n(params, "period", 14));

    // ─── Pivot Levels ────────────────────────────────
    case "pivot_pp":
      return computePivot(data, "pp");
    case "pivot_r1":
      return computePivot(data, "r1");
    case "pivot_r2":
      return computePivot(data, "r2");
    case "pivot_r3":
      return computePivot(data, "r3");
    case "pivot_s1":
      return computePivot(data, "s1");
    case "pivot_s2":
      return computePivot(data, "s2");
    case "pivot_s3":
      return computePivot(data, "s3");
    case "camarilla_r1":
      return computePivot(data, "cam_r1");
    case "camarilla_r2":
      return computePivot(data, "cam_r2");
    case "camarilla_r3":
      return computePivot(data, "cam_r3");
    case "camarilla_r4":
      return computePivot(data, "cam_r4");
    case "camarilla_s1":
      return computePivot(data, "cam_s1");
    case "camarilla_s2":
      return computePivot(data, "cam_s2");
    case "camarilla_s3":
      return computePivot(data, "cam_s3");
    case "camarilla_s4":
      return computePivot(data, "cam_s4");
    case "cpr_upper":
      return computePivot(data, "cpr_upper");
    case "cpr_lower":
      return computePivot(data, "cpr_lower");
    case "cpr_width_pct":
      return computePivot(data, "cpr_width_pct");

    // ─── Setups ──────────────────────────────────────
    case "ema_cross_bullish":
      return emaCrossBullish(closes, n(params, "fast", 9), n(params, "slow", 21));
    case "ema_cross_bearish":
      return emaCrossBearish(closes, n(params, "fast", 9), n(params, "slow", 21));
    case "sma_cross_bullish":
      return smaCrossBullish(closes, n(params, "fast", 50), n(params, "slow", 200));
    case "sma_cross_bearish":
      return smaCrossBearish(closes, n(params, "fast", 50), n(params, "slow", 200));
    case "macd_cross_bullish":
      return macdCrossBullish(closes, n(params, "fast", 12), n(params, "slow", 26), n(params, "signal", 9));
    case "macd_cross_bearish":
      return macdCrossBearish(closes, n(params, "fast", 12), n(params, "slow", 26), n(params, "signal", 9));
    case "supertrend_flip_bullish":
      return supertrendFlipBullish(highs, lows, closes, n(params, "period", 10), n(params, "multiplier", 3));
    case "supertrend_flip_bearish":
      return supertrendFlipBearish(highs, lows, closes, n(params, "period", 10), n(params, "multiplier", 3));

    default:
      console.warn(`Unknown indicator: ${indicatorId}`);
      return data.map(() => NaN);
  }
}
