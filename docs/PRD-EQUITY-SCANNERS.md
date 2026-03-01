# Product Requirements Document: Upstox Equity Scanners Platform

**Version:** 1.0  
**Date:** 28 February 2026  
**Author:** Product Management  
**Status:** Draft for Engineering Review  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Platform Architecture](#2-platform-architecture)
3. [Module 1 — Custom Scanner (Screener Builder)](#3-module-1--custom-scanner-screener-builder)
4. [Module 2 — Pre-Built Screeners (Screener Library)](#4-module-2--pre-built-screeners-screener-library)
5. [Module 3 — Positional Scanners](#5-module-3--positional-scanners)
6. [Module 4 — Trade Setup Ideas](#6-module-4--trade-setup-ideas)
7. [Module 5 — Charting](#7-module-5--charting)
8. [Indicator Catalog — Full Reference](#8-indicator-catalog--full-reference)
9. [Condition Engine — Operators, Modifiers, and Logic](#9-condition-engine--operators-modifiers-and-logic)
10. [Data Pipeline & Infrastructure](#10-data-pipeline--infrastructure)
11. [Stock Universe](#11-stock-universe)
12. [Appendix A — Condition Interaction Matrix](#appendix-a--condition-interaction-matrix)
13. [Appendix B — Positional Scanner Algorithms](#appendix-b--positional-scanner-algorithms)
14. [Appendix C — Futures & Options Parameters](#appendix-c--futures--options-parameters)
15. [Appendix D — Fundamental Data Parameters](#appendix-d--fundamental-data-parameters)

---

## 1. Product Overview

### 1.1 Vision

Build a comprehensive equity scanner platform for Upstox that enables traders — from beginners to advanced — to discover trading opportunities across the Indian stock market (NSE) using technical, fundamental, and derivative-based screening criteria.

### 1.2 Key Capabilities

| Capability | Description |
|---|---|
| **Custom Scanner** | Build-your-own screener with 100+ technical indicators, AND/OR logic, multi-group conditions, multi-timeframe analysis, and time-window modifiers |
| **Pre-Built Screeners** | 46+ curated screeners across 5 categories (Price, Volume, Technicals, Candlesticks, Fundamentals) with trading-style tagging |
| **Positional Scanners** | 15 algorithmic scanners for positional trading (52W Highs, MACD Crossovers, Cup & Handle, Consolidation Breakout, etc.) |
| **Trade Setup Ideas** | Non-recommendatory trade observations with signal strength, conviction levels, and market context |
| **Charting** | Interactive candlestick charts with live WebSocket updates and tiered consolidation breakout analysis |

### 1.3 Target Users

| Persona | Usage Pattern |
|---|---|
| **Intraday Trader** | Opening Range Breakout, VWAP Reclaim, Gap scans on 15m/5m timeframes |
| **BTST Trader** | Volume surge, momentum breakout scans on daily timeframe |
| **Swing Trader** | Consolidation breakout, pullback-to-EMA, divergence scans on daily timeframe |
| **Positional Investor** | MACD crossovers on monthly, Cup & Handle, fundamental screeners |

### 1.4 Trading Styles

The platform tags all screeners and setups with one or more applicable trading styles:

- **Intraday** — Same-day trades, typically using 5m/15m/30m timeframes
- **BTST** (Buy Today Sell Tomorrow) — Overnight holding, using daily + intraday confirmation
- **Swing** — 3–14 day holding period, using daily timeframe
- **Positional** — 2 weeks to several months, using daily and monthly timeframes

---

## 2. Platform Architecture

### 2.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                │
│                                                                │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐│
│  │   Custom     │ │  Pre-Built   │ │  Positional  │ │ Trade  ││
│  │   Scanner    │ │  Screeners   │ │  Scanners    │ │ Ideas  ││
│  │   Builder    │ │  Library     │ │              │ │        ││
│  └──────┬───────┘ └──────────────┘ └──────┬───────┘ └────────┘│
│         │                                 │                    │
│  ┌──────▼─────────────────────────────────▼───────────────────┐│
│  │            Condition Evaluation Engine                      ││
│  │   • 100+ Indicators  • 10 Operators  • Time Modifiers      ││
│  │   • AND/OR Logic     • Multi-Group   • Multi-Timeframe     ││
│  └──────────────────────────┬─────────────────────────────────┘│
│                             │                                  │
│  ┌──────────────────────────▼─────────────────────────────────┐│
│  │              Data Pipeline & Cache Layer                    ││
│  │   • Incremental OHLCV Refresh   • Batch Processing         ││
│  │   • Rate-Limited API Calls      • Compression              ││
│  └──────────────────────────┬─────────────────────────────────┘│
└─────────────────────────────┼──────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
        ┌─────▼─────┐                 ┌───────▼───────┐
        │  Supabase  │                 │  Upstox API   │
        │  (Storage) │                 │  (Market Data) │
        │  • OHLCV   │                 │  • Historical  │
        │  • Results │                 │  • Intraday    │
        │  • Meta    │                 │  • WebSocket   │
        └────────────┘                 └───────────────┘
```

### 2.2 Supported Timeframes

| Timeframe | Label | Use Case | Data Source |
|---|---|---|---|
| 1 min | 1 min | Scalping (planned) | Upstox Intraday V3 |
| 5 min | 5 min | Intraday | Upstox Intraday V3 |
| 15 min | 15 min | Intraday / BTST | Upstox Intraday V3 + Supabase cache |
| 30 min | 30 min | Intraday | Upstox Intraday V3 |
| 1 hour | 1 hour | Swing (planned) | Computed from lower TFs |
| Daily | Daily | Swing / Positional | Upstox Historical V3 + Supabase cache |
| Weekly | Weekly | Positional (planned) | Computed from daily |

**Currently active for Custom Scanner execution:** Daily (1d) and 15-minute (15m).  
**Charting supports:** 5m, 15m, 30m, 1D, 1M (monthly).  
**Positional Scanners:** Daily (most scanners) and Monthly (MACD crossover scanners).

### 2.3 Navigation Structure

| Route | Component | Description |
|---|---|---|
| `/` | StandaloneScreenerPage | Default view — Custom Scanner builder |
| `/all` | ScansDesktop | Multi-tab dashboard with all modules |

**ScansDesktop Tabs:**

1. **Positional Scanner** — Pre-built algorithmic scanners with one-click execution
2. **Trade Set-up Ideas** — BTST / Stocks to Watch / Swing sub-tabs
3. **Custom Scanner** — Full condition builder
4. **Chart** — Interactive charting with consolidation breakout analysis

---

## 3. Module 1 — Custom Scanner (Screener Builder)

### 3.1 Overview

The Custom Scanner is the core feature of the platform. It allows users to build complex screening queries using a visual condition builder, supporting 100+ technical indicators across 11 categories, 10 comparison operators, time-window modifiers, and multi-group AND/OR logic.

### 3.2 Builder Modes

| Mode | Description | Target User |
|---|---|---|
| **Standard** (Simple) | Flat list of conditions with vertical cards. Simpler UI, one condition per row. | Beginners |
| **Advanced** (Classic) | Full group-based builder with AND/OR connectors between groups. Each group can have its own timeframe and internal logic. | Advanced traders |
| **AI** (Planned) | Natural language query to auto-generate scanner conditions. | All users |

### 3.3 Query Structure

A scan query is composed of:

```
QueryState
├── name: string                    (Scanner name)
├── universe: string                (Stock universe: nifty50, nifty200, nifty500, nifty750, all)
└── groups: GroupState[]            (One or more condition groups)
    ├── id: string
    ├── logic: "AND" | "OR"         (Logic WITHIN the group)
    ├── timeframe: "1d" | "15m"     (Timeframe for this group)
    ├── connector: "AND" | "OR"     (Logic BETWEEN groups)
    └── conditions: ConditionState[]
        ├── leftIndicatorId          (Left-side indicator)
        ├── leftParams               (Left-side indicator parameters)
        ├── operator                 (Comparison operator)
        ├── rightType: "value" | "indicator"
        ├── rightValue               (Numeric value if rightType = "value")
        ├── rightIndicatorId         (Right-side indicator if rightType = "indicator")
        ├── rightParams              (Right-side indicator parameters)
        ├── rightMultiplier          (Multiplier for right indicator, e.g., 1.02× SMA)
        ├── rightValue2              (Second value for "is between" operator)
        ├── hasTimeModifier          (Whether time window is applied)
        ├── timeModifierMode         ("within_last" | "exactly_ago" | "all_of_last")
        └── timeModifierBars         (Number of bars for time window)
```

### 3.4 Multi-Group Logic

Users can create multiple condition groups connected by AND/OR:

```
Group 1 (Daily, AND logic)             Group 2 (15min, AND logic)
┌────────────────────────────┐   AND   ┌────────────────────────────┐
│ RSI(14) > 30               │  ────►  │ Close crossed above EMA(9) │
│ AND                        │         │ AND                        │
│ Close > SMA(200)           │         │ Volume > 1.5× Volume SMA   │
└────────────────────────────┘         └────────────────────────────┘
```

**Key behaviors:**
- Each group can have its own timeframe (Daily or 15m)
- Conditions within a group are combined with the group's internal logic (AND or OR)
- Groups are combined with the inter-group connector (AND or OR)
- A stock must satisfy all groups (when AND) or at least one group (when OR) to match

### 3.5 Condition Sidebar Categories

The condition builder sidebar organizes indicators into the following categories:

| Category | Contents | Status |
|---|---|---|
| **Universe** | Stock universe selection | Planned |
| **Price** | Close, Open, High, Low, 52W High/Low, % changes, % from MA | Active |
| **Technicals** | Moving Averages, Oscillators, MACD, Trend, Volatility, Pivot Levels, Setups, Divergence | Active |
| **Volume & Delivery** | Volume, Volume SMA/EMA, OBV, VWAP, Relative Volume, Delivery %, CMF, A/D | Active |
| **Candlesticks** | 20+ single, double, and triple candlestick patterns | Active |
| **Financial Ratios** | Financial ratio parameters | Planned (locked) |
| **Profitability** | P&L items, margins, growth rates (55+ parameters) | Planned (locked) |
| **Cash Flow** | Operating, investing, financing cash flows (30+ parameters) | Planned (locked) |
| **Valuation** | PE, PB, PS, EV/EBITDA, dividend yield, sector comparisons (29 parameters) | Planned (locked) |
| **Futures & Options** | OI, volume, basis, PCR, option chain data (30 parameters) | Planned (locked) |

### 3.6 Time-Window Conditions

Time-window modifiers add temporal context to conditions. They answer "when" in addition to "what."

| Modifier | Label | Behavior | Example |
|---|---|---|---|
| `within_last` | happened within last N bars | Condition must be true for **at least one bar** in the last N bars | "RSI crossed above 30 within last 5 bars" |
| `exactly_ago` | exactly N bars ago | Condition is evaluated at **exactly N bars** before the current bar | "Bullish Engulfing detected exactly 2 bars ago" |
| `all_of_last` | true for all of last N bars | Condition must be true for **every bar** in the last N bars | "Close > SMA(200) for all of last 10 bars" |

**When time modifiers appear:**

| Operator | Time Modifier Availability |
|---|---|
| `greater_than`, `less_than`, `greater_equal`, `less_equal` | None (evaluates current bar only) |
| `crossed_above`, `crossed_below` | Optional — `within_last` |
| `is_increasing`, `is_decreasing` | Required — user must specify number of bars |
| `is_between` | None |
| `detected` | Optional — `within_last` or `exactly_ago` |

### 3.7 Scan Execution

**Execution flow:**

1. User clicks "Run Scan"
2. System loads OHLCV data from Supabase (`stock_candles_1d` or `stock_candles_15m`) for all instruments in the selected universe
3. For each stock, the Condition Evaluator:
   a. Computes all required indicator values
   b. Evaluates each condition in each group
   c. Applies time modifiers
   d. Combines results using group logic (AND/OR)
   e. Combines groups using inter-group logic
4. Matching stocks are returned with indicator values as dynamic columns

**Batch processing:** Stocks are processed in batches of 5 in parallel.

### 3.8 Result Display

Scan results show:

| Column | Description | Sortable |
|---|---|---|
| Symbol | Stock symbol and name | No |
| Price | Latest close price (₹) | Yes |
| 1D Change % | Day-over-day price change | Yes |
| Volume | Latest volume | Yes |
| *Dynamic columns* | Values of indicators used in the query (e.g., RSI(14) = 42.5, SMA(200) = 1850) | No |

### 3.9 Data Refresh (Settings Tab)

| Action | Description |
|---|---|
| Refresh Daily Candles | Incrementally fetches missing daily OHLCV from Upstox. Initial lookback: 365 days. Batch size: 3 stocks, 1200ms delay. |
| Refresh 15m Candles | Incrementally fetches missing 15m OHLCV from Upstox. Initial lookback: 60 days. Batch size: 2 stocks, 1500ms delay. |
| Upstox Token Management | Users can input and save their Upstox access token for data fetching. Token is persisted in Supabase. |
| Data Freshness | Displays last refresh timestamps for daily and 15m data. |

---

## 4. Module 2 — Pre-Built Screeners (Screener Library)

### 4.1 Overview

The platform includes 46+ pre-built screeners organized by category and tagged with applicable trading styles. These provide one-click access to common screening strategies.

### 4.2 Screener Categories

| Category | Screener Count | Description |
|---|---|---|
| **Price** | 8 | Price action: 52W High/Low zones, ATH, Gap Up/Down, Support/Resistance breaks |
| **Volume & Delivery** | 6 | Volume surge, high delivery %, volume dry-up, accumulation/distribution |
| **Technicals** | 12 | RSI oversold/overbought, MACD crossovers, Golden/Death Cross, Supertrend, Bollinger, ADX, Stochastic |
| **Candlesticks** | 10 | Engulfing, Hammer, Shooting Star, Morning/Evening Star, Doji, Harami, Three White Soldiers, Marubozu |
| **Fundamentals** | 10 | Low PE, High ROE, Debt Free, High Dividend, Profit/Revenue Growth, FII/DII/Promoter Buying, Low PB |

### 4.3 Full Screener List

#### Price Screeners

| ID | Name | Description | Styles |
|---|---|---|---|
| `52w_high_zone` | Near 52-Week High | Within 5% of 52-week high | Swing, Positional |
| `52w_low_zone` | Near 52-Week Low | Within 5% of 52-week low — potential bounce | Swing, Positional |
| `all_time_high` | All Time High | Hitting new all-time highs today | BTST, Swing, Positional |
| `gap_up` | Gap Up >2% | Gap up opening greater than 2% | Intraday, BTST |
| `gap_down` | Gap Down >2% | Gap down opening — potential bounce plays | Intraday |
| `support_breakout` | Breaking Resistance | Breaking above key resistance levels | Intraday, BTST, Swing |
| `near_support` | Near Support | Trading near key support levels | Swing, Positional |
| `prev_day_high_break` | Previous Day High Break | Breaking above previous day's high | Intraday, BTST |

#### Volume & Delivery Screeners

| ID | Name | Description | Styles |
|---|---|---|---|
| `volume_surge` | Volume Surge | Volume > 2× 20-day average | Intraday, BTST, Swing |
| `high_delivery` | High Delivery % | Delivery > 70% of traded volume — institutional interest | Swing, Positional |
| `volume_dry_up` | Volume Dry Up | Significant decrease in volume — consolidation phase | Swing |
| `accumulation` | Accumulation Pattern | Signs of institutional buying | Swing, Positional |
| `distribution` | Distribution Pattern | Signs of institutional selling | Swing, Positional |
| `delivery_spike` | Delivery Spike | Sudden increase in delivery % vs average | BTST, Swing |

#### Technical Screeners

| ID | Name | Description | Styles |
|---|---|---|---|
| `rsi_oversold` | RSI Oversold | RSI below 30 | Intraday, BTST, Swing |
| `rsi_overbought` | RSI Overbought | RSI above 70 | Intraday, Swing |
| `macd_bullish` | MACD Bullish Crossover | MACD line crossing above signal line | BTST, Swing, Positional |
| `macd_bearish` | MACD Bearish Crossover | MACD line crossing below signal line | Swing |
| `golden_cross` | Golden Cross (EMA) | 20 EMA crossing above 50 EMA | Swing, Positional |
| `death_cross` | Death Cross (EMA) | 20 EMA crossing below 50 EMA | Swing, Positional |
| `above_200_ema` | Above 200 EMA | Price above 200-day EMA — long-term uptrend | Positional |
| `supertrend_buy` | Supertrend Buy Signal | Supertrend turned bullish | BTST, Swing |
| `supertrend_sell` | Supertrend Sell Signal | Supertrend turned bearish | Swing |
| `bollinger_squeeze` | Bollinger Squeeze | Low volatility — breakout expected | BTST, Swing |
| `adx_trending` | Strong Trend (ADX >25) | ADX above 25 — strong trend | Swing, Positional |
| `stoch_oversold` | Stochastic Oversold | Stochastic below 20 | Intraday, BTST |

#### Candlestick Screeners

| ID | Name | Description | Styles |
|---|---|---|---|
| `bullish_engulfing` | Bullish Engulfing | Strong bullish reversal pattern | BTST, Swing |
| `bearish_engulfing` | Bearish Engulfing | Strong bearish reversal pattern | Swing |
| `hammer` | Hammer | Bullish reversal at support | BTST, Swing |
| `shooting_star` | Shooting Star | Bearish reversal at resistance | Swing |
| `morning_star` | Morning Star | Strong bullish reversal — 3 candle pattern | Swing, Positional |
| `evening_star` | Evening Star | Strong bearish reversal — 3 candle pattern | Swing |
| `doji` | Doji | Indecision candle — potential reversal | Intraday, BTST |
| `bullish_harami` | Bullish Harami | Bullish reversal pattern | BTST, Swing |
| `three_white_soldiers` | Three White Soldiers | Strong bullish continuation | Swing, Positional |
| `marubozu` | Marubozu | Strong momentum candle | Intraday, BTST |

#### Fundamental Screeners

| ID | Name | Description | Styles |
|---|---|---|---|
| `low_pe` | Low P/E Ratio | P/E below sector average | Positional |
| `high_roe` | High ROE (>20%) | Return on Equity above 20% | Positional |
| `debt_free` | Debt Free | Companies with zero or minimal debt | Positional |
| `high_dividend` | High Dividend Yield | Dividend yield > 3% | Positional |
| `profit_growth` | Profit Growth | QoQ profit growth > 20% | Swing, Positional |
| `revenue_growth` | Revenue Growth | QoQ revenue growth > 15% | Swing, Positional |
| `fii_buying` | FII Buying | FIIs increasing stake in recent quarters | Swing, Positional |
| `promoter_buying` | Promoter Buying | Recent increase in promoter holding | Swing, Positional |
| `dii_buying` | DII Buying | DIIs increasing stake | Positional |
| `low_pb` | Low P/B Ratio | Price to Book below 1.5 | Positional |

### 4.4 View Modes

The screener library supports 8 different view modes for different user preferences:

| View | Description |
|---|---|
| **Jayesh View** | Pill-based (Intraday/BTST/Swing/Positional) → grouped by display category (Indicators, Patterns, Volume, Price, Candlesticks, Fundamentals) |
| **Trade Ideas Engine** | Curated high-conviction ideas with entry/stop/target, market regime banner |
| **Scanner Studio** | Power-tool view with intent categories, match counts, effectiveness indicators |
| **Hybrid View** | Default view with "Hot Right Now" section + intent filter + category grid |
| **Intent-Based View** | Left sidebar tabs (Intraday/BTST/Swing/Positional) with category-grouped screeners |
| **Card Grid View** | Category sections with screener cards in responsive grid |
| **Daily Feed View** | Editorial curated feed with Market Pulse, Trending, Volume Action sections |
| **Smart Feed View** | Stock-first view showing stocks with matching screener badges |

### 4.5 "Hot Right Now" Tagging

Screeners can be tagged as "hot" to surface them in the Hot Right Now section. Currently hot screeners:
- Near 52-Week High
- Gap Up >2%
- Volume Surge
- RSI Oversold
- FII Buying

---

## 5. Module 3 — Positional Scanners

### 5.1 Overview

Positional scanners are algorithmically-defined scanners optimized for swing-to-positional timeframes. Unlike the Custom Scanner, these run server-side logic with specific pattern detection algorithms and produce rich, scanner-specific result columns.

### 5.2 Scanner Execution Flow

1. User clicks "Run Scan" (individual) or "Run Full Scan" (all scanners)
2. System loads OHLCV data from Upstox for each instrument (since 2023-01-01)
3. Scanner algorithm evaluates each stock
4. Matches are saved to Supabase (`positional_scan_results`)
5. Results are displayed with scanner-specific columns
6. During full scan, progress is shown with per-scanner progress bars and skip capability

**Batch processing:** Default batch size 3, delay 1200ms between batches.

### 5.3 Scanner List

#### 5.3.1 Price-Based Scanners

| Scanner ID | Name | Algorithm | Result Columns |
|---|---|---|---|
| `fresh-52w-high` | Fresh 52-Week Highs | Today's close > max close of previous 252 trading days | 52W High, % from 52W High |
| `ath-breakout` | All-Time High Breakout | Today's close > all-time max close (full history) | ATH, % above ATH |

#### 5.3.2 Indicator-Based Scanners

| Scanner ID | Name | Algorithm | Result Columns |
|---|---|---|---|
| `rs-leaders` | Relative Strength Leaders | 20-day return outperforms Nifty 50 by ≥ 2% | 20d Return %, Outperformance % |
| `pullback-50ema` | Pullback to 50 EMA | Price within ±2% of 50 EMA, in uptrend (50 EMA > 200 EMA, 50 EMA rising) | 50 EMA, % from 50 EMA |
| `bullish-divergence` | Bullish RSI Divergence | Price making lower lows while RSI(14) making higher lows over 20-bar lookback | RSI, Price Low 1, Price Low 2 |
| `macd-crossover-1d` | MACD Crossover (1 Day) | MACD(12,26,9) bullish crossover in last 30 bars on daily chart | Crossover Date, MACD, Signal |
| `macd-crossover-1mo` | MACD Crossover (1 Month) | MACD(12,26,9) bullish crossover in last 30 bars on monthly chart | Crossover Date, MACD, Signal |
| `bullish-cross-building-negative` | Bullish Cross Building (Negative) | MACD & Signal both negative, histogram improving (rising for 2+ bars) on monthly | MACD, Signal, Histogram Δ |
| `bullish-cross-building-positive` | Bullish Cross Building (Positive) | MACD & Signal both positive, histogram negative but rising on monthly | MACD, Signal, Histogram Δ |

#### 5.3.3 Pattern-Based Scanners

| Scanner ID | Name | Algorithm | Result Columns |
|---|---|---|---|
| `consolidation-breakout` | Consolidation Breakout | Multi-criteria tiered breakout detection (see Appendix B) | Tier, Stage, Breakout, Target, R:R, RS, Trend, Score, Dist % |
| `support-test` | Support Zone Test | Price within 2% of 20-day low in stock above 200 DMA | Support, % from Support |
| `cup-handle` | Cup and Handle Forming | Textbook cup-and-handle detection with confidence scoring (see Appendix B) | Resistance, % from Resistance |
| `double-bottom` | Double Bottom | W-pattern with two similar lows and neckline break potential | Neckline, % from Neckline |
| `morning-star` | Morning Star Pattern | 3-candle reversal: bearish day 1, small-body day 2, bullish day 3 | Day1 Body %, Day3 Body % |
| `accumulation-pattern` | Accumulation Phase | Low volatility ratio + rising volume ratio = smart money accumulation | Volatility Ratio, Volume Ratio |

### 5.4 Display Categories

Scanners are grouped into display categories in the UI:

| Display Category | Scanners |
|---|---|
| **Price** | Fresh 52-Week Highs, All-Time High Breakout |
| **Indicators** | RS Leaders, Pullback to 50 EMA, Bullish RSI Divergence, MACD Crossover (1D), MACD Crossover (1M), Bullish Cross Building (Negative), Bullish Cross Building (Positive) |
| **Patterns** | Consolidation Breakout, Support Zone Test, Cup and Handle, Double Bottom, Morning Star, Accumulation Phase |

### 5.5 Full Scan Feature

- Runs all 15 scanners sequentially
- Shows overall progress (current scanner / total scanners) and per-scanner progress (current stock / total stocks)
- User can **skip** a scanner mid-scan to move to the next
- Live results appear as they're found (highlighted in green)
- Results are persisted to Supabase for later retrieval
- Displays last scan timestamp and match counts per scanner

---

## 6. Module 4 — Trade Setup Ideas

### 6.1 Overview

Trade Setup Ideas provide non-recommendatory observations about stocks showing interesting patterns. They are organized into three sub-categories.

### 6.2 Sub-Categories

#### 6.2.1 BTST Setups

| Setup Type | Description | Example |
|---|---|---|
| Strong Momentum | High price change + volume expansion | "Breaking out with 3× average volume" |
| Volume Breakout | Unusual volume at key levels | "Volume spike at key resistance level" |
| Fresh Breakout | Breaking multi-week/month highs | "Breaking 2-month high on steel demand" |
| Gap Up | Significant gap-up holding gains | "Gapped up 2.5% on strong sales data" |
| Oversold Bounce | RSI bounce from oversold at key support | "Hammer candle at 200 EMA after 5-day decline" |

#### 6.2.2 Stocks to Watch

| Setup Type | Description | Example |
|---|---|---|
| Upcoming Earnings | Stocks with imminent earnings announcements | "Reports Q3 results tomorrow" |
| Sector Leaders | Stocks leading their sector rally | "Leading oil & gas rally on refining margins" |
| New 52W High | Stocks hitting fresh 52-week highs | "Made fresh 52-week high today" |
| Fundamental Picks | Stocks with compelling valuations | "Trading near 52W low with 7% dividend yield" |
| Breakout Watchlist | Stocks coiling near resistance | "Coiling near ₹42,000 resistance" |

#### 6.2.3 Swing Trading Ideas

| Setup Type | Description | Example |
|---|---|---|
| Consolidation Breakout | Breaking out of tight consolidation with volume | VCP (Volatility Contraction Pattern) |
| Pullback to Support | Pullback to key moving average in uptrend | "Pulled back 8% to rising 50 EMA" |
| Trend Continuation | Strong uptrend with moving average support holding | "20 EMA acting as floor" |
| Swing Reversal | Reversal candle at demand zone | "Bullish engulfing at demand zone" |
| Flag Pattern | Bull/bear flag continuation pattern | "Bull flag forming after sharp rally" |
| Cup and Handle | Classic C&H pattern forming | "Cup and handle forming over 3 months" |
| Higher High Higher Low | Clean HH-HL trend structure | "Clean HH-HL structure over 2 months" |

### 6.3 Setup Data Structure

Each trade setup includes:

| Field | Description |
|---|---|
| Symbol & Name | Stock identity |
| Headline | One-line description of the setup |
| Observation | Detailed non-recommendatory observation (2–3 sentences) |
| Signals | Array of typed signals (price/volume/technical/candlestick/fundamental) with name-value pairs |
| Current Price & Change | Latest price data |
| Sector Trend | Bullish / Bearish / Neutral |
| Market Context | Current sector and market narrative |
| Signal Strength | 1–5 star rating (quality indicator) |

### 6.4 Trade Ideas Engine (Advanced View)

The Trade Ideas Engine view provides a more sophisticated presentation:

| Feature | Description |
|---|---|
| **Market Regime Banner** | Current trend, VIX level, breadth, FII activity, recommendation |
| **Conviction Levels** | High / Medium / Low conviction |
| **Risk Levels** | Low / Moderate / High |
| **Time Horizons** | Intraday, 1-2 days, 3-7 days, 1-4 weeks |
| **Trade Levels** | Entry, Stop Loss, Target, Risk:Reward ratio |
| **Today's Top Picks** | Editor's choice (max 3, high conviction only) |

---

## 7. Module 5 — Charting

### 7.1 Overview

Interactive candlestick chart with volume histogram, supporting multiple timeframes and live updates via WebSocket.

### 7.2 Features

| Feature | Description |
|---|---|
| **Candlestick Chart** | OHLC candlestick series (green = up, red = down) |
| **Volume Histogram** | Volume bars in separate pane (75/25 height split) |
| **Timeframe Switching** | 5m, 15m, 30m, 1D, 1M |
| **Stock Search** | Searchable dropdown with 750+ stocks |
| **Live Updates** | WebSocket-based real-time candle updates with green pulse indicator |
| **Crosshair Tracking** | Hover to see OHLC values in header |
| **IST Timezone** | All times displayed in Indian Standard Time |
| **Default Range** | Shows last 200 candles on load |

### 7.3 Tiered Consolidation Breakout Scanner

The Chart page includes a built-in tiered consolidation breakout scanner:

| Tier | Name | Criteria | Action |
|---|---|---|---|
| **Tier 1** | Ready to Trade | All criteria pass, breakout confirmed, volume 1.5×+ | Enter with stop below consolidation low |
| **Tier 2A** | Imminent Breakout | Most criteria pass, within 2% of breakout level | Watch for volume surge |
| **Tier 2B** | Watchlist | Good base structure, within 5% of breakout | Add to watchlist |

**Scan options:** Single stock or full universe (Nifty 50 or Nifty 750).

---

## 8. Indicator Catalog — Full Reference

### 8.1 Price Indicators (14 indicators)

| ID | Name | Parameters | Default | Output Type | Description |
|---|---|---|---|---|---|
| `close` | Close | None | — | Numeric | Latest closing price |
| `open` | Open | None | — | Numeric | Opening price |
| `high` | High | None | — | Numeric | High price |
| `low` | Low | None | — | Numeric | Low price |
| `prev_close` | Previous Close | None | — | Numeric | Previous bar's close |
| `high_52w` | 52-Week High | None | — | Numeric | Highest close in last 252 trading days |
| `low_52w` | 52-Week Low | None | — | Numeric | Lowest close in last 252 trading days |
| `change_1d_pct` | 1D Change % | None | — | Numeric | 1-day percentage change |
| `change_1w_pct` | 1W Change % | None | — | Numeric | 5-day percentage change |
| `change_1m_pct` | 1M Change % | None | — | Numeric | ~21-day percentage change |
| `pct_from_sma` | % from SMA | period | 200 (1–500) | Numeric | Percentage distance from SMA |
| `pct_from_ema` | % from EMA | period | 200 (1–500) | Numeric | Percentage distance from EMA |
| `pct_from_52w_high` | % from 52W High | None | — | Numeric | Percentage below 52-week high |
| `pct_from_52w_low` | % from 52W Low | None | — | Numeric | Percentage above 52-week low |

### 8.2 Moving Averages (7 indicators)

| ID | Name | Parameters | Default | Range | Description |
|---|---|---|---|---|---|
| `sma` | SMA | period | 20 | 1–500 | Simple Moving Average |
| `ema` | EMA | period | 20 | 1–500 | Exponential Moving Average |
| `wma` | WMA | period | 20 | 1–500 | Weighted Moving Average |
| `hull_ma` | Hull MA | period | 20 | 1–500 | Hull Moving Average (less lag) |
| `vwma` | VWMA | period | 20 | 1–500 | Volume-Weighted Moving Average |
| `dema` | DEMA | period | 20 | 1–500 | Double Exponential Moving Average |
| `tema` | TEMA | period | 20 | 1–500 | Triple Exponential Moving Average |

### 8.3 Oscillators (9 indicators)

| ID | Name | Parameters | Defaults | Range | Description |
|---|---|---|---|---|---|
| `rsi` | RSI | period | 14 | 1–100 | Relative Strength Index |
| `stoch_k` | Stochastic %K | k_period, d_period, smooth | 14, 3, 3 | 1–100 each | Stochastic %K line |
| `stoch_d` | Stochastic %D | k_period, d_period, smooth | 14, 3, 3 | 1–100 each | Stochastic %D line (signal) |
| `stoch_rsi_k` | StochRSI %K | rsi_period, stoch_period, k_smooth, d_smooth | 14, 14, 3, 3 | 1–100/1–50 | Stochastic RSI %K |
| `stoch_rsi_d` | StochRSI %D | rsi_period, stoch_period, k_smooth, d_smooth | 14, 14, 3, 3 | 1–100/1–50 | Stochastic RSI %D |
| `williams_r` | Williams %R | period | 14 | 1–100 | Williams Percent Range (0 to -100) |
| `cci` | CCI | period | 20 | 1–100 | Commodity Channel Index |
| `roc` | ROC | period | 12 | 1–100 | Rate of Change |
| `mfi` | MFI | period | 14 | 1–100 | Money Flow Index |

### 8.4 MACD (3 indicators)

| ID | Name | Parameters | Defaults | Range | Description |
|---|---|---|---|---|---|
| `macd_line` | MACD Line | fast, slow, signal | 12, 26, 9 | 1–100 each | MACD line = fast EMA − slow EMA |
| `macd_signal` | MACD Signal | fast, slow, signal | 12, 26, 9 | 1–100 each | Signal line = EMA of MACD |
| `macd_histogram` | MACD Histogram | fast, slow, signal | 12, 26, 9 | 1–100 each | Histogram = MACD − Signal |

### 8.5 Trend Indicators (10 indicators)

| ID | Name | Parameters | Defaults | Range | Description |
|---|---|---|---|---|---|
| `adx` | ADX | period | 14 | 1–100 | Average Directional Index |
| `plus_di` | +DI | period | 14 | 1–100 | Positive Directional Indicator |
| `minus_di` | -DI | period | 14 | 1–100 | Negative Directional Indicator |
| `parabolic_sar` | Parabolic SAR | step, max | 0.02, 0.2 | 0.001–0.5, 0.01–1 | Parabolic Stop and Reverse |
| `ichimoku_tenkan` | Ichimoku Tenkan | tenkan | 9 | 1–100 | Tenkan-sen (Conversion Line) |
| `ichimoku_kijun` | Ichimoku Kijun | kijun | 26 | 1–100 | Kijun-sen (Base Line) |
| `ichimoku_senkou_a` | Ichimoku Senkou A | tenkan, kijun | 9, 26 | 1–100 each | Senkou Span A (Leading Span A) |
| `ichimoku_senkou_b` | Ichimoku Senkou B | senkou_b | 52 | 1–200 | Senkou Span B (Leading Span B) |
| `aroon_up` | Aroon Up | period | 25 | 1–100 | Aroon Up (0–100) |
| `aroon_down` | Aroon Down | period | 25 | 1–100 | Aroon Down (0–100) |

### 8.6 Volatility Indicators (12 indicators)

| ID | Name | Parameters | Defaults | Range | Description |
|---|---|---|---|---|---|
| `bb_upper` | Bollinger Upper | period, stddev | 20, 2 | 1–100, 0.5–5 (step 0.5) | Upper Bollinger Band |
| `bb_middle` | Bollinger Middle | period, stddev | 20, 2 | same | Middle Bollinger Band (= SMA) |
| `bb_lower` | Bollinger Lower | period, stddev | 20, 2 | same | Lower Bollinger Band |
| `bb_bandwidth` | Bollinger Bandwidth | period, stddev | 20, 2 | same | (Upper − Lower) / Middle × 100 |
| `bb_pct_b` | Bollinger %B | period, stddev | 20, 2 | same | (Close − Lower) / (Upper − Lower) |
| `atr` | ATR | period | 14 | 1–100 | Average True Range |
| `atr_pct` | ATR % | period | 14 | 1–100 | ATR as % of close |
| `supertrend` | Supertrend | period, multiplier | 10, 3 | 1–100, 0.5–10 (step 0.5) | Supertrend value |
| `keltner_upper` | Keltner Upper | period, multiplier | 20, 2 | 1–100, 0.5–5 (step 0.5) | Upper Keltner Channel |
| `keltner_lower` | Keltner Lower | period, multiplier | 20, 2 | same | Lower Keltner Channel |
| `donchian_upper` | Donchian Upper | period | 20 | 1–200 | Highest high over N periods |
| `donchian_lower` | Donchian Lower | period | 20 | 1–200 | Lowest low over N periods |
| `hist_volatility` | Historical Volatility | period | 20 | 1–100 | Annualized historical volatility |

### 8.7 Volume Indicators (10 indicators)

| ID | Name | Parameters | Defaults | Range | Description |
|---|---|---|---|---|---|
| `volume` | Volume | None | — | — | Current bar volume |
| `volume_sma` | Volume SMA | period | 20 | 1–100 | Simple MA of volume |
| `volume_ema` | Volume EMA | period | 20 | 1–100 | Exponential MA of volume |
| `obv` | OBV | None | — | — | On-Balance Volume |
| `vwap` | VWAP | None | — | — | Volume-Weighted Average Price |
| `delivery_pct` | Delivery % | None | — | — | Delivery percentage (planned) |
| `relative_volume` | Relative Volume | period | 20 | 1–100 | Current volume / Volume SMA |
| `cmf` | Chaikin Money Flow | period | 20 | 1–100 | CMF oscillator (-1 to +1) |
| `ad_line` | Accumulation/Distribution | None | — | — | A/D line |
| `volume_roc` | Volume ROC | period | 14 | 1–100 | Rate of change of volume |

### 8.8 Pivot Levels (19 indicators)

All pivot indicators require no parameters. They are computed from the previous day's High, Low, Close.

**Standard Pivot Points:** `pivot_pp`, `pivot_r1`, `pivot_r2`, `pivot_r3`, `pivot_s1`, `pivot_s2`, `pivot_s3`

**Camarilla Pivot Points:** `camarilla_r1`, `camarilla_r2`, `camarilla_r3`, `camarilla_r4`, `camarilla_s1`, `camarilla_s2`, `camarilla_s3`, `camarilla_s4`

**Central Pivot Range:** `cpr_upper`, `cpr_lower`, `cpr_width_pct`

### 8.9 Setups — One-Click Pattern Detectors (8 indicators)

Setup indicators are compound patterns that return `1` (detected) or `0` (not detected). They use the `detected` operator exclusively and support time modifiers.

| ID | Name | Parameters | Defaults | Range | Description |
|---|---|---|---|---|---|
| `ema_cross_bullish` | EMA Cross (Bullish) | fast, slow | 9, 21 | 1–200, 1–500 | Fast EMA crossed above Slow EMA |
| `ema_cross_bearish` | EMA Cross (Bearish) | fast, slow | 9, 21 | 1–200, 1–500 | Fast EMA crossed below Slow EMA |
| `sma_cross_bullish` | SMA Cross (Bullish) | fast, slow | 50, 200 | 1–200, 1–500 | Golden Cross |
| `sma_cross_bearish` | SMA Cross (Bearish) | fast, slow | 50, 200 | 1–200, 1–500 | Death Cross |
| `macd_cross_bullish` | MACD Bullish Cross | fast, slow, signal | 12, 26, 9 | 1–100 each | MACD crossed above Signal |
| `macd_cross_bearish` | MACD Bearish Cross | fast, slow, signal | 12, 26, 9 | 1–100 each | MACD crossed below Signal |
| `supertrend_flip_bullish` | Supertrend Flip (Bullish) | period, multiplier | 10, 3 | 1–100, 0.5–10 | Supertrend flipped from bearish to bullish |
| `supertrend_flip_bearish` | Supertrend Flip (Bearish) | period, multiplier | 10, 3 | 1–100, 0.5–10 | Supertrend flipped from bullish to bearish |

**Customization behavior for Setups:**
- When a Setup indicator is selected (e.g., EMA Cross Bullish), the user can customize the Fast and Slow period parameters
- The **only allowed operator** is `detected`
- The user gets an **optional** time modifier: "within last N bars" or "exactly N bars ago"
- There is no right-side operand (no comparison value/indicator)

### 8.10 Divergence Patterns (5 indicators)

Divergence indicators detect divergence between price and an oscillator over a lookback window.

| ID | Name | Parameters | Defaults | Range |
|---|---|---|---|---|
| `rsi_divergence` | RSI Divergence | div_type (select), rsi_period, lookback, pivot_strength | bullish, 14, 20, 5 | —, 2–100, 5–100, 2–20 |
| `macd_divergence` | MACD Divergence | div_type (select), fast, slow, signal, lookback, pivot_strength | bullish, 12, 26, 9, 20, 5 | —, 1–100 each, 5–100, 2–20 |
| `stoch_divergence` | Stochastic Divergence | div_type (select), k_period, d_period, smooth, lookback, pivot_strength | bullish, 14, 3, 3, 20, 5 | —, 1–100 each, 5–100, 2–20 |
| `obv_divergence` | OBV Divergence | div_type (select), lookback, pivot_strength | bullish, 20, 5 | —, 5–100, 2–20 |
| `cci_divergence` | CCI Divergence | div_type (select), period, lookback, pivot_strength | bullish, 20, 20, 5 | —, 1–100, 5–100, 2–20 |

**Divergence Type Options (select parameter):**

| Value | Label |
|---|---|
| `bullish` | Bullish (Regular) — Price lower lows, indicator higher lows |
| `bearish` | Bearish (Regular) — Price higher highs, indicator lower highs |
| `hidden_bullish` | Hidden Bullish — Price higher lows, indicator lower lows |
| `hidden_bearish` | Hidden Bearish — Price lower highs, indicator higher highs |

**Customization behavior for Divergences:**
- When a Divergence indicator is selected, the user can choose the divergence type from a dropdown
- All numeric parameters (period, lookback, pivot_strength) are customizable
- The **only allowed operator** is `detected`
- Time modifier is optional

### 8.11 Candlestick Patterns (20 indicators)

All candlestick patterns require no parameters. They return `1` (detected) or `0` (not detected). The only allowed operator is `detected`.

#### Single-Candle Patterns

| ID | Name | Signal |
|---|---|---|
| `doji` | Doji | Indecision — open ≈ close |
| `hammer` | Hammer | Bullish reversal — long lower shadow, small body at top |
| `inverted_hammer` | Inverted Hammer | Potential bullish reversal — long upper shadow, small body at bottom |
| `spinning_top` | Spinning Top | Indecision — small body, long shadows both sides |
| `marubozu` | Marubozu | Strong momentum — full-body candle, no/minimal shadows |
| `hanging_man` | Hanging Man | Bearish reversal — like hammer but at top of uptrend |
| `shooting_star` | Shooting Star | Bearish reversal — long upper shadow at resistance |

#### Double-Candle Patterns

| ID | Name | Signal |
|---|---|---|
| `bullish_engulfing` | Bullish Engulfing | Bullish reversal — large green candle engulfs prior red candle |
| `bearish_engulfing` | Bearish Engulfing | Bearish reversal — large red candle engulfs prior green candle |
| `piercing_line` | Piercing Line | Bullish reversal — opens below prior low, closes above 50% of prior body |
| `dark_cloud_cover` | Dark Cloud Cover | Bearish reversal — opens above prior high, closes below 50% of prior body |
| `bullish_harami` | Bullish Harami | Potential bullish reversal — small green body inside prior large red body |
| `bearish_harami` | Bearish Harami | Potential bearish reversal — small red body inside prior large green body |
| `tweezer_top` | Tweezer Top | Bearish reversal — two candles with similar highs at top |
| `tweezer_bottom` | Tweezer Bottom | Bullish reversal — two candles with similar lows at bottom |

#### Triple-Candle Patterns

| ID | Name | Signal |
|---|---|---|
| `morning_star` | Morning Star | Strong bullish reversal — bearish day 1, small-body day 2, bullish day 3 |
| `evening_star` | Evening Star | Strong bearish reversal — bullish day 1, small-body day 2, bearish day 3 |
| `three_white_soldiers` | Three White Soldiers | Strong bullish continuation — three consecutive large green candles |
| `three_black_crows` | Three Black Crows | Strong bearish continuation — three consecutive large red candles |
| `three_inside_up` | Three Inside Up | Bullish reversal — harami + confirmation candle |
| `three_inside_down` | Three Inside Down | Bearish reversal — harami + confirmation candle |

---

## 9. Condition Engine — Operators, Modifiers, and Logic

### 9.1 Operators

| Operator ID | Label | Right Operand | Right Type | Time Modifier | Description |
|---|---|---|---|---|---|
| `greater_than` | is greater than | Required | Value or Indicator | None | Left > Right at current bar |
| `less_than` | is less than | Required | Value or Indicator | None | Left < Right at current bar |
| `greater_equal` | is >= (greater or equal) | Required | Value or Indicator | None | Left ≥ Right at current bar |
| `less_equal` | is <= (less or equal) | Required | Value or Indicator | None | Left ≤ Right at current bar |
| `crossed_above` | crossed above | Required | Value or Indicator | Optional (`within_last`) | Left was ≤ Right on prior bar AND Left > Right on current bar |
| `crossed_below` | crossed below | Required | Value or Indicator | Optional (`within_last`) | Left was ≥ Right on prior bar AND Left < Right on current bar |
| `is_increasing` | is increasing | None | — | Required (# bars) | Left value has increased for N consecutive bars |
| `is_decreasing` | is decreasing | None | — | Required (# bars) | Left value has decreased for N consecutive bars |
| `is_between` | is between | Required (two values) | Range | None | Right value 1 ≤ Left ≤ Right value 2 |
| `detected` | detected | None | — | Optional (`within_last`, `exactly_ago`) | Pattern indicator returned 1 (true) |

### 9.2 Operator Availability by Indicator Output Type

| Output Type | Available Operators |
|---|---|
| **Numeric** (price, MA, oscillators, etc.) | `greater_than`, `less_than`, `greater_equal`, `less_equal`, `crossed_above`, `crossed_below`, `is_increasing`, `is_decreasing`, `is_between` |
| **Pattern** (setups, divergence, candlesticks) | `detected` only |

### 9.3 Right-Side Operand

When the operator requires a right-side operand (`needsRight: true`), the user can choose:

| Right Type | Description | Example |
|---|---|---|
| **Value** | A fixed numeric value | RSI(14) > **30** |
| **Indicator** | Another indicator (with optional multiplier) | Close > **SMA(200)** × **1.02** |

**Multiplier:** When the right side is an indicator, the user can apply a multiplier. For example, "Close > 1.02 × SMA(200)" checks if the close is at least 2% above the 200 SMA.

### 9.4 Time Modifier Details

| Modifier | Available When | User Input | Evaluation Logic |
|---|---|---|---|
| `within_last` | Operator is `crossed_above`, `crossed_below`, or `detected` | N bars (integer) | Scans bars from `current - N` to `current`. Returns true if condition is met at **any** bar in that window. |
| `exactly_ago` | Operator is `detected` | N bars (integer) | Evaluates condition at exactly `current - N` bar. |
| `all_of_last` | Operator is `is_increasing` or `is_decreasing` | N bars (integer) | Checks that the indicator value monotonically increased/decreased for all N bars from `current - N` to `current`. |

### 9.5 Condition Interaction Examples

Below are representative condition configurations showing how the UI adapts based on selections:

#### Example 1: Numeric Comparison

```
Left: RSI (period: 14)
Operator: is less than
Right Type: Value
Right Value: 30
Time Modifier: None
```
→ Finds stocks where RSI(14) is currently below 30.

#### Example 2: Indicator vs Indicator with Multiplier

```
Left: Close
Operator: is greater than
Right Type: Indicator
Right Indicator: SMA (period: 200)
Right Multiplier: 1.02
Time Modifier: None
```
→ Finds stocks trading at least 2% above their 200-day SMA.

#### Example 3: Crossover with Time Window

```
Left: EMA (period: 9)
Operator: crossed above
Right Type: Indicator
Right Indicator: EMA (period: 21)
Time Modifier: within_last
Time Modifier Bars: 5
```
→ Finds stocks where the 9 EMA crossed above the 21 EMA at any point in the last 5 bars.

#### Example 4: Setup Detection

```
Left: EMA Cross (Bullish) (fast: 9, slow: 21)
Operator: detected
Right: None
Time Modifier: within_last
Time Modifier Bars: 3
```
→ Finds stocks where a bullish EMA cross was detected within the last 3 bars. User can customize the fast and slow EMA periods.

#### Example 5: Increasing Trend

```
Left: RSI (period: 14)
Operator: is increasing
Right: None
Time Modifier: (required)
Time Modifier Bars: 3
```
→ Finds stocks where RSI(14) has increased for 3 consecutive bars.

#### Example 6: Range Check

```
Left: RSI (period: 14)
Operator: is between
Right Value 1: 40
Right Value 2: 60
Time Modifier: None
```
→ Finds stocks where RSI(14) is between 40 and 60 (neutral zone).

#### Example 7: Divergence Pattern

```
Left: RSI Divergence (div_type: bullish, rsi_period: 14, lookback: 20, pivot_strength: 5)
Operator: detected
Right: None
Time Modifier: None
```
→ Finds stocks showing bullish RSI divergence. User can change divergence type, RSI period, lookback window, and pivot strength.

#### Example 8: Candlestick at Key Level (Multi-Condition Group)

```
Group 1 (Daily, AND):
  Condition 1: Hammer → detected
  Condition 2: Close → is less than → SMA(200) × 1.02
  Condition 3: RSI(14) → is less than → 35
```
→ Finds stocks showing a Hammer candle near the 200 SMA with oversold RSI.

---

## 10. Data Pipeline & Infrastructure

### 10.1 Data Sources

| Source | Usage | API |
|---|---|---|
| **Upstox Historical V3** | Daily and intraday OHLCV (multi-day) | `GET /v2/historical-candle/v3/:instrument_key/:interval` |
| **Upstox Intraday V3** | Current-day intraday candles | `GET /v2/historical-candle/intraday/v3/:instrument_key/:interval` |
| **Upstox Historical V2** | Day/Week/Month intervals | `GET /v2/historical-candle/:instrument_key/:interval/:to_date/:from_date` |
| **Upstox WebSocket** | Real-time price updates | Market Data Feed WebSocket |
| **Supabase** | OHLCV cache, scan results, configuration | PostgreSQL |

### 10.2 Supabase Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `stock_candles_1d` | Daily OHLCV cache | instrument_key, date, open, high, low, close, volume |
| `stock_candles_15m` | 15-minute OHLCV cache | instrument_key, timestamp, open, high, low, close, volume |
| `scanner_instruments` | Active instrument list | symbol, name, instrument_key, is_active |
| `positional_scan_results` | Positional scan results | scanner_id, results (JSONB), updated_at |
| `positional_scan_meta` | Scan metadata | scanner_id, last_run, status |
| `stock_candles_meta` | Configuration (incl. Upstox token) | key, value, updated_at |

### 10.3 Data Refresh Strategy

| Interval | Initial Lookback | Incremental | Batch Size | Delay Between Batches |
|---|---|---|---|---|
| Daily (1d) | 365 days | From last stored date | 3 stocks | 1200ms |
| 15-minute (15m) | 60 days | From last stored timestamp | 2 stocks | 1500ms |

**Incremental logic:** For each instrument, the system checks the latest stored date/timestamp, then fetches only missing data from Upstox. This minimizes API calls and reduces data transfer.

### 10.4 Rate Limiting

- Upstox API has rate limits; the system uses configurable batch sizes and delays
- Batch processing with parallel requests within each batch
- Exponential backoff on API errors (not yet implemented — recommended)

---

## 11. Stock Universe

### 11.1 Supported Universes

| Universe | Stock Count | Description |
|---|---|---|
| **Nifty 50** | 50 | Top 50 NSE stocks by market cap |
| **Nifty 200** | 200 | Top 200 NSE stocks (planned) |
| **Nifty 500** | 500 | Top 500 NSE stocks (planned) |
| **Nifty 750** | 750 | Extended universe (available for charting) |
| **All NSE Stocks** | Variable | All actively traded NSE equities (planned) |

### 11.2 Instrument Data

Each instrument has:

| Field | Description |
|---|---|
| `symbol` | NSE trading symbol (e.g., RELIANCE) |
| `name` | Full company name |
| `instrument_key` | Upstox instrument key (e.g., `NSE_EQ|INE002A01018`) |

### 11.3 Universe for Different Modules

| Module | Default Universe | Configurable |
|---|---|---|
| Custom Scanner | Loaded from `scanner_instruments` table | Yes (dropdown: Nifty 50/200/500/750/All) |
| Positional Scanners | Configurable per scan | Yes (Nifty 50 or Nifty 750 + custom) |
| Chart | Nifty 750 | Stock search dropdown |
| Pre-Built Screeners | N/A (mock data currently) | To be implemented |

---

## Appendix A — Condition Interaction Matrix

This matrix shows which UI elements appear based on the selected indicator type and operator.

| Indicator Output Type | Operator | Left Params | Right Value | Right Indicator | Right Multiplier | Right Value 2 | Time Modifier |
|---|---|---|---|---|---|---|---|
| Numeric | `greater_than` | Yes | Yes | Yes | Yes (if indicator) | No | No |
| Numeric | `less_than` | Yes | Yes | Yes | Yes (if indicator) | No | No |
| Numeric | `greater_equal` | Yes | Yes | Yes | Yes (if indicator) | No | No |
| Numeric | `less_equal` | Yes | Yes | Yes | Yes (if indicator) | No | No |
| Numeric | `crossed_above` | Yes | Yes | Yes | Yes (if indicator) | No | Optional: `within_last` |
| Numeric | `crossed_below` | Yes | Yes | Yes | Yes (if indicator) | No | Optional: `within_last` |
| Numeric | `is_increasing` | Yes | No | No | No | No | Required: N bars |
| Numeric | `is_decreasing` | Yes | No | No | No | No | Required: N bars |
| Numeric | `is_between` | Yes | Yes (lower) | No | No | Yes (upper) | No |
| Pattern | `detected` | Yes | No | No | No | No | Optional: `within_last` or `exactly_ago` |

---

## Appendix B — Positional Scanner Algorithms

### B.1 Consolidation Breakout (Positional)

**Scanner ID:** `consolidation-breakout`

**Algorithm overview:** Detects stocks breaking out of multi-week consolidation bases with volume confirmation.

**Input requirements:** Minimum 200 daily bars.

**Tier classification:**

| Tier | Name | Entry Criteria |
|---|---|---|
| 1 | Ready to Trade | All criteria pass + breakout confirmed + breakout volume ≥ 1.5× average |
| 2A | Imminent Breakout | Most criteria pass + within 3% of breakout level |
| 2B | Watchlist | Good base structure + within 6% of breakout level |
| 3 | Not qualifying | Fails key criteria |

**Consolidation detection criteria:**

| # | Criterion | Threshold |
|---|---|---|
| 1 | Consolidation duration | 20–80 days |
| 2 | Consolidation range (high-low) | ≤ 15% |
| 3 | Support touches | ≥ 2 |
| 4 | Resistance touches | ≥ 2 |
| 5 | No lower lows after day 3 | Must hold |
| 6 | No large red candles (> 3%) | In consolidation zone |
| 7 | V-shape rejection | Base must not be V-shaped |

**Scoring system (weighted, max 100):**

| Component | Weight | Scoring Logic |
|---|---|---|
| Trend alignment | 20 pts | Above 200 DMA + 50 DMA > 200 DMA (golden cross) |
| Prior advance | 15 pts | 130-day advance percentage |
| Base tightness | 15 pts | Range %, tighter = higher score |
| Volume contraction | 15 pts | Volume in last 1/3 vs first 1/3 of base |
| Relative strength | 10 pts | Stock performance vs Nifty 50 |
| Base stage | 10 pts | 1st base = full points, 2nd = half, 3rd+ = 0 |
| Support/resistance | 10 pts | Number of touches (more = higher) |
| Clean structure | 5 pts | No large red candles, no lower lows |

**Output fields:**

| Field | Description |
|---|---|
| Tier | 1, 2A, 2B, or 3 |
| Stage | 1st, 2nd, 3rd+ base breakout |
| Breakout Level | Consolidation high |
| Target | Measured-move target (consolidation high + consolidation range) |
| Risk:Reward | (Target − Entry) / (Entry − Consolidation Low) |
| Relative Strength | Performance vs Nifty 50 |
| Trend | Above/below 200 DMA |
| Score | 0–100 composite score |
| Distance % | Current price distance from breakout level |

### B.2 Cup and Handle

**Scanner ID:** `cup-handle`

**Algorithm overview:** Textbook William O'Neil cup-and-handle pattern detection with multi-criteria confidence scoring.

**Configuration thresholds:**

| Parameter | Value |
|---|---|
| Cup depth | 12–35% |
| Cup duration | 30–150 days (ideal: 50–100) |
| Roundedness factor | ≥ 1.3 (U-shape, not V-shape) |
| Right rim tolerance | Within 3% of left rim |
| Handle duration | 5–40 days (ideal: 10–20) |
| Handle depth | ≤ 15% of right rim, ≤ 50% of cup depth |
| Handle position | Upper third of cup range |
| Prior uptrend | ≥ 30% gain over 120 days preceding the cup |
| Minimum confidence | 75 / 100 |

**Confidence scoring factors:**
- Cup depth relative to ideal range
- Cup duration relative to ideal range
- Cup roundedness
- Handle depth relative to ideal
- Handle duration relative to ideal
- Prior uptrend strength
- Right rim symmetry

**Output fields:** Resistance level, % from resistance, cup low, handle low, confidence score, measured-move target.

### B.3 Tiered Consolidation Breakout (Swing Context)

**Scanner ID:** Used in Chart page.

**Swing vs Positional thresholds:**

| Parameter | Swing | Positional |
|---|---|---|
| Consolidation duration | 5–25 days | 10–60 days |
| Prior move lookback | 20 days | 40–60 days |
| Tier 2A distance | ≤ 2% | ≤ 2.5% |
| Tier 2B distance | ≤ 5% | ≤ 8% |

### B.4 MACD Crossover Scanners

**Daily (1D) scanner:** Scans for bullish MACD(12,26,9) crossover in the last 30 daily bars.

**Monthly (1M) scanner:** Scans for bullish MACD(12,26,9) crossover in the last 30 monthly bars. Monthly OHLCV is constructed from daily data by grouping bars into calendar months.

**Bullish Cross Building (Negative):** Both MACD and Signal lines are negative, but the histogram is improving (rising for 2+ consecutive bars). Indicates the crossover is building — early entry opportunity.

**Bullish Cross Building (Positive):** Both MACD and Signal lines are positive, histogram is negative but rising. Indicates a pullback within an uptrend is ending.

---

## Appendix C — Futures & Options Parameters

These parameters are planned (currently locked in the UI). They will enable scanning based on derivatives data.

### C.1 Futures Data

| Parameter | Description |
|---|---|
| Fair Value | Theoretical future price based on spot + cost of carry |
| Future Close Price | Latest close of the nearest-month future |
| Lot Size | Number of shares per lot |
| Future Open Interest | Total open interest in futures |
| 1D Change in Future OI | Day-over-day OI change |
| 1W Change in Future OI | Week-over-week OI change |
| Future Volume | Futures traded volume |
| 1D Change in Future Volume | Day-over-day volume change |
| 1W Change in Future Volume | Week-over-week volume change |
| Basis | Future price − Spot price |
| Fair Value Spread | Future price − Fair value |
| Cash & Carry Profit | Annualized return from cash-and-carry arbitrage |
| Rollover Cost | Cost of rolling to next month |
| Percentage Rollover | % of OI rolled to next month |
| Calendar Spread | Difference between near and far month futures |

### C.2 Options Data

| Parameter | Description |
|---|---|
| Call Open Interest | Total call OI across strikes |
| Put Open Interest | Total put OI across strikes |
| 1D Change in Call OI | Day-over-day call OI change |
| 1D Change in Put OI | Day-over-day put OI change |
| 1W Change in Call OI | Week-over-week call OI change |
| 1W Change in Put OI | Week-over-week put OI change |
| Highest Call OI Strike | Strike with maximum call OI (resistance proxy) |
| Highest Put OI Strike | Strike with maximum put OI (support proxy) |
| Highest 1D OI Change CE Strike | CE strike with maximum 1-day OI build-up |
| Highest 1D OI Change PE Strike | PE strike with maximum 1-day OI build-up |
| Highest 1W OI Change CE Strike | CE strike with maximum 1-week OI build-up |
| Highest 1W OI Change PE Strike | PE strike with maximum 1-week OI build-up |
| Put Call Ratio | Total Put OI / Total Call OI |
| 1D Change in Put Call Ratio | Day-over-day PCR change |

---

## Appendix D — Fundamental Data Parameters

These parameters are planned (currently locked in the UI). They will enable screening based on financial data.

### D.1 Profitability Parameters (55+)

**Current period (TTM):**
Sales, Operating Profit Margin (OPM), Profit After Tax, Return on Capital Employed (ROCE), EPS, Operating Profit, Interest, Depreciation, EBIT, Net Profit, Current Tax, Tax, Other Income, Change in Promoter Holding.

**Last year:** Sales, Operating Profit, Other Income, EBIDT, Depreciation, EBIT, Interest, PBT, Tax, PAT, Extraordinary Items, Net Profit, Dividend, Material Cost, Employee Cost, OPM, NPM, EPS.

**Preceding year:** Same line items as "Last year" for the year before.

**Growth rates:** Sales growth (3Y, 5Y, 7Y, 10Y), EBIDT growth (3Y, 5Y, 7Y, 10Y), EPS growth (3Y, 5Y, 7Y, 10Y), Profit growth (3Y, 5Y, 7Y, 10Y), Sales growth median (5Y, 10Y).

**Averages:** Average Earnings 5Y/10Y, Average EBIT 5Y/10Y.

**Other:** TTM Result Date, Last Annual Result Date, Sales preceding 12 months, Net Profit preceding 12 months, Change in Promoter Holding 3 years.

### D.2 Cash Flow Parameters (30+)

**Last year:** Cash from Operations, Free Cash Flow, Cash from Investing, Cash from Financing, Net Cash Flow, Cash at Beginning, Cash at End.

**Preceding year:** Same items as "Last year."

**Multi-year:** Free Cash Flow (3Y, 5Y, 7Y, 10Y), Operating Cash Flow (3Y, 5Y, 7Y, 10Y), Investing Cash Flow (3Y, 5Y, 7Y, 10Y), Cash balance (3Y, 5Y, 7Y back).

### D.3 Valuation Parameters (29)

| Parameter | Description |
|---|---|
| PE Ratio | Price / Earnings per share |
| Forward PE Ratio | Price / Forward EPS estimate |
| PE Premium vs Sector | Stock PE vs sector average PE |
| PE Premium vs Sub-sector | Stock PE vs sub-sector average PE |
| TTM PE Ratio | Trailing twelve months PE |
| PB Ratio | Price / Book value per share |
| PB Premium vs Sector | Stock PB vs sector average PB |
| PB Premium vs Sub-sector | Stock PB vs sub-sector average PB |
| PS Ratio | Price / Sales per share |
| Forward PS Ratio | Price / Forward sales estimate |
| PS Premium vs Sector | Stock PS vs sector average PS |
| PS Premium vs Sub-sector | Stock PS vs sub-sector average PS |
| Dividend Yield | Annual dividend / Price |
| Dividend Yield vs Sector | Stock yield vs sector average |
| Dividend Yield vs Sub-sector | Stock yield vs sub-sector average |
| EV/EBITDA Ratio | Enterprise Value / EBITDA |
| Enterprise Value | Market cap + debt − cash |
| EV/EBIT Ratio | Enterprise Value / EBIT |
| EV/Revenue Ratio | Enterprise Value / Revenue |
| EV/Invested Capital | Enterprise Value / Invested Capital |
| EV/Free Cash Flow | Enterprise Value / FCF |
| Price/Free Cash Flow | Market Cap / FCF |
| Price/CFO | Market Cap / Cash from Operations |
| Price/Sales | Market Cap / Sales |
| Sector PE | Sector average PE |
| Sector PB | Sector average PB |
| Sector Dividend Yield | Sector average dividend yield |

### D.4 Financial Ratios (Planned)

This category is reserved for additional financial ratios not covered above. Specific parameters to be defined during implementation:

- Debt/Equity Ratio
- Current Ratio
- Quick Ratio
- Interest Coverage Ratio
- Return on Equity (ROE)
- Return on Assets (ROA)
- Asset Turnover
- Inventory Turnover
- Receivables Turnover
- Working Capital Days
- And other standard ratios

---

## Glossary

| Term | Definition |
|---|---|
| **ATH** | All-Time High |
| **ATR** | Average True Range — volatility indicator measuring average range of candles |
| **BTST** | Buy Today, Sell Tomorrow |
| **CPR** | Central Pivot Range |
| **DMA** | Day Moving Average |
| **EMA** | Exponential Moving Average |
| **GRM** | Gross Refining Margin |
| **HH-HL** | Higher High, Higher Low (uptrend structure) |
| **MACD** | Moving Average Convergence Divergence |
| **MFI** | Money Flow Index |
| **OBV** | On-Balance Volume |
| **OI** | Open Interest |
| **OHLCV** | Open, High, Low, Close, Volume — standard candlestick data |
| **ORB** | Opening Range Breakout |
| **PCR** | Put-Call Ratio |
| **RSI** | Relative Strength Index |
| **SMA** | Simple Moving Average |
| **VCP** | Volatility Contraction Pattern |
| **VWAP** | Volume-Weighted Average Price |
| **VWMA** | Volume-Weighted Moving Average |

---

*End of Document*
