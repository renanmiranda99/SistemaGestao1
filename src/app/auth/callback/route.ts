import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Só aceita caminhos internos (evita redirecionar para outro site). */
function destinoSeguro(next: string | null, padrao: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : padrao;
}

// Links dos e-mails do Supabase (confirmação de cadastro e redefinição de senha)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = destinoSeguro(searchParams.get("next"), "/inquilino");
  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  if (next === "/redefinir-senha") return NextResponse.redirect(`${origin}/redefinir-senha`);
  return NextResponse.redirect(`${origin}/login?erro=confirmacao`);
}
