import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url    = new URL(request.url);
  const host   = request.headers.get("host") ?? url.host;
  const proto  = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = `${proto}://${host}`;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // Build the success redirect first so session cookies land on it directly.
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      const meta = user.user_metadata;
      const providerAvatar = (meta?.avatar_url || meta?.picture) as string | undefined;
      if (providerAvatar) {
        await supabase
          .from("profiles")
          .update({ avatar_url: providerAvatar })
          .eq("id", user.id);
      }
      return response;
    }

    if (!error) return response;
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
