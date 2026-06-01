import type { Metadata } from "next";
import { SCORING_MATRIX, ADVANCEMENT_BONUS, LIVE_WINDOW_MINUTES, MASTER_TOUCH_POINTS, PHASE_LABELS } from "@/lib/scoring-rules";
import type { TournamentPhase } from "@/types";

export const metadata: Metadata = {
  title: "Bases del Juego — El Juego del Mundial",
};

const PHASES_ORDER: TournamentPhase[] = [
  "group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Pill({ children, color = "slate" }: { children: React.ReactNode; color?: "green" | "amber" | "blue" | "gold" | "slate" }) {
  const colors = {
    green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    blue:  "bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-400",
    gold:  "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${colors[color]}`}>
      {children}
    </span>
  );
}

export default function BasesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Bases del Juego</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Cómo funciona El Juego del Mundial 2026
        </p>
      </div>

      {/* Cómo jugar */}
      <Section title="Cómo jugar">
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-wc-navy text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Pronostica el marcador exacto de cada partido <strong className="text-slate-800 dark:text-slate-100">antes de que comience</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-wc-navy text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>Durante los primeros <strong className="text-slate-800 dark:text-slate-100">{LIVE_WINDOW_MINUTES} minutos</strong> del partido puedes ingresar un pronóstico en vivo (reemplaza el anterior, puntuación distinta).</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-wc-navy text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Completa tu <strong className="text-slate-800 dark:text-slate-100">Toque Maestro</strong>: elige campeón, subcampeón y Bota de Oro antes del cierre.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-wc-navy text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span>Acumula puntos y escala el ranking. ¡Gana quien tenga más puntos al final del torneo!</span>
          </li>
        </ol>
      </Section>

      {/* Sistema de puntos */}
      <Section title="Sistema de puntos por fase">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="text-left py-2 px-1 font-medium">Fase</th>
                <th className="text-center py-2 px-1 font-medium w-14">Exacto</th>
                <th className="text-center py-2 px-1 font-medium w-14">Dif. goles</th>
                <th className="text-center py-2 px-1 font-medium w-16">Tendencia</th>
                <th className="text-center py-2 px-1 font-medium w-16">Consuelo</th>
                <th className="text-center py-2 px-1 font-medium w-14">En vivo</th>
              </tr>
            </thead>
            <tbody>
              {PHASES_ORDER.map((phase) => {
                const m = SCORING_MATRIX[phase];
                return (
                  <tr key={phase} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 px-1 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {PHASE_LABELS[phase]}
                    </td>
                    <td className="py-2 px-1 text-center">
                      <Pill color="green">+{m.exact}</Pill>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <Pill color="amber">+{m.goalDiff}</Pill>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <Pill color="amber">+{m.tendency}</Pill>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <Pill>{m.consolation > 0 ? `+${m.consolation}` : "–"}</Pill>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <Pill color="blue">+{m.liveExact}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Definiciones</p>
          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <Pill color="green">Exacto</Pill>
              <span>Marcador exacto correcto (ej. predijiste 2-1 y fue 2-1).</span>
            </li>
            <li className="flex items-start gap-2">
              <Pill color="amber">Dif. goles</Pill>
              <span>Diferencia de goles correcta pero no el marcador exacto (ej. predijiste 3-1, fue 2-0 — ambos +2).</span>
            </li>
            <li className="flex items-start gap-2">
              <Pill color="amber">Tendencia</Pill>
              <span>Acertaste quién gana o que empatarían, sin la diferencia exacta.</span>
            </li>
            <li className="flex items-start gap-2">
              <Pill>Consuelo</Pill>
              <span>Fallaste la tendencia pero al menos un equipo anotó exactamente los goles que predijiste.</span>
            </li>
            <li className="flex items-start gap-2">
              <Pill color="blue">En vivo</Pill>
              <span>Pronóstico ingresado durante la ventana en vivo (minutos 1–{LIVE_WINDOW_MINUTES}). Solo puntúa si el marcador final es exacto.</span>
            </li>
          </ul>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Las categorías son mutuamente excluyentes y se aplica la de mayor valor.
          </p>
        </div>
      </Section>

      {/* Pronóstico en vivo */}
      <Section title="Pronóstico en vivo">
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 mt-1.5" />
            <p>
              Durante los primeros <strong className="text-slate-800 dark:text-slate-100">{LIVE_WINDOW_MINUTES} minutos</strong> de cada partido
              puedes ingresar un pronóstico en vivo. La ventana se cierra al minuto {LIVE_WINDOW_MINUTES + 1}.
            </p>
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">→</span>
              El pronóstico en vivo <strong className="text-slate-800 dark:text-slate-100">reemplaza</strong> al pronóstico regular. Solo puede haber uno activo.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">→</span>
              Con un pronóstico en vivo renuncias a la matriz tradicional: solo puntúas si aciertas el marcador final exacto.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 shrink-0">→</span>
              Los puntos en vivo son menores que un exacto pre-partido (ver tabla), pero puedes ajustar tu predicción con el partido ya comenzado.
            </li>
          </ul>
        </div>
      </Section>

      {/* Bono por clasificado */}
      <Section title="Bono por clasificado (fase eliminatoria)">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          En la fase eliminatoria, acertar la tendencia (quién avanza) otorga puntos adicionales:
        </p>
        <div className="space-y-2">
          {PHASES_ORDER.filter((p) => p !== "group").map((phase) => {
            const bonus = ADVANCEMENT_BONUS[phase];
            if (!bonus) return null;
            return (
              <div key={phase} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                <span className="text-sm text-slate-700 dark:text-slate-200">{PHASE_LABELS[phase]}</span>
                <Pill color="gold">+{bonus} bono</Pill>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          El bono se suma al puntaje base cuando la tendencia es correcta (no se aplica si el pronóstico no acertó el ganador).
        </p>
      </Section>

      {/* Toque Maestro */}
      <Section title="⭐ Toque Maestro">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Antes del inicio de la segunda fecha de grupos, elige tus tres grandes apuestas del torneo:
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">🏆 Campeón del Mundo</p>
              <p className="text-xs text-slate-400">El equipo que levanta la copa</p>
            </div>
            <Pill color="gold">+{MASTER_TOUCH_POINTS.champion}</Pill>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">🥈 Subcampeón</p>
              <p className="text-xs text-slate-400">El finalista que pierde</p>
            </div>
            <Pill color="gold">+{MASTER_TOUCH_POINTS.runnerUp}</Pill>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">⚽ Bota de Oro</p>
              <p className="text-xs text-slate-400">El máximo goleador del torneo</p>
            </div>
            <Pill color="gold">+{MASTER_TOUCH_POINTS.goldenBoot}</Pill>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">🔄 Casi Casi</p>
              <p className="text-xs text-slate-400">Elegiste el campeón y subcampeón pero invertidos</p>
            </div>
            <Pill color="gold">+{MASTER_TOUCH_POINTS.casiCasi}</Pill>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          El "Casi Casi" aplica solo si predijiste exactamente el mismo par campeón/subcampeón pero en orden inverso.
          No se combina con los puntos de campeón ni subcampeón.
        </div>
      </Section>

      {/* Penales */}
      <Section title="Fase eliminatoria y penales">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          En eliminación directa, el resultado oficial para puntuar es el marcador al final del
          <strong className="text-slate-800 dark:text-slate-100"> tiempo reglamentario más prórroga</strong>,
          sin contar la tanda de penales. Si el partido se define en penales, el marcador de referencia
          es el del final de la prórroga (empate).
        </p>
      </Section>
    </div>
  );
}
