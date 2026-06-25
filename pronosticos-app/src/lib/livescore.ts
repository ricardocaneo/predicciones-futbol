/**
 * Cliente server-only para livescore-api.com
 * Las credenciales nunca se exponen al cliente: LIVESCORE_KEY y LIVESCORE_SECRET
 * no tienen prefijo NEXT_PUBLIC_ y solo son accesibles en server-side.
 */

const KEY    = process.env.LIVESCORE_KEY!;
const SECRET = process.env.LIVESCORE_SECRET!;
const BASE   = "https://livescore-api.com/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LsEvent {
  event: string;   // "GOAL", "YELLOW_CARD", "RED_CARD", "YELLOW_RED_CARD", "SUBSTITUTION", "OWN_GOAL", "PENALTY", "PENALTY_MISSED"
  label?: string;
  time: number;    // minuto desde el kick-off
  sort: number;    // orden de ocurrencia
  is_home: boolean;
  is_away: boolean;
  // player puede ser string plano o { id, name } según versión de la API
  player: string | { id: number | null; name: string } | null;
  // info puede ser string plano o { id, name } según versión de la API
  info: string | { id: number | null; name: string | null } | null;
  // campos del formato anterior (por compatibilidad)
  minute?: string;
  type?: string;
  related_player?: string;
  result?: string;
  team?: string;
  // formato legacy del sync (home_away: "h" | "a")
  home_away?: string;
}

export interface LsMatch {
  id: string;
  home_name: string;
  away_name: string;
  home_id?: string;
  away_id?: string;
  date: string;
  time: string;          // HH:MM en fixtures, minuto en live
  score: string | null;  // "1-2" durante/después del partido
  ft_score: string | null;
  status: string;        // "NS", "1H", "HT", "2H", "FT", etc.
  competition_name: string;
  competition_id: string;
  location?: string;
}

interface LsResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function lsGet<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!KEY || !SECRET) {
    console.error("livescore.ts: LIVESCORE_KEY o LIVESCORE_SECRET no definidos");
    return null;
  }
  const qs = new URLSearchParams({ key: KEY, secret: SECRET, ...params });
  try {
    const res  = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
    const json = await res.json() as LsResponse<T>;
    if (!json.success) {
      console.error(`livescore-api error en ${path}:`, json.error);
      return null;
    }
    return json.data;
  } catch (err) {
    console.error(`livescore-api fetch error en ${path}:`, err);
    return null;
  }
}

function extractMatches(data: unknown): LsMatch[] {
  if (!data) return [];
  const d = data as Record<string, unknown>;
  return (d.match ?? d.fixtures ?? d.data ?? []) as LsMatch[];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Partidos actualmente en vivo (todas las competencias). */
export async function getLiveMatches(): Promise<LsMatch[]> {
  const data = await lsGet<unknown>("/scores/live.json");
  return extractMatches(data);
}

/** Fixtures para una fecha dada (YYYY-MM-DD). Por defecto hoy. Itera todas las páginas. */
export async function getFixturesByDate(date?: string): Promise<LsMatch[]> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  return fetchFixturePages(targetDate, targetDate);
}

/**
 * Fixtures para un rango de fechas (YYYY-MM-DD). Itera todas las páginas.
 * Reemplaza al endpoint /scores/history.json que devuelve datos desde 1930.
 */
export async function getRecentResults(fromDate?: string, toDate?: string): Promise<LsMatch[]> {
  const to   = toDate   ?? new Date().toISOString().slice(0, 10);
  const from = fromDate ?? new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  return fetchFixturePages(from, to);
}

/** Fixtures para un rango de fechas arbitrario (YYYY-MM-DD). Itera todas las páginas. */
export async function getFixturesByDateRange(from: string, to: string): Promise<LsMatch[]> {
  return fetchFixturePages(from, to);
}

/** Pagina el endpoint de fixtures entre dos fechas y devuelve todos los partidos. */
async function fetchFixturePages(from: string, to: string): Promise<LsMatch[]> {
  const all: LsMatch[] = [];

  for (let page = 1; page <= 15; page++) {
    const data = await lsGet<unknown>("/fixtures/matches.json", { from, to, page: String(page) });
    if (!data) break;

    const d = data as Record<string, unknown>;
    const pageMatches = extractMatches(data);
    all.push(...pageMatches);

    // next_page es la URL de la siguiente página cuando hay más resultados
    const hasNext = typeof d.next_page === "string" && d.next_page.length > 0;
    if (!hasNext || pageMatches.length === 0) break;
  }

  return all;
}

