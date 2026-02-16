/**
 * Consolidated Screener Definitions with Mock Stock Data
 * 
 * Categories: Price, Volume/Delivery, Technicals, Candlesticks, Fundamentals
 * Each screener includes applicable trading styles and mock stock results
 */

export interface ScreenerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

export type ScreenerCategory = "price" | "volume" | "technicals" | "candlesticks" | "fundamentals";
export type TradingStyle = "intraday" | "btst" | "swing" | "positional";

export interface Screener {
  id: string;
  name: string;
  description: string;
  category: ScreenerCategory;
  applicableStyles: TradingStyle[];
  stocks: ScreenerStock[];
  isHot?: boolean; // For "Hot Right Now" section
}

export interface ScreenerCategoryInfo {
  key: ScreenerCategory;
  name: string;
  description: string;
  icon: string;
}

// Category metadata
export const SCREENER_CATEGORY_INFO: ScreenerCategoryInfo[] = [
  { key: "price", name: "Price", description: "Price action and movement based scans", icon: "📈" },
  { key: "volume", name: "Volume & Delivery", description: "Volume and delivery based analysis", icon: "📊" },
  { key: "technicals", name: "Technicals", description: "Technical indicator based scans", icon: "📉" },
  { key: "candlesticks", name: "Candlesticks", description: "Japanese candlestick patterns", icon: "🕯️" },
  { key: "fundamentals", name: "Fundamentals", description: "Fundamental analysis based scans", icon: "📋" },
];

// Mock stock data generator
function generateMockStocks(symbols: string[], basePrice: number, trend: "up" | "down" | "mixed"): ScreenerStock[] {
  const stockNames: Record<string, string> = {
    RELIANCE: "Reliance Industries",
    INFY: "Infosys Ltd",
    TCS: "Tata Consultancy",
    HDFCBANK: "HDFC Bank",
    ICICIBANK: "ICICI Bank",
    TATASTEEL: "Tata Steel",
    SBIN: "State Bank of India",
    BHARTIARTL: "Bharti Airtel",
    ITC: "ITC Ltd",
    KOTAKBANK: "Kotak Mahindra Bank",
    WIPRO: "Wipro Ltd",
    HINDUNILVR: "Hindustan Unilever",
    BAJFINANCE: "Bajaj Finance",
    MARUTI: "Maruti Suzuki",
    AXISBANK: "Axis Bank",
    LT: "Larsen & Toubro",
    ASIANPAINT: "Asian Paints",
    SUNPHARMA: "Sun Pharma",
    TITAN: "Titan Company",
    ULTRACEMCO: "UltraTech Cement",
    TECHM: "Tech Mahindra",
    HCLTECH: "HCL Technologies",
    POWERGRID: "Power Grid Corp",
    NTPC: "NTPC Ltd",
    ONGC: "ONGC",
    COALINDIA: "Coal India",
    ADANIPORTS: "Adani Ports",
    JSWSTEEL: "JSW Steel",
    TATAMOTORS: "Tata Motors",
    M_M: "Mahindra & Mahindra",
    DRREDDY: "Dr Reddy's Labs",
    CIPLA: "Cipla Ltd",
    DIVISLAB: "Divi's Labs",
    EICHERMOT: "Eicher Motors",
    GRASIM: "Grasim Industries",
    HEROMOTOCO: "Hero MotoCorp",
    HINDALCO: "Hindalco",
    INDUSINDBK: "IndusInd Bank",
    NESTLEIND: "Nestle India",
    SHREECEM: "Shree Cement",
    BIKAJI: "Bikaji Foods",
    ANANDRATHI: "Anand Rathi",
    ZOMATO: "Zomato Ltd",
    PAYTM: "Paytm",
    DMART: "Avenue Supermarts",
  };

  return symbols.map((symbol, index) => {
    const priceVariation = (Math.random() - 0.5) * basePrice * 0.3;
    const price = Math.round((basePrice + priceVariation + index * 50) * 100) / 100;
    
    let changePct: number;
    if (trend === "up") {
      changePct = Math.round((Math.random() * 4 + 0.5) * 100) / 100;
    } else if (trend === "down") {
      changePct = Math.round((Math.random() * -4 - 0.5) * 100) / 100;
    } else {
      changePct = Math.round((Math.random() * 6 - 3) * 100) / 100;
    }
    
    const change = Math.round(price * changePct / 100 * 100) / 100;
    
    return {
      symbol,
      name: stockNames[symbol] || symbol,
      price,
      change,
      changePct,
    };
  });
}

