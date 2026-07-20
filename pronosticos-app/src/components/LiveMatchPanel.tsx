"use client";

import { useEffect, useState } from "react";
import { useLiveMatch, formatLiveClock } from "@/hooks/useLiveMatch";
import type { LsEvent } from "@/lib/livescore";

// ─── Field helpers ─────────────────────────────────────────────────────────────

function getPlayerName(player: LsEvent["player"]): string {
  if (!player) return "";
  if (typeof player === "string") return player;
  return player.name ?? "";
}

function getInfoName(info: LsEvent["info"]): string {
  if (!info) return "";
  if (typeof info === "string") return info;
  return info.name ?? "";
}

function getEventType(event: LsEvent): string {
  return (event.event || event.type || "").toUpperCase();
}

function getEventMinute(event: LsEvent): string | number {
  if (event.time != null) return event.time;
  if (event.minute != null) return event.minute;
  return "";
}

// ─── Event content ─────────────────────────────────────────────────────────────

type Side = "home" | "away" | "neutral";

interface EventContent {
  icon: string;
  text: string;
  side: Side;
}

function getEventContent(event: LsEvent, homeTeam: string, awayTeam: string): EventContent {
  const type   = getEventType(event);
  const min    = getEventMinute(event);
  const player = getPlayerName(event.player);
  const info   = getInfoName(event.info) || event.related_player || "";

  // Tres formatos posibles según versión del sync que guardó el evento:
  // - is_home/is_away (booleans, API actual)
  // - home_away: "h"/"a" (string, formato guardado en Supabase)
  // - team: "home"/"away" (string legacy)
  const side: Side =
    (event.is_home || event.home_away === "h" || event.team === "home") ? "home" :
    (event.is_away || event.home_away === "a" || event.team === "away") ? "away" :
    "neutral";

  const team   = side === "home" ? homeTeam : side === "away" ? awayTeam : "";
  const prefix = min !== "" ? `${min}' ` : "";

  // Helpers para no mostrar "()" o "para " cuando el equipo está vacío
  const withTeam = (base: string) => team ? `${base} (${team})` : base;
  const forTeam  = (base: string) => team ? `${base} para ${team}` : base;

  switch (type) {
    case "GOAL":
      return { icon: "⚽", text: forTeam(`${prefix}gol de ${player}`), side };

    case "PENALTY":
    case "PENALTY_GOAL":
      return { icon: "⚽", text: forTeam(`${prefix}gol de penal de ${player}`), side };

    case "PENALTY_MISSED":
    case "PENALTY_MISS":
      return { icon: "🫣", text: withTeam(`${prefix}penal fallado por ${player}`), side };

    case "OWN_GOAL":
      return { icon: "😢", text: withTeam(`${prefix}autogol de ${player}`), side };

    case "YELLOW_CARD":
      return { icon: "🟨", text: withTeam(`${prefix}amarilla para ${player}`), side };

    case "RED_CARD":
      return { icon: "🟥", text: withTeam(`${prefix}roja para ${player}`), side };

    case "YELLOW_RED_CARD":
    case "SECOND_YELLOW_RED_CARD":
      return { icon: "🟨🟥", text: withTeam(`${prefix}segunda amarilla y expulsión para ${player}`), side };

    case "SUBSTITUTION":
    case "SUB":
      return {
        icon: "🔄",
        text: team
          ? `${prefix}cambio en ${team}: sale ${player}${info ? `, entra ${info}` : ""}`
          : `${prefix}cambio: sale ${player}${info ? `, entra ${info}` : ""}`,
        side,
      };

    case "VAR":
      return { icon: "📺", text: team ? `${prefix}revisión VAR para ${team}` : `${prefix}revisión VAR`, side };

    case "KICKOFF":
      return { icon: "🦵🏻", text: "Comenzó el partido", side: "neutral" };

    case "HALF_TIME":
    case "HT":
      return { icon: "🕒", text: "Entretiempo", side: "neutral" };

    case "FULL_TIME":
    case "FT":
    case "FINISHED":
      return { icon: "🕛", text: "Final del partido", side: "neutral" };

    default:
      return {
        icon: "•",
        text: `${prefix}${player || type.toLowerCase()}${team ? ` (${team})` : ""}`,
        side,
      };
  }
}

