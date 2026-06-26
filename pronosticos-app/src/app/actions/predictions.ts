"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PredictionState = { error?: string; success?: boolean } | null;

export async function savePrediction(
  _prev: PredictionState,
  formData: FormData
): Promise<PredictionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Tienes que estar conectado para pronosticar." };

  const matchId          = formData.get("match_id") as string;
  const homeScore        = parseInt(formData.get("home_score") as string, 10);
  const awayScore        = parseInt(formData.get("away_score") as string, 10);
  const mode             = formData.get("mode") as string;
  const advancingTeamId  = (formData.get("advancing_team_id") as string | null) || null;

  if (!matchId || isNaN(homeScore) || isNaN(awayScore)) {
    return { error: "Datos inválidos." };
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id:               user.id,
      match_id:              matchId,
      predicted_home_score:  homeScore,
      predicted_away_score:  awayScore,
      prediction_mode:       mode === "live" ? "live" : "pre_match",
      advancing_team_id:     advancingTeamId,
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    if (error.message.includes("pre_match ya cerró"))
      return { error: "La ventana de pronóstico ya cerró para este partido." };
    if (error.message.includes("en vivo ya cerró"))
      return { error: "La ventana en vivo ya cerró (límite: minuto 35)." };
    if (error.message.includes("aún no comenzó"))
      return { error: "El partido aún no comenzó." };
    return { error: error.message };
  }

  revalidatePath("/partidos");
  return { success: true };
}