// Consolidated Screeners (50-60 core screeners instead of 400+)
export const SCREENERS: Screener[] = [
  // ========== PRICE SCREENERS (8) ==========
  {
    id: "52w_high_zone",
    name: "Near 52-Week High",
    description: "Stocks within 5% of 52-week high",
    category: "price",
    applicableStyles: ["swing", "positional"],
    isHot: true,
    stocks: generateMockStocks(
      ["RELIANCE", "INFY", "TCS", "HDFCBANK", "BHARTIARTL", "TITAN", "BAJFINANCE", "MARUTI", "ASIANPAINT", "NESTLEIND", "ULTRACEMCO", "DIVISLAB"],
      2500,
      "up"
    ),
  },
  {
    id: "52w_low_zone",
    name: "Near 52-Week Low",
    description: "Stocks within 5% of 52-week low - potential bounce candidates",
    category: "price",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO", "INDUSINDBK", "TATAMOTORS", "HINDALCO", "COALINDIA"],
      450,
      "down"
    ),
  },
  {
    id: "all_time_high",
    name: "All Time High",
    description: "Stocks hitting new all-time highs today",
    category: "price",
    applicableStyles: ["btst", "swing", "positional"],
    stocks: generateMockStocks(
      ["RELIANCE", "TITAN", "BAJFINANCE", "NESTLEIND", "DIVISLAB", "ASIANPAINT", "DMART"],
      3200,
      "up"
    ),
  },
  {
    id: "gap_up",
    name: "Gap Up >2%",
    description: "Stocks with gap up opening greater than 2%",
    category: "price",
    applicableStyles: ["intraday", "btst"],
    isHot: true,
    stocks: generateMockStocks(
      ["TATASTEEL", "JSWSTEEL", "HINDALCO", "SBIN", "ICICIBANK", "AXISBANK", "KOTAKBANK", "INDUSINDBK"],
      780,
      "up"
    ),
  },
  {
    id: "gap_down",
    name: "Gap Down >2%",
    description: "Stocks with gap down opening - potential bounce plays",
    category: "price",
    applicableStyles: ["intraday"],
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO", "ADANIPORTS"],
      320,
      "down"
    ),
  },
  {
    id: "support_breakout",
    name: "Breaking Resistance",
    description: "Stocks breaking above key resistance levels",
    category: "price",
    applicableStyles: ["intraday", "btst", "swing"],
    stocks: generateMockStocks(
      ["INFY", "WIPRO", "TECHM", "HCLTECH", "LT", "ULTRACEMCO", "GRASIM", "SHREECEM", "M_M", "HEROMOTOCO"],
      1850,
      "up"
    ),
  },
  {
    id: "near_support",
    name: "Near Support",
    description: "Stocks trading near key support levels",
    category: "price",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["HDFCBANK", "ICICIBANK", "KOTAKBANK", "AXISBANK", "SBIN", "INDUSINDBK", "BAJFINANCE"],
      1650,
      "mixed"
    ),
  },
  {
    id: "prev_day_high_break",
    name: "Previous Day High Break",
    description: "Stocks breaking above previous day's high",
    category: "price",
    applicableStyles: ["intraday", "btst"],
    stocks: generateMockStocks(
      ["RELIANCE", "TCS", "INFY", "BHARTIARTL", "ITC", "HINDUNILVR", "TITAN", "SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "MARUTI", "EICHERMOT", "BAJFINANCE", "ASIANPAINT"],
      2100,
      "up"
    ),
  },

  // ========== VOLUME SCREENERS (6) ==========
  {
    id: "volume_surge",
    name: "Volume Surge",
    description: "Volume > 2x 20-day average - unusual activity",
    category: "volume",
    applicableStyles: ["intraday", "btst", "swing"],
    isHot: true,
    stocks: generateMockStocks(
      ["TATASTEEL", "JSWSTEEL", "HINDALCO", "COALINDIA", "ONGC", "NTPC", "POWERGRID", "SBIN", "ICICIBANK", "HDFCBANK", "RELIANCE", "INFY", "TCS", "WIPRO", "TECHM", "HCLTECH", "LT", "BHARTIARTL", "ITC", "TITAN", "BAJFINANCE", "MARUTI", "SUNPHARMA"],
      1200,
      "up"
    ),
  },
  {
    id: "high_delivery",
    name: "High Delivery %",
    description: "Delivery > 70% of traded volume - institutional interest",
    category: "volume",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["HDFCBANK", "ICICIBANK", "KOTAKBANK", "RELIANCE", "INFY", "TCS", "HINDUNILVR", "NESTLEIND", "ASIANPAINT", "TITAN", "BAJFINANCE", "DIVISLAB", "DMART", "ULTRACEMCO", "GRASIM", "SHREECEM", "DRREDDY", "CIPLA", "SUNPHARMA", "BHARTIARTL", "ITC", "LT", "M_M", "MARUTI", "EICHERMOT", "HEROMOTOCO", "TATAMOTORS", "AXISBANK", "SBIN", "INDUSINDBK", "POWERGRID"],
      1800,
      "up"
    ),
  },
  {
    id: "volume_dry_up",
    name: "Volume Dry Up",
    description: "Significant decrease in volume - consolidation phase",
    category: "volume",
    applicableStyles: ["swing"],
    stocks: generateMockStocks(
      ["BIKAJI", "ANANDRATHI", "ZOMATO", "PAYTM", "ADANIPORTS"],
      650,
      "mixed"
    ),
  },
  {
    id: "accumulation",
    name: "Accumulation Pattern",
    description: "Signs of institutional buying over past sessions",
    category: "volume",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["INFY", "TCS", "WIPRO", "TECHM", "HCLTECH", "RELIANCE", "HDFCBANK"],
      2200,
      "up"
    ),
  },
  {
    id: "distribution",
    name: "Distribution Pattern",
    description: "Signs of institutional selling - caution advised",
    category: "volume",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO", "ADANIPORTS"],
      280,
      "down"
    ),
  },
  {
    id: "delivery_spike",
    name: "Delivery Spike",
    description: "Sudden increase in delivery percentage vs average",
    category: "volume",
    applicableStyles: ["btst", "swing"],
    stocks: generateMockStocks(
      ["TATASTEEL", "JSWSTEEL", "HINDALCO", "SBIN", "ICICIBANK"],
      890,
      "up"
    ),
  },

  // ========== TECHNICAL SCREENERS (12) ==========
  {
    id: "rsi_oversold",
    name: "RSI Oversold",
    description: "RSI below 30 - potential bounce candidates",
    category: "technicals",
    applicableStyles: ["intraday", "btst", "swing"],
    isHot: true,
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO", "INDUSINDBK", "TATAMOTORS", "HINDALCO", "COALINDIA", "ADANIPORTS", "ONGC"],
      420,
      "down"
    ),
  },
  {
    id: "rsi_overbought",
    name: "RSI Overbought",
    description: "RSI above 70 - potential pullback candidates",
    category: "technicals",
    applicableStyles: ["intraday", "swing"],
    stocks: generateMockStocks(
      ["TITAN", "BAJFINANCE", "NESTLEIND", "DIVISLAB", "ASIANPAINT"],
      3500,
      "up"
    ),
  },
  {
    id: "macd_bullish",
    name: "MACD Bullish Crossover",
    description: "MACD line crossing above signal line",
    category: "technicals",
    applicableStyles: ["btst", "swing", "positional"],
    stocks: generateMockStocks(
      ["INFY", "TCS", "WIPRO", "TECHM", "HCLTECH", "RELIANCE", "HDFCBANK", "ICICIBANK", "BHARTIARTL", "ITC", "HINDUNILVR", "LT", "MARUTI", "M_M"],
      1950,
      "up"
    ),
  },
  {
    id: "macd_bearish",
    name: "MACD Bearish Crossover",
    description: "MACD line crossing below signal line - caution",
    category: "technicals",
    applicableStyles: ["swing"],
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO", "ADANIPORTS", "COALINDIA"],
      350,
      "down"
    ),
  },
  {
    id: "golden_cross",
    name: "Golden Cross (EMA)",
    description: "20 EMA crossing above 50 EMA - bullish trend",
    category: "technicals",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["RELIANCE", "INFY", "TCS", "BHARTIARTL", "TITAN"],
      2800,
      "up"
    ),
  },
  {
    id: "death_cross",
    name: "Death Cross (EMA)",
    description: "20 EMA crossing below 50 EMA - bearish trend",
    category: "technicals",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO"],
      220,
      "down"
    ),
  },
  {
    id: "above_200_ema",
    name: "Above 200 EMA",
    description: "Price trading above 200-day EMA - long-term uptrend",
    category: "technicals",
    applicableStyles: ["positional"],
    stocks: generateMockStocks(
      ["RELIANCE", "INFY", "TCS", "HDFCBANK", "ICICIBANK", "BHARTIARTL", "ITC", "HINDUNILVR", "TITAN", "BAJFINANCE", "NESTLEIND", "ASIANPAINT", "DIVISLAB", "MARUTI", "M_M", "LT", "ULTRACEMCO", "DRREDDY", "CIPLA", "SUNPHARMA", "KOTAKBANK", "AXISBANK", "SBIN", "EICHERMOT", "HEROMOTOCO", "GRASIM", "SHREECEM", "TECHM", "WIPRO", "HCLTECH", "POWERGRID", "NTPC"],
      2100,
      "up"
    ),
  },
  {
    id: "supertrend_buy",
    name: "Supertrend Buy Signal",
    description: "Supertrend indicator turned bullish",
    category: "technicals",
    applicableStyles: ["btst", "swing"],
    stocks: generateMockStocks(
      ["TATASTEEL", "JSWSTEEL", "HINDALCO", "SBIN", "ICICIBANK", "HDFCBANK", "RELIANCE", "INFY"],
      1150,
      "up"
    ),
  },
  {
    id: "supertrend_sell",
    name: "Supertrend Sell Signal",
    description: "Supertrend indicator turned bearish",
    category: "technicals",
    applicableStyles: ["swing"],
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO", "ADANIPORTS"],
      290,
      "down"
    ),
  },
  {
    id: "bollinger_squeeze",
    name: "Bollinger Squeeze",
    description: "Low volatility - breakout expected soon",
    category: "technicals",
    applicableStyles: ["btst", "swing"],
    stocks: generateMockStocks(
      ["BIKAJI", "ANANDRATHI", "DMART", "NESTLEIND", "HINDUNILVR"],
      780,
      "mixed"
    ),
  },
  {
    id: "adx_trending",
    name: "Strong Trend (ADX >25)",
    description: "ADX above 25 indicating strong trend",
    category: "technicals",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["RELIANCE", "TITAN", "BAJFINANCE", "INFY", "TCS", "BHARTIARTL", "TATASTEEL", "JSWSTEEL"],
      2400,
      "up"
    ),
  },
  {
    id: "stoch_oversold",
    name: "Stochastic Oversold",
    description: "Stochastic below 20 - potential reversal",
    category: "technicals",
    applicableStyles: ["intraday", "btst"],
    stocks: generateMockStocks(
      ["INDUSINDBK", "TATAMOTORS", "HINDALCO", "COALINDIA", "ONGC", "NTPC"],
      560,
      "down"
    ),
  },

  // ========== CANDLESTICK SCREENERS (10) ==========
  {
    id: "bullish_engulfing",
    name: "Bullish Engulfing",
    description: "Strong bullish reversal pattern",
    category: "candlesticks",
    applicableStyles: ["btst", "swing"],
    stocks: generateMockStocks(
      ["TATASTEEL", "JSWSTEEL", "SBIN", "ICICIBANK", "HDFCBANK", "RELIANCE"],
      1350,
      "up"
    ),
  },
  {
    id: "bearish_engulfing",
    name: "Bearish Engulfing",
    description: "Strong bearish reversal pattern - caution",
    category: "candlesticks",
    applicableStyles: ["swing"],
    stocks: generateMockStocks(
      ["PAYTM", "ZOMATO", "ADANIPORTS"],
      310,
      "down"
    ),
  },
  {
    id: "hammer",
    name: "Hammer",
    description: "Bullish reversal at support",
    category: "candlesticks",
    applicableStyles: ["btst", "swing"],
    stocks: generateMockStocks(
      ["INDUSINDBK", "TATAMOTORS", "HINDALCO", "COALINDIA"],
      480,
      "mixed"
    ),
  },
  {
    id: "shooting_star",
    name: "Shooting Star",
    description: "Bearish reversal at resistance",
    category: "candlesticks",
    applicableStyles: ["swing"],
    stocks: generateMockStocks(
      ["TITAN", "BAJFINANCE"],
      3800,
      "down"
    ),
  },
  {
    id: "morning_star",
    name: "Morning Star",
    description: "Strong bullish reversal - 3 candle pattern",
    category: "candlesticks",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["SBIN", "ICICIBANK", "HDFCBANK"],
      1580,
      "up"
    ),
  },
  {
    id: "evening_star",
    name: "Evening Star",
    description: "Strong bearish reversal - 3 candle pattern",
    category: "candlesticks",
    applicableStyles: ["swing"],
    stocks: generateMockStocks(
      ["PAYTM"],
      180,
      "down"
    ),
  },
  {
    id: "doji",
    name: "Doji",
    description: "Indecision candle - potential reversal",
    category: "candlesticks",
    applicableStyles: ["intraday", "btst"],
    stocks: generateMockStocks(
      ["WIPRO", "TECHM", "HCLTECH", "BHARTIARTL", "ITC"],
      890,
      "mixed"
    ),
  },
  {
    id: "bullish_harami",
    name: "Bullish Harami",
    description: "Bullish reversal pattern",
    category: "candlesticks",
    applicableStyles: ["btst", "swing"],
    stocks: generateMockStocks(
      ["TATAMOTORS", "HINDALCO", "M_M"],
      620,
      "up"
    ),
  },
  {
    id: "three_white_soldiers",
    name: "Three White Soldiers",
    description: "Strong bullish continuation pattern",
    category: "candlesticks",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["RELIANCE", "INFY", "TCS"],
      2950,
      "up"
    ),
  },
  {
    id: "marubozu",
    name: "Marubozu",
    description: "Strong momentum candle",
    category: "candlesticks",
    applicableStyles: ["intraday", "btst"],
    stocks: generateMockStocks(
      ["TATASTEEL", "JSWSTEEL", "HINDALCO", "SBIN", "RELIANCE", "TITAN", "BAJFINANCE"],
      1450,
      "up"
    ),
  },

  // ========== FUNDAMENTAL SCREENERS (10) ==========
  {
    id: "low_pe",
    name: "Low P/E Ratio",
    description: "P/E below sector average - value picks",
    category: "fundamentals",
    applicableStyles: ["positional"],
    stocks: generateMockStocks(
      ["ONGC", "COALINDIA", "NTPC", "POWERGRID", "SBIN", "ICICIBANK", "TATASTEEL", "JSWSTEEL", "HINDALCO", "ITC", "HINDUNILVR", "BHARTIARTL"],
      680,
      "mixed"
    ),
  },
  {
    id: "high_roe",
    name: "High ROE (>20%)",
    description: "Return on Equity above 20%",
    category: "fundamentals",
    applicableStyles: ["positional"],
    stocks: generateMockStocks(
      ["TCS", "INFY", "HDFCBANK", "ICICIBANK", "BAJFINANCE", "TITAN", "NESTLEIND", "HINDUNILVR", "ASIANPAINT", "DIVISLAB", "RELIANCE", "BHARTIARTL", "ITC", "KOTAKBANK"],
      2300,
      "up"
    ),
  },
  {
    id: "debt_free",
    name: "Debt Free",
    description: "Companies with zero or minimal debt",
    category: "fundamentals",
    applicableStyles: ["positional"],
    stocks: generateMockStocks(
      ["TCS", "INFY", "WIPRO", "TECHM", "HCLTECH", "ITC", "HINDUNILVR", "NESTLEIND", "ASIANPAINT", "TITAN", "BAJFINANCE", "DIVISLAB"],
      2100,
      "up"
    ),
  },
  {
    id: "high_dividend",
    name: "High Dividend Yield",
    description: "Dividend yield > 3%",
    category: "fundamentals",
    applicableStyles: ["positional"],
    stocks: generateMockStocks(
      ["COALINDIA", "ONGC", "POWERGRID", "NTPC", "ITC", "HINDUNILVR", "SBIN", "ICICIBANK"],
      420,
      "mixed"
    ),
  },
  {
    id: "profit_growth",
    name: "Profit Growth",
    description: "QoQ profit growth > 20%",
    category: "fundamentals",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["TATASTEEL", "JSWSTEEL", "HINDALCO", "RELIANCE", "INFY", "TCS", "BHARTIARTL", "TITAN", "BAJFINANCE", "M_M", "MARUTI", "EICHERMOT"],
      1680,
      "up"
    ),
  },
  {
    id: "revenue_growth",
    name: "Revenue Growth",
    description: "QoQ revenue growth > 15%",
    category: "fundamentals",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["RELIANCE", "BHARTIARTL", "TATASTEEL", "JSWSTEEL", "TITAN", "BAJFINANCE", "ZOMATO", "DMART"],
      1450,
      "up"
    ),
  },
  {
    id: "fii_buying",
    name: "FII Buying",
    description: "FII increasing stake in recent quarters",
    category: "fundamentals",
    applicableStyles: ["swing", "positional"],
    isHot: true,
    stocks: generateMockStocks(
      ["HDFCBANK", "ICICIBANK", "RELIANCE", "INFY", "TCS", "BHARTIARTL", "ITC", "HINDUNILVR", "TITAN", "BAJFINANCE", "KOTAKBANK", "AXISBANK", "LT", "MARUTI", "M_M"],
      2050,
      "up"
    ),
  },
  {
    id: "promoter_buying",
    name: "Promoter Buying",
    description: "Recent increase in promoter holding",
    category: "fundamentals",
    applicableStyles: ["swing", "positional"],
    stocks: generateMockStocks(
      ["BAJFINANCE", "TITAN", "BIKAJI", "ANANDRATHI", "DMART"],
      1850,
      "up"
    ),
  },
  {
    id: "dii_buying",
    name: "DII Buying",
    description: "Domestic institutions increasing stake",
    category: "fundamentals",
    applicableStyles: ["positional"],
    stocks: generateMockStocks(
      ["SBIN", "ICICIBANK", "HDFCBANK", "RELIANCE", "INFY", "TCS", "BHARTIARTL", "ITC", "HINDUNILVR", "NESTLEIND", "ASIANPAINT", "ULTRACEMCO"],
      1920,
      "up"
    ),
  },
  {
    id: "low_pb",
    name: "Low P/B Ratio",
    description: "Price to Book below 1.5 - undervalued",
    category: "fundamentals",
    applicableStyles: ["positional"],
    stocks: generateMockStocks(
      ["SBIN", "ICICIBANK", "AXISBANK", "INDUSINDBK", "ONGC", "COALINDIA", "NTPC", "POWERGRID", "TATASTEEL", "JSWSTEEL", "HINDALCO"],
      580,
      "mixed"
    ),
  },
];

