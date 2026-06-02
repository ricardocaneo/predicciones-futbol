import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/mis-pronosticos", "/perfil", "/toque-maestro"];
const AUTH_ONLY  = ["/login", "/registro"];

const SESSION_COOKIES = [
  "sb-wbipydxmgkbrdjcnblvc-auth-token",
  "sb-wbipydxmgkbrdjcnblvc-auth-token.0",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

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
