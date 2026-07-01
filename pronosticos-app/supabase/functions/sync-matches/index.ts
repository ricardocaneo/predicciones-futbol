import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculatePoints, type PredictionRow } from "./scoring.ts";

const LIVESCORE_KEY    = Deno.env.get("LIVESCORE_KEY")!;
const LIVESCORE_SECRET = Deno.env.get("LIVESCORE_SECRET")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
// SUPABASE_SERVICE_ROLE_KEY es inyectada por Supabase en formato sb_secret_ (ES256),
// que PostgREST rechaza por clock skew. Usamos EDGE_SERVICE_KEY (HS256 JWT legacy).
const SERVICE_KEY      = Deno.env.get("EDGE_SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
  // "pen" y "aet" se eliminan de finished: la API los manda durante la fase en curso. El estado final llega como "FINISHED".
  if (["ft", "finished", "awarded", "full time"].includes(lower)) return "finished";
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

  const url = new URL(req.url);
  const forceFixtureRefresh = url.searchParams.get("force_refresh") === "1";

  try {
    const now         = new Date();
    const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 30 * 60 * 1000);

    // 1. Partidos activos o próximos en DB
    const { data: upcoming } = await supabase
      .from("matches")
      .select("id, external_api_id, status, home_score, away_score, phase, time, home_team_id, away_team_id")
      .eq("status", "scheduled")
      .not("external_api_id", "is", null)
      .gte("starts_at", windowStart.toISOString())
      .lte("starts_at", windowEnd.toISOString());

    const { data: liveNow } = await supabase
      .from("matches")
      .select("id, external_api_id, status, home_score, away_score, phase, time, home_team_id, away_team_id")
      .eq("status", "live")
      .not("external_api_id", "is", null);

    const toUpdate = [
      ...new Map(
        [...(upcoming ?? []), ...(liveNow ?? [])].map((m) => [m.id, m])
      ).values(),
    ];

    // 2. Traer datos de livescore-api (solo si hay partidos activos)
    const syncReceivedAt = new Date().toISOString();
    const todayStr     = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

    const [liveData, fixturesData] = toUpdate.length > 0
      ? await Promise.all([
          lsGet("/scores/live.json", {}),
          lsGet("/fixtures/matches.json", { from: yesterdayStr, to: todayStr }),
        ])
      : [null, null];

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

      let mappedStatus = mapStatus(api.status as string ?? "");
      const score      = parseScore((api.score ?? api.ft_score ?? null) as string | null);
      const rawTime    = api.time as string | null;
      const liveTime   = !isMatchTime(rawTime) ? rawTime : null;
      const minute     = liveTime ? parseInt(liveTime) || null : null;

      const prevScore  = `${match.home_score}-${match.away_score}`;
      const newHome    = score?.home ?? match.home_score;
      const newAway    = score?.away ?? match.away_score;

      // En eliminatorias, "ft" con empate sin pen_score = fin de 90min, no fin del partido.
      // El partido sigue en prórroga; solo cerrar si hay ganador o pen_score confirmado.
      if (mappedStatus === "finished" && match.phase !== "group") {
        const hasPenScore = !!((api.ps_score as string) || "").trim();
        if ((api.status as string ?? "").toLowerCase().trim() === "ft" && newHome === newAway && !hasPenScore) {
          mappedStatus = "live";
        }
      }
      const newStatus = mappedStatus;
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
      if (newStatus === "finished") {
        update.minute = null;
        const psScore = ((api.ps_score as string) || "").trim() || null;
        const outcomes = api.outcomes as Record<string, string | null> | null;
        const winnerOutcome = outcomes?.penalty_shootout || outcomes?.extra_time || outcomes?.full_time || null;
        update.pen_score = psScore;
        update.winner_team_id = winnerOutcome === "1"
          ? (match as Record<string, unknown>).home_team_id ?? null
          : winnerOutcome === "2"
          ? (match as Record<string, unknown>).away_team_id ?? null
          : null;
      }

      await supabase.from("matches").update(update).eq("id", match.id);

      if (newStatus === "finished" && match.status !== "finished") {
        newlyFinished.push(match.id);
      }
    }

    // 4. Calcular puntos via RPC (bypasa RLS en predictions/profiles/group_standings)
    type PendingPred = PredictionRow;
    type PendingMatch = {
      match_id:       string;
      phase:          string;
      home_score:     number;
      away_score:     number;
      group_name:     string | null;
      winner_team_id: string | null;
      predictions:    PendingPred[] | null;
    };

    const { data: pendingData } = await supabase.rpc("edge_get_pending_match_data");
    const pending = (pendingData as PendingMatch[]) ?? [];

    const affectedGroupNames = new Set<string>();
    const updates: Array<{ pred_id: string; points: number; breakdown: unknown }> = [];

    for (const matchData of pending) {
      for (const pred of (matchData.predictions ?? []) as PredictionRow[]) {
        const result = calculatePoints(matchData.phase, matchData.home_score, matchData.away_score, pred, matchData.winner_team_id);
        updates.push({ pred_id: pred.id, points: result.points, breakdown: result.breakdown });
      }
      if (matchData.phase === "group" && matchData.group_name) {
        affectedGroupNames.add(matchData.group_name);
      }
    }

    // 5. Guardar puntos y recalcular total_points (todo via RPC con SECURITY DEFINER)
    let savedPreds = 0;
    if (updates.length > 0) {
      await supabase.rpc("edge_save_points_batch", { p_updates: updates });
      savedPreds = updates.length;
    }

    // 6. Recalcular group_standings para grupos afectados
    for (const groupName of affectedGroupNames) {
      await supabase.rpc("edge_recalculate_group_standings", { p_group_name: groupName });
    }

    // 7. Refresh nombres de equipos en partidos pendientes (solo si algo terminó o se fuerza)
    let fixturesUpdated = 0;

    if (newlyFinished.length > 0 || forceFixtureRefresh) {
      const { data: scheduledMatches } = await supabase
        .from("matches")
        .select("id, external_api_id, home_team, away_team, starts_at, home_team_id, away_team_id")
        .eq("status", "scheduled")
        .not("external_api_id", "is", null);

      if (scheduledMatches?.length) {
        const todayStr = now.toISOString().slice(0, 10);
        const maxDate = (scheduledMatches as Record<string, unknown>[])
          .map((m) => (m.starts_at as string).slice(0, 10))
          .reduce((a, b) => (a > b ? a : b));

        const allFixtures: Record<string, unknown>[] = [];
        for (let page = 1; page <= 10; page++) {
          const pageData = await lsGet("/fixtures/matches.json", { from: todayStr, to: maxDate, competition_id: COMPETITION_ID, page: String(page) });
          if (!pageData) break;
          const d = pageData as Record<string, unknown>;
          const pageMatches = extractMatches(pageData);
          allFixtures.push(...pageMatches);
          const hasNext = typeof d.next_page === "string" && d.next_page.length > 0;
          if (!hasNext || pageMatches.length === 0) break;
        }

        const fixtureMap = new Map(allFixtures.map((f) => [String(f.id), f]));

        for (const match of scheduledMatches as Record<string, unknown>[]) {
          const api = fixtureMap.get(match.external_api_id as string);
          if (!api) continue;
          const homeName = api.home_name as string;
          const awayName = api.away_name as string;
          const namesUnchanged = homeName === match.home_team && awayName === match.away_team;
          const idsAlreadySet  = !!(match.home_team_id && match.away_team_id);
          if (namesUnchanged && idsAlreadySet) continue;

          const teamUpdate: Record<string, unknown> = { home_team: homeName, away_team: awayName };
          if (!match.home_team_id || !match.away_team_id) {
            const { data: teams } = await supabase
              .from("teams")
              .select("id, name")
              .in("name", [homeName, awayName]);
            const homeTeamRow = (teams ?? []).find((t: Record<string, unknown>) => t.name === homeName);
            const awayTeamRow = (teams ?? []).find((t: Record<string, unknown>) => t.name === awayName);
            if (homeTeamRow) teamUpdate.home_team_id = homeTeamRow.id;
            if (awayTeamRow) teamUpdate.away_team_id = awayTeamRow.id;
          }

          await supabase
            .from("matches")
            .update(teamUpdate)
            .eq("id", match.id);
          fixturesUpdated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        checked:         toUpdate.length,
        finished:        pending.length,
        predsCalculated: savedPreds,
        groupsUpdated:   affectedGroupNames.size,
        fixturesUpdated,
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
