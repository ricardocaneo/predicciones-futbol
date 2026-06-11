"use client";

import { useState, useTransition, useEffect } from "react";
import {
  actionListApiMatches,
  actionImportMatch,
  actionSyncMatch,
  actionSyncLiveMatch,
  actionSyncAll,
  actionProcessMatch,
  actionListImportedMatches,
  actionCountMatchPredictions,
  actionDeleteMatch,
  actionListUsers,
  actionSetUserActive,
  actionDeleteUser,
  type AdminUser,
} from "./actions";
import type { LsMatch } from "@/lib/livescore";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportedMatch = {
  id: string;
  external_api_id: string | null;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  minute: number | null;
  time: string | null;
  phase: string;
  group_name: string | null;
  events: unknown[] | null;
  last_synced_at: string | null;
  next_sync_at: string | null;
  sync_error: string | null;
};

// ─── Small components ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const color =
    status === "live"     ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
    status === "finished" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {status === "live" ? "● EN VIVO" : status === "finished" ? "Finalizado" : "Programado"}
    </span>
  );
}

function ResultBox({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`mt-2 text-xs px-3 py-2 rounded-lg font-mono ${
      ok
        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
    }`}>
      {ok ? "✓ " : "✗ "}{msg}
    </div>
  );
}

function Btn({
  onClick, loading, children, variant = "default", disabled,
}: {
  onClick: () => void;
  loading: boolean;
  children: React.ReactNode;
  variant?: "default" | "green" | "amber" | "red";
  disabled?: boolean;
}) {
  const base = "text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40";
  const colors = {
    default: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700",
    green:   "bg-green-500 text-white hover:bg-green-600",
    amber:   "bg-amber-500 text-white hover:bg-amber-600",
    red:     "bg-red-500 text-white hover:bg-red-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`${base} ${colors[variant]}`}
    >
      {loading ? "…" : children}
    </button>
  );
}

// ─── API Match row ────────────────────────────────────────────────────────────

