/**
 * seed-matches.mjs
 * Carga los partidos del Mundial 2026 desde livescore-api.com a Supabase.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx LIVESCORE_KEY=yyy LIVESCORE_SECRET=zzz \
 *   node scripts/seed-matches.mjs
 *
 * Si no ponés LIVESCORE_COMPETITION_ID, el script lista las competiciones
 * disponibles y te muestra cuál es el ID del Mundial 2026.
 */

import { createClient } from "@supabase/supabase-js";

// ── Credenciales ─────────────────────────────────────────────────────────────
const SUPABASE_URL             = "https://wbipydxmgkbrdjcnblvc.supabase.co";
const SUPABASE_SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIVESCORE_KEY            = process.env.LIVESCORE_KEY;
const LIVESCORE_SECRET         = process.env.LIVESCORE_SECRET;
const LIVESCORE_COMPETITION_ID = process.env.LIVESCORE_COMPETITION_ID ?? "";

const BASE = "https://livescore-api.com/api-client";

if (!SUPABASE_SERVICE_KEY || !LIVESCORE_KEY || !LIVESCORE_SECRET) {
  console.error(
    "Faltan variables de entorno.\n" +
    "Necesitás: SUPABASE_SERVICE_ROLE_KEY, LIVESCORE_KEY, LIVESCORE_SECRET"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function ls(path, params = {}) {
  const qs = new URLSearchParams({
    key: LIVESCORE_KEY,
    secret: LIVESCORE_SECRET,
    ...params,
  });
  const res = await fetch(`${BASE}${path}?${qs}`);
  const json = await res.json();
  if (!json.success) throw new Error(`API error en ${path}: ${JSON.stringify(json)}`);
  return json.data;
}

/** Mapea el nombre de ronda/fase de la API a nuestro enum */
function mapPhase(round = "", group = "") {
  const r = round.toLowerCase();
  if (r.includes("group") || r.includes("fase de grupos") || group) return "group";
  if (r.includes("round of 32") || r.includes("ronda de 32"))        return "round_of_32";
  if (r.includes("round of 16") || r.includes("octavos"))             return "round_of_16";
  if (r.includes("quarter"))                                           return "quarter_final";
  if (r.includes("semi"))                                              return "semi_final";
  if (r.includes("third") || r.includes("tercer"))                    return "third_place";
  if (r.includes("final"))                                             return "final";
  return "group"; // fallback
}

/** Convierte "2026-06-11" + "20:00" o "20:00:00" en timestamptz UTC */
function toTimestamptz(date, time) {
  const t = time ?? "00:00";
  // la API a veces devuelve HH:MM y otras HH:MM:SS; normalizamos a HH:MM:SS
  const withSeconds = /^\d{2}:\d{2}:\d{2}$/.test(t) ? t : `${t}:00`;
  return `${date}T${withSeconds}Z`;
}

// ── 1. Encontrar el competition_id del Mundial 2026 ───────────────────────────
async function findWorldCupId() {
  if (LIVESCORE_COMPETITION_ID) return LIVESCORE_COMPETITION_ID;

  console.log("Buscando el competition_id del Mundial 2026...");
  const data = await ls("/competitions/list.json");
  const comps = data.competition ?? [];

  const wc = comps.filter((c) =>
    c.name?.toLowerCase().includes("world cup") ||
    c.name?.toLowerCase().includes("mundial") ||
    c.name?.toLowerCase().includes("fifa world")
  );

  if (wc.length === 0) {
    console.log("\nNo encontré ninguna competición con 'world cup' en el nombre.");
    console.log("Todas las competiciones disponibles:");
    comps.forEach((c) => console.log(`  id=${c.id}  name="${c.name}"  country="${c.country}"`));
    process.exit(1);
  }

  console.log("\nCompeticiones encontradas:");
  wc.forEach((c) => console.log(`  id=${c.id}  name="${c.name}"  country="${c.country}"`));

  if (wc.length === 1) {
    console.log(`\nUsando automáticamente: id=${wc[0].id}`);
    return wc[0].id;
  }

  const wc2026 = wc.find((c) => c.name?.includes("2026"));
  if (wc2026) {
    console.log(`\nUsando: id=${wc2026.id}  "${wc2026.name}"`);
    return wc2026.id;
  }

  console.log(
    "\nHay varias opciones. Elegí el id correcto y volvé a correr con:\n" +
    "  LIVESCORE_COMPETITION_ID=<id> node scripts/seed-matches.mjs"
  );
  process.exit(0);
}

// ── 2. Descargar todos los partidos ──────────────────────────────────────────
async function fetchAllMatches(competitionId) {
  const matches = [];
  // El Mundial 2026 va del 11/06 al 19/07
  const from = "2026-06-01";
  const to   = "2026-07-31";

  let page = 1;
  while (true) {
    console.log(`  Descargando página ${page}...`);
    const data = await ls("/fixtures/matches.json", {
      competition_id: competitionId,
      from,
      to,
      page,
    });

    const batch = data.match ?? data.fixtures ?? [];
    if (batch.length === 0) break;

    matches.push(...batch);
    if (!data.next_page) break;
    page++;
  }

  return matches;
}

// ── 3. Mapear al esquema de Supabase ─────────────────────────────────────────
function mapMatch(m) {
  const phase     = mapPhase(m.round ?? m.stage ?? "", m.group ?? "");
  const groupName = m.group ?? (phase === "group" ? (m.round ?? null) : null);

  return {
    external_api_id: String(m.id),
    phase,
    group_name:  groupName,
    home_team:   m.home_name ?? m.home_team ?? "TBD",
    away_team:   m.away_name ?? m.away_team ?? "TBD",
    starts_at:   toTimestamptz(m.date, m.time),
    status:      "scheduled",
    home_score:  null,
    away_score:  null,
    minute:      null,
  };
}

// ── 4. Upsert en Supabase (vía REST directo para garantizar service_role) ─────
async function upsertMatches(rows) {
  const CHUNK = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?on_conflict=external_api_id`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Prefer":        "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(chunk),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      console.error(`Error en upsert bloque ${i / CHUNK + 1}:`, JSON.stringify(err));
      throw new Error(err.message ?? res.statusText);
    }

    const data = await res.json();
    inserted += Array.isArray(data) ? data.length : 0;
  }

  return inserted;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log("=== Seed Mundial 2026 ===\n");

    const competitionId = await findWorldCupId();
    console.log(`\nDescargando partidos (competition_id=${competitionId})...`);

    const raw = await fetchAllMatches(competitionId);
    console.log(`  ${raw.length} partidos descargados de la API.\n`);

    if (raw.length === 0) {
      console.log("No hay partidos para cargar. Verificá el competition_id.");
      process.exit(0);
    }

    const rows = raw.map(mapMatch);

    // Preview
    console.log("Preview de los primeros 3 partidos:");
    rows.slice(0, 3).forEach((r) =>
      console.log(`  ${r.phase} | ${r.group_name ?? "-"} | ${r.home_team} vs ${r.away_team} | ${r.starts_at}`)
    );
    console.log("");

    console.log(`Insertando ${rows.length} partidos en Supabase...`);
    const count = await upsertMatches(rows);
    console.log(`\n✓ ${count} partidos guardados en la tabla matches.`);
  } catch (err) {
    console.error("\n✗ Error:", err.message ?? err);
    process.exit(1);
  }
})();
