import type { createClient } from "./supabase/server";
import type { Cobranca, Contrato, Profile, Sala } from "./types";

type DB = ReturnType<typeof createClient>;

export async function dadosAdmin(supabase: DB, filtro?: { de?: string; ate?: string }) {
  let q = supabase.from("cobrancas").select("*").order("competencia");
  if (filtro?.de) q = q.gte("competencia", filtro.de);
  if (filtro?.ate) q = q.lte("competencia", filtro.ate);
  const [{ data: inq }, { data: cob }, { data: con }, { data: sal }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "inquilino").order("nome"),
    q,
    supabase.from("contratos").select("*"),
    supabase.from("salas").select("*").order("nome"),
  ]);
  const inquilinos = (inq ?? []) as Profile[];
  const cobrancas = (cob ?? []) as Cobranca[];
  const contratos = (con ?? []) as Contrato[];
  const salas = (sal ?? []) as Sala[];
  const contratoPorId = new Map(contratos.map((c) => [c.id, c]));
  const inquilinoPorId = new Map(inquilinos.map((i) => [i.id, i]));
  return {
    inquilinos,
    cobrancas,
    contratos,
    salas,
    contratoDe: (c: Cobranca) => contratoPorId.get(c.contrato_id) ?? null,
    inquilinoDe: (id: string) => inquilinoPorId.get(id) ?? null,
    salasDe: (id: string) => salas.filter((s) => s.inquilino_id === id),
  };
}
