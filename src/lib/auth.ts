import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getConfig } from "./config";
import type { Profile, Role } from "./types";

/**
 * Sessão + perfil do usuário logado.
 * `cache` faz o layout e a página compartilharem UMA única consulta por requisição.
 * `getClaims` valida o token localmente (chaves JWT assimétricas do Supabase),
 * sem ida ao servidor de autenticação a cada página.
 */
export const getSessao = cache(async () => {
  const supabase = createClient();
  // Carrega as configurações junto (regras de cobrança usadas nos cálculos da página)
  const [{ data }] = await Promise.all([supabase.auth.getClaims(), getConfig()]);
  const id = data?.claims?.sub;
  if (!id) return { supabase, user: null, perfil: null };
  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single<Profile>();
  return { supabase, user: { id }, perfil };
});

/** Garante usuário logado com o perfil exigido; senão redireciona. */
export async function exigirPerfil(role: Role) {
  const s = await getSessao();
  if (!s.user || !s.perfil) redirect("/login");
  if (!s.perfil.ativo) redirect("/login?erro=inativo");
  if (s.perfil.role !== role) redirect(s.perfil.role === "admin" ? "/admin" : "/inquilino");
  return { supabase: s.supabase, user: s.user, perfil: s.perfil };
}

/** URLs assinadas (temporárias) para arquivos privados do Storage. */
export async function urlsAssinadas(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  paths: (string | null | undefined)[]
) {
  const validos = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (!validos.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(validos, 60 * 60);
  const mapa: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
  });
  return mapa;
}

export function urlPublicaFoto(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos/${path}`;
}