// Helper functions
export function getScreenersByCategory(category: ScreenerCategory): Screener[] {
  return SCREENERS.filter(s => s.category === category);
}

export function getScreenersByStyle(style: TradingStyle): Screener[] {
  return SCREENERS.filter(s => s.applicableStyles.includes(style));
}

export function getHotScreeners(): Screener[] {
  return SCREENERS.filter(s => s.isHot);
}

export function getScreenerById(id: string): Screener | undefined {
  return SCREENERS.find(s => s.id === id);
}

// Market pulse mock data
export interface MarketPulse {
  niftyValue: number;
  niftyChange: number;
  niftyChangePct: number;
  advances: number;
  declines: number;
  unchanged: number;
  date: string;
}

export function getMarketPulse(): MarketPulse {
  return {
    niftyValue: 22450.35,
    niftyChange: 178.65,
    niftyChangePct: 0.8,
    advances: 1432,
    declines: 789,
    unchanged: 124,
    date: new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
  };
}

// ========== NEW: TRADE IDEAS ENGINE DATA ==========

export type ConvictionLevel = "high" | "medium" | "low";
export type RiskLevel = "low" | "moderate" | "high";
export type TimeHorizon = "intraday" | "1-2 days" | "3-7 days" | "1-4 weeks";

export interface TradeIdea {
  id: string;
  symbol: string;
  name: string;
  
  // The headline - what's the setup?
  headline: string;
  
  // Why this matters - the thesis
  thesis: string;
  
  // What signals are triggering this?
  signals: {
    type: "price" | "volume" | "technical" | "candlestick" | "fundamental";
    name: string;
    value: string;
  }[];
  
  // Conviction and risk
  conviction: ConvictionLevel;
  risk: RiskLevel;
  timeHorizon: TimeHorizon;
  
  // Price data
  currentPrice: number;
  change: number;
  changePct: number;
  
  // Trade levels
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  
  // Supporting context
  sectorTrend: "bullish" | "bearish" | "neutral";
  marketContext: string;
  
  // Applicable styles
  styles: TradingStyle[];
  
  // Timestamp
  generatedAt: string;
}

export interface MarketRegime {
  trend: "bullish" | "bearish" | "sideways";
  volatility: "low" | "moderate" | "high";
  breadth: "strong" | "weak" | "neutral";
  fiiActivity: "buying" | "selling" | "neutral";
  summary: string;
  recommendation: string;
}

// Generate mock trade ideas
export function getTradeIdeas(style?: TradingStyle): TradeIdea[] {
  const allIdeas: TradeIdea[] = [
    // HIGH CONVICTION INTRADAY
    {
      id: "idea-1",
      symbol: "TATASTEEL",
      name: "Tata Steel",
      headline: "Volume explosion at resistance breakout",
      thesis: "TATASTEEL is breaking out of a 2-week consolidation with 3x average volume. Metal sector is leading today with global cues positive. The breakout has follow-through potential as FIIs have been accumulating in metals.",
      signals: [
        { type: "price", name: "Resistance Breakout", value: "Crossed ₹142 with conviction" },
        { type: "volume", name: "Volume Surge", value: "3.2x 20-day average" },
        { type: "technical", name: "RSI", value: "62 - Room to run" },
        { type: "candlestick", name: "Marubozu", value: "Strong bullish candle" },
      ],
      conviction: "high",
      risk: "moderate",
      timeHorizon: "intraday",
      currentPrice: 143.50,
      change: 5.20,
      changePct: 3.76,
      entry: 143.50,
      stopLoss: 140.00,
      target: 150.00,
      riskReward: 1.86,
      sectorTrend: "bullish",
      marketContext: "Metal stocks leading; Nifty Metal +2.8%",
      styles: ["intraday", "btst"],
      generatedAt: new Date().toISOString(),
    },
    // HIGH CONVICTION BTST
    {
      id: "idea-2",
      symbol: "HDFCBANK",
      name: "HDFC Bank",
      headline: "Hammer at 200 EMA with FII buying",
      thesis: "HDFCBANK formed a hammer candle right at its 200 EMA after 5 days of selling. FII data shows ₹850cr buying in banking today. This is a classic mean reversion setup with institutional support.",
      signals: [
        { type: "candlestick", name: "Hammer", value: "At key support" },
        { type: "technical", name: "200 EMA", value: "Price at ₹1,628" },
        { type: "fundamental", name: "FII Activity", value: "₹850cr bought today" },
        { type: "volume", name: "Delivery %", value: "78% - High conviction" },
      ],
      conviction: "high",
      risk: "low",
      timeHorizon: "1-2 days",
      currentPrice: 1632.00,
      change: -18.50,
      changePct: -1.12,
      entry: 1632.00,
      stopLoss: 1598.00,
      target: 1690.00,
      riskReward: 1.71,
      sectorTrend: "neutral",
      marketContext: "Banking index at support; RBI policy next week",
      styles: ["btst", "swing"],
      generatedAt: new Date().toISOString(),
    },
    // HIGH CONVICTION SWING
    {
      id: "idea-3",
      symbol: "RELIANCE",
      name: "Reliance Industries",
      headline: "Consolidation breakout after 3-week base",
      thesis: "RELIANCE has been building a tight base between ₹2,850-2,920 for 3 weeks. Volume has contracted significantly (classic accumulation). Today's move above ₹2,920 with volume expansion signals the start of the next leg up. Jio tariff hike catalyst expected.",
      signals: [
        { type: "price", name: "Consolidation Breakout", value: "3-week base break" },
        { type: "volume", name: "Volume Expansion", value: "1.8x on breakout" },
        { type: "technical", name: "MACD", value: "Bullish crossover" },
        { type: "fundamental", name: "Catalyst", value: "Jio tariff hike expected" },
      ],
      conviction: "high",
      risk: "moderate",
      timeHorizon: "3-7 days",
      currentPrice: 2935.00,
      change: 42.00,
      changePct: 1.45,
      entry: 2935.00,
      stopLoss: 2850.00,
      target: 3100.00,
      riskReward: 1.94,
      sectorTrend: "bullish",
      marketContext: "Nifty at ATH; large caps leading",
      styles: ["swing", "positional"],
      generatedAt: new Date().toISOString(),
    },
    // MEDIUM CONVICTION SWING
    {
      id: "idea-4",
      symbol: "INFY",
      name: "Infosys",
      headline: "Golden cross forming with sector rotation",
      thesis: "IT sector seeing rotation after 3 months of underperformance. INFY's 20 EMA is about to cross 50 EMA (golden cross). Deal wins have been strong and rupee depreciation is a tailwind. Risk is broader market correction.",
      signals: [
        { type: "technical", name: "Golden Cross", value: "20 EMA crossing 50 EMA" },
        { type: "price", name: "Higher Lows", value: "3 consecutive higher lows" },
        { type: "fundamental", name: "Deal Wins", value: "Strong Q3 commentary" },
        { type: "volume", name: "Accumulation", value: "Increasing delivery %" },
      ],
      conviction: "medium",
      risk: "moderate",
      timeHorizon: "1-4 weeks",
      currentPrice: 1542.00,
      change: 28.00,
      changePct: 1.85,
      entry: 1542.00,
      stopLoss: 1480.00,
      target: 1680.00,
      riskReward: 2.23,
      sectorTrend: "bullish",
      marketContext: "IT sector rotation; USD strength",
      styles: ["swing", "positional"],
      generatedAt: new Date().toISOString(),
    },
    // HIGH CONVICTION POSITIONAL
    {
      id: "idea-5",
      symbol: "TITAN",
      name: "Titan Company",
      headline: "Pullback to 50 EMA in strong uptrend",
      thesis: "TITAN has pulled back 8% from highs to its rising 50 EMA - a classic buy-the-dip opportunity in a strong uptrend. Wedding season demand is strong, and the stock has bounced from this level 4 times in the past year.",
      signals: [
        { type: "technical", name: "50 EMA Support", value: "Exact bounce at ₹3,420" },
        { type: "price", name: "Uptrend Intact", value: "Higher highs, higher lows" },
        { type: "fundamental", name: "Seasonality", value: "Wedding season peak" },
        { type: "volume", name: "Buying Interest", value: "Volume spike at support" },
      ],
      conviction: "high",
      risk: "low",
      timeHorizon: "1-4 weeks",
      currentPrice: 3445.00,
      change: 52.00,
      changePct: 1.53,
      entry: 3445.00,
      stopLoss: 3320.00,
      target: 3750.00,
      riskReward: 2.44,
      sectorTrend: "bullish",
      marketContext: "Consumption theme strong; gold prices stable",
      styles: ["swing", "positional"],
      generatedAt: new Date().toISOString(),
    },
    // MEDIUM CONVICTION INTRADAY SHORT
    {
      id: "idea-6",
      symbol: "PAYTM",
      name: "One97 Communications",
      headline: "Breakdown below support with distribution",
      thesis: "PAYTM broke below ₹480 support with heavy selling volume. Stock is in a clear downtrend with lower highs. Distribution pattern visible with high delivery on down days. Consider for short/avoid long.",
      signals: [
        { type: "price", name: "Support Break", value: "₹480 level broken" },
        { type: "volume", name: "Distribution", value: "High volume selling" },
        { type: "technical", name: "RSI", value: "38 - Weak momentum" },
        { type: "candlestick", name: "Bearish Engulfing", value: "Yesterday's pattern" },
      ],
      conviction: "medium",
      risk: "high",
      timeHorizon: "intraday",
      currentPrice: 465.00,
      change: -18.00,
      changePct: -3.73,
      entry: 468.00,
      stopLoss: 485.00,
      target: 440.00,
      riskReward: 1.65,
      sectorTrend: "bearish",
      marketContext: "Fintech regulatory concerns; sector weak",
      styles: ["intraday"],
      generatedAt: new Date().toISOString(),
    },
    // HIGH CONVICTION BTST - Earnings Play
    {
      id: "idea-7",
      symbol: "BAJFINANCE",
      name: "Bajaj Finance",
      headline: "Pre-earnings momentum with bullish setup",
      thesis: "BAJFINANCE reports earnings tomorrow. Stock has formed a bullish flag pattern and options data shows call buying. Historically, stock moves 3-5% on results. Consensus is positive on asset quality improvement.",
      signals: [
        { type: "price", name: "Bullish Flag", value: "Consolidation after rally" },
        { type: "technical", name: "Options Flow", value: "Call buying at 7500 strike" },
        { type: "fundamental", name: "Earnings", value: "Tomorrow; consensus positive" },
        { type: "volume", name: "Pre-earnings", value: "Volume building" },
      ],
      conviction: "high",
      risk: "high",
      timeHorizon: "1-2 days",
      currentPrice: 7280.00,
      change: 85.00,
      changePct: 1.18,
      entry: 7280.00,
      stopLoss: 7100.00,
      target: 7600.00,
      riskReward: 1.78,
      sectorTrend: "bullish",
      marketContext: "NBFC sector strong; credit growth robust",
      styles: ["btst"],
      generatedAt: new Date().toISOString(),
    },
    // MEDIUM CONVICTION SWING - Sector Play
    {
      id: "idea-8",
      symbol: "COALINDIA",
      name: "Coal India",
      headline: "Dividend play with technical support",
      thesis: "COALINDIA is trading at 52-week low with 7% dividend yield. Technical support at ₹380 has held twice. Summer demand approaching and production targets on track. Deep value with catalyst.",
      signals: [
        { type: "price", name: "52W Low Support", value: "Holding ₹380 level" },
        { type: "fundamental", name: "Dividend Yield", value: "7.2% - Attractive" },
        { type: "technical", name: "RSI", value: "28 - Oversold" },
        { type: "volume", name: "Accumulation", value: "Institutional buying visible" },
      ],
      conviction: "medium",
      risk: "moderate",
      timeHorizon: "1-4 weeks",
      currentPrice: 388.00,
      change: 4.50,
      changePct: 1.17,
      entry: 388.00,
      stopLoss: 370.00,
      target: 430.00,
      riskReward: 2.33,
      sectorTrend: "neutral",
      marketContext: "PSU theme active; energy demand rising",
      styles: ["swing", "positional"],
      generatedAt: new Date().toISOString(),
    },
  ];

  if (style) {
    return allIdeas.filter(idea => idea.styles.includes(style));
  }
  return allIdeas;
}

