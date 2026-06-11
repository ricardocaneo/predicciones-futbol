"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateThemePreference(theme: "light" | "dark") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ theme }).eq("id", user.id);
}
