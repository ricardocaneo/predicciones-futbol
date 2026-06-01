"use client";

import { useState } from "react";
import LiveMatchPanel from "./LiveMatchPanel";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export default function FinishedMatchEvents({ matchId, homeTeam, awayTeam }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
        <span>Eventos del partido</span>
      </button>
      {open && (
        <LiveMatchPanel matchId={matchId} homeTeam={homeTeam} awayTeam={awayTeam} />
      )}
    </div>
  );
}
