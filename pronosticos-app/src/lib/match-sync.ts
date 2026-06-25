/**
 * Funciones server-side para importar, sincronizar y procesar partidos.
 * Usa el cliente admin (service role) para bypasar RLS.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  findMatchByExternalId,
  getLiveMatchData,
  normalizeLiveScoreApiMatch,
  getLiveMatches,
  getFixturesByDate,
  getRecentResults,
  mapStatus,
  parseScore,
  parseMinute,
  isMatchTime,
  type LsMatch,
} from "@/lib/livescore";

// ─── Scoring (espejo del edge function) ──────────────────────────────────────

type TournamentPhase =
  | "group" | "round_of_32" | "round_of_16"
  | "quarter_final" | "semi_final" | "third_place" | "final";

const SCORING_MATRIX: Record<TournamentPhase, {
  exact: number; goalDiff: number; tendency: number; consolation: number; liveExact: number;
}> = {
  group:         { exact: 5,  goalDiff: 3,  tendency: 2, consolation: 1, liveExact: 2 },
  round_of_32:   { exact: 8,  goalDiff: 5,  tendency: 3, consolation: 2, liveExact: 3 },
  round_of_16:   { exact: 8,  goalDiff: 5,  tendency: 3, consolation: 2, liveExact: 3 },
  quarter_final: { exact: 12, goalDiff: 8,  tendency: 5, consolation: 3, liveExact: 4 },
  semi_final:    { exact: 15, goalDiff: 10, tendency: 6, consolation: 4, liveExact: 5 },
  third_place:   { exact: 15, goalDiff: 10, tendency: 6, consolation: 4, liveExact: 5 },
  final:         { exact: 18, goalDiff: 12, tendency: 7, consolation: 4, liveExact: 6 },
};

const ADVANCEMENT_BONUS: Partial<Record<TournamentPhase, number>> = {
  round_of_32: 2, round_of_16: 2,
  quarter_final: 4, semi_final: 4, third_place: 4, final: 4,
};

interface PredRow {
  id: string;
  user_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  prediction_mode: string;
}

function calcPoints(phase: string, homeScore: number, awayScore: number, pred: PredRow) {
  const matrix = SCORING_MATRIX[phase as TournamentPhase] ?? SCORING_MATRIX.group;
  const isLive = pred.prediction_mode === "live";
  const ph = pred.predicted_home_score;
  const pa = pred.predicted_away_score;

  if (isLive) {
    const exact = ph === homeScore && pa === awayScore;
    const pts = exact ? matrix.liveExact : 0;
    return { points: pts, breakdown: { category: exact ? "live" : "none", base: pts, advancement_bonus: 0, total: pts } };
  }

  const isExact         = ph === homeScore && pa === awayScore;
  const actualDiff      = homeScore - awayScore;
  const predDiff        = ph - pa;
  const tendency        = Math.sign(actualDiff) === Math.sign(predDiff);
  const isGoalDiff      = !isExact && tendency && actualDiff === predDiff;
  const isConsolation   = !isExact && !isGoalDiff && !tendency &&
                          (ph === homeScore || pa === awayScore);
  const isKnockout      = phase !== "group";

  let base = 0; let category = "none";
  if      (isExact)                              { base = matrix.exact;       category = "exact";      }
  else if (isGoalDiff)                           { base = matrix.goalDiff;    category = "goalDiff";   }
  else if (tendency)                             { base = matrix.tendency;    category = "tendency";   }
  else if (isConsolation && matrix.consolation)  { base = matrix.consolation; category = "consolation";}

  const advBonus = isKnockout && tendency ? (ADVANCEMENT_BONUS[phase as TournamentPhase] ?? 0) : 0;
  const total    = base + advBonus;
  return { points: total, breakdown: { category, base, advancement_bonus: advBonus, total } };
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  matchId?: string;
  isNew?: boolean;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  score?: string;
  minute?: number | null;
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  predictionsProcessed?: number;
  usersUpdated?: number;
  error?: string;
}

// ─── importMatchFromLiveScoreApi ─────────────────────────────────────────────

/**
 * Busca el partido en livescore-api y lo importa (upsert) en la tabla matches.
 * Usa phase='group' y group_name='TEST' para distinguirlo visualmente.
 * Es idempotente: si ya existe, actualiza los campos.
 */
