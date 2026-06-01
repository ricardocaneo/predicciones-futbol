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

export async function actionDeleteMatch(matchId: string) {
  try {
    const supabase = createAdminClient();

    // Usuarios afectados para recalcular sus puntos después
    const { data: affectedPreds } = await supabase
      .from("predictions")
      .select("user_id")
      .eq("match_id", matchId);

    const affectedUserIds = [...new Set((affectedPreds ?? []).map((p) => p.user_id as string))];
    const deletedCount = affectedPreds?.length ?? 0;

    // Eliminar pronósticos y luego el partido
    await supabase.from("predictions").delete().eq("match_id", matchId);
    await supabase.from("matches").delete().eq("id", matchId);

    // Recalcular total_points de usuarios afectados
    for (const userId of affectedUserIds) {
      const { data: userPreds } = await supabase
        .from("predictions")
        .select("points")
        .eq("user_id", userId);
      const total = (userPreds ?? []).reduce(
        (sum: number, p: { points: number | null }) => sum + (p.points ?? 0),
        0,
      );
      await supabase.from("profiles").update({ total_points: total }).eq("id", userId);
    }

    return { success: true as const, deletedPredictions: deletedCount };
  } catch (err) {
    return { success: false as const, error: String(err) };
  }
}
