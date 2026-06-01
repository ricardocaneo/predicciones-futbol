import type { Metadata } from "next";
import Link from "next/link";
import GroupsView from "@/components/tabla-mundialera/GroupsView";
import KnockoutView from "@/components/tabla-mundialera/KnockoutView";
import ScorersView from "@/components/tabla-mundialera/ScorersView";

export const metadata: Metadata = {
  title: "Tabla Mundialera — El Juego del Mundial",
  description: "Fase grupal, eliminación y goleadores del Mundial 2026",
};

const TABS = [
  { id: "grupos",      label: "Fase grupal"  },
  { id: "eliminacion", label: "Eliminación"  },
  { id: "goleadores",  label: "Goleadores"   },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isValidTab(t: string | undefined): t is TabId {
  return TABS.some((tab) => tab.id === t);
}

export default async function TablaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: TabId = isValidTab(tab) ? tab : "grupos";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Tabla Mundialera
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Estado real del Mundial 2026 — grupos, eliminación y goleadores
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
        {TABS.map(({ id, label }) => (
          <Link
            key={id}
            href={`/tabla-mundialera?tab=${id}`}
            className={`flex-1 text-center py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Content */}
      {activeTab === "grupos"      && <GroupsView />}
      {activeTab === "eliminacion" && <KnockoutView />}
      {activeTab === "goleadores"  && <ScorersView />}
    </div>
  );
}
