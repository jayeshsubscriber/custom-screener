import { cn } from "@/lib/utils";
import type { ScreenerStock } from "@/data/screeners";

interface StockPreviewTableProps {
  stocks: ScreenerStock[];
  maxRows?: number;
  compact?: boolean;
  showMoreLink?: boolean;
  onShowMore?: () => void;
}

export function StockPreviewTable({
  stocks,
  maxRows = 3,
  compact = false,
  showMoreLink = true,
  onShowMore,
}: StockPreviewTableProps) {
  const visibleStocks = stocks.slice(0, maxRows);
  const remainingCount = stocks.length - maxRows;

  return (
    <div className={cn("space-y-1", compact && "space-y-0.5")}>
      {visibleStocks.map((stock) => (
        <div
          key={stock.symbol}
          className={cn(
            "flex items-center justify-between text-xs",
            compact ? "py-0.5" : "py-1"
          )}
        >
          <span className="font-medium text-foreground truncate max-w-[80px]">
            {stock.symbol}
          </span>
          <span className="text-muted-foreground tabular-nums">
            ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span
            className={cn(
              "font-medium tabular-nums",
              stock.changePct >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {stock.changePct >= 0 ? "+" : ""}
            {stock.changePct.toFixed(1)}%
          </span>
        </div>
      ))}
      
      {showMoreLink && remainingCount > 0 && (
        <button
          type="button"
          onClick={onShowMore}
          className={cn(
            "text-xs text-primary hover:text-primary/80 font-medium",
            compact ? "pt-0.5" : "pt-1"
          )}
        >
          +{remainingCount} more →
        </button>
      )}
    </div>
  );
}

// Inline variant for displaying stocks horizontally
interface StockPreviewInlineProps {
  stocks: ScreenerStock[];
  maxItems?: number;
}

export function StockPreviewInline({ stocks, maxItems = 3 }: StockPreviewInlineProps) {
  const visibleStocks = stocks.slice(0, maxItems);
  const remainingCount = stocks.length - maxItems;

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      {visibleStocks.map((stock, index) => (
        <span key={stock.symbol} className="flex items-center gap-1">
          <span className="font-medium">{stock.symbol}</span>
          <span
            className={cn(
              "font-medium",
              stock.changePct >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {stock.changePct >= 0 ? "▲" : "▼"}
          </span>
          {index < visibleStocks.length - 1 && (
            <span className="text-muted-foreground ml-1">•</span>
          )}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="text-muted-foreground">+{remainingCount}</span>
      )}
    </div>
  );
}
