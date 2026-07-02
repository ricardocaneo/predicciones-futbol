"use client";

import { useState, useTransition, useEffect } from "react";
import { actionGetSyncHealth, actionRepairOrphanedPredictions } from "./actions";

type CronResponseRow  = { created: string; status_code: number; content: string };
type OrphanedMatchRow = {
  match_id: string; home_team: string; away_team: string;
  home_score: number | null; away_score: number | null;
  pen_score: string | null; phase: string;
  winner_team_id: string | null; time: string | null;
  orphaned_count: number;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "hace <1 min";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `hace ${hrs}h` : new Date(iso).toLocaleDateString("es");
}

function parseCronContent(raw: string) {
  try { return JSON.parse(raw); } catch { return null; }
}

export default function SyncHealthPanel() {
  const [cronRows, setCronRows] = useState<CronResponseRow[]>([]);
  const [orphans,  setOrphans]  = useState<OrphanedMatchRow[]>([]);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  const [loading,   startLoad]   = useTransition();
  const [repairing, startRepair] = useTransition();

  function fetchHealth() {
    setFetchErr(null);
    startLoad(async () => {
      const res = await actionGetSyncHealth();
      if (res.success) {
        setCronRows(res.cronResponses);
        setOrphans(res.orphanedMatches);
      } else {
        setFetchErr(res.error ?? "Error desconocido");
      }
    });
  }

  function handleRepair() {
    setRepairMsg(null);
    startRepair(async () => {
      const res = await actionRepairOrphanedPredictions();
      if (res.success) {
        setRepairMsg(`✓ ${res.matchesFixed} partido(s) reparado(s) · ${res.predsCalculated} pronóstico(s) calculado(s)`);
        fetchHealth();
      } else {
        setRepairMsg(`✗ ${res.error}`);
      }
    });
  }

  useEffect(() => { fetchHealth(); }, []);

  return (
    <div className="space-y-4">

      {/* ── Últimas respuestas del cron ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">Sync automático</h2>
            <p className="text-xs text-slate-400 mt-0.5">Últimas respuestas del cron (cada 2 min)</p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
          >
            {loading ? "…" : "↻ Actualizar"}
          </button>
        </div>

        <div className="px-4 py-2">
          {fetchErr && <p className="text-xs text-red-600 dark:text-red-400 py-3">{fetchErr}</p>}
          {!fetchErr && cronRows.length === 0 && !loading && (
            <p className="text-xs text-slate-400 py-3 text-center">Sin datos de cron</p>
          )}
          {cronRows.map((row, i) => {
            const ok      = row.status_code >= 200 && row.status_code < 300;
            const parsed  = parseCronContent(row.content);
            const hasErr  = parsed?.error;
            return (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                <span className={`mt-0.5 shrink-0 text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                  ok
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {row.status_code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 dark:text-slate-500">{relativeTime(row.created)}</p>
                  {parsed ? (
                    <p className={`text-xs font-mono mt-0.5 truncate ${hasErr ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {hasErr
                        ? `⚠ ${String(parsed.error).slice(0, 120)}`
                        : `checked:${parsed.checked ?? "—"} · finished:${parsed.finished ?? "—"} · preds:${parsed.predsCalculated ?? "—"}${parsed.fixturesUpdated != null ? ` · fixtures:${parsed.fixturesUpdated}` : ""}`
                      }
                    </p>
                  ) : (
                    <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">{row.content.slice(0, 100)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pronósticos huérfanos ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">Pronósticos sin calcular</h2>
            <p className="text-xs text-slate-400 mt-0.5">Partidos finalizados con <code className="font-mono">points_breakdown IS NULL</code></p>
          </div>
          {orphans.length > 0 && (
            <button
              onClick={handleRepair}
              disabled={repairing || loading}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
            >
              {repairing ? "Reparando…" : `⚙ Reparar ${orphans.length}`}
            </button>
          )}
        </div>

        <div className="px-4 py-2">
          {repairMsg && (
            <div className={`mb-3 text-xs px-3 py-2 rounded-lg font-mono ${
              repairMsg.startsWith("✓")
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}>
              {repairMsg}
            </div>
          )}

          {orphans.length === 0 && !loading && !fetchErr && (
            <p className="text-xs text-green-600 dark:text-green-400 py-3 text-center">✓ Sin pronósticos huérfanos</p>
          )}

          {orphans.map((m) => (
            <div key={m.match_id} className="py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {m.home_team} <span className="tabular-nums">{m.home_score ?? "?"}-{m.away_score ?? "?"}</span> {m.away_team}
                  {m.pen_score && <span className="text-slate-400 text-xs ml-1">(pen {m.pen_score})</span>}
                </p>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Fase: {m.phase} · {m.orphaned_count} pronóstico(s) sin calcular
                {!m.winner_team_id && m.phase !== "group" && (
                  <span className="text-amber-500 ml-1">⚠ winner_team_id faltante</span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
