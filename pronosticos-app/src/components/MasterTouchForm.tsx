"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Team, Player, MasterTouch } from "@/lib/types";
import TeamFlag from "./TeamFlag";
import { saveToqueMaestro, type ToqueMaestroState } from "@/app/actions/toque-maestro";
import { MASTER_TOUCH_POINTS } from "@/lib/scoring-rules";

interface MasterTouchFormProps {
  teams:         Team[];
  players:       Player[];
  initial:       MasterTouch;
  canEdit:       boolean;
  lockDateLabel: string;
}

export default function MasterTouchForm({
  teams, players, initial, canEdit, lockDateLabel,
}: MasterTouchFormProps) {
  const [state, formAction, isPending] = useActionState<ToqueMaestroState, FormData>(
    saveToqueMaestro, null,
  );

  const [championId,   setChampionId]   = useState(initial.championTeamId     ?? "");
  const [runnerUpId,   setRunnerUpId]   = useState(initial.runnerUpTeamId     ?? "");
  const [goldenBootId, setGoldenBootId] = useState(initial.goldenBootPlayerId ?? "");

  const champion = teams.find((t) => t.id === championId);
  const runnerUp = teams.find((t) => t.id === runnerUpId);

  return (
    <form action={formAction} className="space-y-5">
      {/* Lock status */}
      <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
        canEdit
          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      }`}>
        <span>{canEdit ? "🟢" : "🔒"}</span>
        <span>
          {canEdit
            ? `Editable hasta el ${lockDateLabel}`
            : `Bloqueado desde el ${lockDateLabel}`}
        </span>
      </div>

      {/* Campeón */}
      <TeamPickerField
        label="Campeón del Mundo"
        points={MASTER_TOUCH_POINTS.champion}
        name="champion_team_id"
        value={championId}
        onChange={setChampionId}
        options={teams.filter((t) => t.id !== runnerUpId)}
        disabled={!canEdit}
        selectedTeam={champion}
      />

      {/* Subcampeón */}
      <TeamPickerField
        label="Subcampeón"
        points={MASTER_TOUCH_POINTS.runnerUp}
        name="runner_up_team_id"
        value={runnerUpId}
        onChange={setRunnerUpId}
        options={teams.filter((t) => t.id !== championId)}
        disabled={!canEdit}
        selectedTeam={runnerUp}
      />

      {/* Bota de Oro */}
      <GoldenBootField
        teams={teams}
        players={players}
        value={goldenBootId}
        onChange={setGoldenBootId}
        disabled={!canEdit}
      />

      {/* Casi Casi */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p className="font-semibold text-slate-600 dark:text-slate-300">
          Bono &ldquo;Casi Casi&rdquo; +{MASTER_TOUCH_POINTS.casiCasi} pts
        </p>
        <p>Si tu campeón y subcampeón quedan invertidos en el resultado real, recibís {MASTER_TOUCH_POINTS.casiCasi} pts adicionales.</p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400 font-medium">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">¡Toque Maestro guardado!</p>
      )}

      {canEdit && (
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors bg-wc-red text-white hover:bg-wc-red-dark disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Guardando…" : "Guardar Toque Maestro"}
        </button>
      )}
    </form>
  );
}

// ── Selector de equipo con dropdown custom + banderas ─────────────────────────

function TeamPickerField({
  label, points, name, value, onChange, options, disabled, selectedTeam,
}: {
  label:         string;
  points:        number;
  name:          string;
  value:         string;
  onChange:      (v: string) => void;
  options:       Team[];
  disabled:      boolean;
  selectedTeam?: Team;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
        <span className="text-xs text-wc-gold font-bold">+{points} pts</span>
      </div>
      <input type="hidden" name={name} value={value} />
      <TeamDropdown
        teams={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        selectedTeam={selectedTeam}
        placeholder="— Seleccionar selección —"
      />
    </div>
  );
}

// ── Dropdown de equipos con banderas ──────────────────────────────────────────

function TeamDropdown({
  teams, value, onChange, disabled, selectedTeam, placeholder,
}: {
  teams:          Team[];
  value:          string;
  onChange:       (v: string) => void;
  disabled:       boolean;
  selectedTeam?:  Team;
  placeholder:    string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-2 w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed text-left"
      >
        {selectedTeam ? (
          <>
            <TeamFlag countryCode={selectedTeam.countryCode} name={selectedTeam.name} size={20} />
            <span className="flex-1 text-slate-800 dark:text-slate-100">{selectedTeam.name}</span>
          </>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="flex items-center px-3 py-2.5 w-full text-left text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700"
          >
            {placeholder}
          </button>
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onChange(t.id); setOpen(false); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 w-full text-left text-sm border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors
                ${t.id === value
                  ? "bg-wc-navy text-white"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
            >
              <TeamFlag countryCode={t.countryCode} name={t.name} size={20} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bota de Oro: búsqueda + filtro por equipo + lista con banderas ─────────────

function GoldenBootField({
  teams, players, value, onChange, disabled,
}: {
  teams:    Team[];
  players:  Player[];
  value:    string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [search,       setSearch]       = useState("");
  const [filterTeamId, setFilterTeamId] = useState("");
  const [teamOpen,     setTeamOpen]     = useState(false);
  const teamRef = useRef<HTMLDivElement>(null);

  const selectedPlayer = players.find((p) => p.id === value);
  const filterTeam     = teams.find((t) => t.id === filterTeamId);

  useEffect(() => {
    if (!teamOpen) return;
    function handler(e: MouseEvent) {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) setTeamOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [teamOpen]);

  const filtered = players.filter((p) => {
    if (p.id === value) return true;
    const matchTeam = !filterTeamId || p.teamId === filterTeamId;
    const matchName = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchTeam && matchName;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Bota de Oro
        </label>
        <span className="text-xs text-wc-gold font-bold">+{MASTER_TOUCH_POINTS.goldenBoot} pts</span>
      </div>

      {/* Jugador seleccionado */}
      {selectedPlayer && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-wc-navy/5 dark:bg-slate-800 rounded-lg border border-wc-navy/10 dark:border-slate-700">
          <TeamFlag countryCode={selectedPlayer.countryCode} name={selectedPlayer.name} size={20} />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">
            {selectedPlayer.name}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Filtros */}
      {!disabled && (
        <div className="flex gap-2 mb-2">
          {/* Búsqueda por nombre */}
          <input
            type="text"
            placeholder="Buscar jugador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 placeholder:text-slate-400"
          />

          {/* Filtro por equipo con bandera */}
          <div ref={teamRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setTeamOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 h-full"
            >
              {filterTeam ? (
                <TeamFlag countryCode={filterTeam.countryCode} name={filterTeam.name} size={18} />
              ) : (
                <span className="text-slate-400 text-xs">Equipo</span>
              )}
              <span className="text-slate-400 text-xs">{teamOpen ? "▲" : "▼"}</span>
            </button>

            {teamOpen && (
              <div className="absolute right-0 z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                <button
                  type="button"
                  onClick={() => { setFilterTeamId(""); setTeamOpen(false); }}
                  className="flex items-center px-3 py-2.5 w-full text-left text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700"
                >
                  Todos los equipos
                </button>
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setFilterTeamId(t.id); setTeamOpen(false); }}
                    className={`flex items-center gap-2.5 px-3 py-2 w-full text-left text-sm border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors
                      ${t.id === filterTeamId
                        ? "bg-wc-navy text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      }`}
                  >
                    <TeamFlag countryCode={t.countryCode} name={t.name} size={18} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de jugadores */}
      <input type="hidden" name="golden_boot_player_id" value={value} />
      <div className="h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">
            {search ? `Sin resultados para "${search}"` : "Sin jugadores"}
          </p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => !disabled && onChange(p.id === value ? "" : p.id)}
              disabled={disabled}
              className={`flex items-center gap-2.5 px-3 py-2.5 w-full text-left border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors
                ${p.id === value
                  ? "bg-wc-navy text-white"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                } disabled:cursor-default`}
            >
              <TeamFlag countryCode={p.countryCode} name={p.name} size={18} />
              <span className="text-sm">{p.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
