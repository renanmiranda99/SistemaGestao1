import Link from "next/link";
import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { detalheSituacao, situacao, valorAtualizado } from "@/lib/cobranca";
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

  const [{ cobrancas, contratoDe, inquilinoDe, salasDe }, { data: comps }, { data: perfis }] = await Promise.all([
    dadosAdmin(supabase, { de: competencia, ate: competencia }),
    supabase.from("comprovantes").select("*").eq("status", "em_analise").order("enviado_em"),
    supabase.from("profiles").select("id, nome, email"),
  ]);
  const comprovantes = (comps ?? []) as Comprovante[];
  const [{ data: cobsComp }, urls] = await Promise.all([
    comprovantes.length
      ? supabase.from("cobrancas").select("*").in("id", comprovantes.map((c) => c.cobranca_id))
      : Promise.resolve({ data: [] }),
    urlsAssinadas(supabase, "comprovantes", comprovantes.map((c) => c.arquivo_path)),
  ]);
  const cobrancaPorId = new Map((cobsComp ?? []).map((c) => [c.id as string, c]));
  const nomePerfil = new Map((perfis ?? []).map((p) => [p.id as string, (p.nome || p.email) as string]));

  const [a, m] = mes.split("-").map(Number);
  const anterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  const proximo = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  const ativos = cobrancas.filter((c) => c.status !== "cancelado");
  const recebido = ativos.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
  const previsto = ativos.reduce((s, c) => s + Number(c.valor), 0);

  return (
    <>
      <PageHeader titulo="Pagamentos" descricao="Analise comprovantes e acompanhe as cobranças de cada mês." />

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2.5">
          <h2 className="titulo-secao">Comprovantes para analisar</h2>
          <span className="badge bg-[#ece6fb] text-[#5b21b6]">{comprovantes.length}</span>
        </div>
        {comprovantes.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {comprovantes.map((cp) => {
              const cob = cobrancaPorId.get(cp.cobranca_id);
              return (
                <article key={cp.id} className="card flex flex-col gap-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/admin/inquilinos/${cp.inquilino_id}`} className="text-[15px] font-semibold hover:underline">
                        {nomePerfil.get(cp.inquilino_id) ?? "Inquilino"}
                      </Link>
                      <div className="text-[13px] capitalize text-stone-600">{cob ? mesAnoLongo(cob.competencia) : "—"}</div>
                    </div>
                    {urls[cp.arquivo_path] && (
                      <a href={urls[cp.arquivo_path]} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                        Abrir comprovante
                      </a>
                    )}
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                    <div><dt className="text-stone-600">Valor</dt><dd className="text-[15px] font-semibold">{cob ? brl(cob.valor) : "—"}</dd></div>
                    <div><dt className="text-stone-600">Vencimento</dt><dd className="text-[15px] font-semibold">{cob ? dataBR(cob.vencimento) : "—"}</dd></div>
                    <div><dt className="text-stone-600">Enviado</dt><dd className="text-[15px] font-semibold">{dataHoraBR(cp.enviado_em)}</dd></div>
                  </dl>
                  <form className="flex flex-col gap-2.5">
                    <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
                      <input name="observacao" placeholder="Observação ao inquilino (opcional)" className="input" aria-label="Observação" />
                      <input name="pago_em" type="date" defaultValue={hoje} className="input" aria-label="Data do pagamento" title="Data do pagamento" />
                    </div>
                    <div className="flex gap-2">
                      <button formAction={avaliarComprovante.bind(null, cp.id, true)} className="btn-success btn-sm">Aprovar</button>
                      <button formAction={avaliarComprovante.bind(null, cp.id, false)} className="btn-danger btn-sm">Rejeitar</button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        ) : (
          <Vazio>Nenhum comprovante pendente de análise.</Vazio>
        )}
      </section>

      <section className="card overflow-x-auto px-0 lg:overflow-visible">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-3">
            <h2 className="titulo-secao">Cobranças do mês</h2>
            <div className="flex items-center gap-1">
              <Link href={`/admin/pagamentos?mes=${anterior}`} className="btn-secondary btn-sm w-9 px-0" aria-label="Mês anterior">‹</Link>
              <span className="min-w-36 text-center font-bold capitalize">{mesAnoLongo(competencia)}</span>
              <Link href={`/admin/pagamentos?mes=${proximo}`} className="btn-secondary btn-sm w-9 px-0" aria-label="Próximo mês">›</Link>
            </div>
          </div>
          <div className="text-[13px] text-stone-600">{brl(recebido)} recebidos de {brl(previsto)}</div>
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
                      <div className="text-xs text-stone-600">{salasDe(c.inquilino_id).map((s) => s.nome).join(", ")}</div>
                    </td>
                    <td>{dataBR(c.vencimento)}</td>
                    <td className="text-right">{brl(c.valor)}</td>
                    <td className="text-right">{v.total !== v.base ? <span className="text-red-700">{brl(v.total)}</span> : "—"}</td>
                    <td><SituacaoBadge situacao={situacao(c, hoje)} dica={detalheSituacao(c, contratoDe(c), hoje)} /></td>
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
