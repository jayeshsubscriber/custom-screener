import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Time intervals for technicals
const TIME_INTERVALS = [
  { value: "1m", label: "1 min" },
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "Daily" },
  { value: "1w", label: "Weekly" },
] as const;

const MARKET_CAP_OPTIONS = [
  { value: "micro", label: "Micro (<₹500 Cr)" },
  { value: "small", label: "Small (₹500 Cr – ₹5,000 Cr)" },
  { value: "mid", label: "Mid (₹5,000 Cr – ₹20,000 Cr)" },
  { value: "large", label: "Large (>₹20,000 Cr)" },
];

const SECTORS = [
  "Auto", "Banking", "IT", "Pharma", "FMCG", "Metals", "Oil & Gas",
  "Realty", "Consumer", "Capital Goods", "Power", "Telecom", "Chemicals",
  "Textiles", "Media", "Others",
];

// Mock scan results
const MOCK_SCAN_RESULTS = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2935, change1d: 1.45, vol: "42.5M", mktCap: "19.8L Cr", change1m: 3.2 },
  { symbol: "TCS", name: "Tata Consultancy", price: 3850, change1d: -0.82, vol: "18.2M", mktCap: "14.1L Cr", change1m: -2.1 },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1632, change1d: 1.15, vol: "28.4M", mktCap: "12.4L Cr", change1m: 1.8 },
  { symbol: "INFY", name: "Infosys", price: 1542, change1d: 1.85, vol: "22.1M", mktCap: "6.4L Cr", change1m: 4.5 },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1085, change1d: 1.12, vol: "35.2M", mktCap: "7.6L Cr", change1m: 5.2 },
  { symbol: "SBIN", name: "State Bank of India", price: 785, change1d: 2.35, vol: "48.9M", mktCap: "6.9L Cr", change1m: 8.1 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1585, change1d: 1.80, vol: "12.3M", mktCap: "8.7L Cr", change1m: 6.4 },
  { symbol: "ITC", name: "ITC Ltd", price: 485, change1d: -0.41, vol: "52.1M", mktCap: "6.0L Cr", change1m: -1.2 },
  { symbol: "LTIM", name: "LTIMindtree", price: 5645, change1d: 2.26, vol: "2.1M", mktCap: "1.6L Cr", change1m: 12.5 },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 12450, change1d: 1.51, vol: "4.8M", mktCap: "3.7L Cr", change1m: 2.9 },
];

// Static filter section — collapsed, non-clickable (header-only, content hidden)
function FilterSection({
  title,
  icon,
}: {
  title: string;
  icon: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <div className="w-full flex items-center justify-between py-3 px-2 cursor-default select-none">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-medium text-sm text-muted-foreground">{title}</span>
        </div>
        <span className="text-muted-foreground/50 text-xs">▶</span>
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground block">{label}</label>
      {children}
    </div>
  );
}

