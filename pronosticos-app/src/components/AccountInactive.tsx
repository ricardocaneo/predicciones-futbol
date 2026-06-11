"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AccountInactive() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="text-5xl">🚫</div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Cuenta desactivada</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Tu cuenta fue dada de baja y ya no podés participar en el juego.
            Tu historial de pronósticos fue conservado.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-wc-red text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-red-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
