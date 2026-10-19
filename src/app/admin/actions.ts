"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { apiWhatsAppConfigurada, enviarWhatsAppApi } from "@/lib/whatsapp";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = txt(f, k).replace(/\./g, "").replace(",", ".");
  return v === "" ? null : Number(v);
};
const opt = (f: FormData, k: string) => txt(f, k) || null;

function atualizar(...paths: string[]) {
  paths.forEach((p) => revalidatePath(p));
  revalidatePath("/admin", "layout");
}

// ---------------- Inquilinos ----------------
export async function salvarInquilino(id: string, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  await supabase
    .from("profiles")
    .update({
      nome: txt(form, "nome"),
      telefone: opt(form, "telefone"),
      cpf_cnpj: opt(form, "cpf_cnpj"),
      ativo: form.get("ativo") === "on",
    })
    .eq("id", id);
  atualizar(`/admin/inquilinos/${id}`);
}

// ---------------- Contratos ----------------
export async function criarContrato(inquilinoId: string, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  const sala_id = opt(form, "sala_id");
  const { error } = await supabase.from("contratos").insert({
    inquilino_id: inquilinoId,
    sala_id,
    data_inicio: txt(form, "data_inicio"),
    data_fim: opt(form, "data_fim"),
    valor_mensal: num(form, "valor_mensal"),
    dia_vencimento: num(form, "dia_vencimento"),
    multa_percentual: num(form, "multa_percentual") ?? 2,
    juros_mensal_percentual: num(form, "juros_mensal_percentual") ?? 1,
  });
  if (error) throw new Error(error.message);
  if (sala_id) await supabase.from("salas").update({ inquilino_id: inquilinoId }).eq("id", sala_id);
  // Já lança as cobranças desde o início do contrato até o mês atual
  await gerarRetroativas(inquilinoId);
  atualizar(`/admin/inquilinos/${inquilinoId}`);
}

async function gerarRetroativas(inquilinoId: string) {
  const { supabase } = await exigirPerfil("admin");
  const { data: contratos } = await supabase
    .from("contratos")
    .select("data_inicio")
    .eq("inquilino_id", inquilinoId)
    .eq("ativo", true);
  const hoje = hojeISO();
  const inicio = (contratos ?? []).map((c) => c.data_inicio as string).sort()[0];
  if (!inicio) return;
  let [a, m] = [Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7))];
  const [ah, mh] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))];
  let guarda = 0;
  while ((a < ah || (a === ah && m <= mh)) && guarda++ < 240) {
    await supabase.rpc("gerar_cobrancas", { p_mes: `${a}-${String(m).padStart(2, "0")}-01` });
    m++;
    if (m > 12) { m = 1; a++; }
  }
}

export async function encerrarContrato(contratoId: string, inquilinoId: string) {
  const { supabase } = await exigirPerfil("admin");
  const { data: c } = await supabase.from("contratos").select("sala_id").eq("id", contratoId).single();
  await supabase.from("contratos").update({ ativo: false, data_fim: hojeISO() }).eq("id", contratoId);
  if (c?.sala_id) await supabase.from("salas").update({ inquilino_id: null }).eq("id", c.sala_id);
  atualizar(`/admin/inquilinos/${inquilinoId}`);
}

export async function anexarArquivoContrato(contratoId: string, path: string) {
  const { supabase } = await exigirPerfil("admin");
  const { error } = await supabase.from("contratos").update({ arquivo_path: path }).eq("id", contratoId);
  revalidatePath("/admin", "layout");
  return error?.message ?? null;
}

export async function criarAditivo(contratoId: string, inquilinoId: string, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  await supabase.from("aditivos").insert({
    contrato_id: contratoId,
    titulo: txt(form, "titulo"),
    descricao: opt(form, "descricao"),
    data: txt(form, "data") || hojeISO(),
  });
  atualizar(`/admin/inquilinos/${inquilinoId}`);
}

export async function anexarArquivoAditivo(aditivoId: string, path: string) {
  const { supabase } = await exigirPerfil("admin");
  const { error } = await supabase.from("aditivos").update({ arquivo_path: path }).eq("id", aditivoId);
  revalidatePath("/admin", "layout");
  return error?.message ?? null;
}

// ---------------- Cobranças ----------------
export async function gerarCobrancasMes(form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  const mes = txt(form, "mes") || hojeISO().slice(0, 7); // "AAAA-MM"
  await supabase.rpc("gerar_cobrancas", { p_mes: `${mes}-01` });
  atualizar("/admin/pagamentos");
}

export async function atualizarCobranca(id: string, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  await supabase
    .from("cobrancas")
    .update({
      valor: num(form, "valor") ?? undefined,
      vencimento: txt(form, "vencimento") || undefined,
      boleto_url: opt(form, "boleto_url"),
      linha_digitavel: opt(form, "linha_digitavel"),
      observacao: opt(form, "observacao"),
    })
    .eq("id", id);
  atualizar("/admin/pagamentos");
}

