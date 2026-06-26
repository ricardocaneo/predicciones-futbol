import { teamToCountryCode } from "@/lib/country-codes";
import { PHASE_LABELS } from "@/lib/scoring-rules";
import type { Match, Prediction, TournamentPhase, MatchStatus } from "@/lib/types";

export type MatchRow = {
  id: string;
  phase: string;
  group_name: string | null;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  minute: number | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
};

export type PredictionRow = {
  id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  prediction_mode: string;
  advancing_team_id?: string | null;
};

const TZ = "America/Santiago";

export function rowToMatch(row: MatchRow): Match {
  const d = new Date(row.starts_at);
  // Extraer fecha y hora en zona de Chile para mostrar correctamente al usuario.
  // en-CA da formato YYYY-MM-DD; en-GB con hour12:false da HH:MM.
  const date = d.toLocaleDateString("en-CA", { timeZone: TZ });
  const time = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const phase = row.phase as TournamentPhase;
  const groupLabel = row.group_name ? `Grupo ${row.group_name}` : PHASE_LABELS[phase];

  return {
    id: row.id,
    homeTeam: {
      id: row.home_team_id ?? row.home_team,
      name: row.home_team,
      countryCode: teamToCountryCode(row.home_team),
    },
    awayTeam: {
      id: row.away_team_id ?? row.away_team,
      name: row.away_team,
      countryCode: teamToCountryCode(row.away_team),
    },
    date,
    time,
    status: row.status as MatchStatus,
    phase,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    minute: row.minute ?? undefined,
    competition: "Mundial 2026",
    round: groupLabel,
  };
}

export function rowToPrediction(row: PredictionRow, userId: string): Prediction {
  return {
    id: row.id,
    userId,
    matchId: row.match_id,
    homeScore: row.predicted_home_score,
    awayScore: row.predicted_away_score,
    isLive: row.prediction_mode === "live",
    advancingTeamId: row.advancing_team_id ?? null,
  };
}
