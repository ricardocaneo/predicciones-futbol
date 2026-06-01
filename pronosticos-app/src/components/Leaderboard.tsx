import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";
import UserAvatar from "./UserAvatar";

function RankChange({ current, previous }: { current: number; previous: number }) {
  const diff = previous - current;
  if (diff > 0) return <span className="text-xs text-green-500 font-semibold">▲{diff}</span>;
  if (diff < 0) return <span className="text-xs text-red-400 font-semibold">▼{Math.abs(diff)}</span>;
  return <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;
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
}: {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center text-xs text-slate-400 dark:text-slate-500 font-medium px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
        <span className="w-7 text-center">#</span>
        <span>Jugador</span>
        <span className="text-center w-12">Exactos</span>
        <span className="text-right w-16">Puntos</span>
      </div>
      <ul>
        {entries.map((entry) => {
          const isHighlighted = entry.user.id === highlightUserId;
          return (
            <li key={entry.user.id}>
            <Link
              href={`/perfil/${entry.user.id}`}
              className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                isHighlighted ? "bg-slate-50 dark:bg-slate-800/50" : ""
              }`}
            >
              <div className="flex items-center justify-center w-7">
                <RankBadge rank={entry.rank} />
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar displayName={entry.user.name} avatarUrl={entry.user.avatarUrl} size={32} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    isHighlighted ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"
                  }`}>
                    {entry.user.name}
                    {isHighlighted && (
                      <span className="ml-1.5 text-xs text-slate-400 font-normal">(tú)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{entry.predictions} pronósticos</p>
                </div>
              </div>
              <div className="w-12 text-center">
                <span className="text-sm text-slate-600 dark:text-slate-300">{entry.exactResults}</span>
              </div>
              <div className="w-16 flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{entry.points}</span>
                <RankChange current={entry.rank} previous={entry.previousRank} />
              </div>
            </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
