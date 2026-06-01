"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveMatchPayload } from "@/app/api/live-match/[id]/route";

export type { LiveMatchPayload };

const POLL_INTERVAL_MS = 25_000;

export interface UseLiveMatchReturn {
  data: LiveMatchPayload | null;
  loading: boolean;
  serverOffsetMs: number;
}

export function useLiveMatch(matchId: string): UseLiveMatchReturn {
  const [data, setData]             = useState<LiveMatchPayload | null>(null);
  const [loading, setLoading]       = useState(true);
  const [serverOffsetMs, setOffset] = useState(0);
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const clientRequestAt = Date.now();
        const res = await fetch(`/api/live-match/${matchId}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json: LiveMatchPayload = await res.json();
        const clientResponseAt = Date.now();

        // Offset cliente↔servidor según spec:
        // estimatedServerNow = server_now + roundTrip/2
        // offset = estimatedServerNow - clientResponseAt
        const roundTripMs          = clientResponseAt - clientRequestAt;
        const estimatedServerNowMs = new Date(json.server_now).getTime() + roundTripMs / 2;
        setOffset(estimatedServerNowMs - clientResponseAt);
        setData(json);
      } catch {
        // error de red — silencioso
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [matchId]);

  return { data, loading, serverOffsetMs };
}

// ─── formatLiveClock ──────────────────────────────────────────────────────────

export interface ClockInput {
  status: string;
  time: string | null;
  last_changed: string | null;
  estimatedServerNow: number;
}

export interface ClockOutput {
  display: string;
  isRunning: boolean;
}

export function formatLiveClock({ status, time, last_changed, estimatedServerNow }: ClockInput): ClockOutput {
  const s = (status ?? "").toLowerCase();

  // Partido no empezado
  if (s === "scheduled") {
    return { display: "Por comenzar", isRunning: false };
  }

  // Partido terminado
  if (s === "finished") {
    const rawTime = (time ?? "").toUpperCase();
    if (rawTime === "AET")              return { display: "AET", isRunning: false };
    if (rawTime === "AP" || rawTime === "PEN") return { display: "AP",  isRunning: false };
    return { display: "FT", isRunning: false };
  }

  // Partido en vivo — detectar medio tiempo por time="HT"
  if ((time ?? "").toUpperCase() === "HT") {
    return { display: "HT", isRunning: false };
  }

  // Sin datos suficientes para el reloj
  if (!time || !last_changed) {
    return { display: "En juego", isRunning: true };
  }

  const baseMinute = parseInt(time, 10);

  // time no es numérico (e.g. algún string especial)
  if (isNaN(baseMinute)) {
    return { display: time, isRunning: true };
  }

  // Reloj estimado en mm:ss
  const elapsedMs      = Math.max(0, estimatedServerNow - new Date(last_changed).getTime());
  const elapsedSeconds = elapsedMs / 1000;
  const totalSeconds   = baseMinute * 60 + elapsedSeconds;
  const mm             = Math.floor(totalSeconds / 60);
  const ss             = Math.floor(totalSeconds % 60);

  return {
    display:   `${mm}:${String(ss).padStart(2, "0")}`,
    isRunning: true,
  };
}
