/**
 * Persist last scan results per saved screener in localStorage
 * so the user can view last scanned results without re-running the scan.
 */
import type { ScanResultRow } from "@/types/screener";

const STORAGE_KEY_PREFIX = "screener_last_results_";

export interface CachedScanResult {
  results: ScanResultRow[];
  scannedAt: string; // ISO
}

export function getCachedScanResult(screenerId: string): CachedScanResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + screenerId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedScanResult;
    if (!Array.isArray(parsed?.results) || typeof parsed?.scannedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedScanResult(screenerId: string, results: ScanResultRow[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedScanResult = {
      results,
      scannedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + screenerId, JSON.stringify(payload));
  } catch {
    // ignore quota or parse errors
  }
}

export function clearCachedScanResult(screenerId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + screenerId);
  } catch {}
}
