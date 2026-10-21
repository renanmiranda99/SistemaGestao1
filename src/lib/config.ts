import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { normalizarConfig, type Config } from "./config-padrao";
import { definirRegras } from "./regras";

/**
 * Configurações do painel (uma consulta por requisição, graças ao `cache`).
 * Se a tabela ainda não existir (migração não rodada), usa os padrões.
 */
export const getConfig = cache(async (): Promise<Config> => {
  const supabase = createClient();
  const { data } = await supabase.from("configuracoes").select("dados").eq("id", 1).maybeSingle();
  const config = normalizarConfig(data?.dados);
  definirRegras({ diasTolerancia: config.diasTolerancia, mensagemCobranca: config.mensagemCobranca, nome: config.nome });
  return config;
});
