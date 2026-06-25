"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { PRESET_AVATARS } from "@/lib/preset-avatars";

type ProfileRow = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_team: string | null;
};

type SaveResult = { error?: string; success?: boolean } | null;

const POPULAR_TEAMS = [
  "Argentina", "Brasil", "España", "Francia", "Portugal",
  "Inglaterra", "Alemania", "Países Bajos", "México", "Uruguay",
  "Italia", "Bélgica", "Colombia", "Marruecos", "Senegal",
];

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wc-red/30 focus:border-wc-red";

export default function EditarPerfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult>(null);
  const [deleteAvatar, setDeleteAvatar] = useState(false);

  const isDirty =
    deleteAvatar ||
    preview !== null ||
    (selectedPreset !== null && selectedPreset !== profile?.avatar_url) ||
    displayName !== (profile?.display_name ?? "") ||
    bio !== (profile?.bio ?? "") ||
    favoriteTeam !== (profile?.favorite_team ?? "");

  function applyProfile(data: ProfileRow) {
    setProfile(data);
    setDisplayName(data.display_name);
    setBio(data.bio ?? "");
    setFavoriteTeam(data.favorite_team ?? "");
    if (data.avatar_url && PRESET_AVATARS.includes(data.avatar_url)) {
      setSelectedPreset(data.avatar_url);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login?next=/perfil/editar"); return; }
      supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url, bio, favorite_team")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data) { router.replace("/login"); return; }
          applyProfile(data as ProfileRow);
          setLoading(false);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/profile", { method: "POST", body: formData });
      const data: SaveResult = await res.json();
      setResult(data);

      if (data?.success) {
        setPreview(null);
        setSelectedPreset(null);
        setDeleteAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: updated } = await supabase
            .from("profiles")
            .select("id, display_name, email, avatar_url, bio, favorite_team")
            .eq("id", user.id)
            .single();
          if (updated) applyProfile(updated as ProfileRow);
        }

        router.refresh();
      }
    } catch {
      setResult({ error: "Error de red. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileError("La imagen debe pesar menos de 5 MB.");
      e.target.value = "";
      return;
    }
    setFileError(null);
    setSelectedPreset(null);
    setPreview(URL.createObjectURL(file));
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-wc-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="existing_avatar_url" value={deleteAvatar ? "" : (profile.avatar_url ?? "")} />
        <input type="hidden" name="delete_avatar" value={deleteAvatar ? "1" : "0"} />
        <input type="hidden" name="preset_avatar" value={selectedPreset ?? ""} />

        <div className="space-y-5 py-2">
          {/* Vista previa del avatar */}
          <div className="flex flex-col items-center gap-2">
            <UserAvatar
              displayName={profile.display_name}
              avatarUrl={deleteAvatar ? undefined : (selectedPreset ?? preview ?? (profile.avatar_url ?? undefined))}
              size={96}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              {deleteAvatar
                ? "Sin foto — se guardará con iniciales"
                : selectedPreset
                ? "Avatar seleccionado — presiona Guardar para aplicar"
                : preview
                ? "Imagen lista para cargar — Presione guardar para realizar los cambios"
                : "Elige un avatar o sube tu propia foto"}
            </p>
            {(selectedPreset || profile.avatar_url || preview) && !deleteAvatar && (
              <button
                type="button"
                onClick={() => {
                  setDeleteAvatar(true);
                  setPreview(null);
                  setSelectedPreset(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Eliminar foto
              </button>
            )}
            {deleteAvatar && (
              <button
                type="button"
                onClick={() => setDeleteAvatar(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
            )}
            {fileError && <p className="text-xs text-red-500 text-center">{fileError}</p>}
          </div>

          {/* Grilla de avatares prediseñados */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">
              Avatares prediseñados
            </p>
            <div className="flex flex-row gap-2.5 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(url);
                    setPreview(null);
                    setDeleteAvatar(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className={`w-16 h-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedPreset === url
                      ? "border-wc-red ring-2 ring-wc-red/30 scale-105"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Avatar prediseñado" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400">o sube tu propia foto</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Subida de foto propia */}
          <label
            htmlFor="avatar-input"
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-wc-red group-hover:text-white transition-colors text-slate-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
              Seleccionar imagen desde tu dispositivo
              <span className="block text-xs text-slate-400 mt-0.5">JPG, PNG o WebP · máx. 5 MB</span>
            </span>
            <input
              ref={fileInputRef}
              id="avatar-input"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileSelect}
            />
          </label>
        </div>

        {result?.success && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Cambios guardados correctamente
          </div>
        )}

        {result?.error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {result.error}
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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              value={bio}
              onChange={(e) => setBio(e.target.value)}
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
              value={favoriteTeam}
              onChange={(e) => setFavoriteTeam(e.target.value)}
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
            disabled={saving || !isDirty}
            className="flex-1 bg-wc-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
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
