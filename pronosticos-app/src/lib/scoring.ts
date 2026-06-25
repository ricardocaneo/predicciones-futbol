import type {
  Match,
  MatchResult,
  Prediction,
  PointsResult,
  PointsCategory,
  MasterTouchPrediction,
  MasterTouchResult,
} from "@/types";
import {
  SCORING_MATRIX,
  ADVANCEMENT_BONUS,
  LIVE_WINDOW_MINUTES,
  MASTER_TOUCH_LOCK_DATE,
  MASTER_TOUCH_POINTS,
  CATEGORY_LABELS,
} from "./scoring-rules";

/**
 * Calcula los puntos de un pronóstico dado el partido y el resultado oficial.
 * `result` es null si el partido no tiene resultado todavía.
 * En playoff, `result` debe excluir penales (solo tiempo reglamentario + prórroga).
 */
export function calculateMatchPoints(
  match: Match,
  prediction: Prediction,
  result: MatchResult | null,
): PointsResult {
  const { phase, status } = match;
  const matrix = SCORING_MATRIX[phase];
  const isKnockout = phase !== "group";
  const isProvisional = status === "live";
  const scoringMode = prediction.isLive ? "live" : "pre_match" as const;

  if (!result) {
    return {
      totalPoints: 0,
      breakdown: { category: "none", base: 0, advancementBonus: 0, total: 0 },
      explanation: "Sin resultado aún",
      scoringMode,
      isProvisional,
    };
  }

  const { homeScore, awayScore } = result;
  const predHome = prediction.homeScore;
  const predAway = prediction.awayScore;

  // Modo en vivo: renuncia a la matriz tradicional, solo puntúa con marcador exacto final
  if (prediction.isLive) {
    const isExact = predHome === homeScore && predAway === awayScore;
    const pts = isExact ? matrix.liveExact : 0;
    return {
      totalPoints: pts,
      breakdown: { category: isExact ? "live" : "none", base: pts, advancementBonus: 0, total: pts },
      explanation: isExact
        ? `${CATEGORY_LABELS.live} +${pts}${isProvisional ? " (provisional)" : ""}`
        : "Pronóstico en vivo no acertó el marcador exacto final — 0 pts",
      scoringMode: "live",
      isProvisional,
    };
  }

  // Modo pre-partido: matriz tradicional por niveles (mutuamente excluyentes)
  const isExact = predHome === homeScore && predAway === awayScore;
  const actualDiff = homeScore - awayScore;
  const predDiff = predHome - predAway;
  const isTendencyCorrect = Math.sign(actualDiff) === Math.sign(predDiff);
  const isGoalDiffCorrect = !isExact && isTendencyCorrect && actualDiff === predDiff;
  // Goles consuelo: tendencia incorrecta pero al menos un equipo anotó lo pronosticado
  const isConsolation =
    !isExact &&
    !isGoalDiffCorrect &&
    !isTendencyCorrect &&
    (predHome === homeScore || predAway === awayScore);

  let base = 0;
  let category: PointsCategory = "none";

  if (isExact) {
    base = matrix.exact;
    category = "exact";
  } else if (isGoalDiffCorrect) {
    base = matrix.goalDiff;
    category = "goalDiff";
  } else if (isTendencyCorrect) {
    base = matrix.tendency;
    category = "tendency";
  } else if (isConsolation && matrix.consolation > 0) {
    base = matrix.consolation;
    category = "consolation";
  }

  // Bono por clasificado: tendencia correcta en eliminatoria
  let advancementBonus = 0;
  if (isKnockout && isTendencyCorrect) {
    advancementBonus = ADVANCEMENT_BONUS[phase] ?? 0;
  }

  const total = base + advancementBonus;

  const parts: string[] = [];
  if (category !== "none") parts.push(`${CATEGORY_LABELS[category]} +${base}`);
  if (advancementBonus > 0) parts.push(`Bono clasificado +${advancementBonus}`);
  if (total === 0) parts.push("Sin puntos");
  if (isProvisional) parts.push("provisional");

  return {
    totalPoints: total,
    breakdown: { category, base, advancementBonus, total },
    explanation: parts.join(" · "),
    scoringMode: "pre_match",
    isProvisional,
  };
}

/** El pronóstico regular se puede editar hasta el inicio del partido */
export function canEditRegularPrediction(match: Match): boolean {
  return match.status === "scheduled";
}

/** La ventana en vivo está abierta hasta el minuto 30 inclusive */
export function canEditLivePrediction(match: Match): boolean {
  return match.status === "live" && match.minute !== undefined && match.minute <= LIVE_WINDOW_MINUTES;
}

/** El Toque Maestro se puede editar hasta el inicio del primer partido de Fecha 2 de grupos */
export function canEditMasterTouch(now: Date = new Date()): boolean {
  return now < MASTER_TOUCH_LOCK_DATE;
}

export interface MasterTouchBreakdown {
  champion: number;
  runnerUp: number;
  goldenBoot: number;
  casiCasi: number;
}

export function calculateMasterTouchPoints(
  prediction: MasterTouchPrediction,
  result: MasterTouchResult,
): { totalPoints: number; breakdown: MasterTouchBreakdown; explanation: string[] } {
  const championCorrect  = prediction.championTeamId      === result.championTeamId;
  const runnerUpCorrect  = prediction.runnerUpTeamId      === result.runnerUpTeamId;
  const goldenBootCorrect = prediction.goldenBootPlayerId === result.goldenBootPlayerId;

  const breakdown: MasterTouchBreakdown = {
    champion:   championCorrect   ? MASTER_TOUCH_POINTS.champion   : 0,
    runnerUp:   runnerUpCorrect   ? MASTER_TOUCH_POINTS.runnerUp   : 0,
    goldenBoot: goldenBootCorrect ? MASTER_TOUCH_POINTS.goldenBoot : 0,
    casiCasi:   0,
  };

  // Casi Casi: campeón y subcampeón exactamente invertidos
  const casiCasi =
    !championCorrect &&
    !runnerUpCorrect &&
    prediction.championTeamId === result.runnerUpTeamId &&
    prediction.runnerUpTeamId === result.championTeamId;

  if (casiCasi) breakdown.casiCasi = MASTER_TOUCH_POINTS.casiCasi;

  const totalPoints = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const explanation: string[] = [];
  if (breakdown.champion   > 0) explanation.push(`Campeón correcto +${breakdown.champion}`);
  if (breakdown.runnerUp   > 0) explanation.push(`Subcampeón correcto +${breakdown.runnerUp}`);
  if (breakdown.goldenBoot > 0) explanation.push(`Bota de Oro correcta +${breakdown.goldenBoot}`);
  if (breakdown.casiCasi   > 0) explanation.push(`Casi Casi +${breakdown.casiCasi}`);

  return { totalPoints, breakdown, explanation };
}