export async function importMatchFromLiveScoreApi(externalMatchId: string): Promise<ImportResult> {
  const api = await findMatchByExternalId(externalMatchId);
  if (!api) return { success: false, error: "Partido no encontrado en livescore-api" };

  const supabase  = createAdminClient();
  const status    = mapStatus(api.status);
  const score     = parseScore(api.score ?? api.ft_score ?? null);
  const minute    = !isMatchTime(api.time) ? parseMinute(api.time) : null;

  // Construir starts_at en UTC. La API devuelve time en formato HH:MM o HH:MM:SS.
  // Tomamos solo HH:MM y agregamos Z para forzar UTC (evitar conversión local del servidor).
  let startsAt: string;
  if (api.date && isMatchTime(api.time)) {
    const hhmm = api.time.slice(0, 5);
    startsAt = new Date(`${api.date}T${hhmm}:00Z`).toISOString();
  } else if (api.date) {
    startsAt = new Date(`${api.date}T12:00:00Z`).toISOString();
  } else {
    startsAt = new Date().toISOString();
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("external_api_id", externalMatchId)
    .maybeSingle();

  const payload = {
    external_api_id: externalMatchId,
    phase:           "group" as const,
    group_name:      "TEST",
    home_team:       api.home_name,
    away_team:       api.away_name,
    starts_at:       startsAt,
    status,
    home_score:      score?.home ?? null,
    away_score:      score?.away ?? null,
    minute:          status === "live" ? minute : null,
  };

  const { data, error } = await supabase
    .from("matches")
    .upsert(payload, { onConflict: "external_api_id" })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, matchId: data.id, isNew: !existing };
}

// ─── syncMatch ────────────────────────────────────────────────────────────────

/**
 * Sincroniza el estado de un partido con livescore-api.
 * Solo actúa sobre partidos que tienen external_api_id.
 * Idempotente.
 */
export async function syncMatch(matchId: string): Promise<SyncResult> {
  const supabase = createAdminClient();

  const { data: match, error: fetchErr } = await supabase
    .from("matches")
    .select("id, external_api_id, status, home_score, away_score, minute")
    .eq("id", matchId)
    .single();

  if (fetchErr || !match) return { success: false, error: "Partido no encontrado en DB" };
  if (!match.external_api_id) return { success: false, error: "El partido no tiene external_api_id" };

  const api = await findMatchByExternalId(match.external_api_id);
  if (!api) return { success: false, error: "Partido no encontrado en livescore-api en este momento" };

  const newStatus = mapStatus(api.status);
  const score     = parseScore(api.score ?? api.ft_score ?? null);
  const minute    = !isMatchTime(api.time) ? parseMinute(api.time) : null;

  const update = {
    status:     newStatus,
    home_score: score?.home ?? match.home_score,
    away_score: score?.away ?? match.away_score,
    minute:     newStatus === "finished" ? null : minute,
  };

  const { error: updateErr } = await supabase
    .from("matches")
    .update(update)
    .eq("id", matchId);

  if (updateErr) return { success: false, error: updateErr.message };

  return {
    success:        true,
    previousStatus: match.status,
    newStatus,
    score:          score ? `${score.home}-${score.away}` : (match.home_score != null ? `${match.home_score}-${match.away_score}` : "—"),
    minute:         newStatus === "live" ? minute : null,
  };
}

// ─── syncAllActive ────────────────────────────────────────────────────────────

/**
 * Sincroniza todos los partidos de la DB que tienen external_api_id
 * y están en estado live o scheduled (ventana de ±4h).
 * Pensado para ser llamado manualmente desde el admin; no activa el cron.
 */
export async function syncAllActive(): Promise<{ synced: number; errors: string[] }> {
  const supabase = createAdminClient();

  const windowStart = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() +  4 * 60 * 60 * 1000).toISOString();

  const { data: scheduled } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "scheduled")
    .not("external_api_id", "is", null)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd);

  const { data: live } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "live")
    .not("external_api_id", "is", null);

  const ids = [...new Set([...(scheduled ?? []), ...(live ?? [])].map((m) => m.id))];

  let synced = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const result = await syncMatch(id);
    if (result.success) synced++;
    else errors.push(`${id}: ${result.error}`);
  }

  return { synced, errors };
}

// ─── processFinishedMatch ─────────────────────────────────────────────────────

