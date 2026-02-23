# Product Note: Equity & Options Scanners Platform

**One-liner:** A platform where users build, run, and share equity and options screeners—with pre-built screeners by trading style, backtesting, and a marketplace to discover and reuse screeners.

---

## Core Use Cases

### 1. Custom Screeners — Visual Query Builder

**Goal:** Give users PineScript-level power through a visual UI — no coding required. A user should be able to express any condition they could write in TradingView's Pine Script, but by picking from dropdowns and filling in fields.

---

#### 1A. Core Interaction Model — Condition Builder

The screener is built using **Condition Groups** combined with **AND / OR** logic. Each group has its own **candle timeframe**, enabling multi-timeframe analysis.

```
IF  [Daily]   ( RSI(14) < 30  AND  EMA(9) > EMA(21) )         ← Group 1
AND [15 min]  ( MACD Line crossed above Signal Line )          ← Group 2
THEN → show matching stocks
```

**Each group** has:
- **Timeframe** — The candle interval for all conditions in this group (1 min, 5 min, 15 min, 1 hour, Daily, Weekly). Different groups can use different timeframes.
- **Match logic** — ALL (AND) or ANY (OR) within the group.

**Between groups**, the user chooses **AND** or **OR** — displayed as an editable connector pill. Two "Add Group" buttons are provided: `+ AND Group` and `+ OR Group`.

**Each condition row** follows this structure:

```
[LEFT operand]  [operator]  [RIGHT operand]  [time modifier (optional)]
```

Where:
- **LEFT operand** — An indicator or price field, picked from a categorized dropdown, with configurable parameters inline (period, source, multiplier, etc.)
- **Operator** — Changes dynamically based on what the LEFT operand is (see Condition Types below)
- **RIGHT operand** — Either a fixed number OR `[N]×` another indicator (multiplier for volume spikes, relative comparisons, etc.)
- **Time modifier** (optional) — controls *when* the condition must be true:

| Mode | Meaning | Example |
|------|---------|---------|
| *(unchecked)* | True on the current bar | RSI(14) < 30 right now |
| **Within last** N bars | True at least once in the last N bars | MACD crossed above Signal within last 5 bars |
| **Exactly** N bars ago | True on that specific past bar (not necessarily now) | RSI(14) < 30 exactly 5 bars ago (recovery play) |
| **All of last** N bars | True on every single bar for N bars | Volume > 2× avg for all of last 3 bars (sustained, not a fluke) |
| **For** N consecutive bars | *(auto-shown for "is increasing" / "is decreasing")* | MACD Histogram is increasing for 3 bars |

**Multi-timeframe examples:**

| Strategy | Group 1 (Daily) | Connector | Group 2 (15 min) |
|----------|-----------------|-----------|-------------------|
| Trend + entry | RSI(14) < 30 AND EMA(9) > EMA(21) | **AND** | MACD Line crossed above Signal Line |
| Weekly trend + daily setup | [Weekly] Price > EMA(200) | **AND** | [Daily] Bullish Engulfing detected AND Volume > 2× Volume SMA(20) |
| Multi-timeframe divergence | [Daily] RSI Divergence [Bullish] detected | **AND** | [15 min] MACD Line crossed above Signal Line within last 5 bars |

---

#### 1B. Condition Types

| Type | Format | Example |
|------|--------|---------|
| **Value comparison** | `Indicator` `>  <  >=  <=  =` `Number or [N]× Indicator` | RSI(14) > 70; Close > EMA(200); Volume > **2×** Volume SMA(20) |
| **Crossover** | `Indicator A` `crossed above / crossed below` `[N]× Indicator B or Number` | MACD Line crossed above Signal Line; Close crossed above **1.02×** EMA(200) |
| **Crossover within window** | `Indicator A` `crossed above / below` `Indicator B` `within last N bars` | EMA(9) crossed above EMA(21) within last 10 bars |
| **Trend / Direction** | `Indicator` `is increasing / is decreasing` `for N bars` | MACD Histogram is increasing for 3 consecutive bars |
| **Range** | `Indicator` `is between` `X` `and` `Y` | RSI(14) is between 40 and 60 |
| **Pattern detection** | `Candlestick Pattern` `detected` / `detected within last N bars` | Bearish Engulfing detected within last 3 bars |

