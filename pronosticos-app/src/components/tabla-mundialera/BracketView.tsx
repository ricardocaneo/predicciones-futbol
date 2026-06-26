"use client";

import { useEffect, useState } from "react";
import TeamFlag from "@/components/TeamFlag";
import { teamToCountryCode } from "@/lib/country-codes";

// ─── Layout constants ────────────────────────────────────────────────────────

const CARD_W  = 140;  // match card width
const CARD_H  = 46;   // match card height
const SLOT0   = 54;   // R32 slot height (card + 8px gap)
const HEADER  = 24;   // column label height
const GAP_W   = 28;   // horizontal gap between columns (includes connector)
const CONN_W  = 10;   // width of right-side bracket connector

const N_R32   = 16;
const TOTAL_H = HEADER + N_R32 * SLOT0;              // 888
const TOTAL_W = 5 * CARD_W + 4 * GAP_W;              // 812

// ─── Bracket ordering ────────────────────────────────────────────────────────
// Maps display position → chronological index so adjacent pairs feed the same
// next-round match, enabling clean connecting lines.

const R32_ORDER = [0, 2, 1, 4, 10, 11, 8, 9, 3, 5, 6, 7, 13, 15, 12, 14];
const R16_ORDER = [0, 1, 4, 5, 2, 3, 6, 7];
// QF (4), SF (2), Final (1): chronological order is already correct

function reorder<T>(arr: T[], order: number[]): (T | null)[] {
  return order.map(i => arr[i] ?? null);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BracketMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  startsAt: string;
};

export type BracketData = {
  r32:   BracketMatch[];
  r16:   BracketMatch[];
  qf:    BracketMatch[];
  sf:    BracketMatch[];
  tp:    BracketMatch[];
  final: BracketMatch[];
};

// ─── Match card ───────────────────────────────────────────────────────────────

const PH_RE = /^(Winner|Runner.up|3rd|Loser)/i;

