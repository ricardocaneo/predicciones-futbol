"use client";

import { useActionState, useEffect, useState } from "react";
import { savePrediction } from "@/app/actions/predictions";
import type { Prediction } from "@/lib/types";
import TeamFlag from "./TeamFlag";
import { teamToCountryCode } from "@/lib/country-codes";

interface PredictionFormProps {
  matchId: string;
  mode: "regular" | "live";
  existing?: Prediction;
  onSaved?: () => void;
  phase?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

export default function PredictionForm({
  matchId, mode, existing, onSaved,
  phase, homeTeamId, awayTeamId, homeTeamName, awayTeamName,
}: PredictionFormProps) {
  const [home, setHome] = useState(existing?.homeScore ?? 0);
  const [away, setAway] = useState(existing?.awayScore ?? 0);
  const [flash, setFlash] = useState(false);
  const [advancingTeamId, setAdvancingTeamId] = useState<string | null>(
    existing?.advancingTeamId ?? null
  );
  const [savedAdvancingTeamId, setSavedAdvancingTeamId] = useState<string | null>(
    existing?.advancingTeamId ?? null
  );
  const [showAdvanceWarning, setShowAdvanceWarning] = useState(false);

  const [state, formAction, isPending] = useActionState(savePrediction, null);

  const isKnockout = !!phase && phase !== "group";
  const isDraw = home === away;
  const isUUID = (id?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id ?? "");

  // Auto-set advancing team cuando el marcador es decisivo
  useEffect(() => {
    if (!isKnockout || !isUUID(homeTeamId) || !isUUID(awayTeamId)) return;
    if (home > away) setAdvancingTeamId(homeTeamId!);
    else if (away > home) setAdvancingTeamId(awayTeamId!);
    // si empate: mantiene la selección previa
  }, [home, away, isKnockout, homeTeamId, awayTeamId]);

  useEffect(() => {
    if (state?.success) {
      onSaved?.();
      setFlash(true);
      setShowAdvanceWarning(false);
      setSavedAdvancingTeamId(advancingTeamId);
      const t = setTimeout(() => setFlash(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  function clamp(val: number) {
    return Math.max(0, Math.min(20, val));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (isKnockout && isDraw && !advancingTeamId) {
      e.preventDefault();
      setShowAdvanceWarning(true);
    }
  }

  const isLive = mode === "live";
  const isEdit = !!existing || !!state?.success;
  const showPicker = isKnockout && isUUID(homeTeamId) && isUUID(awayTeamId) && !!homeTeamName && !!awayTeamName;

  return (
    <div>
      {isLive && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 leading-snug">
          ⚠️ Si guardas este pronóstico renuncias a la matriz tradicional. Solo ganarás puntos con marcador exacto final.
        </p>
      )}
      <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input type="hidden" name="match_id"   value={matchId} />
        <input type="hidden" name="mode"       value={mode} />
        <input type="hidden" name="home_score" value={home} />
        <input type="hidden" name="away_score" value={away} />
        {showPicker && (
          <input type="hidden" name="advancing_team_id" value={advancingTeamId ?? ""} />
        )}

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
            {isLive ? "Cambio en vivo:" : "Tu pronóstico:"}
          </span>
          <div className="flex items-center gap-2">
            <ScoreInput value={home} onChange={(v) => setHome(clamp(v))} />
            <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
            <ScoreInput value={away} onChange={(v) => setAway(clamp(v))} />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={`ml-auto shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
              flash
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                : isLive
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-wc-red text-white hover:bg-wc-red-dark"
            }`}
          >
            {isPending ? "Guardando…" : flash ? "¡Guardado!" : isLive ? "Cambiar en vivo" : isEdit ? "Modificar" : "Guardar"}
          </button>
        </div>

        {/* Picker de quién avanza — solo en eliminatorias */}
        {showPicker && (
          <div className={`rounded-xl border px-3 py-2 transition-colors ${
            showAdvanceWarning
              ? "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/10"
              : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
          }`}>
            <p className="text-xs mb-2">
              {showAdvanceWarning ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ← Elige quién avanza para ganar el bono
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">¿Quién avanza?</span>
              )}
            </p>
            <div className="flex gap-2">
              <AdvanceButton
                teamName={homeTeamName!}
                selected={advancingTeamId === homeTeamId}
                disabled={!isDraw}
                saved={advancingTeamId === homeTeamId && savedAdvancingTeamId === homeTeamId}
                onClick={() => setAdvancingTeamId(homeTeamId!)}
              />
              <AdvanceButton
                teamName={awayTeamName!}
                selected={advancingTeamId === awayTeamId}
                disabled={!isDraw}
                saved={advancingTeamId === awayTeamId && savedAdvancingTeamId === awayTeamId}
                onClick={() => setAdvancingTeamId(awayTeamId!)}
              />
            </div>
          </div>
        )}
      </form>

      {state?.error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{state.error}</p>
      )}
    </div>
  );
}

function AdvanceButton({
  teamName, selected, disabled, saved, onClick,
}: {
  teamName: string;
  selected: boolean;
  disabled: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
        selected && saved
          ? "border-green-500 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-900/20 dark:text-green-400"
          : selected
          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400"
          : disabled
          ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
      }`}
    >
      <TeamFlag countryCode={teamToCountryCode(teamName)} name={teamName} size={14} shape="rect" />
      <span className="truncate">{teamName}</span>
    </button>
  );
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold leading-none transition-colors"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums select-none">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold leading-none transition-colors"
      >
        +
      </button>
    </div>
  );
}