function ApiMatchRow({
  match,
  onImport,
}: {
  match: LsMatch;
  onImport: (id: string) => Promise<string>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleImport() {
    startTransition(async () => {
      const res = await onImport(String(match.id));
      setResult({ ok: true, msg: String(res) });
    });
  }

  return (
    <div className="py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {match.home_name} <span className="text-slate-400">vs</span> {match.away_name}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {match.competition_name} · {match.date} {match.time} · ID: {match.id}
          </p>
          {match.score && (
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              Marcador: {match.score} · Status: {match.status}
            </p>
          )}
        </div>
        <Btn onClick={handleImport} loading={pending} variant="green">
          Importar
        </Btn>
      </div>
      {result && <ResultBox ok={result.ok} msg={result.msg} />}
    </div>
  );
}

// ─── Imported match row ───────────────────────────────────────────────────────

function ImportedMatchRow({
  match,
  onRefresh,
}: {
  match: ImportedMatch;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Delete flow
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirming">("idle");
  const [predCount, setPredCount] = useState<number | null>(null);

  function handleDeleteClick() {
    startTransition(async () => {
      const res = await actionCountMatchPredictions(match.id);
      if (res.success) {
        setPredCount(res.count);
        setDeleteStep("confirming");
      } else {
        setResult({ ok: false, msg: res.error ?? "Error al consultar pronósticos" });
      }
    });
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const res = await actionDeleteMatch(match.id);
      if (res.success) {
        setResult({ ok: true, msg: `Partido eliminado · ${res.deletedPredictions} pronóstico(s) eliminado(s)` });
        setDeleteStep("idle");
        onRefresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Error al eliminar" });
        setDeleteStep("idle");
      }
    });
  }

  function handleSync() {
    startTransition(async () => {
      const res = await actionSyncMatch(match.id);
      if (res.success) {
        setResult({
          ok: true,
          msg: `${res.previousStatus} → ${res.newStatus} · Marcador: ${res.score}${res.minute != null ? ` · Min ${res.minute}` : ""}`,
        });
        onRefresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Error desconocido" });
      }
    });
  }

  function handleSyncLive() {
    startTransition(async () => {
      const res = await actionSyncLiveMatch(match.id);
      if (res.success) {
        const detail = res.skipped
          ? `Cooldown activo · ${res.reason}`
          : `${res.status} · ${res.score ?? "—"} · min ${res.minute ?? "—"} · ${res.eventsCount ?? 0} evento(s)`;
        setResult({ ok: true, msg: detail });
        onRefresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Error desconocido" });
      }
    });
  }

  function handleProcess() {
    startTransition(async () => {
      const res = await actionProcessMatch(match.id);
      if (res.success) {
        setResult({
          ok: true,
          msg: `Puntos calculados: ${res.predictionsProcessed} pronóstico(s) · ${res.usersUpdated} usuario(s) actualizado(s)`,
        });
        onRefresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Error desconocido" });
      }
    });
  }

  const score = match.home_score != null && match.away_score != null
    ? `${match.home_score}–${match.away_score}`
    : "—";
  const isTest = match.group_name === "TEST";
  const eventsCount = Array.isArray(match.events) ? match.events.length : 0;

  return (
    <div className="py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {match.home_team} <span className="font-black tabular-nums">{score}</span> {match.away_team}
            </p>
            <StatusPill status={match.status} />
            {isTest && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                TEST
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            ext_id: {match.external_api_id}
            {match.time != null && ` · Min ${match.time}'`}
            {eventsCount > 0 && ` · ${eventsCount} eventos`}
          </p>
          {match.last_synced_at && (
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">
              último sync: {new Date(match.last_synced_at).toLocaleTimeString("es")}
              {match.next_sync_at && ` · próximo: ${new Date(match.next_sync_at).toLocaleTimeString("es")}`}
            </p>
          )}
          {match.sync_error && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">⚠ {match.sync_error}</p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <Btn onClick={handleSyncLive} loading={pending} variant="green">
            ⚡ Sync en vivo
          </Btn>
          <Btn onClick={handleSync} loading={pending} variant="default">
            Sync básico
          </Btn>
          <Btn
            onClick={handleProcess}
            loading={pending}
            variant="amber"
            disabled={match.status !== "finished"}
          >
            Procesar puntos
          </Btn>
          <Btn
            onClick={handleDeleteClick}
            loading={pending}
            variant="red"
            disabled={deleteStep === "confirming"}
          >
            Eliminar
          </Btn>
        </div>
      </div>

      {/* Confirmación de eliminación */}
      {deleteStep === "confirming" && (
        <div className="mt-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">
            ⚠ ¿Eliminar este partido?
            {predCount != null && predCount > 0
              ? ` Se eliminarán también ${predCount} pronóstico(s) de usuario(s) y se recalcularán sus puntos.`
              : " Este partido no tiene pronósticos asociados."}
          </p>
          <div className="flex gap-2 mt-2">
            <Btn onClick={handleConfirmDelete} loading={pending} variant="red">
              Sí, eliminar
            </Btn>
            <Btn onClick={() => setDeleteStep("idle")} loading={false} variant="default">
              Cancelar
            </Btn>
          </div>
        </div>
      )}

      {result && <ResultBox ok={result.ok} msg={result.msg} />}
    </div>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({ user, onRefresh }: { user: AdminUser; onRefresh: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirming">("idle");

  function handleToggleActive() {
    startTransition(async () => {
      const res = await actionSetUserActive(user.id, !user.is_active);
      if (res.success) {
        setResult({ ok: true, msg: user.is_active ? "Usuario dado de baja" : "Usuario reactivado" });
        onRefresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Error" });
      }
    });
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const res = await actionDeleteUser(user.id);
      if (res.success) {
        setResult({ ok: true, msg: "Usuario eliminado" });
        setDeleteStep("idle");
        onRefresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Error al eliminar" });
        setDeleteStep("idle");
      }
    });
  }

  return (
    <div className="py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user.display_name ?? "(sin nombre)"}
            </p>
            {!user.is_active && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                BAJA
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {user.email} · {user.prediction_count} pronóstico(s) · {user.total_points} pts
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">
            Registrado: {new Date(user.created_at).toLocaleDateString("es")}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <Btn onClick={handleToggleActive} loading={pending} variant={user.is_active ? "amber" : "green"}>
            {user.is_active ? "Dar de baja" : "Reactivar"}
          </Btn>
          <Btn onClick={() => setDeleteStep("confirming")} loading={pending} variant="red" disabled={deleteStep === "confirming"}>
            Eliminar
          </Btn>
        </div>
      </div>

      {deleteStep === "confirming" && (
        <div className="mt-2 px-3 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 space-y-2">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">
            ⚠ Esta acción eliminará al usuario y todo su historial de pronósticos de forma irreversible.
          </p>
          <p className="text-xs text-red-600 dark:text-red-500">
            Si querés conservar su historial, es más seguro <strong>dar de baja</strong> en lugar de eliminar.
          </p>
          <div className="flex gap-2">
            <Btn onClick={() => setDeleteStep("idle")} loading={false} variant="default">
              Cancelar
            </Btn>
            <Btn onClick={handleConfirmDelete} loading={pending} variant="red">
              Eliminar de todos modos
            </Btn>
          </div>
        </div>
      )}

      {result && <ResultBox ok={result.ok} msg={result.msg} />}
    </div>
  );
}

// ─── Users section ────────────────────────────────────────────────────────────

function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function fetchUsers() {
    setFetchError(null);
    startTransition(async () => {
      const res = await actionListUsers();
      if (res.success) {
        setUsers(res.users);
        setLoaded(true);
      } else {
        setFetchError(res.error ?? "Error desconocido");
        setLoaded(true);
      }
    });
  }

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">Usuarios registrados</h2>
          <p className="text-xs text-slate-400 mt-0.5">Dar de baja conserva el historial. Eliminar borra todo.</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
        >
          {loading ? "…" : "↻ Actualizar"}
        </button>
      </div>
      <div className="px-4 pb-2">
        {!loaded && loading && (
          <p className="text-sm text-slate-400 py-4 text-center">Cargando usuarios…</p>
        )}
        {fetchError && (
          <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {fetchError}
          </div>
        )}
        {loaded && !fetchError && users.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">No hay usuarios registrados.</p>
        )}
        {users.map((u) => (
          <UserRow key={u.id} user={u} onRefresh={fetchUsers} />
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().slice(0, 10);
const threeDaysAgoStr = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

export default function AdminPanel({ initialImported }: { initialImported: ImportedMatch[] }) {
  const [activeTab, setActiveTab] = useState<"partidos" | "usuarios">("partidos");
  const [apiSource, setApiSource] = useState<"live" | "today" | "recent">("live");
  const [fixtureDate, setFixtureDate] = useState(todayStr);
  const [historyFrom, setHistoryFrom] = useState(threeDaysAgoStr);
  const [historyTo,   setHistoryTo]   = useState(todayStr);

  const [apiMatches, setApiMatches] = useState<LsMatch[]>([]);
  const [apiLoading, startApiTransition] = useTransition();
  const [apiError, setApiError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const [imported, setImported] = useState<ImportedMatch[]>(initialImported);
  const [refreshing, startRefreshTransition] = useTransition();
  const [syncAllPending, startSyncAllTransition] = useTransition();
  const [syncAllResult, setSyncAllResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function fetchApiMatches() {
    setApiError(null);
    startApiTransition(async () => {
      const options =
        apiSource === "today"  ? { date: fixtureDate } :
        apiSource === "recent" ? { fromDate: historyFrom, toDate: historyTo } :
        undefined;
      const res = await actionListApiMatches(apiSource, options);
      if (res.success) setApiMatches(res.matches);
      else setApiError(res.error ?? "Error al consultar livescore-api");
    });
  }

  function handleSyncAll() {
    setSyncAllResult(null);
    startSyncAllTransition(async () => {
      const res = await actionSyncAll();
      if (res.success) {
        const errDetail = res.errors.length ? `\n${res.errors.join("\n")}` : "";
        setSyncAllResult({ ok: res.errors.length === 0, msg: `${res.synced} partido(s) sincronizado(s)${res.errors.length ? ` · ${res.errors.length} error(es):${errDetail}` : ""}` });
        refreshImported();
      } else {
        setSyncAllResult({ ok: false, msg: res.error ?? "Error desconocido" });
      }
    });
  }

  function refreshImported() {
    startRefreshTransition(async () => {
      const res = await actionListImportedMatches();
      if (res.success) setImported(res.matches as ImportedMatch[]);
    });
  }

  async function handleImport(externalId: string): Promise<string> {
    const res = await actionImportMatch(externalId);
    refreshImported();
    if (res.success) return `Importado · match_id: ${res.matchId} · ${res.isNew ? "nuevo" : "actualizado"}`;
    return `Error: ${res.error}`;
  }

  const filteredApi = apiMatches.filter((m) =>
    !filter ||
    m.home_name.toLowerCase().includes(filter.toLowerCase()) ||
    m.away_name.toLowerCase().includes(filter.toLowerCase()) ||
    m.competition_name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(["partidos", "usuarios"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors capitalize ${
              activeTab === tab
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab === "partidos" ? "Partidos" : "Usuarios"}
          </button>
        ))}
      </div>

      {activeTab === "usuarios" && <UsersSection />}

      {activeTab === "partidos" && <>

      {/* ── Sección 1: Livescore-api ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">
            Fuente: Livescore-API
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Buscá un partido real y presioná Importar para cargarlo en la DB.
          </p>
        </div>

        <div className="px-4 py-3 flex flex-wrap gap-2 items-center border-b border-slate-50 dark:border-slate-800/50">
          {(["live", "today", "recent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setApiSource(s); setApiMatches([]); setApiError(null); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                apiSource === s
                  ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s === "live" ? "En vivo ahora" : s === "today" ? "Fixtures" : "Por rango de fechas"}
            </button>
          ))}

          {/* Fecha para fixtures */}
          {apiSource === "today" && (
            <input
              type="date"
              value={fixtureDate}
              onChange={(e) => setFixtureDate(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-wc-red/30 text-slate-800 dark:text-slate-100"
            />
          )}

          {/* Rango de fechas para resultados */}
          {apiSource === "recent" && (
            <>
              <input
                type="date"
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-wc-red/30 text-slate-800 dark:text-slate-100"
              />
              <span className="text-xs text-slate-400">→</span>
              <input
                type="date"
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-wc-red/30 text-slate-800 dark:text-slate-100"
              />
            </>
          )}

          <button
            onClick={fetchApiMatches}
            disabled={apiLoading}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-wc-red text-white hover:bg-red-700 disabled:opacity-40 transition-opacity"
          >
            {apiLoading ? "Consultando…" : "Consultar API"}
          </button>
        </div>

        {apiMatches.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800/50">
            <input
              type="text"
              placeholder="Filtrar por equipo o competencia…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-wc-red/30 text-slate-800 dark:text-slate-100"
            />
          </div>
        )}

        <div className="px-4 pb-2">
          {apiError && (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {apiError}
            </div>
          )}
          {!apiLoading && apiMatches.length === 0 && !apiError && (
            <p className="text-sm text-slate-400 py-4 text-center">
              Seleccioná una fuente y presioná "Consultar API".
            </p>
          )}
          {filteredApi.map((m) => (
            <ApiMatchRow key={m.id} match={m} onImport={handleImport} />
          ))}
          {apiMatches.length > 0 && filteredApi.length === 0 && (
            <p className="text-sm text-slate-400 py-3 text-center">Sin resultados para "{filter}".</p>
          )}
          {apiMatches.length > 0 && (
            <p className="text-xs text-slate-400 py-2 text-right">
              {filteredApi.length} de {apiMatches.length} partidos
            </p>
          )}
        </div>
      </div>

      {/* ── Sección 2: Partidos importados en DB ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">
              Partidos en DB con external_api_id
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sincronizá el marcador o procesá puntos cuando el partido termine.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleSyncAll}
              disabled={syncAllPending || refreshing}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
            >
              {syncAllPending ? "Sincronizando…" : "⚡ Sync todos activos"}
            </button>
            <button
              onClick={refreshImported}
              disabled={refreshing || syncAllPending}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              {refreshing ? "…" : "↻ Actualizar"}
            </button>
          </div>
        </div>
        {syncAllResult && (
          <div className="px-4 pt-2">
            <ResultBox ok={syncAllResult.ok} msg={syncAllResult.msg} />
          </div>
        )}
        <div className="px-4 pb-2">
          {imported.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              No hay partidos importados todavía. Importá uno desde la sección de arriba.
            </p>
          ) : (
            imported.map((m) => (
              <ImportedMatchRow key={m.id} match={m} onRefresh={refreshImported} />
            ))
          )}
        </div>
      </div>

      {/* ── Leyenda ── */}
      <div className="text-xs text-slate-400 dark:text-slate-500 space-y-1 px-1">
        <p><strong>Sincronizar</strong> — actualiza status, marcador y minuto desde livescore-api.</p>
        <p><strong>Procesar puntos</strong> — calcula puntos de todos los pronósticos (solo partidos Finalizados).</p>
        <p>Los partidos con badge <strong>TEST</strong> usan <code>group_name=TEST</code> y aparecen en la página de Partidos.</p>
      </div>

      </>}
    </div>
  );
}
