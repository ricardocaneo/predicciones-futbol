export type MatchStatus = "scheduled" | "live" | "finished";

export type TournamentPhase =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type PointsCategory =
  | "exact"
  | "goalDiff"
  | "tendency"
  | "consolation"
  | "live"
  | "none";

export type ScoringMode = "pre_match" | "live";

export interface Team {
  id: string;
  name: string;
  shortName?: string;
  countryCode: string;
  groupId?: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  countryCode: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  time: string;
  status: MatchStatus;
  phase: TournamentPhase;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
  hasExtraTime?: boolean;
  penScore?: string | null;
  winnerTeamId?: string | null;
  competition: string;
  round: string;
}

/** Resultado oficial usado para calcular puntos. En playoff excluye penales. */
export interface MatchResult {
  homeScore: number;
  awayScore: number;
  hasExtraTime?: boolean;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  isLive?: boolean;
  submittedAt?: string;
  advancingTeamId?: string | null;
}

export interface PointsBreakdown {
  category: PointsCategory;
  base: number;
  advancementBonus: number;
  total: number;
}

export interface PointsResult {
  totalPoints: number;
  breakdown: PointsBreakdown;
  explanation: string;
  scoringMode: ScoringMode;
  isProvisional: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  avatarUrl?: string;
}

export interface MasterTouchBreakdownEntry {
  champion: number;
  runner_up: number;
  golden_boot: number;
  casi_casi: number;
  total: number;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  user: User;
  points: number;
  predictions: number;
  exactResults: number;
  provisionalPoints?: number[];
  provisionalPredictions?: { homeScore: number | null; awayScore: number | null }[];
  masterTouchPoints?: number;
  masterTouchBreakdown?: MasterTouchBreakdownEntry;
}

export interface MasterTouchPrediction {
  userId: string;
  championTeamId?: string;
  runnerUpTeamId?: string;
  goldenBootPlayerId?: string;
  lockedAt?: string;
  updatedAt?: string;
}

export interface MasterTouchResult {
  championTeamId: string;
  runnerUpTeamId: string;
  goldenBootPlayerId: string;
}

/** Alias de compatibilidad */
export type MasterTouch = MasterTouchPrediction;

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  favoriteTeam?: string;
  bio?: string;
  totalPoints: number;
  currentRank: number;
  exactScores: number;
  correctTrends: number;
  livePredictionHits: number;
  predictionsCount: number;
  createdAt: string;
}

// ---------- Tabla Mundialera ----------

export interface WorldCupGroup {
  id: string;
  name: string;
  teams: Team[];
}

export interface GroupStanding {
  teamId: string;
  teamName: string;
  teamCountryCode: string;
  groupId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupMatch {
  id: string;
  groupId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCountryCode: string;
  awayTeamCountryCode: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  date: string;
  time?: string;
  minute?: number;
}

export interface QualifiedTeam {
  teamId: string;
  teamName: string;
  teamCountryCode: string;
  groupId: string;
  position: number;
  qualificationType: "direct" | "third_place";
}

export interface KnockoutRound {
  id: string;
  name: string;
  phase: TournamentPhase;
}

export interface KnockoutMatch {
  id: string;
  phase: TournamentPhase;
  homeTeamName: string;
  homeTeamCountryCode?: string;
  awayTeamName: string;
  awayTeamCountryCode?: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  winnerTeamName?: string;
  date?: string;
}

export interface TopScorer {
  id: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamCountryCode: string;
  goals: number;
  assists?: number;
  matchesPlayed: number;
  penalties?: number;
  minutesPlayed?: number;
  rank: number;
}
