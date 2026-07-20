"use client";

import { useEffect, useRef, useState } from "react";
import type { MasterTouchBreakdownEntry } from "@/types";

export default function MasterTouchBadge({
  points,
  breakdown,
}: {
  points: number;
  breakdown: MasterTouchBreakdownEntry | undefined;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const hasPoints = points > 0;
  const hasSubmission = breakdown !== undefined;

  const rows: { label: string; pts: number }[] = breakdown
    ? [
        { label: "Campeón", pts: breakdown.champion },
        { label: "Subcampeón", pts: breakdown.runner_up },
        { label: "Bota de Oro", pts: breakdown.golden_boot },
        { label: "Casi Casi", pts: breakdown.casi_casi },
      ]
    : [];

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
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
        <div className="absolute bottom-full right-0 mb-2 z-30 bg-slate-800 dark:bg-slate-700 text-white rounded-xl px-3 py-2.5 shadow-xl whitespace-nowrap text-xs min-w-40">
          <p className="text-slate-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wide">Toque Maestro</p>
          {hasSubmission ? (
            <>
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 py-0.5">
                  <span className="text-slate-300">{r.label}</span>
                  <span className={r.pts > 0 ? "text-amber-400 font-bold" : "text-slate-500"}>
                    {r.pts > 0 ? `+${r.pts}` : "—"}
                  </span>
                </div>
              ))}
              <div className="flex justify-between gap-4 pt-1.5 mt-1 border-t border-slate-600">
                <span className="text-slate-300 font-semibold">Total</span>
                <span className={hasPoints ? "text-amber-300 font-black" : "text-slate-400 font-bold"}>
                  {hasPoints ? `+${breakdown!.total}` : "0 pts"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-slate-400 italic">No hizo pronóstico</p>
          )}
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
        </div>
      )}
    </span>
  );
}
