import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LsEvent } from "@/lib/livescore";

export interface LiveMatchPayload {
  id: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  /** Minuto raw de livescore-api, e.g. "41", "45+2" */
  time: string | null;
  /** Cuándo se registró el último cambio de estado/marcador/eventos */
  last_changed: string | null;
  /** Cuándo se hizo el último sync con livescore-api */
  last_synced_at: string | null;
  events: LsEvent[];
  /** Timestamp UTC del servidor al responder — para calcular offset cliente/servidor */
  server_now: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, status, home_score, away_score, time, last_changed, last_synced_at, events")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const payload: LiveMatchPayload = {
    id:             data.id,
    status:         data.status,
    home_score:     data.home_score ?? null,
    away_score:     data.away_score ?? null,
    time:           data.time ?? null,
    last_changed:   data.last_changed ?? null,
    last_synced_at: data.last_synced_at ?? null,
    events:         Array.isArray(data.events) ? data.events : [],
    server_now:     new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
