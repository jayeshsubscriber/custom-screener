import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chart } from "@/components/Chart";
import { NIFTY_50, searchAllStocks, type Nifty50Instrument } from "@/data/nifty50";
import { NIFTY_750 } from "@/data/nifty750";
import { fetchChartData, type ChartInterval } from "@/lib/chartData";
import type { ChartCandle } from "@/lib/chartData";
import { useLiveCandle } from "@/hooks/useLiveCandle";
import { 
  scanStockTiered, 
  generateTieredScanOutput, 
  type TieredScanResult, 
  type TieredScanOutput, 
  type OhlcvRow 
} from "@/lib/consolidationBreakoutTiered";
import { cn } from "@/lib/utils";

const INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1D", label: "1D" },
  { value: "1M", label: "1M" },
];

/** ChartCandle time is UTC; convert to YYYY-MM-DD in IST for trading date. */
function candleToDateStr(c: ChartCandle): string {
  const d = new Date(c.time * 1000);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function chartCandlesToOhlcv(candles: ChartCandle[]): OhlcvRow[] {
  return candles.map((c) => ({
    date: candleToDateStr(c),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

export interface ScanResultItem {
  symbol: string;
  name: string;
  inputCsv: string;
  inputJson: string;
  outputJson: string;
  tier: "1" | "2A" | "2B" | null;
  score_pct?: number;
  result?: TieredScanResult;
}

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <div className="rounded-md border border-border bg-muted/50 overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/80">
          <span>{label}</span>
          <span className="text-muted-foreground text-xs font-normal">
            (click to expand / collapse)
          </span>
        </summary>
        <div className="relative border-t border-border">
          <pre className="max-h-64 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap break-all">
            {text}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="absolute top-2 right-2 rounded border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </details>
    </div>
  );
}

/** Display a tiered stock result with actionable information */
function TieredStockCard({ 
  stock, 
  tier,
  scanResults 
}: { 
  stock: TieredScanResult; 
  tier: "1" | "2A" | "2B";
  scanResults: ScanResultItem[];
}) {
  const priceInfo = stock.price_info;
  const volumeInfo = stock.volume_info;
  const consolidation = stock.consolidation_analysis;
  const c10 = stock.criteria_results.C10_breakout_status;
  
  // Find the corresponding scan result for raw data
  const scanResult = scanResults.find(r => r.symbol === stock.symbol);
  
  const tierColors = {
    "1": "border-green-500 bg-green-50",
    "2A": "border-amber-500 bg-amber-50",
    "2B": "border-orange-400 bg-orange-50",
  };
  
  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      tierColors[tier]
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg text-foreground">{stock.symbol}</h3>
          <p className="text-xs text-muted-foreground">
            Score: {stock.score.score_pct}% ({stock.score.criteria_passed}/{stock.score.criteria_total} criteria)
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-foreground">
            ₹{priceInfo?.current_price?.toLocaleString() ?? c10.current_price?.toLocaleString()}
          </div>
          <div className={cn(
            "text-xs font-medium",
            c10.distance_pct <= 0 ? "text-green-600" : 
            c10.distance_pct <= 2 ? "text-amber-600" : "text-orange-600"
          )}>
            {c10.distance_pct <= 0 ? "✓ Breakout" : `${c10.distance_pct.toFixed(2)}% to breakout`}
          </div>
        </div>
      </div>
      
      {/* Price Levels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Breakout Level</div>
          <div className="font-semibold">₹{priceInfo?.breakout_level?.toLocaleString() ?? c10.breakout_level?.toLocaleString()}</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Stop Loss</div>
          <div className="font-semibold text-red-600">₹{priceInfo?.suggested_stop?.toLocaleString() ?? (consolidation.consolidation_low ?? 0 * 0.99).toFixed(2)}</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Support</div>
          <div className="font-semibold">₹{consolidation.consolidation_low?.toLocaleString()}</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Range</div>
          <div className="font-semibold">{consolidation.range_pct?.toFixed(1)}% / {consolidation.window_duration}d</div>
        </div>
      </div>
      
      {/* Volume Info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Avg Vol (50d)</div>
          <div className="font-semibold">{volumeInfo?.avg_volume_50d?.toLocaleString() ?? c10.avg_volume_50d?.toLocaleString()}</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Vol Trigger (1.5x)</div>
          <div className="font-semibold text-primary">{volumeInfo?.volume_trigger ?? Math.round((c10.avg_volume_50d ?? 0) * 1.5).toLocaleString()}</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Today's Vol</div>
          <div className={cn(
            "font-semibold",
            c10.volume_ratio >= 1.5 ? "text-green-600" : c10.volume_ratio >= 1.0 ? "text-amber-600" : ""
          )}>
            {volumeInfo?.today_volume_ratio ?? `${c10.volume_ratio?.toFixed(2)}x`}
          </div>
        </div>
      </div>
      
      {/* Consolidation Quality */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-background/50 px-2 py-1 rounded">
          Support: {stock.criteria_results.C3_support_touches.actual} touches
        </span>
        <span className="bg-background/50 px-2 py-1 rounded">
          Resistance: {stock.criteria_results.C4_resistance_touches.actual} touches
        </span>
        <span className={cn(
          "px-2 py-1 rounded",
          c10.price_above_ema50 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {c10.price_above_ema50 ? "✓" : "✗"} Above 50 EMA
        </span>
        <span className={cn(
          "px-2 py-1 rounded",
          c10.ema50_rising ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {c10.ema50_rising ? "✓" : "✗"} EMA Rising
        </span>
      </div>
      
      {/* Action */}
      {stock.tier_classification.action && (
        <div className={cn(
          "text-sm font-medium p-2 rounded",
          tier === "1" ? "bg-green-100 text-green-800" :
          tier === "2A" ? "bg-amber-100 text-amber-800" :
          "bg-orange-100 text-orange-800"
        )}>
          📌 {stock.tier_classification.action}
        </div>
      )}
      
      {/* Caveats */}
      {stock.caveats.length > 0 && (
        <div className="text-xs space-y-1 text-muted-foreground bg-background/50 rounded p-2">
          {stock.caveats.map((caveat, idx) => (
            <div key={idx}>{caveat}</div>
          ))}
        </div>
      )}
      
      {/* Debug Data (Collapsed) */}
      {scanResult && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            View raw data (debug)
          </summary>
          <div className="mt-2 space-y-2">
            <CopyBlock label="OHLCV Input (CSV)" text={scanResult.inputCsv} />
            <CopyBlock label="Full Output (JSON)" text={scanResult.outputJson} />
          </div>
        </details>
      )}
    </div>
  );
}

export function ChartPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Nifty50Instrument | null>(
    () => NIFTY_50.find((s) => s.symbol === "RELIANCE") ?? null
  );
  const [open, setOpen] = useState(false);
  const [interval, setInterval] = useState<ChartInterval>("1D");
  const [data, setData] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(
    () => searchAllStocks(search),
    [search]
  );

  useEffect(() => {
    if (!selected) {
      setData([]);
      setHeaderOhlc(null);
      return;
    }
    setLoading(true);
    setError(null);
    setHeaderOhlc(null);
    fetchChartData(selected.instrument_key, interval)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [selected?.instrument_key, interval]);

  const lastCandle = data.length ? data[data.length - 1] : null;
  const liveCandle = useLiveCandle(
    selected?.instrument_key ?? null,
    interval,
    lastCandle
  );

  const displayCandle = liveCandle ?? lastCandle;
  const showLive = Boolean(liveCandle);
  const [headerOhlc, setHeaderOhlc] = useState<ChartCandle | null>(null);
  const displayOhlc = headerOhlc ?? displayCandle;

  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResultItem[]>([]);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [scanUniverse, setScanUniverse] = useState<"nifty50" | "nifty750">("nifty50");

  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, failed: 0 });
  const [singleScanLoading, setSingleScanLoading] = useState(false);

  const [tieredOutput, setTieredOutput] = useState<TieredScanOutput | null>(null);

  /** Scan only the currently selected stock from the chart (TIERED MODE) */
  const runSingleStockScan = useCallback(async () => {
    if (!selected) return;
    
    setSingleScanLoading(true);
    setScanResults([]);
    setScanCompleted(false);
    setTieredOutput(null);
    setScanProgress({ current: 0, total: 1, failed: 0 });
    
    console.log(`\n========== TIERED SCAN: ${selected.symbol} ==========\n`);
    
    try {
      const candles = await fetchChartData(selected.instrument_key, "1D");
      console.log(`[${selected.symbol}] Fetched ${candles.length} candles`);
      
      if (candles.length < 60) {
        console.log(`[${selected.symbol}] FAIL - Only ${candles.length} candles, need 60`);
        setScanResults([{
          symbol: selected.symbol,
          name: selected.name,
          inputCsv: "",
          inputJson: JSON.stringify({ error: `Only ${candles.length} candles available, need 60` }, null, 2),
          outputJson: JSON.stringify({ tier: null, reason: "insufficient_data", candles: candles.length }, null, 2),
          tier: null,
          score_pct: 0,
        }]);
        setScanCompleted(true);
        setSingleScanLoading(false);
        return;
      }
      
      const last60 = candles.slice(-60);
      const ohlcv = chartCandlesToOhlcv(last60);
      
      console.log(`[${selected.symbol}] First candle:`, ohlcv[0]);
      console.log(`[${selected.symbol}] Last candle (today):`, ohlcv[ohlcv.length - 1]);
      
      const inputCsv =
        "date,open,high,low,close,volume\n" +
        ohlcv.map((r) => `${r.date},${r.open},${r.high},${r.low},${r.close},${r.volume}`).join("\n");
      const inputJson = JSON.stringify(ohlcv, null, 2);
      
      // Run TIERED scan
      const result = scanStockTiered(ohlcv, selected.symbol);
      
      console.log(`[${selected.symbol}] TIERED RESULT:`, result);
      console.log(`[${selected.symbol}] Tier: ${result.tier_classification.tier ?? 'None'} (${result.tier_classification.tier_name})`);
      console.log(`[${selected.symbol}] Score: ${result.score.score_pct}% (${result.score.criteria_passed}/${result.score.criteria_total})`);
      console.log(`[${selected.symbol}] Caveats:`, result.caveats);
      console.log(`\n========== END TIERED SCAN: ${selected.symbol} ==========\n`);
      
      setScanResults([{
        symbol: selected.symbol,
        name: selected.name,
        inputCsv,
        inputJson,
        outputJson: JSON.stringify(result, null, 2),
        tier: result.tier_classification.tier,
        score_pct: result.score.score_pct,
        result,
      }]);
      
      // Generate tiered output for single stock
      setTieredOutput(generateTieredScanOutput([result]));
      setScanProgress({ current: 1, total: 1, failed: 0 });
    } catch (err) {
      console.error(`[${selected.symbol}] Fetch error:`, err);
      setScanResults([{
        symbol: selected.symbol,
        name: selected.name,
        inputCsv: "",
        inputJson: "",
        outputJson: JSON.stringify({ tier: null, error: "Failed to fetch data", details: String(err) }, null, 2),
        tier: null,
        score_pct: 0,
      }]);
      setScanProgress({ current: 1, total: 1, failed: 1 });
    }
    
    setScanCompleted(true);
    setSingleScanLoading(false);
  }, [selected]);

  const runConsolidationScan = useCallback(async () => {
    const list = scanUniverse === "nifty750" ? NIFTY_750 : NIFTY_50;
    setScanning(true);
    setScanResults([]);
    setScanCompleted(false);
    setTieredOutput(null);
    setScanProgress({ current: 0, total: list.length, failed: 0 });
    
    const results: ScanResultItem[] = [];
    const tieredResults: TieredScanResult[] = [];
    let failed = 0;
    
    // Process in batches to avoid rate limiting
    const BATCH_SIZE = 3;
    const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds between batches
    
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (stock) => {
          try {
            const candles = await fetchChartData(stock.instrument_key, "1D");
            if (candles.length < 60) {
              return { success: false, reason: "insufficient_data" };
            }
            const last60 = candles.slice(-60);
            const ohlcv = chartCandlesToOhlcv(last60);
            const inputCsv =
              "date,open,high,low,close,volume\n" +
              ohlcv.map((r) => `${r.date},${r.open},${r.high},${r.low},${r.close},${r.volume}`).join("\n");
            const inputJson = JSON.stringify(ohlcv, null, 2);
            
            // Use TIERED scanner
            const result = scanStockTiered(ohlcv, stock.symbol);
            
            return {
              success: true,
              item: {
                symbol: stock.symbol,
                name: stock.name,
                inputCsv,
                inputJson,
                outputJson: JSON.stringify(result, null, 2),
                tier: result.tier_classification.tier,
                score_pct: result.score.score_pct,
                result,
              } as ScanResultItem,
              tieredResult: result,
            };
          } catch {
            return { success: false, reason: "fetch_error" };
          }
        })
      );
      
      for (const br of batchResults) {
        if (br.success && br.item) {
          results.push(br.item);
          if (br.tieredResult) {
            tieredResults.push(br.tieredResult);
          }
        } else {
          failed++;
        }
      }
      
      setScanProgress({ current: Math.min(i + BATCH_SIZE, list.length), total: list.length, failed });
      setScanResults([...results]);
      
      // Update tiered output in real-time
      setTieredOutput(generateTieredScanOutput(tieredResults));
      
      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < list.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Generate final tiered output
    const output = generateTieredScanOutput(tieredResults);
    setTieredOutput(output);
    console.log("TIERED SCAN OUTPUT:", output);
    
    setScanResults(results);
    setScanCompleted(true);
    setScanning(false);
  }, [scanUniverse]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center gap-4 px-4 py-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="Search 750+ stocks (e.g. RELIANCE, TCS)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className="rounded-lg border-border bg-background"
            />
            {open && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                {results.slice(0, 30).map((s) => (
                  <button
                    key={s.instrument_key}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                      selected?.instrument_key === s.instrument_key && "bg-accent"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelected(s);
                      setSearch(s.symbol);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">{s.symbol}</span>
                    <span className="ml-2 text-muted-foreground">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Tabs
            value={interval}
            onValueChange={(v) => setInterval(v as ChartInterval)}
            className="w-auto"
          >
            <TabsList className="h-9 rounded-lg bg-muted p-1">
              {INTERVALS.map((i) => (
                <TabsTrigger
                  key={i.value}
                  value={i.value}
                  className="px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {i.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {selected && displayOhlc && (
            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
              {showLive && (
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live" />
              )}
              <span>O {displayOhlc.open.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span>H {displayOhlc.high.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span>L {displayOhlc.low.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span>C {displayOhlc.close.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {displayOhlc.volume > 0 && (
                <span>Vol {displayOhlc.volume.toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {!selected && (
          <Card className="border-border">
            <CardContent className="flex min-h-[400px] items-center justify-center py-12 text-muted-foreground">
              Search and select a Nifty 50 stock to view the chart (data since Jan 2023).
            </CardContent>
          </Card>
        )}
        {selected && (
          <div className="space-y-4">
            <Card className="border-border overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {selected.symbol} — {selected.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {error && (
                  <div className="px-6 py-2 text-sm text-destructive">{error}</div>
                )}
                {loading && (
                  <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                    Loading…
                  </div>
                )}
                {!loading && data.length > 0 && (
                  <Chart
                    data={data}
                    liveCandle={liveCandle}
                    onOhlcChange={setHeaderOhlc}
                    height={420}
                    className="px-2"
                  />
                )}
                {!loading && selected && data.length === 0 && !error && (
                  <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                    No candle data for this range.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-foreground">Scan universe:</span>
                <Tabs
                  value={scanUniverse}
                  onValueChange={(v) => setScanUniverse(v as "nifty50" | "nifty750")}
                  className="w-auto"
                >
                  <TabsList className="h-9 rounded-lg bg-muted p-1">
                    <TabsTrigger value="nifty50" className="px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Nifty 50
                    </TabsTrigger>
                    <TabsTrigger value="nifty750" className="px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Nifty 750
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <button
                  type="button"
                  onClick={runConsolidationScan}
                  disabled={scanning || singleScanLoading}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "disabled:opacity-50 disabled:pointer-events-none"
                  )}
                >
                  {scanning
                    ? `Scanning ${scanProgress.current}/${scanProgress.total}…`
                    : "Scan consolidation breakout stocks"}
                </button>
                
                {/* Scan single selected stock */}
                <button
                  type="button"
                  onClick={runSingleStockScan}
                  disabled={!selected || scanning || singleScanLoading}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    "border border-primary text-primary bg-transparent hover:bg-primary/10",
                    "disabled:opacity-50 disabled:pointer-events-none"
                  )}
                >
                  {singleScanLoading
                    ? "Scanning..."
                    : selected
                      ? `Scan ${selected.symbol}`
                      : "Select stock to scan"}
                </button>
              </div>
              
              {scanning && (
                <div className="text-sm text-muted-foreground">
                  Progress: {scanProgress.current}/{scanProgress.total} stocks processed
                  {scanProgress.failed > 0 && (
                    <span className="text-destructive ml-2">
                      ({scanProgress.failed} failed — API rate limit or invalid data)
                    </span>
                  )}
                </div>
              )}

              {/* Tiered Scan Summary */}
              {tieredOutput && (scanCompleted || scanning) && (
                <Card className="border-border bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      Scan Summary
                      {scanning && (
                        <span className="text-xs font-normal text-muted-foreground animate-pulse">
                          Live updating...
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm mt-1">{tieredOutput.scan_summary.market_note}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-background p-3 text-center">
                        <div className="text-2xl font-bold text-foreground">{tieredOutput.scan_summary.total_scanned}</div>
                        <div className="text-xs text-muted-foreground">Stocks Scanned</div>
                      </div>
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{tieredOutput.scan_summary.tier_1_count}</div>
                        <div className="text-xs text-green-700">Tier 1 — Ready</div>
                      </div>
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                        <div className="text-2xl font-bold text-amber-600">{tieredOutput.scan_summary.tier_2a_count}</div>
                        <div className="text-xs text-amber-700">Tier 2A — Imminent</div>
                      </div>
                      <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-center">
                        <div className="text-2xl font-bold text-orange-600">{tieredOutput.scan_summary.tier_2b_count}</div>
                        <div className="text-xs text-orange-700">Tier 2B — Watchlist</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tier 1: Ready to Trade */}
              {tieredOutput && tieredOutput.tier_1_ready_to_trade.length > 0 && (
                <Card className="border-2 border-green-500/50 bg-green-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-green-700 flex items-center gap-2">
                      <span className="inline-flex h-3 w-3 rounded-full bg-green-500" />
                      Tier 1: Ready to Trade ({tieredOutput.tier_1_ready_to_trade.length})
                    </CardTitle>
                    <p className="text-sm text-green-600/80">Breakout confirmed — Enter with stop below consolidation low</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tieredOutput.tier_1_ready_to_trade.map((stock) => (
                      <TieredStockCard key={stock.symbol} stock={stock} tier="1" scanResults={scanResults} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Tier 2A: Imminent Breakout */}
              {tieredOutput && tieredOutput.tier_2a_imminent_breakout.length > 0 && (
                <Card className="border-2 border-amber-500/50 bg-amber-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-amber-700 flex items-center gap-2">
                      <span className="inline-flex h-3 w-3 rounded-full bg-amber-500" />
                      Tier 2A: Imminent Breakout ({tieredOutput.tier_2a_imminent_breakout.length})
                    </CardTitle>
                    <p className="text-sm text-amber-600/80">Within 2% of breakout — Watch for volume surge</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tieredOutput.tier_2a_imminent_breakout.map((stock) => (
                      <TieredStockCard key={stock.symbol} stock={stock} tier="2A" scanResults={scanResults} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Tier 2B: Watchlist */}
              {tieredOutput && tieredOutput.tier_2b_watchlist.length > 0 && (
                <Card className="border border-orange-400/50 bg-orange-50/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-orange-700 flex items-center gap-2">
                      <span className="inline-flex h-3 w-3 rounded-full bg-orange-400" />
                      Tier 2B: Watchlist ({tieredOutput.tier_2b_watchlist.length})
                    </CardTitle>
                    <p className="text-sm text-orange-600/80">Good base — Within 5% of breakout</p>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                    {tieredOutput.tier_2b_watchlist.map((stock) => (
                      <TieredStockCard key={stock.symbol} stock={stock} tier="2B" scanResults={scanResults} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* All Scan Results (collapsible, for debugging) */}
              {(scanResults.length > 0 || scanCompleted) && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground mb-2">
                    View all {scanResults.length} scanned stocks (detailed debug data)
                  </summary>
                  <Card className="border-border mt-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        All Scanned Stocks ({scanResults.length})
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {scanProgress.failed > 0 && (
                          <span className="text-destructive">
                            {scanProgress.failed} failed to fetch •
                          </span>
                        )}
                        <span className="ml-1">Sorted by score (highest first)</span>
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                      {/* Sort all results by score (highest first) */}
                      {[...scanResults]
                        .sort((a, b) => (b.score_pct ?? 0) - (a.score_pct ?? 0))
                        .map((item) => (
                        <div
                          key={item.symbol}
                          className={cn(
                            "rounded-lg border p-3 space-y-2",
                            item.tier === "1" 
                              ? "border-2 border-green-500/50 bg-green-50/30"
                              : item.tier === "2A"
                                ? "border-amber-500/50 bg-amber-50/30"
                                : item.tier === "2B"
                                  ? "border-orange-400/30 bg-orange-50/20"
                                  : "border-border"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">
                              {item.symbol} — {item.name}
                            </p>
                            {item.tier ? (
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                item.tier === "1" ? "bg-green-100 text-green-800" :
                                item.tier === "2A" ? "bg-amber-100 text-amber-800" :
                                "bg-orange-100 text-orange-800"
                              )}>
                                Tier {item.tier}
                              </span>
                            ) : (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                                No Pattern
                              </span>
                            )}
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              (item.score_pct ?? 0) >= 80 ? "bg-amber-100 text-amber-800" :
                              (item.score_pct ?? 0) >= 70 ? "bg-orange-100 text-orange-800" :
                              "bg-muted text-muted-foreground"
                            )}>
                              Score: {item.score_pct ?? 0}%
                            </span>
                          </div>
                          
                          {/* Caveats */}
                          {item.result && item.result.caveats.length > 0 && (
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                              {item.result.caveats.map((c, i) => (
                                <div key={i}>{c}</div>
                              ))}
                            </div>
                          )}
                          
                          <div className="grid gap-2">
                            <CopyBlock
                              label="Input (OHLCV — last 60 days, CSV)"
                              text={item.inputCsv}
                            />
                            <CopyBlock
                              label="Input (OHLCV — JSON)"
                              text={item.inputJson}
                            />
                            <CopyBlock label="Tiered Output (JSON)" text={item.outputJson} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </details>
              )}

              {scanCompleted && scanResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No scan data (fetch failed for all Nifty 50 stocks). Check connection and VITE_UPSTOX_ACCESS_TOKEN.
                </p>
              )}
              {!scanCompleted && !scanning && (
                <p className="text-sm text-muted-foreground">
                  Click the button above to scan all Nifty 50 stocks. Matching results will appear here with copiable input and output.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
