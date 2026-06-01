import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar, { type NavbarUser } from "@/components/Navbar";
import AuthListener from "@/components/AuthListener";
import { createClient } from "@/lib/supabase/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "El Juego del Mundial ⚽",
  description: "Juego de pronósticos de fútbol",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lee la sesión server-side para pasar el usuario al Navbar sin roundtrip cliente
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let navbarUser: NavbarUser = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email, avatar_url")
      .eq("id", user.id)
      .single();

    navbarUser = {
      id: user.id,
      displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "Usuario",
      email: profile?.email ?? user.email ?? "",
      avatarUrl: profile?.avatar_url ?? undefined,
    };
  }

  return (
    <html lang="es" className={geist.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
        <AuthListener />
        <Navbar user={navbarUser} />
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
