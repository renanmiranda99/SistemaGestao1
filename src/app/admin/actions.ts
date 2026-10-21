"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { getConfig } from "@/lib/config";
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
  const [{ supabase }, config] = await Promise.all([exigirPerfil("admin"), getConfig()]);
  const sala_id = opt(form, "sala_id");
  const { error } = await supabase.from("contratos").insert({
    inquilino_id: inquilinoId,
    sala_id,
    data_assinatura: opt(form, "data_assinatura"),
    data_inicio: txt(form, "data_inicio"),
    data_fim: opt(form, "data_fim"),
    valor_mensal: num(form, "valor_mensal"),
    dia_vencimento: num(form, "dia_vencimento"),
    multa_percentual: num(form, "multa_percentual") ?? config.multaPadrao,
    juros_mensal_percentual: num(form, "juros_mensal_percentual") ?? config.jurosPadrao,
  });
  if (error) throw new Error(error.message);
  if (sala_id) await supabase.from("salas").update({ inquilino_id: inquilinoId, disponivel_aluguel: false }).eq("id", sala_id);
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
/**
 * Campo "inquilino" do formulário de sala: um inquilino, "disponivel" (anunciar na
 * página inicial como disponível para aluguel) ou vazio (sem inquilino e sem anúncio).
 */
function ocupacao(form: FormData) {
  const escolha = opt(form, "inquilino_id");
  if (escolha === "disponivel") return { inquilino_id: null, disponivel_aluguel: true };
  return { inquilino_id: escolha, disponivel_aluguel: false };
}

export async function salvarSala(id: string | null, form: FormData) {
  const { supabase } = await exigirPerfil("admin");
  const dados = {
    nome: txt(form, "nome"),
    andar: opt(form, "andar"),
    area_m2: num(form, "area_m2"),
    valor_aluguel: num(form, "valor_aluguel"),
    descricao: opt(form, "descricao"),
    ...ocupacao(form),
  };
  if (id) await supabase.from("salas").update(dados).eq("id", id);
  else await supabase.from("salas").insert(dados);
  atualizar("/admin/galeria");
  revalidatePath("/");
}

/**
 * Cadastra uma sala nova. Se já tiver inquilino, cria junto o contrato
 * (assinatura, início, vencimento do contrato e dia de vencimento da mensalidade)
 * e devolve o id da sala para o navegador enviar as fotos escolhidas.
 */
export async function cadastrarSala(
  _: { erro?: string; id?: string } | null,
  form: FormData
): Promise<{ erro?: string; id?: string } | null> {
  const [{ supabase }, config] = await Promise.all([exigirPerfil("admin"), getConfig()]);
  const { inquilino_id, disponivel_aluguel } = ocupacao(form);
  const valorAluguel = num(form, "valor_aluguel");

  const contrato = inquilino_id
    ? {
        data_assinatura: opt(form, "data_assinatura"),
        data_inicio: opt(form, "data_inicio"),
        data_fim: opt(form, "data_fim"),
        valor_mensal: valorAluguel,
        dia_vencimento: num(form, "dia_vencimento"),
        multa_percentual: num(form, "multa_percentual") ?? config.multaPadrao,
        juros_mensal_percentual: num(form, "juros_mensal_percentual") ?? config.jurosPadrao,
      }
    : null;
  if (contrato) {
    if (!contrato.valor_mensal) return { erro: "Informe o valor do aluguel para criar o contrato." };
    if (!contrato.data_inicio) return { erro: "Informe a data de início do contrato." };
    if (!contrato.dia_vencimento || contrato.dia_vencimento < 1 || contrato.dia_vencimento > 28)
      return { erro: "O dia de vencimento da mensalidade deve ser entre 1 e 28." };
    if (contrato.data_fim && contrato.data_fim <= contrato.data_inicio)
      return { erro: "O vencimento do contrato deve ser depois da data de início." };
  }

  const { data: sala, error } = await supabase
    .from("salas")
    .insert({
      nome: txt(form, "nome"),
      andar: opt(form, "andar"),
      area_m2: num(form, "area_m2"),
      valor_aluguel: valorAluguel,
      descricao: opt(form, "descricao"),
      inquilino_id,
      disponivel_aluguel,
    })
    .select("id")
    .single();
  if (error || !sala) return { erro: error?.message ?? "Não foi possível cadastrar a sala." };

  if (contrato && inquilino_id) {
    const { error: e2 } = await supabase.from("contratos").insert({ ...contrato, inquilino_id, sala_id: sala.id });
    if (e2) return { id: sala.id, erro: `Sala cadastrada, mas o contrato falhou: ${e2.message}` };
    await gerarRetroativas(inquilino_id);
  }
  atualizar("/admin/galeria");
  revalidatePath("/");
  // As fotos escolhidas no formulário são enviadas pelo navegador em seguida, já com o id da sala
  return { id: sala.id };
}

