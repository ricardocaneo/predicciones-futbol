import type { Match, Prediction } from "@/lib/types";
import { calculateMatchPoints, canEditRegularPrediction, canEditLivePrediction } from "@/lib/scoring";
import { getMatchResult } from "@/lib/mock-data";
import { PHASE_LABELS } from "@/lib/scoring-rules";
import StatusBadge from "./StatusBadge";
import PredictionSection from "./PredictionSection";
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

        {(prediction || canRegular || canLive || status === "live") && (
          <PredictionSection
            matchId={match.id}
            status={status}
            minute={minute}
            prediction={prediction}
            pointsResult={pointsResult}
            isOwnPrediction={isOwnPrediction}
            canRegular={!!canRegular}
            canLive={!!canLive}
            allowPrediction={!!allowPrediction}
          />
        )}
      </div>
    </div>
  );
}