// ─── EventRow ──────────────────────────────────────────────────────────────────

function EventRow({
  event,
  homeTeam,
  awayTeam,
}: {
  event: LsEvent;
  homeTeam: string;
  awayTeam: string;
}) {
  const { icon, text, side } = getEventContent(event, homeTeam, awayTeam);

  if (side === "neutral") {
    return (
      <div className="flex items-center justify-center py-1.5">
        <span className="relative z-10 flex items-center gap-1.5 px-2 bg-white dark:bg-slate-900 text-xs text-slate-400 dark:text-slate-500">
          <span>{icon}</span>
          <span>{text}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center min-h-7 py-1 text-xs">
      {/* Home side — texto pegado a la derecha, icono junto a la línea */}
      <div className="flex-1 flex items-center justify-end gap-1.5 pr-3 min-w-0">
        {side === "home" && (
          <>
            <span className="text-right leading-snug text-slate-700 dark:text-slate-200 min-w-0">
              {text}
            </span>
            <span className="shrink-0 leading-none">{icon}</span>
          </>
        )}
      </div>

      {/* Away side — icono junto a la línea, texto hacia la derecha */}
      <div className="flex-1 flex items-center justify-start gap-1.5 pl-3 min-w-0">
        {side === "away" && (
          <>
            <span className="shrink-0 leading-none">{icon}</span>
            <span className="leading-snug text-slate-700 dark:text-slate-200 min-w-0">
              {text}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LiveMatchPanel ────────────────────────────────────────────────────────────

interface LiveMatchPanelProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export default function LiveMatchPanel({ matchId, homeTeam, awayTeam }: LiveMatchPanelProps) {
  const { data, loading, serverOffsetMs } = useLiveMatch(matchId);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  if (loading || !data) return null;

  const estimatedServerNow = Date.now() + serverOffsetMs;

  const clock = formatLiveClock({
    status:             data.status,
    time:               data.time,
    last_changed:       data.last_changed,
    estimatedServerNow,
  });

  const events = data.events as LsEvent[];
  const sorted = [...events].sort((a, b) => {
    const sa = a.sort ?? Number(getEventMinute(a)) ?? 0;
    const sb = b.sort ?? Number(getEventMinute(b)) ?? 0;
    return sb - sa;
  });

  if (!clock.isRunning && sorted.length === 0 && clock.display === "Por comenzar") return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">

      {/* Reloj */}
      {clock.display && (
        <div className="flex items-center gap-1.5 mb-3">
          {clock.isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          )}
          <span className={`text-xs font-bold tabular-nums ${
            clock.isRunning
              ? "text-green-600 dark:text-green-400"
              : "text-slate-500 dark:text-slate-400"
          }`}>
            {clock.display}
          </span>
          {data.last_synced_at && (
            <span className="text-xs text-slate-300 dark:text-slate-600 ml-auto">
              sync {formatSyncAgo(data.last_synced_at, estimatedServerNow)}
            </span>
          )}
        </div>
      )}

      {/* Log de eventos con línea central */}
      {sorted.length > 0 && (
        <div className="relative">
          {/* Línea vertical central continua */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-200 dark:bg-slate-700" />

          {sorted.map((e, i) => (
            <EventRow
              key={`${e.event}-${e.time}-${i}`}
              event={e}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatSyncAgo(syncAt: string, nowMs: number): string {
  const diffMs = nowMs - new Date(syncAt).getTime();
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1)  return "hace < 1 min";
  if (mins === 1) return "hace 1 min";
  return `hace ${mins} min`;
}
