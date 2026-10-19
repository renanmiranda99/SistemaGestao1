import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIAS_TOLERANCIA, valorAtualizado } from "@/lib/cobranca";
import { diffDias, hojeISO } from "@/lib/format";
import { apiWhatsAppConfigurada, enviarWhatsAppApi, mensagemCobranca } from "@/lib/whatsapp";
import type { Cobranca, Contrato, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Rotina diária (agende 1x por dia — ver vercel.json / README):
 * 1. Gera as cobranças do mês atual para todos os contratos ativos.
 * 2. Envia cobrança por WhatsApp a partir do 3º dia após o vencimento,
 *    repetindo a cada INTERVALO_REPETICAO_COBRANCA dias enquanto estiver em aberto.
 * Protegida por: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const hoje = hojeISO();
  const intervalo = Math.max(1, Number(process.env.INTERVALO_REPETICAO_COBRANCA ?? 3));

  const { data: geradas, error: erroGerar } = await supabase.rpc("gerar_cobrancas", { p_mes: hoje });

  const { data: cobs } = await supabase.from("cobrancas").select("*").eq("status", "pendente").lte("vencimento", hoje);
  const cobrancas = (cobs ?? []) as Cobranca[];
  const ids = Array.from(new Set(cobrancas.map((c) => c.inquilino_id)));
  const [{ data: perfis }, { data: contratos }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("*").in("id", ids) : Promise.resolve({ data: [] }),
    supabase.from("contratos").select("*"),
  ]);
  const perfil = new Map(((perfis ?? []) as Profile[]).map((p) => [p.id, p]));
  const contrato = new Map(((contratos ?? []) as Contrato[]).map((c) => [c.id, c]));

  const resultado = { geradas: geradas ?? 0, erroGerar: erroGerar?.message, avaliadas: 0, enviadas: 0, falhas: 0, semApi: !apiWhatsAppConfigurada() };

  for (const c of cobrancas) {
    const dias = diffDias(c.vencimento, hoje);
    if (dias < DIAS_TOLERANCIA || (dias - DIAS_TOLERANCIA) % intervalo !== 0) continue;
    const inq = perfil.get(c.inquilino_id);
    if (!inq?.telefone || !inq.ativo) continue;
    resultado.avaliadas++;

    // Evita duplicar no mesmo dia
    const { count } = await supabase
      .from("mensagens_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("cobranca_id", c.id)
      .eq("tipo", "automatica")
      .gte("created_at", `${hoje}T00:00:00-03:00`);
    if (count) continue;
    if (resultado.semApi) continue;

    const v = valorAtualizado(c, contrato.get(c.contrato_id), hoje);
    const mensagem = mensagemCobranca({ nome: inq.nome, competencia: c.competencia, vencimento: c.vencimento, valor: v.total, dias });
    const r = await enviarWhatsAppApi(inq.telefone, mensagem);
    if (r.ok) resultado.enviadas++;
    else resultado.falhas++;
    await supabase.from("mensagens_whatsapp").insert({
      inquilino_id: inq.id,
      cobranca_id: c.id,
      telefone: inq.telefone,
      mensagem,
      tipo: "automatica",
      status: r.ok ? "enviada" : "erro",
      erro: r.ok ? null : r.erro,
    });
  }

  return NextResponse.json(resultado);
}
