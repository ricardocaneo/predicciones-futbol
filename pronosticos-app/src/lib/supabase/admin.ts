import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service role key — bypasa RLS.
 * Solo usar en server actions, route handlers y funciones server-side.
 * Nunca importar desde componentes client o código expuesto al browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
