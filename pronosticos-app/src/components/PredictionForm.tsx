"use client";

import { useActionState, useEffect, useState } from "react";
import { savePrediction } from "@/app/actions/predictions";
import type { Prediction } from "@/lib/types";

interface PredictionFormProps {
  matchId: string;
  mode: "regular" | "live";
  existing?: Prediction;
}

export default function PredictionForm({ matchId, mode, existing }: PredictionFormProps) {
  const [home, setHome] = useState(existing?.homeScore ?? 0);
  const [away, setAway] = useState(existing?.awayScore ?? 0);
  const [flash, setFlash] = useState(false);

  const [state, formAction, isPending] = useActionState(savePrediction, null);

  useEffect(() => {
    if (state?.success) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  function clamp(val: number) {
    return Math.max(0, Math.min(20, val));
  }

  const isLive = mode === "live";

  return (
    <div>
      {isLive && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 leading-snug">
          ⚠️ Si guardas este pronóstico renuncias a la matriz tradicional. Solo ganarás puntos con marcador exacto final.
        </p>
      )}
      <form action={formAction} className="flex items-center gap-3">
        <input type="hidden" name="match_id"   value={matchId} />
        <input type="hidden" name="mode"       value={mode} />
        <input type="hidden" name="home_score" value={home} />
        <input type="hidden" name="away_score" value={away} />

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
          {isPending ? "Guardando…" : flash ? "¡Guardado!" : isLive ? "Cambiar en vivo" : "Guardar"}
        </button>
      </form>

      {state?.error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{state.error}</p>
      )}
    </div>
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
