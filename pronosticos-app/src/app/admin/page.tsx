import { createClient } from "@/lib/supabase/server";
import { listImportedMatches } from "@/lib/match-sync";
import AdminPanel from "./AdminPanel";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "ricardocaneo@gmail.com").trim().toLowerCase();

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-sm text-red-700 dark:text-red-400">
        <p className="font-bold mb-1">Sin sesión</p>
        <p>No hay usuario autenticado. Iniciá sesión primero.</p>
      </div>
    );
  }

  if ((user.email ?? "").trim().toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-sm text-red-700 dark:text-red-400 space-y-1">
        <p className="font-bold">Acceso denegado</p>
        <p>Email detectado: <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">{user.email ?? "(sin email)"}</code></p>
        <p>Email requerido: <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">{ADMIN_EMAIL}</code></p>
      </div>
    );
  }

  const importedMatches = await listImportedMatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Admin · Sync de Partidos
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Importá partidos reales desde livescore-api para probar el flujo de sincronización.
        </p>
      </div>
      <AdminPanel initialImported={importedMatches} />
    </div>
  );
}
