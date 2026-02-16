import { cn } from "@/lib/utils";
import type { TradingStyle } from "@/data/screeners";

export type IntentFilterValue = TradingStyle | "all";

interface IntentFilterProps {
  value: IntentFilterValue;
  onChange: (value: IntentFilterValue) => void;
  counts?: Record<IntentFilterValue, number>;
  showCounts?: boolean;
}

const INTENT_OPTIONS: { value: IntentFilterValue; label: string; description?: string }[] = [
  { value: "all", label: "All", description: "All screeners" },
  { value: "intraday", label: "Intraday", description: "Same day trades" },
  { value: "btst", label: "BTST", description: "Buy today, sell tomorrow" },
  { value: "swing", label: "Swing", description: "2-10 day trades" },
  { value: "positional", label: "Positional", description: "Weeks to months" },
];

export function IntentFilter({
  value,
  onChange,
  counts,
  showCounts = true,
}: IntentFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {INTENT_OPTIONS.map((option) => {
        const count = counts?.[option.value];
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <span>{option.label}</span>
            {showCounts && count !== undefined && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Compact version for smaller spaces
export function IntentFilterCompact({
  value,
  onChange,
}: Omit<IntentFilterProps, "counts" | "showCounts">) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1">
      {INTENT_OPTIONS.map((option) => {
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Vertical tabs version for intent-based view
export function IntentTabs({
  value,
  onChange,
  counts,
}: IntentFilterProps) {
  return (
    <div className="flex flex-col gap-1 w-48">
      {INTENT_OPTIONS.filter(o => o.value !== "all").map((option) => {
        const count = counts?.[option.value];
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-foreground hover:bg-muted"
            )}
          >
            <div>
              <div className="font-medium text-sm">{option.label}</div>
              {option.description && (
                <div
                  className={cn(
                    "text-xs mt-0.5",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {option.description}
                </div>
              )}
            </div>
            {count !== undefined && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  isActive
                    ? "bg-primary-foreground/20"
                    : "bg-background text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
