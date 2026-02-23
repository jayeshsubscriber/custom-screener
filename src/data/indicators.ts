export type IndicatorCategory =
  | "price"
  | "moving_averages"
  | "oscillators"
  | "macd"
  | "trend"
  | "volatility"
  | "volume"
  | "pivot"
  | "setups"
  | "divergence"
  | "candlestick";

export type OutputType = "numeric" | "pattern";

export interface NumberParam {
  key: string;
  label: string;
  type: "number";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectParam {
  key: string;
  label: string;
  type: "select";
  defaultValue: string;
  options: { value: string; label: string }[];
}

export type IndicatorParam = NumberParam | SelectParam;

export interface IndicatorDef {
  id: string;
  name: string;
  category: IndicatorCategory;
  params: IndicatorParam[];
  outputType: OutputType;
}

export const CATEGORIES: { key: IndicatorCategory; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "moving_averages", label: "Moving Averages" },
  { key: "oscillators", label: "Oscillators" },
  { key: "macd", label: "MACD" },
  { key: "trend", label: "Trend" },
  { key: "volatility", label: "Volatility" },
  { key: "volume", label: "Volume" },
  { key: "pivot", label: "Pivot Levels" },
  { key: "setups", label: "Setups" },
  { key: "divergence", label: "Divergence Patterns" },
  { key: "candlestick", label: "Candlestick Patterns" },
];

// ─── Indicator Catalog ──────────────────────────────────────────────────────

