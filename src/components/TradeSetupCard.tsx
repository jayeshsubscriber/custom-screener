import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TradeSetup } from "@/data/screeners";

interface TradeSetupCardProps {
  setup: TradeSetup;
  expanded?: boolean;
}

export function TradeSetupCard({ setup, expanded = false }: TradeSetupCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Generate star rating display
  const stars = "★".repeat(setup.signalStrength) + "☆".repeat(5 - setup.signalStrength);

  return (
    <Card className={cn(
      "transition-all hover:shadow-lg",
      setup.signalStrength >= 4 && "ring-1 ring-primary/20"
    )}>
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">{setup.symbol}</span>
                <span className="text-amber-500 text-sm" title={`Signal Strength: ${setup.signalStrength}/5`}>
                  {stars}
                </span>
              </div>
              <h3 className="font-semibold text-base text-foreground leading-tight">
                {setup.headline}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{setup.name}</p>
            </div>
            
            {/* Price Section */}
            <div className="text-right shrink-0">
              <div className="text-xl font-bold">₹{setup.currentPrice.toLocaleString("en-IN")}</div>
              <div className={cn(
                "text-sm font-semibold",
                setup.changePct >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {setup.changePct >= 0 ? "+" : ""}{setup.changePct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Observation Section */}
        <div className="px-4 pb-3">
          <p className={cn(
            "text-sm text-muted-foreground",
            !isExpanded && "line-clamp-2"
          )}>
            {setup.observation}
          </p>
        </div>

        {/* Signals Pills */}
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {setup.signals.slice(0, isExpanded ? undefined : 3).map((signal, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] font-normal">
                <span className="font-medium">{signal.name}:</span>
                <span className="ml-1 text-muted-foreground">{signal.value}</span>
              </Badge>
            ))}
            {!isExpanded && setup.signals.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">
                +{setup.signals.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Sector Trend</span>
                <span className={cn(
                  "font-medium",
                  setup.sectorTrend === "bullish" ? "text-green-600" : 
                  setup.sectorTrend === "bearish" ? "text-red-600" : "text-gray-600"
                )}>
                  {setup.sectorTrend.charAt(0).toUpperCase() + setup.sectorTrend.slice(1)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Setup Type</span>
                <Badge variant="outline" className="text-[10px]">
                  {setup.setupType}
                </Badge>
              </div>
            </div>
            <div className="mt-3 p-2 bg-background rounded border border-border">
              <span className="text-[10px] text-muted-foreground block mb-1">Market Context</span>
              <span className="text-xs">{setup.marketContext}</span>
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

// Compact version for listing multiple setups
interface TradeSetupCompactProps {
  setup: TradeSetup;
  onClick?: () => void;
}

export function TradeSetupCompact({ setup, onClick }: TradeSetupCompactProps) {
  const stars = "★".repeat(setup.signalStrength) + "☆".repeat(5 - setup.signalStrength);

  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{setup.symbol}</span>
            <span className="text-amber-500 text-xs">{stars}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{setup.headline}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-semibold">₹{setup.currentPrice.toLocaleString("en-IN")}</div>
        <div className={cn(
          "text-xs font-medium",
          setup.changePct >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {setup.changePct >= 0 ? "+" : ""}{setup.changePct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
