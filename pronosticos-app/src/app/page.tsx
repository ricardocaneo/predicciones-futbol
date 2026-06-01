import Link from "next/link";
import { MATCHES, LEADERBOARD, CURRENT_USER_ID, getPredictionForMatch } from "@/lib/mock-data";
import MatchCard from "@/components/MatchCard";
import Leaderboard from "@/components/Leaderboard";

export default function HomePage() {
  const liveMatches = MATCHES.filter((m) => m.status === "live");
  const nextMatches = MATCHES.filter((m) => m.status === "scheduled").slice(0, 2);
  const topLeaderboard = LEADERBOARD.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="bg-wc-navy rounded-2xl px-6 py-7 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-wc-red font-bold text-xs uppercase tracking-widest mb-2">
            Mundial 2026 · USA · CAN · MEX
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            El Juego<br />del Mundial
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Haz tus pronósticos y compite con tus amigos
          </p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[80px] opacity-[0.07] select-none pointer-events-none">
          🏆
        </div>
      </div>

      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">En vivo ahora</h2>
          </div>
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={getPredictionForMatch(match.id, CURRENT_USER_ID)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Próximos partidos</h2>
          <Link href="/partidos" className="text-sm text-wc-red font-medium hover:underline">
            Ver todos →
          </Link>
        </div>
        {nextMatches.length === 0 ? (
          <p className="text-sm text-slate-400">No hay partidos próximos</p>
        ) : (
          <div className="space-y-3">
            {nextMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={getPredictionForMatch(match.id, CURRENT_USER_ID)}
                allowPrediction
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Top 3 ranking</h2>
          <Link href="/ranking" className="text-sm text-wc-red font-medium hover:underline">
            Ver completo →
          </Link>
        </div>
        <Leaderboard entries={topLeaderboard} highlightUserId={CURRENT_USER_ID} />
      </section>
    </div>
  );
}
