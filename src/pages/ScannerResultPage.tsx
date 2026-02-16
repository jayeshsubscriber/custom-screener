/**
 * Shows results of a positional scanner run.
 * Displays scanner name, progress while loading, and a table with relevant columns per scanner.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PositionalScannerId } from "@/lib/positionalScanners";
import type { AnyScanResult } from "@/lib/positionalScanRunner";

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
  "macd-crossover-1d": "MACD Crossover in Last 30 Days (1 Day)",
  "macd-crossover-1mo": "MACD Crossover in Last 30 Days (1 Month)",
  "bullish-cross-building-negative": "Bullish Cross Building (Negative)",
  "bullish-cross-building-positive": "Bullish Cross Building (Positive)",
};

function formatLastUpdated(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface ScannerResultPageProps {
  scannerId: PositionalScannerId;
  scannerName: string;
  results: AnyScanResult[] | null;
  scanning: boolean;
  progress: { current: number; total: number; matched: number; errors: number };
  onBack: () => void;
  lastUpdated?: Date | null;
  onReRunScan?: () => void;
  liveResults?: AnyScanResult[];
  liveScanning?: boolean;
}

export function ScannerResultPage({
  scannerId,
  scannerName,
  results,
  scanning,
  progress,
  onBack,
  lastUpdated,
  onReRunScan,
  liveResults,
  liveScanning,
}: ScannerResultPageProps) {
  const hasResults = results && results.length > 0;
  const hasLiveResults = liveResults && liveResults.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            ← Back to Screeners
          </button>
          <h2 className="text-lg font-semibold text-foreground">{scannerName}</h2>
          {hasResults && (
            <Badge className="bg-primary text-primary-foreground">
              {results!.length} stocks
            </Badge>
          )}
          {lastUpdated != null && (
            <span className="text-xs text-muted-foreground">
              Last updated: {formatLastUpdated(lastUpdated)}
            </span>
          )}
        </div>
        {onReRunScan && (
          <button
            type="button"
            onClick={onReRunScan}
            disabled={scanning}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {scanning ? "Scanning…" : "ReRun Scan"}
          </button>
        )}
      </div>

      {/* Live results from full scan in progress — shown at the top */}
      {hasLiveResults && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <CardTitle className="text-base text-green-800">
                  New Matches{liveScanning ? " (scanning…)" : ""}
                </CardTitle>
              </div>
              <Badge className="bg-green-600 text-white">{liveResults!.length} new</Badge>
            </div>
            <CardDescription className="text-green-700">
              Found during the current full scan run. These will replace old results when this scanner finishes.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-green-200 bg-green-100/50">
                  <th className="text-left font-medium px-4 py-2">Symbol</th>
                  <th className="text-left font-medium px-4 py-2">Name</th>
                  <th className="text-right font-medium px-4 py-2">LTP</th>
                </tr>
              </thead>
              <tbody>
                {liveResults!.map((row) => (
                  <tr key={row.symbol} className="border-b border-green-100 hover:bg-green-50">
                    <td className="px-4 py-2 font-medium text-green-900">{row.symbol}</td>
                    <td className="px-4 py-2 text-green-800">{row.name}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      ₹{row.todayClose.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Saved results */}
      {hasResults && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{hasLiveResults ? "Previous Results" : "Results"}</CardTitle>
            {scanning && (
              <CardDescription>
                Showing matches as they are found. Scan in progress…
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium px-4 py-3">Symbol</th>
                  <th className="text-left font-medium px-4 py-3">Name</th>
                  <th className="text-right font-medium px-4 py-3">LTP</th>
                  {scannerId === "fresh-52w-high" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">52W High</th>
                      <th className="text-right font-medium px-4 py-3">% from 52W High</th>
                    </>
                  )}
                  {scannerId === "ath-breakout" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">ATH</th>
                      <th className="text-right font-medium px-4 py-3">% above ATH</th>
                    </>
                  )}
                  {scannerId === "rs-leaders" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">20d Return %</th>
                      <th className="text-right font-medium px-4 py-3">Outperformance %</th>
                    </>
                  )}
                  {scannerId === "pullback-50ema" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">50 EMA</th>
                      <th className="text-right font-medium px-4 py-3">% from 50 EMA</th>
                    </>
                  )}
                  {scannerId === "bullish-divergence" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">RSI</th>
                      <th className="text-right font-medium px-4 py-3">Price Low 1 / 2</th>
                    </>
                  )}
                  {scannerId === "consolidation-breakout" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">Tier</th>
                      <th className="text-center font-medium px-4 py-3">Stage</th>
                      <th className="text-right font-medium px-4 py-3">Breakout</th>
                      <th className="text-right font-medium px-4 py-3">Target</th>
                      <th className="text-right font-medium px-4 py-3">R:R</th>
                      <th className="text-right font-medium px-4 py-3">RS</th>
                      <th className="text-center font-medium px-4 py-3">Trend</th>
                      <th className="text-right font-medium px-4 py-3">Score</th>
                      <th className="text-right font-medium px-4 py-3">Dist %</th>
                    </>
                  )}
                  {scannerId === "support-test" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">Support</th>
                      <th className="text-right font-medium px-4 py-3">% from Support</th>
                    </>
                  )}
                  {scannerId === "cup-handle" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">Resistance</th>
                      <th className="text-right font-medium px-4 py-3">% from Resistance</th>
                    </>
                  )}
                  {scannerId === "double-bottom" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">Neckline</th>
                      <th className="text-right font-medium px-4 py-3">% from Neckline</th>
                    </>
                  )}
                  {scannerId === "morning-star" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">Day1 Body %</th>
                      <th className="text-right font-medium px-4 py-3">Day3 Body %</th>
                    </>
                  )}
                  {scannerId === "accumulation-pattern" && (
                    <>
                      <th className="text-right font-medium px-4 py-3">Volatility Ratio</th>
                      <th className="text-right font-medium px-4 py-3">Volume Ratio</th>
                    </>
                  )}
                  {(scannerId === "macd-crossover-1d" || scannerId === "macd-crossover-1mo") && (
                    <>
                      <th className="text-right font-medium px-4 py-3">Crossover Date</th>
                      <th className="text-right font-medium px-4 py-3">MACD</th>
                      <th className="text-right font-medium px-4 py-3">Signal</th>
                    </>
                  )}
                  {(scannerId === "bullish-cross-building-negative" || scannerId === "bullish-cross-building-positive") && (
                    <>
                      <th className="text-right font-medium px-4 py-3">MACD</th>
                      <th className="text-right font-medium px-4 py-3">Signal</th>
                      <th className="text-right font-medium px-4 py-3">Histogram Δ</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {results!.map((row) => (
                  <tr key={row.symbol} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{row.symbol}</td>
                    <td className="px-4 py-2 text-muted-foreground">{row.name}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      ₹{row.todayClose.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {row.scannerId === "fresh-52w-high" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          ₹{row.data.high52w.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-green-600">
                          {row.data.pctFrom52wHigh >= 0 ? "+" : ""}{row.data.pctFrom52wHigh.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "ath-breakout" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          ₹{row.data.ath.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-green-600">
                          +{row.data.pctAboveAth.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "rs-leaders" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.stockReturn20d >= 0 ? "+" : ""}{row.data.stockReturn20d.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-green-600">
                          +{row.data.outperformance.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "pullback-50ema" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          ₹{row.data.ema50.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.pctFromEma50 >= 0 ? "+" : ""}{row.data.pctFromEma50.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "bullish-divergence" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.rsiCurrent.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                          ₹{row.data.priceLow1.toFixed(0)} / ₹{row.data.priceLow2.toFixed(0)}
                        </td>
                      </>
                    )}
                    {row.scannerId === "consolidation-breakout" && (
                      <>
                        <td className="px-4 py-2 text-right">
                          <span className="font-medium">{row.data.tier}</span>
                          <span
                            className={
                              row.data.tier === "3"
                                ? "text-xs ml-1 text-muted-foreground italic"
                                : "text-muted-foreground text-xs ml-1"
                            }
                          >
                            ({row.data.tier_name})
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-mono">
                          {row.data.base_stage}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          ₹{row.data.breakout_level.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-green-600">
                          ₹{row.data.target.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.rr_ratio.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          <span className={row.data.rs_ratio >= 1.2 ? "text-green-600" : row.data.rs_ratio < 0.8 ? "text-red-500" : ""}>
                            {row.data.rs_ratio.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-xs">
                          {row.data.above_dma200 && row.data.golden_cross
                            ? "200+GC"
                            : row.data.above_dma200
                              ? ">200"
                              : row.data.golden_cross
                                ? "GC"
                                : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.score_pct}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                          {row.data.distance_to_breakout_pct != null
                            ? `${row.data.distance_to_breakout_pct >= 0 ? "+" : ""}${row.data.distance_to_breakout_pct.toFixed(1)}%`
                            : "—"}
                        </td>
                      </>
                    )}
                    {row.scannerId === "support-test" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          ₹{row.data.supportLevel.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.pctFromSupport >= 0 ? "+" : ""}{row.data.pctFromSupport.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "cup-handle" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          ₹{row.data.resistanceLevel.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                          {row.data.pctFromResistance.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "double-bottom" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          ₹{row.data.neckline.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.pctFromNeckline >= 0 ? "+" : ""}{row.data.pctFromNeckline.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "morning-star" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.day1BodyPct.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.day3BodyPct.toFixed(2)}%
                        </td>
                      </>
                    )}
                    {row.scannerId === "accumulation-pattern" && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.volatilityRatio.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.volumeRatio.toFixed(2)}x
                        </td>
                      </>
                    )}
                    {(row.scannerId === "macd-crossover-1d" || row.scannerId === "macd-crossover-1mo") && (
                      <>
                        <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                          {row.data.crossoverDate ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.macdValue != null ? row.data.macdValue.toFixed(2) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.signalValue != null ? row.data.signalValue.toFixed(2) : "—"}
                        </td>
                      </>
                    )}
                    {(row.scannerId === "bullish-cross-building-negative" || row.scannerId === "bullish-cross-building-positive") && (
                      <>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.macdValue != null ? row.data.macdValue.toFixed(2) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {row.data.signalValue != null ? row.data.signalValue.toFixed(2) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-green-600">
                          {row.data.histogramChange != null ? (row.data.histogramChange >= 0 ? "+" : "") + row.data.histogramChange.toFixed(2) : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {scanning && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Scanning… {progress.current} / {progress.total}
              {progress.matched > 0 && (
                <span className="text-primary font-medium"> • Matched: {progress.matched}</span>
              )}
              {progress.errors > 0 && (
                <span className="text-destructive"> • Errors: {progress.errors}</span>
              )}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: progress.total ? `${(progress.current / progress.total) * 100}%` : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {!scanning && !hasResults && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No stocks matched the criteria for this scanner.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { SCANNER_LABELS };
