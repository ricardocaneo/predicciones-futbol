"use client";

import { useEffect, useRef, useState } from "react";
import type { MasterTouchBreakdownEntry } from "@/types";
import TeamFlag from "./TeamFlag";
import { teamToCountryCode } from "@/lib/country-codes";

export default function MasterTouchBadge({
  points,
  breakdown,
}: {
  points: number;
  breakdown: MasterTouchBreakdownEntry | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [showBelow, setShowBelow] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const TOOLTIP_H = 230;
      const below = rect.top < TOOLTIP_H;
      setShowBelow(below);
      setTooltipStyle(
        below
          ? { position: "fixed", top: rect.bottom + 6, right: window.innerWidth - rect.right }
          : { position: "fixed", bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right }
      );
    }
    setOpen(true);
  }

  const hasPoints = points > 0;
  const hasSubmission = breakdown !== undefined;

  const pickRows: { label: string; pick: string | null; flagTeam: string | null; pts: number; correct: boolean }[] = breakdown
    ? [
        { label: "Campeón",    pick: breakdown.picks?.champion    ?? null, flagTeam: breakdown.picks?.champion    ?? null, pts: breakdown.champion,    correct: breakdown.champion    > 0 },
        { label: "Subcampeón", pick: breakdown.picks?.runner_up   ?? null, flagTeam: breakdown.picks?.runner_up   ?? null, pts: breakdown.runner_up,   correct: breakdown.runner_up   > 0 },
        { label: "Bota de Oro",pick: breakdown.picks?.golden_boot ?? null, flagTeam: breakdown.picks?.golden_boot_team ?? null, pts: breakdown.golden_boot, correct: breakdown.golden_boot > 0 },
      ]
    : [];

  return (
    <span ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={`text-sm font-bold tabular-nums transition-colors ${
          hasPoints
            ? "text-amber-500 hover:text-amber-400"
            : "text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400"
        }`}
        title="Toque Maestro — ver detalle"
      >
        {hasPoints ? points : "—"}
      </button>

      {open && (
        <div style={tooltipStyle} className="z-50 bg-slate-800 dark:bg-slate-700 text-white rounded-xl px-3 py-2.5 shadow-xl whitespace-nowrap text-xs min-w-40">
          <p className="text-slate-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wide">🎯 Toque Maestro</p>
          {hasSubmission ? (
            <>
              {/* Picks del usuario */}
              <div className="space-y-0.5 mb-2">
                {pickRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-[10px] w-16 shrink-0">{r.label}</span>
                    <span className={`flex items-center gap-1 flex-1 justify-end ${r.correct ? "text-white" : "text-slate-400"}`}>
                      {r.pick ?? <em className="text-slate-600">sin pick</em>}
                      {r.flagTeam && (
                        <TeamFlag countryCode={teamToCountryCode(r.flagTeam)} name={r.flagTeam} size={13} />
                      )}
                    </span>
                    <span className="text-[11px] w-4 text-center">
                      {r.correct ? "✓" : ""}
                    </span>
                  </div>
                ))}
              </div>
              {/* Puntos */}
              <div className="border-t border-slate-600 pt-1.5 space-y-0.5">
                {pickRows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-4">
                    <span className="text-slate-500 text-[10px]">{r.label}</span>
                    <span className={r.pts > 0 ? "text-amber-400 font-bold" : "text-slate-600"}>
                      {r.pts > 0 ? `+${r.pts}` : "—"}
                    </span>
                  </div>
                ))}
                {breakdown!.casi_casi > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 text-[10px]">Casi Casi</span>
                    <span className="text-amber-400 font-bold">+{breakdown!.casi_casi}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4 pt-1 mt-0.5 border-t border-slate-700">
                  <span className="text-slate-300 font-semibold text-[11px]">Total</span>
                  <span className={hasPoints ? "text-amber-300 font-black" : "text-slate-400 font-bold"}>
                    {hasPoints ? `+${breakdown!.total}` : "0 pts"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-400 italic">No hizo pronóstico</p>
          )}
          {showBelow
            ? <span className="absolute bottom-full right-3 border-4 border-transparent border-b-slate-800 dark:border-b-slate-700" />
            : <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
          }
        </div>
      )}
    </span>
  );
}
