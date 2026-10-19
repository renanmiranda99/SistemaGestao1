import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { dadosFinanceirosInquilino } from "@/lib/dados";
import { DIAS_TOLERANCIA, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, dataHoraBR, hojeISO, mesAnoLongo } from "@/lib/format";
import type { Comprovante } from "@/lib/types";
import { Alerta, PageHeader, SituacaoBadge, StatusBadge, Vazio } from "@/components/ui";
import { EnviarComprovante } from "./EnviarComprovante";

export default async function PagamentosInquilino() {
  const { supabase, perfil } = await exigirPerfil("inquilino");
  const { cobrancas, contratoDe } = await dadosFinanceirosInquilino(supabase, perfil.id);
  const { data: comps } = await supabase
    .from("comprovantes")
    .select("*")
    .eq("inquilino_id", perfil.id)
    .order("enviado_em", { ascending: false });
  const comprovantes = (comps ?? []) as Comprovante[];
  const urls = await urlsAssinadas(supabase, "comprovantes", comprovantes.map((c) => c.arquivo_path));
  const hoje = hojeISO();

  const porAno = new Map<string, typeof cobrancas>();
  cobrancas.forEach((c) => {
    const ano = c.competencia.slice(0, 4);
    porAno.set(ano, [...(porAno.get(ano) ?? []), c]);
  });

  return (
    <>
      <PageHeader
        titulo="Pagamentos"
        descricao="Acompanhe seus boletos mês a mês e envie os comprovantes de pagamento."
      />
      <div className="mb-6">
        <Alerta tipo="info">
          Após o vencimento incidem multa e juros conforme o contrato. A partir do {DIAS_TOLERANCIA}º dia de atraso o
          boleto entra em cobrança e você receberá avisos pelo WhatsApp.
        </Alerta>
      </div>

      {!cobrancas.length && <Vazio>Nenhuma cobrança lançada ainda.</Vazio>}

      {Array.from(porAno.entries()).map(([ano, lista]) => (
        <section key={ano} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{ano}</h2>
          <div className="space-y-3">
            {lista.map((c) => {
              const sit = situacao(c, hoje);
              const v = valorAtualizado(c, contratoDe(c), hoje);
              const meus = comprovantes.filter((x) => x.cobranca_id === c.id);
              const podeEnviar = c.status === "pendente" || meus.some((m) => m.status === "rejeitado");
              return (
                <div key={c.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold capitalize text-slate-900">{mesAnoLongo(c.competencia)}</h3>
                        <SituacaoBadge situacao={sit} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Vencimento {dataBR(c.vencimento)} · {brl(c.valor)}
                        {v.total !== v.base && (
                          <span className="text-red-700">
                            {" "}· atualizado {brl(v.total)} (multa {brl(v.multa)} + juros {brl(v.juros)})
                          </span>
                        )}
                        {c.pago_em && <> · pago em {dataBR(c.pago_em)}</>}
                      </p>
                      {c.linha_digitavel && (
                        <p className="mt-2 break-all font-mono text-xs text-slate-600">{c.linha_digitavel}</p>
                      )}
                      {c.observacao && <p className="mt-2 text-sm text-slate-600">{c.observacao}</p>}
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      {c.boleto_url && (
                        <a href={c.boleto_url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                          Ver boleto
                        </a>
                      )}
                      {podeEnviar && <EnviarComprovante cobrancaId={c.id} inquilinoId={perfil.id} />}
                    </div>
                  </div>
                  {meus.length > 0 && (
                    <ul className="mt-4 space-y-2 border-t border-stone-100 pt-3 text-sm">
                      {meus.map((m) => (
                        <li key={m.id} className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={m.status} />
                          <span className="text-slate-500">Enviado em {dataHoraBR(m.enviado_em)}</span>
                          {urls[m.arquivo_path] && (
                            <a href={urls[m.arquivo_path]} target="_blank" rel="noreferrer" className="link">
                              abrir
                            </a>
                          )}
                          {m.observacao_admin && (
                            <span className="text-slate-600">— {m.observacao_admin}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
