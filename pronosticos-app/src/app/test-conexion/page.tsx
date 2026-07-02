import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  // Test via composite client (createClient)
  let compositeError: string | null = null;
  let compositeCount = 0;
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    compositeCount = data?.length ?? 0;
  } catch (e) {
    compositeError = (e as { message?: string })?.message ?? JSON.stringify(e);
  }

  // Test via adminClient directo (aislado, sin pasar por createClient)
  let adminError: string | null = null;
  let adminCount = 0;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("matches")
      .select("id")
      .limit(1);
    if (error) throw error;
    adminCount = data?.length ?? 0;
  } catch (e) {
    adminError = (e as { message?: string })?.message ?? JSON.stringify(e);
  }

  const ok = compositeError === null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Prueba de Conexión
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Diagnóstico de acceso a Supabase.
        </p>
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
                  : "Perfil NO encontrado en la tabla profiles"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Diagnóstico de queries */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Diagnóstico de queries</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* Test 1: composite client */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              createClient() → matches
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${!compositeError ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {!compositeError
                  ? `OK — ${compositeCount} filas`
                  : <span className="font-mono text-red-500">{compositeError}</span>}
              </span>
            </div>
          </div>

          {/* Test 2: adminClient directo */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              createAdminClient() directo → matches
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${!adminError ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {!adminError
                  ? `OK — ${adminCount} fila(s)`
                  : <span className="font-mono text-red-500">{adminError}</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {ok && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Tabla <code className="font-mono text-wc-red">matches</code>
            </p>
            <span className="text-xs text-slate-400">{compositeCount} filas</span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Variables de entorno</p>
        {(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const).map((key) => {
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
