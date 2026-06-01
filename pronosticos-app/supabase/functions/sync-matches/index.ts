import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculatePoints, type PredictionRow } from "./scoring.ts";

const LIVESCORE_KEY    = Deno.env.get("LIVESCORE_KEY")!;
const LIVESCORE_SECRET = Deno.env.get("LIVESCORE_SECRET")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMPETITION_ID   = "362"; // FIFA World Cup 2026
const BASE             = "https://livescore-api.com/api-client";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function lsGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const qs = new URLSearchParams({ key: LIVESCORE_KEY, secret: LIVESCORE_SECRET, ...params });
  const res = await fetch(`${BASE}${path}?${qs}`);
  const json = await res.json();
  if (!json.success) return null;
  return json.data ?? null;
}

function extractMatches(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  const d = data as Record<string, unknown>;
  return (d.match ?? d.fixtures ?? d.data ?? []) as Record<string, unknown>[];
}

function mapStatus(s: string): "scheduled" | "live" | "finished" {
  const lower = (s ?? "").toLowerCase().trim();
  if (["ft", "aet", "pen", "finished", "awarded", "full time"].includes(lower)) return "finished";
  if (["sched", "ns", "tbd", "postp", "canc", "susp", "scheduled", ""].includes(lower)) return "scheduled";
  return "live";
}

function parseScore(score: string | null): { home: number; away: number } | null {
  if (!score) return null;
  const parts = score.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { home: parts[0], away: parts[1] };
  }
  return null;
}

