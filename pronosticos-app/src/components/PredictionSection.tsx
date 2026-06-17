"use client";

import { useState, useCallback } from "react";
import PredictionForm from "./PredictionForm";
import type { Prediction, PointsResult, MatchStatus } from "@/lib/types";
import { LIVE_WINDOW_MINUTES } from "@/lib/scoring-rules";

function PointsBadge({ points, isProvisional }: { points: number; isProvisional: boolean }) {
  const color =
    points >= 10 ? "text-green-500" :
    points >= 5  ? "text-green-500" :
    points >= 3  ? "text-amber-500" :
    points > 0   ? "text-amber-500" :
                   "text-slate-400";
  return (
    <span className={`text-sm font-bold tabular-nums shrink-0 ${color}`}>
      {points > 0 ? `+${points}` : "0"} pts{isProvisional ? " *" : ""}
    </span>
  );
}

interface PredictionSectionProps {
  matchId:        string;
  status:         MatchStatus;
  minute?:        number;
  prediction?:    Prediction;
  pointsResult:   PointsResult | null;
  isOwnPrediction: boolean;
  canRegular:     boolean;
  canLive:        boolean;
  allowPrediction: boolean;
}

export default function PredictionSection({
  matchId, status, minute, prediction, pointsResult,
  isOwnPrediction, canRegular, canLive, allowPrediction,
}: PredictionSectionProps) {
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSaved = useCallback(() => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 5000);
  }, []);

  return (
    <>
      {/* Predicción guardada */}
      {prediction && (
        <div className="mt-3 -mx-4 px-4 pt-2.5 pb-2.5 border-t border-green-100 dark:border-green-900/40 bg-green-50/60 dark:bg-green-950/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {pointsResult ? (
                pointsResult.scoringMode === "live" ? (
                  <span className="shrink-0 text-xs font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                    EN VIVO
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    PRE-PARTIDO
                  </span>
                )
              ) : prediction.isLive ? (
                <span className="shrink-0 text-xs font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                  EN VIVO
                </span>
              ) : null}
              <span className="shrink-0 text-xs font-bold text-green-700 dark:text-green-400">
                {isOwnPrediction ? "Tu pronóstico:" : "Pronóstico:"}
              </span>
              <span className="font-black text-slate-800 dark:text-white text-base tabular-nums shrink-0">
                {prediction.homeScore} - {prediction.awayScore}
              </span>
              {savedMsg && (
                <span
                  className="text-xs text-green-600 dark:text-green-400 truncate"
                  style={{ animation: "slide-bounce 0.55s ease-out forwards" }}
                >
                  ← tu pronóstico fue guardado aquí
                </span>
              )}
            </div>
            {pointsResult && (
              <PointsBadge points={pointsResult.totalPoints} isProvisional={pointsResult.isProvisional} />
            )}
          </div>
          {pointsResult && pointsResult.breakdown.category !== "none" && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {pointsResult.explanation}
            </p>
          )}
          {pointsResult && pointsResult.breakdown.category === "none" && status === "finished" && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Sin puntos en este partido
            </p>
          )}
          {pointsResult?.isProvisional && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              * Puntos provisorios — partido en curso
            </p>
          )}
        </div>
      )}

      {/* Ventana regular */}
      {canRegular && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Pronóstico abierto · cierra al inicio del partido
            </span>
          </div>
          <PredictionForm matchId={matchId} mode="regular" existing={prediction} onSaved={handleSaved} />
        </div>
      )}

      {/* Ventana en vivo */}
      {canLive && (
        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 -mx-4 px-4 pb-1">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Ventana en vivo · min {minute}/{LIVE_WINDOW_MINUTES}
            </span>
          </div>
          <PredictionForm
            matchId={matchId}
            mode="live"
            existing={prediction?.isLive ? prediction : undefined}
            onSaved={handleSaved}
          />
        </div>
      )}

      {/* Ventana en vivo cerrada */}
      {status === "live" && !canLive && allowPrediction && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            🔒 Ventana en vivo cerrada · min {minute}&apos;
          </span>
        </div>
      )}

      {/* Sin pronóstico en partido en vivo */}
      {status === "live" && !prediction && !canLive && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400 text-center">
            No hiciste un pronóstico para este partido
          </p>
        </div>
      )}
    </>
  );
}
