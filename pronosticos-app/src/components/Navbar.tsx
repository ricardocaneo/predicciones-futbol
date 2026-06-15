"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserAvatar from "./UserAvatar";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export type NavbarUser = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
} | null;

const navItems = [
  { href: "/",                 label: "Inicio"           },
  { href: "/partidos",         label: "Partidos"         },
  { href: "/mis-pronosticos",  label: "Mis Pronósticos"  },
  { href: "/ranking",          label: "Ranking"          },
  { href: "/tabla-mundialera", label: "Tabla Mundialera" },
  { href: "/toque-maestro",    label: "⭐ Toque Maestro" },
];

function closeHamburger() {
  const el = document.getElementById("nav-toggle") as HTMLInputElement | null;
  if (el) el.checked = false;
}

export default function Navbar({ user }: { user: NavbarUser }) {
  const pathname = usePathname();

  const [profileOpen, setProfileOpen] = useState(false);
  const [isDark,      setIsDark]      = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [profileOpen]);

  async function toggleTheme() {
    const next = !isDark;
    const themeValue = next ? "dark" : "light";
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${themeValue}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    if (user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({ theme: themeValue }).eq("id", user.id);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-wc-navy shadow-lg">
      <input type="checkbox" id="nav-toggle" className="sr-only peer" />

      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-black text-white text-base tracking-tight"
          >
            <span className="text-lg">🐣</span>
            <span>La Pollita Mundialera ⚽</span>
          </Link>

          <div className="flex items-center gap-1.5">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 mr-1">
              {navItems.map(({ href, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-wc-red text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Usuario autenticado: avatar + dropdown */}
            {user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-label="Menú de perfil"
                  className={`flex items-center gap-1.5 rounded-xl p-1 transition-colors ${
                    profileOpen ? "bg-white/15" : "hover:bg-white/10"
                  }`}
                >
                  <UserAvatar
                    displayName={user.displayName}
                    avatarUrl={user.avatarUrl}
                    size={32}
                  />
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    className={`text-white/60 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
                    {/* Info del usuario */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <UserAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} size={36} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Links de perfil */}
                    <div className="py-1">
                      <Link href="/perfil" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Ver perfil
                      </Link>
                      <Link href="/perfil?mode=edit" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar datos
                      </Link>
                      <Link href="/bases" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Bases del juego
                      </Link>
                    </div>

                    {/* Tema */}
                    <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                      <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {isDark ? (
                          <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                              <circle cx="12" cy="12" r="5" />
                              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                            Modo claro
                          </>
                        ) : (
                          <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                            Modo oscuro
                          </>
                        )}
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Cerrar sesión
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Sin sesión: botones de login/registro */
              <div className="flex items-center gap-1.5">
                {/* Tema (siempre visible) */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Cambiar tema"
                >
                  {isDark ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                </button>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-wc-red text-white hover:bg-red-700 transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            )}

            {/* Hamburguesa mobile */}
            <label
              htmlFor="nav-toggle"
              className="md:hidden flex flex-col justify-center cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Abrir menú"
            >
              <span className="block w-5 h-0.5 bg-white mb-1" />
              <span className="block w-5 h-0.5 bg-white mb-1" />
              <span className="block w-5 h-0.5 bg-white" />
            </label>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className="hidden peer-checked:block md:hidden border-t border-white/10 bg-wc-navy-light">
        <nav className="flex flex-col px-4 py-2 max-w-4xl mx-auto gap-0.5">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={closeHamburger}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-wc-red text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {label}
              </Link>
            );
          })}
          {!user && (
            <>
              <Link href="/login" onClick={closeHamburger} className="px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Iniciar sesión
              </Link>
              <Link href="/registro" onClick={closeHamburger} className="px-3 py-2.5 rounded-lg text-sm font-bold bg-wc-red text-white">
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
