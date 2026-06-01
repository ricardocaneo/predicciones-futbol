import type {
  WorldCupGroup,
  GroupStanding,
  GroupMatch,
  QualifiedTeam,
  KnockoutRound,
  KnockoutMatch,
  TopScorer,
} from "@/types";

// ────────────────────────────────────────────────────────────────────────────
// Grupos (4 de 12 mostrados como ejemplo)
// ────────────────────────────────────────────────────────────────────────────
export const WORLD_CUP_GROUPS: WorldCupGroup[] = [
  {
    id: "A", name: "Grupo A",
    teams: [
      { id: "wt-ar",  name: "Argentina",     shortName: "ARG", countryCode: "ar"     },
      { id: "wt-fr",  name: "Francia",        shortName: "FRA", countryCode: "fr"     },
      { id: "wt-au",  name: "Australia",      shortName: "AUS", countryCode: "au"     },
      { id: "wt-sa",  name: "Arabia Saudita", shortName: "KSA", countryCode: "sa"     },
    ],
  },
  {
    id: "B", name: "Grupo B",
    teams: [
      { id: "wt-br",  name: "Brasil",         shortName: "BRA", countryCode: "br"     },
      { id: "wt-de",  name: "Alemania",        shortName: "GER", countryCode: "de"     },
      { id: "wt-ch",  name: "Suiza",           shortName: "SUI", countryCode: "ch"     },
      { id: "wt-cm",  name: "Camerún",         shortName: "CMR", countryCode: "cm"     },
    ],
  },
  {
    id: "C", name: "Grupo C",
    teams: [
      { id: "wt-es",  name: "España",          shortName: "ESP", countryCode: "es"     },
      { id: "wt-pt",  name: "Portugal",        shortName: "POR", countryCode: "pt"     },
      { id: "wt-mx",  name: "México",          shortName: "MEX", countryCode: "mx"     },
      { id: "wt-ma",  name: "Marruecos",       shortName: "MAR", countryCode: "ma"     },
    ],
  },
  {
    id: "D", name: "Grupo D",
    teams: [
      { id: "wt-nl",  name: "Países Bajos",   shortName: "NED", countryCode: "nl"     },
      { id: "wt-eng", name: "Inglaterra",      shortName: "ENG", countryCode: "gb-eng" },
      { id: "wt-sn",  name: "Senegal",         shortName: "SEN", countryCode: "sn"     },
      { id: "wt-ir",  name: "Irán",            shortName: "IRN", countryCode: "ir"     },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Tablas de posiciones
// Todos los valores verificados contra los resultados de GROUP_MATCHES.
// ────────────────────────────────────────────────────────────────────────────
export const GROUP_STANDINGS: GroupStanding[] = [
  // ── Grupo A ────────────────────────────────────────────────────────────────
  { teamId: "wt-ar",  teamName: "Argentina",     teamCountryCode: "ar",     groupId: "A", position: 1, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 1, goalDifference:  6, points: 9 },
  { teamId: "wt-fr",  teamName: "Francia",        teamCountryCode: "fr",     groupId: "A", position: 2, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, goalDifference:  2, points: 6 },
  { teamId: "wt-au",  teamName: "Australia",      teamCountryCode: "au",     groupId: "A", position: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: 3 },
  { teamId: "wt-sa",  teamName: "Arabia Saudita", teamCountryCode: "sa",     groupId: "A", position: 4, played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 1, goalsAgainst: 7, goalDifference: -6, points: 0 },
  // ── Grupo B ────────────────────────────────────────────────────────────────
  { teamId: "wt-br",  teamName: "Brasil",         teamCountryCode: "br",     groupId: "B", position: 1, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 2, goalDifference:  3, points: 7 },
  { teamId: "wt-de",  teamName: "Alemania",        teamCountryCode: "de",     groupId: "B", position: 2, played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 5, goalsAgainst: 2, goalDifference:  3, points: 5 },
  { teamId: "wt-ch",  teamName: "Suiza",           teamCountryCode: "ch",     groupId: "B", position: 3, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, goalDifference:  0, points: 4 },
  { teamId: "wt-cm",  teamName: "Camerún",         teamCountryCode: "cm",     groupId: "B", position: 4, played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 0, goalsAgainst: 6, goalDifference: -6, points: 0 },
  // ── Grupo C ────────────────────────────────────────────────────────────────
  { teamId: "wt-es",  teamName: "España",          teamCountryCode: "es",     groupId: "C", position: 1, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference:  3, points: 7 },
  { teamId: "wt-pt",  teamName: "Portugal",        teamCountryCode: "pt",     groupId: "C", position: 2, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 2, goalDifference:  2, points: 6 },
  { teamId: "wt-mx",  teamName: "México",          teamCountryCode: "mx",     groupId: "C", position: 3, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference:  1, points: 4 },
  { teamId: "wt-ma",  teamName: "Marruecos",       teamCountryCode: "ma",     groupId: "C", position: 4, played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 0, goalsAgainst: 6, goalDifference: -6, points: 0 },
  // ── Grupo D ────────────────────────────────────────────────────────────────
  { teamId: "wt-nl",  teamName: "Países Bajos",   teamCountryCode: "nl",     groupId: "D", position: 1, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 4, goalDifference:  2, points: 7 },
  { teamId: "wt-eng", teamName: "Inglaterra",      teamCountryCode: "gb-eng", groupId: "D", position: 2, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 6, goalsAgainst: 4, goalDifference:  2, points: 6 },
  { teamId: "wt-sn",  teamName: "Senegal",         teamCountryCode: "sn",     groupId: "D", position: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 3 },
  { teamId: "wt-ir",  teamName: "Irán",            teamCountryCode: "ir",     groupId: "D", position: 4, played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 3, goalsAgainst: 6, goalDifference: -3, points: 1 },
];

export function getGroupStandings(groupId: string): GroupStanding[] {
  return GROUP_STANDINGS.filter((s) => s.groupId === groupId)
    .sort((a, b) => a.position - b.position);
}

export function getBestThirds(): GroupStanding[] {
  return GROUP_STANDINGS.filter((s) => s.position === 3)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
}

// ────────────────────────────────────────────────────────────────────────────
// Partidos de fase de grupos
// Resultados verificados matemáticamente contra GROUP_STANDINGS.
// ────────────────────────────────────────────────────────────────────────────
export const GROUP_MATCHES: GroupMatch[] = [
  // ── Grupo A ────────────────────────────────────────────────────────────────
  { id: "gm-a1", groupId: "A", homeTeamId: "wt-ar", awayTeamId: "wt-au",  homeTeamName: "Argentina",    awayTeamName: "Australia",      homeTeamCountryCode: "ar",     awayTeamCountryCode: "au",     homeScore: 2, awayScore: 0, status: "finished", date: "2026-06-11" },
  { id: "gm-a2", groupId: "A", homeTeamId: "wt-fr", awayTeamId: "wt-sa",  homeTeamName: "Francia",       awayTeamName: "Arabia Saudita", homeTeamCountryCode: "fr",     awayTeamCountryCode: "sa",     homeScore: 3, awayScore: 0, status: "finished", date: "2026-06-11" },
  { id: "gm-a3", groupId: "A", homeTeamId: "wt-ar", awayTeamId: "wt-fr",  homeTeamName: "Argentina",    awayTeamName: "Francia",        homeTeamCountryCode: "ar",     awayTeamCountryCode: "fr",     homeScore: 2, awayScore: 0, status: "finished", date: "2026-06-15" },
  { id: "gm-a4", groupId: "A", homeTeamId: "wt-au", awayTeamId: "wt-sa",  homeTeamName: "Australia",     awayTeamName: "Arabia Saudita", homeTeamCountryCode: "au",     awayTeamCountryCode: "sa",     homeScore: 1, awayScore: 0, status: "finished", date: "2026-06-15" },
  { id: "gm-a5", groupId: "A", homeTeamId: "wt-ar", awayTeamId: "wt-sa",  homeTeamName: "Argentina",    awayTeamName: "Arabia Saudita", homeTeamCountryCode: "ar",     awayTeamCountryCode: "sa",     homeScore: 3, awayScore: 1, status: "finished", date: "2026-06-19" },
  { id: "gm-a6", groupId: "A", homeTeamId: "wt-fr", awayTeamId: "wt-au",  homeTeamName: "Francia",       awayTeamName: "Australia",      homeTeamCountryCode: "fr",     awayTeamCountryCode: "au",     homeScore: 2, awayScore: 1, status: "finished", date: "2026-06-19" },
  // ── Grupo B ────────────────────────────────────────────────────────────────
  { id: "gm-b1", groupId: "B", homeTeamId: "wt-br", awayTeamId: "wt-cm",  homeTeamName: "Brasil",        awayTeamName: "Camerún",        homeTeamCountryCode: "br",     awayTeamCountryCode: "cm",     homeScore: 2, awayScore: 0, status: "finished", date: "2026-06-12" },
  { id: "gm-b2", groupId: "B", homeTeamId: "wt-de", awayTeamId: "wt-ch",  homeTeamName: "Alemania",       awayTeamName: "Suiza",          homeTeamCountryCode: "de",     awayTeamCountryCode: "ch",     homeScore: 1, awayScore: 1, status: "finished", date: "2026-06-12" },
  { id: "gm-b3", groupId: "B", homeTeamId: "wt-br", awayTeamId: "wt-ch",  homeTeamName: "Brasil",        awayTeamName: "Suiza",          homeTeamCountryCode: "br",     awayTeamCountryCode: "ch",     homeScore: 2, awayScore: 1, status: "finished", date: "2026-06-16" },
  { id: "gm-b4", groupId: "B", homeTeamId: "wt-cm", awayTeamId: "wt-de",  homeTeamName: "Camerún",        awayTeamName: "Alemania",       homeTeamCountryCode: "cm",     awayTeamCountryCode: "de",     homeScore: 0, awayScore: 3, status: "finished", date: "2026-06-16" },
  { id: "gm-b5", groupId: "B", homeTeamId: "wt-br", awayTeamId: "wt-de",  homeTeamName: "Brasil",        awayTeamName: "Alemania",       homeTeamCountryCode: "br",     awayTeamCountryCode: "de",     homeScore: 1, awayScore: 1, status: "finished", date: "2026-06-20" },
  { id: "gm-b6", groupId: "B", homeTeamId: "wt-cm", awayTeamId: "wt-ch",  homeTeamName: "Camerún",        awayTeamName: "Suiza",          homeTeamCountryCode: "cm",     awayTeamCountryCode: "ch",     homeScore: 0, awayScore: 1, status: "finished", date: "2026-06-20" },
  // ── Grupo C ────────────────────────────────────────────────────────────────
  { id: "gm-c1", groupId: "C", homeTeamId: "wt-es", awayTeamId: "wt-ma",  homeTeamName: "España",        awayTeamName: "Marruecos",      homeTeamCountryCode: "es",     awayTeamCountryCode: "ma",     homeScore: 2, awayScore: 0, status: "finished", date: "2026-06-13" },
  { id: "gm-c2", groupId: "C", homeTeamId: "wt-pt", awayTeamId: "wt-mx",  homeTeamName: "Portugal",      awayTeamName: "México",         homeTeamCountryCode: "pt",     awayTeamCountryCode: "mx",     homeScore: 2, awayScore: 1, status: "finished", date: "2026-06-13" },
  { id: "gm-c3", groupId: "C", homeTeamId: "wt-es", awayTeamId: "wt-mx",  homeTeamName: "España",        awayTeamName: "México",         homeTeamCountryCode: "es",     awayTeamCountryCode: "mx",     homeScore: 1, awayScore: 1, status: "finished", date: "2026-06-17" },
  { id: "gm-c4", groupId: "C", homeTeamId: "wt-ma", awayTeamId: "wt-pt",  homeTeamName: "Marruecos",     awayTeamName: "Portugal",       homeTeamCountryCode: "ma",     awayTeamCountryCode: "pt",     homeScore: 0, awayScore: 2, status: "finished", date: "2026-06-17" },
  { id: "gm-c5", groupId: "C", homeTeamId: "wt-es", awayTeamId: "wt-pt",  homeTeamName: "España",        awayTeamName: "Portugal",       homeTeamCountryCode: "es",     awayTeamCountryCode: "pt",     homeScore: 1, awayScore: 0, status: "finished", date: "2026-06-21" },
  { id: "gm-c6", groupId: "C", homeTeamId: "wt-mx", awayTeamId: "wt-ma",  homeTeamName: "México",        awayTeamName: "Marruecos",      homeTeamCountryCode: "mx",     awayTeamCountryCode: "ma",     homeScore: 2, awayScore: 0, status: "finished", date: "2026-06-21" },
  // ── Grupo D ────────────────────────────────────────────────────────────────
  { id: "gm-d1", groupId: "D", homeTeamId: "wt-eng", awayTeamId: "wt-sn", homeTeamName: "Inglaterra",   awayTeamName: "Senegal",        homeTeamCountryCode: "gb-eng", awayTeamCountryCode: "sn",     homeScore: 2, awayScore: 1, status: "finished", date: "2026-06-14" },
  { id: "gm-d2", groupId: "D", homeTeamId: "wt-nl",  awayTeamId: "wt-ir", homeTeamName: "Países Bajos",  awayTeamName: "Irán",           homeTeamCountryCode: "nl",     awayTeamCountryCode: "ir",     homeScore: 2, awayScore: 2, status: "finished", date: "2026-06-14" },
  { id: "gm-d3", groupId: "D", homeTeamId: "wt-eng", awayTeamId: "wt-ir", homeTeamName: "Inglaterra",   awayTeamName: "Irán",           homeTeamCountryCode: "gb-eng", awayTeamCountryCode: "ir",     homeScore: 3, awayScore: 1, status: "finished", date: "2026-06-18" },
  { id: "gm-d4", groupId: "D", homeTeamId: "wt-sn",  awayTeamId: "wt-nl", homeTeamName: "Senegal",       awayTeamName: "Países Bajos",  homeTeamCountryCode: "sn",     awayTeamCountryCode: "nl",     homeScore: 1, awayScore: 2, status: "finished", date: "2026-06-18" },
  { id: "gm-d5", groupId: "D", homeTeamId: "wt-eng", awayTeamId: "wt-nl", homeTeamName: "Inglaterra",   awayTeamName: "Países Bajos",  homeTeamCountryCode: "gb-eng", awayTeamCountryCode: "nl",     homeScore: 1, awayScore: 2, status: "finished", date: "2026-06-22" },
  { id: "gm-d6", groupId: "D", homeTeamId: "wt-sn",  awayTeamId: "wt-ir", homeTeamName: "Senegal",       awayTeamName: "Irán",           homeTeamCountryCode: "sn",     awayTeamCountryCode: "ir",     homeScore: 1, awayScore: 0, status: "finished", date: "2026-06-22" },
];

export function getGroupMatches(groupId: string): GroupMatch[] {
  return GROUP_MATCHES.filter((m) => m.groupId === groupId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ────────────────────────────────────────────────────────────────────────────
// Equipos clasificados
// ────────────────────────────────────────────────────────────────────────────
export const QUALIFIED_TEAMS: QualifiedTeam[] = [
  { teamId: "wt-ar",  teamName: "Argentina",    teamCountryCode: "ar",     groupId: "A", position: 1, qualificationType: "direct"      },
  { teamId: "wt-fr",  teamName: "Francia",       teamCountryCode: "fr",     groupId: "A", position: 2, qualificationType: "direct"      },
  { teamId: "wt-br",  teamName: "Brasil",        teamCountryCode: "br",     groupId: "B", position: 1, qualificationType: "direct"      },
  { teamId: "wt-de",  teamName: "Alemania",       teamCountryCode: "de",     groupId: "B", position: 2, qualificationType: "direct"      },
  { teamId: "wt-es",  teamName: "España",         teamCountryCode: "es",     groupId: "C", position: 1, qualificationType: "direct"      },
  { teamId: "wt-pt",  teamName: "Portugal",       teamCountryCode: "pt",     groupId: "C", position: 2, qualificationType: "direct"      },
  { teamId: "wt-nl",  teamName: "Países Bajos",  teamCountryCode: "nl",     groupId: "D", position: 1, qualificationType: "direct"      },
  { teamId: "wt-eng", teamName: "Inglaterra",    teamCountryCode: "gb-eng", groupId: "D", position: 2, qualificationType: "direct"      },
  { teamId: "wt-mx",  teamName: "México",         teamCountryCode: "mx",     groupId: "C", position: 3, qualificationType: "third_place" },
  { teamId: "wt-ch",  teamName: "Suiza",          teamCountryCode: "ch",     groupId: "B", position: 3, qualificationType: "third_place" },
];

// ────────────────────────────────────────────────────────────────────────────
// Fase eliminatoria
// ────────────────────────────────────────────────────────────────────────────
export const KNOCKOUT_ROUNDS: KnockoutRound[] = [
  { id: "r32", name: "16avos de Final",          phase: "round_of_32"   },
  { id: "r16", name: "Octavos de Final",          phase: "round_of_16"   },
  { id: "qf",  name: "Cuartos de Final",          phase: "quarter_final" },
  { id: "sf",  name: "Semifinales",               phase: "semi_final"    },
  { id: "tp",  name: "Tercer y Cuarto Puesto",    phase: "third_place"   },
  { id: "fin", name: "Gran Final",                phase: "final"         },
];

export const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  // ── 16avos de Final ────────────────────────────────────────────────────────
  { id: "km-r32-1", phase: "round_of_32",   homeTeamName: "Argentina",    homeTeamCountryCode: "ar",     awayTeamName: "Suiza",          awayTeamCountryCode: "ch",     homeScore: 2, awayScore: 0, status: "finished", winnerTeamName: "Argentina",   date: "2026-06-25" },
  { id: "km-r32-2", phase: "round_of_32",   homeTeamName: "Francia",       homeTeamCountryCode: "fr",     awayTeamName: "Australia",      awayTeamCountryCode: "au",     homeScore: 3, awayScore: 1, status: "finished", winnerTeamName: "Francia",     date: "2026-06-25" },
  { id: "km-r32-3", phase: "round_of_32",   homeTeamName: "Brasil",        homeTeamCountryCode: "br",     awayTeamName: "México",         awayTeamCountryCode: "mx",     status: "scheduled", date: "2026-06-28" },
  { id: "km-r32-4", phase: "round_of_32",   homeTeamName: "Alemania",       homeTeamCountryCode: "de",     awayTeamName: "Senegal",        awayTeamCountryCode: "sn",     status: "scheduled", date: "2026-06-28" },
  { id: "km-r32-5", phase: "round_of_32",   homeTeamName: "España",         homeTeamCountryCode: "es",     awayTeamName: "Irán",           awayTeamCountryCode: "ir",     status: "scheduled", date: "2026-06-29" },
  { id: "km-r32-6", phase: "round_of_32",   homeTeamName: "Portugal",       homeTeamCountryCode: "pt",     awayTeamName: "Países Bajos",  awayTeamCountryCode: "nl",     status: "scheduled", date: "2026-06-29" },
  { id: "km-r32-7", phase: "round_of_32",   homeTeamName: "Inglaterra",    homeTeamCountryCode: "gb-eng", awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-06-30" },
  { id: "km-r32-8", phase: "round_of_32",   homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-06-30" },
  // ── Octavos de Final ───────────────────────────────────────────────────────
  { id: "km-r16-1", phase: "round_of_16",   homeTeamName: "Argentina",    homeTeamCountryCode: "ar",     awayTeamName: "Inglaterra",    awayTeamCountryCode: "gb-eng", status: "scheduled", date: "2026-07-03" },
  { id: "km-r16-2", phase: "round_of_16",   homeTeamName: "Francia",       homeTeamCountryCode: "fr",     awayTeamName: "Alemania",       awayTeamCountryCode: "de",     status: "scheduled", date: "2026-07-03" },
  { id: "km-r16-3", phase: "round_of_16",   homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-04" },
  { id: "km-r16-4", phase: "round_of_16",   homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-04" },
  // ── Cuartos de Final ───────────────────────────────────────────────────────
  { id: "km-qf-1",  phase: "quarter_final", homeTeamName: "Brasil",        homeTeamCountryCode: "br",     awayTeamName: "España",         awayTeamCountryCode: "es",     homeScore: 2, awayScore: 1, status: "finished", winnerTeamName: "Brasil",      date: "2026-07-07" },
  { id: "km-qf-2",  phase: "quarter_final", homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-07" },
  { id: "km-qf-3",  phase: "quarter_final", homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-08" },
  { id: "km-qf-4",  phase: "quarter_final", homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-08" },
  // ── Semifinales ────────────────────────────────────────────────────────────
  { id: "km-sf-1",  phase: "semi_final",    homeTeamName: "Brasil",        homeTeamCountryCode: "br",     awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-14" },
  { id: "km-sf-2",  phase: "semi_final",    homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-15" },
  // ── Tercer y Cuarto Puesto ─────────────────────────────────────────────────
  { id: "km-tp-1",  phase: "third_place",   homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-18" },
  // ── Gran Final ─────────────────────────────────────────────────────────────
  { id: "km-fin-1", phase: "final",         homeTeamName: "Por definir",                                  awayTeamName: "Por definir",                                   status: "scheduled", date: "2026-07-19" },
];

export function getKnockoutMatchesByPhase(phase: string): KnockoutMatch[] {
  return KNOCKOUT_MATCHES.filter((m) => m.phase === phase);
}

// ────────────────────────────────────────────────────────────────────────────
// Goleadores
// ────────────────────────────────────────────────────────────────────────────
export const TOP_SCORERS: TopScorer[] = [
  { id: "ts-1", rank: 1, playerName: "Kylian Mbappé",  teamId: "wt-fr",  teamName: "Francia",       teamCountryCode: "fr",     goals: 6, assists: 2, matchesPlayed: 4, penalties: 1 },
  { id: "ts-2", rank: 2, playerName: "Lionel Messi",   teamId: "wt-ar",  teamName: "Argentina",    teamCountryCode: "ar",     goals: 5, assists: 4, matchesPlayed: 4, penalties: 0 },
  { id: "ts-3", rank: 3, playerName: "Vinicius Jr.",   teamId: "wt-br",  teamName: "Brasil",        teamCountryCode: "br",     goals: 4, assists: 3, matchesPlayed: 4, penalties: 0 },
  { id: "ts-4", rank: 4, playerName: "Lamine Yamal",   teamId: "wt-es",  teamName: "España",        teamCountryCode: "es",     goals: 3, assists: 5, matchesPlayed: 4, penalties: 0 },
  { id: "ts-5", rank: 5, playerName: "Rafael Leão",    teamId: "wt-pt",  teamName: "Portugal",      teamCountryCode: "pt",     goals: 3, assists: 2, matchesPlayed: 3, penalties: 0 },
  { id: "ts-6", rank: 6, playerName: "Harry Kane",     teamId: "wt-eng", teamName: "Inglaterra",   teamCountryCode: "gb-eng", goals: 3, assists: 1, matchesPlayed: 3, penalties: 2 },
  { id: "ts-7", rank: 7, playerName: "Cody Gakpo",     teamId: "wt-nl",  teamName: "Países Bajos", teamCountryCode: "nl",     goals: 2, assists: 2, matchesPlayed: 3, penalties: 0 },
  { id: "ts-8", rank: 8, playerName: "Kai Havertz",    teamId: "wt-de",  teamName: "Alemania",      teamCountryCode: "de",     goals: 2, assists: 1, matchesPlayed: 3, penalties: 1 },
];
