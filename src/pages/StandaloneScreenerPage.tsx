import { useState } from "react";
import { CustomScannerPage } from "./CustomScannerPage";
import { BacktestPage } from "./BacktestPage";
import { cn } from "@/lib/utils";
import { BarChart3, Search } from "lucide-react";

type TopTab = "scanners" | "backtest";

export function StandaloneScreenerPage() {
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("scanners");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Upstox Custom Screener</h1>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {([
              { id: "scanners" as const, label: "Scanners", icon: Search },
              { id: "backtest" as const, label: "Backtest", icon: BarChart3 },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTopTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTopTab === tab.id
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeTopTab === "scanners" ? <CustomScannerPage /> : <BacktestPage />}
    </div>
  );
}