export function CustomScannerPage() {
  const [scannerName, setScannerName] = useState("");
  const [sortBy, setSortBy] = useState<"mktCap" | "change1d" | "vol">("mktCap");
  const [sortDesc, setSortDesc] = useState(true);

  return (
    <div className="flex flex-row h-[calc(100vh-8rem)] min-h-[500px]">
      {/* Left: Filters panel */}
      <div className="w-80 shrink-0 flex flex-col border-r border-border bg-muted/20">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Filters</h3>
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
            ⊞
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Scanner name</label>
            <Input
              placeholder="e.g. My scan"
              value={scannerName}
              onChange={(e) => setScannerName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Price */}
          <FilterSection title="Price" icon="💰">
            <FilterRow label="Price min (₹)"><Input type="number" placeholder="Min" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="Price max (₹)"><Input type="number" placeholder="Max" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="1D % change min"><Input type="number" placeholder="e.g. 2" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="1D % change max"><Input type="number" placeholder="e.g. 10" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="52W high distance %"><Input type="number" placeholder="Optional" className="h-8 text-sm" /></FilterRow>
          </FilterSection>

          {/* Technicals */}
          <FilterSection title="Technicals" icon="📈">
            <FilterRow label="Time interval">
              <select className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                {TIME_INTERVALS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FilterRow>
            <FilterRow label="EMA 1"><Input type="number" placeholder="9" defaultValue={9} className="h-8 text-sm" /></FilterRow>
            <FilterRow label="EMA 2"><Input type="number" placeholder="21" defaultValue={21} className="h-8 text-sm" /></FilterRow>
            <FilterRow label="EMA condition">
              <select className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                <option>Price above EMA 1</option>
                <option>Price below EMA 1</option>
                <option>Golden cross</option>
                <option>Death cross</option>
              </select>
            </FilterRow>
            <FilterRow label="RSI period"><Input type="number" placeholder="14" defaultValue={14} className="h-8 text-sm" /></FilterRow>
            <FilterRow label="RSI">
              <select className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                <option value="">Any</option>
                <option>Overbought (&gt;70)</option>
                <option>Oversold (&lt;30)</option>
              </select>
            </FilterRow>
            <FilterRow label="MACD condition">
              <select className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                <option value="">Any</option>
                <option>Bullish crossover</option>
                <option>Bearish crossover</option>
              </select>
            </FilterRow>
          </FilterSection>

          {/* Volume */}
          <FilterSection title="Volume" icon="📊">
            <FilterRow label="Vol vs avg (min)"><Input type="number" placeholder="e.g. 1.5" step="0.1" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="Delivery % min"><Input type="number" placeholder="e.g. 50" className="h-8 text-sm" /></FilterRow>
          </FilterSection>

          {/* Market cap */}
          <FilterSection title="Market cap" icon="🏢">
            <div className="space-y-2">
              {MARKET_CAP_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" value={opt.value} className="rounded border-border" />
                  {opt.label}
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Sector */}
          <FilterSection title="Sector" icon="🏭">
            <div className="flex gap-1 mb-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="sector_mode" defaultChecked /> Include</label>
              <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="sector_mode" /> Exclude</label>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {SECTORS.map((s) => (
                <label key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border cursor-pointer hover:bg-accent/50 text-xs">
                  <input type="checkbox" value={s} className="rounded" /> {s}
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Fundamentals */}
          <FilterSection title="Fundamentals" icon="📋">
            <FilterRow label="PE min"><Input type="number" placeholder="Optional" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="PE max"><Input type="number" placeholder="e.g. 25" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="ROE % min"><Input type="number" placeholder="e.g. 15" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="Debt/Equity max"><Input type="number" placeholder="Optional" step="0.1" className="h-8 text-sm" /></FilterRow>
          </FilterSection>

          {/* Financial ratios */}
          <FilterSection title="Financial ratios" icon="📐">
            <FilterRow label="Current ratio min"><Input type="number" placeholder="Optional" step="0.1" className="h-8 text-sm" /></FilterRow>
            <FilterRow label="Quick ratio min"><Input type="number" placeholder="Optional" step="0.1" className="h-8 text-sm" /></FilterRow>
          </FilterSection>

          {/* Shareholding */}
          <FilterSection title="Shareholding changes" icon="👥">
            <FilterRow label="FII change (QoQ %)">
              <div className="flex gap-1">
                <select className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-xs">
                  <option>Min</option>
                  <option>Max</option>
                </select>
                <Input type="number" placeholder="%" className="h-8 text-sm flex-1" />
              </div>
            </FilterRow>
            <FilterRow label="DII / Promoter (QoQ %)">
              <Input type="number" placeholder="Optional" className="h-8 text-sm" />
            </FilterRow>
          </FilterSection>
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <button
            type="button"
            className="flex-1 py-2 text-sm rounded-lg border border-border bg-background hover:bg-accent"
          >
            Clear all
          </button>
          <button
            type="button"
            className="flex-1 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Run scan
          </button>
        </div>
      </div>

      {/* Right: Scanned results */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-border">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {scannerName || "Custom screener"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {MOCK_SCAN_RESULTS.length}+ items • Updated 2 min ago
                </p>
              </div>
            </div>
            <button type="button" className="text-xs text-primary hover:underline">
              Disclosure
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b border-border z-10">
              <tr className="text-left text-muted-foreground">
                <th className="py-3 px-4 font-medium">Symbol</th>
                <th className="py-3 px-4 font-medium w-24">1D Chart</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => { setSortBy("change1d"); setSortDesc(!sortDesc); }}
                >
                  1D % Chg {sortBy === "change1d" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th className="py-3 px-4 font-medium">Vol.</th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => { setSortBy("mktCap"); setSortDesc(!sortDesc); }}
                >
                  Mkt. Cap {sortBy === "mktCap" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th className="py-3 px-4 font-medium">1M % Chg</th>
                <th className="py-3 px-4 font-medium w-12">Watch</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SCAN_RESULTS.map((row) => (
                <tr
                  key={row.symbol}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div>
                      <span className="font-medium">{row.symbol}</span>
                      <div className="text-xs text-muted-foreground truncate max-w-[140px]">{row.name}</div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="w-20 h-8 flex items-center">
                      <svg viewBox="0 0 80 32" className="w-full h-6 text-muted-foreground">
                        <polyline
                          fill="none"
                          stroke={row.change1d >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                          strokeWidth="1.5"
                          points="0,24 20,20 40,18 60,12 80,8"
                        />
                      </svg>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-medium">
                    ₹{row.price.toLocaleString("en-IN")}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={cn(
                      "inline-flex items-center gap-0.5",
                      row.change1d >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {row.change1d >= 0 ? "▲" : "▼"} {row.change1d.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{row.vol}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{row.mktCap}</td>
                  <td className="py-2.5 px-4">
                    <span className={cn(
                      row.change1m >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {row.change1m >= 0 ? "▲" : "▼"} {Math.abs(row.change1m).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button type="button" className="text-muted-foreground hover:text-primary text-lg leading-none">
                      +
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
