import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const formData = await req.formData();

  const displayName       = (formData.get("display_name")        as string)?.trim();
  const bio               = (formData.get("bio")                 as string)?.trim() || null;
  const favoriteTeam      = (formData.get("favorite_team")       as string)          || null;
  const existingAvatarUrl = (formData.get("existing_avatar_url") as string)?.trim()  || null;
  const deleteAvatar      =  formData.get("delete_avatar") === "1";
  const presetAvatar      = (formData.get("preset_avatar")       as string)?.trim()  || null;
  const avatarFile        =  formData.get("avatar") as File | null;

  if (!displayName) return NextResponse.json({ error: "El nombre visible es obligatorio." }, { status: 400 });

  const updates: Record<string, unknown> = { display_name: displayName, bio, favorite_team: favoriteTeam };

  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "La imagen debe pesar menos de 5 MB." }, { status: 400 });

    const path = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError)
      return NextResponse.json({ error: `Error al subir la imagen: ${uploadError.message}` }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    updates.avatar_url = `${publicUrl}?t=${Date.now()}`;
  } else if (presetAvatar) {
    updates.avatar_url = presetAvatar;
  } else if (deleteAvatar) {
    updates.avatar_url = null;
  } else if (existingAvatarUrl) {
    updates.avatar_url = existingAvatarUrl;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/perfil");
  revalidatePath("/");
  return NextResponse.json({ success: true });
}