---

#### 1B-2. Multiplier (N×) — Enabling Volume Spikes, Relative Comparisons, and More

When the right operand is an **indicator** (not a fixed value), a **multiplier field** `[N]×` appears between the operator and the indicator. Default is 1 (i.e., no multiplier — hidden in the UI). This single field unlocks a wide range of conditions:

| Use case | Condition | Multiplier |
|----------|-----------|------------|
| Volume spike | Volume > **2×** Volume SMA(20) | 2 |
| Volume surge | Volume > **3×** Volume SMA(20) | 3 |
| Delivery surge | Delivery % > **1.5×** its 10-day SMA | 1.5 |
| Price 5% above EMA | Close > **1.05×** EMA(200) | 1.05 |
| Price 5% below 52W High | Close < **0.95×** 52-Week High | 0.95 |
| ATR breakout | Close > **2×** ATR(14) — compare to ATR-scaled value | 2 |

**Pre-computed relative indicators** are also provided as convenient shortcuts that need no multiplier — the user just compares to a number:
- **Relative Volume** (period) — Volume / Volume SMA(period). A value of 2 means volume is 2× average. Condition: `Relative Volume(20) > 2`
- **% from SMA** (period) — percentage distance of close from SMA. Condition: `% from SMA(200) > 5` (price is 5%+ above SMA 200)
- **% from EMA** (period) — same for EMA
- **% from 52W High** — how far below the yearly high. Condition: `% from 52W High > -5` (within 5% of high)
- **% from 52W Low** — how far above the yearly low

---

#### 1C. Indicator Catalog (full list)

**Moving Averages** — each with configurable period and source (close, open, high, low, hl2, hlc3)
- SMA, EMA, WMA, VWMA, Hull MA, DEMA, TEMA

**Oscillators**
- RSI (period, source)
- Stochastic %K, %D (K period, D period, smoothing)
- Stochastic RSI %K, %D (RSI period, Stoch period, K smooth, D smooth)
- Williams %R (period)
- CCI (period, source)
- ROC — Rate of Change (period, source)
- MFI — Money Flow Index (period)
- CMO — Chande Momentum Oscillator (period)

**MACD** (fast, slow, signal period)
- MACD Line
- Signal Line
- Histogram

**Volatility**
- Bollinger Bands — Upper / Middle / Lower (period, StdDev multiplier)
- ATR — Average True Range (period)
- Supertrend (period, multiplier) — value and direction
- Keltner Channel — Upper / Lower (period, ATR multiplier)

**Volume**
- Volume (raw)
- Volume SMA (period)
- OBV — On-Balance Volume
- VWAP
- Delivery % (for NSE)

**Divergence Patterns** — compound pattern indicators that compare price swings with oscillator swings. These are detected/not-detected like candlestick patterns, but carry configurable parameters including a **select/enum** param for divergence type.

Each divergence indicator supports:

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| Type | select: Bullish (Regular) / Bearish (Regular) / Hidden Bullish / Hidden Bearish | Bullish | Which divergence to detect |
| Lookback Bars | number | 20 | How far back to scan for swing pivots |
| Pivot Strength | number | 5 | Bars on each side of a point to confirm it as a swing high/low |
| _+ oscillator-specific params_ | number | varies | E.g., RSI Period, MACD Fast/Slow/Signal, Stochastic K/D/Smooth |

Supported oscillators:
- RSI Divergence (RSI Period)
- MACD Divergence (Fast, Slow, Signal)
- Stochastic Divergence (K, D, Smooth)
- OBV Divergence (no extra param — OBV has none)
- CCI Divergence (Period)

> **Data model note:** Divergence indicators require the param system to support **select/enum** params alongside numeric ones. The `IndicatorParam` type is a union of `NumberParam` (key, label, type:"number", defaultValue, min, max, step) and `SelectParam` (key, label, type:"select", defaultValue, options[]). This pattern also enables future indicators that need enum choices (e.g., Pivot Point type: Classic/Fibonacci/Camarilla).

