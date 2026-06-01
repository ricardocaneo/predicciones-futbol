/**
 * seed-players.mjs
 * Carga los planteles del Mundial 2026 desde livescore-api.com a Supabase.
 *
 * Uso (correr desde la raíz del proyecto):
 *   node scripts/seed-players.mjs
 *
 * Requiere las variables en .env.local (las lee automáticamente).
 * Correr DESPUÉS del 1 de junio cuando la API tenga los planteles completos.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Leer .env.local manualmente (no queremos depender de dotenv)
const envPath = resolve(process.cwd(), ".env.local");
const envVars = {};
try {
  readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) envVars[key.trim()] = rest.join("=").trim();
  });
} catch { /* archivo no encontrado */ }

const SUPABASE_URL      = envVars.NEXT_PUBLIC_SUPABASE_URL      || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY       = envVars.SUPABASE_SERVICE_ROLE_KEY     || process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIVESCORE_KEY     = envVars.LIVESCORE_KEY                 || process.env.LIVESCORE_KEY;
const LIVESCORE_SECRET  = envVars.LIVESCORE_SECRET              || process.env.LIVESCORE_SECRET;
const COMPETITION_ID    = "362"; // FIFA World Cup 2026
const BASE              = "https://livescore-api.com/api-client";

if (!SUPABASE_URL || !SERVICE_KEY || !LIVESCORE_KEY || !LIVESCORE_SECRET) {
  console.error("Faltan variables. Verificá .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LIVESCORE_KEY, LIVESCORE_SECRET");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function lsGet(path, params = {}) {
  const qs = new URLSearchParams({ key: LIVESCORE_KEY, secret: LIVESCORE_SECRET, ...params });
  const res = await fetch(`${BASE}${path}?${qs}`);
  const json = await res.json();
  return json;
}

async function supabaseRequest(path, method, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Prefer":        "resolution=merge-duplicates,return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

function mapPosition(pos) {
  const p = (pos ?? "").toUpperCase();
  if (p === "GK" || p === "G")  return "GK";
  if (p === "DF" || p === "D")  return "DEF";
  if (p === "MF" || p === "M")  return "MID";
  if (p === "FW" || p === "F")  return "FWD";
  return pos || null;
}

// ── 1. Obtener teams de Supabase (necesitamos external_api_id o matchear por nombre) ──

async function getTeamsFromSupabase() {
  const data = await supabaseRequest("/teams?select=id,name,external_api_id&limit=60", "GET");
  return data; // [{ id, name, external_api_id }]
}

// ── 2. Obtener team_ids de la API desde los fixtures ──────────────────────────

async function getApiTeamIds() {
  const teamMap = new Map(); // api_team_id -> team_name
  let page = 1;
  while (true) {
    const r = await lsGet("/fixtures/matches.json", {
      competition_id: COMPETITION_ID,
      from: "2026-06-01",
      to:   "2026-07-31",
      page,
    });
    if (!r.success) break;
    const matches = r.data?.match || r.data?.fixtures || [];
    if (matches.length === 0) break;
    for (const m of matches) {
      if (m.home_id && m.home_name) teamMap.set(String(m.home_id), m.home_name);
      if (m.away_id && m.away_name) teamMap.set(String(m.away_id), m.away_name);
    }
    if (!r.data?.next_page) break;
    page++;
  }
  return teamMap; // Map<api_team_id, team_name>
}

// ── 3. Fetch squad por equipo ──────────────────────────────────────────────────

async function fetchSquad(apiTeamId) {
  const r = await lsGet("/competitions/squads.json", {
    competition_id: COMPETITION_ID,
    team_id:        apiTeamId,
  });
  if (!r.success) return [];
  return r.data || [];
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log("=== Seed Jugadores Mundial 2026 ===\n");

  // Equipos en nuestra DB
  const dbTeams = await getTeamsFromSupabase();
  const dbTeamByName = new Map(dbTeams.map((t) => [t.name.toLowerCase(), t]));
  console.log(`Equipos en DB: ${dbTeams.length}`);

  // Team IDs de la API
  console.log("Obteniendo IDs de equipos desde fixtures...");
  const apiTeamMap = await getApiTeamIds();
  console.log(`Equipos encontrados en API: ${apiTeamMap.size}`);

  // Actualizar external_api_id en nuestra tabla teams
  console.log("\nActualizando external_api_id en teams...");
  for (const [apiId, apiName] of apiTeamMap) {
    const dbTeam = dbTeamByName.get(apiName.toLowerCase());
    if (dbTeam) {
      await supabaseRequest(
        `/teams?id=eq.${dbTeam.id}`,
        "PATCH",
        { external_api_id: apiId }
      ).catch(() => {}); // ignorar si ya está
    }
  }

  // Fetch y seed de jugadores
  let totalPlayers = 0;
  let totalInserted = 0;
  const skipped = [];

  for (const [apiTeamId, apiTeamName] of apiTeamMap) {
    const dbTeam = dbTeamByName.get(apiTeamName.toLowerCase());
    if (!dbTeam) {
      skipped.push(apiTeamName);
      continue;
    }

    process.stdout.write(`  ${apiTeamName}... `);
    const squad = await fetchSquad(apiTeamId);

    if (squad.length === 0) {
      console.log("sin datos");
      continue;
    }

    totalPlayers += squad.length;

    const rows = squad.map((p) => ({
      external_api_id: String(p.id),
      team_id:         dbTeam.id,
      name:            p.name,
      position:        mapPosition(p.position),
      shirt_number:    p.shirt_number ? parseInt(p.shirt_number, 10) || null : null,
    }));

    // Upsert en chunks de 50
    const CHUNK = 50;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await supabaseRequest(
        "/players?on_conflict=external_api_id",
        "POST",
        rows.slice(i, i + CHUNK)
      );
    }

    totalInserted += rows.length;
    console.log(`${squad.length} jugadores`);

    // Pausa breve para no saturar la API
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✓ ${totalInserted} jugadores insertados de ${totalPlayers} encontrados`);
  if (skipped.length) {
    console.log(`⚠ Equipos sin match en DB (revisar nombres): ${skipped.join(", ")}`);
  }
})().catch((err) => {
  console.error("✗ Error:", err.message ?? err);
  process.exit(1);
});
