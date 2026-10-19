import type { createClient } from "./supabase/server";
import type { Cobranca, Contrato, Multa, Sala } from "./types";

type DB = ReturnType<typeof createClient>;

export async function dadosFinanceirosInquilino(supabase: DB, inquilinoId: string) {
  const [{ data: contratos }, { data: cobrancas }, { data: multas }, { data: salas }] = await Promise.all([
    supabase.from("contratos").select("*").eq("inquilino_id", inquilinoId).order("data_inicio", { ascending: false }),
    supabase.from("cobrancas").select("*").eq("inquilino_id", inquilinoId).order("competencia", { ascending: false }),
    supabase.from("multas").select("*").eq("inquilino_id", inquilinoId).order("data", { ascending: false }),
    supabase.from("salas").select("*").eq("inquilino_id", inquilinoId).order("nome"),
  ]);
  const listaContratos = (contratos ?? []) as Contrato[];
  const porId = new Map(listaContratos.map((c) => [c.id, c]));
  return {
    contratos: listaContratos,
    contratoDe: (c: Cobranca) => porId.get(c.contrato_id) ?? null,
    cobrancas: (cobrancas ?? []) as Cobranca[],
    multas: (multas ?? []) as Multa[],
    salas: (salas ?? []) as Sala[],
  };
}