export const INDICATORS: IndicatorDef[] = [
  // Price
  { id: "close", name: "Close", category: "price", params: [], outputType: "numeric" },
  { id: "open", name: "Open", category: "price", params: [], outputType: "numeric" },
  { id: "high", name: "High", category: "price", params: [], outputType: "numeric" },
  { id: "low", name: "Low", category: "price", params: [], outputType: "numeric" },
  { id: "prev_close", name: "Previous Close", category: "price", params: [], outputType: "numeric" },
  { id: "high_52w", name: "52-Week High", category: "price", params: [], outputType: "numeric" },
  { id: "low_52w", name: "52-Week Low", category: "price", params: [], outputType: "numeric" },
  { id: "change_1d_pct", name: "1D Change %", category: "price", params: [], outputType: "numeric" },
  { id: "change_1w_pct", name: "1W Change %", category: "price", params: [], outputType: "numeric" },
  { id: "change_1m_pct", name: "1M Change %", category: "price", params: [], outputType: "numeric" },
  { id: "pct_from_sma", name: "% from SMA", category: "price", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 200, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "pct_from_ema", name: "% from EMA", category: "price", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 200, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "pct_from_52w_high", name: "% from 52W High", category: "price", params: [], outputType: "numeric" },
  { id: "pct_from_52w_low", name: "% from 52W Low", category: "price", params: [], outputType: "numeric" },

  // Moving Averages
  { id: "sma", name: "SMA", category: "moving_averages", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "ema", name: "EMA", category: "moving_averages", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "wma", name: "WMA", category: "moving_averages", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "hull_ma", name: "Hull MA", category: "moving_averages", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "vwma", name: "VWMA", category: "moving_averages", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "dema", name: "DEMA", category: "moving_averages", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 500 },
  ], outputType: "numeric" },
  { id: "tema", name: "TEMA", category: "moving_averages", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 500 },
  ], outputType: "numeric" },

  // Oscillators
  { id: "rsi", name: "RSI", category: "oscillators", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "stoch_k", name: "Stochastic %K", category: "oscillators", params: [
    { key: "k_period", label: "K", type: "number", defaultValue: 14, min: 1, max: 100 },
    { key: "d_period", label: "D", type: "number", defaultValue: 3, min: 1, max: 100 },
    { key: "smooth", label: "Smooth", type: "number", defaultValue: 3, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "stoch_d", name: "Stochastic %D", category: "oscillators", params: [
    { key: "k_period", label: "K", type: "number", defaultValue: 14, min: 1, max: 100 },
    { key: "d_period", label: "D", type: "number", defaultValue: 3, min: 1, max: 100 },
    { key: "smooth", label: "Smooth", type: "number", defaultValue: 3, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "stoch_rsi_k", name: "StochRSI %K", category: "oscillators", params: [
    { key: "rsi_period", label: "RSI", type: "number", defaultValue: 14, min: 1, max: 100 },
    { key: "stoch_period", label: "Stoch", type: "number", defaultValue: 14, min: 1, max: 100 },
    { key: "k_smooth", label: "K", type: "number", defaultValue: 3, min: 1, max: 50 },
    { key: "d_smooth", label: "D", type: "number", defaultValue: 3, min: 1, max: 50 },
  ], outputType: "numeric" },
  { id: "stoch_rsi_d", name: "StochRSI %D", category: "oscillators", params: [
    { key: "rsi_period", label: "RSI", type: "number", defaultValue: 14, min: 1, max: 100 },
    { key: "stoch_period", label: "Stoch", type: "number", defaultValue: 14, min: 1, max: 100 },
    { key: "k_smooth", label: "K", type: "number", defaultValue: 3, min: 1, max: 50 },
    { key: "d_smooth", label: "D", type: "number", defaultValue: 3, min: 1, max: 50 },
  ], outputType: "numeric" },
  { id: "williams_r", name: "Williams %R", category: "oscillators", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "cci", name: "CCI", category: "oscillators", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "roc", name: "ROC", category: "oscillators", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 12, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "mfi", name: "MFI", category: "oscillators", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },

  // MACD
  { id: "macd_line", name: "MACD Line", category: "macd", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 12, min: 1, max: 100 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 26, min: 1, max: 100 },
    { key: "signal", label: "Signal", type: "number", defaultValue: 9, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "macd_signal", name: "MACD Signal", category: "macd", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 12, min: 1, max: 100 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 26, min: 1, max: 100 },
    { key: "signal", label: "Signal", type: "number", defaultValue: 9, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "macd_histogram", name: "MACD Histogram", category: "macd", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 12, min: 1, max: 100 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 26, min: 1, max: 100 },
    { key: "signal", label: "Signal", type: "number", defaultValue: 9, min: 1, max: 100 },
  ], outputType: "numeric" },

  // Volatility
  { id: "bb_upper", name: "Bollinger Upper", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "stddev", label: "StdDev", type: "number", defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
  ], outputType: "numeric" },
  { id: "bb_middle", name: "Bollinger Middle", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "stddev", label: "StdDev", type: "number", defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
  ], outputType: "numeric" },
  { id: "bb_lower", name: "Bollinger Lower", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "stddev", label: "StdDev", type: "number", defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
  ], outputType: "numeric" },
  { id: "bb_bandwidth", name: "Bollinger Bandwidth", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "stddev", label: "StdDev", type: "number", defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
  ], outputType: "numeric" },
  { id: "atr", name: "ATR", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "supertrend", name: "Supertrend", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 10, min: 1, max: 100 },
    { key: "multiplier", label: "Mult", type: "number", defaultValue: 3, min: 0.5, max: 10, step: 0.5 },
  ], outputType: "numeric" },
  { id: "keltner_upper", name: "Keltner Upper", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "multiplier", label: "Mult", type: "number", defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
  ], outputType: "numeric" },
  { id: "keltner_lower", name: "Keltner Lower", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "multiplier", label: "Mult", type: "number", defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
  ], outputType: "numeric" },

  // Volume
  { id: "volume", name: "Volume", category: "volume", params: [], outputType: "numeric" },
  { id: "volume_sma", name: "Volume SMA", category: "volume", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "obv", name: "OBV", category: "volume", params: [], outputType: "numeric" },
  { id: "vwap", name: "VWAP", category: "volume", params: [], outputType: "numeric" },
  { id: "delivery_pct", name: "Delivery %", category: "volume", params: [], outputType: "numeric" },
  { id: "relative_volume", name: "Relative Volume", category: "volume", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
  ], outputType: "numeric" },

  // ─── Trend ─────────────────────────────────────────────────────────────
  { id: "adx", name: "ADX", category: "trend", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "plus_di", name: "+DI", category: "trend", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "minus_di", name: "-DI", category: "trend", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "parabolic_sar", name: "Parabolic SAR", category: "trend", params: [
    { key: "step", label: "Step", type: "number", defaultValue: 0.02, min: 0.001, max: 0.5, step: 0.005 },
    { key: "max", label: "Max", type: "number", defaultValue: 0.2, min: 0.01, max: 1, step: 0.01 },
  ], outputType: "numeric" },
  { id: "ichimoku_tenkan", name: "Ichimoku Tenkan", category: "trend", params: [
    { key: "tenkan", label: "Tenkan", type: "number", defaultValue: 9, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "ichimoku_kijun", name: "Ichimoku Kijun", category: "trend", params: [
    { key: "kijun", label: "Kijun", type: "number", defaultValue: 26, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "ichimoku_senkou_a", name: "Ichimoku Senkou A", category: "trend", params: [
    { key: "tenkan", label: "Tenkan", type: "number", defaultValue: 9, min: 1, max: 100 },
    { key: "kijun", label: "Kijun", type: "number", defaultValue: 26, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "ichimoku_senkou_b", name: "Ichimoku Senkou B", category: "trend", params: [
    { key: "senkou_b", label: "Senkou B", type: "number", defaultValue: 52, min: 1, max: 200 },
  ], outputType: "numeric" },
  { id: "aroon_up", name: "Aroon Up", category: "trend", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 25, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "aroon_down", name: "Aroon Down", category: "trend", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 25, min: 1, max: 100 },
  ], outputType: "numeric" },

  // ─── Extra Volatility ─────────────────────────────────────────────────
  { id: "bb_pct_b", name: "Bollinger %B", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "stddev", label: "StdDev", type: "number", defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
  ], outputType: "numeric" },
  { id: "atr_pct", name: "ATR %", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "donchian_upper", name: "Donchian Upper", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 200 },
  ], outputType: "numeric" },
  { id: "donchian_lower", name: "Donchian Lower", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 200 },
  ], outputType: "numeric" },
  { id: "hist_volatility", name: "Historical Volatility", category: "volatility", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
  ], outputType: "numeric" },

  // ─── Extra Volume ─────────────────────────────────────────────────────
  { id: "volume_ema", name: "Volume EMA", category: "volume", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "cmf", name: "Chaikin Money Flow", category: "volume", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
  ], outputType: "numeric" },
  { id: "ad_line", name: "Accumulation/Distribution", category: "volume", params: [], outputType: "numeric" },
  { id: "volume_roc", name: "Volume ROC", category: "volume", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 14, min: 1, max: 100 },
  ], outputType: "numeric" },

  // ─── Pivot Levels ─────────────────────────────────────────────────────
  { id: "pivot_pp", name: "Pivot Point", category: "pivot", params: [], outputType: "numeric" },
  { id: "pivot_r1", name: "Pivot R1", category: "pivot", params: [], outputType: "numeric" },
  { id: "pivot_r2", name: "Pivot R2", category: "pivot", params: [], outputType: "numeric" },
  { id: "pivot_r3", name: "Pivot R3", category: "pivot", params: [], outputType: "numeric" },
  { id: "pivot_s1", name: "Pivot S1", category: "pivot", params: [], outputType: "numeric" },
  { id: "pivot_s2", name: "Pivot S2", category: "pivot", params: [], outputType: "numeric" },
  { id: "pivot_s3", name: "Pivot S3", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_r1", name: "Camarilla R1", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_r2", name: "Camarilla R2", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_r3", name: "Camarilla R3", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_r4", name: "Camarilla R4", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_s1", name: "Camarilla S1", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_s2", name: "Camarilla S2", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_s3", name: "Camarilla S3", category: "pivot", params: [], outputType: "numeric" },
  { id: "camarilla_s4", name: "Camarilla S4", category: "pivot", params: [], outputType: "numeric" },
  { id: "cpr_upper", name: "CPR Upper", category: "pivot", params: [], outputType: "numeric" },
  { id: "cpr_lower", name: "CPR Lower", category: "pivot", params: [], outputType: "numeric" },
  { id: "cpr_width_pct", name: "CPR Width %", category: "pivot", params: [], outputType: "numeric" },

  // ─── Setups (compound pattern detectors) ──────────────────────────────
  { id: "ema_cross_bullish", name: "EMA Cross (Bullish)", category: "setups", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 9, min: 1, max: 200 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 21, min: 1, max: 500 },
  ], outputType: "pattern" },
  { id: "ema_cross_bearish", name: "EMA Cross (Bearish)", category: "setups", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 9, min: 1, max: 200 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 21, min: 1, max: 500 },
  ], outputType: "pattern" },
  { id: "sma_cross_bullish", name: "SMA Cross (Bullish)", category: "setups", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 50, min: 1, max: 200 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 200, min: 1, max: 500 },
  ], outputType: "pattern" },
  { id: "sma_cross_bearish", name: "SMA Cross (Bearish)", category: "setups", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 50, min: 1, max: 200 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 200, min: 1, max: 500 },
  ], outputType: "pattern" },
  { id: "macd_cross_bullish", name: "MACD Bullish Cross", category: "setups", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 12, min: 1, max: 100 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 26, min: 1, max: 100 },
    { key: "signal", label: "Signal", type: "number", defaultValue: 9, min: 1, max: 100 },
  ], outputType: "pattern" },
  { id: "macd_cross_bearish", name: "MACD Bearish Cross", category: "setups", params: [
    { key: "fast", label: "Fast", type: "number", defaultValue: 12, min: 1, max: 100 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 26, min: 1, max: 100 },
    { key: "signal", label: "Signal", type: "number", defaultValue: 9, min: 1, max: 100 },
  ], outputType: "pattern" },
  { id: "supertrend_flip_bullish", name: "Supertrend Flip (Bullish)", category: "setups", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 10, min: 1, max: 100 },
    { key: "multiplier", label: "Mult", type: "number", defaultValue: 3, min: 0.5, max: 10, step: 0.5 },
  ], outputType: "pattern" },
  { id: "supertrend_flip_bearish", name: "Supertrend Flip (Bearish)", category: "setups", params: [
    { key: "period", label: "Period", type: "number", defaultValue: 10, min: 1, max: 100 },
    { key: "multiplier", label: "Mult", type: "number", defaultValue: 3, min: 0.5, max: 10, step: 0.5 },
  ], outputType: "pattern" },

  // ─── Divergence Patterns ────────────────────────────────────────────────
  // Compound pattern indicators: they detect divergence between price and an
  // oscillator over a lookback window. Output type is "pattern" (detected or not).

  { id: "rsi_divergence", name: "RSI Divergence", category: "divergence", params: [
    { key: "div_type", label: "Type", type: "select", defaultValue: "bullish", options: [
      { value: "bullish", label: "Bullish (Regular)" },
      { value: "bearish", label: "Bearish (Regular)" },
      { value: "hidden_bullish", label: "Hidden Bullish" },
      { value: "hidden_bearish", label: "Hidden Bearish" },
    ] },
    { key: "rsi_period", label: "RSI Period", type: "number", defaultValue: 14, min: 2, max: 100 },
    { key: "lookback", label: "Lookback", type: "number", defaultValue: 20, min: 5, max: 100 },
    { key: "pivot_strength", label: "Pivot Strength", type: "number", defaultValue: 5, min: 2, max: 20 },
  ], outputType: "pattern" },

  { id: "macd_divergence", name: "MACD Divergence", category: "divergence", params: [
    { key: "div_type", label: "Type", type: "select", defaultValue: "bullish", options: [
      { value: "bullish", label: "Bullish (Regular)" },
      { value: "bearish", label: "Bearish (Regular)" },
      { value: "hidden_bullish", label: "Hidden Bullish" },
      { value: "hidden_bearish", label: "Hidden Bearish" },
    ] },
    { key: "fast", label: "Fast", type: "number", defaultValue: 12, min: 1, max: 100 },
    { key: "slow", label: "Slow", type: "number", defaultValue: 26, min: 1, max: 100 },
    { key: "signal", label: "Signal", type: "number", defaultValue: 9, min: 1, max: 100 },
    { key: "lookback", label: "Lookback", type: "number", defaultValue: 20, min: 5, max: 100 },
    { key: "pivot_strength", label: "Pivot Strength", type: "number", defaultValue: 5, min: 2, max: 20 },
  ], outputType: "pattern" },

  { id: "stoch_divergence", name: "Stochastic Divergence", category: "divergence", params: [
    { key: "div_type", label: "Type", type: "select", defaultValue: "bullish", options: [
      { value: "bullish", label: "Bullish (Regular)" },
      { value: "bearish", label: "Bearish (Regular)" },
      { value: "hidden_bullish", label: "Hidden Bullish" },
      { value: "hidden_bearish", label: "Hidden Bearish" },
    ] },
    { key: "k_period", label: "K", type: "number", defaultValue: 14, min: 1, max: 100 },
    { key: "d_period", label: "D", type: "number", defaultValue: 3, min: 1, max: 100 },
    { key: "smooth", label: "Smooth", type: "number", defaultValue: 3, min: 1, max: 100 },
    { key: "lookback", label: "Lookback", type: "number", defaultValue: 20, min: 5, max: 100 },
    { key: "pivot_strength", label: "Pivot Strength", type: "number", defaultValue: 5, min: 2, max: 20 },
  ], outputType: "pattern" },

  { id: "obv_divergence", name: "OBV Divergence", category: "divergence", params: [
    { key: "div_type", label: "Type", type: "select", defaultValue: "bullish", options: [
      { value: "bullish", label: "Bullish (Regular)" },
      { value: "bearish", label: "Bearish (Regular)" },
      { value: "hidden_bullish", label: "Hidden Bullish" },
      { value: "hidden_bearish", label: "Hidden Bearish" },
    ] },
    { key: "lookback", label: "Lookback", type: "number", defaultValue: 20, min: 5, max: 100 },
    { key: "pivot_strength", label: "Pivot Strength", type: "number", defaultValue: 5, min: 2, max: 20 },
  ], outputType: "pattern" },

  { id: "cci_divergence", name: "CCI Divergence", category: "divergence", params: [
    { key: "div_type", label: "Type", type: "select", defaultValue: "bullish", options: [
      { value: "bullish", label: "Bullish (Regular)" },
      { value: "bearish", label: "Bearish (Regular)" },
      { value: "hidden_bullish", label: "Hidden Bullish" },
      { value: "hidden_bearish", label: "Hidden Bearish" },
    ] },
    { key: "period", label: "Period", type: "number", defaultValue: 20, min: 1, max: 100 },
    { key: "lookback", label: "Lookback", type: "number", defaultValue: 20, min: 5, max: 100 },
    { key: "pivot_strength", label: "Pivot Strength", type: "number", defaultValue: 5, min: 2, max: 20 },
  ], outputType: "pattern" },

  // Candlestick Patterns — Single
  { id: "doji", name: "Doji", category: "candlestick", params: [], outputType: "pattern" },
  { id: "hammer", name: "Hammer", category: "candlestick", params: [], outputType: "pattern" },
  { id: "inverted_hammer", name: "Inverted Hammer", category: "candlestick", params: [], outputType: "pattern" },
  { id: "spinning_top", name: "Spinning Top", category: "candlestick", params: [], outputType: "pattern" },
  { id: "marubozu", name: "Marubozu", category: "candlestick", params: [], outputType: "pattern" },
  { id: "hanging_man", name: "Hanging Man", category: "candlestick", params: [], outputType: "pattern" },
  { id: "shooting_star", name: "Shooting Star", category: "candlestick", params: [], outputType: "pattern" },

  // Candlestick Patterns — Double
  { id: "bullish_engulfing", name: "Bullish Engulfing", category: "candlestick", params: [], outputType: "pattern" },
  { id: "bearish_engulfing", name: "Bearish Engulfing", category: "candlestick", params: [], outputType: "pattern" },
  { id: "piercing_line", name: "Piercing Line", category: "candlestick", params: [], outputType: "pattern" },
  { id: "dark_cloud_cover", name: "Dark Cloud Cover", category: "candlestick", params: [], outputType: "pattern" },
  { id: "bullish_harami", name: "Bullish Harami", category: "candlestick", params: [], outputType: "pattern" },
  { id: "bearish_harami", name: "Bearish Harami", category: "candlestick", params: [], outputType: "pattern" },
  { id: "tweezer_top", name: "Tweezer Top", category: "candlestick", params: [], outputType: "pattern" },
  { id: "tweezer_bottom", name: "Tweezer Bottom", category: "candlestick", params: [], outputType: "pattern" },

  // Candlestick Patterns — Triple
  { id: "morning_star", name: "Morning Star", category: "candlestick", params: [], outputType: "pattern" },
  { id: "evening_star", name: "Evening Star", category: "candlestick", params: [], outputType: "pattern" },
  { id: "three_white_soldiers", name: "Three White Soldiers", category: "candlestick", params: [], outputType: "pattern" },
  { id: "three_black_crows", name: "Three Black Crows", category: "candlestick", params: [], outputType: "pattern" },
  { id: "three_inside_up", name: "Three Inside Up", category: "candlestick", params: [], outputType: "pattern" },
  { id: "three_inside_down", name: "Three Inside Down", category: "candlestick", params: [], outputType: "pattern" },
];

