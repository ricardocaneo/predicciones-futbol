import type { MatchStatus } from "@/lib/types";

const config: Record<MatchStatus, { label: string; className: string }> = {
  scheduled: {
    label: "Próximo",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  },
  live: {
    label: "En vivo",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 animate-pulse",
  },
  finished: {
    label: "Finalizado",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  },
};

export default function StatusBadge({ status }: { status: MatchStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {status === "live" && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      )}
      {label}
    </span>
  );
}
