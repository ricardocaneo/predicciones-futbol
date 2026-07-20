"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function sendChatMessage(message: string): Promise<{ error?: string }> {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 500) return { error: "Mensaje inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión para chatear." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_messages")
    .insert({ user_id: user.id, message: trimmed });

  if (error) return { error: error.message };
  return {};
}
