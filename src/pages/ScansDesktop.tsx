import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ChartPage } from "@/pages/ChartPage";
import { CustomScannerPage } from "@/pages/CustomScannerPage";
import { ScannerResultPage } from "@/pages/ScannerResultPage";
import { JayeshView, PositionalScannersView } from "@/components/ScreenerViews";
import { runPositionalScan, type AnyScanResult } from "@/lib/positionalScanRunner";
import type { PositionalScannerId } from "@/lib/positionalScanners";
import { NIFTY_750 } from "@/data/nifty750";
import {
  getScanResults,
  saveScanResults,
  savePendingScanResults,
  finalizePendingScanResults,
  getFullScanLastRun,
  setFullScanLastRun,
  getAllScannerSummaries,
} from "@/lib/positionalScanStorage";
import { TradeSetupCard } from "@/components/TradeSetupCard";
import { 
  getSetups, 
  getSetupCountByType,
  type SetupType,
  type SetupCategory,
} from "@/data/screeners";

const BTST_PILLS = [
  "Strong momentum",
  "Volume breakout",
  "Fresh breakout",
  "Gap up",
  "Oversold bounce",
] as const;

const STOCKS_TO_WATCH_PILLS = [
  "Upcoming earnings",
  "Sector leaders",
  "New 52W high",
  "Fundamental picks",
  "Breakout watchlist",
] as const;

const SWING_TRADING_IDEAS_PILLS = [
  "Consolidation breakout",
  "Pullback to support",
  "Trend continuation",
  "Swing reversal",
  "Flag pattern",
  "Cup and handle",
  "Higher high higher low",
] as const;

