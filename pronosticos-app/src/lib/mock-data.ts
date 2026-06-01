import type { Match, Prediction, User, LeaderboardEntry, MasterTouchPrediction, Player, Team, MatchResult, UserProfile } from "@/types";

export const CURRENT_USER_ID = "user-1";

export const USERS: User[] = [
  { id: "user-1", name: "Ricardo",   avatar: "R" },
  { id: "user-2", name: "Martín",    avatar: "M" },
  { id: "user-3", name: "Sofía",     avatar: "S" },
  { id: "user-4", name: "Lucas",     avatar: "L" },
  { id: "user-5", name: "Valentina", avatar: "V" },
  { id: "user-6", name: "Tomás",     avatar: "T" },
];

export const PLAYERS: Player[] = [
  { id: "p1", name: "Lionel Messi",   teamId: "t1",  countryCode: "ar" },
  { id: "p2", name: "Kylian Mbappé",  teamId: "t2",  countryCode: "fr" },
  { id: "p3", name: "Vinicius Jr.",   teamId: "t3",  countryCode: "br" },
  { id: "p4", name: "Lamine Yamal",   teamId: "t7",  countryCode: "es" },
  { id: "p5", name: "Rafael Leão",    teamId: "t8",  countryCode: "pt" },
  { id: "p6", name: "Darwin Núñez",   teamId: "t9",  countryCode: "uy" },
  { id: "p7", name: "Harry Kane",     teamId: "t11", countryCode: "gb-eng" },
  { id: "p8", name: "Cody Gakpo",     teamId: "t12", countryCode: "nl" },
];

export const MATCHES: Match[] = [
  // ── GRUPO ─────────────────────────────────────────────────────────────────
  {
    // [1] Caso: partido programado — pronóstico abierto
    id: "match-1",
    homeTeam: { id: "t1",  name: "Argentina",    shortName: "ARG", countryCode: "ar" },
    awayTeam:  { id: "t2",  name: "Francia",      shortName: "FRA", countryCode: "fr" },
    date: "2026-05-22", time: "21:00",
    status: "scheduled", phase: "group",
    competition: "Mundial 2026", round: "Grupo A",
  },
  {
    // [2] Caso: en vivo antes del min 30 — ventana en vivo abierta
    id: "match-2",
    homeTeam: { id: "t3",  name: "Brasil",        shortName: "BRA", countryCode: "br" },
    awayTeam:  { id: "t4",  name: "Alemania",      shortName: "GER", countryCode: "de" },
    date: "2026-05-22", time: "19:00",
    status: "live", phase: "group",
    homeScore: 1, awayScore: 0, minute: 22,
    competition: "Mundial 2026", round: "Grupo B",
  },
  {
    // [3] Caso: en vivo después del min 30 — ventana en vivo cerrada
    id: "match-3",
    homeTeam: { id: "t5",  name: "Chile",         shortName: "CHI", countryCode: "cl" },
    awayTeam:  { id: "t9",  name: "Uruguay",       shortName: "URU", countryCode: "uy" },
    date: "2026-05-22", time: "16:30",
    status: "live", phase: "group",
    homeScore: 0, awayScore: 1, minute: 75,
    competition: "Mundial 2026", round: "Grupo C",
  },
  {
    // [4] Caso: finalizado grupos — pronóstico exacto (5 pts)
    id: "match-4",
    homeTeam: { id: "t5",  name: "Chile",         shortName: "CHI", countryCode: "cl" },
    awayTeam:  { id: "t6",  name: "México",        shortName: "MEX", countryCode: "mx" },
    date: "2026-05-21", time: "17:00",
    status: "finished", phase: "group",
    homeScore: 2, awayScore: 2,
    competition: "Mundial 2026", round: "Grupo C",
  },
  {
    // [5] Caso: finalizado grupos — tendencia correcta (2 pts) + goles consuelo (1 pt)
    id: "match-5",
    homeTeam: { id: "t7",  name: "España",        shortName: "ESP", countryCode: "es" },
    awayTeam:  { id: "t8",  name: "Portugal",      shortName: "POR", countryCode: "pt" },
    date: "2026-05-21", time: "15:00",
    status: "finished", phase: "group",
    homeScore: 0, awayScore: 1,
    competition: "Mundial 2026", round: "Grupo D",
  },
  {
    // [6] Caso: partido programado — sin pronóstico todavía
    id: "match-6",
    homeTeam: { id: "t11", name: "Inglaterra",    shortName: "ENG", countryCode: "gb-eng" },
    awayTeam:  { id: "t12", name: "Países Bajos", shortName: "NED", countryCode: "nl" },
    date: "2026-05-24", time: "20:30",
    status: "scheduled", phase: "group",
    competition: "Mundial 2026", round: "Grupo E",
  },
  // ── ELIMINATORIA ──────────────────────────────────────────────────────────
  {
    // [7] Caso: octavos programados — pronóstico abierto, bono por clasificado visible
    id: "match-7",
    homeTeam: { id: "t1",  name: "Argentina",    shortName: "ARG", countryCode: "ar" },
    awayTeam:  { id: "t11", name: "Inglaterra",   shortName: "ENG", countryCode: "gb-eng" },
    date: "2026-06-28", time: "20:00",
    status: "scheduled", phase: "round_of_16",
    competition: "Mundial 2026", round: "Octavos de Final",
  },
  {
    // [8] Caso: cuartos finalizados — pronóstico exacto + bono clasificado (12+4=16 pts)
    id: "match-8",
    homeTeam: { id: "t3",  name: "Brasil",        shortName: "BRA", countryCode: "br" },
    awayTeam:  { id: "t7",  name: "España",        shortName: "ESP", countryCode: "es" },
    date: "2026-07-04", time: "18:00",
    status: "finished", phase: "quarter_final",
    homeScore: 2, awayScore: 1,
    competition: "Mundial 2026", round: "Cuartos de Final",
  },
];

