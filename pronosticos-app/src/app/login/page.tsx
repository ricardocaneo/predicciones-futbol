"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GoogleAuthButton from "@/components/GoogleAuthButton";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wc-red/30 focus:border-wc-red";

function LoginForm() {
  const [error, setError]       = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const searchParams = useSearchParams();
  const linkError    = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const email    = (formData.get("email")    as string).trim();
    const password =  formData.get("password") as string;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      if (authError.message.includes("Invalid login credentials"))
        setError("Email o contraseña incorrectos.");
      else if (authError.message.includes("Email not confirmed"))
        setError("Confirma tu email antes de iniciar sesión.");
      else
        setError(authError.message);
      setIsPending(false);
      return;
    }

    // Reload completo para que el servidor reciba las cookies de sesión recién seteadas.
    window.location.replace("/");
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {linkError === "link_invalido" && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          El enlace de confirmación es inválido o ya expiró. Intenta iniciar sesión directamente.
        </div>
      )}

      {linkError === "oauth_failed" && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          No se pudo iniciar sesión con Google. Intenta de nuevo o usa email y contraseña.
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        <div className="px-4 py-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            required
            className={inputCls}
          />
        </div>
        <div className="px-4 py-4">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Contraseña
          </label>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            required
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-wc-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          {isPending ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </div>
    </form>

    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-400">o</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      <GoogleAuthButton label="Iniciar sesión con Google" />

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-wc-red font-semibold hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center pt-2">
        <div className="text-4xl mb-3">⚽</div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Bienvenido de vuelta
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Inicia sesión para ver tus pronósticos
        </p>
      </div>

      {/* Suspense requerido por useSearchParams en un Client Component */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
