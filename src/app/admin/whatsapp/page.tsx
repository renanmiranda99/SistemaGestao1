import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { detalheSituacao, diasTolerancia, ehPendente, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, dataHoraBR, hojeISO, mesAnoLongo } from "@/lib/format";
import { apiWhatsAppConfigurada, mensagemCobranca } from "@/lib/whatsapp";
import { Alerta, PageHeader, SituacaoBadge, Vazio } from "@/components/ui";
import { BotaoWhatsApp } from "@/components/BotaoWhatsApp";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { cobrarTodosEmAtraso } from "./actions";

export default async function AdminWhatsApp({ searchParams }: { searchParams: { enviados?: string; falhas?: string } }) {
  const { supabase } = await exigirPerfil("admin");
  const hoje = hojeISO();
  const api = apiWhatsAppConfigurada();
  const [{ cobrancas, contratoDe, inquilinoDe }, { data: historico }] = await Promise.all([
    dadosAdmin(supabase),
    supabase.from("mensagens_whatsapp").select("*").order("created_at", { ascending: false }).limit(30),
  ]);
  const atrasadas = cobrancas
    .filter((c) => ehPendente(c, hoje) && c.vencimento < hoje)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return (
    <>
      <PageHeader
        titulo="WhatsApp"
        descricao={`Cobranças em atraso. A cobrança começa no ${diasTolerancia()}º dia após o vencimento.`}
        acoes={
          api ? (
            <form action={cobrarTodosEmAtraso}>
              <BotaoConfirmar className="btn-whatsapp" mensagem="Enviar mensagem de cobrança para todos os boletos em cobrança?">
                Cobrar todos em cobrança
              </BotaoConfirmar>
            </form>
          ) : undefined
        }
      />

      {searchParams.enviados && (
        <div className="mb-4">
          <Alerta tipo="ok">{searchParams.enviados} mensagem(ns) enviada(s){Number(searchParams.falhas) ? `, ${searchParams.falhas} com erro` : ""}.</Alerta>
        </div>
      )}
      {!api && (
        <div className="mb-6">
          <Alerta tipo="aviso">
            O envio automático por API não está configurado. Os botões abrem o WhatsApp com a mensagem pronta, e você
            só precisa apertar enviar. Para disparo automático (incluindo a cobrança diária), configure
            <code className="mx-1">WHATSAPP_API_URL</code> no arquivo <code>.env.local</code> (veja o README).
          </Alerta>
        </div>
      )}

      <section className="card mb-6 overflow-x-auto lg:overflow-visible">
        <h2 className="mb-4 font-semibold">Boletos em atraso ({atrasadas.length})</h2>
        {atrasadas.length ? (
          <table className="table">
            <thead>
              <tr><th>Inquilino</th><th>Mês</th><th>Vencimento</th><th className="text-right">Valor atualizado</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {atrasadas.map((c) => {
                const inq = inquilinoDe(c.inquilino_id);
                const v = valorAtualizado(c, contratoDe(c), hoje);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/inquilinos/${c.inquilino_id}`} className="font-medium hover:underline">{inq?.nome || inq?.email}</Link>
                      <div className="text-xs text-stone-600">{inq?.telefone}</div>
                    </td>
                    <td className="capitalize">{mesAnoLongo(c.competencia)}</td>
                    <td>{dataBR(c.vencimento)} <span className="text-xs text-stone-600">({v.dias} dias)</span></td>
                    <td className="text-right font-medium">{brl(v.total)}</td>
                    <td><SituacaoBadge situacao={situacao(c, hoje)} dica={detalheSituacao(c, contratoDe(c), hoje)} /></td>
                    <td className="text-right">
                      {inq && (
                        <BotaoWhatsApp
                          inquilinoId={inq.id}
                          cobrancaId={c.id}
                          telefone={inq.telefone}
                          apiConfigurada={api}
                          rotulo="Cobrar"
                          mensagem={mensagemCobranca({ nome: inq.nome, competencia: c.competencia, vencimento: c.vencimento, valor: v.total, dias: v.dias })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Vazio>Nenhum boleto em atraso.</Vazio>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold">Histórico de mensagens</h2>
        {historico?.length ? (
          <table className="table">
            <thead><tr><th>Data</th><th>Inquilino</th><th>Tipo</th><th>Status</th><th>Mensagem</th></tr></thead>
            <tbody>
              {historico.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{dataHoraBR(m.created_at)}</td>
                  <td>{m.inquilino_id ? inquilinoDe(m.inquilino_id)?.nome ?? "—" : "—"}</td>
                  <td>{m.tipo === "automatica" ? "Automática" : "Manual"}</td>
                  <td title={m.erro ?? ""}>{m.status}</td>
                  <td className="max-w-md truncate text-stone-600">{m.mensagem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Vazio>Nenhuma mensagem ainda.</Vazio>
        )}
      </section>
    </>
  );
}
