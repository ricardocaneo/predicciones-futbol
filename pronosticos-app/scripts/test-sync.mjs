/**
 * test-sync.mjs
 * Prueba end-to-end del sistema de sincronización usando un partido real.
 *
 * Fases:
 *   node scripts/test-sync.mjs --find      (hoy, antes del partido)
 *   node scripts/test-sync.mjs --sync      (mañana, durante el partido)
 *   node scripts/test-sync.mjs --cleanup   (después de terminar)
 *
 * El partido de prueba se inserta en la tabla matches con phase="test"
 * y NO aparece en la app (la app filtra por phase grupo/eliminatoria).
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = resolve(__dirname, ".test-match.json");

// ── Credenciales ─────────────────────────────────────────────────────────────

const envPath = resolve(process.cwd(), ".env.local");
const envVars = {};
try {
  readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length) envVars[key.trim()] = rest.join("=").trim();
  });
} catch { /* no encontrado */ }

const SUPABASE_URL  = envVars.NEXT_PUBLIC_SUPABASE_URL     || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = envVars.SUPABASE_SERVICE_ROLE_KEY    || process.env.SUPABASE_SERVICE_ROLE_KEY;
const LS_KEY        = envVars.LIVESCORE_KEY                || process.env.LIVESCORE_KEY;
const LS_SECRET     = envVars.LIVESCORE_SECRET             || process.env.LIVESCORE_SECRET;
const BASE          = "https://livescore-api.com/api-client";

