import Link from "next/link";
import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { ROTULO_SITUACAO, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, hojeISO, mesAnoLongo } from "@/lib/format";
import type { AcordoJudicial } from "@/lib/types";
import { excluirAcordo } from "./actions";
import { Alerta, PageHeader, Stat, Vazio } from "@/components/ui";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { NovoAcordo, UploadAcordo, type CobrancaAberta } from "@/components/Acordos";

export default async function AcordosAdmin() {
  const { supabase } = await exigirPerfil("admin");
  const hoje = hojeISO();
  const [{ inquilinos, cobrancas, contratoDe, salasDe }, { data: a, error }] = await Promise.all([
    dadosAdmin(supabase),
    supabase.from("acordos_judiciais").select("*").order("data_acordo", { ascending: false }),
  ]);
  const semTabela = error?.code === "PGRST205" || error?.code === "42P01";
  const acordos = (a ?? []) as AcordoJudicial[];
  const urls = await urlsAssinadas(supabase, "contratos", acordos.map((x) => x.arquivo_path));
  const nome = (id: string) => {
    const i = inquilinos.find((x) => x.id === id);
    return i?.nome || i?.email || "Inquilino";
  };

  // Mensalidades que um acordo pode quitar: em aberto ou com comprovante em análise
  const abertasPorInquilino: Record<string, CobrancaAberta[]> = {};
  for (const c of cobrancas) {
    if (c.status !== "pendente" && c.status !== "em_analise") continue;
    (abertasPorInquilino[c.inquilino_id] ??= []).push({
      id: c.id,
      mes: mesAnoLongo(c.competencia),
      vencimento: dataBR(c.vencimento),
      valor: Number(c.valor),
      atualizado: valorAtualizado(c, contratoDe(c), hoje).total,
      situacao: ROTULO_SITUACAO[situacao(c, hoje)],
    });
  }
  const opcoesInquilinos = inquilinos.map((i) => ({ id: i.id, nome: i.nome || i.email }));
  const quitadasPor = (acordoId: string) => cobrancas.filter((c) => c.acordo_id === acordoId);
  const totalAcordado = acordos.reduce((s, x) => s + Number(x.valor_acordado), 0);
  const totalQuitado = cobrancas.filter((c) => c.acordo_id).reduce((s, c) => s + Number(c.valor), 0);

  return (
    <>
      <PageHeader
        titulo="Acordos judiciais"
        descricao="Acordos feitos na justiça. As mensalidades quitadas por um acordo contam como pagas na planilha principal."
        acoes={<Link href="/admin/contratos" className="btn-secondary">Contratos</Link>}
      />

      {semTabela && (
        <div className="mb-6">
          <Alerta tipo="aviso">
            A tabela de acordos ainda não existe no banco. Rode <code>supabase/migracao_acordos.sql</code> no SQL Editor do Supabase.
          </Alerta>
        </div>
      )}

      <section aria-label="Resumo" className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat rotulo="Acordos registrados" valor={acordos.length} />
        <Stat rotulo="Valor total acordado" valor={brl(totalAcordado)} />
        <Stat rotulo="Mensalidades quitadas (valor original)" valor={brl(totalQuitado)} />
      </section>

      <details className="card mb-6" open={acordos.length === 0 && !semTabela}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="titulo-secao">Novo acordo</span>
          <span className="btn-primary btn-sm">+ Registrar acordo</span>
        </summary>
        <div className="mt-5 border-t border-stone-100 pt-5">
          <NovoAcordo inquilinos={opcoesInquilinos} abertasPorInquilino={abertasPorInquilino} hoje={hoje} />
        </div>
      </details>

      {acordos.length ? (
        <div className="flex flex-col gap-4">
          {acordos.map((ac) => {
            const quitadas = quitadasPor(ac.id);
            const original = quitadas.reduce((s, c) => s + Number(c.valor), 0);
            const salas = salasDe(ac.inquilino_id).map((x) => x.nome).join(", ");
            return (
              <article key={ac.id} className="card flex flex-col gap-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/inquilinos/${ac.inquilino_id}`} className="text-lg font-semibold hover:underline">
                      {nome(ac.inquilino_id)}
                    </Link>
                    <p className="text-[13px] text-stone-600">
                      {[salas, `acordo de ${dataBR(ac.data_acordo)}`, ac.numero_processo && `processo ${ac.numero_processo}`, ac.orgao].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{brl(ac.valor_acordado)}</div>
                    <div className="text-xs text-stone-600">valor acordado</div>
                  </div>
                </header>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-xl bg-stone-50 p-4">
                    <h3 className="mb-2 text-sm font-semibold">Mensalidades quitadas ({quitadas.length})</h3>
                    {quitadas.length ? (
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {quitadas.map((c) => (
                          <li key={c.id} className="flex justify-between gap-3">
                            <span className="capitalize">{mesAnoLongo(c.competencia)}</span>
                            <span className="tabular-nums">{brl(c.valor)}</span>
                          </li>
                        ))}
                        <li className="mt-1 flex justify-between gap-3 border-t border-stone-200 pt-1.5 font-semibold">
                          <span>Total original</span>
                          <span className="tabular-nums">{brl(original)}</span>
                        </li>
                      </ul>
                    ) : (
                      <p className="text-sm text-stone-600">Nenhuma mensalidade vinculada.</p>
                    )}
                  </section>
                  <section className="flex flex-col gap-2 text-sm">
                    {ac.condicoes && (
                      <div>
                        <h3 className="text-sm font-semibold">Condições</h3>
                        <p className="whitespace-pre-line text-stone-700">{ac.condicoes}</p>
                      </div>
                    )}
                    {ac.observacoes && (
                      <div>
                        <h3 className="text-sm font-semibold">Observações</h3>
                        <p className="whitespace-pre-line text-stone-700">{ac.observacoes}</p>
                      </div>
                    )}
                    {!ac.condicoes && !ac.observacoes && <p className="text-stone-600">Sem condições ou observações registradas.</p>}
                  </section>
                </div>

                <footer className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                  {ac.arquivo_path && urls[ac.arquivo_path] && (
                    <a href={urls[ac.arquivo_path]} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Ver documento</a>
                  )}
                  <UploadAcordo acordoId={ac.id} inquilinoId={ac.inquilino_id} temArquivo={Boolean(ac.arquivo_path)} />
                  <form action={excluirAcordo.bind(null, ac.id)} className="ml-auto">
                    <BotaoConfirmar
                      mensagem={`Excluir este acordo? As ${quitadas.length} mensalidade(s) quitadas por ele voltam a ficar em aberto.`}
                      className="btn-danger btn-sm"
                    >
                      Excluir acordo
                    </BotaoConfirmar>
                  </form>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        !semTabela && <Vazio>Nenhum acordo registrado.</Vazio>
      )}
    </>
  );
}
