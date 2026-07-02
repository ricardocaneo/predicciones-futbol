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

// ─── Sync health ──────────────────────────────────────────────────────────────

// ─── Force recalculate match points ──────────────────────────────────────────

export async function actionForceRecalculateMatch(matchId: string) {
  try {
    const supabase = createAdminClient();

    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("home_score, away_score, winner_team_id, pen_score, time, status")
      .eq("id", matchId)
      .single();
    if (matchErr || !match) throw new Error(matchErr?.message ?? "Partido no encontrado");
    if (match.status !== "finished") throw new Error("El partido no está finalizado");

    // Reset all predictions for this match
    const { error: resetErr } = await supabase
      .from("predictions")
      .update({ points: 0, points_breakdown: null })
      .eq("match_id", matchId);
    if (resetErr) throw new Error(resetErr.message);

    // Recalculate atomically
    const { data: rpc, error: rpcErr } = await supabase.rpc("edge_finish_match_and_calculate", {
      p_match_id:       matchId,
      p_home_score:     match.home_score,
      p_away_score:     match.away_score,
      p_winner_team_id: match.winner_team_id,
      p_pen_score:      match.pen_score,
      p_time:           match.time,
      p_last_synced_at: new Date().toISOString(),
    });
    if (rpcErr) throw new Error(rpcErr.message);

    const r = rpc as { predsCalculated: number; usersUpdated: number };
    return { success: true as const, predsCalculated: r.predsCalculated ?? 0, usersUpdated: r.usersUpdated ?? 0 };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

// ─── Sync health ──────────────────────────────────────────────────────────────

export async function actionGetSyncHealth() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("admin_get_sync_health");
    if (error) throw new Error(error.message);
    const r = data as {
      cron_responses: { created: string; status_code: number; content: string }[];
      orphaned_matches: {
        match_id: string; home_team: string; away_team: string;
        home_score: number | null; away_score: number | null;
        pen_score: string | null; phase: string;
        winner_team_id: string | null; time: string | null;
        orphaned_count: number;
      }[];
    };
    return { success: true as const, cronResponses: r.cron_responses ?? [], orphanedMatches: r.orphaned_matches ?? [] };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}

export async function actionRepairOrphanedPredictions() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("admin_repair_orphaned_predictions");
    if (error) throw new Error(error.message);
    const r = data as { matchesFixed: number; predsCalculated: number };
    return { success: true as const, matchesFixed: r.matchesFixed ?? 0, predsCalculated: r.predsCalculated ?? 0 };
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