/**
 * Calcula y guarda los puntos de todas las predicciones de un partido finished.
 * Recalcula total_points en profiles para cada usuario afectado.
 * Idempotente: sobreescribe points existentes con el valor correcto.
 */
export async function processFinishedMatch(matchId: string): Promise<ProcessResult> {
  const supabase = createAdminClient();

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id, phase, status, home_score, away_score")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) return { success: false, error: "Partido no encontrado" };
  if (match.status !== "finished") return { success: false, error: `El partido está ${match.status}, debe estar finished` };
  if (match.home_score === null || match.away_score === null) return { success: false, error: "El partido no tiene marcador registrado" };

  const { data: predictions, error: predErr } = await supabase
    .from("predictions")
    .select("id, user_id, predicted_home_score, predicted_away_score, prediction_mode")
    .eq("match_id", matchId);

  if (predErr) return { success: false, error: predErr.message };
  if (!predictions?.length) return { success: true, predictionsProcessed: 0, usersUpdated: 0 };

  const affectedUsers = new Set<string>();

  for (const pred of predictions as PredRow[]) {
    const result = calcPoints(match.phase, match.home_score, match.away_score, pred);
    await supabase
      .from("predictions")
      .update({ points: result.points, points_breakdown: result.breakdown })
      .eq("id", pred.id);
    affectedUsers.add(pred.user_id);
  }

  // Recalcular total_points en profiles para cada usuario afectado
  for (const userId of affectedUsers) {
    const { data: userPreds } = await supabase
      .from("predictions")
      .select("points")
      .eq("user_id", userId);

    const total = (userPreds ?? []).reduce((sum, p) => sum + (p.points ?? 0), 0);
    await supabase.from("profiles").update({ total_points: total }).eq("id", userId);
  }

  return {
    success:              true,
    predictionsProcessed: predictions.length,
    usersUpdated:         affectedUsers.size,
  };
}

// ─── syncLiveScoreForMatch ────────────────────────────────────────────────────

export interface LiveSyncResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  status?: string;
  score?: string;
  minute?: string | null;
  eventsCount?: number;
  error?: string;
}

/**
 * Sincroniza un partido con livescore-api respetando el cooldown de next_sync_at.
 * Actualiza: status, home_score, away_score, time (minuto raw), events (JSONB),
 * last_changed (si hubo cambio), last_synced_at, next_sync_at, sync_received_at,
 * sync_latency_ms y sync_error.
 *
 * IMPORTANTE: es la única función que llama a livescore-api para datos en vivo.
 * No llamar desde componentes cliente.
 */
