"use server";

import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { situacao, valorAtualizado } from "@/lib/cobranca";
import { hojeISO } from "@/lib/format";
import { apiWhatsAppConfigurada, enviarWhatsAppApi, mensagemCobranca } from "@/lib/whatsapp";

/** Envia cobrança por API para todo boleto "em cobrança" (3+ dias de atraso). */
export async function cobrarTodosEmAtraso() {
  const { supabase, perfil } = await exigirPerfil("admin");
  if (!apiWhatsAppConfigurada()) redirect("/admin/whatsapp");
  const hoje = hojeISO();
  const { cobrancas, contratoDe, inquilinoDe } = await dadosAdmin(supabase);
  let enviados = 0;
  let falhas = 0;

  for (const c of cobrancas.filter((x) => situacao(x, hoje) === "em_cobranca")) {
    const inq = inquilinoDe(c.inquilino_id);
    if (!inq?.telefone || !inq.ativo) continue;
    const v = valorAtualizado(c, contratoDe(c), hoje);
    const mensagem = mensagemCobranca({ nome: inq.nome, competencia: c.competencia, vencimento: c.vencimento, valor: v.total, dias: v.dias });
    const r = await enviarWhatsAppApi(inq.telefone, mensagem);
    if (r.ok) enviados++;
    else falhas++;
    await supabase.from("mensagens_whatsapp").insert({
      inquilino_id: inq.id,
      cobranca_id: c.id,
      telefone: inq.telefone,
      mensagem,
      tipo: "manual",
      status: r.ok ? "enviada" : "erro",
      erro: r.ok ? null : r.erro,
      enviado_por: perfil.id,
    });
  }
  redirect(`/admin/whatsapp?enviados=${enviados}&falhas=${falhas}`);
}