export async function registrarFotoVistoria(
  salaId: string,
  path: string,
  dados: { tipo: string; legenda: string; registradaEm: string }
) {
  const { supabase } = await exigirPerfil("admin");
  const { error } = await supabase.from("vistoria_fotos").insert({
    sala_id: salaId,
    storage_path: path,
    tipo: ["entrada", "saida", "dano"].includes(dados.tipo) ? dados.tipo : "entrada",
    legenda: dados.legenda.trim() || null,
    registrada_em: dados.registradaEm || hojeISO(),
  });
  revalidatePath("/admin/galeria");
  return error?.message ?? null;
}

export async function excluirFotoVistoria(id: string) {
  const { supabase } = await exigirPerfil("admin");
  const { data: f } = await supabase.from("vistoria_fotos").select("storage_path").eq("id", id).single();
  if (f) await supabase.storage.from("vistorias").remove([f.storage_path]);
  await supabase.from("vistoria_fotos").delete().eq("id", id);
  atualizar("/admin/galeria");
}

export async function excluirSala(id: string) {
  const { supabase } = await exigirPerfil("admin");
  // As linhas de vistoria somem em cascata; os arquivos do Storage precisam ser apagados à parte
  const { data: vist } = await supabase.from("vistoria_fotos").select("storage_path").eq("sala_id", id);
  if (vist?.length) await supabase.storage.from("vistorias").remove(vist.map((v) => v.storage_path as string));
  await supabase.from("salas").delete().eq("id", id);
  atualizar("/admin/galeria");
}

/** Registra uma foto. Sem `ordem`, ela entra depois das que já existem na sala. */
export async function registrarFoto(salaId: string | null, path: string, ordem?: number) {
  const { supabase } = await exigirPerfil("admin");
  let posicao = ordem;
  if (posicao === undefined) {
    let q = supabase.from("fotos").select("ordem").order("ordem", { ascending: false }).limit(1);
    q = salaId ? q.eq("sala_id", salaId) : q.is("sala_id", null);
    const { data: ultima } = await q.maybeSingle();
    posicao = ultima ? Number(ultima.ordem) + 1 : 0;
  }
  const { error } = await supabase.from("fotos").insert({ sala_id: salaId, storage_path: path, ordem: posicao });
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  return error?.message ?? null;
}

/** Grava a nova ordem das fotos: a primeira da lista vira a capa. */
export async function reordenarFotos(ids: string[]) {
  const { supabase } = await exigirPerfil("admin");
  const resultados = await Promise.all(ids.map((id, i) => supabase.from("fotos").update({ ordem: i }).eq("id", id)));
  atualizar("/admin/galeria", "/", "/inquilino/galeria");
  return resultados.find((r) => r.error)?.error?.message ?? null;
}

export async function excluirFoto(id: string) {
  const { supabase } = await exigirPerfil("admin");
  const { data: f } = await supabase.from("fotos").select("storage_path").eq("id", id).single();
  if (f) await supabase.storage.from("fotos").remove([f.storage_path]);
  await supabase.from("fotos").delete().eq("id", id);
  atualizar("/admin/galeria", "/");
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
