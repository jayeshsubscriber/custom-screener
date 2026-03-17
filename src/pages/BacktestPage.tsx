import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  INDICATORS,
  OPERATORS,
  getOperatorsForType,
  getIndicator,
  type IndicatorDef,
  type OperatorId,
  type OperatorDef,
} from "@/data/indicators";
import type { ConditionState, GroupState } from "@/types/screener";
import type { BacktestConfig, ExitRules, BacktestResult, BacktestProgress, Trade } from "@/types/backtest";
import { runBacktest } from "@/lib/backtestEngine";
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import {
  Plus,
  X,
  Play,
  Loader2,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SUPPORTED_TIMEFRAMES = [
  { value: "1d", label: "Daily" },
  { value: "15m", label: "15 min" },
  { value: "1M", label: "Monthly" },
];

const UNIVERSES = [
  { value: "nifty50", label: "Nifty 50" },
  { value: "nifty200", label: "Nifty 200" },
  { value: "nifty500", label: "Nifty 500" },
  { value: "nifty750", label: "Nifty 750" },
  { value: "all", label: "All NSE" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _nextId = 10000;
function uid() {
  return `bt_${_nextId++}_${Date.now()}`;
}

function defaultParams(ind: IndicatorDef): Record<string, number | string> {
  const p: Record<string, number | string> = {};
  for (const param of ind.params) p[param.key] = param.defaultValue;
  return p;
}

function createCondition(): ConditionState {
  return {
    id: uid(),
    leftIndicatorId: "",
    leftParams: {},
    operator: "",
    rightType: "value",
    rightValue: "",
    rightIndicatorId: "",
    rightParams: {},
    rightMultiplier: 1,
    rightValue2: "",
    hasTimeModifier: false,
    timeModifierMode: "within_last",
    timeModifierBars: 5,
  };
}

function createGroup(connector: "AND" | "OR" = "AND", timeframe = "1d"): GroupState {
  return { id: uid(), logic: "AND", timeframe, connector, conditions: [createCondition()] };
}

function formatNumber(n: number): string {
  if (n === Infinity) return "∞";
  if (n === -Infinity) return "-∞";
  if (Number.isNaN(n)) return "N/A";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// ─── IndicatorSelect (matches scanner UI — native <select> with <optgroup>) ─

function IndicatorSelect({
  value,
  onChange,
  excludePatterns,
}: {
  value: string;
  onChange: (id: string) => void;
  excludePatterns?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !value && "text-muted-foreground"
      )}
    >
      <option value="">Select indicator...</option>
      {CATEGORIES.filter(
        (cat) => !excludePatterns || cat.key !== "candlestick"
      ).map((cat) => {
        const items = INDICATORS.filter((i) => i.category === cat.key);
        if (items.length === 0) return null;
        return (
          <optgroup key={cat.key} label={cat.label}>
            {items.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

// ─── ParamFields (matches scanner UI) ────────────────────────────────────────

function ParamFields({
  indicator,
  params,
  onChange,
}: {
  indicator: IndicatorDef;
  params: Record<string, number | string>;
  onChange: (p: Record<string, number | string>) => void;
}) {
  if (indicator.params.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5">
      {indicator.params.map((p) => {
        if (p.type === "select") {
          return (
            <label key={p.key} className="flex items-center gap-1 text-xs text-muted-foreground">
              {p.label}
              <select
                value={String(params[p.key] ?? p.defaultValue)}
                onChange={(e) => onChange({ ...params, [p.key]: e.target.value })}
                className="h-6 rounded border border-input bg-transparent px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {p.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={p.key} className="flex items-center gap-1 text-xs text-muted-foreground">
            {p.label}
            <Input
              type="number"
              value={params[p.key] ?? p.defaultValue}
              onChange={(e) => {
                const raw = e.target.value;
                onChange({ ...params, [p.key]: raw === "" ? "" : Number(raw) });
              }}
              onBlur={(e) => {
                const v = e.target.value;
                if (v === "" || isNaN(Number(v))) onChange({ ...params, [p.key]: p.defaultValue });
              }}
              className="h-6 w-14 text-xs px-1.5"
              min={p.min}
              max={p.max}
              step={p.step ?? 1}
            />
          </label>
        );
      })}
    </div>
  );
}

// ─── ConditionCard (matches scanner UI) ──────────────────────────────────────

function ConditionCard({
  condition,
  onChange,
  onDelete,
  canDelete,
}: {
  condition: ConditionState;
  onChange: (c: ConditionState) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const leftInd = condition.leftIndicatorId ? getIndicator(condition.leftIndicatorId) : null;
  const opDef: OperatorDef | undefined = condition.operator
    ? OPERATORS.find((o) => o.id === condition.operator)
    : undefined;
  const validOps = leftInd ? getOperatorsForType(leftInd.outputType) : [];
  const needsRight = opDef?.needsRight ?? false;
  const isRange = opDef?.rightType === "range";
  const showTimeMod = opDef?.timeModifier === "optional_within" || opDef?.timeModifier === "required_for";
  const forceTimeMod = opDef?.timeModifier === "required_for";

  function update(patch: Partial<ConditionState>) {
    onChange({ ...condition, ...patch });
  }

  function handleLeftChange(indicatorId: string) {
    const ind = indicatorId ? getIndicator(indicatorId) : null;
    const isPattern = ind?.outputType === "pattern";
    update({
      leftIndicatorId: indicatorId,
      leftParams: ind ? defaultParams(ind) : {},
      operator: isPattern ? "detected" : "",
      rightType: "value",
      rightValue: "",
      rightIndicatorId: "",
      rightParams: {},
      rightValue2: "",
      hasTimeModifier: false,
      timeModifierBars: 5,
    });
  }

  function handleOperatorChange(newOp: string) {
    const opId = newOp as OperatorId;
    const force = opId === "is_increasing" || opId === "is_decreasing";
    update({
      operator: opId || "",
      hasTimeModifier: force,
      timeModifierBars: force ? 3 : 5,
    });
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-white relative group/cond">
      {canDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-destructive rounded-sm opacity-0 group-hover/cond:opacity-100 transition-opacity"
          title="Remove condition"
        >
          <X size={14} />
        </button>
      )}

      {/* Left indicator */}
      <div className="pr-6">
        <IndicatorSelect value={condition.leftIndicatorId} onChange={handleLeftChange} />
        {leftInd && (
          <ParamFields
            indicator={leftInd}
            params={condition.leftParams}
            onChange={(p) => update({ leftParams: p })}
          />
        )}
      </div>

      {/* Operator */}
      {leftInd && (
        <div className="mt-2">
          <select
            value={condition.operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
            className={cn(
              "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !condition.operator && "text-muted-foreground"
            )}
          >
            <option value="">Select condition...</option>
            {validOps.map((op) => (
              <option key={op.id} value={op.id}>{op.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Right operand — value or indicator */}
      {opDef && needsRight && !isRange && (
        <div className="mt-2 space-y-1.5">
          <div className="flex gap-0">
            <button
              type="button"
              className={cn(
                "px-2.5 py-1 text-xs rounded-l-md border transition-colors",
                condition.rightType === "value"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input text-muted-foreground hover:bg-accent"
              )}
              onClick={() => update({ rightType: "value", rightIndicatorId: "", rightParams: {} })}
            >
              Value
            </button>
            <button
              type="button"
              className={cn(
                "px-2.5 py-1 text-xs rounded-r-md border-y border-r transition-colors",
                condition.rightType === "indicator"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input text-muted-foreground hover:bg-accent"
              )}
              onClick={() => update({ rightType: "indicator", rightValue: "" })}
            >
              Indicator
            </button>
          </div>

          {condition.rightType === "value" ? (
            <Input
              type="number"
              value={condition.rightValue}
              onChange={(e) => update({ rightValue: e.target.value })}
              placeholder="Enter value"
              className="h-8 text-sm"
            />
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={condition.rightMultiplier}
                  onChange={(e) => {
                    const raw = e.target.value;
                    update({ rightMultiplier: raw === "" ? ("" as unknown as number) : Number(raw) });
                  }}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (!v || isNaN(v)) update({ rightMultiplier: 1 });
                  }}
                  className="h-8 w-14 text-sm text-center shrink-0"
                  step={0.1}
                  min={0.01}
                  title="Multiplier (e.g. 2 means 2× the indicator)"
                />
                <span className="text-sm font-medium text-muted-foreground shrink-0">×</span>
                <div className="flex-1 min-w-0">
                  <IndicatorSelect
                    value={condition.rightIndicatorId}
                    onChange={(id) => {
                      const ind = id ? getIndicator(id) : null;
                      update({ rightIndicatorId: id, rightParams: ind ? defaultParams(ind) : {} });
                    }}
                    excludePatterns
                  />
                </div>
              </div>
              {condition.rightIndicatorId && getIndicator(condition.rightIndicatorId) && (
                <ParamFields
                  indicator={getIndicator(condition.rightIndicatorId)!}
                  params={condition.rightParams}
                  onChange={(p) => update({ rightParams: p })}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Right operand — range (is_between) */}
      {opDef && isRange && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            value={condition.rightValue}
            onChange={(e) => update({ rightValue: e.target.value })}
            placeholder="Min"
            className="h-8 text-sm flex-1"
          />
          <span className="text-xs text-muted-foreground shrink-0">and</span>
          <Input
            type="number"
            value={condition.rightValue2}
            onChange={(e) => update({ rightValue2: e.target.value })}
            placeholder="Max"
            className="h-8 text-sm flex-1"
          />
        </div>
      )}

      {/* Time modifier */}
      {showTimeMod && (
        <div className="mt-2 space-y-1.5">
          {forceTimeMod ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">for</span>
              <Input
                type="number"
                value={condition.timeModifierBars}
                onChange={(e) => {
                  const raw = e.target.value;
                  update({ timeModifierBars: raw === "" ? ("" as unknown as number) : Number(raw) });
                }}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!v || isNaN(v)) update({ timeModifierBars: 3 });
                }}
                className="h-6 w-12 text-xs px-1.5"
                min={1}
                max={200}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">consecutive bars</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="checkbox"
                checked={condition.hasTimeModifier}
                onChange={(e) => update({ hasTimeModifier: e.target.checked })}
                className="rounded border-border accent-primary"
              />
              {condition.hasTimeModifier ? (
                <>
                  <select
                    value={condition.timeModifierMode}
                    onChange={(e) =>
                      update({ timeModifierMode: e.target.value as ConditionState["timeModifierMode"] })
                    }
                    className="h-6 rounded border border-input bg-transparent px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="within_last">Within last</option>
                    <option value="exactly_ago">Exactly</option>
                    <option value="all_of_last">All of last</option>
                  </select>
                  <Input
                    type="number"
                    value={condition.timeModifierBars}
                    onChange={(e) => {
                      const raw = e.target.value;
                      update({ timeModifierBars: raw === "" ? ("" as unknown as number) : Number(raw) });
                    }}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (!v || isNaN(v)) update({ timeModifierBars: 5 });
                    }}
                    className="h-6 w-12 text-xs px-1.5"
                    min={1}
                    max={200}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {condition.timeModifierMode === "exactly_ago" ? "bars ago" : "bars"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Add time constraint</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group Card ──────────────────────────────────────────────────────────────

function GroupCard({
  group,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  group: GroupState;
  index: number;
  onChange: (g: GroupState) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
        <div className="flex items-center gap-2">
          {index > 0 && (
            <select
              value={group.connector}
              onChange={(e) => onChange({ ...group, connector: e.target.value as "AND" | "OR" })}
              className="h-6 text-[10px] font-bold border rounded px-1 bg-background text-primary uppercase"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          )}
          <span className="text-xs font-medium text-foreground">Group {index + 1}</span>
          <select
            value={group.logic}
            onChange={(e) => onChange({ ...group, logic: e.target.value as "AND" | "OR" })}
            className="h-6 text-[10px] border rounded px-1 bg-background"
          >
            <option value="AND">Match ALL</option>
            <option value="OR">Match ANY</option>
          </select>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-destructive">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="p-2 space-y-2">
        {group.conditions.map((c, ci) => (
          <ConditionCard
            key={c.id}
            condition={c}
            onChange={(updated) => {
              const newConds = [...group.conditions];
              newConds[ci] = updated;
              onChange({ ...group, conditions: newConds });
            }}
            onDelete={() => {
              onChange({ ...group, conditions: group.conditions.filter((_, j) => j !== ci) });
            }}
            canDelete={group.conditions.length > 1}
          />
        ))}
        <button
          onClick={() => onChange({ ...group, conditions: [...group.conditions, createCondition()] })}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-1 py-0.5"
        >
          <Plus size={12} /> Add condition
        </button>
      </div>
    </div>
  );
}

// ─── Equity Curve Chart ──────────────────────────────────────────────────────

function EquityCurveChart({ data }: { data: { date: string; equity: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length < 2) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717a",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#f4f4f5" },
        horzLines: { color: "#f4f4f5" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    chartRef.current = chart;

    const series = chart.addSeries(LineSeries, {
      color: "#542087",
      lineWidth: 2,
      priceFormat: { type: "custom", formatter: (p: number) => `₹${p.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
    });

    // Deduplicate by date (keep last equity value per date) and sort ascending
    const byDate = new Map<string, number>();
    for (const d of data) {
      byDate.set(d.date.slice(0, 10), d.equity);
    }
    const lineData = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ time: date as Time, value }));

    if (lineData.length < 2) return;
    series.setData(lineData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
        Not enough data to render equity curve
      </div>
    );
  }

  return <div ref={containerRef} />;
}

// ─── Trade Log Table ─────────────────────────────────────────────────────────

const EXIT_LABELS: Record<string, string> = {
  stop_loss: "Stop Loss",
  target: "Target",
  trailing_stop: "Trail Stop",
  max_holding: "Max Hold",
  exit_condition: "Exit Signal",
  end_of_data: "End of Data",
};

type SortKey = "entryDate" | "pnlPct" | "barsHeld" | "symbol";
type SortDir = "asc" | "desc";

function TradeLogTable({ trades }: { trades: Trade[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("entryDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "pnlPct" ? "desc" : "asc");
    }
  };

  const sorted = [...trades].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "entryDate") cmp = a.entryDate.localeCompare(b.entryDate);
    else if (sortKey === "pnlPct") cmp = a.pnlPct - b.pnlPct;
    else if (sortKey === "barsHeld") cmp = a.barsHeld - b.barsHeld;
    else if (sortKey === "symbol") cmp = a.symbol.localeCompare(b.symbol);
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (trades.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No trades generated</div>;
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="text-left font-medium px-3 py-2 cursor-pointer hover:text-primary select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === field && (
          <ArrowUpDown size={10} className={cn("text-primary", sortDir === "desc" && "rotate-180")} />
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-auto max-h-[400px] border rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 sticky top-0">
          <tr>
            <SortHeader label="Stock" field="symbol" />
            <SortHeader label="Entry Date" field="entryDate" />
            <th className="text-right font-medium px-3 py-2">Entry ₹</th>
            <th className="text-left font-medium px-3 py-2">Exit Date</th>
            <th className="text-right font-medium px-3 py-2">Exit ₹</th>
            <SortHeader label="P&L %" field="pnlPct" />
            <th className="text-right font-medium px-3 py-2">P&L ₹</th>
            <SortHeader label="Bars" field="barsHeld" />
            <th className="text-left font-medium px-3 py-2">Exit Reason</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr key={i} className="border-t hover:bg-muted/20">
              <td className="px-3 py-1.5 font-medium">{t.symbol}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{t.entryDate.slice(0, 10)}</td>
              <td className="px-3 py-1.5 text-right">{t.entryPrice.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{t.exitDate.slice(0, 10)}</td>
              <td className="px-3 py-1.5 text-right">{t.exitPrice.toFixed(2)}</td>
              <td className={cn("px-3 py-1.5 text-right font-medium", t.pnlPct > 0 ? "text-green-600" : t.pnlPct < 0 ? "text-red-500" : "")}>
                {t.pnlPct > 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
              </td>
              <td className={cn("px-3 py-1.5 text-right", t.pnlRs > 0 ? "text-green-600" : t.pnlRs < 0 ? "text-red-500" : "")}>
                {t.pnlRs > 0 ? "+" : ""}{t.pnlRs.toFixed(2)}
              </td>
              <td className="px-3 py-1.5 text-right">{t.barsHeld}</td>
              <td className="px-3 py-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {EXIT_LABELS[t.exitReason] || t.exitReason}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border rounded-lg p-3 bg-background">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={cn("text-lg font-bold", color || "text-foreground")}>{value}</div>
    </div>
  );
}

// ─── Main BacktestPage ───────────────────────────────────────────────────────

export function BacktestPage() {
  // Config state
  const [strategyName, setStrategyName] = useState("");
  const [timeframe, setTimeframe] = useState("1d");
  const [universe, setUniverse] = useState("nifty50");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [allocationMode, setAllocationMode] = useState<"fixed" | "percent">("fixed");
  const [allocationValue, setAllocationValue] = useState(10000);
  const [maxPositions, setMaxPositions] = useState(5);

  // Entry conditions
  const [entryGroups, setEntryGroups] = useState<GroupState[]>([createGroup("AND", "1d")]);

  // Exit rules
  const [stopLoss, setStopLoss] = useState(5);
  const [targetProfit, setTargetProfit] = useState(10);
  const [trailingStop, setTrailingStop] = useState(0);
  const [maxHoldingBars, setMaxHoldingBars] = useState(0);
  const [exitGroups, setExitGroups] = useState<GroupState[]>([]);

  // Results
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [progress, setProgress] = useState<BacktestProgress | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setResult(null);
    setProgress({ phase: "loading", message: "Starting backtest..." });

    try {
      const config: BacktestConfig = {
        name: strategyName || "Untitled Strategy",
        timeframe,
        universe,
        startDate,
        endDate,
        initialCapital,
        allocationMode,
        allocationValue,
        maxPositions,
      };

      const exitRules: ExitRules = {
        stopLossPct: stopLoss,
        targetProfitPct: targetProfit,
        trailingStopPct: trailingStop,
        maxHoldingBars,
        exitConditions: exitGroups,
      };

      const res = await runBacktest(config, entryGroups, exitRules, setProgress);
      setResult(res);
    } catch (err) {
      setProgress({ phase: "error", message: String(err) });
    } finally {
      setRunning(false);
    }
  }, [strategyName, timeframe, universe, startDate, endDate, initialCapital, allocationMode, allocationValue, maxPositions, entryGroups, stopLoss, targetProfit, trailingStop, maxHoldingBars, exitGroups]);

  const hasValidEntry = entryGroups.some((g) =>
    g.conditions.some((c) => c.leftIndicatorId && c.operator)
  );

  return (
    <div className="flex flex-row h-[calc(100vh-3.5rem)] min-h-[500px] relative">
      {/* ── Left Panel: Strategy Config ── */}
      <div className="w-[460px] shrink-0 flex flex-col border-r border-border bg-muted/10">
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Strategy Name */}
            <div>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="Strategy name..."
                className="h-9 text-sm font-medium"
              />
            </div>

            {/* Backtest Settings */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Settings
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full h-8 text-xs border rounded-md px-2 bg-background mt-0.5"
                  >
                    {SUPPORTED_TIMEFRAMES.map((tf) => (
                      <option key={tf.value} value={tf.value}>{tf.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Universe</label>
                  <select
                    value={universe}
                    onChange={(e) => setUniverse(e.target.value)}
                    className="w-full h-8 text-xs border rounded-md px-2 bg-background mt-0.5"
                  >
                    {UNIVERSES.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">From Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">To Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Initial Capital (₹)</label>
                  <Input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Max Positions</label>
                  <Input
                    type="number"
                    value={maxPositions}
                    onChange={(e) => setMaxPositions(Number(e.target.value))}
                    min={1}
                    max={50}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground font-medium">Per-trade Allocation</label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <select
                      value={allocationMode}
                      onChange={(e) => {
                        const mode = e.target.value as "fixed" | "percent";
                        setAllocationMode(mode);
                        setAllocationValue(mode === "fixed" ? 10000 : 10);
                      }}
                      className="h-8 text-xs border rounded-md px-2 bg-background w-24"
                    >
                      <option value="fixed">Fixed ₹</option>
                      <option value="percent">% of Equity</option>
                    </select>
                    <Input
                      type="number"
                      value={allocationValue}
                      onChange={(e) => setAllocationValue(Number(e.target.value))}
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Entry Conditions */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Entry Conditions
              </h3>
              <div className="space-y-3">
                {entryGroups.map((g, gi) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    index={gi}
                    onChange={(updated) => {
                      const newGroups = [...entryGroups];
                      newGroups[gi] = updated;
                      setEntryGroups(newGroups);
                    }}
                    onRemove={() => setEntryGroups(entryGroups.filter((_, j) => j !== gi))}
                    canRemove={entryGroups.length > 1}
                  />
                ))}
                <button
                  onClick={() => setEntryGroups([...entryGroups, createGroup("AND", timeframe)])}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  <Plus size={12} /> Add condition group
                </button>
              </div>
            </section>

            {/* Exit Rules */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Exit Rules
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Stop Loss %</label>
                  <Input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    min={0}
                    step={0.5}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Target Profit %</label>
                  <Input
                    type="number"
                    value={targetProfit}
                    onChange={(e) => setTargetProfit(Number(e.target.value))}
                    min={0}
                    step={0.5}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Trailing Stop %</label>
                  <Input
                    type="number"
                    value={trailingStop}
                    onChange={(e) => setTrailingStop(Number(e.target.value))}
                    min={0}
                    step={0.5}
                    className="h-8 text-xs mt-0.5"
                    placeholder="0 = disabled"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Max Holding (bars)</label>
                  <Input
                    type="number"
                    value={maxHoldingBars}
                    onChange={(e) => setMaxHoldingBars(Number(e.target.value))}
                    min={0}
                    className="h-8 text-xs mt-0.5"
                    placeholder="0 = unlimited"
                  />
                </div>
              </div>

              {/* Optional indicator-based exit */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Indicator-based Exit (optional)</span>
                  {exitGroups.length === 0 && (
                    <button
                      onClick={() => setExitGroups([createGroup("AND", timeframe)])}
                      className="text-[10px] text-primary hover:text-primary/80"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {exitGroups.length > 0 && (
                  <div className="space-y-3">
                    {exitGroups.map((g, gi) => (
                      <GroupCard
                        key={g.id}
                        group={g}
                        index={gi}
                        onChange={(updated) => {
                          const newGroups = [...exitGroups];
                          newGroups[gi] = updated;
                          setExitGroups(newGroups);
                        }}
                        onRemove={() => {
                          const remaining = exitGroups.filter((_, j) => j !== gi);
                          setExitGroups(remaining);
                        }}
                        canRemove
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Run Backtest Button */}
        <div className="p-3 border-t border-border bg-background">
          {progress && running && (
            <div className="text-[10px] text-muted-foreground mb-1.5 truncate">{progress.message}</div>
          )}
          <Button
            onClick={handleRun}
            disabled={running || !hasValidEntry}
            className="w-full h-10 gap-2"
          >
            {running ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play size={14} />
                Run Backtest
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Right Panel: Results ── */}
      <div className="flex-1 overflow-y-auto bg-background">
        {!result && !running && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Backtest your strategy</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Define entry conditions using technical indicators, set exit rules (stop loss, target, trailing stop), then click <strong>Run Backtest</strong> to simulate trades over historical data.
            </p>
          </div>
        )}

        {running && !result && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 size={32} className="text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">{progress?.message || "Running backtest..."}</p>
            {progress?.current !== undefined && progress?.total !== undefined && (
              <div className="w-64 mt-3 bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="p-6 space-y-6">
            {result.totalTrades === 0 && progress?.message && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-1">No trades generated</p>
                <p className="text-xs text-amber-700">{progress.message}</p>
              </div>
            )}
            {/* Summary Metrics */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Performance Summary</h3>
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                <MetricCard
                  label="Total Return"
                  value={`${result.totalReturnPct > 0 ? "+" : ""}${result.totalReturnPct}%`}
                  color={result.totalReturnPct > 0 ? "text-green-600" : result.totalReturnPct < 0 ? "text-red-500" : undefined}
                />
                <MetricCard label="Win Rate" value={`${result.winRate}%`} />
                <MetricCard label="Total Trades" value={String(result.totalTrades)} />
                <MetricCard label="Max Drawdown" value={`${result.maxDrawdownPct}%`} color="text-red-500" />
                <MetricCard label="Profit Factor" value={formatNumber(result.profitFactor)} />
                <MetricCard label="Avg Holding" value={`${result.avgHoldingBars} bars`} />
              </div>
            </div>

            {/* Period Returns */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Period Returns</h3>
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                {(["1W", "1M", "3M", "6M", "9M", "1Y"] as const).map((period) => {
                  const val = result.periodReturns[period];
                  return (
                    <MetricCard
                      key={period}
                      label={period === "1W" ? "1 Week" : period === "1M" ? "1 Month" : period === "3M" ? "3 Month" : period === "6M" ? "6 Month" : period === "9M" ? "9 Month" : "1 Year"}
                      value={val !== null ? `${val > 0 ? "+" : ""}${val}%` : "N/A"}
                      color={val !== null ? (val > 0 ? "text-green-600" : val < 0 ? "text-red-500" : undefined) : "text-muted-foreground"}
                    />
                  );
                })}
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Initial Capital" value={formatCurrency(result.initialCapital)} />
              <MetricCard
                label="Final Equity"
                value={formatCurrency(result.finalEquity)}
                color={result.finalEquity > result.initialCapital ? "text-green-600" : result.finalEquity < result.initialCapital ? "text-red-500" : undefined}
              />
              <MetricCard label="Avg Win" value={`+${result.avgWinPct}%`} color="text-green-600" />
              <MetricCard label="Avg Loss" value={`${result.avgLossPct}%`} color="text-red-500" />
            </div>

            {/* Equity Curve */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Equity Curve</h3>
              <div className="border rounded-lg p-3">
                <EquityCurveChart data={result.equityCurve} />
              </div>
            </div>

            {/* Trade Log */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Trade Log ({result.trades.length} trades)
                </h3>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-green-600 font-medium">{result.winningTrades} wins</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-red-500 font-medium">{result.losingTrades} losses</span>
                </div>
              </div>
              <TradeLogTable trades={result.trades} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
