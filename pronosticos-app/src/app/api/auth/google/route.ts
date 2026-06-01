import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  // En dev, Next.js construye request.url con "localhost" aunque el cliente
  // venga por una IP de red local. Usamos el header Host para obtener el origen real.
  const url   = new URL(request.url);
  const host  = request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = `${proto}://${host}`;

  // Collect cookies that signInWithOAuth wants to set (PKCE code verifier).
  const cookiesToSet: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) =>
            cookiesToSet.push({ name, value, options })
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: "email profile",
      skipBrowserRedirect: true,
    },
  });

  const generatedUrl = data?.url ? new URL(data.url) : null;
  console.log("[OAuth] redirect_to en URL generada:", generatedUrl?.searchParams.get("redirect_to"));

  if (error || !data.url) {
    console.error("[Google OAuth] signInWithOAuth error:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const response = NextResponse.redirect(data.url);
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  return response;
}
