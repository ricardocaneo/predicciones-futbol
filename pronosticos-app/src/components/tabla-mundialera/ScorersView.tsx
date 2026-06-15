import { createClient } from "@/lib/supabase/server";
import TeamFlag from "@/components/TeamFlag";

type ScorerRow = {
  id:           string;
  player_name:  string;
  team_name:    string;
  country_code: string;
  goals:        number;
  penalties:    number;
};

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}°`;
}

function ScorerTableRow({
  rank, scorer, isLeader, isUserPick,
}: {
  rank:       number;
  scorer:     ScorerRow;
  isLeader:   boolean;
  isUserPick: boolean;
}) {
  return (
    <tr className={`border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors ${
      isLeader   ? "bg-amber-50 dark:bg-amber-900/10"  :
      isUserPick ? "bg-blue-50 dark:bg-blue-900/10"    : ""
    }`}>
      <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-500 dark:text-slate-400 w-10">
        <span title={`Posición ${rank}`}>{rankMedal(rank)}</span>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2">
          {scorer.country_code && (
            <TeamFlag countryCode={scorer.country_code} name={scorer.team_name} size={20} />
          )}
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${
              isLeader   ? "text-amber-700 dark:text-amber-300"  :
              isUserPick ? "text-blue-700 dark:text-blue-300"    :
                           "text-slate-800 dark:text-slate-100"
            }`}>{scorer.player_name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{scorer.team_name}</p>
          </div>
          {isLeader && (
            <span className="shrink-0 text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded">
              Líder
            </span>
          )}
          {isUserPick && !isLeader && (
            <span className="shrink-0 text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 py-0.5 rounded">
              Tu pick
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5 text-center">
        <span className={`text-base font-black tabular-nums ${
          isLeader ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
        }`}>
          {scorer.goals}
        </span>
      </td>
      <td className="px-2 py-2.5 text-center tabular-nums text-sm text-slate-400 dark:text-slate-500">
        {scorer.penalties > 0 ? scorer.penalties : "–"}
      </td>
    </tr>
  );
}

export default async function ScorersView() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: scorerData } = await supabase
    .from("goals_from_events")
    .select("id, player_name, team_name, country_code, goals, penalties")
    .order("goals",       { ascending: false })
    .order("player_name", { ascending: true })
    .limit(30);

  const scorers = (scorerData ?? []) as ScorerRow[];

  // Resolver el pick de Bota de Oro del usuario (nombre completo desde players)
  let userPickPlayerName: string | null = null;
  if (user) {
    const { data: predRow } = await supabase
      .from("toque_maestro_predictions")
      .select("golden_boot_player_id")
      .eq("user_id", user.id)
      .single();

    if (predRow?.golden_boot_player_id) {
      const { data: playerData } = await supabase
        .from("players")
        .select("name")
        .eq("id", predRow.golden_boot_player_id)
        .single();
      userPickPlayerName = playerData?.name ?? null;
    }
  }

  // Buscar el pick del usuario en la lista: exacto primero, luego por apellido
  // (el feed live abrevia nombres: "F. Balogun" = "Folarin Balogun")
  const userPickScorer = userPickPlayerName
    ? scorers.find((s) => {
        if (s.player_name.toLowerCase() === userPickPlayerName!.toLowerCase()) return true;
        const lastName = userPickPlayerName!.split(" ").pop()?.toLowerCase() ?? "";
        return lastName.length > 2 && s.player_name.toLowerCase().includes(lastName);
      })
    : undefined;

  if (scorers.length === 0) {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-3xl mb-3">⚽</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200">Sin goles aún</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            La tabla de goleadores se actualizará automáticamente durante el torneo
          </p>
        </div>
      </div>
    );
  }

  const leader = scorers[0];
  const goalsBehind  = userPickScorer ? leader.goals - userPickScorer.goals : 0;
  const userPickRank = userPickScorer ? scorers.indexOf(userPickScorer) + 1 : null;

  return (
    <div className="space-y-5">
      {/* Tu candidato a Bota de Oro */}
      {userPickScorer && (
        <div className="bg-wc-navy/5 dark:bg-wc-navy/30 border border-wc-navy/20 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-wc-navy dark:text-slate-300 uppercase tracking-wide mb-3">
            ⭐ Tu candidato a Bota de Oro
          </p>
          <div className="flex items-center gap-3">
            {userPickScorer.country_code && (
              <TeamFlag
                countryCode={userPickScorer.country_code}
                name={userPickScorer.team_name}
                size={36}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 dark:text-white text-base truncate">
                {userPickPlayerName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userPickScorer.team_name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {userPickScorer.goals}
              </p>
              <p className="text-xs text-slate-400">goles</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Posición actual</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{userPickRank}°</span>
          </div>
          {goalsBehind > 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              A {goalsBehind} {goalsBehind === 1 ? "gol" : "goles"} del líder ({leader.player_name}, {leader.goals} goles)
            </p>
          ) : (
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
              ¡Es el líder de goleadores!
            </p>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">Ranking de Goleadores</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
                <th className="px-3 py-2 text-center font-medium w-10">#</th>
                <th className="px-2 py-2 text-left font-medium">Jugador</th>
                <th className="px-2 py-2 text-center font-bold text-slate-600 dark:text-slate-300 w-10">G</th>
                <th className="px-2 py-2 text-center font-medium w-10">P</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((scorer, i) => (
                <ScorerTableRow
                  key={scorer.id}
                  rank={i + 1}
                  scorer={scorer}
                  isLeader={i === 0}
                  isUserPick={scorer.id === userPickScorer?.id}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            G = Goles · P = Penales convertidos
          </p>
        </div>
      </div>
    </div>
  );
}
