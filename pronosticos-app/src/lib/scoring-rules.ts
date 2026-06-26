import type { TournamentPhase, PointsCategory } from "@/types";

export interface ScoringMatrix {
  exact: number;
  goalDiff: number;
  tendency: number;
  consolation: number;
  liveExact: number;
}

// Matriz oficial según reglamento dLa Pollita Mundialera 2026
export const SCORING_MATRIX: Record<TournamentPhase, ScoringMatrix> = {
  group:         { exact: 5,  goalDiff: 3,  tendency: 2, consolation: 1, liveExact: 2 },
  round_of_32:   { exact: 8,  goalDiff: 5,  tendency: 3, consolation: 2, liveExact: 3 },
  round_of_16:   { exact: 8,  goalDiff: 5,  tendency: 3, consolation: 2, liveExact: 3 },
  quarter_final: { exact: 12, goalDiff: 8,  tendency: 5, consolation: 3, liveExact: 4 },
  semi_final:    { exact: 15, goalDiff: 10, tendency: 6, consolation: 4, liveExact: 5 },
  third_place:   { exact: 15, goalDiff: 10, tendency: 6, consolation: 4, liveExact: 5 },
  final:         { exact: 18, goalDiff: 12, tendency: 7, consolation: 4, liveExact: 6 },
};

export const ADVANCEMENT_BONUS: Partial<Record<TournamentPhase, number>> = {
  round_of_32:   2,
  round_of_16:   2,
  quarter_final: 4,
  semi_final:    4,
  third_place:   4,
  final:         4,
};

export const LIVE_WINDOW_MINUTES = 30;

/** Re-abierto manualmente 26/06. Se bloquea el 27/06 a las 14:00 hrs Santiago (18:00 UTC). */
export const MASTER_TOUCH_LOCK_DATE = new Date("2026-06-27T18:00:00Z");

export const MASTER_TOUCH_POINTS = {
  champion:   25,
  runnerUp:   15,
  goldenBoot: 15,
  casiCasi:    5,
} as const;

export const PHASE_LABELS: Record<TournamentPhase, string> = {
  group:         "Fase de Grupos",
  round_of_32:   "Dieciseisavos de Final",
  round_of_16:   "Octavos de Final",
  quarter_final: "Cuartos de Final",
  semi_final:    "Semifinal",
  third_place:   "Tercer y Cuarto Puesto",
  final:         "Final",
};

export const CATEGORY_LABELS: Record<PointsCategory, string> = {
  exact:       "Marcador exacto",
  goalDiff:    "Diferencia de goles correcta",
  tendency:    "Tendencia correcta",
  consolation: "Goles consuelo",
  live:        "Marcador exacto en vivo",
  none:        "Sin puntos",
};
