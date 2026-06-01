"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canEditMasterTouch } from "@/lib/scoring";

export type ToqueMaestroState = { error?: string; success?: boolean } | null;

export async function saveToqueMaestro(
  _prev: ToqueMaestroState,
  formData: FormData,
): Promise<ToqueMaestroState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tenés que estar logueado para guardar tu Toque Maestro." };

  if (!canEditMasterTouch()) return { error: "El Toque Maestro ya está bloqueado." };

  const championId   = (formData.get("champion_team_id")      as string) || null;
  const runnerUpId   = (formData.get("runner_up_team_id")     as string) || null;
  const goldenBootId = (formData.get("golden_boot_player_id") as string) || null;

  if (championId && runnerUpId && championId === runnerUpId) {
    return { error: "El campeón y el subcampeón no pueden ser el mismo equipo." };
  }

  const { data: existing } = await supabase
    .from("toque_maestro_predictions")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("toque_maestro_predictions")
      .update({
        champion_team_id:      championId,
        runner_up_team_id:     runnerUpId,
        golden_boot_player_id: goldenBootId,
        updated_at:            new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("toque_maestro_predictions")
      .insert({
        user_id:               user.id,
        champion_team_id:      championId,
        runner_up_team_id:     runnerUpId,
        golden_boot_player_id: goldenBootId,
      });
    if (error) return { error: error.message };
  }

  revalidatePath("/toque-maestro");
  return { success: true };
}