if (!SUPABASE_URL || !SERVICE_KEY || !LS_KEY || !LS_SECRET) {
  console.error("❌  Faltan credenciales en .env.local:");
  console.error("    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LIVESCORE_KEY, LIVESCORE_SECRET");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function lsGet(path, params = {}) {
  const qs = new URLSearchParams({ key: LS_KEY, secret: LS_SECRET, ...params });
  const res = await fetch(`${BASE}${path}?${qs}`);
  const json = await res.json();
  if (!json.success) {
    console.error(`  API error en ${path}:`, json.error ?? json);
    return null;
  }
  return json.data;
}

async function supabase(path, method = "GET", body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Prefer":        "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function mapStatus(s) {
  const lower = (s ?? "").toLowerCase().trim();
  if (["ft", "aet", "pen", "finished", "full time", "awarded"].includes(lower)) return "finished";
  if (["sched", "ns", "tbd", "postp", "canc", "susp", "scheduled"].includes(lower)) return "scheduled";
  return "live";
}

function parseScore(score) {
  if (!score) return null;
  const parts = score.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { home: parts[0], away: parts[1] };
  }
  return null;
}

function saveState(data) {
  writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
}

// ── FASE 1: --find ────────────────────────────────────────────────────────────

async function findMatch() {
  console.log("🔍  Buscando partido de Coquimbo en livescore-api...\n");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  // Buscar en dos ventanas para cubrir distintas fechas UTC
  const searches = [
    { from: dateStr, to: dateStr },
    { from: new Date(Date.now()).toISOString().slice(0, 10), to: dateStr },
  ];

  let found = null;

  for (const { from, to } of searches) {
    console.log(`  Consultando fixtures ${from} → ${to} ...`);
    let page = 1;

    while (!found) {
      const data = await lsGet("/fixtures/matches.json", { from, to, page: String(page) });
      if (!data) break;

      const matches = data.match ?? data.fixtures ?? [];
      if (matches.length === 0) break;

      console.log(`  Página ${page}: ${matches.length} partidos`);

      const coquimboMatch = matches.find((m) =>
        [m.home_name, m.away_name].some((name) =>
          (name ?? "").toLowerCase().includes("coquimbo")
        )
      );

      if (coquimboMatch) {
        found = coquimboMatch;
        break;
      }

      if (!data.next_page) break;
      page++;
    }

    if (found) break;
  }

  if (!found) {
    console.log("\n⚠️  No se encontró partido de Coquimbo en los próximos días.");
    console.log("   Puede que la fecha del partido sea diferente o la API no lo tenga aún.");
    console.log("   Intentá de nuevo más cerca de la fecha del partido.");
    return;
  }

  console.log("\n✅  Partido encontrado:");
  console.log(`   ${found.home_name} vs ${found.away_name}`);
  console.log(`   Fecha:       ${found.date ?? found.starts_at ?? "—"}`);
  console.log(`   Hora:        ${found.time ?? "—"}`);
  console.log(`   Competencia: ${found.competition_name ?? found.competition ?? "—"}`);
  console.log(`   external_id: ${found.id}`);

  // Insertar fila de prueba en matches (phase = "test", no aparece en la app)
  const startsAt = found.date && found.time
    ? new Date(`${found.date}T${found.time}:00`).toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const testRow = {
    external_api_id: String(found.id),
    phase:           "test",           // nunca aparece en la app
    group_name:      null,
    home_team:       found.home_name,
    away_team:       found.away_name,
    starts_at:       startsAt,
    status:          "scheduled",
    home_score:      null,
    away_score:      null,
    minute:          null,
  };

  console.log("\n⬆️  Insertando fila de prueba en Supabase...");
  let inserted;
  try {
    const existing = await supabase(
      `/matches?external_api_id=eq.${found.id}&select=id,status,home_score,away_score`,
      "GET"
    );
    if (existing && existing.length > 0) {
      console.log("   Ya existe una fila con este external_api_id, la reutilizamos.");
      inserted = existing[0];
    } else {
      const result = await supabase("/matches", "POST", testRow);
      inserted = Array.isArray(result) ? result[0] : result;
    }
  } catch (err) {
    console.error("❌  Error al insertar:", err.message);
    return;
  }

  const state = {
    matchId:        inserted.id,
    externalApiId:  String(found.id),
    homeTeam:       found.home_name,
    awayTeam:       found.away_name,
    startsAt,
    competitionId:  String(found.competition_id ?? ""),
    competitionName: found.competition_name ?? "",
  };

  saveState(state);

  console.log(`\n✅  Listo. Fila de prueba registrada (ID: ${inserted.id})`);
  console.log(`   Estado guardado en scripts/.test-match.json`);
  console.log("\n📅  Mañana durante el partido corré:");
  console.log("   node scripts/test-sync.mjs --sync");
}

// ── FASE 2: --sync ────────────────────────────────────────────────────────────

async function syncMatch() {
  const state = loadState();
  if (!state) {
    console.error("❌  No hay estado guardado. Corré primero: node scripts/test-sync.mjs --find");
    process.exit(1);
  }

  console.log(`🔄  Sincronizando: ${state.homeTeam} vs ${state.awayTeam}`);
  console.log(`   external_api_id: ${state.externalApiId}`);
  console.log(`   Competencia: ${state.competitionName}\n`);

  // Estado actual en DB
  const [dbMatch] = await supabase(
    `/matches?id=eq.${state.matchId}&select=status,home_score,away_score,minute`,
    "GET"
  );
  console.log("📊  Estado actual en DB:");
  console.log(`   status: ${dbMatch.status} | score: ${dbMatch.home_score ?? "—"}-${dbMatch.away_score ?? "—"} | min: ${dbMatch.minute ?? "—"}`);

  // Buscar en livescore-api (live + history, sin filtrar por competencia)
  console.log("\n🌐  Consultando livescore-api...");
  const [liveData, historyData] = await Promise.all([
    lsGet("/scores/live.json", state.competitionId ? { competition_id: state.competitionId } : {}),
    lsGet("/scores/history.json", state.competitionId ? { competition_id: state.competitionId } : {}),
  ]);

  const liveMatches    = liveData?.match    ?? liveData?.fixtures    ?? [];
  const historyMatches = historyData?.match ?? historyData?.fixtures ?? [];

  console.log(`   En vivo: ${liveMatches.length} partidos | Historial: ${historyMatches.length} partidos`);

  // Buscar nuestro partido por external_api_id
  const allMatches = [...liveMatches, ...historyMatches];
  const apiMatch = allMatches.find((m) => String(m.id) === state.externalApiId);

  if (!apiMatch) {
    // Buscar por nombre de equipo como fallback
    const byName = allMatches.find((m) =>
      (m.home_name ?? "").toLowerCase().includes("coquimbo") ||
      (m.away_name ?? "").toLowerCase().includes("coquimbo")
    );

    if (byName) {
      console.log(`\n⚠️  No encontrado por ID, pero sí por nombre (ID API: ${byName.id}).`);
      console.log(`   ${byName.home_name} ${byName.score ?? "vs"} ${byName.away_name}`);
      console.log(`   Status API: ${byName.status}`);
    } else {
      console.log("\n⏳  Partido no encontrado en live ni en historial.");
      console.log("   Posibles causas:");
      console.log("   - El partido aún no empezó");
      console.log("   - Usa un competition_id diferente al guardado");
      console.log("   - Intentá en unos minutos durante el partido");
    }
    return;
  }

  const newStatus = mapStatus(apiMatch.status ?? "");
  const score     = parseScore(apiMatch.score ?? apiMatch.ft_score ?? null);
  const minute    = apiMatch.time ? parseInt(apiMatch.time, 10) : null;

  console.log(`\n📡  Datos de la API:`);
  console.log(`   ${apiMatch.home_name} ${apiMatch.score ?? "—"} ${apiMatch.away_name}`);
  console.log(`   Status: ${apiMatch.status} → ${newStatus} | Min: ${minute ?? "—"}`);

  // Actualizar en DB
  const update = {
    status:     newStatus,
    home_score: score?.home ?? dbMatch.home_score,
    away_score: score?.away ?? dbMatch.away_score,
    minute:     newStatus === "finished" ? null : (minute ?? null),
  };

  await supabase(`/matches?id=eq.${state.matchId}`, "PATCH", update);

  // Leer estado nuevo
  const [updated] = await supabase(
    `/matches?id=eq.${state.matchId}&select=status,home_score,away_score,minute`,
    "GET"
  );

  console.log("\n✅  DB actualizada:");
  console.log(`   status: ${updated.status} | score: ${updated.home_score ?? "—"}-${updated.away_score ?? "—"} | min: ${updated.minute ?? "—"}`);
  console.log("\n🎉  Sincronización exitosa. El sistema funciona correctamente.");

  if (newStatus === "finished") {
    console.log("\n   El partido terminó. Podés limpiar con:");
    console.log("   node scripts/test-sync.mjs --cleanup");
  } else {
    console.log("\n   Partido en curso. Corré --sync de nuevo para actualizar el marcador.");
  }
}

// ── FASE 3: --cleanup ─────────────────────────────────────────────────────────

async function cleanup() {
  const state = loadState();
  if (!state) {
    console.log("ℹ️  No hay estado guardado, nada que limpiar.");
    return;
  }

  console.log(`🧹  Eliminando fila de prueba: ${state.homeTeam} vs ${state.awayTeam}`);
  await supabase(`/matches?id=eq.${state.matchId}`, "DELETE");
  writeFileSync(STATE_FILE, "", "utf-8");
  console.log("✅  Limpieza completa. La fila de prueba fue eliminada.");
}

// ── Entry point ───────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg === "--find")         await findMatch();
else if (arg === "--sync")    await syncMatch();
else if (arg === "--cleanup") await cleanup();
else {
  console.log("Uso:");
  console.log("  node scripts/test-sync.mjs --find      # Buscar y registrar el partido");
  console.log("  node scripts/test-sync.mjs --sync      # Sincronizar marcador (durante el partido)");
  console.log("  node scripts/test-sync.mjs --cleanup   # Eliminar fila de prueba");
}
