import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BracketView, { type BracketMatch, type BracketData } from "@/components/tabla-mundialera/BracketView";

export const metadata: Metadata = {
  title: "Diagrama de eliminación — La Pollita Mundialera",
  description: "Bracket de la fase eliminatoria del Mundial 2026",
};

export default async function BracketPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_team_id, away_team_id, winner_team_id, home_score, away_score, status, starts_at, phase")
    .neq("phase", "group")
    .order("starts_at", { ascending: true });

  const all = data ?? [];

  function winnerSide(m: typeof all[0]): "home" | "away" | null {
    if (m.status !== "finished") return null;
    if (m.winner_team_id) {
      if (m.winner_team_id === m.home_team_id) return "home";
      if (m.winner_team_id === m.away_team_id) return "away";
    }
    if (m.home_score !== null && m.away_score !== null) {
      if (m.home_score > m.away_score) return "home";
      if (m.away_score > m.home_score) return "away";
    }
    return null;
  }

  function byPhase(phase: string): BracketMatch[] {
    return all
      .filter(m => m.phase === phase)
      .map(m => ({
        id:         m.id,
        homeTeam:   m.home_team,
        awayTeam:   m.away_team,
        homeScore:  m.home_score,
        awayScore:  m.away_score,
        status:     m.status as BracketMatch["status"],
        startsAt:   m.starts_at,
        winnerSide: winnerSide(m),
      }));
  }

  const bracketData: BracketData = {
    r32:   byPhase("round_of_32"),
    r16:   byPhase("round_of_16"),
    qf:    byPhase("quarter_final"),
    sf:    byPhase("semi_final"),
    tp:    byPhase("third_place"),
    final: byPhase("final"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/tabla-mundialera?tab=eliminacion"
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          ← Eliminación
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Diagrama de eliminación
          </h1>
        </div>
      </div>

      <BracketView data={bracketData} />
    </div>
  );
}
