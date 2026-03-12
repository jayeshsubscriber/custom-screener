/**
 * Manages the Upstox access token: persisted in Supabase, cached in memory.
 * Token is write-only in the UI (masked after saving).
 */
import { supabase } from "@/lib/supabase";
import { setUpstoxToken } from "@/lib/upstox";

const TOKEN_KEY = "upstox_access_token";
const TOKEN_UPDATED_KEY = "upstox_token_updated_at";

export async function loadTokenFromSupabase(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("stock_candles_meta")
    .select("key, value")
    .in("key", [TOKEN_KEY, TOKEN_UPDATED_KEY]);

  const map = new Map((data ?? []).map((r) => [r.key, r.value as string]));
  const token = map.get(TOKEN_KEY);
  if (token?.trim()) {
    setUpstoxToken(token);
    return true;
  }
  return false;
}

export async function saveTokenToSupabase(token: string): Promise<void> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and restart the app."
    );
  }
  setUpstoxToken(token);
  const { error: err1 } = await supabase.from("stock_candles_meta").upsert(
    { key: TOKEN_KEY, value: token.trim() },
    { onConflict: "key" }
  );
  if (err1) throw new Error(`Failed to save token: ${err1.message}`);
  const { error: err2 } = await supabase.from("stock_candles_meta").upsert(
    { key: TOKEN_UPDATED_KEY, value: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (err2) throw new Error(`Failed to save token timestamp: ${err2.message}`);
}

export async function getTokenStatus(): Promise<{
  isSet: boolean;
  lastUpdated: string | null;
  maskedToken: string | null;
}> {
  if (!supabase) return { isSet: false, lastUpdated: null, maskedToken: null };
  const { data } = await supabase
    .from("stock_candles_meta")
    .select("key, value")
    .in("key", [TOKEN_KEY, TOKEN_UPDATED_KEY]);

  const map = new Map((data ?? []).map((r) => [r.key, r.value as string]));
  const token = map.get(TOKEN_KEY) ?? "";
  const updated = map.get(TOKEN_UPDATED_KEY) ?? null;

  return {
    isSet: !!token.trim(),
    lastUpdated: updated,
    maskedToken: token.trim()
      ? "••••••••" + token.trim().slice(-6)
      : null,
  };
}