export async function marcarCobranca(id: string, status: "pago" | "pendente" | "cancelado") {
  const { supabase } = await exigirPerfil("admin");
  await supabase
    .from("cobrancas")
    .update({ status, pago_em: status === "pago" ? hojeISO() : null })
    .eq("id", id);
  atualizar("/admin/pagamentos");
}

export async function avaliarComprovante(id: string, aprovado: boolean, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  const { data: comp } = await supabase.from("comprovantes").select("cobranca_id").eq("id", id).single();
  await supabase
    .from("comprovantes")
    .update({ status: aprovado ? "aprovado" : "rejeitado", observacao_admin: opt(form, "observacao") })
    .eq("id", id);
  if (comp) {
    await supabase
      .from("cobrancas")
      .update(aprovado ? { status: "pago", pago_em: txt(form, "pago_em") || hojeISO() } : { status: "pendente" })
      .eq("id", comp.cobranca_id);
  }
  atualizar("/admin/pagamentos");
}

// ---------------- Multas ----------------
export async function lancarMulta(inquilinoId: string, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  await supabase.from("multas").insert({
    inquilino_id: inquilinoId,
    cobranca_id: opt(form, "cobranca_id"),
    descricao: txt(form, "descricao"),
    valor: num(form, "valor"),
    data: txt(form, "data") || hojeISO(),
  });
  atualizar(`/admin/inquilinos/${inquilinoId}`);
}

export async function marcarMulta(id: string, status: "pendente" | "paga" | "cancelada") {
  const { supabase } = await exigirPerfil("admin");
  await supabase.from("multas").update({ status }).eq("id", id);
  revalidatePath("/admin", "layout");
}

// ---------------- Salas, fotos e avisos ----------------
export async function salvarSala(id: string | null, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  const dados = {
    nome: txt(form, "nome"),
    andar: opt(form, "andar"),
    area_m2: num(form, "area_m2"),
    valor_aluguel: num(form, "valor_aluguel"),
    descricao: opt(form, "descricao"),
    inquilino_id: opt(form, "inquilino_id"),
  };
  if (id) await supabase.from("salas").update(dados).eq("id", id);
  else await supabase.from("salas").insert(dados);
  atualizar("/admin/galeria");
}

export async function excluirSala(id: string) {
  const { supabase } = await exigirPerfil("admin");
  await supabase.from("salas").delete().eq("id", id);
  atualizar("/admin/galeria");
}

export async function registrarFoto(salaId: string | null, path: string) {
  const { supabase } = await exigirPerfil("admin");
  const { error } = await supabase.from("fotos").insert({ sala_id: salaId, storage_path: path });
  revalidatePath("/admin", "layout");
  return error?.message ?? null;
}

export async function excluirFoto(id: string) {
  const { supabase } = await exigirPerfil("admin");
  const { data: f } = await supabase.from("fotos").select("storage_path").eq("id", id).single();
  if (f) await supabase.storage.from("fotos").remove([f.storage_path]);
  await supabase.from("fotos").delete().eq("id", id);
  atualizar("/admin/galeria");
}

export async function publicarAviso(form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  await supabase.from("avisos").insert({ titulo: txt(form, "titulo"), conteudo: txt(form, "conteudo") });
  atualizar("/admin/galeria");
}

export async function excluirAviso(id: string) {
  const { supabase } = await exigirPerfil("admin");
  await supabase.from("avisos").delete().eq("id", id);
  atualizar("/admin/galeria");
}

// ---------------- WhatsApp ----------------
export async function enviarWhatsApp(p: {
  inquilinoId: string;
  cobrancaId?: string | null;
  telefone: string;
  mensagem: string;
}): Promise<{ via: "api" | "link"; ok: boolean; erro?: string }> {
  const { supabase, perfil } = await exigirPerfil("admin");
  let via: "api" | "link" = "link";
  let ok = true;
  let erro: string | undefined;
  if (apiWhatsAppConfigurada()) {
    via = "api";
    const r = await enviarWhatsAppApi(p.telefone, p.mensagem);
    ok = r.ok;
    erro = r.ok ? undefined : r.erro;
  }
  await supabase.from("mensagens_whatsapp").insert({
    inquilino_id: p.inquilinoId,
    cobranca_id: p.cobrancaId ?? null,
    telefone: p.telefone,
    mensagem: p.mensagem,
    tipo: "manual",
    status: via === "link" ? "registrada" : ok ? "enviada" : "erro",
    erro: erro ?? null,
    enviado_por: perfil.id,
  });
  revalidatePath("/admin/whatsapp");
  return { via, ok, erro };
}
