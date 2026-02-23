import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const SUPPORTED_TIMEFRAMES = [
  { value: "1d", label: "Daily" },
  { value: "15m", label: "15 min" },
];
import { X, Plus, Play, Search, RefreshCw, Loader2, Sparkles, Settings } from "lucide-react";
import type { ConditionState, GroupState, QueryState, ScanResultRow, ScanProgress, IndicatorColumn } from "@/types/screener";
import { runCustomScan, extractIndicatorColumns } from "@/lib/customScanRunner";
import { loadTokenFromSupabase, saveTokenToSupabase, getTokenStatus } from "@/lib/upstoxTokenStore";
import { refreshDailyCandles, refresh15mCandles, getDataFreshness, type PipelineProgress } from "@/lib/scannerDataPipeline";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _nextId = 1;
function uid() {
  return `c${_nextId++}_${Date.now()}`;
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

function formatIndicator(id: string, params: Record<string, number | string>): string {
  const ind = getIndicator(id);
  if (!ind) return "";
  const numberParams = ind.params.filter((p) => p.type === "number");
  const selectParams = ind.params.filter((p) => p.type === "select");

  let label = ind.name;

  if (selectParams.length > 0) {
    const selVals = selectParams.map((p) => {
      const val = String(params[p.key] ?? p.defaultValue);
      const opt = p.options.find((o) => o.value === val);
      return opt ? opt.label : val;
    });
    label += ` [${selVals.join(", ")}]`;
  }

  if (numberParams.length > 0) {
    const numVals = numberParams.map((p) => params[p.key] ?? p.defaultValue).join(",");
    label += `(${numVals})`;
  }

  return label;
}

function generateSummary(groups: GroupState[]): string {
  const parts = groups
    .map((group) => {
      const sentences = group.conditions
        .filter((c) => c.leftIndicatorId && c.operator)
        .map((c) => {
          const left = formatIndicator(c.leftIndicatorId, c.leftParams);
          const op = OPERATORS.find((o) => o.id === c.operator);
          if (!op) return "";

          let s = `${left} ${op.label}`;

          if (op.needsRight) {
            if (op.rightType === "range") {
              s += ` ${c.rightValue || "?"} and ${c.rightValue2 || "?"}`;
            } else if (c.rightType === "indicator" && c.rightIndicatorId) {
              const mult = c.rightMultiplier !== 1 ? `${c.rightMultiplier}× ` : "";
              s += ` ${mult}${formatIndicator(c.rightIndicatorId, c.rightParams)}`;
            } else if (c.rightValue) {
              s += ` ${c.rightValue}`;
            }
          }

          if (c.hasTimeModifier && c.timeModifierBars > 0) {
            if (op.timeModifier === "required_for") {
              s += ` for ${c.timeModifierBars} bars`;
            } else if (c.timeModifierMode === "exactly_ago") {
              s += ` exactly ${c.timeModifierBars} bars ago`;
            } else if (c.timeModifierMode === "all_of_last") {
              s += ` in all of last ${c.timeModifierBars} bars`;
            } else {
              s += ` within last ${c.timeModifierBars} bars`;
            }
          }

          return s;
        })
        .filter(Boolean);

      if (sentences.length === 0) return { text: "", connector: group.connector, timeframe: group.timeframe };
      const tf = SUPPORTED_TIMEFRAMES.find((t) => t.value === group.timeframe)?.label ?? group.timeframe;
      return { text: `[${tf}] ${sentences.join(` ${group.logic} `)}`, connector: group.connector, timeframe: group.timeframe };
    })
    .filter((p) => p.text);

  if (parts.length === 0) return "";
  if (parts.length === 1) return `Stocks where ${parts[0].text}`;

  return `Stocks where ${parts
    .map((p, i) => (i > 0 ? `${p.connector} (${p.text})` : `(${p.text})`))
    .join(" ")}`;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
            <label
              key={p.key}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              {p.label}
              <select
                value={String(params[p.key] ?? p.defaultValue)}
                onChange={(e) =>
                  onChange({ ...params, [p.key]: e.target.value })
                }
                className="h-6 rounded border border-input bg-transparent px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {p.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label
            key={p.key}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
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
                if (v === "" || isNaN(Number(v)))
                  onChange({ ...params, [p.key]: p.defaultValue });
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

function ConditionCard({
  condition,
  onChange,
  onDelete,
  canDelete,
  embedded,
}: {
  condition: ConditionState;
  onChange: (c: ConditionState) => void;
  onDelete: () => void;
  canDelete: boolean;
  embedded?: boolean;
}) {
  const leftInd = condition.leftIndicatorId
    ? getIndicator(condition.leftIndicatorId)
    : null;
  const opDef: OperatorDef | undefined = condition.operator
    ? OPERATORS.find((o) => o.id === condition.operator)
    : undefined;

  const validOps = leftInd ? getOperatorsForType(leftInd.outputType) : [];
  const needsRight = opDef?.needsRight ?? false;
  const isRange = opDef?.rightType === "range";

  const showTimeMod =
    opDef?.timeModifier === "optional_within" ||
    opDef?.timeModifier === "required_for";
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
    <div className={cn(
      "p-3 relative group/cond",
      embedded ? "bg-transparent" : "rounded-lg border border-border bg-white"
    )}>
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
        <IndicatorSelect
          value={condition.leftIndicatorId}
          onChange={handleLeftChange}
        />
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
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
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
              onClick={() =>
                update({
                  rightType: "value",
                  rightIndicatorId: "",
                  rightParams: {},
                })
              }
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
                <span className="text-sm font-medium text-muted-foreground shrink-0">
                  ×
                </span>
                <div className="flex-1 min-w-0">
                  <IndicatorSelect
                    value={condition.rightIndicatorId}
                    onChange={(id) => {
                      const ind = id ? getIndicator(id) : null;
                      update({
                        rightIndicatorId: id,
                        rightParams: ind ? defaultParams(ind) : {},
                      });
                    }}
                    excludePatterns
                  />
                </div>
              </div>
              {condition.rightIndicatorId &&
                getIndicator(condition.rightIndicatorId) && (
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
                      update({
                        timeModifierMode: e.target.value as ConditionState["timeModifierMode"],
                      })
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
                    {condition.timeModifierMode === "exactly_ago"
                      ? "bars ago"
                      : "bars"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Add time constraint
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  onChange,
  onDelete,
  isOnly,
}: {
  group: GroupState;
  onChange: (g: GroupState) => void;
  onDelete: () => void;
  isOnly: boolean;
}) {
  function addCondition() {
    onChange({
      ...group,
      conditions: [...group.conditions, createCondition()],
    });
  }

  function updateCondition(conditionId: string, updated: ConditionState) {
    onChange({
      ...group,
      conditions: group.conditions.map((c) =>
        c.id === conditionId ? updated : c
      ),
    });
  }

  function deleteCondition(conditionId: string) {
    if (group.conditions.length <= 1) return;
    onChange({
      ...group,
      conditions: group.conditions.filter((c) => c.id !== conditionId),
    });
  }

  return (
    <div className="rounded-xl border-2 border-border/60 bg-muted/20 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={group.timeframe}
            onChange={(e) =>
              onChange({ ...group, timeframe: e.target.value })
            }
            className="h-6 rounded border border-input bg-transparent px-1.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SUPPORTED_TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">Match</span>
          <select
            value={group.logic}
            onChange={(e) =>
              onChange({ ...group, logic: e.target.value as "AND" | "OR" })
            }
            className="h-6 rounded border border-input bg-transparent px-1.5 text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="AND">ALL</option>
            <option value="OR">ANY</option>
          </select>
        </div>
        {!isOnly && (
          <button
            onClick={onDelete}
            className="text-muted-foreground/60 hover:text-destructive transition-colors shrink-0"
            title="Remove group"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Conditions list */}
      <div className="p-3 space-y-2">
        {group.conditions.map((condition, idx) => (
          <div key={condition.id}>
            {idx > 0 && (
              <div className="flex items-center justify-center my-1.5">
                <span className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider">
                  {group.logic}
                </span>
              </div>
            )}
            <ConditionCard
              condition={condition}
              onChange={(c) => updateCondition(condition.id, c)}
              onDelete={() => deleteCondition(condition.id)}
              canDelete={group.conditions.length > 1}
            />
          </div>
        ))}

        <button
          onClick={addCondition}
          className="w-full py-1.5 text-xs text-primary font-medium rounded-lg border border-dashed border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
        >
          <Plus size={12} />
          Add condition
        </button>
      </div>
    </div>
  );
}

// ─── Helpers for volume formatting ──────────────────────────────────────────

function formatVolume(vol: number): string {
  if (vol >= 1e7) return (vol / 1e7).toFixed(1) + "Cr";
  if (vol >= 1e5) return (vol / 1e5).toFixed(1) + "L";
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + "K";
  return String(vol);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Simple UI types & helpers ──────────────────────────────────────────────

interface SimpleConditionRow extends ConditionState {
  timeframe: string;
  connector: "AND" | "OR";
}

function createSimpleCondition(connector: "AND" | "OR" = "AND"): SimpleConditionRow {
  return { ...createCondition(), rightType: "indicator", timeframe: "1d", connector };
}

/** Convert flat simple conditions → QueryState (each condition = 1 group) */
function simpleToQuery(
  name: string,
  conditions: SimpleConditionRow[]
): QueryState {
  return {
    name,
    universe: "nifty50",
    groups: conditions.map((c) => ({
      id: c.id + "_g",
      logic: "AND" as const,
      timeframe: c.timeframe,
      connector: c.connector,
      conditions: [{
        id: c.id,
        leftIndicatorId: c.leftIndicatorId,
        leftParams: c.leftParams,
        operator: c.operator,
        rightType: c.rightType,
        rightValue: c.rightValue,
        rightIndicatorId: c.rightIndicatorId,
        rightParams: c.rightParams,
        rightMultiplier: c.rightMultiplier,
        rightValue2: c.rightValue2,
        hasTimeModifier: c.hasTimeModifier,
        timeModifierMode: c.timeModifierMode,
        timeModifierBars: c.timeModifierBars,
      }],
    })),
  };
}

/** Convert QueryState → flat simple conditions (for switching from classic) */
function queryToSimple(query: QueryState): SimpleConditionRow[] {
  const rows: SimpleConditionRow[] = [];
  for (const group of query.groups) {
    for (let i = 0; i < group.conditions.length; i++) {
      const c = group.conditions[i];
      rows.push({
        ...c,
        timeframe: group.timeframe,
        connector: i === 0 ? group.connector : group.logic,
      });
    }
  }
  return rows;
}

// ─── Indicator Sidebar ──────────────────────────────────────────────────────

function IndicatorSidebar({
  open,
  onSelect,
  onClose,
  excludePatterns,
}: {
  open: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  excludePatterns?: boolean;
}) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  if (!open) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base">Select Indicator</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for indicator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm pl-8"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {CATEGORIES.filter(
          (cat) => !excludePatterns || (cat.key !== "candlestick" && cat.key !== "divergence")
        ).map((cat) => {
          const items = INDICATORS.filter(
            (i) =>
              i.category === cat.key &&
              (!q || i.name.toLowerCase().includes(q) || i.id.includes(q))
          );
          if (items.length === 0) return null;
          return (
            <div key={cat.key} className="mb-1">
              <div className="px-2 py-2 text-xs font-bold text-foreground">
                {cat.label}
              </div>
              {items.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => { onSelect(ind.id); setSearch(""); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg hover:bg-primary/5 transition-colors text-left"
                >
                  <span>{ind.name}</span>
                  <span className="text-muted-foreground">›</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Param Customize Modal ──────────────────────────────────────────────────

function ParamModal({
  open,
  indicator,
  params,
  onApply,
  onClose,
}: {
  open: boolean;
  indicator: IndicatorDef;
  params: Record<string, number | string>;
  onApply: (p: Record<string, number | string>) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(params);

  useEffect(() => {
    if (open) setLocal(params);
  }, [open, params]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-background rounded-xl border border-border shadow-2xl w-[320px] p-5">
        <h3 className="font-semibold text-sm mb-4">
          Customize {indicator.name}
        </h3>
        <div className="space-y-3">
          {indicator.params.map((p) => (
            <div key={p.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                {p.label}
              </label>
              {p.type === "select" ? (
                <select
                  value={String(local[p.key] ?? p.defaultValue)}
                  onChange={(e) => setLocal({ ...local, [p.key]: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {p.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type="number"
                  value={local[p.key] ?? p.defaultValue}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setLocal({ ...local, [p.key]: raw === "" ? "" : Number(raw) });
                  }}
                  className="h-9 text-sm"
                  min={p.min}
                  max={p.max}
                  step={p.step ?? 1}
                />
              )}
            </div>
          ))}
        </div>
        <Button
          className="w-full mt-5"
          onClick={() => { onApply(local); onClose(); }}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

// ─── Simple Condition Form (vertical labeled layout) ────────────────────────

function SimpleConditionForm({
  condition,
  index,
  onChange,
  onDelete,
  canDelete,
  onIndicatorClick,
}: {
  condition: SimpleConditionRow;
  index: number;
  onChange: (patch: Partial<SimpleConditionRow>) => void;
  onDelete: () => void;
  canDelete: boolean;
  onIndicatorClick: (side: "left" | "right") => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [paramModal, setParamModal] = useState<"left" | "right" | null>(null);

  const leftInd = condition.leftIndicatorId ? getIndicator(condition.leftIndicatorId) : null;
  const rightInd = condition.rightIndicatorId ? getIndicator(condition.rightIndicatorId) : null;
  const opDef = condition.operator ? OPERATORS.find((o) => o.id === condition.operator) : undefined;
  const validOps = leftInd ? getOperatorsForType(leftInd.outputType) : [];
  const needsRight = opDef?.needsRight ?? false;
  const isRange = opDef?.rightType === "range";
  const showTimeMod = opDef?.timeModifier === "optional_within" || opDef?.timeModifier === "required_for";
  const forceTimeMod = opDef?.timeModifier === "required_for";

  function leftLabel() {
    if (!leftInd) return "";
    const numP = leftInd.params.filter((p) => p.type === "number");
    if (numP.length === 0) return leftInd.name;
    const vals = numP.map((p) => condition.leftParams[p.key] ?? p.defaultValue).join(",");
    return `${leftInd.name} (${vals})`;
  }

  function rightLabel() {
    if (!rightInd) return "";
    const numP = rightInd.params.filter((p) => p.type === "number");
    if (numP.length === 0) return rightInd.name;
    const vals = numP.map((p) => condition.rightParams[p.key] ?? p.defaultValue).join(",");
    return `${rightInd.name} (${vals})`;
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <span className="text-sm font-semibold text-foreground">
          Condition {index + 1}
        </span>
        <div className="flex items-center gap-1.5">
          {canDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete condition"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <svg
              className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")}
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Timeframe */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Timeframe</label>
            <select
              value={condition.timeframe}
              onChange={(e) => onChange({ timeframe: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SUPPORTED_TIMEFRAMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Indicator (left) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Indicator</label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onIndicatorClick("left")}
                className={cn(
                  "h-9 flex-1 flex items-center justify-between rounded-md border border-input px-2 text-sm text-left hover:bg-accent/50 transition-colors",
                  !condition.leftIndicatorId && "text-muted-foreground"
                )}
              >
                <span className="truncate">{condition.leftIndicatorId ? leftLabel() : "Select indicator..."}</span>
                <span className="text-muted-foreground ml-1">›</span>
              </button>
              {leftInd && leftInd.params.length > 0 && (
                <button
                  onClick={() => setParamModal("left")}
                  className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  title="Customize parameters"
                >
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="3" cy="4" r="1.5" /><line x1="5" y1="4" x2="15" y2="4" />
                    <circle cx="10" cy="8" r="1.5" /><line x1="1" y1="8" x2="8" y2="8" /><line x1="12" y1="8" x2="15" y2="8" />
                    <circle cx="6" cy="12" r="1.5" /><line x1="1" y1="12" x2="4" y2="12" /><line x1="8" y1="12" x2="15" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Condition (operator) */}
          {leftInd && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Condition</label>
              <select
                value={condition.operator}
                onChange={(e) => {
                  const opId = e.target.value as OperatorId;
                  const force = opId === "is_increasing" || opId === "is_decreasing";
                  onChange({ operator: opId || ("" as OperatorId), hasTimeModifier: force, timeModifierBars: force ? 3 : 5 });
                }}
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

          {/* Right operand */}
          {opDef && needsRight && !isRange && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Compare with</label>
                <span className="text-muted-foreground/40">·</span>
                <button
                  onClick={() =>
                    condition.rightType === "indicator"
                      ? onChange({ rightType: "value", rightIndicatorId: "", rightParams: {} })
                      : onChange({ rightType: "indicator", rightValue: "" })
                  }
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 8h14M8 3l5 5-5 5" />
                  </svg>
                  {condition.rightType === "indicator" ? "Use value instead" : "Use indicator instead"}
                </button>
              </div>

              {condition.rightType === "value" ? (
                <Input
                  type="number"
                  value={condition.rightValue}
                  onChange={(e) => onChange({ rightValue: e.target.value })}
                  placeholder="Enter value"
                  className="h-9 text-sm"
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Indicator 2</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onIndicatorClick("right")}
                        className={cn(
                          "h-9 flex-1 flex items-center justify-between rounded-md border border-input px-2 text-sm text-left hover:bg-accent/50 transition-colors",
                          !condition.rightIndicatorId && "text-muted-foreground"
                        )}
                      >
                        <span className="truncate">{condition.rightIndicatorId ? rightLabel() : "Select indicator..."}</span>
                        <span className="text-muted-foreground ml-1">›</span>
                      </button>
                      {rightInd && rightInd.params.length > 0 && (
                        <button
                          onClick={() => setParamModal("right")}
                          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                          title="Customize parameters"
                        >
                          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="3" cy="4" r="1.5" /><line x1="5" y1="4" x2="15" y2="4" />
                            <circle cx="10" cy="8" r="1.5" /><line x1="1" y1="8" x2="8" y2="8" /><line x1="12" y1="8" x2="15" y2="8" />
                            <circle cx="6" cy="12" r="1.5" /><line x1="1" y1="12" x2="4" y2="12" /><line x1="8" y1="12" x2="15" y2="12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Multiplier</label>
                    <Input
                      type="number"
                      value={condition.rightMultiplier}
                      onChange={(e) => {
                        const raw = e.target.value;
                        onChange({ rightMultiplier: raw === "" ? ("" as unknown as number) : Number(raw) });
                      }}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!v || isNaN(v)) onChange({ rightMultiplier: 1 });
                      }}
                      className="h-9 w-16 text-sm text-center"
                      step={0.1}
                      min={0.01}
                      title="Multiplier"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Range (is_between) */}
          {opDef && isRange && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Range</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={condition.rightValue}
                  onChange={(e) => onChange({ rightValue: e.target.value })}
                  placeholder="Min"
                  className="h-9 text-sm flex-1"
                />
                <span className="text-xs text-muted-foreground shrink-0">and</span>
                <Input
                  type="number"
                  value={condition.rightValue2}
                  onChange={(e) => onChange({ rightValue2: e.target.value })}
                  placeholder="Max"
                  className="h-9 text-sm flex-1"
                />
              </div>
            </div>
          )}

          {/* Time modifier */}
          {showTimeMod && (
            <div>
              {forceTimeMod ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">for</span>
                  <Input
                    type="number"
                    value={condition.timeModifierBars}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onChange({ timeModifierBars: raw === "" ? ("" as unknown as number) : Number(raw) });
                    }}
                    onBlur={(e) => { if (!Number(e.target.value)) onChange({ timeModifierBars: 3 }); }}
                    className="h-7 w-14 text-xs px-1.5"
                    min={1} max={200}
                  />
                  <span className="text-xs text-muted-foreground">consecutive bars</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="checkbox"
                    checked={condition.hasTimeModifier}
                    onChange={(e) => onChange({ hasTimeModifier: e.target.checked })}
                    className="rounded border-border accent-primary"
                  />
                  {condition.hasTimeModifier ? (
                    <>
                      <select
                        value={condition.timeModifierMode}
                        onChange={(e) => onChange({ timeModifierMode: e.target.value as SimpleConditionRow["timeModifierMode"] })}
                        className="h-7 rounded border border-input bg-transparent px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                          onChange({ timeModifierBars: raw === "" ? ("" as unknown as number) : Number(raw) });
                        }}
                        onBlur={(e) => { if (!Number(e.target.value)) onChange({ timeModifierBars: 5 }); }}
                        className="h-7 w-14 text-xs px-1.5"
                        min={1} max={200}
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
      )}

      {/* Param modals */}
      {leftInd && (
        <ParamModal
          open={paramModal === "left"}
          indicator={leftInd}
          params={condition.leftParams}
          onApply={(p) => onChange({ leftParams: p })}
          onClose={() => setParamModal(null)}
        />
      )}
      {rightInd && (
        <ParamModal
          open={paramModal === "right"}
          indicator={rightInd}
          params={condition.rightParams}
          onApply={(p) => onChange({ rightParams: p })}
          onClose={() => setParamModal(null)}
        />
      )}
    </div>
  );
}

// ─── Simple Builder View ────────────────────────────────────────────────────

function SimpleBuilderView({
  conditions,
  onChange,
  onOpenSidebar,
}: {
  conditions: SimpleConditionRow[];
  onChange: (c: SimpleConditionRow[]) => void;
  onOpenSidebar: (target: "new" | { id: string; side: "left" | "right" }) => void;
}) {
  function updateRow(id: string, patch: Partial<SimpleConditionRow>) {
    onChange(conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function deleteRow(id: string) {
    onChange(conditions.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scan in dropdown */}
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground block mb-1">Scan in</label>
        <select className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="nifty50">Nifty 50 Stocks</option>
        </select>
      </div>

      {/* Conditions list */}
      {conditions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Search size={20} className="text-primary/50" />
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Add conditions to scan for stocks matching your criteria
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-0 mb-4">
          {conditions.map((row, idx) => (
            <div key={row.id}>
              {idx > 0 && (
                <div className="flex items-center justify-center my-3">
                  <select
                    value={row.connector}
                    onChange={(e) =>
                      updateRow(row.id, { connector: e.target.value as "AND" | "OR" })
                    }
                    className="h-7 rounded-md border border-input bg-background px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
              )}

              <SimpleConditionForm
                condition={row}
                index={idx}
                onChange={(patch) => updateRow(row.id, patch)}
                onDelete={() => deleteRow(row.id)}
                canDelete={true}
                onIndicatorClick={(side) => onOpenSidebar({ id: row.id, side })}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function CustomScannerPage() {
  const [activeTab, setActiveTab] = useState<"standard" | "advanced" | "ai" | "settings">("standard");
  const uiMode = activeTab === "advanced" ? "classic" as const : "simple" as const;
  const [query, setQuery] = useState<QueryState>({
    name: "",
    universe: "nifty50",
    groups: [createGroup("AND", "1d")],
  });
  const [simpleConditions, setSimpleConditions] = useState<SimpleConditionRow[]>([]);
  const [results, setResults] = useState<ScanResultRow[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sortBy, setSortBy] = useState<"close" | "change1d" | "volume">("change1d");
  const [sortDesc, setSortDesc] = useState(true);

  // Data refresh state
  // Sidebar state (lifted to page level so it renders outside the scroll area)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTarget, setSidebarTarget] = useState<"new" | { id: string; side: "left" | "right" }>("new");

  function handleOpenSidebar(target: "new" | { id: string; side: "left" | "right" }) {
    setSidebarTarget(target);
    setSidebarOpen(true);
  }

  function handleSidebarSelect(indicatorId: string) {
    if (sidebarTarget === "new") {
      const ind = getIndicator(indicatorId);
      const isPattern = ind?.outputType === "pattern";
      const row = createSimpleCondition("AND");
      row.leftIndicatorId = indicatorId;
      row.leftParams = ind ? defaultParams(ind) : {};
      row.operator = isPattern ? "detected" : "greater_than";
      setSimpleConditions((prev) => [...prev, row]);
    } else {
      const { id, side } = sidebarTarget;
      setSimpleConditions((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          if (side === "left") {
            const ind = getIndicator(indicatorId);
            const isPattern = ind?.outputType === "pattern";
            return {
              ...c,
              leftIndicatorId: indicatorId,
              leftParams: ind ? defaultParams(ind) : {},
              operator: isPattern ? "detected" : "greater_than",
              rightType: "value" as const,
              rightValue: "",
              rightIndicatorId: "",
              rightParams: {},
              rightValue2: "",
              hasTimeModifier: false,
              timeModifierBars: 5,
            };
          }
          const ind = getIndicator(indicatorId);
          return {
            ...c,
            rightIndicatorId: indicatorId,
            rightParams: ind ? defaultParams(ind) : {},
          };
        })
      );
    }
    setSidebarOpen(false);
  }

  const sidebarExcludePatterns =
    sidebarTarget !== "new" && typeof sidebarTarget === "object" && sidebarTarget.side === "right";

  const [dynamicColumns, setDynamicColumns] = useState<IndicatorColumn[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<PipelineProgress | null>(null);
  const [freshness, setFreshness] = useState<{ daily: string | null; intraday15m: string | null }>({
    daily: null,
    intraday15m: null,
  });

  // Token state
  const [tokenStatus, setTokenStatus] = useState<{ isSet: boolean; lastUpdated: string | null; maskedToken: string | null }>({
    isSet: false, lastUpdated: null, maskedToken: null,
  });
  const [tokenInput, setTokenInput] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);

  // Load token + data freshness on mount
  useEffect(() => {
    loadTokenFromSupabase().catch(() => {});
    getTokenStatus().then(setTokenStatus).catch(() => {});
    getDataFreshness().then(setFreshness).catch(() => {});
  }, []);

  async function handleSaveToken() {
    if (!tokenInput.trim()) return;
    setTokenSaving(true);
    try {
      await saveTokenToSupabase(tokenInput.trim());
      setTokenInput("");
      const status = await getTokenStatus();
      setTokenStatus(status);
    } catch (e) {
      console.error("Failed to save token:", e);
    } finally {
      setTokenSaving(false);
    }
  }

  // Derive the effective query from whichever mode is active
  const effectiveQuery = uiMode === "simple"
    ? simpleToQuery(query.name, simpleConditions)
    : query;

  const handleRunScan = useCallback(async () => {
    const q = uiMode === "simple" ? simpleToQuery(query.name, simpleConditions) : query;
    setIsScanning(true);
    setHasRun(true);
    setResults([]);
    const cols = extractIndicatorColumns(q);
    setDynamicColumns(cols);
    setScanProgress({ phase: "loading_data", message: "Starting scan..." });
    try {
      const matches = await runCustomScan(q, setScanProgress);
      setResults(matches);
    } catch (err) {
      setScanProgress({ phase: "error", message: String(err) });
    } finally {
      setIsScanning(false);
    }
  }, [query, simpleConditions, uiMode]);

  function handleTabSwitch(tab: "standard" | "advanced" | "ai" | "settings") {
    if (tab === "ai") return;
    const prevMode = activeTab === "advanced" ? "classic" : "simple";
    const nextMode = tab === "advanced" ? "classic" : "simple";
    if (prevMode !== nextMode) {
      if (nextMode === "simple") {
        setSimpleConditions(queryToSimple(query));
      } else {
        const converted = simpleToQuery(query.name, simpleConditions);
        if (converted.groups.length === 0) {
          converted.groups = [createGroup("AND", "1d")];
        }
        setQuery(converted);
      }
    }
    setActiveTab(tab);
  }

  const handleRefreshData = useCallback(async (phase: "1d" | "15m" | "all") => {
    setIsRefreshing(true);
    setRefreshProgress(null);
    try {
      if (phase === "1d" || phase === "all") {
        await refreshDailyCandles(setRefreshProgress);
      }
      if (phase === "15m" || phase === "all") {
        await refresh15mCandles(setRefreshProgress);
      }
      const f = await getDataFreshness();
      setFreshness(f);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
      setRefreshProgress(null);
    }
  }, []);

  const sortedResults = [...results].sort((a, b) => {
    const mul = sortDesc ? -1 : 1;
    return mul * (a[sortBy] - b[sortBy]);
  });

  function addGroup(connector: "AND" | "OR") {
    setQuery((q) => ({ ...q, groups: [...q.groups, createGroup(connector, "1d")] }));
  }

  function updateGroup(groupId: string, updated: GroupState) {
    setQuery((q) => ({
      ...q,
      groups: q.groups.map((g) => (g.id === groupId ? updated : g)),
    }));
  }

  function deleteGroup(groupId: string) {
    setQuery((q) => ({
      ...q,
      groups: q.groups.filter((g) => g.id !== groupId),
    }));
  }

  function updateConnector(groupId: string, connector: "AND" | "OR") {
    setQuery((q) => ({
      ...q,
      groups: q.groups.map((g) => (g.id === groupId ? { ...g, connector } : g)),
    }));
  }

  const summary = generateSummary(effectiveQuery.groups);
  const conditionCount = effectiveQuery.groups.reduce(
    (sum, g) => sum + g.conditions.filter((c) => c.leftIndicatorId && c.operator).length,
    0
  );

  return (
    <div className="flex flex-row h-[calc(100vh-4rem)] min-h-[500px] relative">
      {/* ── Left: Query Builder ── */}
      <div className="w-[460px] shrink-0 flex flex-col border-r border-border bg-muted/10">
        {/* Tabs */}
        <div className="flex border-b border-border bg-background">
          {([
            { id: "standard" as const, label: "Standard" },
            { id: "advanced" as const, label: "Advanced" },
            { id: "ai" as const, label: "AI", badge: "Soon" },
            { id: "settings" as const, label: "Settings", icon: Settings },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 relative",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
                tab.id === "ai" && "cursor-default opacity-60"
              )}
            >
              {tab.icon && <tab.icon size={13} />}
              {tab.label}
              {tab.badge && (
                <span className="text-[8px] font-bold bg-primary/10 text-primary px-1 py-px rounded uppercase leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="px-4 pt-3 pb-2 space-y-2">
          <Input
            placeholder="Name your screener..."
            value={query.name}
            onChange={(e) =>
              setQuery((q) => ({ ...q, name: e.target.value }))
            }
            className="h-9 text-sm font-medium"
          />
        </div>

        {/* Builder area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "settings" ? (
            <div className="space-y-5">
              {/* Upstox Token */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Upstox Access Token</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Required for fetching candle data. Token expires daily — paste a fresh one here.
                </p>
                {tokenStatus.isSet && (
                  <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 mb-2">
                    <span className="text-xs font-mono text-muted-foreground">{tokenStatus.maskedToken}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {tokenStatus.lastUpdated ? `Updated ${timeAgo(tokenStatus.lastUpdated)}` : ""}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder={tokenStatus.isSet ? "Paste new token to update..." : "Paste your Upstox access token..."}
                    className="h-9 text-sm flex-1 font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveToken}
                    disabled={!tokenInput.trim() || tokenSaving}
                    className="h-9 px-4"
                  >
                    {tokenSaving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </Button>
                </div>
                {!tokenStatus.isSet && (
                  <p className="text-[10px] text-amber-600 mt-1.5">
                    No token set. Data refresh will fail until a valid token is saved.
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">Data Management</h3>
              <p className="text-xs text-muted-foreground">
                Refresh candle data from Upstox. Only new candles since the last refresh are fetched.
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshData("1d")}
                  disabled={isRefreshing}
                  className="w-full gap-2 justify-start"
                >
                  {isRefreshing && refreshProgress?.phase === "1d" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Refresh Daily (1D) Candles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshData("15m")}
                  disabled={isRefreshing}
                  className="w-full gap-2 justify-start"
                >
                  {isRefreshing && refreshProgress?.phase === "15m" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Refresh 15-Minute Candles
                </Button>
              </div>
              {isRefreshing && refreshProgress && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                  {refreshProgress.phase.toUpperCase()}: {refreshProgress.current}/{refreshProgress.total} stocks
                  {refreshProgress.newCandles != null && ` · ${refreshProgress.newCandles} new candles`}
                  {refreshProgress.errors > 0 && ` · ${refreshProgress.errors} errors`}
                  {refreshProgress.symbol && ` — ${refreshProgress.symbol}`}
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">Data Freshness</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Daily candles</span>
                    <span className="font-medium text-foreground">{freshness.daily ? timeAgo(freshness.daily) : "not loaded"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>15-min candles</span>
                    <span className="font-medium text-foreground">{freshness.intraday15m ? timeAgo(freshness.intraday15m) : "not loaded"}</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          ) : activeTab === "ai" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-primary/50" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">AI Scanner</h3>
              <p className="text-sm text-muted-foreground">
                Describe your strategy in plain English and let AI build the conditions for you. Coming soon.
              </p>
            </div>
          ) : uiMode === "simple" ? (
            <SimpleBuilderView
              conditions={simpleConditions}
              onChange={setSimpleConditions}
              onOpenSidebar={handleOpenSidebar}
            />
          ) : (
            <>
              {query.groups.map((group, idx) => (
                <div key={group.id}>
                  {idx > 0 && (
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <button
                        onClick={() =>
                          updateConnector(
                            group.id,
                            group.connector === "AND" ? "OR" : "AND"
                          )
                        }
                        className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-0.5 rounded-full uppercase tracking-wider transition-colors cursor-pointer select-none"
                        title="Click to toggle AND / OR"
                      >
                        {group.connector}
                      </button>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <GroupCard
                    group={group}
                    onChange={(g) => updateGroup(group.id, g)}
                    onDelete={() => deleteGroup(group.id)}
                    isOnly={query.groups.length === 1}
                  />
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  onClick={() => addGroup("AND")}
                  className="flex-1 py-2 text-xs font-medium text-primary rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  AND Group
                </button>
                <button
                  onClick={() => addGroup("OR")}
                  className="flex-1 py-2 text-xs font-medium text-primary rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  OR Group
                </button>
              </div>
            </>
          )}
        </div>

        {/* Summary + Actions */}
        <div className="border-t border-border">
          {summary && (
            <div className="px-4 py-3 bg-primary/5 text-xs text-foreground/80 italic border-b border-border leading-relaxed">
              {summary}
            </div>
          )}
          <div className="p-3">
            <div className="flex gap-2">
              {uiMode === "simple" && (
                <Button
                  onClick={() => handleOpenSidebar("new")}
                  className="flex-1 gap-1.5 h-11 text-sm"
                >
                  <Plus size={14} />
                  Add Condition
                </Button>
              )}
              <Button
                onClick={handleRunScan}
                disabled={conditionCount === 0 || isScanning}
                className={cn(
                  "flex-1 gap-1.5 h-11 text-sm",
                  conditionCount > 0 && !isScanning
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-muted text-muted-foreground border border-border hover:bg-muted"
                )}
              >
                {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {isScanning ? "Scanning..." : "Run scan"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Results header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Search size={16} />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {query.name || "Custom screener"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isScanning && scanProgress
                    ? scanProgress.message
                    : hasRun
                      ? `${results.length} match${results.length !== 1 ? "es" : ""} found`
                      : "Build conditions and run scan"}
                </p>
              </div>
            </div>
            {hasRun && !isScanning && (
              <span className="text-xs text-muted-foreground">
                {conditionCount} condition{conditionCount !== 1 ? "s" : ""} applied
              </span>
            )}
          </div>
        </div>

        {/* Results body */}
        {!hasRun ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-primary/60" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                Build your screener
              </h3>
              <p className="text-sm text-muted-foreground">
                Add conditions using technical indicators, price, volume,
                candlestick patterns, and more — then click <strong>Run scan</strong> to
                see matching stocks.
              </p>
              {!freshness.daily && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  No data loaded yet. Click <strong>Refresh 1D</strong> or <strong>Refresh 15m</strong> to
                  fetch candle data from Upstox into Supabase first.
                </div>
              )}
            </div>
          </div>
        ) : isScanning ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {scanProgress?.message ?? "Running scan..."}
              </p>
              {scanProgress?.total && scanProgress.total > 0 && (
                <div className="mt-3 w-48 mx-auto">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(((scanProgress.matched ?? 0) / scanProgress.total) * 100) || (scanProgress.phase === "done" ? 100 : 10)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : scanProgress?.phase === "error" ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <X size={20} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Scan failed</h3>
              <p className="text-sm text-muted-foreground">{scanProgress.message}</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xs">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Search size={20} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No matches</h3>
              <p className="text-sm text-muted-foreground">
                No stocks matched your conditions. Try adjusting the parameters or relaxing some constraints.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="text-sm border-collapse" style={{ minWidth: "100%" }}>
              <thead className="sticky top-0 bg-background border-b border-border z-10">
                <tr className="text-left text-muted-foreground whitespace-nowrap">
                  <th className="py-3 px-3 font-medium w-8 sticky left-0 bg-background z-20">#</th>
                  <th className="py-3 px-3 font-medium sticky left-8 bg-background z-20 min-w-[130px]">Symbol</th>
                  <th
                    className="py-3 px-3 font-medium cursor-pointer hover:text-foreground select-none"
                    onClick={() => {
                      if (sortBy === "close") setSortDesc(!sortDesc);
                      else { setSortBy("close"); setSortDesc(true); }
                    }}
                  >
                    Price {sortBy === "close" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  <th
                    className="py-3 px-3 font-medium cursor-pointer hover:text-foreground select-none"
                    onClick={() => {
                      if (sortBy === "change1d") setSortDesc(!sortDesc);
                      else { setSortBy("change1d"); setSortDesc(true); }
                    }}
                  >
                    1D Chg% {sortBy === "change1d" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  <th
                    className="py-3 px-3 font-medium cursor-pointer hover:text-foreground select-none"
                    onClick={() => {
                      if (sortBy === "volume") setSortDesc(!sortDesc);
                      else { setSortBy("volume"); setSortDesc(true); }
                    }}
                  >
                    Volume {sortBy === "volume" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  {dynamicColumns.map((col) => (
                    <th key={col.key} className="py-3 px-3 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        {col.label}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 font-medium">Groups</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((row, idx) => (
                  <tr
                    key={row.symbol}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors whitespace-nowrap"
                  >
                    <td className="py-2.5 px-3 text-muted-foreground text-xs sticky left-0 bg-background">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 sticky left-8 bg-background">
                      <div>
                        <span className="font-medium">{row.symbol}</span>
                        <div className="text-xs text-muted-foreground truncate max-w-[130px]">
                          {row.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium tabular-nums">
                      ₹{row.close.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 tabular-nums",
                          row.change1d >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {row.change1d >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(row.change1d).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                      {formatVolume(row.volume)}
                    </td>
                    {dynamicColumns.map((col) => {
                      const val = row.indicatorValues?.[col.key];
                      return (
                        <td key={col.key} className="py-2.5 px-3 tabular-nums text-foreground/80">
                          {val !== undefined && val !== null
                            ? Math.abs(val) >= 1000
                              ? val.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                              : Math.abs(val) >= 1
                                ? val.toFixed(2)
                                : val.toFixed(4)
                            : "—"}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3">
                      <span className="text-xs text-primary font-medium">
                        {row.matchedGroups}/{effectiveQuery.groups.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Indicator sidebar — rendered at page level, outside scroll areas */}
      {uiMode === "simple" && sidebarOpen && (
        <>
          <div className="absolute inset-0 z-30" onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 bottom-0 left-[460px] z-40 w-[340px] bg-background border-l border-r border-border shadow-xl">
            <IndicatorSidebar
              open={true}
              onSelect={handleSidebarSelect}
              onClose={() => setSidebarOpen(false)}
              excludePatterns={sidebarExcludePatterns}
            />
          </div>
        </>
      )}
    </div>
  );
}
