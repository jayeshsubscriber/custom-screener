import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StockPreviewTable } from "@/components/StockPreviewTable";
import type { Screener, TradingStyle } from "@/data/screeners";

interface ScreenerCardProps {
  screener: Screener;
  variant?: "default" | "compact" | "expanded";
  showDescription?: boolean;
  showStyleBadges?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}

const STYLE_COLORS: Record<TradingStyle, string> = {
  intraday: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  btst: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  swing: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  positional: "bg-green-100 text-green-700 hover:bg-green-200",
};

const STYLE_LABELS: Record<TradingStyle, string> = {
  intraday: "Intraday",
  btst: "BTST",
  swing: "Swing",
  positional: "Positional",
};

export function ScreenerCard({
  screener,
  variant = "default",
  showDescription = true,
  showStyleBadges = false,
  onClick,
  isSelected = false,
}: ScreenerCardProps) {
  const stockCount = screener.stocks.length;

  if (variant === "compact") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent",
          isSelected
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-medium text-sm text-foreground leading-tight">
            {screener.name}
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {stockCount}
          </Badge>
        </div>
        
        {showDescription && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {screener.description}
          </p>
        )}

        <StockPreviewTable
          stocks={screener.stocks}
          maxRows={3}
          compact
          showMoreLink={stockCount > 3}
          onShowMore={onClick}
        />
      </div>
    );
  }

  if (variant === "expanded") {
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{screener.name}</CardTitle>
              {showDescription && (
                <p className="text-xs text-muted-foreground mt-1">
                  {screener.description}
                </p>
              )}
            </div>
            <Badge variant="default" className="text-xs">
              {stockCount} stocks
            </Badge>
          </div>
          
          {showStyleBadges && screener.applicableStyles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {screener.applicableStyles.map((style) => (
                <Badge
                  key={style}
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", STYLE_COLORS[style])}
                >
                  {STYLE_LABELS[style]}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <StockPreviewTable
            stocks={screener.stocks}
            maxRows={5}
            showMoreLink={stockCount > 5}
            onShowMore={onClick}
          />
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm text-foreground">
          {screener.name}
        </h3>
        <Badge
          variant={screener.isHot ? "default" : "secondary"}
          className={cn("text-xs shrink-0", screener.isHot && "bg-orange-500")}
        >
          {stockCount}
        </Badge>
      </div>
      
      {showDescription && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {screener.description}
        </p>
      )}

      <div className="border-t border-border pt-3">
        <StockPreviewTable
          stocks={screener.stocks}
          maxRows={3}
          compact={false}
          showMoreLink={stockCount > 3}
          onShowMore={onClick}
        />
      </div>

      {showStyleBadges && screener.applicableStyles.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-border">
          {screener.applicableStyles.map((style) => (
            <Badge
              key={style}
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", STYLE_COLORS[style])}
            >
              {STYLE_LABELS[style]}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Horizontal screener item for list views
interface ScreenerListItemProps {
  screener: Screener;
  onClick?: () => void;
}

export function ScreenerListItem({ screener, onClick }: ScreenerListItemProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">
            {screener.name}
          </span>
          {screener.isHot && (
            <span className="text-orange-500 text-xs">🔥</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {screener.description}
        </p>
      </div>
      
      <div className="flex items-center gap-3 ml-4">
        <div className="text-right">
          <Badge variant="secondary" className="text-xs">
            {screener.stocks.length} stocks
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {screener.stocks.slice(0, 2).map(s => s.symbol).join(", ")}
          {screener.stocks.length > 2 && "..."}
        </div>
      </div>
    </div>
  );
}
