import type { Match, Prediction } from "@/lib/types";
import { calculateMatchPoints, canEditRegularPrediction, canEditLivePrediction } from "@/lib/scoring";
import { getMatchResult } from "@/lib/mock-data";
import { LIVE_WINDOW_MINUTES, PHASE_LABELS } from "@/lib/scoring-rules";
import StatusBadge from "./StatusBadge";
import PredictionForm from "./PredictionForm";
import TeamFlag from "./TeamFlag";
import LiveMatchPanel from "./LiveMatchPanel";
import FinishedMatchEvents from "./FinishedMatchEvents";
import Link from "next/link";

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  allowPrediction?: boolean;
  isOwnPrediction?: boolean;
}

function PointsBadge({ points, isProvisional }: { points: number; isProvisional: boolean }) {
  const color =
    points >= 10 ? "text-green-500" :
    points >= 5  ? "text-green-500" :
    points >= 3  ? "text-amber-500" :
    points > 0   ? "text-amber-500" :
                   "text-slate-400";
  return (
    <span className={`text-sm font-bold tabular-nums ${color}`}>
      {points > 0 ? `+${points}` : "0"} pts{isProvisional ? " *" : ""}
    </span>
  );
}

function LiveWindowBanner({ minute }: { minute: number }) {
  const remaining = LIVE_WINDOW_MINUTES - minute;
  return (
    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 -mx-4 px-4 pb-2 rounded-b-2xl">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Ventana en vivo abierta · min {minute}/{LIVE_WINDOW_MINUTES} · quedan {remaining} min
        </span>
      </div>
      <PredictionForm matchId="" mode="live" />
    </div>
  );
}

function TeamCell({ team, size = 48 }: { team: Match["homeTeam"]; size?: number }) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(team.id);
  const inner = (
    <>
      <TeamFlag countryCode={team.countryCode} name={team.name} size={size} />
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
        {team.name}
      </span>
    </>
  );
  if (isUUID) {
    return (
      <Link href={`/equipos/${team.id}`} className="flex flex-col items-center gap-2 hover:opacity-75 transition-opacity">
        {inner}
      </Link>
    );
  }
  return <div className="flex flex-col items-center gap-2">{inner}</div>;
}

export default function MatchCard({ match, prediction, allowPrediction, isOwnPrediction = true }: MatchCardProps) {
  const { homeTeam, awayTeam, status, homeScore, awayScore, date, time, competition, round, phase, minute } = match;

  const canRegular = allowPrediction && canEditRegularPrediction(match);
  const canLive = allowPrediction && canEditLivePrediction(match);
  const result = getMatchResult(match);
  const pointsResult =
    prediction && result !== null
      ? calculateMatchPoints(match, prediction, result)
      : null;

  const formattedDate = new Date(`${date}T${time}`).toLocaleDateString("es", {
    weekday: "short", day: "numeric", month: "short", timeZone: "America/Santiago",
  });

  const isKnockout = phase !== "group";

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border ${
      prediction
        ? "border-slate-200 dark:border-slate-800 border-l-[3px] border-l-green-400 dark:border-l-green-600"
        : "border-slate-200 dark:border-slate-800"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {competition} · {PHASE_LABELS[phase]}
          </span>
          {round !== PHASE_LABELS[phase] && (
            <span className="text-xs text-slate-300 dark:text-slate-600">{round}</span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Scoreboard */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex flex-col items-center text-center">
            <TeamCell team={homeTeam} />
          </div>

          <div className="flex flex-col items-center gap-1 min-w-22.5">
            {status === "scheduled" ? (
              <div className="text-center">
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{time}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{formattedDate}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-2xl font-black tabular-nums text-slate-800 dark:text-white">
                <span>{homeScore}</span>
                <span className="text-slate-300 dark:text-slate-600 text-lg font-normal">-</span>
                <span>{awayScore}</span>
              </div>
            )}
            {status === "live" && minute !== undefined && (
              <span className="text-xs text-green-500 font-semibold">Min {minute}&apos;</span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center text-center">
            <TeamCell team={awayTeam} />
          </div>
        </div>

        {isKnockout && status !== "finished" && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
            Eliminación directa · tiempo reglamentario + prórroga (sin penales)
          </p>
        )}

        {/* Live match panel: estimated clock + events (reads from Supabase via /api/live-match/:id) */}
        {status === "live" && (
          <LiveMatchPanel
            matchId={match.id}
            homeTeam={homeTeam.name}
            awayTeam={awayTeam.name}
          />
        )}

        {/* Finished match: collapsible events log */}
        {status === "finished" && (
          <FinishedMatchEvents
            matchId={match.id}
            homeTeam={homeTeam.name}
            awayTeam={awayTeam.name}
          />
        )}

        {/* Current prediction + points */}
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
                <span className="shrink-0 text-xs font-bold text-green-700 dark:text-green-400">{isOwnPrediction ? "Tu pronóstico:" : "Pronóstico:"}</span>
                <span className="font-black text-slate-800 dark:text-white text-base tabular-nums">
                  {prediction.homeScore} - {prediction.awayScore}
                </span>
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

        {/* Regular prediction window */}
        {canRegular && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Pronóstico abierto · cierra al inicio del partido
              </span>
            </div>
            <PredictionForm matchId={match.id} mode="regular" existing={prediction} />
          </div>
        )}

        {/* Live prediction window */}
        {canLive && (
          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 -mx-4 px-4 pb-1">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Ventana en vivo · min {minute}/{LIVE_WINDOW_MINUTES}
              </span>
            </div>
            <PredictionForm
              matchId={match.id}
              mode="live"
              existing={prediction?.isLive ? prediction : undefined}
            />
          </div>
        )}

        {/* Live window closed */}
        {status === "live" && !canLive && allowPrediction && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                🔒 Ventana en vivo cerrada · min {minute}&apos;
              </span>
            </div>
          </div>
        )}

        {/* No prediction on a live match */}
        {status === "live" && !prediction && !canLive && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 text-center">
              No hiciste un pronóstico para este partido
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
