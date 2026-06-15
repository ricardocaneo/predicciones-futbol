import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar, { type NavbarUser } from "@/components/Navbar";
import AuthListener from "@/components/AuthListener";
import ThemeRestorer from "@/components/ThemeRestorer";
import AccountInactive from "@/components/AccountInactive";
import { createClient } from "@/lib/supabase/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "La Pollita Mundialera 🐣⚽",
  description: "Juego de pronósticos de fútbol",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lee la sesión server-side para pasar el usuario al Navbar sin roundtrip cliente
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  let theme: "light" | "dark" = "light";

  let navbarUser: NavbarUser = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email, avatar_url, theme, is_active")
      .eq("id", user.id)
      .single();

    navbarUser = {
      id: user.id,
      displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "Usuario",
      email: profile?.email ?? user.email ?? "",
      avatarUrl: profile?.avatar_url ?? undefined,
    };

    const cookieTheme = cookieStore.get("theme")?.value;
    if (cookieTheme === "dark" || cookieTheme === "light") {
      theme = cookieTheme;
    } else if (profile?.theme === "dark") {
      theme = "dark";
    }

    if (profile?.is_active === false) {
      return (
        <html lang="es" className={`${geist.variable}${theme === "dark" ? " dark" : ""}`} suppressHydrationWarning>
          <head>
            <script dangerouslySetInnerHTML={{ __html:
              `try{var m=document.cookie.match(/(?:^|;\\s*)theme=([^;]+)/);var t=m?m[1]:null;if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light')document.documentElement.classList.remove('dark');}catch(e){}`
            }} />
          </head>
          <body suppressHydrationWarning className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
            <AccountInactive />
          </body>
        </html>
      );
    }
  } else {
    const cookieTheme = cookieStore.get("theme")?.value;
    if (cookieTheme === "dark") theme = "dark";
  }

  return (
    <html lang="es" className={`${geist.variable}${theme === "dark" ? " dark" : ""}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html:
          `try{var m=document.cookie.match(/(?:^|;\\s*)theme=([^;]+)/);var t=m?m[1]:null;if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light')document.documentElement.classList.remove('dark');}catch(e){}`
        }} />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
        <ThemeRestorer />
        <AuthListener />
        <Navbar user={navbarUser} />
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
