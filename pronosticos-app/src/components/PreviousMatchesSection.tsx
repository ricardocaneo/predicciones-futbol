"use client";

import { useState } from "react";
import type { Match, Prediction } from "@/lib/types";
import MatchCard from "./MatchCard";

interface Props {
  matches: Match[];
  predictions: Record<string, Prediction>;
  allowPrediction: boolean;
}

export default function PreviousMatchesSection({ matches, predictions, allowPrediction }: Props) {
  const [open, setOpen] = useState(false);

  if (matches.length === 0) return null;

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <span>Anteriores</span>
        <span className="text-xs">{open ? "▲" : "▼"}</span>
        <span className="ml-1 text-xs font-normal normal-case text-slate-400 dark:text-slate-500">
          ({matches.length})
        </span>
      </button>

      {open && (
        <div className="space-y-3 mt-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictions[match.id]}
              allowPrediction={allowPrediction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
