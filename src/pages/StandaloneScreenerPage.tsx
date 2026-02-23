import { CustomScannerPage } from "./CustomScannerPage";

export function StandaloneScreenerPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Upstox Custom Screener</h1>
          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
            Beta
          </span>
        </div>
      </header>

      {/* Scanner */}
      <CustomScannerPage />
    </div>
  );
}