export function getMarketRegime(): MarketRegime {
  return {
    trend: "bullish",
    volatility: "moderate",
    breadth: "strong",
    fiiActivity: "buying",
    summary: "Market is in a healthy uptrend with broad participation. FIIs have been net buyers for 8 consecutive sessions. Midcaps and smallcaps are outperforming. Volatility is contained with VIX at 13.",
    recommendation: "Favor long positions with trend. Look for pullbacks to buy. Avoid aggressive shorts.",
  };
}

// Get ideas by conviction
export function getHighConvictionIdeas(): TradeIdea[] {
  return getTradeIdeas().filter(idea => idea.conviction === "high");
}

// Get today's top picks (max 3)
export function getTodaysTopPicks(): TradeIdea[] {
  return getHighConvictionIdeas().slice(0, 3);
}

// ========== TRADE SETUPS (NON-RECOMMENDATORY) ==========

export type SetupCategory = "btst" | "stocks-to-watch" | "swing";

export type BTSTSetupType = 
  | "Strong momentum" 
  | "Volume breakout" 
  | "Fresh breakout" 
  | "Gap up" 
  | "Oversold bounce";

export type StocksToWatchSetupType = 
  | "Upcoming earnings" 
  | "Sector leaders" 
  | "New 52W high" 
  | "Fundamental picks" 
  | "Breakout watchlist";

export type SwingSetupType = 
  | "Consolidation breakout" 
  | "Pullback to support" 
  | "Trend continuation" 
  | "Swing reversal" 
  | "Flag pattern" 
  | "Cup and handle" 
  | "Higher high higher low";

export type SetupType = BTSTSetupType | StocksToWatchSetupType | SwingSetupType;

export interface TradeSetup {
  id: string;
  symbol: string;
  name: string;
  category: SetupCategory;
  setupType: SetupType;
  
  // The headline - what's happening?
  headline: string;
  
  // Why this is interesting (non-recommendatory)
  observation: string;
  
  // Key data points
  signals: {
    type: "price" | "volume" | "technical" | "candlestick" | "fundamental";
    name: string;
    value: string;
  }[];
  
  // Price data
  currentPrice: number;
  change: number;
  changePct: number;
  
  // Context
  sectorTrend: "bullish" | "bearish" | "neutral";
  marketContext: string;
  
  // Quality indicator (stars 1-5)
  signalStrength: 1 | 2 | 3 | 4 | 5;
  
  // Timestamp
  detectedAt: string;
}

