"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/app/actions/auth";
import GoogleAuthButton from "@/components/GoogleAuthButton";

const POPULAR_TEAMS = [
  "Argentina", "Brasil", "España", "Francia", "Portugal",
  "Inglaterra", "Alemania", "Países Bajos", "México", "Uruguay",
  "Italia", "Bélgica", "Colombia", "Marruecos", "Senegal",
];

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wc-red/30 focus:border-wc-red";

export default function RegistroPage() {
  const [state, action, isPending] = useActionState<AuthState, FormData>(
    signUp,
    null
  );

  // Si el registro requiere confirmación de email mostramos el aviso
  if (state?.message) {
    return (
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            ¡Casi listo!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
            {state.message}
          </p>
        </div>
        <div className="text-center">
          <Link href="/login" className="text-sm text-wc-red font-semibold hover:underline">
            Ir al inicio de sesión →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center pt-2">
        <div className="text-4xl mb-3">⚽</div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Crea tu perfil
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Únete y compite con tus amigos en El Juego del Mundial
        </p>
      </div>

      {/* Avatar — visual por ahora, se conectará a Supabase Storage */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 dark:text-slate-600">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-xs text-slate-300 dark:text-slate-600 mt-1">Foto</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          La foto de perfil se podrá subir próximamente
        </p>
      </div>

      <form action={action} className="space-y-6">
        {state?.error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {state.error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Nombre visible <span className="text-wc-red">*</span>
            </label>
            <input
              name="display_name"
              type="text"
              autoComplete="name"
              placeholder="¿Cómo quieres que te vean los demás?"
              required
              className={inputCls}
            />
          </div>

          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Email <span className="text-wc-red">*</span>
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
              Contraseña <span className="text-wc-red">*</span>
            </label>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              className={inputCls}
            />
          </div>

          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Selección favorita{" "}
              <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <select name="favorite_team" className={inputCls}>
              <option value="">Elige tu equipo favorito</option>
              {POPULAR_TEAMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-wc-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            {isPending ? "Creando cuenta…" : "Comenzar a pronosticar"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400">o</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <GoogleAuthButton label="Registrarse con Google" />

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-wc-red font-semibold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          🔒 Tus datos se guardan de forma segura en Supabase.
        </p>
      </div>
    </div>
  );
}
