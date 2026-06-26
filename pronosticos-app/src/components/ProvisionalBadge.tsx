"use client";

import { useState, useEffect, useRef } from "react";
import TeamFlag from "./TeamFlag";
import { teamToCountryCode } from "@/lib/country-codes";

export default function ProvisionalBadge({
  points,
  homeTeam,
  awayTeam,
  predHomeScore,
  predAwayScore,
}: {
  points: number;
  homeTeam: string;
  awayTeam: string;
  predHomeScore: number | null;
  predAwayScore: number | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const hasPoints = points > 0;

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className={`text-xs font-bold tabular-nums transition-colors ${
          hasPoints
            ? "text-green-500 hover:text-green-400"
            : "text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400"
        }`}
      >
        +{points}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 z-20 bg-slate-800 dark:bg-slate-700 text-white rounded-xl px-3 py-2 shadow-xl whitespace-nowrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <TeamFlag countryCode={teamToCountryCode(homeTeam)} name={homeTeam} size={12} />
            <span>{homeTeam}</span>
            <span>vs</span>
            <TeamFlag countryCode={teamToCountryCode(awayTeam)} name={awayTeam} size={12} />
            <span>{awayTeam}</span>
          </div>
          {predHomeScore !== null ? (
            <p className="font-bold text-center text-sm text-white">
              {predHomeScore} - {predAwayScore}
            </p>
          ) : (
            <p className="text-slate-400 italic text-center">Sin pronóstico</p>
          )}
          {/* pequeño triángulo apuntando hacia abajo */}
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
        </div>
      )}
    </span>
  );
}