/**
 * Derive el MatchResult oficial para scoring (excluye penales en playoff).
 * En esta versión mock, homeScore/awayScore ya representan el resultado sin penales.
 */
export function getMatchResult(match: Match): MatchResult | null {
  if (match.homeScore === undefined || match.awayScore === undefined) return null;
  return { homeScore: match.homeScore, awayScore: match.awayScore, hasExtraTime: match.hasExtraTime };
}

export const PREDICTIONS: Prediction[] = [
  // ── user-1 ──────────────────────────────────────────────────────────────
  // [A] En vivo min 22, pronóstico PRE-PARTIDO exacto 1-0 → 5 pts provisional
  { id: "pred-1",  userId: "user-1", matchId: "match-2", homeScore: 1, awayScore: 0 },
  // [B] En vivo min 75, pronóstico EN VIVO fallido (pred 2-0, actual 0-1) → 0 pts
  { id: "pred-2",  userId: "user-1", matchId: "match-3", homeScore: 2, awayScore: 0, isLive: true },
  // [C] Finalizado grupos, EXACTO (pred 2-2, actual 2-2) → 5 pts
  { id: "pred-3",  userId: "user-1", matchId: "match-4", homeScore: 2, awayScore: 2 },
  // [D] Finalizado grupos, TENDENCIA correcta (pred 0-2, actual 0-1 → POR gana) → 2 pts
  { id: "pred-4",  userId: "user-1", matchId: "match-5", homeScore: 0, awayScore: 2 },
  // [E] Octavos programados, pronóstico abierto → aún sin puntos
  { id: "pred-5",  userId: "user-1", matchId: "match-7", homeScore: 2, awayScore: 0 },
  // [F] Cuartos finalizados, EXACTO + bono clasificado (pred 2-1, actual 2-1) → 12+4=16 pts
  { id: "pred-6",  userId: "user-1", matchId: "match-8", homeScore: 2, awayScore: 1 },

  // ── user-2 ──────────────────────────────────────────────────────────────
  // Tendencia correcta en match-2 (pred 2-0, BRA gana) → 2 pts provisional
  { id: "pred-7",  userId: "user-2", matchId: "match-2", homeScore: 2, awayScore: 0 },
  // Exacto match-4 → 5 pts
  { id: "pred-8",  userId: "user-2", matchId: "match-4", homeScore: 2, awayScore: 2 },
  // Cuartos, tendencia correcta + bono (pred 1-0, actual 2-1) → 5+4=9 pts
  { id: "pred-9",  userId: "user-2", matchId: "match-8", homeScore: 1, awayScore: 0 },

  // ── user-3 ──────────────────────────────────────────────────────────────
  // GOLES CONSUELO: match-5 pred 2-1 vs actual 0-1: tendencia incorrecta (ESP gana vs POR gana),
  // pero awayScore coincide (predAway=1 == actualAway=1) → 1 pt
  { id: "pred-10", userId: "user-3", matchId: "match-5", homeScore: 2, awayScore: 1 },
  // Sin puntos: match-4 pred 1-0 vs actual 2-2 (tendencia incorrecta, ningún gol coincide)
  { id: "pred-11", userId: "user-3", matchId: "match-4", homeScore: 1, awayScore: 0 },

  // ── user-4 ──────────────────────────────────────────────────────────────
  // EN VIVO EXACTO: match-2 live pred 1-0, actual provisional 1-0 → 2 pts provisional (liveExact grupo)
  { id: "pred-12", userId: "user-4", matchId: "match-2", homeScore: 1, awayScore: 0, isLive: true },
];

