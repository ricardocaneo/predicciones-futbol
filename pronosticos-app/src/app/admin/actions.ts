"use server";

import {
  importMatchFromLiveScoreApi,
  syncMatch,
  syncLiveScoreForMatch,
  syncAllActive,
  processFinishedMatch,
  listImportedMatches,
  listAvailableFromApi,
} from "@/lib/match-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export type { ImportResult, SyncResult, ProcessResult, LiveSyncResult } from "@/lib/match-sync";

// ─── Fetch from livescore-api ─────────────────────────────────────────────────

export async function actionListApiMatches(
  source: "live" | "today" | "recent",
  options?: { date?: string; fromDate?: string; toDate?: string },
) {
  try {
    const matches = await listAvailableFromApi(source, options);
    return { success: true as const, matches };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function actionImportMatch(externalMatchId: string) {
  try {
    const result = await importMatchFromLiveScoreApi(externalMatchId);
    return result;
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function actionSyncMatch(matchId: string) {
  try {
    const result = await syncMatch(matchId);
    return result;
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Sync live (with next_sync_at cooldown + events) ─────────────────────────

export async function actionSyncLiveMatch(matchId: string) {
  try {
    const result = await syncLiveScoreForMatch(matchId);
    return result;
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Process points ───────────────────────────────────────────────────────────

export async function actionProcessMatch(matchId: string) {
  try {
    const result = await processFinishedMatch(matchId);
    return result;
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Sync all active ─────────────────────────────────────────────────────────

export async function actionSyncAll() {
  try {
    const result = await syncAllActive();
    return { success: true as const, ...result };
  } catch (err) {
    return { success: false as const, error: String(err), synced: 0, errors: [] as string[] };
  }
}

// ─── List imported ────────────────────────────────────────────────────────────

export async function actionListImportedMatches() {
  try {
    const matches = await listImportedMatches();
    return { success: true as const, matches };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Delete match ─────────────────────────────────────────────────────────────

export async function actionCountMatchPredictions(matchId: string) {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("match_id", matchId);
    return { success: true as const, count: count ?? 0 };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  total_points: number;
  is_active: boolean;
  prediction_count: number;
  created_at: string;
};

export async function actionListUsers(): Promise<{ success: true; users: AdminUser[] } | { success: false; error: string }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) throw new Error(error.message);

    const users: AdminUser[] = (data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      display_name: p.display_name as string | null,
      email: p.email as string | null,
      avatar_url: p.avatar_url as string | null,
      total_points: (p.total_points as number) ?? 0,
      is_active: (p.is_active as boolean) ?? true,
      prediction_count: Number(p.prediction_count ?? 0),
      created_at: p.created_at as string,
    }));
    return { success: true, users };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function actionSetUserActive(userId: string, active: boolean) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("admin_set_user_active", { p_user_id: userId, p_active: active });
    if (error) throw new Error(error.message);
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

export async function actionDeleteUser(userId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("admin_delete_user", { p_user_id: userId });
    if (error) throw new Error(error.message);
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function actionDeleteMatch(matchId: string) {
  try {
    const supabase = createAdminClient();

    // Eliminar pronósticos, partido y recalcular total_points en una sola transacción
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_delete_match", { p_match_id: matchId });
    if (rpcError) throw new Error(`Error eliminando: ${rpcError.message}`);
    const deletedCount = (rpcData as number) ?? 0;

    return { success: true as const, deletedPredictions: deletedCount };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}
