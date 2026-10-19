import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dadosFinanceirosInquilino } from "@/lib/dados";
import { COR_CELULA, detalheSituacao, ehPendente, situacao, valorAtualizado, type Situacao } from "@/lib/cobranca";
import { brl, dataBR, diffDias, hojeISO, mesAnoLongo, nomeMesCurto } from "@/lib/format";
import type { Aviso, Chamado } from "@/lib/types";
import { Dica, LegendaSituacoes, PageHeader, Stat, StatusBadge, Vazio } from "@/components/ui";

const LEGENDA: Situacao[] = ["paga", "paga_atraso", "em_analise", "vencida", "em_cobranca", "a_vencer"];

export default async function InquilinoInicio() {
  const { supabase, perfil } = await exigirPerfil("inquilino");
  const [{ contratos, cobrancas, multas, contratoDe }, { data: av }, { data: ch }] = await Promise.all([
    dadosFinanceirosInquilino(supabase, perfil.id),
    supabase.from("avisos").select("*").order("created_at", { ascending: false }).limit(3),
    supabase.from("chamados").select("*").eq("inquilino_id", perfil.id).in("status", ["aberto", "em_andamento"]).order("created_at", { ascending: false }).limit(3),
  ]);
  const avisos = (av ?? []) as Aviso[];
  const chamados = (ch ?? []) as Chamado[];
  const hoje = hojeISO();
  const ano = hoje.slice(0, 4);

  const contratoAtivo = contratos.find((c) => c.ativo);
  const pendentes = cobrancas.filter((c) => ehPendente(c, hoje)).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const totalPendente = pendentes.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
  const maisAntiga = pendentes[0];
  const multasPendentes = multas.filter((m) => m.status === "pendente");
  const totalMultas = multasPendentes.reduce((s, m) => s + Number(m.valor), 0);
  const proxima = [...cobrancas]
    .filter((c) => c.status === "pendente" && diffDias(hoje, c.vencimento) > 0)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
  const porMes = new Map(
    cobrancas.filter((c) => c.competencia.startsWith(ano) && c.status !== "cancelado").map((c) => [Number(c.competencia.slice(5, 7)) - 1, c])
  );
  const primeiroNome = perfil.nome.split(" ")[0] || "inquilino";
  const dataHoje = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader sobretitulo={dataHoje} titulo={`Olá, ${primeiroNome}`} />

      {maisAntiga && (
        <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#f5d3b0] bg-[#fdf1e4] px-6 py-5">
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#ef9b52] text-[#3d1c04]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div className="min-w-0 flex-[1_1_320px] text-[#4a2306]">
            <div className="text-[17px] font-bold">
              {pendentes.length === 1
                ? `Boleto de ${mesAnoLongo(maisAntiga.competencia).split(" ")[0]} vencido · ${brl(totalPendente)}`
                : `${pendentes.length} boletos vencidos · ${brl(totalPendente)}`}
            </div>
            <div className="text-sm">
              {situacao(maisAntiga, hoje) === "em_cobranca"
                ? "Já está em cobrança. Regularize e envie o comprovante."
                : "Pague e envie o comprovante para evitar a cobrança pelo WhatsApp."}
            </div>
          </div>
          <Link href="/inquilino/pagamentos" className="btn-primary">Pagar agora</Link>
        </section>
      )}

      <section aria-label="Resumo" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat rotulo="Dia de vencimento" valor={contratoAtivo ? `todo dia ${contratoAtivo.dia_vencimento}` : "—"} detalhe={contratoAtivo ? undefined : "Sem contrato ativo"} />
        <Stat
          rotulo="Próximo vencimento"
          valor={proxima ? dataBR(proxima.vencimento) : "—"}
          detalhe={proxima ? `${brl(proxima.valor)} · ${mesAnoLongo(proxima.competencia)}` : "Nada a vencer"}
        />
        <Stat
          rotulo="Pendências"
          valor={pendentes.length ? `${pendentes.length} · ${brl(totalPendente)}` : "Nenhuma"}
          destaque={pendentes.length ? "alerta" : "ok"}
          href="/inquilino/pagamentos"
        />
        <Stat
          rotulo="Multas em aberto"
          valor={brl(totalMultas)}
          detalhe={`${multasPendentes.length} multa(s)`}
          destaque={multasPendentes.length ? "aviso" : undefined}
          href="/inquilino/multas"
        />
      </section>

      <section className="card mb-6 flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="titulo-secao">Pagamentos de {ano}</h2>
          <Link href="/inquilino/pagamentos" className="link text-sm">Ver todos e enviar comprovante</Link>
        </div>
        {porMes.size ? (
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {Array.from({ length: 12 }, (_, m) => {
              const c = porMes.get(m);
              if (!c) {
                return (
                  <span key={m} className="flex flex-col items-center gap-1.5">
                    <span className="h-11 w-full rounded-lg bg-stone-100" aria-hidden="true" />
                    <span className="text-xs text-stone-500">{nomeMesCurto(m)}</span>
                  </span>
                );
              }
              const s = situacao(c, hoje);
              return (
                <Dica key={m} texto={`${mesAnoLongo(c.competencia)} · ${detalheSituacao(c, contratoDe(c), hoje)}`} className="flex w-full flex-col items-center gap-1.5 rounded-lg">
                  <span className={`block h-11 w-full rounded-lg ${COR_CELULA[s]}`} />
                  <span className="text-xs text-stone-600">{nomeMesCurto(m)}</span>
                </Dica>
              );
            })}
          </div>
        ) : (
          <Vazio>Nenhuma cobrança lançada ainda.</Vazio>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <LegendaSituacoes itens={LEGENDA} />
          <span className="ml-auto text-[13px] text-stone-600">Passe o mouse sobre um mês para ver a data do pagamento</span>
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section className="card min-w-0 flex-[3_1_420px] px-0 py-2">
          <div className="flex items-center justify-between px-6 py-3.5">
            <h2 className="titulo-secao">Avisos da galeria</h2>
            <Link href="/inquilino/galeria" className="link text-sm">Ver todos</Link>
          </div>
          {avisos.length ? (
            avisos.map((a) => (
              <article key={a.id} className="flex flex-col gap-1 border-t border-stone-100 px-6 py-3.5">
                <b className="text-sm">{a.titulo}</b>
                <p className="line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-stone-600">{a.conteudo}</p>
              </article>
            ))
          ) : (
            <p className="border-t border-stone-100 px-6 py-4 text-sm text-stone-600">Nenhum aviso no momento.</p>
          )}
        </section>
        <section className="card flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
          <h2 className="titulo-secao">Seus chamados</h2>
          {chamados.map((c) => (
            <Link key={c.id} href={`/inquilino/chamados/${c.id}`} className="flex flex-col gap-1.5 rounded-xl bg-stone-50 p-3.5 hover:bg-stone-100">
              <span className="flex justify-between gap-2">
                <b className="text-sm">{c.titulo}</b>
                <StatusBadge status={c.status} />
              </span>
              <span className="text-[13px] text-stone-600">Aberto em {dataBR(c.created_at)}</span>
            </Link>
          ))}
          {!chamados.length && <p className="text-sm text-stone-600">Nenhum chamado em aberto.</p>}
          <Link href="/inquilino/chamados" className="btn-secondary">Abrir novo chamado</Link>
        </section>
      </div>
    </>
  );
}
