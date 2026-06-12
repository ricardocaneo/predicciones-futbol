"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Escucha cambios de sesión de Supabase y refresca el layout del servidor
 * para que el Navbar refleje el estado real de autenticación.
 * Sin esto, Next.js puede mostrar el avatar aunque la sesión ya expiró.
 */
export default function AuthListener() {
  const router  = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return null;
}