export async function syncLiveScoreForMatch(matchId: string): Promise<LiveSyncResult> {
  const supabase = createAdminClient();
  const callStart = Date.now();

  // ── 1. Leer partido de DB ─────────────────────────────────────────────────
  const { data: match, error: fetchErr } = await supabase
    .from("matches")
    .select("id, external_api_id, status, home_score, away_score, time, events, next_sync_at")
    .eq("id", matchId)
    .single();

  if (fetchErr || !match) return { success: false, error: "Partido no encontrado en DB" };
  if (!match.external_api_id) return { success: false, error: "El partido no tiene external_api_id" };

  // ── 2. Respetar cooldown next_sync_at ─────────────────────────────────────
  if (match.next_sync_at && new Date(match.next_sync_at) > new Date()) {
    return { success: true, skipped: true, reason: `cooldown hasta ${match.next_sync_at}` };
  }

  // ── 3. Llamar a livescore-api (live + events si está en vivo) ─────────────
  const liveData = await getLiveMatchData(match.external_api_id);
  const syncReceivedAt = new Date().toISOString();
  const latencyMs = Date.now() - callStart;

  // Partido terminado o no encontrado en feed live — puede que ya terminó
  if (!liveData) {
    // Si el partido era live en DB, marcarlo como finished
    if (match.status === "live") {
      const nextSyncAt = new Date(Date.now() + 5 * 60_000).toISOString(); // revisar en 5 min
      await supabase.from("matches").update({
        sync_received_at: syncReceivedAt,
        sync_latency_ms:  latencyMs,
        last_synced_at:   syncReceivedAt,
        next_sync_at:     nextSyncAt,
        sync_error:       "No encontrado en feed live — posiblemente terminó",
      }).eq("id", matchId);
      return { success: true, reason: "No en feed live; puede que terminó", status: match.status };
    }
    // Para partidos scheduled: usar findMatchByExternalId (más costoso, solo cuando necesario)
    const api = await findMatchByExternalId(match.external_api_id);
    if (!api) {
      await supabase.from("matches").update({
        sync_received_at: syncReceivedAt,
        sync_latency_ms:  latencyMs,
        last_synced_at:   syncReceivedAt,
        next_sync_at:     new Date(Date.now() + 2 * 60_000).toISOString(),
        sync_error:       "Partido no encontrado en livescore-api",
      }).eq("id", matchId);
      return { success: false, error: "Partido no encontrado en livescore-api" };
    }

    const normalized = normalizeLiveScoreApiMatch(api);
    const hasChanged =
      normalized.status !== match.status ||
      normalized.home_score !== match.home_score ||
      normalized.away_score !== match.away_score;

    const nextSyncAt = normalized.status === "live"
      ? new Date(Date.now() + 2 * 60_000).toISOString()
      : new Date(Date.now() + 10 * 60_000).toISOString();

    await supabase.from("matches").update({
      status:           normalized.status,
      home_score:       normalized.home_score,
      away_score:       normalized.away_score,
      time:             normalized.time,
      minute:           normalized.time ? parseInt(normalized.time) || null : null,
      last_changed:     hasChanged ? syncReceivedAt : undefined,
      sync_received_at: syncReceivedAt,
      sync_latency_ms:  latencyMs,
      last_synced_at:   syncReceivedAt,
      next_sync_at:     nextSyncAt,
      sync_error:       null,
    }).eq("id", matchId);

    return {
      success: true,
      status:  normalized.status,
      score:   normalized.home_score != null ? `${normalized.home_score}-${normalized.away_score}` : "—",
      minute:  normalized.time,
    };
  }

  // ── 4. Partido encontrado en feed live ────────────────────────────────────
  const { match: raw, events } = liveData;
  const normalized = normalizeLiveScoreApiMatch(raw, events ?? []);

  const prevScore = `${match.home_score}-${match.away_score}`;
  const newScore  = `${normalized.home_score}-${normalized.away_score}`;
  const prevEvents: unknown[] = Array.isArray(match.events) ? match.events : [];
  const hasChanged =
    normalized.status !== match.status ||
    newScore !== prevScore ||
    prevEvents.length !== normalized.events.length ||
    normalized.time !== match.time;

  // Cooldown: 2 min si está en vivo, 30 s si acaba de empezar/terminar
  const nextSyncAt = new Date(Date.now() + 2 * 60_000).toISOString();

  const updatePayload: Record<string, unknown> = {
    status:           normalized.status,
    home_score:       normalized.home_score,
    away_score:       normalized.away_score,
    time:             normalized.time,
    minute:           normalized.time ? parseInt(normalized.time) || null : null,
    events:           normalized.events,
    sync_received_at: syncReceivedAt,
    sync_latency_ms:  latencyMs,
    last_synced_at:   syncReceivedAt,
    next_sync_at:     nextSyncAt,
    sync_error:       null,
  };

  if (hasChanged) updatePayload.last_changed = syncReceivedAt;
  if (events === null) updatePayload.sync_error = "events endpoint rate limited";

  await supabase.from("matches").update(updatePayload).eq("id", matchId);

  return {
    success:     true,
    status:      normalized.status,
    score:       newScore,
    minute:      normalized.time,
    eventsCount: normalized.events.length,
  };
}

// ─── listImportedMatches ──────────────────────────────────────────────────────

/** Lista los partidos en DB que tienen external_api_id (importados o del WC). */
export async function listImportedMatches() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("matches")
    .select("id, external_api_id, home_team, away_team, starts_at, status, home_score, away_score, minute, time, phase, group_name, events, last_synced_at, next_sync_at, sync_error")
    .not("external_api_id", "is", null)
    .order("starts_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

// ─── listAvailableFromApi ─────────────────────────────────────────────────────

/** Trae partidos de livescore-api para mostrar en el panel admin. */
export async function listAvailableFromApi(
  source: "live" | "today" | "recent",
  options?: { date?: string; fromDate?: string; toDate?: string },
): Promise<LsMatch[]> {
  if (source === "live")   return getLiveMatches();
  if (source === "recent") return getRecentResults(options?.fromDate, options?.toDate);
  return getFixturesByDate(options?.date);
}
