import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES: EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
];

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//")
    ? raw
    : "/dashboard";
}

/**
 * Confirmação de e-mail (cadastro e recuperação de senha) pelo padrão SSR
 * oficial do Supabase: valida o `token_hash` do link com `verifyOtp`. É
 * robusto — não depende do cookie PKCE do navegador que iniciou o fluxo,
 * então funciona mesmo abrindo o e-mail em outro dispositivo.
 *
 * A rota também aceita `?code=` (fluxo OAuth) por conveniência, redirecionando
 * o token de código quando presente.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && rawType) {
    const type = (VALID_TYPES as string[]).includes(rawType)
      ? (rawType as EmailOtpType)
      : "email";
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
