import { createClient } from "@/lib/supabase/server";
import BracketView, { type BracketMatch, type BracketData } from "./BracketView";

export default async function KnockoutView() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, status, starts_at, phase")
    .neq("phase", "group")
    .order("starts_at", { ascending: true });

  const all = data ?? [];

  function byPhase(phase: string): BracketMatch[] {
    return all
      .filter(m => m.phase === phase)
      .map(m => ({
        id:        m.id,
        homeTeam:  m.home_team,
        awayTeam:  m.away_team,
        homeScore: m.home_score,
        awayScore: m.away_score,
        status:    m.status as BracketMatch["status"],
        startsAt:  m.starts_at,
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

  return <BracketView data={bracketData} />;
}
