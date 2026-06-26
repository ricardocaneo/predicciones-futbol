export type TournamentPhase =
  | "group" | "round_of_32" | "round_of_16"
  | "quarter_final" | "semi_final" | "third_place" | "final";

const SCORING_MATRIX: Record<TournamentPhase, {
  exact: number; goalDiff: number; tendency: number; consolation: number; liveExact: number;
}> = {
  group:         { exact: 5,  goalDiff: 3,  tendency: 2, consolation: 1, liveExact: 2 },
  round_of_32:   { exact: 8,  goalDiff: 5,  tendency: 3, consolation: 2, liveExact: 3 },
  round_of_16:   { exact: 8,  goalDiff: 5,  tendency: 3, consolation: 2, liveExact: 3 },
  quarter_final: { exact: 12, goalDiff: 8,  tendency: 5, consolation: 3, liveExact: 4 },
  semi_final:    { exact: 15, goalDiff: 10, tendency: 6, consolation: 4, liveExact: 5 },
  third_place:   { exact: 15, goalDiff: 10, tendency: 6, consolation: 4, liveExact: 5 },
  final:         { exact: 18, goalDiff: 12, tendency: 7, consolation: 4, liveExact: 6 },
};

const ADVANCEMENT_BONUS: Partial<Record<TournamentPhase, number>> = {
  round_of_32: 2, round_of_16: 2,
  quarter_final: 4, semi_final: 4, third_place: 4, final: 4,
};

export interface PredictionRow {
  id: string;
  user_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  prediction_mode: string;
  advancing_team_id?: string | null;
}

export interface PointsResult {
  points: number;
  breakdown: {
    category: string;
    base: number;
    advancement_bonus: number;
    total: number;
  };
}

export function calculatePoints(
  phase: string,
  homeScore: number,
  awayScore: number,
  pred: PredictionRow,
  winnerTeamId?: string | null,
): PointsResult {
  const matrix = SCORING_MATRIX[phase as TournamentPhase] ?? SCORING_MATRIX.group;
  const isKnockout = phase !== "group";
  const isLive = pred.prediction_mode === "live";
  const predHome = pred.predicted_home_score;
  const predAway = pred.predicted_away_score;

  if (isLive) {
    const isExact = predHome === homeScore && predAway === awayScore;
    const pts = isExact ? matrix.liveExact : 0;
    return { points: pts, breakdown: { category: isExact ? "live" : "none", base: pts, advancement_bonus: 0, total: pts } };
  }

  const isExact = predHome === homeScore && predAway === awayScore;
  const actualDiff = homeScore - awayScore;
  const predDiff = predHome - predAway;
  const isTendencyCorrect = Math.sign(actualDiff) === Math.sign(predDiff);
  const isGoalDiffCorrect = !isExact && isTendencyCorrect && actualDiff === predDiff;
  const isConsolation =
    !isExact && !isGoalDiffCorrect && !isTendencyCorrect &&
    (predHome === homeScore || predAway === awayScore);

  let base = 0;
  let category = "none";
  if (isExact)                              { base = matrix.exact;       category = "exact";      }
  else if (isGoalDiffCorrect)               { base = matrix.goalDiff;    category = "goalDiff";   }
  else if (isTendencyCorrect)               { base = matrix.tendency;    category = "tendency";   }
  else if (isConsolation && matrix.consolation > 0) { base = matrix.consolation; category = "consolation"; }

  // Bono de avance: si hay pick explícito úsalo, si no cae a tendencia del marcador (grupos o data antigua)
  const advancementApplies = isKnockout && (
    pred.advancing_team_id != null && winnerTeamId != null
      ? pred.advancing_team_id === winnerTeamId
      : isTendencyCorrect
  );
  const advancementBonus = advancementApplies ? (ADVANCEMENT_BONUS[phase as TournamentPhase] ?? 0) : 0;
  const total = base + advancementBonus;

  return { points: total, breakdown: { category, base, advancement_bonus: advancementBonus, total } };
}
