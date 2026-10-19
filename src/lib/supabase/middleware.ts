import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_PUBLICAS = ["/login", "/cadastro", "/auth", "/api/cron"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims valida o token localmente (sem chamada de rede na maioria das vezes)
  // e renova a sessão quando o token expira.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  // "/" é a página pública com as salas disponíveis para aluguel
  const publica = path === "/" || ROTAS_PUBLICAS.some((r) => path.startsWith(r));

  if (!logado && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
