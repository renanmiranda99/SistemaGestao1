"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";

export type EstadoAcordo = { ok?: string; erro?: string } | null;

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => txt(f, k) || null;
const num = (f: FormData, k: string) => {
  const v = txt(f, k).replace(/\./g, "").replace(",", ".");
  return v === "" ? NaN : Number(v);
};

function atualizar() {
  // O acordo muda a situação das mensalidades: painel, pagamentos, inquilino etc.
  revalidatePath("/admin", "layout");
  revalidatePath("/inquilino", "layout");
}

/**
 * Registra um acordo judicial e dá baixa nas mensalidades escolhidas:
 * elas passam a "pago" com a data do acordo e ficam ligadas a ele.
 */
export async function registrarAcordo(_: EstadoAcordo, form: FormData): Promise<EstadoAcordo> {
  const { supabase } = await exigirPerfil("admin");
  const inquilinoId = txt(form, "inquilino_id");
  const dataAcordo = txt(form, "data_acordo");
  const valor = num(form, "valor_acordado");
  const ids = form.getAll("cobranca_ids").map(String).filter(Boolean);

  if (!inquilinoId) return { erro: "Escolha o inquilino do acordo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAcordo)) return { erro: "Informe a data do acordo." };
  if (!(valor >= 0)) return { erro: "Informe o valor acordado (pode ser 0,00 se houve perdão da dívida)." };
  if (!ids.length) return { erro: "Marque pelo menos uma mensalidade quitada pelo acordo." };

  // Só mensalidades deste inquilino que ainda não estão pagas
  const { data: cobs, error: e1 } = await supabase
    .from("cobrancas")
    .select("id, contrato_id, status")
    .in("id", ids)
    .eq("inquilino_id", inquilinoId);
  if (e1) return { erro: e1.message };
  const validas = (cobs ?? []).filter((c) => c.status !== "pago" && c.status !== "cancelado");
  if (!validas.length) return { erro: "As mensalidades marcadas já estão pagas ou canceladas." };

  const { data: acordo, error: e2 } = await supabase
    .from("acordos_judiciais")
    .insert({
      inquilino_id: inquilinoId,
      contrato_id: (validas[0]?.contrato_id as string | undefined) ?? null,
      numero_processo: opt(form, "numero_processo"),
      orgao: opt(form, "orgao"),
      data_acordo: dataAcordo,
      valor_acordado: valor,
      condicoes: opt(form, "condicoes"),
      observacoes: opt(form, "observacoes"),
    })
    .select("id")
    .single();
  if (e2 || !acordo) {
    return {
      erro: e2?.code === "PGRST205" || e2?.code === "42P01"
        ? "A tabela de acordos ainda não existe. Rode supabase/migracao_acordos.sql no Supabase."
        : `Não foi possível registrar: ${e2?.message}`,
    };
  }

  const { error: e3 } = await supabase
    .from("cobrancas")
    .update({ status: "pago", pago_em: dataAcordo, acordo_id: acordo.id })
    .in("id", validas.map((c) => c.id as string));
  if (e3) {
    await supabase.from("acordos_judiciais").delete().eq("id", acordo.id);
    return { erro: `Não foi possível dar baixa nas mensalidades: ${e3.message}` };
  }

  atualizar();
  return { ok: `Acordo registrado. ${validas.length} mensalidade(s) marcada(s) como quitadas. Anexe o PDF no acordo abaixo.` };
}

/** Exclui o acordo e reabre as mensalidades que ele tinha quitado. */
export async function excluirAcordo(id: string) {
  const { supabase } = await exigirPerfil("admin");
  await supabase.from("cobrancas").update({ status: "pendente", pago_em: null, acordo_id: null }).eq("acordo_id", id);
  const { data: a } = await supabase.from("acordos_judiciais").select("arquivo_path").eq("id", id).single();
  if (a?.arquivo_path) await supabase.storage.from("contratos").remove([a.arquivo_path]);
  await supabase.from("acordos_judiciais").delete().eq("id", id);
  atualizar();
}

export async function anexarArquivoAcordo(id: string, path: string) {
  const { supabase } = await exigirPerfil("admin");
  const { error } = await supabase.from("acordos_judiciais").update({ arquivo_path: path }).eq("id", id);
  atualizar();
  return error?.message ?? null;
}
