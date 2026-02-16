/**
 * Seven Screener View Modes
 * 
 * 1. Intent-Based: Trading style tabs with screener lists
 * 2. Card Grid: Category sections with screener cards
 * 3. Hybrid (Default): Hot section + intent filter + category grid
 * 4. Daily Feed: Editorial curated style
 * 5. Smart Feed: Stock-first with screener tags
 * 6. Trade Ideas Engine: Curated high-conviction ideas with thesis
 * 7. Scanner Studio: Intent-first power tools for self-directed traders
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScreenerCard, ScreenerListItem } from "@/components/ScreenerCard";
import { IntentFilter, IntentTabs, type IntentFilterValue } from "@/components/IntentFilter";
import { StockPreviewTable } from "@/components/StockPreviewTable";
import {
  SCREENERS,
  SCREENER_CATEGORY_INFO,
  getScreenersByCategory,
  getScreenersByStyle,
  getHotScreeners,
  getMarketPulse,
  getTradeIdeas,
  getMarketRegime,
  getTodaysTopPicks,
  // Scanner Studio imports
  SCANNER_CATEGORIES,
  getScanners,
  getPopularScanners,
  getTotalScannerMatches,
  getScannerCategoryStats,
  getScannersByJayeshPill,
  DISPLAY_CATEGORY_ORDER,
  DISPLAY_CATEGORY_LABELS,
  type Scanner,
  type ScannerIntent,
  type TimeHorizonFilter,
  type JayeshPillStyle,
  type ScannerDisplayCategory,
  type Screener,
  type ScreenerCategory,
  type TradingStyle,
  type ScreenerStock,
  type TradeIdea,
  type ConvictionLevel,
} from "@/data/screeners";

// ========== VIEW 1: INTENT-BASED ==========
export function IntentBasedView() {
  const [activeStyle, setActiveStyle] = useState<IntentFilterValue>("intraday");

  const styleCounts = useMemo(() => ({
    all: SCREENERS.length,
    intraday: getScreenersByStyle("intraday").length,
    btst: getScreenersByStyle("btst").length,
    swing: getScreenersByStyle("swing").length,
    positional: getScreenersByStyle("positional").length,
  }), []);

  const filteredScreeners = useMemo(() => {
    if (activeStyle === "all") return SCREENERS;
    return getScreenersByStyle(activeStyle as TradingStyle);
  }, [activeStyle]);

  // Group by category
  const groupedScreeners = useMemo(() => {
    const grouped: Record<ScreenerCategory, Screener[]> = {
      price: [],
      volume: [],
      technicals: [],
      candlesticks: [],
      fundamentals: [],
    };
    filteredScreeners.forEach(s => {
      grouped[s.category].push(s);
    });
    return grouped;
  }, [filteredScreeners]);

  return (
    <div className="flex gap-6">
      {/* Left sidebar - Intent tabs */}
      <div className="shrink-0">
        <IntentTabs
          value={activeStyle}
          onChange={setActiveStyle}
          counts={styleCounts}
        />
      </div>

      {/* Main content - Screener lists by category */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {activeStyle === "all" ? "All Screeners" : `${activeStyle.charAt(0).toUpperCase() + activeStyle.slice(1)} Screeners`}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredScreeners.length} screeners
          </span>
        </div>

        {SCREENER_CATEGORY_INFO.map(category => {
          const screeners = groupedScreeners[category.key];
          if (screeners.length === 0) return null;

          return (
            <div key={category.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{category.icon}</span>
                <h3 className="font-medium text-foreground">{category.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {screeners.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {screeners.map(screener => (
                  <ScreenerListItem
                    key={screener.id}
                    screener={screener}
                    onClick={() => alert(`Open screener: ${screener.name}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== VIEW 2: CARD GRID ==========
export function CardGridView() {
  const [selectedScreener, setSelectedScreener] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {SCREENER_CATEGORY_INFO.map(category => {
        const screeners = getScreenersByCategory(category.key);
        
        return (
          <div key={category.key}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <h2 className="font-semibold text-foreground">{category.name}</h2>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
              </div>
              <button className="text-sm text-primary hover:text-primary/80 font-medium">
                See all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {screeners.slice(0, 4).map(screener => (
                <ScreenerCard
                  key={screener.id}
                  screener={screener}
                  variant="default"
                  isSelected={selectedScreener === screener.id}
                  onClick={() => setSelectedScreener(
                    selectedScreener === screener.id ? null : screener.id
                  )}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========== VIEW 3: HYBRID (DEFAULT) ==========
export function HybridView() {
  const [intentFilter, setIntentFilter] = useState<IntentFilterValue>("all");
  const [selectedScreener, setSelectedScreener] = useState<string | null>(null);

  const hotScreeners = useMemo(() => getHotScreeners(), []);

  const filteredScreeners = useMemo(() => {
    if (intentFilter === "all") return SCREENERS;
    return getScreenersByStyle(intentFilter as TradingStyle);
  }, [intentFilter]);

  const intentCounts = useMemo(() => ({
    all: SCREENERS.length,
    intraday: getScreenersByStyle("intraday").length,
    btst: getScreenersByStyle("btst").length,
    swing: getScreenersByStyle("swing").length,
    positional: getScreenersByStyle("positional").length,
  }), []);

  // Group filtered screeners by category
  const groupedScreeners = useMemo(() => {
    const grouped: Record<ScreenerCategory, Screener[]> = {
      price: [],
      volume: [],
      technicals: [],
      candlesticks: [],
      fundamentals: [],
    };
    filteredScreeners.forEach(s => {
      grouped[s.category].push(s);
    });
    return grouped;
  }, [filteredScreeners]);

  return (
    <div className="space-y-6">
      {/* Intent Filter */}
      <IntentFilter
        value={intentFilter}
        onChange={setIntentFilter}
        counts={intentCounts}
      />

      {/* Hot Right Now Section */}
      {intentFilter === "all" && hotScreeners.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔥</span>
            <h2 className="font-semibold text-foreground">Hot Right Now</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotScreeners.slice(0, 3).map(screener => (
              <ScreenerCard
                key={screener.id}
                screener={screener}
                variant="default"
                showStyleBadges
                isSelected={selectedScreener === screener.id}
                onClick={() => setSelectedScreener(
                  selectedScreener === screener.id ? null : screener.id
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {SCREENER_CATEGORY_INFO.map(category => {
        const screeners = groupedScreeners[category.key];
        if (screeners.length === 0) return null;

        return (
          <div key={category.key}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{category.icon}</span>
                <h2 className="font-semibold text-foreground">{category.name}</h2>
                <Badge variant="secondary" className="text-xs">
                  {screeners.length}
                </Badge>
              </div>
              <button className="text-sm text-primary hover:text-primary/80 font-medium">
                See all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {screeners.slice(0, 4).map(screener => (
                <ScreenerCard
                  key={screener.id}
                  screener={screener}
                  variant="compact"
                  showDescription={false}
                  isSelected={selectedScreener === screener.id}
                  onClick={() => setSelectedScreener(
                    selectedScreener === screener.id ? null : screener.id
                  )}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========== VIEW 4: DAILY FEED (CURATED) ==========
export function DailyFeedView() {
  const marketPulse = useMemo(() => getMarketPulse(), []);
  const hotScreeners = useMemo(() => getHotScreeners(), []);

  // Curated sections
  const swingSetups = useMemo(() => 
    SCREENERS.filter(s => 
      s.applicableStyles.includes("swing") && 
      ["52w_high_zone", "support_breakout", "bollinger_squeeze", "bullish_engulfing"].includes(s.id)
    ), 
  []);

  const volumeAction = useMemo(() => 
    SCREENERS.filter(s => s.category === "volume").slice(0, 3),
  []);

  const fundamentalPicks = useMemo(() =>
    SCREENERS.filter(s => 
      ["fii_buying", "promoter_buying", "profit_growth"].includes(s.id)
    ),
  []);

  return (
    <div className="space-y-6">
      {/* Market Pulse Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>{marketPulse.date}</CardDescription>
              <CardTitle className="text-xl">Market Pulse</CardTitle>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {marketPulse.niftyValue.toLocaleString("en-IN")}
              </div>
              <div className={cn(
                "text-sm font-medium",
                marketPulse.niftyChangePct >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {marketPulse.niftyChangePct >= 0 ? "+" : ""}
                {marketPulse.niftyChange.toFixed(2)} ({marketPulse.niftyChangePct}%)
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-green-600 font-medium">{marketPulse.advances}</span>
              <span className="text-muted-foreground ml-1">Advances</span>
            </div>
            <div>
              <span className="text-red-600 font-medium">{marketPulse.declines}</span>
              <span className="text-muted-foreground ml-1">Declines</span>
            </div>
            <div>
              <span className="text-muted-foreground">{marketPulse.unchanged} Unchanged</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trending Today */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <CardTitle className="text-base">Trending Today</CardTitle>
              <CardDescription>High activity screeners</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hotScreeners.slice(0, 3).map(screener => (
              <div key={screener.id} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{screener.name}</span>
                  <Badge>{screener.stocks.length} stocks</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{screener.description}</p>
                <StockPreviewTable stocks={screener.stocks} maxRows={3} compact />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Swing Setups */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <div>
              <CardTitle className="text-base">Swing Setups</CardTitle>
              <CardDescription>2-10 day trade opportunities</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {swingSetups.map(screener => (
              <div key={screener.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{screener.name}</span>
                  <Badge variant="secondary" className="text-xs">{screener.stocks.length}</Badge>
                </div>
                <StockPreviewTable stocks={screener.stocks} maxRows={2} compact />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Volume Action */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <CardTitle className="text-base">Volume Action</CardTitle>
              <CardDescription>Unusual volume activity today</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {volumeAction.map(screener => (
              <div key={screener.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{screener.name}</span>
                  <Badge variant="secondary" className="text-xs">{screener.stocks.length}</Badge>
                </div>
                <StockPreviewTable stocks={screener.stocks} maxRows={3} compact />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fundamental Picks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <div>
              <CardTitle className="text-base">Smart Money Flow</CardTitle>
              <CardDescription>Institutional buying patterns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fundamentalPicks.map(screener => (
              <div key={screener.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{screener.name}</span>
                  <Badge variant="secondary" className="text-xs">{screener.stocks.length}</Badge>
                </div>
                <StockPreviewTable stocks={screener.stocks} maxRows={3} compact />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== VIEW 5: SMART FEED (STOCK-FIRST) ==========
interface StockWithScreeners {
  stock: ScreenerStock;
  screeners: Screener[];
}

export function SmartFeedView() {
  const [intentFilter, setIntentFilter] = useState<IntentFilterValue>("all");

  // Build stock-centric view - each stock with its matching screeners
  const stocksWithScreeners = useMemo(() => {
    const stockMap = new Map<string, { stock: ScreenerStock; screeners: Screener[] }>();
    
    const screeners = intentFilter === "all" 
      ? SCREENERS 
      : getScreenersByStyle(intentFilter as TradingStyle);
    
    screeners.forEach(screener => {
      screener.stocks.forEach(stock => {
        const existing = stockMap.get(stock.symbol);
        if (existing) {
          existing.screeners.push(screener);
        } else {
          stockMap.set(stock.symbol, { stock, screeners: [screener] });
        }
      });
    });

    // Sort by number of screeners (most signals first)
    return Array.from(stockMap.values())
      .sort((a, b) => b.screeners.length - a.screeners.length)
      .slice(0, 30) as StockWithScreeners[]; // Top 30 stocks
  }, [intentFilter]);

  const intentCounts = useMemo(() => ({
    all: SCREENERS.length,
    intraday: getScreenersByStyle("intraday").length,
    btst: getScreenersByStyle("btst").length,
    swing: getScreenersByStyle("swing").length,
    positional: getScreenersByStyle("positional").length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Today's Opportunities</h2>
          <p className="text-sm text-muted-foreground">
            Stocks appearing across multiple screeners
          </p>
        </div>
        <IntentFilter
          value={intentFilter}
          onChange={setIntentFilter}
          counts={intentCounts}
          showCounts={false}
        />
      </div>

      {/* Stock Cards */}
      <div className="space-y-4">
        {stocksWithScreeners.map(({ stock, screeners }) => (
          <Card key={stock.symbol} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold">{stock.symbol}</span>
                    <span className="text-sm text-muted-foreground">{stock.name}</span>
                  </div>
                  
                  {/* Screener Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {screeners.slice(0, 5).map(screener => (
                      <Badge
                        key={screener.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {screener.name}
                      </Badge>
                    ))}
                    {screeners.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{screeners.length - 5} more
                      </Badge>
                    )}
                  </div>

                  {/* Category breakdown */}
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {(() => {
                      const categories = [...new Set(screeners.map(s => s.category))];
                      return categories.map(cat => {
                        const info = SCREENER_CATEGORY_INFO.find(c => c.key === cat);
                        const count = screeners.filter(s => s.category === cat).length;
                        return (
                          <span key={cat} className="flex items-center gap-1">
                            <span>{info?.icon}</span>
                            <span>{count}</span>
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Price info */}
                <div className="text-right">
                  <div className="text-xl font-bold">
                    ₹{stock.price.toLocaleString("en-IN")}
                  </div>
                  <div className={cn(
                    "text-sm font-medium",
                    stock.changePct >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {stock.changePct >= 0 ? "+" : ""}
                    {stock.change.toFixed(2)} ({stock.changePct}%)
                  </div>
                  <Badge className="mt-2" variant="secondary">
                    {screeners.length} signals
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ========== VIEW 6: TRADE IDEAS ENGINE (NEW PARADIGM) ==========

const CONVICTION_STYLES: Record<ConvictionLevel, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-green-100", text: "text-green-800", label: "High Conviction" },
  medium: { bg: "bg-amber-100", text: "text-amber-800", label: "Medium Conviction" },
  low: { bg: "bg-gray-100", text: "text-gray-800", label: "Low Conviction" },
};

function TradeIdeaCard({ idea, expanded = false }: { idea: TradeIdea; expanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const convictionStyle = CONVICTION_STYLES[idea.conviction];

  return (
    <Card className={cn(
      "transition-all hover:shadow-lg cursor-pointer",
      idea.conviction === "high" && "ring-1 ring-green-200"
    )}>
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">{idea.symbol}</span>
                <Badge className={cn("text-[10px]", convictionStyle.bg, convictionStyle.text)}>
                  {convictionStyle.label}
                </Badge>
                {idea.conviction === "high" && <span className="text-amber-500">⭐</span>}
              </div>
              <h3 className="font-semibold text-base text-foreground leading-tight">
                {idea.headline}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{idea.name}</p>
            </div>
            
            {/* Price Section */}
            <div className="text-right shrink-0">
              <div className="text-xl font-bold">₹{idea.currentPrice.toLocaleString("en-IN")}</div>
              <div className={cn(
                "text-sm font-semibold",
                idea.changePct >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {idea.changePct >= 0 ? "+" : ""}{idea.changePct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Thesis Section */}
        <div className="px-4 pb-3">
          <p className={cn(
            "text-sm text-muted-foreground",
            !isExpanded && "line-clamp-2"
          )}>
            {idea.thesis}
          </p>
        </div>

        {/* Signals Pills */}
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {idea.signals.slice(0, isExpanded ? undefined : 3).map((signal, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] font-normal">
                <span className="font-medium">{signal.name}:</span>
                <span className="ml-1 text-muted-foreground">{signal.value}</span>
              </Badge>
            ))}
            {!isExpanded && idea.signals.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">
                +{idea.signals.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Trade Levels - Always Visible */}
        <div className="px-4 pb-3 pt-1 border-t border-border">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">Entry</span>
              <span className="font-semibold">₹{idea.entry.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Stop Loss</span>
              <span className="font-semibold text-red-600">₹{idea.stopLoss.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Target</span>
              <span className="font-semibold text-green-600">₹{idea.target.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">R:R</span>
              <span className="font-semibold">{idea.riskReward.toFixed(1)}x</span>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Time Horizon</span>
                <Badge variant="secondary">{idea.timeHorizon}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Risk Level</span>
                <Badge variant={idea.risk === "high" ? "destructive" : idea.risk === "moderate" ? "default" : "secondary"}>
                  {idea.risk.charAt(0).toUpperCase() + idea.risk.slice(1)}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Sector Trend</span>
                <span className={cn(
                  "font-medium",
                  idea.sectorTrend === "bullish" ? "text-green-600" : 
                  idea.sectorTrend === "bearish" ? "text-red-600" : "text-gray-600"
                )}>
                  {idea.sectorTrend.charAt(0).toUpperCase() + idea.sectorTrend.slice(1)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Suitable For</span>
                <div className="flex gap-1 flex-wrap">
                  {idea.styles.map(style => (
                    <Badge key={style} variant="outline" className="text-[10px]">
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-background rounded border border-border">
              <span className="text-[10px] text-muted-foreground block mb-1">Market Context</span>
              <span className="text-xs">{idea.marketContext}</span>
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-xs text-primary hover:bg-accent transition-colors border-t border-border"
        >
          {isExpanded ? "Show less ↑" : "Show more ↓"}
        </button>
      </CardContent>
    </Card>
  );
}

export function TradeIdeasEngineView() {
  const [styleFilter, setStyleFilter] = useState<TradingStyle | "all">("all");
  const marketRegime = useMemo(() => getMarketRegime(), []);
  const topPicks = useMemo(() => getTodaysTopPicks(), []);
  
  const filteredIdeas = useMemo(() => {
    const ideas = styleFilter === "all" 
      ? getTradeIdeas() 
      : getTradeIdeas(styleFilter as TradingStyle);
    return ideas;
  }, [styleFilter]);

  const highConviction = filteredIdeas.filter(i => i.conviction === "high");
  const mediumConviction = filteredIdeas.filter(i => i.conviction === "medium");

  return (
    <div className="space-y-6">
      {/* Market Regime Banner */}
      <Card className={cn(
        "overflow-hidden",
        marketRegime.trend === "bullish" ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" :
        marketRegime.trend === "bearish" ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200" :
        "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {marketRegime.trend === "bullish" ? "🟢" : marketRegime.trend === "bearish" ? "🔴" : "🟡"}
                </span>
                <h2 className="font-semibold text-foreground">
                  Market is {marketRegime.trend.charAt(0).toUpperCase() + marketRegime.trend.slice(1)}
                </h2>
                <Badge variant="outline" className="text-[10px]">
                  VIX: {marketRegime.volatility}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Breadth: {marketRegime.breadth}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  FII: {marketRegime.fiiActivity}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{marketRegime.summary}</p>
              <p className="text-sm font-medium text-foreground mt-2">
                💡 {marketRegime.recommendation}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Style Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Today's Trade Ideas</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show for:</span>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {[
              { value: "all", label: "All" },
              { value: "intraday", label: "Intraday" },
              { value: "btst", label: "BTST" },
              { value: "swing", label: "Swing" },
              { value: "positional", label: "Positional" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStyleFilter(opt.value as TradingStyle | "all")}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                  styleFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Picks - Featured Section */}
      {styleFilter === "all" && topPicks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⭐</span>
            <h3 className="font-semibold">Today's Top Picks</h3>
            <Badge className="bg-amber-100 text-amber-800 text-[10px]">Editor's Choice</Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {topPicks.map(idea => (
              <TradeIdeaCard key={idea.id} idea={idea} expanded={false} />
            ))}
          </div>
        </div>
      )}

      {/* High Conviction Ideas */}
      {highConviction.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎯</span>
            <h3 className="font-semibold">High Conviction Setups</h3>
            <Badge className={cn(CONVICTION_STYLES.high.bg, CONVICTION_STYLES.high.text, "text-[10px]")}>
              {highConviction.length} ideas
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {highConviction
              .filter(idea => styleFilter === "all" || !topPicks.find(t => t.id === idea.id))
              .map(idea => (
                <TradeIdeaCard key={idea.id} idea={idea} />
              ))}
          </div>
        </div>
      )}

      {/* Medium Conviction Ideas */}
      {mediumConviction.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📊</span>
            <h3 className="font-semibold">Worth Watching</h3>
            <Badge className={cn(CONVICTION_STYLES.medium.bg, CONVICTION_STYLES.medium.text, "text-[10px]")}>
              {mediumConviction.length} ideas
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mediumConviction.map(idea => (
              <TradeIdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredIdeas.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No trade ideas for this style today.</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later or try a different filter.</p>
          </CardContent>
        </Card>
      )}

      {/* Methodology Note */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">ℹ️</span>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How we generate Trade Ideas</p>
              <p>
                Our Trade Ideas Engine scans 750+ stocks across multiple timeframes, combining price action, 
                volume patterns, technical indicators, and fundamental catalysts. Ideas are ranked by conviction 
                based on signal confluence, historical success rates, and current market regime. 
                <strong> This is not investment advice.</strong> Always do your own research.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== VIEW 7: SCANNER STUDIO (POWER TOOLS) ==========

// Scanner card component
function ScannerCard({ 
  scanner, 
  isExpanded = false,
  onToggleExpand: _onToggleExpand,
}: { 
  scanner: Scanner; 
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const category = SCANNER_CATEGORIES.find(c => c.id === scanner.intent);
  
  // Temporarily: unclickable and not expandable
  const canExpand = false;
  return (
    <Card className={cn(
      "transition-all",
      scanner.currentlyEffective && "ring-1 ring-green-200"
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{category?.icon}</span>
              <h3 className="font-semibold text-sm truncate">{scanner.name}</h3>
              {scanner.isNew && (
                <Badge className="bg-blue-100 text-blue-700 text-[9px]">NEW</Badge>
              )}
              {scanner.isPremium && (
                <Badge className="bg-amber-100 text-amber-700 text-[9px]">PRO</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{scanner.description}</p>
          </div>
          
          {/* Match Count Badge */}
          <div className="flex flex-col items-end shrink-0">
            <div className={cn(
              "text-xl font-bold",
              scanner.matchCount > 15 ? "text-green-600" : 
              scanner.matchCount > 5 ? "text-foreground" : "text-muted-foreground"
            )}>
              {scanner.matchCount}
            </div>
            <span className="text-[10px] text-muted-foreground">matches</span>
          </div>
        </div>

        {/* Time Horizons */}
        <div className="flex items-center gap-1.5 mb-3">
          {scanner.timeHorizons.map(h => (
            <Badge key={h} variant="outline" className="text-[9px] py-0 px-1.5">
              {h === "intraday" ? "Intra" : h === "swing" ? "Swing" : "Pos"}
            </Badge>
          ))}
          {scanner.currentlyEffective && (
            <Badge className="bg-green-100 text-green-700 text-[9px] py-0 px-1.5 ml-auto">
              ✓ Effective today
            </Badge>
          )}
        </div>

        {/* Stock Preview - Always show top 3 (not expandable temporarily) */}
        <div className="space-y-1.5">
          {scanner.stocks.slice(0, 3).map(stock => (
            <div key={stock.symbol} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  stock.matchStrength === "strong" ? "bg-green-500" :
                  stock.matchStrength === "moderate" ? "bg-amber-500" : "bg-gray-400"
                )} />
                <span className="font-medium">{stock.symbol}</span>
                <span className="text-muted-foreground text-[10px] truncate max-w-[80px]">{stock.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">₹{stock.price.toLocaleString("en-IN")}</span>
                <span className={cn(
                  "text-[10px] font-medium",
                  stock.changePct >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          {scanner.stocks.length > 3 && (
            <div className="text-center pt-1">
              <span className="text-[10px] text-muted-foreground">
                +{scanner.stocks.length - 3} more stocks
              </span>
            </div>
          )}
        </div>

        {/* Usage stats - hidden when not expandable */}
        {canExpand && isExpanded && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{scanner.usersToday.toLocaleString()} traders today</span>
            <span>Works best in: {scanner.worksWellIn.join(", ")} markets</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Category section with scanners
function ScannerCategorySection({
  category,
  scanners,
  expandedScanner,
  onExpandScanner,
}: {
  category: typeof SCANNER_CATEGORIES[0];
  scanners: Scanner[];
  expandedScanner: string | null;
  onExpandScanner: (id: string | null) => void;
}) {
  const totalMatches = scanners.reduce((sum, s) => sum + s.matchCount, 0);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h2 className="font-semibold text-foreground">{category.name}</h2>
            <p className="text-xs text-muted-foreground">{category.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{totalMatches}</div>
          <span className="text-[10px] text-muted-foreground">total matches</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scanners.map(scanner => (
          <ScannerCard
            key={scanner.id}
            scanner={scanner}
            isExpanded={expandedScanner === scanner.id}
            onToggleExpand={() => onExpandScanner(
              expandedScanner === scanner.id ? null : scanner.id
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ScannerStudioView() {
  const [timeFilter, setTimeFilter] = useState<TimeHorizonFilter>("all");
  const [selectedIntent, setSelectedIntent] = useState<ScannerIntent | "all">("all");
  const [expandedScanner, setExpandedScanner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const popularScanners = useMemo(() => getPopularScanners(6), []);
  const categoryStats = useMemo(() => getScannerCategoryStats(), []);
  const totalMatches = useMemo(() => getTotalScannerMatches(), []);

  // Filter scanners
  const filteredScanners = useMemo(() => {
    let scanners = getScanners();
    
    // Apply time horizon filter
    if (timeFilter !== "all") {
      scanners = scanners.filter(s => s.timeHorizons.includes(timeFilter as any));
    }
    
    // Apply intent filter
    if (selectedIntent !== "all") {
      scanners = scanners.filter(s => s.intent === selectedIntent);
    }
    
    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      scanners = scanners.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.stocks.some(stock => stock.symbol.toLowerCase().includes(q))
      );
    }
    
    return scanners;
  }, [timeFilter, selectedIntent, searchQuery]);

  // Group by intent for display
  const groupedScanners = useMemo(() => {
    if (selectedIntent !== "all") {
      return [{ 
        category: SCANNER_CATEGORIES.find(c => c.id === selectedIntent)!, 
        scanners: filteredScanners 
      }];
    }
    
    return SCANNER_CATEGORIES.map(cat => ({
      category: cat,
      scanners: filteredScanners.filter(s => s.intent === cat.id),
    })).filter(g => g.scanners.length > 0);
  }, [filteredScanners, selectedIntent]);

  return (
    <div className="space-y-6">
      {/* Header Stats Banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span>🔬</span> Scanner Studio
              </h2>
              <p className="text-sm text-muted-foreground">
                Power tools for self-directed traders. Find stocks matching your criteria.
              </p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-2xl font-bold text-primary">{totalMatches}</div>
                <span className="text-xs text-muted-foreground">stocks found today</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{getScanners().length}</div>
                <span className="text-xs text-muted-foreground">active scanners</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Time Horizon Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Time horizon:</span>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {[
              { value: "all", label: "All" },
              { value: "intraday", label: "Intraday" },
              { value: "swing", label: "Swing" },
              { value: "positional", label: "Positional" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeFilter(opt.value as TimeHorizonFilter)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                  timeFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search scanners or stocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Intent Category Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedIntent("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
            selectedIntent === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:border-primary/50"
          )}
        >
          All Categories
        </button>
        {SCANNER_CATEGORIES.map(cat => {
          const stats = categoryStats.find(s => s.category.id === cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedIntent(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-1.5",
                selectedIntent === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.name.split(" ")[0]}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {stats?.totalMatches || 0}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Popular Scanners - Show when no filter */}
      {selectedIntent === "all" && timeFilter === "all" && !searchQuery && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔥</span>
            <h2 className="font-semibold text-foreground">Most Used Today</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularScanners.slice(0, 6).map(scanner => (
              <ScannerCard
                key={scanner.id}
                scanner={scanner}
                isExpanded={expandedScanner === scanner.id}
                onToggleExpand={() => setExpandedScanner(
                  expandedScanner === scanner.id ? null : scanner.id
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {groupedScanners.map(({ category, scanners }) => (
        <ScannerCategorySection
          key={category.id}
          category={category}
          scanners={scanners}
          expandedScanner={expandedScanner}
          onExpandScanner={setExpandedScanner}
        />
      ))}

      {/* Empty State */}
      {filteredScanners.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No scanners match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setTimeFilter("all");
                setSelectedIntent("all");
                setSearchQuery("");
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          </CardContent>
        </Card>
      )}

      {/* Market Context Note */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How Scanner Studio Works</p>
              <p>
                Each scanner runs against 750+ stocks in real-time. Results are sorted by match strength — 
                <span className="inline-flex items-center gap-1 mx-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> strong
                </span>
                means the stock closely matches criteria,
                <span className="inline-flex items-center gap-1 mx-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> moderate
                </span>
                means partial match. Scanners marked "Effective today" work well in current market conditions.
                <strong> These are filters, not recommendations.</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== VIEW 8: JAYESH (PILL-BASED, 3-COLUMN GRID) ==========

const JAYESH_PILLS: { value: JayeshPillStyle; label: string }[] = [
  { value: "intraday", label: "Intraday" },
  { value: "btst", label: "BTST" },
  { value: "swing", label: "Swing Scanners" },
  { value: "positional", label: "Positional" },
];

function formatLastRun(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Positional scanners only (no pills). Used under "Positional Scanners" header tab. */
export function PositionalScannersView({
  onOpenScanner,
  onRunFullScan,
  onSkipScanner,
  fullScanLastRun,
  fullScanRunning,
  fullScanError,
  fullScanProgress,
  scannerSummaries,
}: {
  onOpenScanner?: (scannerId: string, scannerName: string) => void;
  onRunFullScan?: () => void;
  onSkipScanner?: () => void;
  fullScanLastRun?: Date | null;
  fullScanRunning?: boolean;
  fullScanError?: string | null;
  fullScanProgress?: {
    scannerIndex: number;
    scannerTotal: number;
    scannerName: string;
    stocksCurrent: number;
    stocksTotal: number;
    matched: number;
  } | null;
  scannerSummaries?: Record<string, { count: number; topSymbols: string[] }>;
} = {}) {
  const scanners = useMemo(() => getScannersByJayeshPill("positional"), []);

  const scannersByCategory = useMemo(() => {
    const map: Record<ScannerDisplayCategory, Scanner[]> = {
      price: [],
      indicators: [],
      patterns: [],
      candlesticks: [],
      volume: [],
      fundamentals: [],
    };
    scanners.forEach((s) => map[s.displayCategory].push(s));
    return DISPLAY_CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: DISPLAY_CATEGORY_LABELS[cat],
      scanners: map[cat],
    })).filter((g) => g.scanners.length > 0);
  }, [scanners]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">Positional Scanners</h2>
          <span className="text-sm text-muted-foreground">{scanners.length} screeners</span>
          {fullScanLastRun != null && (
            <span className="text-xs text-muted-foreground">
              Last full scan: {formatLastRun(fullScanLastRun)}
            </span>
          )}
        </div>
        {onRunFullScan && (
          <button
            type="button"
            onClick={onRunFullScan}
            disabled={fullScanRunning}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {fullScanRunning ? "Running scan…" : "Run Scan"}
          </button>
        )}
      </div>
      {fullScanError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Scan failed:</strong> {fullScanError}
          {fullScanError.includes("UPSTOX") && (
            <span className="block mt-1 text-red-700">
              Add <code className="bg-red-100 px-1 rounded">VITE_UPSTOX_ACCESS_TOKEN</code> to your <code className="bg-red-100 px-1 rounded">.env</code> file and restart the app.
            </span>
          )}
        </div>
      )}
      {fullScanRunning && fullScanProgress && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  Running scanner {fullScanProgress.scannerIndex}/{fullScanProgress.scannerTotal}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {fullScanProgress.matched} matches so far
                </Badge>
                {onSkipScanner && (
                  <button
                    type="button"
                    onClick={onSkipScanner}
                    className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    Skip →
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground font-semibold">
              {fullScanProgress.scannerName}
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Scanning stocks: {fullScanProgress.stocksCurrent}/{fullScanProgress.stocksTotal}</span>
                <span>{fullScanProgress.stocksTotal > 0 ? Math.round((fullScanProgress.stocksCurrent / fullScanProgress.stocksTotal) * 100) : 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${fullScanProgress.stocksTotal > 0 ? (fullScanProgress.stocksCurrent / fullScanProgress.stocksTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-300"
                style={{
                  width: `${fullScanProgress.scannerTotal > 0 ? ((fullScanProgress.scannerIndex - 1 + (fullScanProgress.stocksTotal > 0 ? fullScanProgress.stocksCurrent / fullScanProgress.stocksTotal : 0)) / fullScanProgress.scannerTotal) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Overall: {Math.round(((fullScanProgress.scannerIndex - 1 + (fullScanProgress.stocksTotal > 0 ? fullScanProgress.stocksCurrent / fullScanProgress.stocksTotal : 0)) / fullScanProgress.scannerTotal) * 100)}% complete
            </p>
          </CardContent>
        </Card>
      )}
      {scannersByCategory.map(({ category, label, scanners: list }) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-foreground">{label}</h3>
            <Badge variant="secondary" className="text-xs">
              {list.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((scanner) => (
              <JayeshScannerCard
                key={scanner.id}
                scanner={scanner}
                onRunScanner={onOpenScanner}
                dynamicSummary={scannerSummaries?.[scanner.id]}
              />
            ))}
          </div>
        </div>
      ))}
      {scanners.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No positional screeners.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Positional scanners that run live scan on click (Upstox 1D or 1M data). */
const RUNNABLE_POSITIONAL_SCANNER_IDS = new Set<string>([
  "fresh-52w-high",
  "ath-breakout",
  "rs-leaders",
  "pullback-50ema",
  "bullish-divergence",
  "consolidation-breakout",
  "support-test",
  "cup-handle",
  "double-bottom",
  "morning-star",
  "accumulation-pattern",
  "macd-crossover-1d",
  "macd-crossover-1mo",
  "bullish-cross-building-negative",
  "bullish-cross-building-positive",
]);

function JayeshScannerCard({
  scanner,
  onRunScanner,
  dynamicSummary,
}: {
  scanner: Scanner;
  onRunScanner?: (scannerId: string, scannerName: string) => void;
  dynamicSummary?: { count: number; topSymbols: string[] };
}) {
  const hasSavedData = dynamicSummary != null;
  const count = hasSavedData ? dynamicSummary.count : 0;
  const topSymbols = hasSavedData ? dynamicSummary.topSymbols : [];
  const symbolList = topSymbols.join(", ");
  const more = count > 3 ? ` +${count - 3} more` : "";
  const isRunnable = RUNNABLE_POSITIONAL_SCANNER_IDS.has(scanner.id) && onRunScanner;

  return (
    <Card
      className={cn(
        "overflow-hidden h-full flex flex-col transition-shadow",
        isRunnable && "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary/20"
      )}
      onClick={isRunnable ? () => onRunScanner(scanner.id, scanner.name) : undefined}
    >
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {scanner.popularityRank <= 3 && (
                <span className="text-amber-500 text-sm" title="Popular">🔥</span>
              )}
              <h3 className="font-semibold text-sm leading-tight truncate">{scanner.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scanner.description}</p>
          </div>
          <Badge className="shrink-0 bg-primary text-primary-foreground text-xs py-0.5 px-2">
            {count} stocks
          </Badge>
        </div>
        <div className="mt-auto pt-2 text-xs text-muted-foreground truncate" title={topSymbols.join(", ")}>
          {hasSavedData && count > 0 ? `${symbolList}${more}` : "Run scan to see results"}
        </div>
      </CardContent>
    </Card>
  );
}

export function JayeshView({
  onRunScanner,
  allowedPills,
}: {
  onRunScanner?: (scannerId: string, scannerName: string) => void;
  /** When set, only show these pills (e.g. ["intraday", "btst", "swing"] for Intraday/Swing tab). */
  allowedPills?: JayeshPillStyle[];
} = {}) {
  const pills = allowedPills
    ? JAYESH_PILLS.filter((p) => allowedPills.includes(p.value))
    : JAYESH_PILLS;
  const defaultPill = pills[0]?.value ?? "intraday";
  const [pill, setPill] = useState<JayeshPillStyle>(defaultPill);

  const scanners = useMemo(() => getScannersByJayeshPill(pill), [pill]);

  // Group by display category (Price, Indicators, Patterns, Candlesticks, Volume, Fundamentals)
  const scannersByCategory = useMemo(() => {
    const map: Record<ScannerDisplayCategory, Scanner[]> = {
      price: [],
      indicators: [],
      patterns: [],
      candlesticks: [],
      volume: [],
      fundamentals: [],
    };
    scanners.forEach((s) => {
      map[s.displayCategory].push(s);
    });
    return DISPLAY_CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: DISPLAY_CATEGORY_LABELS[cat],
      scanners: map[cat],
    })).filter((g) => g.scanners.length > 0);
  }, [scanners]);

  return (
    <div className="space-y-8">
      {/* Pills */}
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPill(p.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              pill === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Section title + count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {pill === "intraday" && "Intraday Screeners"}
          {pill === "btst" && "BTST Screeners"}
          {pill === "swing" && "Swing Screeners"}
          {pill === "positional" && "Positional Screeners"}
        </h2>
        <span className="text-sm text-muted-foreground">{scanners.length} screeners</span>
      </div>

      {/* Segregated by category: Price, Indicators, Patterns, Candlesticks, Volume, Fundamentals */}
      {scannersByCategory.map(({ category, label, scanners: list }) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-foreground">{label}</h3>
            <Badge variant="secondary" className="text-xs">
              {list.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((scanner) => (
              <JayeshScannerCard
                key={scanner.id}
                scanner={scanner}
                onRunScanner={onRunScanner}
              />
            ))}
          </div>
        </div>
      ))}

      {scanners.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No screeners for this selection yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== VIEW SELECTOR ==========
export type ScreenerViewMode = "jayesh" | "ideas" | "studio" | "intent" | "grid" | "hybrid" | "feed" | "smart";

interface ViewSelectorProps {
  value: ScreenerViewMode;
  onChange: (value: ScreenerViewMode) => void;
}

const VIEW_OPTIONS: { value: ScreenerViewMode; label: string; icon: string; description: string }[] = [
  { value: "jayesh", label: "Jayesh", icon: "◇", description: "By style: Intraday, BTST, Swing, Positional" },
  { value: "ideas", label: "Ideas", icon: "💡", description: "Trade ideas with thesis" },
  { value: "studio", label: "Studio", icon: "🔬", description: "Scanner power tools" },
  { value: "hybrid", label: "Hybrid", icon: "◈", description: "Hot + Categories + Filter" },
  { value: "intent", label: "Intent", icon: "≡", description: "By trading style" },
  { value: "grid", label: "Grid", icon: "⊞", description: "Category cards" },
  { value: "feed", label: "Feed", icon: "☰", description: "Curated daily" },
  { value: "smart", label: "Smart", icon: "◉", description: "Stock-first" },
];

export function ViewSelector({ value, onChange }: ViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-sm"
      >
        <span className="font-mono">
          {VIEW_OPTIONS.find(o => o.value === value)?.icon}
        </span>
        <span className="text-muted-foreground">View</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-popover shadow-lg">
            {VIEW_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent text-sm",
                  value === option.value && "bg-accent"
                )}
              >
                <span className="font-mono text-lg w-6 text-center">{option.icon}</span>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
