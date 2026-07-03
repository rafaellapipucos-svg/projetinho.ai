import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/request-url";

/**
 * Callback do OAuth (Google): troca o `code` por sessão e segue para `next`.
 * Links de e-mail usam /auth/confirm (verifyOtp com token_hash).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