// Mock trade setups data
const TRADE_SETUPS: TradeSetup[] = [
  // ===== BTST SETUPS =====
  // Strong momentum
  {
    id: "btst-1",
    symbol: "TATASTEEL",
    name: "Tata Steel",
    category: "btst",
    setupType: "Strong momentum",
    headline: "Breaking out with 3x average volume",
    observation: "TATASTEEL is showing strong momentum with price breaking above recent consolidation zone. Volume is 3.2x the 20-day average, indicating institutional participation. Metal sector is leading today's rally.",
    signals: [
      { type: "price", name: "Day's Range", value: "Up 3.8% from open" },
      { type: "volume", name: "Volume", value: "3.2x average" },
      { type: "technical", name: "RSI", value: "68 - Strong" },
      { type: "candlestick", name: "Pattern", value: "Bullish marubozu forming" },
    ],
    currentPrice: 143.50,
    change: 5.20,
    changePct: 3.76,
    sectorTrend: "bullish",
    marketContext: "Metal index +2.8% | Global steel prices firming",
    signalStrength: 5,
    detectedAt: new Date().toISOString(),
  },
  {
    id: "btst-2",
    symbol: "ADANIENT",
    name: "Adani Enterprises",
    category: "btst",
    setupType: "Strong momentum",
    headline: "Sharp recovery with heavy buying",
    observation: "ADANIENT showing strong recovery momentum after recent correction. Institutional buying visible with delivery percentage above 65%. Crossed above VWAP with strength.",
    signals: [
      { type: "price", name: "Recovery", value: "+4.2% from day's low" },
      { type: "volume", name: "Delivery %", value: "67% - High conviction" },
      { type: "technical", name: "VWAP", value: "Trading above VWAP" },
    ],
    currentPrice: 2485.00,
    change: 78.50,
    changePct: 3.26,
    sectorTrend: "neutral",
    marketContext: "Conglomerate stocks active | FII turning buyers",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Volume breakout
  {
    id: "btst-3",
    symbol: "TATAPOWER",
    name: "Tata Power",
    category: "btst",
    setupType: "Volume breakout",
    headline: "Volume spike at key resistance level",
    observation: "TATAPOWER witnessing unusual volume spike at ₹420 resistance. Today's volume already 2.5x average with 3 hours remaining. Power sector seeing renewed interest on green energy push.",
    signals: [
      { type: "volume", name: "Volume", value: "2.5x avg (still trading)" },
      { type: "price", name: "Resistance", value: "Testing ₹420 level" },
      { type: "technical", name: "OBV", value: "Making new highs" },
    ],
    currentPrice: 418.50,
    change: 12.30,
    changePct: 3.03,
    sectorTrend: "bullish",
    marketContext: "Power index outperforming | Solar capacity additions news",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Fresh breakout
  {
    id: "btst-4",
    symbol: "JINDALSTEL",
    name: "Jindal Steel",
    category: "btst",
    setupType: "Fresh breakout",
    headline: "Breaking 2-month high on steel demand",
    observation: "JINDALSTEL breaking above ₹680 resistance after 2 months. This is a fresh breakout with no overhead supply. Steel demand from infrastructure projects supporting the move.",
    signals: [
      { type: "price", name: "Breakout Level", value: "Crossed ₹680 (2-month high)" },
      { type: "volume", name: "Confirmation", value: "Volume expansion on breakout" },
      { type: "technical", name: "Range", value: "Breaking out of 8-week range" },
    ],
    currentPrice: 692.00,
    change: 24.50,
    changePct: 3.67,
    sectorTrend: "bullish",
    marketContext: "Steel sector rally | Infra spending boost",
    signalStrength: 5,
    detectedAt: new Date().toISOString(),
  },
  // Gap up
  {
    id: "btst-5",
    symbol: "TRENT",
    name: "Trent Ltd",
    category: "btst",
    setupType: "Gap up",
    headline: "Gapped up 2.5% on strong sales data",
    observation: "TRENT opened with a 2.5% gap up following strong same-store sales growth data. The gap is being sustained with buying interest. Retail sector sentiment positive.",
    signals: [
      { type: "price", name: "Gap", value: "2.5% opening gap" },
      { type: "volume", name: "Gap Fill", value: "No gap fill attempt yet" },
      { type: "fundamental", name: "News", value: "Strong sales growth reported" },
    ],
    currentPrice: 4850.00,
    change: 142.00,
    changePct: 3.01,
    sectorTrend: "bullish",
    marketContext: "Retail stocks in demand | Consumer spending robust",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Oversold bounce
  {
    id: "btst-6",
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    category: "btst",
    setupType: "Oversold bounce",
    headline: "Hammer candle at 200 EMA after 5-day decline",
    observation: "HDFCBANK formed a hammer candle right at its 200 EMA after 5 consecutive down days. RSI was at 28 (oversold) before today's bounce. FII data shows buying in banking today.",
    signals: [
      { type: "candlestick", name: "Pattern", value: "Hammer at support" },
      { type: "technical", name: "RSI", value: "Was 28, now 35" },
      { type: "technical", name: "Support", value: "200 EMA holding" },
      { type: "fundamental", name: "FII Flow", value: "₹850cr bought in banks" },
    ],
    currentPrice: 1632.00,
    change: 18.50,
    changePct: 1.15,
    sectorTrend: "neutral",
    marketContext: "Banking index at support | RBI policy supportive",
    signalStrength: 5,
    detectedAt: new Date().toISOString(),
  },
  
  // ===== STOCKS TO WATCH =====
  // Upcoming earnings
  {
    id: "watch-1",
    symbol: "BAJFINANCE",
    name: "Bajaj Finance",
    category: "stocks-to-watch",
    setupType: "Upcoming earnings",
    headline: "Reports Q3 results tomorrow",
    observation: "BAJFINANCE reports earnings tomorrow after market close. Street expectations are positive on AUM growth and asset quality. Options data shows elevated call buying at 7500 strike. Historically volatile 3-5% on results.",
    signals: [
      { type: "fundamental", name: "Results", value: "Tomorrow after market" },
      { type: "technical", name: "Options", value: "Call buying at 7500 strike" },
      { type: "price", name: "Pattern", value: "Consolidating before results" },
    ],
    currentPrice: 7280.00,
    change: 85.00,
    changePct: 1.18,
    sectorTrend: "bullish",
    marketContext: "NBFC sector strong | Credit growth robust",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  {
    id: "watch-2",
    symbol: "INFY",
    name: "Infosys",
    category: "stocks-to-watch",
    setupType: "Upcoming earnings",
    headline: "Q3 results this week - guidance focus",
    observation: "INFY reports Q3 numbers this week. Focus will be on FY24 guidance and large deal pipeline. IT sector has been under pressure but INFY showing relative strength. Consensus expects margin expansion.",
    signals: [
      { type: "fundamental", name: "Results", value: "This Thursday" },
      { type: "technical", name: "Relative Strength", value: "Outperforming IT index" },
      { type: "fundamental", name: "Focus", value: "Guidance and deal wins" },
    ],
    currentPrice: 1542.00,
    change: 28.00,
    changePct: 1.85,
    sectorTrend: "neutral",
    marketContext: "IT sector rotation starting | USD strength helps",
    signalStrength: 3,
    detectedAt: new Date().toISOString(),
  },
  // Sector leaders
  {
    id: "watch-3",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    category: "stocks-to-watch",
    setupType: "Sector leaders",
    headline: "Leading oil & gas rally on refining margins",
    observation: "RELIANCE leading the oil & gas sector with improving GRMs. Jio tariff hike expectations and retail expansion providing multiple triggers. Largest index weight, moves can impact Nifty direction.",
    signals: [
      { type: "fundamental", name: "GRM", value: "Gross refining margins improving" },
      { type: "fundamental", name: "Catalyst", value: "Jio tariff hike expected" },
      { type: "technical", name: "Trend", value: "Higher highs, higher lows" },
    ],
    currentPrice: 2935.00,
    change: 42.00,
    changePct: 1.45,
    sectorTrend: "bullish",
    marketContext: "Oil & Gas index +1.5% | Crude prices stable",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // New 52W high
  {
    id: "watch-4",
    symbol: "LTIM",
    name: "LTIMindtree",
    category: "stocks-to-watch",
    setupType: "New 52W high",
    headline: "Made fresh 52-week high today",
    observation: "LTIM touched a fresh 52-week high of ₹5,680 today. The stock has been in a steady uptrend and is showing no signs of exhaustion. IT midcaps outperforming large caps recently.",
    signals: [
      { type: "price", name: "52W High", value: "New high at ₹5,680" },
      { type: "volume", name: "Volume", value: "Above average on breakout" },
      { type: "technical", name: "Trend", value: "Strong uptrend intact" },
    ],
    currentPrice: 5645.00,
    change: 125.00,
    changePct: 2.26,
    sectorTrend: "bullish",
    marketContext: "IT midcaps outperforming | Deal wins strong",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Fundamental picks
  {
    id: "watch-5",
    symbol: "COALINDIA",
    name: "Coal India",
    category: "stocks-to-watch",
    setupType: "Fundamental picks",
    headline: "Trading near 52W low with 7% dividend yield",
    observation: "COALINDIA trading at depressed valuations near 52-week lows. Dividend yield of 7.2% is attractive for income investors. Summer demand approaching and production targets on track. PSU re-rating theme active.",
    signals: [
      { type: "fundamental", name: "Dividend Yield", value: "7.2% - Very attractive" },
      { type: "price", name: "Valuation", value: "Near 52W low" },
      { type: "fundamental", name: "Seasonality", value: "Summer demand ahead" },
    ],
    currentPrice: 388.00,
    change: 4.50,
    changePct: 1.17,
    sectorTrend: "neutral",
    marketContext: "PSU theme active | Energy demand rising",
    signalStrength: 3,
    detectedAt: new Date().toISOString(),
  },
  // Breakout watchlist
  {
    id: "watch-6",
    symbol: "PAGEIND",
    name: "Page Industries",
    category: "stocks-to-watch",
    setupType: "Breakout watchlist",
    headline: "Coiling near ₹42,000 resistance",
    observation: "PAGEIND consolidating just below ₹42,000 resistance for 3 weeks. A breakout above this level would be significant. Volume has been contracting, setting up for a potential expansion move.",
    signals: [
      { type: "price", name: "Resistance", value: "₹42,000 (3-week test)" },
      { type: "volume", name: "Pattern", value: "Volume contracting - coiling" },
      { type: "technical", name: "Watch Level", value: "Break above ₹42,200" },
    ],
    currentPrice: 41850.00,
    change: 320.00,
    changePct: 0.77,
    sectorTrend: "bullish",
    marketContext: "Consumer discretionary strong | Summer season approaching",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  
  // ===== SWING TRADING IDEAS =====
  // Consolidation breakout
  {
    id: "swing-1",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    category: "swing",
    setupType: "Consolidation breakout",
    headline: "Breaking 3-week consolidation with volume",
    observation: "RELIANCE built a tight base between ₹2,850-2,920 for 3 weeks. Today's move above ₹2,920 with 1.8x volume expansion signals the potential start of a new leg. Classic VCP (Volatility Contraction Pattern) setup.",
    signals: [
      { type: "price", name: "Base", value: "3-week tight consolidation" },
      { type: "volume", name: "Expansion", value: "1.8x on breakout day" },
      { type: "technical", name: "Pattern", value: "VCP - Volatility Contraction" },
      { type: "technical", name: "MACD", value: "Bullish crossover" },
    ],
    currentPrice: 2935.00,
    change: 42.00,
    changePct: 1.45,
    sectorTrend: "bullish",
    marketContext: "Nifty at ATH | Large caps leading",
    signalStrength: 5,
    detectedAt: new Date().toISOString(),
  },
  {
    id: "swing-2",
    symbol: "HINDUNILVR",
    name: "Hindustan Unilever",
    category: "swing",
    setupType: "Consolidation breakout",
    headline: "Breaking 6-week base near all-time high",
    observation: "HUL has been consolidating in a tight range for 6 weeks just below its ATH. The range contraction indicates accumulation. FMCG sector showing renewed strength with rural recovery theme.",
    signals: [
      { type: "price", name: "Base Duration", value: "6 weeks near ATH" },
      { type: "volume", name: "Pattern", value: "Decreasing volume in base" },
      { type: "technical", name: "Distance to ATH", value: "Just 2% below" },
    ],
    currentPrice: 2580.00,
    change: 35.00,
    changePct: 1.37,
    sectorTrend: "bullish",
    marketContext: "FMCG sector strengthening | Rural demand recovering",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Pullback to support
  {
    id: "swing-3",
    symbol: "TITAN",
    name: "Titan Company",
    category: "swing",
    setupType: "Pullback to support",
    headline: "Pulled back 8% to rising 50 EMA",
    observation: "TITAN has pulled back 8% from highs to its rising 50 EMA - historically a high-probability bounce zone. The stock has bounced from this level 4 times in the past year. Wedding season demand provides fundamental support.",
    signals: [
      { type: "technical", name: "Support", value: "50 EMA at ₹3,420" },
      { type: "price", name: "Pullback", value: "8% from recent high" },
      { type: "technical", name: "History", value: "Bounced from 50 EMA 4x this year" },
      { type: "fundamental", name: "Seasonality", value: "Wedding season peak" },
    ],
    currentPrice: 3445.00,
    change: 52.00,
    changePct: 1.53,
    sectorTrend: "bullish",
    marketContext: "Consumption theme strong | Gold prices stable",
    signalStrength: 5,
    detectedAt: new Date().toISOString(),
  },
  {
    id: "swing-4",
    symbol: "ASIANPAINT",
    name: "Asian Paints",
    category: "swing",
    setupType: "Pullback to support",
    headline: "Testing 200 DMA support zone",
    observation: "ASIANPAINT corrected 12% and is now testing its 200 DMA support. This is a key level watched by institutions. The sector faced headwinds but valuations becoming attractive at these levels.",
    signals: [
      { type: "technical", name: "Support", value: "200 DMA at ₹2,860" },
      { type: "price", name: "Correction", value: "Down 12% from high" },
      { type: "technical", name: "RSI", value: "38 - Approaching oversold" },
    ],
    currentPrice: 2875.00,
    change: 15.00,
    changePct: 0.52,
    sectorTrend: "neutral",
    marketContext: "Paint sector mixed | Input costs stabilizing",
    signalStrength: 3,
    detectedAt: new Date().toISOString(),
  },
  // Trend continuation
  {
    id: "swing-5",
    symbol: "BHARTIARTL",
    name: "Bharti Airtel",
    category: "swing",
    setupType: "Trend continuation",
    headline: "Strong uptrend with 20 EMA support holding",
    observation: "BHARTIARTL in a powerful uptrend, consistently finding support at its rising 20 EMA. Each dip to 20 EMA has led to new highs. Telecom sector benefiting from tariff hike cycle and subscriber additions.",
    signals: [
      { type: "technical", name: "Trend", value: "Strong uptrend since 6 months" },
      { type: "technical", name: "Support", value: "20 EMA acting as floor" },
      { type: "fundamental", name: "Catalyst", value: "Tariff hikes + ARPU growth" },
    ],
    currentPrice: 1585.00,
    change: 28.00,
    changePct: 1.80,
    sectorTrend: "bullish",
    marketContext: "Telecom sector strong | Industry consolidation benefits",
    signalStrength: 5,
    detectedAt: new Date().toISOString(),
  },
  // Swing reversal
  {
    id: "swing-6",
    symbol: "SBIN",
    name: "State Bank of India",
    category: "swing",
    setupType: "Swing reversal",
    headline: "Bullish engulfing at demand zone",
    observation: "SBIN formed a bullish engulfing candle at a key demand zone (₹760-770). This zone has acted as support multiple times. PSU banks showing renewed buying interest with credit growth strong.",
    signals: [
      { type: "candlestick", name: "Pattern", value: "Bullish engulfing" },
      { type: "price", name: "Demand Zone", value: "₹760-770 support" },
      { type: "technical", name: "RSI", value: "Positive divergence forming" },
    ],
    currentPrice: 785.00,
    change: 18.00,
    changePct: 2.35,
    sectorTrend: "bullish",
    marketContext: "PSU banks in demand | NIM stable, credit growth strong",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Flag pattern
  {
    id: "swing-7",
    symbol: "POWERGRID",
    name: "Power Grid Corp",
    category: "swing",
    setupType: "Flag pattern",
    headline: "Bull flag forming after sharp rally",
    observation: "POWERGRID rallied 15% and is now forming a clean bull flag pattern. The flagpole was formed on strong volume, and the consolidation is on lower volume. Classic continuation setup if it breaks the flag.",
    signals: [
      { type: "price", name: "Pattern", value: "Bull flag consolidation" },
      { type: "volume", name: "Confirmation", value: "Low volume in flag" },
      { type: "technical", name: "Flagpole", value: "15% rally preceded this" },
    ],
    currentPrice: 298.00,
    change: 4.50,
    changePct: 1.53,
    sectorTrend: "bullish",
    marketContext: "Power sector theme | Infrastructure spending",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Cup and handle
  {
    id: "swing-8",
    symbol: "MARUTI",
    name: "Maruti Suzuki",
    category: "swing",
    setupType: "Cup and handle",
    headline: "Cup and handle forming over 3 months",
    observation: "MARUTI appears to be forming a cup and handle pattern over the last 3 months. The cup depth is about 12% and the handle is forming with lower volume. Auto sector seeing positive momentum on festive demand.",
    signals: [
      { type: "price", name: "Pattern", value: "Cup & Handle (3 months)" },
      { type: "technical", name: "Cup Depth", value: "~12% correction" },
      { type: "volume", name: "Handle", value: "Low volume consolidation" },
    ],
    currentPrice: 12450.00,
    change: 185.00,
    changePct: 1.51,
    sectorTrend: "bullish",
    marketContext: "Auto sector recovery | Festive demand strong",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
  // Higher high higher low
  {
    id: "swing-9",
    symbol: "BAJAJ-AUTO",
    name: "Bajaj Auto",
    category: "swing",
    setupType: "Higher high higher low",
    headline: "Clean HH-HL structure over 2 months",
    observation: "BAJAJ-AUTO showing textbook higher highs and higher lows structure for 2 months. Each pullback has been shallower than the previous one, indicating strong underlying demand. Export recovery adding to strength.",
    signals: [
      { type: "technical", name: "Structure", value: "HH-HL for 8 weeks" },
      { type: "price", name: "Pullbacks", value: "Getting shallower" },
      { type: "fundamental", name: "Catalyst", value: "Export recovery" },
    ],
    currentPrice: 9250.00,
    change: 145.00,
    changePct: 1.59,
    sectorTrend: "bullish",
    marketContext: "Two-wheeler demand strong | Rural recovery",
    signalStrength: 4,
    detectedAt: new Date().toISOString(),
  },
];

// Get setups by category
export function getSetupsByCategory(category: SetupCategory): TradeSetup[] {
  return TRADE_SETUPS.filter(setup => setup.category === category);
}

// Get setups by type
export function getSetupsByType(setupType: SetupType): TradeSetup[] {
  return TRADE_SETUPS.filter(setup => setup.setupType === setupType);
}

// Get setups by category and type
export function getSetups(category?: SetupCategory, setupType?: SetupType): TradeSetup[] {
  let setups = [...TRADE_SETUPS];
  if (category) {
    setups = setups.filter(s => s.category === category);
  }
  if (setupType) {
    setups = setups.filter(s => s.setupType === setupType);
  }
  return setups;
}

// Get count of setups by type
export function getSetupCountByType(setupType: SetupType): number {
  return TRADE_SETUPS.filter(setup => setup.setupType === setupType).length;
}

// ========== SCANNER STUDIO DATA (VIEW 7) ==========

export type ScannerIntent = 
  | "momentum" 
  | "pullback" 
  | "volume" 
  | "patterns" 
  | "fundamentals" 
  | "intraday";

export type TimeHorizonFilter = "all" | "intraday" | "btst" | "swing" | "positional";

/** Display category for segregating screeners in Jayesh view */
export type ScannerDisplayCategory = "price" | "indicators" | "patterns" | "candlesticks" | "volume" | "fundamentals";

export interface Scanner {
  id: string;
  name: string;
  shortName: string;
  intent: ScannerIntent;
  description: string;
  /** Segregation: Price, Indicators, Patterns, Candlesticks, Volume, Fundamentals */
  displayCategory: ScannerDisplayCategory;
  
  // What trading styles this works for
  timeHorizons: ("intraday" | "btst" | "swing" | "positional")[];
  
  // Live results
  matchCount: number;
  stocks: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    matchStrength: "strong" | "moderate" | "weak"; // how well it matches
  }[];
  
  // Market context
  worksWellIn: ("trending" | "ranging" | "volatile" | "any")[];
  currentlyEffective: boolean; // Based on market regime
  
  // Popularity/usage
  popularityRank: number;
  usersToday: number;
  
  // Metadata
  isNew?: boolean;
  isPremium?: boolean;
}

export interface ScannerCategory {
  id: ScannerIntent;
  name: string;
  icon: string;
  description: string;
  color: string; // For visual distinction
}

export const SCANNER_CATEGORIES: ScannerCategory[] = [
  {
    id: "momentum",
    name: "Momentum & Breakouts",
    icon: "🚀",
    description: "Stocks showing strength and breaking out",
    color: "emerald",
  },
  {
    id: "pullback",
    name: "Pullback & Reversal",
    icon: "📉",
    description: "Stocks that might be turning around",
    color: "blue",
  },
  {
    id: "volume",
    name: "Volume & Accumulation",
    icon: "📊",
    description: "Smart money activity signals",
    color: "purple",
  },
  {
    id: "patterns",
    name: "Pattern Recognition",
    icon: "🎯",
    description: "Classic chart patterns forming",
    color: "amber",
  },
  {
    id: "fundamentals",
    name: "Value & Fundamentals",
    icon: "💰",
    description: "Fundamentally attractive stocks",
    color: "teal",
  },
  {
    id: "intraday",
    name: "Intraday Specific",
    icon: "⚡",
    description: "For same-day trades only",
    color: "rose",
  },
];

// Mock scanner data
const SCANNERS_DATA: Scanner[] = [
  // ===== MOMENTUM & BREAKOUTS =====
  {
    id: "fresh-52w-high",
    name: "Fresh 52-Week Highs",
    shortName: "52W Highs",
    intent: "momentum",
    description: "Stocks making new 52-week highs today",
    displayCategory: "price",
    timeHorizons: ["swing", "positional"],
    matchCount: 18,
    stocks: [
      { symbol: "LTIM", name: "LTIMindtree", price: 5645, change: 125, changePct: 2.26, matchStrength: "strong" },
      { symbol: "PERSISTENT", name: "Persistent Sys", price: 4820, change: 95, changePct: 2.01, matchStrength: "strong" },
      { symbol: "COFORGE", name: "Coforge Ltd", price: 5280, change: 78, changePct: 1.50, matchStrength: "moderate" },
      { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1585, change: 28, changePct: 1.80, matchStrength: "strong" },
    ],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 1,
    usersToday: 1250,
  },
  {
    id: "consolidation-breakout",
    name: "Consolidation Breakout",
    shortName: "Base Breakout",
    intent: "momentum",
    description: "Breaking out of tight consolidation with volume",
    displayCategory: "patterns",
    timeHorizons: ["swing", "positional"],
    matchCount: 8,
    stocks: [
      { symbol: "RELIANCE", name: "Reliance Industries", price: 2935, change: 42, changePct: 1.45, matchStrength: "strong" },
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", price: 2580, change: 35, changePct: 1.37, matchStrength: "moderate" },
      { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7280, change: 85, changePct: 1.18, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending", "ranging"],
    currentlyEffective: true,
    popularityRank: 2,
    usersToday: 980,
  },
  {
    id: "rs-leaders",
    name: "Relative Strength Leaders",
    shortName: "RS Leaders",
    intent: "momentum",
    description: "Outperforming Nifty by 2%+ over 20 days",
    displayCategory: "indicators",
    timeHorizons: ["swing", "positional"],
    matchCount: 24,
    stocks: [
      { symbol: "TRENT", name: "Trent Ltd", price: 4850, change: 142, changePct: 3.01, matchStrength: "strong" },
      { symbol: "ZOMATO", name: "Zomato Ltd", price: 185, change: 8.5, changePct: 4.81, matchStrength: "strong" },
      { symbol: "ADANIGREEN", name: "Adani Green", price: 1245, change: 35, changePct: 2.89, matchStrength: "strong" },
    ],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 3,
    usersToday: 756,
  },
  {
    id: "gap-up-holding",
    name: "Gap Ups Holding Gains",
    shortName: "Gap & Go",
    intent: "momentum",
    description: "Gapped up and sustaining above gap level",
    displayCategory: "price",
    timeHorizons: ["intraday", "btst", "swing"],
    matchCount: 12,
    stocks: [
      { symbol: "TRENT", name: "Trent Ltd", price: 4850, change: 142, changePct: 3.01, matchStrength: "strong" },
      { symbol: "SBILIFE", name: "SBI Life Insurance", price: 1485, change: 38, changePct: 2.62, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending", "volatile"],
    currentlyEffective: true,
    popularityRank: 5,
    usersToday: 620,
    isNew: true,
  },
  {
    id: "ath-breakout",
    name: "All-Time High Breakout",
    shortName: "ATH Break",
    intent: "momentum",
    description: "Breaking above all-time highs",
    displayCategory: "price",
    timeHorizons: ["swing", "positional"],
    matchCount: 5,
    stocks: [
      { symbol: "LTIM", name: "LTIMindtree", price: 5645, change: 125, changePct: 2.26, matchStrength: "strong" },
      { symbol: "DMART", name: "Avenue Supermarts", price: 4125, change: 85, changePct: 2.10, matchStrength: "strong" },
    ],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 4,
    usersToday: 540,
  },
  
  // ===== PULLBACK & REVERSAL =====
  {
    id: "pullback-20ema",
    name: "Pullback to 20 EMA",
    shortName: "20 EMA Pull",
    intent: "pullback",
    description: "Uptrending stocks pulling back to 20 EMA support",
    displayCategory: "indicators",
    timeHorizons: ["swing"],
    matchCount: 15,
    stocks: [
      { symbol: "TITAN", name: "Titan Company", price: 3445, change: 52, changePct: 1.53, matchStrength: "strong" },
      { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", price: 9250, change: 145, changePct: 1.59, matchStrength: "strong" },
      { symbol: "NESTLEIND", name: "Nestle India", price: 2485, change: 28, changePct: 1.14, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 6,
    usersToday: 890,
  },
  {
    id: "pullback-50ema",
    name: "Pullback to 50 EMA",
    shortName: "50 EMA Pull",
    intent: "pullback",
    description: "Deeper pullback to 50 EMA in uptrend",
    displayCategory: "indicators",
    timeHorizons: ["swing", "positional"],
    matchCount: 22,
    stocks: [
      { symbol: "ASIANPAINT", name: "Asian Paints", price: 2875, change: 15, changePct: 0.52, matchStrength: "moderate" },
      { symbol: "PIDILITIND", name: "Pidilite Industries", price: 2680, change: 22, changePct: 0.83, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending", "ranging"],
    currentlyEffective: true,
    popularityRank: 8,
    usersToday: 645,
  },
  {
    id: "oversold-bounce",
    name: "Oversold RSI Bounce",
    shortName: "RSI Bounce",
    intent: "pullback",
    description: "RSI crossed above 30 from oversold territory",
    displayCategory: "indicators",
    timeHorizons: ["swing"],
    matchCount: 9,
    stocks: [
      { symbol: "HDFCBANK", name: "HDFC Bank", price: 1632, change: 18.5, changePct: 1.15, matchStrength: "strong" },
      { symbol: "INDUSINDBK", name: "IndusInd Bank", price: 1425, change: 32, changePct: 2.30, matchStrength: "strong" },
    ],
    worksWellIn: ["ranging", "volatile"],
    currentlyEffective: true,
    popularityRank: 10,
    usersToday: 520,
  },
  {
    id: "support-test",
    name: "Support Zone Test",
    shortName: "Support Test",
    intent: "pullback",
    description: "Testing major support with signs of holding",
    displayCategory: "patterns",
    timeHorizons: ["swing", "positional"],
    matchCount: 11,
    stocks: [
      { symbol: "SBIN", name: "State Bank of India", price: 785, change: 18, changePct: 2.35, matchStrength: "strong" },
      { symbol: "ICICIBANK", name: "ICICI Bank", price: 1085, change: 12, changePct: 1.12, matchStrength: "moderate" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 12,
    usersToday: 480,
  },
  {
    id: "bullish-divergence",
    name: "Bullish RSI Divergence",
    shortName: "Bull Divergence",
    intent: "pullback",
    description: "Price making lower lows, RSI making higher lows",
    displayCategory: "indicators",
    timeHorizons: ["swing", "positional"],
    matchCount: 6,
    stocks: [
      { symbol: "DRREDDY", name: "Dr. Reddy's Labs", price: 5840, change: 65, changePct: 1.13, matchStrength: "strong" },
      { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1185, change: 18, changePct: 1.54, matchStrength: "moderate" },
    ],
    worksWellIn: ["ranging", "volatile"],
    currentlyEffective: false, // Less effective in current trending market
    popularityRank: 15,
    usersToday: 320,
  },
  {
    id: "macd-crossover-1d",
    name: "MACD Crossover in Last 30 Days (1 Day)",
    shortName: "MACD Cross 1D",
    intent: "momentum",
    description: "Bullish MACD crossover in the last 30 days on daily chart",
    displayCategory: "indicators",
    timeHorizons: ["swing", "positional"],
    matchCount: 0,
    stocks: [],
    worksWellIn: ["trending", "ranging"],
    currentlyEffective: true,
    popularityRank: 16,
    usersToday: 280,
  },
  {
    id: "macd-crossover-1mo",
    name: "MACD Crossover in Last 30 Days (1 Month)",
    shortName: "MACD Cross 1M",
    intent: "momentum",
    description: "Bullish MACD crossover in the last 30 months on monthly chart",
    displayCategory: "indicators",
    timeHorizons: ["positional"],
    matchCount: 0,
    stocks: [],
    worksWellIn: ["trending", "ranging"],
    currentlyEffective: true,
    popularityRank: 17,
    usersToday: 260,
  },
  {
    id: "bullish-cross-building-negative",
    name: "Bullish Cross Building (Negative)",
    shortName: "Bull Building Neg",
    intent: "pullback",
    description: "MACD & Signal negative, histogram improving on 1 Month interval",
    displayCategory: "indicators",
    timeHorizons: ["positional"],
    matchCount: 0,
    stocks: [],
    worksWellIn: ["ranging", "volatile"],
    currentlyEffective: true,
    popularityRank: 18,
    usersToday: 240,
  },
  {
    id: "bullish-cross-building-positive",
    name: "Bullish Cross Building (Positive)",
    shortName: "Bull Building Pos",
    intent: "pullback",
    description: "MACD & Signal positive, histogram rising on 1 Month interval",
    displayCategory: "indicators",
    timeHorizons: ["positional"],
    matchCount: 0,
    stocks: [],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 19,
    usersToday: 220,
  },

  // ===== VOLUME & ACCUMULATION =====
  {
    id: "volume-spike",
    name: "Unusual Volume Spike",
    shortName: "Vol Spike",
    intent: "volume",
    description: "Volume 3x+ average with price up",
    displayCategory: "volume",
    timeHorizons: ["intraday", "btst", "swing"],
    matchCount: 14,
    stocks: [
      { symbol: "TATASTEEL", name: "Tata Steel", price: 143.5, change: 5.2, changePct: 3.76, matchStrength: "strong" },
      { symbol: "JSWSTEEL", name: "JSW Steel", price: 892, change: 28, changePct: 3.24, matchStrength: "strong" },
      { symbol: "HINDALCO", name: "Hindalco", price: 548, change: 15, changePct: 2.82, matchStrength: "moderate" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 7,
    usersToday: 1120,
  },
  {
    id: "high-delivery",
    name: "High Delivery Percentage",
    shortName: "High Delivery",
    intent: "volume",
    description: "Delivery % above 70% indicating strong hands buying",
    displayCategory: "volume",
    timeHorizons: ["swing"],
    matchCount: 19,
    stocks: [
      { symbol: "ADANIENT", name: "Adani Enterprises", price: 2485, change: 78.5, changePct: 3.26, matchStrength: "strong" },
      { symbol: "ADANIPORTS", name: "Adani Ports", price: 1285, change: 32, changePct: 2.55, matchStrength: "strong" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 9,
    usersToday: 780,
  },
  {
    id: "volume-breakout",
    name: "Volume Breakout",
    shortName: "Vol Breakout",
    intent: "volume",
    description: "Price breakout confirmed with volume expansion",
    displayCategory: "volume",
    timeHorizons: ["swing"],
    matchCount: 7,
    stocks: [
      { symbol: "TATAPOWER", name: "Tata Power", price: 418.5, change: 12.3, changePct: 3.03, matchStrength: "strong" },
      { symbol: "POWERGRID", name: "Power Grid Corp", price: 298, change: 4.5, changePct: 1.53, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 11,
    usersToday: 620,
  },
  {
    id: "accumulation-pattern",
    name: "Accumulation Phase",
    shortName: "Accumulating",
    intent: "volume",
    description: "Low volatility + increasing volume = smart money accumulating",
    displayCategory: "volume",
    timeHorizons: ["positional"],
    matchCount: 8,
    stocks: [
      { symbol: "COALINDIA", name: "Coal India", price: 388, change: 4.5, changePct: 1.17, matchStrength: "moderate" },
      { symbol: "ONGC", name: "ONGC", price: 265, change: 3.2, changePct: 1.22, matchStrength: "moderate" },
    ],
    worksWellIn: ["ranging"],
    currentlyEffective: true,
    popularityRank: 18,
    usersToday: 285,
    isPremium: true,
  },
  
  // ===== PATTERN RECOGNITION =====
  {
    id: "bullish-engulfing",
    name: "Bullish Engulfing",
    shortName: "Engulfing",
    intent: "patterns",
    description: "Bullish engulfing candle at support",
    displayCategory: "candlesticks",
    timeHorizons: ["swing"],
    matchCount: 11,
    stocks: [
      { symbol: "SBIN", name: "State Bank of India", price: 785, change: 18, changePct: 2.35, matchStrength: "strong" },
      { symbol: "BANKBARODA", name: "Bank of Baroda", price: 265, change: 8, changePct: 3.11, matchStrength: "strong" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 13,
    usersToday: 560,
  },
  {
    id: "morning-star",
    name: "Morning Star Pattern",
    shortName: "Morning Star",
    intent: "patterns",
    description: "Three-candle bullish reversal pattern",
    displayCategory: "candlesticks",
    timeHorizons: ["swing", "positional"],
    matchCount: 4,
    stocks: [
      { symbol: "CIPLA", name: "Cipla Ltd", price: 1245, change: 22, changePct: 1.80, matchStrength: "strong" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 20,
    usersToday: 245,
  },
  {
    id: "cup-handle",
    name: "Cup and Handle Forming",
    shortName: "Cup & Handle",
    intent: "patterns",
    description: "Classic cup and handle pattern developing",
    displayCategory: "patterns",
    timeHorizons: ["swing", "positional"],
    matchCount: 6,
    stocks: [
      { symbol: "MARUTI", name: "Maruti Suzuki", price: 12450, change: 185, changePct: 1.51, matchStrength: "strong" },
      { symbol: "M&M", name: "Mahindra & Mahindra", price: 1685, change: 28, changePct: 1.69, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending", "ranging"],
    currentlyEffective: true,
    popularityRank: 14,
    usersToday: 485,
  },
  {
    id: "flag-pennant",
    name: "Flag/Pennant Pattern",
    shortName: "Flag Pattern",
    intent: "patterns",
    description: "Continuation pattern after strong move",
    displayCategory: "patterns",
    timeHorizons: ["swing"],
    matchCount: 9,
    stocks: [
      { symbol: "POWERGRID", name: "Power Grid Corp", price: 298, change: 4.5, changePct: 1.53, matchStrength: "strong" },
      { symbol: "NTPC", name: "NTPC Ltd", price: 365, change: 8, changePct: 2.24, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 16,
    usersToday: 380,
  },
  {
    id: "double-bottom",
    name: "Double Bottom",
    shortName: "W Pattern",
    intent: "patterns",
    description: "Classic double bottom reversal pattern",
    displayCategory: "patterns",
    timeHorizons: ["swing", "positional"],
    matchCount: 5,
    stocks: [
      { symbol: "TATAMOTORS", name: "Tata Motors", price: 985, change: 22, changePct: 2.28, matchStrength: "moderate" },
    ],
    worksWellIn: ["ranging"],
    currentlyEffective: false, // Less common in current uptrend
    popularityRank: 22,
    usersToday: 195,
  },
  
  // ===== VALUE & FUNDAMENTALS =====
  {
    id: "low-pe-growth",
    name: "Low PE + High Growth",
    shortName: "Value Growth",
    intent: "fundamentals",
    description: "PE below 15 with 20%+ earnings growth",
    displayCategory: "fundamentals",
    timeHorizons: ["swing"],
    matchCount: 12,
    stocks: [
      { symbol: "COALINDIA", name: "Coal India", price: 388, change: 4.5, changePct: 1.17, matchStrength: "strong" },
      { symbol: "ONGC", name: "ONGC", price: 265, change: 3.2, changePct: 1.22, matchStrength: "strong" },
      { symbol: "NTPC", name: "NTPC Ltd", price: 365, change: 8, changePct: 2.24, matchStrength: "moderate" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 17,
    usersToday: 420,
  },
  {
    id: "high-dividend",
    name: "High Dividend Yield",
    shortName: "Dividend Yield",
    intent: "fundamentals",
    description: "Dividend yield above 4% with stable payout",
    displayCategory: "fundamentals",
    timeHorizons: ["swing"],
    matchCount: 15,
    stocks: [
      { symbol: "COALINDIA", name: "Coal India", price: 388, change: 4.5, changePct: 1.17, matchStrength: "strong" },
      { symbol: "VEDL", name: "Vedanta Ltd", price: 445, change: 8, changePct: 1.83, matchStrength: "strong" },
      { symbol: "HINDPETRO", name: "HPCL", price: 385, change: 5, changePct: 1.32, matchStrength: "moderate" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 19,
    usersToday: 380,
  },
  {
    id: "promoter-buying",
    name: "Promoter Buying",
    shortName: "Promoter Buy",
    intent: "fundamentals",
    description: "Promoters increasing stake in last quarter",
    displayCategory: "fundamentals",
    timeHorizons: ["swing"],
    matchCount: 8,
    stocks: [
      { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", price: 9250, change: 145, changePct: 1.59, matchStrength: "strong" },
      { symbol: "WIPRO", name: "Wipro Ltd", price: 485, change: 8, changePct: 1.68, matchStrength: "moderate" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 21,
    usersToday: 295,
    isPremium: true,
  },
  {
    id: "fii-dii-buying",
    name: "FII + DII Accumulation",
    shortName: "FII/DII Buy",
    intent: "fundamentals",
    description: "Both FIIs and DIIs increasing stake",
    displayCategory: "fundamentals",
    timeHorizons: ["swing"],
    matchCount: 6,
    stocks: [
      { symbol: "RELIANCE", name: "Reliance Industries", price: 2935, change: 42, changePct: 1.45, matchStrength: "strong" },
      { symbol: "ICICIBANK", name: "ICICI Bank", price: 1085, change: 12, changePct: 1.12, matchStrength: "moderate" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 23,
    usersToday: 265,
    isPremium: true,
  },
  {
    id: "earnings-surprise",
    name: "Positive Earnings Surprise",
    shortName: "Beat Estimates",
    intent: "fundamentals",
    description: "Beat earnings estimates by 10%+ recently",
    displayCategory: "fundamentals",
    timeHorizons: ["swing"],
    matchCount: 10,
    stocks: [
      { symbol: "TRENT", name: "Trent Ltd", price: 4850, change: 142, changePct: 3.01, matchStrength: "strong" },
      { symbol: "ZOMATO", name: "Zomato Ltd", price: 185, change: 8.5, changePct: 4.81, matchStrength: "strong" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 24,
    usersToday: 225,
    isNew: true,
  },
  
  // ===== INTRADAY SPECIFIC =====
  {
    id: "orb-breakout",
    name: "Opening Range Breakout",
    shortName: "ORB",
    intent: "intraday",
    description: "Breaking above first 15-min high with volume",
    displayCategory: "price",
    timeHorizons: ["intraday", "btst"],
    matchCount: 23,
    stocks: [
      { symbol: "TATASTEEL", name: "Tata Steel", price: 143.5, change: 5.2, changePct: 3.76, matchStrength: "strong" },
      { symbol: "JSWSTEEL", name: "JSW Steel", price: 892, change: 28, changePct: 3.24, matchStrength: "strong" },
      { symbol: "HINDALCO", name: "Hindalco", price: 548, change: 15, changePct: 2.82, matchStrength: "strong" },
    ],
    worksWellIn: ["trending", "volatile"],
    currentlyEffective: true,
    popularityRank: 1,
    usersToday: 1850,
  },
  {
    id: "vwap-reclaim",
    name: "VWAP Reclaim",
    shortName: "VWAP Reclaim",
    intent: "intraday",
    description: "Crossed above VWAP with momentum",
    displayCategory: "indicators",
    timeHorizons: ["intraday", "btst"],
    matchCount: 31,
    stocks: [
      { symbol: "ADANIENT", name: "Adani Enterprises", price: 2485, change: 78.5, changePct: 3.26, matchStrength: "strong" },
      { symbol: "TATAPOWER", name: "Tata Power", price: 418.5, change: 12.3, changePct: 3.03, matchStrength: "strong" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 2,
    usersToday: 1620,
  },
  {
    id: "first-hour-high",
    name: "First Hour High Break",
    shortName: "1H High Break",
    intent: "intraday",
    description: "Breaking above first hour high",
    displayCategory: "price",
    timeHorizons: ["intraday", "btst"],
    matchCount: 18,
    stocks: [
      { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7280, change: 85, changePct: 1.18, matchStrength: "strong" },
      { symbol: "SBILIFE", name: "SBI Life Insurance", price: 1485, change: 38, changePct: 2.62, matchStrength: "moderate" },
    ],
    worksWellIn: ["trending"],
    currentlyEffective: true,
    popularityRank: 4,
    usersToday: 980,
  },
  {
    id: "premarket-movers",
    name: "Pre-Market Movers",
    shortName: "Pre-Market",
    intent: "intraday",
    description: "Significant pre-market activity",
    displayCategory: "price",
    timeHorizons: ["intraday", "btst"],
    matchCount: 12,
    stocks: [
      { symbol: "TRENT", name: "Trent Ltd", price: 4850, change: 142, changePct: 3.01, matchStrength: "strong" },
      { symbol: "TATASTEEL", name: "Tata Steel", price: 143.5, change: 5.2, changePct: 3.76, matchStrength: "strong" },
    ],
    worksWellIn: ["any"],
    currentlyEffective: true,
    popularityRank: 6,
    usersToday: 1450,
  },
  {
    id: "high-intraday-range",
    name: "High Intraday Range",
    shortName: "High Range",
    intent: "intraday",
    description: "Today's range significantly above average",
    displayCategory: "volume",
    timeHorizons: ["intraday", "btst"],
    matchCount: 28,
    stocks: [
      { symbol: "ADANIENT", name: "Adani Enterprises", price: 2485, change: 78.5, changePct: 3.26, matchStrength: "strong" },
      { symbol: "ZOMATO", name: "Zomato Ltd", price: 185, change: 8.5, changePct: 4.81, matchStrength: "strong" },
      { symbol: "PAYTM", name: "One97 Communications", price: 485, change: 22, changePct: 4.75, matchStrength: "strong" },
    ],
    worksWellIn: ["volatile"],
    currentlyEffective: true,
    popularityRank: 8,
    usersToday: 890,
  },
];

// Get all scanners
export function getScanners(): Scanner[] {
  return SCANNERS_DATA;
}

// Get scanners by intent
export function getScannersByIntent(intent: ScannerIntent): Scanner[] {
  return SCANNERS_DATA.filter(s => s.intent === intent);
}

// Get scanners filtered by time horizon
export function getScannersByTimeHorizon(horizon: TimeHorizonFilter): Scanner[] {
  if (horizon === "all") return SCANNERS_DATA;
  return SCANNERS_DATA.filter(s => s.timeHorizons.includes(horizon as any));
}

// Pill style for Jayesh view (Intraday, BTST, Swing, Positional)
export type JayeshPillStyle = "intraday" | "btst" | "swing" | "positional";

export function getScannersByJayeshPill(style: JayeshPillStyle): Scanner[] {
  return getScannersByTimeHorizon(style);
}

// Display category order and labels for Jayesh segregation
export const DISPLAY_CATEGORY_ORDER: ScannerDisplayCategory[] = [
  "indicators",
  "patterns",
  "volume",
  "price",
  "candlesticks",
  "fundamentals",
];

export const DISPLAY_CATEGORY_LABELS: Record<ScannerDisplayCategory, string> = {
  price: "Price",
  indicators: "Indicators",
  patterns: "Patterns",
  candlesticks: "Candlesticks",
  volume: "Volume",
  fundamentals: "Fundamentals",
};

// Get popular scanners
export function getPopularScanners(limit: number = 10): Scanner[] {
  return [...SCANNERS_DATA]
    .sort((a, b) => a.popularityRank - b.popularityRank)
    .slice(0, limit);
}

// Get currently effective scanners
export function getEffectiveScanners(): Scanner[] {
  return SCANNERS_DATA.filter(s => s.currentlyEffective);
}

// Get total matches across all scanners
export function getTotalScannerMatches(): number {
  return SCANNERS_DATA.reduce((sum, s) => sum + s.matchCount, 0);
}

// Get scanner category stats
export function getScannerCategoryStats(): { category: ScannerCategory; count: number; totalMatches: number }[] {
  return SCANNER_CATEGORIES.map(cat => {
    const scanners = getScannersByIntent(cat.id);
    return {
      category: cat,
      count: scanners.length,
      totalMatches: scanners.reduce((sum, s) => sum + s.matchCount, 0),
    };
  });
}
