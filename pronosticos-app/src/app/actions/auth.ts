"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export type AuthState = {
  error?: string;
  message?: string;
} | null;

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const displayName = (formData.get("display_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const favoriteTeam = (formData.get("favorite_team") as string) || null;

  if (!displayName) return { error: "El nombre visible es obligatorio." };
  if (!email)       return { error: "El email es obligatorio." };
  if (!password || password.length < 8)
    return { error: "La contraseña debe tener al menos 8 caracteres." };

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      // Le dice a Supabase a dónde redirigir después de confirmar el email.
      // Nuestro route handler /auth/callback intercambia el código por sesión.
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // Si el email de Supabase necesita confirmación no hay sesión activa todavía
  if (data.user && !data.session) {
    return {
      message:
        "¡Revisa tu correo y confirma tu cuenta para comenzar a pronosticar!",
    };
  }

  // Registro directo (confirmación desactivada en Supabase): actualiza favorite_team
  if (data.user && favoriteTeam) {
    await supabase
      .from("profiles")
      .update({ favorite_team: favoriteTeam })
      .eq("id", data.user.id);
  }

  redirect("/");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Completa email y contraseña." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Traducir los errores más comunes de Supabase
    if (error.message.includes("Invalid login credentials"))
      return { error: "Email o contraseña incorrectos." };
    if (error.message.includes("Email not confirmed"))
      return { error: "Confirma tu email antes de iniciar sesión." };
    return { error: error.message };
  }

  // next param permite redirigir a la ruta que intentaba abrir antes del login
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
