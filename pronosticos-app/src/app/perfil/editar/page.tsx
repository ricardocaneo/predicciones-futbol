import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditarPerfilForm from "./EditarPerfilForm";

export const metadata: Metadata = {
  title: "Editar Perfil — La Pollita Mundialera",
};

export default async function EditarPerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/editar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, bio, favorite_team")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?next=/perfil/editar");

  return <EditarPerfilForm initialProfile={profile} />;
}
