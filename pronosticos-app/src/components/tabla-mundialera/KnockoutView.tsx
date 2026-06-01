// Bracket del Mundial 2026 — estructura pre-determinada por el sorteo FIFA.
// Los cruces específicos se actualizan a medida que avanza la fase de grupos.

type Slot = {
  label: string;  // "1° Grupo A", "Mejor 3°", etc.
  countryCode?: string; // se llena cuando el equipo clasifica
  teamName?:    string;
};

type KMatch = {
  id:       string;
  home:     Slot;
  away:     Slot;
  date:     string;
  homeScore?: number;
  awayScore?: number;
  status:   "scheduled" | "live" | "finished";
  winner?:  string;
};

type Round = {
  id:      string;
  name:    string;
  matches: KMatch[];
};

const ROUNDS: Round[] = [
  {
    id: "r32", name: "16avos de Final",
    matches: [
      { id: "r32-1",  home: { label: "1° Grupo A" }, away: { label: "2° Grupo B" }, date: "2026-06-27", status: "scheduled" },
      { id: "r32-2",  home: { label: "1° Grupo C" }, away: { label: "2° Grupo D" }, date: "2026-06-27", status: "scheduled" },
      { id: "r32-3",  home: { label: "1° Grupo E" }, away: { label: "2° Grupo F" }, date: "2026-06-28", status: "scheduled" },
      { id: "r32-4",  home: { label: "1° Grupo G" }, away: { label: "2° Grupo H" }, date: "2026-06-28", status: "scheduled" },
      { id: "r32-5",  home: { label: "1° Grupo I" }, away: { label: "2° Grupo J" }, date: "2026-06-29", status: "scheduled" },
      { id: "r32-6",  home: { label: "1° Grupo K" }, away: { label: "2° Grupo L" }, date: "2026-06-29", status: "scheduled" },
      { id: "r32-7",  home: { label: "1° Grupo B" }, away: { label: "2° Grupo A" }, date: "2026-06-30", status: "scheduled" },
      { id: "r32-8",  home: { label: "1° Grupo D" }, away: { label: "2° Grupo C" }, date: "2026-06-30", status: "scheduled" },
      { id: "r32-9",  home: { label: "1° Grupo F" }, away: { label: "2° Grupo E" }, date: "2026-07-01", status: "scheduled" },
      { id: "r32-10", home: { label: "1° Grupo H" }, away: { label: "2° Grupo G" }, date: "2026-07-01", status: "scheduled" },
      { id: "r32-11", home: { label: "1° Grupo J" }, away: { label: "2° Grupo I" }, date: "2026-07-02", status: "scheduled" },
      { id: "r32-12", home: { label: "1° Grupo L" }, away: { label: "2° Grupo K" }, date: "2026-07-02", status: "scheduled" },
      { id: "r32-13", home: { label: "Mejor 3° (A/B/C)" }, away: { label: "Mejor 3° (D/E/F)" }, date: "2026-07-03", status: "scheduled" },
      { id: "r32-14", home: { label: "Mejor 3° (G/H/I)" }, away: { label: "Mejor 3° (J/K/L)" }, date: "2026-07-03", status: "scheduled" },
      { id: "r32-15", home: { label: "Mejor 3° (A/C/E/G)" }, away: { label: "Mejor 3° (B/D/F/H)" }, date: "2026-07-04", status: "scheduled" },
      { id: "r32-16", home: { label: "Mejor 3° (I/J/K/L)" }, away: { label: "Por definir" }, date: "2026-07-04", status: "scheduled" },
    ],
  },
  {
    id: "r16", name: "Octavos de Final",
    matches: [
      { id: "r16-1", home: { label: "G. 16avo 1" }, away: { label: "G. 16avo 2" }, date: "2026-07-07", status: "scheduled" },
      { id: "r16-2", home: { label: "G. 16avo 3" }, away: { label: "G. 16avo 4" }, date: "2026-07-07", status: "scheduled" },
      { id: "r16-3", home: { label: "G. 16avo 5" }, away: { label: "G. 16avo 6" }, date: "2026-07-08", status: "scheduled" },
      { id: "r16-4", home: { label: "G. 16avo 7" }, away: { label: "G. 16avo 8" }, date: "2026-07-08", status: "scheduled" },
      { id: "r16-5", home: { label: "G. 16avo 9" }, away: { label: "G. 16avo 10" }, date: "2026-07-09", status: "scheduled" },
      { id: "r16-6", home: { label: "G. 16avo 11" }, away: { label: "G. 16avo 12" }, date: "2026-07-09", status: "scheduled" },
      { id: "r16-7", home: { label: "G. 16avo 13" }, away: { label: "G. 16avo 14" }, date: "2026-07-10", status: "scheduled" },
      { id: "r16-8", home: { label: "G. 16avo 15" }, away: { label: "G. 16avo 16" }, date: "2026-07-10", status: "scheduled" },
    ],
  },
  {
    id: "qf", name: "Cuartos de Final",
    matches: [
      { id: "qf-1", home: { label: "G. Octavos 1" }, away: { label: "G. Octavos 2" }, date: "2026-07-14", status: "scheduled" },
      { id: "qf-2", home: { label: "G. Octavos 3" }, away: { label: "G. Octavos 4" }, date: "2026-07-14", status: "scheduled" },
      { id: "qf-3", home: { label: "G. Octavos 5" }, away: { label: "G. Octavos 6" }, date: "2026-07-15", status: "scheduled" },
      { id: "qf-4", home: { label: "G. Octavos 7" }, away: { label: "G. Octavos 8" }, date: "2026-07-15", status: "scheduled" },
    ],
  },
  {
    id: "sf", name: "Semifinales",
    matches: [
      { id: "sf-1", home: { label: "G. Cuartos 1" }, away: { label: "G. Cuartos 2" }, date: "2026-07-18", status: "scheduled" },
      { id: "sf-2", home: { label: "G. Cuartos 3" }, away: { label: "G. Cuartos 4" }, date: "2026-07-19", status: "scheduled" },
    ],
  },
  {
    id: "tp", name: "Tercer y Cuarto Puesto",
    matches: [
      { id: "tp-1", home: { label: "Perdedor SF 1" }, away: { label: "Perdedor SF 2" }, date: "2026-07-22", status: "scheduled" },
    ],
  },
  {
    id: "fin", name: "Gran Final",
    matches: [
      { id: "fin-1", home: { label: "Ganador SF 1" }, away: { label: "Ganador SF 2" }, date: "2026-07-23", status: "scheduled" },
    ],
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("es", {
    day: "numeric", month: "short", timeZone: "America/Santiago",
  });
}

function MatchCard({ match }: { match: KMatch }) {
  const isFinished = match.status === "finished";
  const isLive     = match.status === "live";
  const isPending  = !match.home.teamName && !match.home.countryCode;

  return (
    <div className={`rounded-xl overflow-hidden ${
      isFinished
        ? "bg-slate-50 dark:bg-slate-800/40"
        : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
    }`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Local */}
        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
          <span className={`text-sm truncate text-right ${
            isPending
              ? "text-slate-400 dark:text-slate-500 italic text-xs"
              : isFinished && match.winner === match.home.teamName
              ? "font-bold text-slate-900 dark:text-white"
              : "font-medium text-slate-700 dark:text-slate-200"
          }`}>
            {match.home.teamName ?? match.home.label}
          </span>
        </div>

        {/* Marcador / separador */}
        <div className="shrink-0 min-w-15 text-center">
          {isFinished && match.homeScore !== undefined ? (
            <span className="font-black text-lg tabular-nums text-slate-900 dark:text-white">
              {match.homeScore} – {match.awayScore}
            </span>
          ) : isLive && match.homeScore !== undefined ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-black text-lg tabular-nums text-slate-900 dark:text-white">
                {match.homeScore} – {match.awayScore}
              </span>
              <span className="text-xs font-bold text-green-500 leading-none">EN VIVO</span>
            </div>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 font-medium text-sm">vs</span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`text-sm truncate ${
            isPending
              ? "text-slate-400 dark:text-slate-500 italic text-xs"
              : isFinished && match.winner === match.away.teamName
              ? "font-bold text-slate-900 dark:text-white"
              : "font-medium text-slate-700 dark:text-slate-200"
          }`}>
            {match.away.teamName ?? match.away.label}
          </span>
        </div>
      </div>

      {/* Pie */}
      <div className="flex items-center justify-between px-3 pb-2 -mt-1">
        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
          {match.winner ? `✓ ${match.winner} avanzó` : ""}
        </span>
        {!isFinished && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(match.date)}</span>
        )}
      </div>
    </div>
  );
}

export default function KnockoutView() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
        Los cruces se definirán al finalizar la fase de grupos. El bracket sigue la estructura oficial del sorteo FIFA.
      </p>

      {ROUNDS.map((round) => (
        <section key={round.id}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight uppercase">
              {round.name}
            </h2>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
              {round.matches.filter((m) => m.status === "finished").length}/{round.matches.length}
            </span>
          </div>
          <div className="space-y-2">
            {round.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
