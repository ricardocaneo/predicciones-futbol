"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileState = { error?: string; success?: boolean } | null;

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const displayName       = (formData.get("display_name")        as string)?.trim();
  const bio               = (formData.get("bio")                 as string)?.trim() || null;
  const favoriteTeam      = (formData.get("favorite_team")       as string)          || null;
  const existingAvatarUrl = (formData.get("existing_avatar_url") as string)?.trim()  || null;
  const avatarFile        =  formData.get("avatar") as File | null;

  if (!displayName) return { error: "El nombre visible es obligatorio." };

  const updates: Record<string, unknown> = { display_name: displayName, bio, favorite_team: favoriteTeam };

  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024) return { error: "La imagen debe pesar menos de 5 MB." };

    const path = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) return { error: `Error al subir la imagen: ${uploadError.message}` };

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    updates.avatar_url = `${publicUrl}?t=${Date.now()}`;
  } else if (existingAvatarUrl) {
    updates.avatar_url = existingAvatarUrl;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/perfil");
  revalidatePath("/");
  return { success: true };
}
