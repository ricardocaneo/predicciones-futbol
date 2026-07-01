import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/mis-pronosticos", "/perfil", "/toque-maestro"];
const AUTH_ONLY  = ["/login", "/registro"];

// supabase-js v2.106+ genera la storage key como `sb-{projectRef}-auth-token`.
// El token se fragmenta en chunks: key.0, key.1, etc.
// Incluimos fallback al formato legacy por si quedan sesiones antiguas en el browser.
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
const SESSION_COOKIES = [
  `sb-${ref}-auth-token`,
  `sb-${ref}-auth-token.0`,
  `sb-${ref}-auth-token.1`,
  `sb-${ref}-auth-token.2`,
  "supabase.auth.token",
  "supabase.auth.token.0",
];

// Cookie que marca "ya pasó por el re-login forzado de 2026-07-01".
// Si el usuario tiene sesión vieja pero no este marcador, se lo saca y
// se le pide que vuelva a loguearse.
const REAUTH_MARKER = "sesh_v2";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const hasMarker  = request.cookies.has(REAUTH_MARKER);

  // Re-login forzado (una sola vez): sesión vieja sin marcador → borrar cookies y redirigir a login
  if (hasSession && !hasMarker) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);
    SESSION_COOKIES.forEach((name) => {
      if (request.cookies.has(name)) response.cookies.delete(name);
    });
    response.cookies.set(REAUTH_MARKER, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  if (!hasSession && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
