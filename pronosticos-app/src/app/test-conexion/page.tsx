import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TestConexionPage() {
  const supabase = await createClient();

  // Sesión
  const { data: { user } } = await supabase.auth.getUser();
  let profile: Record<string, unknown> | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url, total_points")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  let matches: Record<string, unknown>[] = [];
  let errorMessage: string | null = null;

  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    matches = data ?? [];
  } catch (e) {
    errorMessage =
      e instanceof Error
        ? e.message
        : (e as { message?: string })?.message ?? JSON.stringify(e);
  }

  const ok = errorMessage === null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Prueba de Conexión
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Verifica que la app puede leer datos desde Supabase.
        </p>
      </div>

      <div className={`rounded-2xl px-5 py-4 flex items-start gap-3 border ${ok ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40" : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40"}`}>
        <span className={`text-lg mt-0.5 ${ok ? "text-green-500" : "text-red-500"}`}>
          {ok ? "✓" : "✗"}
        </span>
        <div>
          <p className={`font-semibold text-sm ${ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {ok ? "Conexión con Supabase exitosa" : "Error al conectar con Supabase"}
          </p>
          {!ok && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* Sesión */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Sesión del servidor</p>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${user ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {user ? `Usuario autenticado: ${user.email}` : "Sin sesión — getUser() retornó null"}
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${profile ? "bg-green-400" : "bg-orange-400"}`} />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {profile
                  ? `Perfil encontrado: ${String(profile.display_name)}`
                  : "Perfil NO encontrado en la tabla profiles (trigger no corrió)"}
              </span>
            </div>
          )}
        </div>
      </div>

      {ok && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Tabla <code className="font-mono text-wc-red">matches</code>
            </p>
            <span className="text-xs text-slate-400">{matches.length} {matches.length === 1 ? "fila" : "filas"}</span>
          </div>

          {matches.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">
                Conexión OK, pero no hay partidos cargados
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Podés insertar datos de prueba desde el SQL Editor de Supabase.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 dark:divide-slate-800">
              {matches.map((m) => (
                <li key={String(m.id)} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {String(m.home_team)} vs {String(m.away_team)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {String(m.phase)} · {m.starts_at ? new Date(String(m.starts_at)).toLocaleString("es-CL") : "—"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    m.status === "live" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : m.status === "finished" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {String(m.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Variables de entorno</p>
        {(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const).map((key) => {
          const val = process.env[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${val ? "bg-green-400" : "bg-red-400"}`} />
              <code className="text-xs text-slate-600 dark:text-slate-300">{key}</code>
              <span className="text-xs text-slate-400">{val ? "✓ definida" : "✗ no encontrada"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
