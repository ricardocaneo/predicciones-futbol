import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 *
 * auth.getUser() usa el cliente SSR (cookies) → funciona con tokens ES256.
 * from() / rpc() usan service role → bypasea la validación JWT de PostgREST
 * que rechaza tokens ES256 con iat ligeramente en el "futuro" (PGRST303).
 */
export async function createClient() {
  const cookieStore = await cookies();

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Silently ignored in Server Components (read-only cookie store).
          }
        },
      },
    }
  );

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Return a composite object: auth uses cookie-based SSR client (ES256 tokens
  // validated by Supabase Auth server, not PostgREST), everything else uses
  // service_role to bypass PostgREST's strict ES256 clock-skew rejection (PGRST303).
  // Plain object avoids prototype/Proxy issues present in createServerClient in dev mode.
  return {
    auth: authClient.auth,
    from: adminClient.from.bind(adminClient),
    rpc: adminClient.rpc.bind(adminClient),
    storage: adminClient.storage,
  } as unknown as typeof adminClient;
}

/**
 * Cliente admin (service role) puro, sin cookies.
 * Para Server Components que sólo necesitan datos y no auth.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
