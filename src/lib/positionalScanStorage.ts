import { supabase } from "@/lib/supabase";
import type { AnyScanResult } from "@/lib/positionalScanRunner";

const META_KEY_FULL_SCAN = "full_scan_last_run";
const PENDING_SUFFIX = "_pending";

export async function getScanResults(scannerId: string): Promise<{
  results: AnyScanResult[];
  updated_at: string;
} | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("positional_scan_results")
    .select("results, updated_at")
    .eq("scanner_id", scannerId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    results: (data.results as AnyScanResult[]) ?? [],
    updated_at: data.updated_at as string,
  };
}

export async function saveScanResults(
  scannerId: string,
  results: AnyScanResult[]
): Promise<void> {
  if (!supabase) return;
  await supabase.from("positional_scan_results").upsert(
    {
      scanner_id: scannerId,
      results: results as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "scanner_id" }
  );
}

/** Save matches in real-time to a pending row (does not touch the main row). */
export async function savePendingScanResults(
  scannerId: string,
  results: AnyScanResult[]
): Promise<void> {
  if (!supabase) return;
  await supabase.from("positional_scan_results").upsert(
    {
      scanner_id: scannerId + PENDING_SUFFIX,
      results: results as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "scanner_id" }
  );
}

/** Promote pending results to the main row and delete the pending row. */
export async function finalizePendingScanResults(
  scannerId: string,
  finalResults: AnyScanResult[]
): Promise<void> {
  if (!supabase) return;
  await saveScanResults(scannerId, finalResults);
  await supabase
    .from("positional_scan_results")
    .delete()
    .eq("scanner_id", scannerId + PENDING_SUFFIX);
}

/** Clean up a pending row if scan is aborted without finishing. */
export async function deletePendingScanResults(
  scannerId: string
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("positional_scan_results")
    .delete()
    .eq("scanner_id", scannerId + PENDING_SUFFIX);
}

/** Fetch summary (count + top 3 symbols) for all non-pending scanners in one query. */
export async function getAllScannerSummaries(): Promise<
  Record<string, { count: number; topSymbols: string[] }>
> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("positional_scan_results")
    .select("scanner_id, results")
    .not("scanner_id", "like", "%_pending");
  if (error || !data) return {};
  const map: Record<string, { count: number; topSymbols: string[] }> = {};
  for (const row of data) {
    const results = (row.results as AnyScanResult[]) ?? [];
    map[row.scanner_id as string] = {
      count: results.length,
      topSymbols: results.slice(0, 3).map((r) => r.symbol),
    };
  }
  return map;
}

export async function getFullScanLastRun(): Promise<Date | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("positional_scan_meta")
    .select("value")
    .eq("key", META_KEY_FULL_SCAN)
    .maybeSingle();
  if (error || !data?.value) return null;
  const d = new Date(data.value as string);
  return isNaN(d.getTime()) ? null : d;
}

export async function setFullScanLastRun(): Promise<void> {
  if (!supabase) return;
  await supabase.from("positional_scan_meta").upsert(
    {
      key: META_KEY_FULL_SCAN,
      value: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}
