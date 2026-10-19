import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link de confirmação de e-mail do Supabase
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/inquilino`);
  }
  return NextResponse.redirect(`${origin}/login?erro=confirmacao`);
}