function MatchCard({ match }: { match: BracketMatch | null }) {
  if (!match) {
    return (
      <div
        style={{ width: CARD_W, height: CARD_H }}
        className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700"
      />
    );
  }

  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore   = match.homeScore !== null && match.awayScore !== null;
  const homeWins   = hasScore && match.homeScore! > match.awayScore!;
  const awayWins   = hasScore && match.awayScore! > match.homeScore!;

  function teamClass(name: string, isWinner: boolean) {
    if (PH_RE.test(name)) return "text-slate-400 dark:text-slate-600 italic";
    if (isWinner)         return "font-bold text-slate-900 dark:text-white";
    return "font-medium text-slate-700 dark:text-slate-200";
  }

  function scoreClass(isWinner: boolean) {
    return isWinner
      ? "text-slate-900 dark:text-white font-bold"
      : "text-slate-400 dark:text-slate-500 font-bold";
  }

  return (
    <div
      style={{ width: CARD_W, height: CARD_H }}
      className={`rounded-lg border overflow-hidden flex flex-col ${
        isLive
          ? "border-green-500 dark:border-green-600 bg-white dark:bg-slate-900"
          : isFinished
          ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
    >
      <div className={`flex items-center gap-1 px-1.5 flex-1 min-w-0 ${homeWins ? "bg-slate-100/60 dark:bg-slate-700/20" : ""}`}>
        {!PH_RE.test(match.homeTeam) && <TeamFlag countryCode={teamToCountryCode(match.homeTeam)} name={match.homeTeam} size={12} shape="rect" />}
        <span className={`truncate flex-1 leading-none text-[11px] ${teamClass(match.homeTeam, homeWins)}`}>
          {match.homeTeam}
        </span>
        {hasScore && (
          <span className={`tabular-nums shrink-0 text-[11px] ${scoreClass(homeWins)}`}>
            {match.homeScore}
          </span>
        )}
      </div>
      <div className="border-t border-slate-100 dark:border-slate-800 mx-1.5 shrink-0" />
      <div className={`flex items-center gap-1 px-1.5 flex-1 min-w-0 ${awayWins ? "bg-slate-100/60 dark:bg-slate-700/20" : ""}`}>
        {!PH_RE.test(match.awayTeam) && <TeamFlag countryCode={teamToCountryCode(match.awayTeam)} name={match.awayTeam} size={12} shape="rect" />}
        <span className={`truncate flex-1 leading-none text-[11px] ${teamClass(match.awayTeam, awayWins)}`}>
          {match.awayTeam}
        </span>
        {hasScore && (
          <span className={`tabular-nums shrink-0 text-[11px] ${scoreClass(awayWins)}`}>
            {match.awayScore}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Connector SVG ────────────────────────────────────────────────────────────

function ConnectorsSVG() {
  function drawRound(round: number) {
    const slotH  = SLOT0 * (1 << round);
    const pairCount = (N_R32 >> round) >> 1;
    const colX   = round * (CARD_W + GAP_W);
    const x0     = colX + CARD_W;
    const x1     = x0 + CONN_W;
    const x2     = x0 + GAP_W;

    return Array.from({ length: pairCount }, (_, p) => {
      const topY = HEADER + slotH * (2 * p)       + slotH / 2;
      const botY = HEADER + slotH * (2 * p + 1)   + slotH / 2;
      const midY = (topY + botY) / 2;
      return (
        <g key={`${round}-${p}`} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {/* ⊣ bracket: two short horizontals + one vertical */}
          <polyline points={`${x0},${topY} ${x1},${topY} ${x1},${botY} ${x0},${botY}`} />
          {/* Horizontal stem to next column */}
          <line x1={x1} y1={midY} x2={x2} y2={midY} />
        </g>
      );
    });
  }

  return (
    <svg
      className="text-slate-200 dark:text-slate-700"
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
      width={TOTAL_W}
      height={TOTAL_H}
      stroke="currentColor"
      fill="none"
    >
      {[0, 1, 2, 3].map(r => drawRound(r))}
    </svg>
  );
}

// ─── Round labels ─────────────────────────────────────────────────────────────

const ROUND_LABELS = ["Dieciseisavos", "Octavos", "Cuartos", "Semis", "Final"];

// ─── BracketView ─────────────────────────────────────────────────────────────

export default function BracketView({ data }: { data: BracketData }) {
  const [zoom, setZoom] = useState(0.5);

  useEffect(() => {
    if (window.innerWidth >= 768) setZoom(1.0);
  }, []);

  const rounds: (BracketMatch | null)[][] = [
    reorder(data.r32, R32_ORDER),
    reorder(data.r16, R16_ORDER),
    data.qf,
    data.sf,
    data.final,
  ];

  const tp = data.tp[0] ?? null;

  return (
    <div className="space-y-3">
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">Zoom</span>
        <button
          onClick={() => setZoom(z => +Math.max(0.3, z - 0.1).toFixed(1))}
          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
          aria-label="Reducir zoom"
        >−</button>
        <span className="text-xs font-mono text-slate-600 dark:text-slate-300 w-9 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => +Math.min(1.5, z + 0.1).toFixed(1))}
          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
          aria-label="Aumentar zoom"
        >+</button>
        <button
          onClick={() => setZoom(window.innerWidth >= 768 ? 1.0 : 0.5)}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1"
        >
          reset
        </button>
      </div>

      {/* Scrollable bracket */}
      <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        {/* Outer div sized to scaled dimensions so scrollbars appear correctly */}
        <div style={{ width: Math.ceil(TOTAL_W * zoom), height: Math.ceil(TOTAL_H * zoom), position: "relative" }}>
          {/* Inner div: actual bracket at natural size, then scaled */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: TOTAL_W,
              height: TOTAL_H,
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {/* Column headers */}
            {ROUND_LABELS.map((label, r) => (
              <div
                key={r}
                style={{ position: "absolute", left: r * (CARD_W + GAP_W), top: 0, width: CARD_W, height: HEADER }}
                className="flex items-center"
              >
                <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  {label}
                </span>
              </div>
            ))}

            {/* Match cards */}
            {rounds.map((matches, r) => {
              const slotH = SLOT0 * (1 << r);
              return matches.map((match, i) => (
                <div
                  key={match?.id ?? `empty-${r}-${i}`}
                  style={{
                    position: "absolute",
                    left: r * (CARD_W + GAP_W),
                    top:  HEADER + slotH * i + (slotH - CARD_H) / 2,
                  }}
                >
                  <MatchCard match={match} />
                </div>
              ));
            })}

            {/* Connecting lines SVG */}
            <ConnectorsSVG />
          </div>
        </div>
      </div>

      {/* 3rd place — shown below the bracket */}
      {tp && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide shrink-0">
            3° y 4°
          </span>
          <div className="flex-1 min-w-0">
            <MatchCard match={tp} />
          </div>
        </div>
      )}
    </div>
  );
}
