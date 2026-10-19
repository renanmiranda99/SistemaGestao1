import Link from "next/link";
import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, dataHoraBR, hojeISO, mesAnoLongo } from "@/lib/format";
import type { Comprovante } from "@/lib/types";
import { atualizarCobranca, avaliarComprovante, gerarCobrancasMes, marcarCobranca } from "../actions";
import { PageHeader, SituacaoBadge, Vazio } from "@/components/ui";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";

export default async function AdminPagamentos({ searchParams }: { searchParams: { mes?: string } }) {
  const { supabase } = await exigirPerfil("admin");
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : hoje.slice(0, 7);
  const competencia = `${mes}-01`;

  const { cobrancas, contratoDe, inquilinoDe, salasDe } = await dadosAdmin(supabase, { de: competencia, ate: competencia });
  const { data: comps } = await supabase
    .from("comprovantes")
    .select("*")
    .eq("status", "em_analise")
    .order("enviado_em");
  const comprovantes = (comps ?? []) as Comprovante[];
  const { data: cobsComp } = comprovantes.length
    ? await supabase.from("cobrancas").select("*").in("id", comprovantes.map((c) => c.cobranca_id))
    : { data: [] };
  const cobrancaPorId = new Map((cobsComp ?? []).map((c) => [c.id as string, c]));
  const { data: perfis } = await supabase.from("profiles").select("id, nome, email");
  const nomePerfil = new Map((perfis ?? []).map((p) => [p.id as string, (p.nome || p.email) as string]));
  const urls = await urlsAssinadas(supabase, "comprovantes", comprovantes.map((c) => c.arquivo_path));

  const [a, m] = mes.split("-").map(Number);
  const anterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  const proximo = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  const ativos = cobrancas.filter((c) => c.status !== "cancelado");
  const recebido = ativos.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
  const previsto = ativos.reduce((s, c) => s + Number(c.valor), 0);

  return (
    <>
      <PageHeader titulo="Pagamentos" descricao="Analise comprovantes e acompanhe as cobranças de cada mês." />

      <section className="card mb-6">
        <h2 className="mb-4 font-semibold">Comprovantes aguardando análise ({comprovantes.length})</h2>
        {comprovantes.length ? (
          <div className="space-y-3">
            {comprovantes.map((cp) => {
              const cob = cobrancaPorId.get(cp.cobranca_id);
              return (
                <div key={cp.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-stone-200 p-4">
                  <div className="text-sm">
                    <Link href={`/admin/inquilinos/${cp.inquilino_id}`} className="font-semibold hover:underline">
                      {nomePerfil.get(cp.inquilino_id) ?? "Inquilino"}
                    </Link>
                    <div className="text-slate-500">
                      {cob ? <span className="capitalize">{mesAnoLongo(cob.competencia)}</span> : "—"} · {cob ? brl(cob.valor) : ""} · enviado {dataHoraBR(cp.enviado_em)}
                    </div>
                    {urls[cp.arquivo_path] && (
                      <a href={urls[cp.arquivo_path]} target="_blank" rel="noreferrer" className="link">Abrir comprovante</a>
                    )}
                  </div>
                  <form className="flex flex-wrap items-center gap-2">
                    <input name="observacao" placeholder="Observação (opcional)" className="input w-56" />
                    <input name="pago_em" type="date" defaultValue={hoje} className="input w-auto" title="Data do pagamento" />
                    <button formAction={avaliarComprovante.bind(null, cp.id, true)} className="btn-primary btn-sm">Aprovar</button>
                    <button formAction={avaliarComprovante.bind(null, cp.id, false)} className="btn-danger btn-sm">Rejeitar</button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <Vazio>Nenhum comprovante pendente de análise.</Vazio>
        )}
      </section>

      <section className="card overflow-x-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={`/admin/pagamentos?mes=${anterior}`} className="btn-secondary btn-sm">←</Link>
            <h2 className="min-w-44 text-center font-semibold capitalize">{mesAnoLongo(competencia)}</h2>
            <Link href={`/admin/pagamentos?mes=${proximo}`} className="btn-secondary btn-sm">→</Link>
          </div>
          <div className="text-sm text-slate-500">Recebido {brl(recebido)} de {brl(previsto)}</div>
          <form action={gerarCobrancasMes}>
            <input type="hidden" name="mes" value={mes} />
            <BotaoConfirmar className="btn-primary btn-sm" mensagem="Gerar as cobranças deste mês para todos os contratos ativos? (as já existentes não são duplicadas)">
              Gerar cobranças do mês
            </BotaoConfirmar>
          </form>
        </div>
        {cobrancas.length ? (
          <table className="table">
            <thead>
              <tr><th>Inquilino</th><th>Vencimento</th><th className="text-right">Valor</th><th className="text-right">Atualizado</th><th>Situação</th><th className="text-right">Ações</th></tr>
            </thead>
            <tbody>
              {cobrancas.map((c) => {
                const inq = inquilinoDe(c.inquilino_id);
                const v = valorAtualizado(c, contratoDe(c), hoje);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/inquilinos/${c.inquilino_id}`} className="font-medium hover:underline">{inq?.nome || inq?.email}</Link>
                      <div className="text-xs text-slate-400">{salasDe(c.inquilino_id).map((s) => s.nome).join(", ")}</div>
                    </td>
                    <td>{dataBR(c.vencimento)}</td>
                    <td className="text-right">{brl(c.valor)}</td>
                    <td className="text-right">{v.total !== v.base ? <span className="text-red-700">{brl(v.total)}</span> : "—"}</td>
                    <td><SituacaoBadge situacao={situacao(c, hoje)} /></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {c.status !== "pago" && c.status !== "cancelado" && (
                          <form action={marcarCobranca.bind(null, c.id, "pago")}>
                            <BotaoConfirmar mensagem="Marcar como pago hoje?">Marcar pago</BotaoConfirmar>
                          </form>
                        )}
                        <details className="relative">
                          <summary className="btn-secondary btn-sm cursor-pointer list-none">Boleto</summary>
                          <form action={atualizarCobranca.bind(null, c.id)} className="absolute right-0 z-20 mt-1 w-80 space-y-2 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
                            <div className="grid grid-cols-2 gap-2">
                              <input name="valor" defaultValue={String(c.valor).replace(".", ",")} className="input" title="Valor" />
                              <input name="vencimento" type="date" defaultValue={c.vencimento} className="input" />
                            </div>
                            <input name="boleto_url" defaultValue={c.boleto_url ?? ""} placeholder="Link do boleto" className="input" />
                            <input name="linha_digitavel" defaultValue={c.linha_digitavel ?? ""} placeholder="Linha digitável / PIX copia e cola" className="input" />
                            <input name="observacao" defaultValue={c.observacao ?? ""} placeholder="Observação ao inquilino" className="input" />
                            <button className="btn-primary btn-sm w-full">Salvar</button>
                          </form>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Vazio>Nenhuma cobrança neste mês. Use “Gerar cobranças do mês”.</Vazio>
        )}
      </section>
    </>
  );
}
