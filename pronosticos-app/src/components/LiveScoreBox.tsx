"use client";

import { useLiveMatch } from "@/hooks/useLiveMatch";

interface LiveScoreBoxProps {
  matchId: string;
  initialHome: number | undefined;
  initialAway: number | undefined;
  initialMinute: number | undefined;
}

export default function LiveScoreBox({ matchId, initialHome, initialAway, initialMinute }: LiveScoreBoxProps) {
  const { data } = useLiveMatch(matchId);
  const home = data?.home_score ?? initialHome ?? 0;
  const away = data?.away_score ?? initialAway ?? 0;

  // Usar el minuto del polling si está disponible; si no, el del server render
  const rawTime = data?.time;
  const liveMinute = rawTime && /^\d+/.test(rawTime) ? parseInt(rawTime) : null;
  const displayMinute = liveMinute ?? initialMinute;

  return (
    <>
      <div className="flex items-center gap-2 text-2xl font-black tabular-nums text-slate-800 dark:text-white">
        <span>{home}</span>
        <span className="text-slate-300 dark:text-slate-600 text-lg font-normal">-</span>
        <span>{away}</span>
      </div>
      {displayMinute !== undefined && (
        <span className="text-xs text-green-500 font-semibold">Min {displayMinute}&apos;</span>
      )}
    </>
  );
}
