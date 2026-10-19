import Link from "next/link";
import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { dadosFinanceirosInquilino } from "@/lib/dados";
import { DIAS_TOLERANCIA, detalheSituacao, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, dataHoraBR, diffDias, hojeISO, mesAnoLongo, nomeMesCurto } from "@/lib/format";
import type { Cobranca, Comprovante } from "@/lib/types";
import { Alerta, CelulaSituacao, PageHeader, SituacaoBadge, StatusBadge, Vazio } from "@/components/ui";
import { CopiarTexto } from "@/components/CopiarTexto";
import { EnviarComprovante } from "./EnviarComprovante";

export default async function PagamentosInquilino() {
  const { supabase, perfil } = await exigirPerfil("inquilino");
  const [{ cobrancas, contratos, contratoDe, salas }, { data: comps }] = await Promise.all([
    dadosFinanceirosInquilino(supabase, perfil.id),
    supabase.from("comprovantes").select("*").eq("inquilino_id", perfil.id).order("enviado_em", { ascending: false }),
  ]);
  const comprovantes = (comps ?? []) as Comprovante[];
  const urls = await urlsAssinadas(supabase, "comprovantes", comprovantes.map((c) => c.arquivo_path));
  const hoje = hojeISO();
  const ano = hoje.slice(0, 4);
  const contrato = contratos.find((c) => c.ativo);

  const comprovantesDe = (c: Cobranca) => comprovantes.filter((x) => x.cobranca_id === c.id);
  const podeEnviar = (c: Cobranca) => c.status === "pendente" || comprovantesDe(c).some((m) => m.status === "rejeitado");

  // Boleto em destaque: o vencido mais antigo; se não houver, o próximo a vencer
  const pendentes = cobrancas.filter((c) => c.status === "pendente").sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const destaque = pendentes.find((c) => c.vencimento <= hoje) ?? pendentes[0];
  const outrosVencidos = pendentes.filter((c) => c.vencimento <= hoje && c.id !== destaque?.id).length;

  const doAno = cobrancas.filter((c) => c.competencia.startsWith(ano) && c.status !== "cancelado");
  const porMes = new Map(doAno.map((c) => [Number(c.competencia.slice(5, 7)) - 1, c]));
  const pagasAno = doAno.filter((c) => c.status === "pago");
  const pagasComAtraso = pagasAno.filter((c) => situacao(c, hoje) === "paga_atraso").length;
  const vencidasAno = doAno.filter((c) => c.vencimento <= hoje);

  const porAno = new Map<string, Cobranca[]>();
  cobrancas.forEach((c) => porAno.set(c.competencia.slice(0, 4), [...(porAno.get(c.competencia.slice(0, 4)) ?? []), c]));

  return (
    <>
      <PageHeader titulo="Pagamentos" descricao="Seus boletos mês a mês. Pague, envie o comprovante e acompanhe a aprovação." />

      {!cobrancas.length && <Vazio>Nenhuma cobrança lançada ainda.</Vazio>}

      {cobrancas.length > 0 && (
        <div className="mb-6 flex flex-wrap items-stretch gap-4">
          {destaque ? (
            <BoletoEmDestaque
              c={destaque}
              hoje={hoje}
              contrato={contratoDe(destaque)}
              outrosVencidos={outrosVencidos}
              enviar={podeEnviar(destaque) ? <EnviarComprovante cobrancaId={destaque.id} inquilinoId={perfil.id} /> : null}
              comprovantes={comprovantesDe(destaque)}
            />
          ) : (
            <section className="card flex min-w-0 flex-[2_1_520px] flex-col justify-center gap-2 p-7">
              <h2 className="text-lg font-semibold">Tudo pago por enquanto</h2>
              <p className="text-sm text-stone-600">Quando o próximo boleto for lançado, ele aparece aqui.</p>
            </section>
          )}

          <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
            {contrato && (
              <section className="card flex flex-col gap-3.5">
                <h2 className="text-base font-semibold">Seu contrato</h2>
                <dl className="flex flex-col gap-2.5 text-sm">
                  {salas.length > 0 && <Linha r="Sala" v={salas.map((s) => s.nome).join(", ")} />}
                  <Linha r="Aluguel" v={brl(contrato.valor_mensal)} />
                  <Linha r="Vencimento" v={`todo dia ${contrato.dia_vencimento}`} />
                  <Linha r="Multa / juros" v={`${Number(contrato.multa_percentual)}% + ${Number(contrato.juros_mensal_percentual)}% a.m.`} />
                </dl>
                <Link href="/inquilino/contratos" className="link text-sm">Ver contrato e aditivos</Link>
              </section>
            )}
            <section className="card flex flex-col gap-3">
              <h2 className="text-base font-semibold">{ano} até agora</h2>
              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }, (_, m) => {
                  const c = porMes.get(m);
                  return c ? (
                    <CelulaSituacao key={m} tamanho="sm" situacao={situacao(c, hoje)} dica={`${mesAnoLongo(c.competencia)} · ${detalheSituacao(c, contratoDe(c), hoje)}`} />
                  ) : (
                    <span key={m} className="grid h-[22px] place-items-center text-[10px] text-stone-400" title={nomeMesCurto(m)}>·</span>
                  );
                })}
              </div>
              <span className="text-[13px] text-stone-600">
                {pagasAno.length} de {vencidasAno.length} pagos{pagasComAtraso ? ` (${pagasComAtraso} com atraso)` : ""} · passe o mouse para ver as datas
              </span>
            </section>
          </aside>
        </div>
      )}

      {Array.from(porAno.entries()).map(([a, lista]) => (
        <section key={a} className="card mb-6 px-0 py-2">
          <h2 className="px-6 pb-3 pt-4 titulo-secao">Histórico de {a}</h2>
          <ul>
            {lista.map((c) => {
              const sit = situacao(c, hoje);
              const v = valorAtualizado(c, contratoDe(c), hoje);
              const meus = comprovantesDe(c);
              const pago = c.pago_em?.slice(0, 10);
              const detalhe = pago
                ? `Pago em ${dataBR(pago)}${sit === "paga_atraso" ? `, ${diffDias(c.vencimento, pago)} dia(s) após o vencimento` : ""}`
                : `${c.vencimento < hoje ? "Venceu" : "Vence"} em ${dataBR(c.vencimento)}${v.total !== v.base ? ` · multa ${brl(v.multa)} + juros ${brl(v.juros)}` : ""}`;
              return (
                <li key={c.id} className="border-t border-stone-100 px-6 py-3.5 hover:bg-stone-50/60">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-[1_1_220px]">
                      <div className="text-[15px] font-semibold capitalize">{mesAnoLongo(c.competencia)}</div>
                      <div className="text-[13px] text-stone-600">{detalhe}</div>
                    </div>
                    <span className="w-28 text-right text-[15px] font-semibold tabular-nums">{brl(v.total)}</span>
                    <span className="flex w-52 justify-end">
                      <SituacaoBadge situacao={sit} dica={detalheSituacao(c, contratoDe(c), hoje)} />
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {c.boleto_url && c.status !== "pago" && (
                        <a href={c.boleto_url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Ver boleto</a>
                      )}
                      {podeEnviar(c) && c.id !== destaque?.id && <EnviarComprovante cobrancaId={c.id} inquilinoId={perfil.id} />}
                    </div>
                  </div>
                  {c.observacao && <p className="mt-2 text-sm text-stone-700">{c.observacao}</p>}
                  {meus.length > 0 && <ListaComprovantes itens={meus} urls={urls} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="text-[13px] text-stone-600">
        Após o vencimento incidem multa e juros conforme o contrato. A partir do {DIAS_TOLERANCIA}º dia de atraso o boleto
        entra em cobrança e você recebe avisos pelo WhatsApp.
      </p>
    </>
  );
}

function Linha({ r, v }: { r: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-600">{r}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

function ListaComprovantes({ itens, urls }: { itens: Comprovante[]; urls: Record<string, string> }) {
  return (
    <ul className="mt-3 flex flex-col gap-1.5 text-sm">
      {itens.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center gap-2">
          <StatusBadge status={m.status} />
          <span className="text-stone-600">Comprovante enviado em {dataHoraBR(m.enviado_em)}</span>
          {urls[m.arquivo_path] && (
            <a href={urls[m.arquivo_path]} target="_blank" rel="noreferrer" className="link">abrir</a>
          )}
          {m.observacao_admin && <span className="text-stone-700">· {m.observacao_admin}</span>}
        </li>
      ))}
    </ul>
  );
}

function BoletoEmDestaque({
  c,
  hoje,
  contrato,
  outrosVencidos,
  enviar,
  comprovantes,
}: {
  c: Cobranca;
  hoje: string;
  contrato: Parameters<typeof valorAtualizado>[1];
  outrosVencidos: number;
  enviar: React.ReactNode;
  comprovantes: Comprovante[];
}) {
  const sit = situacao(c, hoje);
  const v = valorAtualizado(c, contrato, hoje);
  const dias = diffDias(c.vencimento, hoje);
  const selo =
    sit === "vencida" || sit === "em_cobranca" ? `Vencido há ${dias} dia(s)` : sit === "vence_hoje" ? "Vence hoje" : `Vence em ${-dias} dia(s)`;
  const corSelo =
    sit === "em_cobranca" ? "bg-[#fbdad7] text-[#8a1c12]" : sit === "vencida" ? "bg-[#fce3cc] text-[#7a3306]" : sit === "vence_hoje" ? "bg-[#fbefc9] text-[#5c4204]" : "bg-stone-100 text-stone-700";
  const diaCobranca = new Date(Date.parse(`${c.vencimento}T12:00:00Z`) + DIAS_TOLERANCIA * 86_400_000).toISOString().slice(0, 10);
  const emAnalise = comprovantes.some((m) => m.status === "em_analise");

  return (
    <section className="card flex min-w-0 flex-[2_1_520px] flex-col gap-5 p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-semibold">Boleto de {mesAnoLongo(c.competencia).split(" ")[0]}</h2>
          <span className={`badge ${corSelo}`}>{selo}</span>
        </div>
        <span className="text-[13px] text-stone-600">
          {c.vencimento < hoje ? "Venceu" : "Vence"} em {dataBR(c.vencimento)}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-7">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-stone-600">{v.total !== v.base ? "Valor a pagar hoje" : "Valor"}</span>
          <span className="text-[40px] font-bold leading-none tracking-tight md:text-[44px]">{brl(v.total)}</span>
        </div>
        {v.total !== v.base && (
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-[13px]">
            <dt className="text-stone-600">Aluguel</dt><dd className="text-right">{brl(v.base)}</dd>
            <dt className="text-stone-600">Multa</dt><dd className="text-right">{brl(v.multa)}</dd>
            <dt className="text-stone-600">Juros ({v.dias} dias)</dt><dd className="text-right">{brl(v.juros)}</dd>
          </dl>
        )}
      </div>

      {sit === "vencida" && (
        <Alerta tipo="aviso">
          <strong>Em {dataBR(diaCobranca)} este boleto entra em cobrança.</strong> Pague e envie o comprovante para evitar os avisos pelo WhatsApp.
        </Alerta>
      )}
      {sit === "em_cobranca" && (
        <Alerta tipo="erro">
          <strong>Este boleto está em cobrança.</strong> Regularize o pagamento e envie o comprovante.
        </Alerta>
      )}
      {outrosVencidos > 0 && (
        <Alerta tipo="erro">Você tem mais {outrosVencidos} boleto(s) vencido(s). Veja no histórico abaixo.</Alerta>
      )}
      {emAnalise && <Alerta tipo="info">Seu comprovante foi enviado e está em análise pela administração.</Alerta>}

      {c.linha_digitavel && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-stone-600">Linha digitável / PIX</span>
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3">
            <code className="min-w-0 flex-[1_1_320px] break-all font-mono text-sm">{c.linha_digitavel}</code>
            <CopiarTexto texto={c.linha_digitavel} />
          </div>
        </div>
      )}
      {c.observacao && <p className="text-sm text-stone-700">{c.observacao}</p>}

      <div className="flex flex-wrap gap-2.5">
        {enviar}
        {c.boleto_url && (
          <a href={c.boleto_url} target="_blank" rel="noreferrer" className="btn-secondary">Ver boleto</a>
        )}
      </div>
    </section>
  );
}
