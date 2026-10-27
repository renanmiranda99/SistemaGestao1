import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Alternativa ao /auth/callback que funciona mesmo abrindo o link em outro
 * aparelho (ex.: pediu no computador, abriu o e-mail no celular). Requer o
 * modelo de e-mail do Supabase apontando para:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/inquilino";

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  if (type === "recovery") return NextResponse.redirect(`${origin}/redefinir-senha`);
  return NextResponse.redirect(`${origin}/login?erro=confirmacao`);
}