function isMatchTime(t: string | null | undefined): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(t ?? "");
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const now         = new Date();
    const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 30 * 60 * 1000);

    // 1. Partidos activos o próximos en DB
    const { data: upcoming } = await supabase
      .from("matches")
      .select("id, external_api_id, status, home_score, away_score, phase, time")
      .eq("status", "scheduled")
      .not("external_api_id", "is", null)
      .gte("starts_at", windowStart.toISOString())
      .lte("starts_at", windowEnd.toISOString());

    const { data: liveNow } = await supabase
      .from("matches")
      .select("id, external_api_id, status, home_score, away_score, phase, time")
      .eq("status", "live")
      .not("external_api_id", "is", null);

    const toUpdate = [
      ...new Map(
        [...(upcoming ?? []), ...(liveNow ?? [])].map((m) => [m.id, m])
      ).values(),
    ];

    if (toUpdate.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no hay partidos activos ni próximos" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Traer datos de livescore-api (2 llamadas fijas)
    const syncReceivedAt = new Date().toISOString();
    const todayStr     = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

    const [liveData, fixturesData] = await Promise.all([
      lsGet("/scores/live.json", {}),
      lsGet("/fixtures/matches.json", { from: yesterdayStr, to: todayStr }),
    ]);

    const apiById = new Map<string, Record<string, unknown>>();
    const fixtureMatches = (() => {
      if (!fixturesData) return [];
      const d = fixturesData as Record<string, unknown>;
      return (d.fixtures ?? d.data ?? d.match ?? []) as Record<string, unknown>[];
    })();
    for (const m of [...extractMatches(liveData), ...fixtureMatches]) {
      // El feed live usa id=ID_LIVE y fixture_id=ID_FIXTURE; el feed de fixtures usa id=ID_FIXTURE.
      // Indexamos por ambos para que external_api_id (que guarda el fixture ID) siempre encuentre el partido.
      apiById.set(String(m.id), m);
      if (m.fixture_id != null) apiById.set(String(m.fixture_id), m);
    }

    // 3. Actualizar cada partido
    const newlyFinished: string[] = [];

    for (const match of toUpdate) {
      if (!match.external_api_id) continue;
      const api = apiById.get(match.external_api_id);
      if (!api) continue;

      const newStatus  = mapStatus(api.status as string ?? "");
      const score      = parseScore((api.score ?? api.ft_score ?? null) as string | null);
      const rawTime    = api.time as string | null;
      const liveTime   = !isMatchTime(rawTime) ? rawTime : null;
      const minute     = liveTime ? parseInt(liveTime) || null : null;

      const prevScore  = `${match.home_score}-${match.away_score}`;
      const newHome    = score?.home ?? match.home_score;
      const newAway    = score?.away ?? match.away_score;
      const hasChanged =
        newStatus !== match.status ||
        `${newHome}-${newAway}` !== prevScore ||
        liveTime !== (match as Record<string, unknown>).time;

      // Para partidos en vivo: traer eventos (1 llamada extra por partido live)
      let events: unknown[] = [];
      let syncError: string | null = null;

      if (newStatus === "live") {
        // Usar el id live del partido (api.id), no el fixture ID almacenado en external_api_id
        const liveApiId = String(api.id ?? match.external_api_id);
        const evData = await lsGet("/scores/events.json", { id: liveApiId });
        if (evData === null) {
          syncError = "events rate limited";
        } else {
          const d = evData as Record<string, unknown>;
          events = (d.event ?? d.events ?? d.data ?? []) as unknown[];
        }
      }

      // Cooldown: próximo sync en 2 min si está en vivo, 5 min si terminó
      const nextSyncAt = newStatus === "live"
        ? new Date(now.getTime() + 2 * 60_000).toISOString()
        : new Date(now.getTime() + 5 * 60_000).toISOString();

      const update: Record<string, unknown> = {
        status:           newStatus,
        home_score:       newHome,
        away_score:       newAway,
        minute,
        time:             liveTime,
        last_synced_at:   syncReceivedAt,
        sync_received_at: syncReceivedAt,
        next_sync_at:     nextSyncAt,
        sync_error:       syncError,
      };

      if (newStatus === "live") update.events = events;
      if (hasChanged) update.last_changed = syncReceivedAt;
      if (newStatus === "finished") update.minute = null;

      await supabase.from("matches").update(update).eq("id", match.id);

      if (newStatus === "finished" && match.status !== "finished") {
        newlyFinished.push(match.id);
      }
    }

    // 4. Calcular puntos para partidos recién terminados
    // Fallback: también incluir partidos ya-finished cuyas predicciones no tienen breakdown
    // (cubre casos donde la transición se perdió en un sync anterior)
    const { data: pendingMatches } = await supabase
      .from("matches")
      .select("id")
      .eq("status", "finished")
      .not("home_score", "is", null)
      .not("away_score", "is", null);

    for (const pm of pendingMatches ?? []) {
      const { data: pendingPreds } = await supabase
        .from("predictions")
        .select("id")
        .eq("match_id", pm.id)
        .is("points_breakdown", null);
      if (pendingPreds && pendingPreds.length > 0 && !newlyFinished.includes(pm.id)) {
        newlyFinished.push(pm.id);
      }
    }

    const affectedUsers = new Set<string>();

    for (const matchId of newlyFinished) {
      const { data: match } = await supabase
        .from("matches")
        .select("id, phase, home_score, away_score")
        .eq("id", matchId)
        .single();

      if (!match || match.home_score === null || match.away_score === null) continue;

      const { data: predictions } = await supabase
        .from("predictions")
        .select("id, user_id, predicted_home_score, predicted_away_score, prediction_mode")
        .eq("match_id", matchId);

      for (const pred of (predictions ?? []) as PredictionRow[]) {
        const result = calculatePoints(match.phase, match.home_score, match.away_score, pred);
        await supabase.from("predictions").update({
          points:           result.points,
          points_breakdown: result.breakdown,
        }).eq("id", pred.id);
        affectedUsers.add(pred.user_id);
      }
    }

    // 5. Recalcular total_points en profiles
    for (const userId of affectedUsers) {
      const { data: userPreds } = await supabase
        .from("predictions")
        .select("points")
        .eq("user_id", userId);

      const total = (userPreds ?? []).reduce((sum: number, p: { points: number | null }) => sum + (p.points ?? 0), 0);
      await supabase.from("profiles").update({ total_points: total }).eq("id", userId);
    }

    return new Response(
      JSON.stringify({
        checked:           toUpdate.length,
        finished:          newlyFinished.length,
        usersRecalculated: affectedUsers.size,
        debug_api_ids:     [...apiById.keys()],
        debug_matches:     toUpdate.map(m => ({ id: m.id, ext: m.external_api_id, status: m.status })),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-matches error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