**Price Fields**
- Open, High, Low, Close (current bar)
- Previous bar Open / High / Low / Close
- 52-Week High, 52-Week Low
- Day High, Day Low
- Price change (1D %, 1W %, 1M %)

**Candlestick Patterns**
- Single-bar: Doji, Hammer, Inverted Hammer, Spinning Top, Marubozu, Hanging Man, Shooting Star
- Two-bar: Bullish Engulfing, Bearish Engulfing, Piercing Line, Dark Cloud Cover, Tweezer Top, Tweezer Bottom, Bullish Harami, Bearish Harami
- Three-bar: Morning Star, Evening Star, Three White Soldiers, Three Black Crows, Three Inside Up, Three Inside Down

**Pivot Points** (Classic, Fibonacci, Camarilla)
- Pivot, S1, S2, S3, R1, R2, R3

---

#### 1D. User Interaction Flow — Step by Step

**Step 1 — Start:** User sees an empty builder with one Condition Group containing one empty condition row, plus global controls for Timeframe and Universe.

**Step 2 — Pick indicator (LEFT operand):** Click the first dropdown; a categorized flyout appears:
```
Moving Averages  →  SMA, EMA, WMA, Hull MA …
Oscillators      →  RSI, Stochastic, Williams %R …
MACD             →  MACD Line, Signal Line, Histogram
Volatility       →  Bollinger Upper/Mid/Lower, ATR, Supertrend …
Volume           →  Volume, Volume SMA, OBV, VWAP …
Price            →  Close, Open, High, Low, 52W High …
Candlesticks     →  Bullish Engulfing, Morning Star …
```
User picks, e.g., "MACD Line".

**Step 3 — Configure parameters:** Inline fields appear next to the indicator: `Fast: [12]  Slow: [26]  Signal: [9]` — pre-filled with standard defaults, editable.

**Step 4 — Pick operator:** Dropdown shows operators valid for this indicator type:
- For numeric indicators: `is greater than`, `is less than`, `crossed above`, `crossed below`, `is increasing`, `is decreasing`, `is between`
- For candlestick patterns: `detected`, `detected within last N bars`

User picks "crossed above".

**Step 5 — Pick RIGHT operand:** User picks either:
- **Another indicator** (same categorized dropdown) — e.g., "Signal Line"
- **A number** — e.g., "0"

User picks "Signal Line" (auto-inherits MACD params).

**Step 6 — Optional time modifier:** A "within last" checkbox appears. User checks it and types "5 bars".

**Step 7 — Add more conditions:** Click "+ Add condition" within the same group (AND logic), or "+ Add Group" to create a new OR block.

**Step 8 — Plain-English summary:** As the user builds, a live sentence renders below the builder:
> *"Stocks where MACD Line(12,26,9) crossed above Signal Line within last 5 bars AND RSI(14) is less than 30 AND Volume is greater than 1.5x its 20-day SMA"*

This gives users confidence the query is correct without reading the builder cells.

**Step 9 — Set universe:** Nifty 50 / Nifty 200 / Nifty 500 / Nifty 750 / All NSE (global, applies to all groups).

**Step 10 — Run Scan:** Results table appears on the right (same as current layout: Symbol, Price, Change, Volume, Mkt Cap, etc.).

---

