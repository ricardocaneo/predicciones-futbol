"use client";

import { useEffect, useRef, useState } from "react";
import UserAvatar from "./UserAvatar";

export default function ProfileStickyHeader({
  displayName,
  avatarUrl,
  totalPoints,
  predictionsCount,
  isOwnProfile,
}: {
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  predictionsCount: number;
  isOwnProfile: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* sentinel: cuando esto sale del viewport, aparece la barra */}
      <div ref={sentinelRef} />

      <div
        aria-hidden={!visible}
        className={`sticky top-14 z-40 -mx-4 transition-all duration-200 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 py-2.5 flex items-center gap-3">
          <UserAvatar displayName={displayName} avatarUrl={avatarUrl} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
              {displayName}
            </p>
            {isOwnProfile && (
              <p className="text-[10px] text-wc-red font-semibold leading-tight">Tú</p>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-sm font-black text-wc-gold leading-tight">{totalPoints}</p>
              <p className="text-[10px] text-slate-400 leading-tight">puntos</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                {predictionsCount}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">pronóst.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
