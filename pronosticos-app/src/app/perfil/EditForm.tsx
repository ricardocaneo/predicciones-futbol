"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

export type ProfileState = { error?: string; success?: boolean } | null;

export type ProfileRow = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_team: string | null;
};

type EditFormProps = {
  profile: ProfileRow;
  action: (prevState: ProfileState, formData: FormData) => Promise<ProfileState>;
};

const POPULAR_TEAMS = [
  "Argentina", "Brasil", "España", "Francia", "Portugal",
  "Inglaterra", "Alemania", "Países Bajos", "México", "Uruguay",
  "Italia", "Bélgica", "Colombia", "Marruecos", "Senegal",
];

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wc-red/30 focus:border-wc-red";

export default function EditForm({ profile, action }: EditFormProps) {
  const router = useRouter();
  const [preview,   setPreview]   = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(action, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      setPreview(null);
    }
  }, [state, router]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileError("La imagen debe pesar menos de 5 MB.");
      e.target.value = "";
      return;
    }
    setFileError(null);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/perfil"
          className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          ← Volver al perfil
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Editar perfil</h1>
        <p className="text-sm text-slate-400 mt-1">Personaliza tu identidad en La Pollita Mundialera</p>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="existing_avatar_url" value={profile.avatar_url ?? ""} />

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <UserAvatar
              displayName={profile.display_name}
              avatarUrl={preview ?? (profile.avatar_url ?? undefined)}
              size={96}
            />
            <label
              htmlFor="avatar-input"
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-wc-red hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
              title="Cambiar foto"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </label>
            <input
              id="avatar-input"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileSelect}
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {preview ? "Imagen lista para cargar — Presione guardar para realizar los cambios" : "JPG, PNG o WebP · máx. 5 MB"}
          </p>
          {fileError && <p className="text-xs text-red-500 text-center">{fileError}</p>}
        </div>

        {state?.success && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Cambios guardados correctamente
          </div>
        )}

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
              defaultValue={profile.display_name}
              required
              className={inputCls}
              placeholder="Tu nombre en el juego"
            />
          </div>

          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">El email no se puede modificar</p>
          </div>

          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Bio <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <textarea
              name="bio"
              defaultValue={profile.bio ?? ""}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Cuéntanos algo sobre ti…"
            />
          </div>

          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Selección favorita{" "}
              <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <select
              name="favorite_team"
              defaultValue={profile.favorite_team ?? ""}
              className={inputCls}
            >
              <option value="">Elige tu equipo favorito</option>
              {POPULAR_TEAMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-wc-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link
            href="/perfil"
            className="flex-1 text-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl text-sm transition-colors"
          >
            Ver perfil
          </Link>
        </div>
      </form>
    </div>
  );
}