#### 1E. Wireframe — Visual Query Builder Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Universe: [Nifty 500 ▾]                                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─ [Daily ▾] · Match [ALL ▾] ──────────────────── [× del] ─┐ │
│  │                                                           │ │
│  │  [MACD Line ▾] [12] [26] [9]  [crossed above ▾]          │ │
│  │  [Signal Line ▾]  [within last ▾] [5] bars       [× row] │ │
│  │                                                           │ │
│  │  [RSI ▾] [period: 14]  [is less than ▾]  [30]    [× row] │ │
│  │                                                           │ │
│  │  [Volume ▾]  [is greater than ▾] [2]× [Vol SMA ▾][20]    │ │
│  │                                                   [× row] │ │
│  │                                                           │ │
│  │  [+ Add condition]                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  ──── (AND) ────  ← clickable, toggles to OR                  │
│                                                                │
│  ┌─ [15 min ▾] · Match [ALL ▾] ─────────────────── [× del] ─┐ │
│  │                                                           │ │
│  │  [MACD Line ▾]  [crossed above ▾]  [Signal Line ▾]       │ │
│  │  ☐ Within last [3] bars                           [× row] │ │
│  │                                                           │ │
│  │  [+ Add condition]                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  [+ AND Group]                [+ OR Group]                     │
│                                                                │
│  ┌─ Summary ───────────────────────────────────────────────┐   │
│  │ "Stocks where (MACD Line crossed above Signal Line      │   │
│  │  within last 5 bars AND RSI(14) < 30 AND Volume >       │   │
│  │  1.5x 20-day avg) OR (Bearish Engulfing detected        │   │
│  │  within last 3 bars)"                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  [Clear All]                            [Save]  [Run Scan ▶]  │
└────────────────────────────────────────────────────────────────┘
```

---

#### 1F. Complex Scenario Examples (what users can express)

| Scenario | How user builds it |
|----------|-------------------|
| MACD < Signal AND Histogram increasing | Group: [MACD Line] [is less than] [Signal Line] **AND** [MACD Histogram] [is increasing] [for 3 bars] |
| MACD Cross happened in last 10 days | [MACD Line] [crossed above] [Signal Line] [within last 10 bars] — timeframe set to Daily |
| RSI Bullish Divergence | Select [RSI Divergence] → Type [Bullish (Regular)] RSI Period [14] Lookback [20] Pivot [5] → operator [detected] → optional [within last 10 bars]. No manual multi-condition needed — the divergence indicator encapsulates the logic. |
| EMA 9/21 cross + volume surge + bullish candle | Group: [EMA(9)] [crossed above] [EMA(21)] [within last 3 bars] **AND** [Volume] [is greater than] **[2]×** [Volume SMA(20)] **AND** [Bullish Engulfing] [detected] [within last 3 bars] |
| Volume spike (simple) | **Method A (multiplier):** [Volume] [is greater than] **[2]×** [Volume SMA(20)]. **Method B (relative indicator):** [Relative Volume(20)] [is greater than] [2]. Both express the same condition — user picks whichever feels more natural. |
| Supertrend buy signal | [Supertrend Direction(10,3)] [changed to] [Bullish] |
| Bollinger squeeze + breakout | Group: [Bollinger Bandwidth(20,2)] [is less than] [0.1] for [5 bars] **AND** [Close] [crossed above] [Bollinger Upper(20,2)] |
| Price near 52W high with rising delivery | Group: [% from 52W High] [is greater than] [-5] **AND** [Delivery %] [is greater than] [50] **AND** [Delivery %] [is increasing] [for 3 bars] |
| Price 5% above EMA 200 | **Method A:** [Close] [is greater than] **[1.05]×** [EMA(200)]. **Method B:** [% from EMA(200)] [is greater than] [5] |

---

#### 1G. Data Model (JSON representation of a saved screener)

A saved screener serializes as:
```json
{
  "name": "Reversal after oversold",
  "timeframe": "1d",
  "universe": "nifty500",
  "logic": "OR",
  "groups": [
    {
      "logic": "AND",
      "conditions": [
        {
          "left": { "type": "indicator", "id": "macd_line", "params": { "fast": 12, "slow": 26, "signal": 9 } },
          "operator": "crossed_above",
          "right": { "type": "indicator", "id": "macd_signal", "params": { "fast": 12, "slow": 26, "signal": 9 } },
          "timeModifier": { "withinLast": 5 }
        },
        {
          "left": { "type": "indicator", "id": "rsi", "params": { "period": 14, "source": "close" } },
          "operator": "less_than",
          "right": { "type": "value", "value": 30 }
        }
      ]
    }
  ]
}
```

This JSON is what gets stored, published to the marketplace, and imported/forked.

---

### 2. Pre-Built Screeners by Persona / Trading Style

Ship curated screeners for **equity**, **intraday**, **swing**, **positional**, and **long-term** styles. Each pre-built screener is stored in the same JSON format as custom screeners (see 1G above), so users can "Use" it directly or "Fork" it — which opens it in the Visual Query Builder with all conditions pre-filled and editable. Persona labels and short descriptions help users pick the right starting point.

### 3. Equity Backtesting Platform

Users define strategies (rules, entry/exit, position sizing) and run backtests on historical equity data. Outputs: performance (return, Sharpe, drawdown), trade log, and basic visualizations. Focus on transparency and reproducibility—clear rules, same data for all.

### 4. Save & Publish Screeners (Marketplace)

Users can save screeners privately or **publish** them for others to discover. Discovery is effective: search, filters (category, trading style, author, performance/rating), and a clear "Use" or "Fork" flow so others can run or customize published screeners—forming a lightweight marketplace.

---

## Additional Product Ideas

Ideas to consider for roadmap and prioritization.

### Discovery & Workflow

- **Watchlists** – Save scan results or manual symbols into named watchlists; run screeners on a watchlist as the universe.
- **Alerts** – Alert when a symbol enters/exits a screener result (email, push, or in-app), with throttle/frequency controls.
- **Scan history & favorites** – History of runs (time, screener, universe, result count) and ability to favorite screeners for quick access.

### Backtesting & Strategy

- **Backtest sharing / strategy marketplace** – Publish backtest strategies (name, description, rules) so others can run the same logic on their universe or period.
- **Benchmark comparison** – Compare strategy returns to Nifty 50 / Nifty 750 (or custom benchmark) in backtest UI.
- **Walk-forward / out-of-sample** – Option to reserve a time window for out-of-sample testing to reduce overfitting.

### Options-Specific

- **Options flow / unusual activity** – Scans or pre-built screeners for unusual options volume, OI build-up, large single-leg or spread trades (where data is available).
- **IV rank / IV percentile** – Add IV context to option screeners and strategy ideas (e.g. sell premium when IV rank is high).

### Data & Platform

- **Universe management** – User-defined universes (sector, custom list, index) and reuse across screeners and backtests.
- **Data quality & coverage** – Clear documentation of which symbols and time ranges are available for screening and backtesting (equity vs options, history depth).
- **Export** – Export screener results and backtest trade log to CSV/Excel for external analysis.

### Trust & Engagement

- **Screener performance / ratings** – For published screeners: optional stats (e.g. run count, fork count) or user ratings to aid discovery.
- **Transparency** – For backtests and published screeners: show exact rules, universe, and date range so results are reproducible.

### Experience & Growth

- **Onboarding** – Short guided flow: pick your style (intraday / swing / positional), then suggest 1–2 pre-built screeners and a "create your first custom screener" path.
- **Templates** – "Start from template" when creating a custom screener (e.g. "Momentum + volume", "Low P/E + high ROE") to reduce blank-page friction.
- **Mobile / responsive** – Ensure key flows (run pre-built screener, view results, set alerts) work well on mobile for on-the-go checks.

### Compliance & Safety

- **Disclaimer & risk** – Standard disclaimers: screens and backtests are not advice; past performance does not guarantee future results; options and equity trading carry risk.
- **Attribution** – When users publish screeners/strategies, clear attribution and "use at your own risk" so the platform is not liable for third-party logic.

---

## Optional: Prioritization

| When | Focus |
|------|--------|
| **Now** | Custom screeners (fundamentals, technicals, options, candlesticks); pre-built screeners by trading style; save screeners. |
| **Next** | Backtesting; publish & discover screeners (marketplace); watchlists and alerts. |
| **Later** | Strategy marketplace; IV/options flow; onboarding and templates; mobile polish. |

---

## Out of Scope (v1)

- Full brokerage integration (order placement).
- Real-time streaming L2 / order book as a core feature.
- Social feed or chat; focus is on screeners and backtests, not community chat.

---

## Success Metrics (Suggested)

- **Screeners run per day** – Engagement with pre-built and custom screeners.
- **Backtests run per week** – Adoption of backtesting.
- **Published screeners & forks** – Marketplace activity (listings, use, fork count).