function FilterPills({
  pills,
  selected,
  onSelect,
  category: _category,
}: {
  pills: readonly string[];
  selected: string | null;
  onSelect: (pill: string | null) => void;
  category: SetupCategory;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => {
        const count = getSetupCountByType(pill as SetupType);
        return (
          <Badge
            key={pill}
            variant={selected === pill ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors hover:bg-primary/90 hover:text-primary-foreground",
              selected === pill && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            onClick={() => onSelect(selected === pill ? null : pill)}
          >
            {pill}
            {count > 0 && (
              <span className={cn(
                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                selected === pill 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </Badge>
        );
      })}
    </div>
  );
}

// Section with setups
function SetupSection({
  title,
  description,
  pills,
  category,
  selectedPill,
  onSelectPill,
}: {
  title: string;
  description: string;
  pills: readonly string[];
  category: SetupCategory;
  selectedPill: string | null;
  onSelectPill: (pill: string | null) => void;
}) {
  const setups = useMemo(() => {
    if (selectedPill) {
      return getSetups(category, selectedPill as SetupType);
    }
    return [];
  }, [category, selectedPill]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterPills
          pills={pills}
          selected={selectedPill}
          onSelect={onSelectPill}
          category={category}
        />
        
        {/* Show setups when a pill is selected */}
        {selectedPill && setups.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">
                {selectedPill} — {setups.length} {setups.length === 1 ? "setup" : "setups"} found
              </h4>
              <button
                onClick={() => onSelectPill(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear filter ×
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {setups.map(setup => (
                <TradeSetupCard key={setup.id} setup={setup} />
              ))}
            </div>
          </div>
        )}
        
        {selectedPill && setups.length === 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center py-4">
              No setups found for "{selectedPill}" today. Check back later.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SCANNER_LABELS: Record<PositionalScannerId, string> = {
  "fresh-52w-high": "Fresh 52-Week Highs",
  "ath-breakout": "All-Time High Breakout",
  "rs-leaders": "Relative Strength Leaders",
  "pullback-50ema": "Pullback to 50 EMA",
  "bullish-divergence": "Bullish RSI Divergence",
  "consolidation-breakout": "Consolidation Breakout",
  "support-test": "Support Zone Test",
  "cup-handle": "Cup and Handle Forming",
  "double-bottom": "Double Bottom",
  "morning-star": "Morning Star Pattern",
  "accumulation-pattern": "Accumulation Phase",
  "macd-crossover-1d": "MACD Crossover (1 Day)",
  "macd-crossover-1mo": "MACD Crossover (1 Month)",
  "bullish-cross-building-negative": "Bullish Cross Building (Negative)",
  "bullish-cross-building-positive": "Bullish Cross Building (Positive)",
};

const POSITIONAL_SCANNER_IDS: PositionalScannerId[] = [
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
];

export function ScansDesktop() {
  const [btstSelected, setBtstSelected] = useState<string | null>(BTST_PILLS[0]);
  const [stocksSelected, setStocksSelected] = useState<string | null>(STOCKS_TO_WATCH_PILLS[0]);
  const [swingIdeasSelected, setSwingIdeasSelected] = useState<string | null>(SWING_TRADING_IDEAS_PILLS[0]);

  const [scannerResultView, setScannerResultView] = useState<{
    scannerId: PositionalScannerId;
    scannerName: string;
  } | null>(null);
  const [scanResults, setScanResults] = useState<AnyScanResult[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fullScanRunning, setFullScanRunning] = useState(false);
  const [fullScanLastRun, setFullScanLastRunState] = useState<Date | null>(null);
  const [fullScanError, setFullScanError] = useState<string | null>(null);
  const [fullScanProgress, setFullScanProgress] = useState<{
    scannerIndex: number;
    scannerTotal: number;
    scannerName: string;
    stocksCurrent: number;
    stocksTotal: number;
    matched: number;
  } | null>(null);
  const skipScannerRef = useRef(false);
  const singleScanSkipRef = useRef(false);
  const [fullScanCurrentScannerId, setFullScanCurrentScannerId] = useState<PositionalScannerId | null>(null);
  const fullScanLiveResultsRef = useRef<AnyScanResult[]>([]);
  const [fullScanLiveResults, setFullScanLiveResults] = useState<AnyScanResult[]>([]);
  const [scannerSummaries, setScannerSummaries] = useState<
    Record<string, { count: number; topSymbols: string[] }>
  >({});
  const [scannerLastUpdated, setScannerLastUpdated] = useState<Date | null>(null);
  const [scanProgress, setScanProgress] = useState({
    current: 0,
    total: 0,
    matched: 0,
    errors: 0,
    results: [] as AnyScanResult[],
  });

  const fetchFullScanLastRun = useCallback(async () => {
    const at = await getFullScanLastRun();
    setFullScanLastRunState(at);
  }, []);

  const fetchScannerSummaries = useCallback(async () => {
    const summaries = await getAllScannerSummaries();
    setScannerSummaries(summaries);
  }, []);

  const handleSkipScanner = useCallback(() => {
    skipScannerRef.current = true;
  }, []);

  const handleRunFullScan = useCallback(async () => {
    setFullScanRunning(true);
    setFullScanError(null);
    setFullScanProgress(null);
    try {
      const total = POSITIONAL_SCANNER_IDS.length;
      for (let i = 0; i < total; i++) {
        const id = POSITIONAL_SCANNER_IDS[i]!;
        const name = SCANNER_LABELS[id] ?? id;
        skipScannerRef.current = false;
        let accumulatedResults: AnyScanResult[] = [];
        fullScanLiveResultsRef.current = [];
        setFullScanLiveResults([]);
        setFullScanCurrentScannerId(id);
        setFullScanProgress({
          scannerIndex: i + 1,
          scannerTotal: total,
          scannerName: name,
          stocksCurrent: 0,
          stocksTotal: NIFTY_750.length,
          matched: 0,
        });
        const results = await runPositionalScan({
          scannerId: id,
          instrumentKeys: NIFTY_750,
          onProgress: (p) => {
            setFullScanProgress((prev) =>
              prev
                ? {
                    ...prev,
                    stocksCurrent: p.current,
                    matched: p.matched,
                  }
                : prev
            );
          },
          onMatch: (result) => {
            accumulatedResults = [...accumulatedResults, result];
            fullScanLiveResultsRef.current = accumulatedResults;
            setFullScanLiveResults([...accumulatedResults]);
            savePendingScanResults(id, accumulatedResults);
          },
          shouldSkip: () => skipScannerRef.current,
          batchSize: 3,
          delayMs: 1200,
        });
        const finalResults = results.length >= accumulatedResults.length ? results : accumulatedResults;
        await finalizePendingScanResults(id, finalResults);
        setFullScanCurrentScannerId(null);
        setFullScanLiveResults([]);
        fullScanLiveResultsRef.current = [];
      }
      await setFullScanLastRun();
      await fetchFullScanLastRun();
      await fetchScannerSummaries();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setFullScanError(message);
    } finally {
      setFullScanRunning(false);
      setFullScanProgress(null);
    }
  }, [fetchFullScanLastRun, fetchScannerSummaries]);

  const handleOpenScanner = useCallback(
    async (scannerId: string, scannerName: string) => {
      if (!POSITIONAL_SCANNER_IDS.includes(scannerId as PositionalScannerId)) return;
      const id = scannerId as PositionalScannerId;
      setScannerResultView({ scannerId: id, scannerName });
      setScanResults(null);
      setScannerLastUpdated(null);
      const saved = await getScanResults(id);
      if (saved) {
        setScanResults(saved.results);
        setScannerLastUpdated(new Date(saved.updated_at));
      } else {
        setScanResults([]);
      }
    },
    []
  );

  const isViewingActiveScanner =
    fullScanRunning &&
    scannerResultView != null &&
    fullScanCurrentScannerId === scannerResultView.scannerId;

  const handleReRunScanner = useCallback(
    async (scannerId: PositionalScannerId) => {
      singleScanSkipRef.current = false;
      setScanning(true);
      let lastSavedCount = 0;
      setScanProgress({
        current: 0,
        total: NIFTY_750.length,
        matched: 0,
        errors: 0,
        results: [],
      });
      try {
        const results = await runPositionalScan({
          scannerId,
          instrumentKeys: NIFTY_750,
          onProgress: (p) => {
            setScanProgress(p);
            if (p.results.length > 0) setScanResults(p.results);
            if (p.results.length > lastSavedCount) {
              lastSavedCount = p.results.length;
              saveScanResults(scannerId, p.results);
            }
          },
          shouldSkip: () => singleScanSkipRef.current,
          batchSize: 3,
          delayMs: 1200,
        });
        await saveScanResults(scannerId, results);
        setScannerLastUpdated(new Date());
        setScanResults(results);
      } catch {
        // keep whatever results were shown via onProgress
      } finally {
        setScanning(false);
      }
    },
    []
  );

  const handleRunScanner = useCallback(
    async (scannerId: string, scannerName: string) => {
      if (!POSITIONAL_SCANNER_IDS.includes(scannerId as PositionalScannerId)) return;
      const id = scannerId as PositionalScannerId;
      singleScanSkipRef.current = false;
      setScannerResultView({ scannerId: id, scannerName });
      setScanResults(null);
      setScanning(true);
      let lastSavedCount = 0;
      setScanProgress({
        current: 0,
        total: NIFTY_750.length,
        matched: 0,
        errors: 0,
        results: [],
      });
      try {
        const results = await runPositionalScan({
          scannerId: id,
          instrumentKeys: NIFTY_750,
          onProgress: (p) => {
            setScanProgress(p);
            if (p.results.length > 0) setScanResults(p.results);
            if (p.results.length > lastSavedCount) {
              lastSavedCount = p.results.length;
              saveScanResults(id, p.results);
            }
          },
          shouldSkip: () => singleScanSkipRef.current,
          batchSize: 3,
          delayMs: 1200,
        });
        await saveScanResults(id, results);
        setScannerLastUpdated(new Date());
        setScanResults(results);
      } catch {
        // keep whatever results were shown via onProgress
      } finally {
        setScanning(false);
      }
    },
    []
  );

  const handleBackFromScannerResult = useCallback(() => {
    singleScanSkipRef.current = true;
    setScannerResultView(null);
    setScanResults(null);
    setScannerLastUpdated(null);
    setScanning(false);
    setScanProgress({ current: 0, total: 0, matched: 0, errors: 0, results: [] });
    fetchScannerSummaries();
  }, [fetchScannerSummaries]);

  useEffect(() => {
    if (!scannerResultView) {
      fetchFullScanLastRun();
      fetchScannerSummaries();
    }
  }, [scannerResultView, fetchFullScanLastRun, fetchScannerSummaries]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <h1 className="mb-4 text-xl font-semibold text-foreground">
            Scans & Pre-built Strategies
          </h1>
          <Tabs defaultValue="positional-scanners" className="w-full">
            <TabsList className="h-12 w-full justify-start rounded-lg bg-muted p-1">
              <TabsTrigger value="positional-scanners" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Positional Scanner
              </TabsTrigger>
              <TabsTrigger value="intraday-swing-scanners" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Trade Set-up Ideas
              </TabsTrigger>
              <TabsTrigger value="custom-scanner" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Custom scanner
              </TabsTrigger>
              <TabsTrigger value="chart" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Chart
              </TabsTrigger>
            </TabsList>

            <TabsContent value="positional-scanners" className="mt-0">
              <div className="container mx-auto border-b border-border bg-muted/40 px-4 py-3 flex items-center">
                <Badge className="bg-green-600 text-white border-0 text-sm font-bold px-3 py-1 shadow-sm ring-1 ring-green-700/30">Actual Data</Badge>
              </div>
              <div className="container mx-auto space-y-6 px-4 py-6">
                {scannerResultView ? (
                  <ScannerResultPage
                    scannerId={scannerResultView.scannerId}
                    scannerName={scannerResultView.scannerName}
                    results={
                      scanning && scanProgress.results.length > 0
                        ? scanProgress.results
                        : scanResults
                    }
                    scanning={scanning}
                    progress={scanProgress}
                    onBack={handleBackFromScannerResult}
                    lastUpdated={scannerLastUpdated}
                    onReRunScan={() => handleReRunScanner(scannerResultView.scannerId)}
                    liveResults={isViewingActiveScanner ? fullScanLiveResults : undefined}
                    liveScanning={isViewingActiveScanner}
                  />
                ) : (
                  <PositionalScannersView
                    onOpenScanner={handleOpenScanner}
                    onRunFullScan={handleRunFullScan}
                    onSkipScanner={handleSkipScanner}
                    fullScanLastRun={fullScanLastRun}
                    fullScanRunning={fullScanRunning}
                    fullScanError={fullScanError}
                    fullScanProgress={fullScanProgress}
                    scannerSummaries={scannerSummaries}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="intraday-swing-scanners" className="mt-0">
              <div className="container mx-auto border-b border-border bg-muted/40 px-4 py-3 flex items-center">
                <Badge variant="destructive" className="text-sm font-bold px-3 py-1 shadow-sm ring-1 ring-red-800/30">Dummy Data</Badge>
              </div>
              <div className="container mx-auto space-y-6 px-4 py-6">
                {/* BTST Section */}
                <SetupSection
                  title="BTST"
                  description="Buy Today Sell Tomorrow — short-term momentum and overnight opportunities"
                  pills={BTST_PILLS}
                  category="btst"
                  selectedPill={btstSelected}
                  onSelectPill={setBtstSelected}
                />

                {/* Stocks to Watch Section */}
                <SetupSection
                  title="Stocks to Watch"
                  description="Curated watchlist — earnings, sector plays, and key levels to monitor"
                  pills={STOCKS_TO_WATCH_PILLS}
                  category="stocks-to-watch"
                  selectedPill={stocksSelected}
                  onSelectPill={setStocksSelected}
                />

                {/* Swing Trading Ideas Section */}
                <SetupSection
                  title="Swing Trading Ideas"
                  description="Pattern-based setups for 3-10 day holding periods"
                  pills={SWING_TRADING_IDEAS_PILLS}
                  category="swing"
                  selectedPill={swingIdeasSelected}
                  onSelectPill={setSwingIdeasSelected}
                />

                {/* Disclaimer */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">ℹ️</span>
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">About Trade Setups</p>
                        <p>
                          These setups are generated by scanning 750+ stocks for specific technical patterns and market conditions. 
                          They are <strong>observations, not recommendations</strong>. Always do your own research before trading. 
                          Past patterns do not guarantee future results.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Intraday / BTST / Swing scanner cards */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Screeners</h2>
                    <p className="text-sm text-muted-foreground">
                      Discover stocks matching specific criteria
                    </p>
                  </div>
                  <JayeshView
                    onRunScanner={handleRunScanner}
                    allowedPills={["intraday", "btst", "swing"]}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom-scanner" className="mt-0">
              <CustomScannerPage />
            </TabsContent>

            <TabsContent value="chart" className="mt-0">
              <div className="container mx-auto border-b border-border bg-muted/40 px-4 py-3 flex items-center">
                <Badge className="bg-green-600 text-white border-0 text-sm font-bold px-3 py-1 shadow-sm ring-1 ring-green-700/30">Actual Data</Badge>
              </div>
              <ChartPage />
            </TabsContent>
          </Tabs>
        </div>
      </header>
    </div>
  );
}