/**
 * Busca un partido por su external_api_id.
 * Primero en live; después en fixtures de una ventana de ±7 días paginando todo.
 */
export async function findMatchByExternalId(externalId: string): Promise<LsMatch | null> {
  // 1. Live (1 llamada)
  const liveData = await lsGet<unknown>("/scores/live.json");
  const foundLive = extractMatches(liveData).find((m) => String(m.id) === externalId);
  if (foundLive) return foundLive;

  // 2. Fixtures ±2 días (conserva llamadas; partidos de más de 2 días atrás ya terminaron)
  const from = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const to   = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const fixtures = await fetchFixturePages(from, to);
  const foundFixture = fixtures.find((m) => String(m.id) === externalId);
  if (foundFixture) return foundFixture;

  // 3. History reciente para partidos recién terminados (1 llamada)
  const histFrom = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const histTo   = new Date().toISOString().slice(0, 10);
  const histData = await lsGet<unknown>("/scores/history.json", { from: histFrom, to: histTo });
  return extractMatches(histData).find((m) => String(m.id) === externalId) ?? null;
}

/** Eventos de un partido en vivo (goles, tarjetas, etc.) por external match ID. */
/** Retorna null si hay error de API (rate limit, credenciales, etc.), [] si no hay eventos. */
export async function getMatchEvents(externalMatchId: string): Promise<LsEvent[] | null> {
  const data = await lsGet<unknown>("/scores/events.json", { id: externalMatchId });
  if (data === null) return null;
  const d = data as Record<string, unknown>;
  return (d.event ?? d.events ?? []) as LsEvent[];
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

export interface NormalizedLiveMatch {
  external_api_id: string;
  status: "scheduled" | "live" | "finished";
  /** Raw minute string from API, e.g. "41", "45+2", "HT" */
  time: string | null;
  home_score: number | null;
  away_score: number | null;
  events: LsEvent[];
}

/**
 * Convierte la respuesta cruda de livescore-api a la forma canónica que
 * guardamos en Supabase. Los eventos se pasan por separado porque vienen
 * de un endpoint distinto.
 */
export function normalizeLiveScoreApiMatch(
  raw: LsMatch,
  events: LsEvent[] = [],
): NormalizedLiveMatch {
  const score = parseScore(raw.score ?? raw.ft_score ?? null);
  const rawTime = raw.time ?? null;
  const time = !isMatchTime(rawTime) ? rawTime : null;

  return {
    external_api_id: String(raw.id),
    status:          mapStatus(raw.status),
    time,
    home_score:      score?.home ?? null,
    away_score:      score?.away ?? null,
    events,
  };
}

/**
 * Obtiene el partido en vivo + sus eventos con el mínimo de llamadas posibles.
 * Retorna null si el partido no está en el feed live en este momento.
 * Retorna { match, events: null } si el partido está live pero los eventos fallaron (rate limit).
 */
export async function getLiveMatchData(externalId: string): Promise<{
  match: LsMatch;
  events: LsEvent[] | null;
} | null> {
  const liveData = await lsGet<unknown>("/scores/live.json");
  // El feed live puede tener id=ID_LIVE y fixture_id=ID_FIXTURE; buscamos por ambos
  const match = extractMatches(liveData).find(
    (m) => String(m.id) === externalId || String((m as unknown as Record<string, unknown>).fixture_id) === externalId
  );
  if (!match) return null;

  // Usar el id live (m.id) para el endpoint de eventos, no el fixture ID
  const liveId = String(match.id);
  const events = await getMatchEvents(liveId);
  return { match, events };
}

// ─── Helpers exported ─────────────────────────────────────────────────────────

export function mapStatus(s: string): "scheduled" | "live" | "finished" {
  const lower = (s ?? "").toLowerCase().trim();
  if (["ft", "aet", "pen", "finished", "full time", "awarded"].includes(lower)) return "finished";
  if (["sched", "ns", "tbd", "postp", "canc", "susp", "scheduled", ""].includes(lower)) return "scheduled";
  return "live";
}

export function parseScore(score: string | null): { home: number; away: number } | null {
  if (!score) return null;
  const parts = score.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { home: parts[0], away: parts[1] };
  return null;
}

/** Convierte el campo `time` de livescore-api a minuto cuando el partido está en curso. */
export function parseMinute(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const m = parseInt(timeStr, 10);
  return isNaN(m) ? null : m;
}

/** Detecta si `time` es HH:MM o HH:MM:SS (fixture) o un número (minuto de juego). */
export function isMatchTime(timeStr: string | null | undefined): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr ?? "");
}