// ─── Operators ──────────────────────────────────────────────────────────────

export type OperatorId =
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "crossed_above"
  | "crossed_below"
  | "is_increasing"
  | "is_decreasing"
  | "is_between"
  | "detected";

export interface OperatorDef {
  id: OperatorId;
  label: string;
  needsRight: boolean;
  rightType: "value_or_indicator" | "none" | "range";
  timeModifier: "optional_within" | "required_for" | "none";
}

export const OPERATORS: OperatorDef[] = [
  { id: "greater_than", label: "is greater than", needsRight: true, rightType: "value_or_indicator", timeModifier: "none" },
  { id: "less_than", label: "is less than", needsRight: true, rightType: "value_or_indicator", timeModifier: "none" },
  { id: "greater_equal", label: "is >= (greater or equal)", needsRight: true, rightType: "value_or_indicator", timeModifier: "none" },
  { id: "less_equal", label: "is <= (less or equal)", needsRight: true, rightType: "value_or_indicator", timeModifier: "none" },
  { id: "crossed_above", label: "crossed above", needsRight: true, rightType: "value_or_indicator", timeModifier: "optional_within" },
  { id: "crossed_below", label: "crossed below", needsRight: true, rightType: "value_or_indicator", timeModifier: "optional_within" },
  { id: "is_increasing", label: "is increasing", needsRight: false, rightType: "none", timeModifier: "required_for" },
  { id: "is_decreasing", label: "is decreasing", needsRight: false, rightType: "none", timeModifier: "required_for" },
  { id: "is_between", label: "is between", needsRight: true, rightType: "range", timeModifier: "none" },
  { id: "detected", label: "detected", needsRight: false, rightType: "none", timeModifier: "optional_within" },
];

export function getOperatorsForType(type: OutputType): OperatorDef[] {
  if (type === "pattern") return OPERATORS.filter((o) => o.id === "detected");
  return OPERATORS.filter((o) => o.id !== "detected");
}

export function getIndicator(id: string): IndicatorDef | undefined {
  return INDICATORS.find((i) => i.id === id);
}

// ─── Global Controls ────────────────────────────────────────────────────────

export const TIMEFRAMES = [
  { value: "1m", label: "1 min" },
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "Daily" },
  { value: "1w", label: "Weekly" },
];

export const UNIVERSES = [
  { value: "nifty50", label: "Nifty 50" },
  { value: "nifty200", label: "Nifty 200" },
  { value: "nifty500", label: "Nifty 500" },
  { value: "nifty750", label: "Nifty 750" },
  { value: "all", label: "All NSE Stocks" },
];