export const MASTER_TOUCHES: MasterTouchPrediction[] = [
  {
    userId: "user-1",
    championTeamId: "t1",    // Argentina
    runnerUpTeamId: "t2",    // Francia
    goldenBootPlayerId: "p1", // Messi
  },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, previousRank: 2, user: USERS[1], points: 38, predictions: 12, exactResults: 4 },
  { rank: 2, previousRank: 1, user: USERS[2], points: 35, predictions: 12, exactResults: 3 },
  { rank: 3, previousRank: 3, user: USERS[0], points: 28, predictions: 10, exactResults: 2 },
  { rank: 4, previousRank: 5, user: USERS[3], points: 22, predictions: 11, exactResults: 1 },
  { rank: 5, previousRank: 4, user: USERS[4], points: 19, predictions: 9,  exactResults: 2 },
  { rank: 6, previousRank: 6, user: USERS[5], points: 14, predictions: 8,  exactResults: 1 },
];

export function getPredictionForMatch(matchId: string, userId: string): Prediction | undefined {
  return PREDICTIONS.find((p) => p.matchId === matchId && p.userId === userId);
}

export function getUserPredictions(userId: string): (Prediction & { match: Match })[] {
  return PREDICTIONS.filter((p) => p.userId === userId).map((p) => ({
    ...p,
    match: MATCHES.find((m) => m.id === p.matchId)!,
  }));
}

export function getMasterTouch(userId: string): MasterTouchPrediction | undefined {
  return MASTER_TOUCHES.find((m) => m.userId === userId);
}

export const USER_PROFILES: UserProfile[] = [
  {
    id: "user-1",
    displayName: "Ricardo",
    email: "ricardo@ejemplo.com",
    favoriteTeam: "Argentina",
    bio: "Amante del fútbol y los datos. Fiel creyente en la estadística.",
    totalPoints: 28,
    currentRank: 3,
    exactScores: 2,
    correctTrends: 5,
    livePredictionHits: 1,
    predictionsCount: 10,
    createdAt: "2026-05-01T10:00:00",
  },
  {
    id: "user-2",
    displayName: "Martín",
    email: "martin@ejemplo.com",
    totalPoints: 38,
    currentRank: 1,
    exactScores: 4,
    correctTrends: 7,
    livePredictionHits: 2,
    predictionsCount: 12,
    createdAt: "2026-05-01T11:00:00",
  },
  {
    id: "user-3",
    displayName: "Sofía",
    email: "sofia@ejemplo.com",
    favoriteTeam: "España",
    bio: "Fútbol, viajes y café. La combinación perfecta.",
    totalPoints: 35,
    currentRank: 2,
    exactScores: 3,
    correctTrends: 6,
    livePredictionHits: 1,
    predictionsCount: 12,
    createdAt: "2026-05-01T12:00:00",
  },
  {
    id: "user-4",
    displayName: "Lucas",
    email: "lucas@ejemplo.com",
    totalPoints: 22,
    currentRank: 4,
    exactScores: 1,
    correctTrends: 4,
    livePredictionHits: 1,
    predictionsCount: 11,
    createdAt: "2026-05-02T09:00:00",
  },
  {
    id: "user-5",
    displayName: "Valentina",
    email: "valentina@ejemplo.com",
    favoriteTeam: "Brasil",
    totalPoints: 19,
    currentRank: 5,
    exactScores: 2,
    correctTrends: 3,
    livePredictionHits: 0,
    predictionsCount: 9,
    createdAt: "2026-05-02T10:00:00",
  },
  {
    id: "user-6",
    displayName: "Tomás",
    email: "tomas@ejemplo.com",
    totalPoints: 14,
    currentRank: 6,
    exactScores: 1,
    correctTrends: 2,
    livePredictionHits: 0,
    predictionsCount: 8,
    createdAt: "2026-05-02T11:00:00",
  },
];

export function getUserProfile(userId: string): UserProfile | undefined {
  return USER_PROFILES.find((p) => p.id === userId);
}

export function getAllTeams(): Team[] {
  const seen = new Map<string, Team>();
  MATCHES.forEach((m) => {
    seen.set(m.homeTeam.id, m.homeTeam);
    seen.set(m.awayTeam.id, m.awayTeam);
  });
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}
