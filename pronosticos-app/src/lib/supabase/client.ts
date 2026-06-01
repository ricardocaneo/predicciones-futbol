import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para componentes del lado del cliente (Client Components).
 * Usa cookies gestionadas por @supabase/ssr para mantener la sesión.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
