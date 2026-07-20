import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";
import UserAvatar from "./UserAvatar";
import TeamFlag from "./TeamFlag";
import { teamToCountryCode } from "@/lib/country-codes";
import ProvisionalBadge from "./ProvisionalBadge";
import MasterTouchBadge from "./MasterTouchBadge";

type LiveMatchInfo = {
  homeTeam:  string;
  awayTeam:  string;
  homeScore: number;
  awayScore: number;
  minute:    number | null;
  time:      string | null;
  phase:     string;
};

function RankChange({ current, previous }: { current: number; previous: number }) {
  const diff = previous - current;
  if (diff > 0) return <span className="text-xs text-green-500 font-bold">▲{diff}</span>;
  if (diff < 0) return <span className="text-xs text-red-400 font-bold">▼{Math.abs(diff)}</span>;
  return null;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold">
      {rank}
    </span>
  );
}

export default function Leaderboard({
  entries,
  highlightUserId,
  liveMatches,
  showMasterTouch,
}: {
  entries:           LeaderboardEntry[];
  highlightUserId?:  string;
  liveMatches?:      LiveMatchInfo[];
  showMasterTouch?:  boolean;
}) {
  const isLive = liveMatches && liveMatches.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

      {/* Banners partidos en vivo */}
      {isLive && liveMatches.map((liveMatch, idx) => (
        <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-green-50 dark:bg-green-950/40 border-b border-green-200 dark:border-green-800/60">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <TeamFlag countryCode={teamToCountryCode(liveMatch.homeTeam)} name={liveMatch.homeTeam} size={16} />
            <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums">
              {liveMatch.homeScore} - {liveMatch.awayScore}
            </span>
            <TeamFlag countryCode={teamToCountryCode(liveMatch.awayTeam)} name={liveMatch.awayTeam} size={16} />
            <span className="text-xs text-green-700 dark:text-green-400 font-semibold">
              · {liveMatch.time === "HT" ? "Entretiempo" : liveMatch.time === "ET" ? "Prórroga" : liveMatch.time === "PEN" ? "Penales" : `min ${liveMatch.minute ?? 0}'`}
            </span>
          </div>
          <span className="text-xs text-green-600 dark:text-green-500 font-medium shrink-0">provisional</span>
        </div>
      ))}

      {/* Encabezado columnas */}
      <div className={`grid gap-x-3 items-center text-xs text-slate-400 dark:text-slate-500 font-medium px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 ${
        showMasterTouch
          ? "grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto]"
          : "grid-cols-[auto_1fr_auto_auto]"
      }`}>
        <span className="w-7 text-center">#</span>
        <span>Jugador</span>
        <span className={`text-center w-12 ${showMasterTouch ? "hidden sm:block" : ""}`}>Exactos</span>
        <span className={`text-right w-16 ${showMasterTouch ? "hidden sm:block" : ""}`}>Puntos</span>
        {showMasterTouch && <span className="text-right w-10 text-amber-500">TM</span>}
        {showMasterTouch && <span className="text-right w-16">Total</span>}
      </div>

      <ul>
        {entries.map((entry) => {
          const isHighlighted = entry.user.id === highlightUserId;
          return (
            <li key={entry.user.id}>
              <Link
                href={`/perfil/${entry.user.id}`}
                className={`grid gap-x-3 items-center px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                  showMasterTouch
                    ? "grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto]"
                    : "grid-cols-[auto_1fr_auto_auto]"
                } ${isHighlighted ? "bg-slate-50 dark:bg-slate-800/50" : ""}`}
              >
                <div className="flex items-center justify-center w-7">
                  <RankBadge rank={entry.rank} />
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar displayName={entry.user.name} avatarUrl={entry.user.avatarUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-sm font-semibold truncate flex-1 ${
                        isHighlighted ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"
                      }`}>
                        {entry.user.name}
                        {isHighlighted && (
                          <span className="ml-1.5 text-xs text-slate-400 font-normal">(tú)</span>
                        )}
                      </p>
                      {isLive && <RankChange current={entry.rank} previous={entry.previousRank} />}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {entry.predictions} pronósticos
                      {showMasterTouch && (
                        <span className="sm:hidden"> · {entry.exactResults} exactos</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className={`w-12 text-center ${showMasterTouch ? "hidden sm:block" : ""}`}>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{entry.exactResults}</span>
                </div>
                <div className={`w-16 flex flex-col items-end gap-0.5 ${showMasterTouch ? "hidden sm:flex" : ""}`}>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {entry.points}
                  </span>
                  {isLive && (
                    <div className="flex items-center gap-1.5">
                      {liveMatches!.map((match, idx) => {
                        const pts  = entry.provisionalPoints?.[idx] ?? 0;
                        const pred = entry.provisionalPredictions?.[idx];
                        return (
                          <ProvisionalBadge
                            key={idx}
                            points={pts}
                            homeTeam={match.homeTeam}
                            awayTeam={match.awayTeam}
                            predHomeScore={pred?.homeScore ?? null}
                            predAwayScore={pred?.awayScore ?? null}
                            phase={match.phase}
                            advancingTeamName={(pred as { advancingTeamName?: string | null } | undefined)?.advancingTeamName ?? null}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                {showMasterTouch && (
                  <div className="w-10 flex justify-end">
                    <MasterTouchBadge
                      points={entry.masterTouchPoints ?? 0}
                      breakdown={entry.masterTouchBreakdown}
                    />
                  </div>
                )}
                {showMasterTouch && (
                  <div className="w-16 flex justify-end">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {entry.points + (entry.masterTouchPoints ?? 0)}
                    </span>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {isLive && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Ranking provisional en base al marcador actual · se confirma al pitar el final
          </p>
        </div>
      )}
    </div>
  );
}
