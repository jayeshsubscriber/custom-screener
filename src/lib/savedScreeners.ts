/**
 * Persist and load saved screener configurations (name, universe, conditions).
 */
import { supabase } from "@/lib/supabase";
import type { QueryState } from "@/types/screener";

export interface SavedScreener {
  id: string;
  name: string;
  universe: string;
  description: string;
  query: QueryState;
  created_at: string;
  updated_at: string;
}

export async function listSavedScreeners(): Promise<SavedScreener[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("saved_screeners")
    .select("id, name, universe, description, query, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("List saved screeners:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    universe: r.universe as string,
    description: (r.description as string) ?? "",
    query: r.query as QueryState,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

export async function getSavedScreener(id: string): Promise<SavedScreener | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("saved_screeners")
    .select("id, name, universe, description, query, created_at, updated_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    universe: data.universe as string,
    description: (data.description as string) ?? "",
    query: data.query as QueryState,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

/** Create a new saved screener. Returns the created id or null on failure. */
export async function createSavedScreener(q: QueryState): Promise<string | null> {
  if (!supabase) return null;
  const payload = {
    name: q.name.trim() || "Unnamed screener",
    universe: q.universe,
    description: (q.description ?? "").trim(),
    query: { name: q.name, universe: q.universe, groups: q.groups, description: q.description },
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("saved_screeners")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.warn("Create saved screener:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Update an existing saved screener. */
export async function updateSavedScreener(
  id: string,
  q: QueryState
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("saved_screeners")
    .update({
      name: q.name.trim() || "Unnamed screener",
      universe: q.universe,
      description: (q.description ?? "").trim(),
      query: { name: q.name, universe: q.universe, groups: q.groups, description: q.description },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.warn("Update saved screener:", error.message);
    return false;
  }
  return true;
}

/** Delete a saved screener. */
export async function deleteSavedScreener(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("saved_screeners").delete().eq("id", id);
  if (error) {
    console.warn("Delete saved screener:", error.message);
    return false;
  }
  return true;
}
