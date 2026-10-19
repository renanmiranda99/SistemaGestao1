import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { detalheSituacao, situacao, valorAtualizado, type Situacao } from "@/lib/cobranca";
import { brl, dataBR, diffDias, hojeISO, mesAnoLongo, nomeMesCurto } from "@/lib/format";
import type { Cobranca } from "@/lib/types";
import { gerarCobrancasMes } from "./actions";
import { CelulaSituacao, LegendaSituacoes, PageHeader, Stat, Vazio } from "@/components/ui";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";

const LEGENDA: Situacao[] = ["paga", "paga_atraso", "em_analise", "a_vencer", "vence_hoje", "vencida", "em_cobranca"];
const FILTROS = [
  { v: "todos", r: "Todos" },
  { v: "atraso", r: "Em atraso" },
  { v: "emdia", r: "Em dia" },
];

function dataPorExtenso(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default async function AdminPainel({ searchParams }: { searchParams: { ano?: string; f?: string } }) {
  const { supabase } = await exigirPerfil("admin");
  const hoje = hojeISO();
  const ano = Number(searchParams.ano) || Number(hoje.slice(0, 4));
  const filtro = FILTROS.some((x) => x.v === searchParams.f) ? searchParams.f! : "todos";
  const em30dias = new Date(Date.parse(`${hoje}T12:00:00Z`) + 30 * 86_400_000).toISOString().slice(0, 10);

  const [
    { inquilinos, cobrancas, contratoDe, salasDe, salas, inquilinoDe },
    { data: comps },
    { data: chamadosAltos },
    { data: proximas },
  ] = await Promise.all([
    dadosAdmin(supabase, { de: `${ano}-01-01`, ate: `${ano}-12-01` }),
    supabase.from("comprovantes").select("id, inquilino_id, cobranca_id, enviado_em").eq("status", "em_analise").order("enviado_em"),
    supabase.from("chamados").select("id, titulo, inquilino_id, created_at").eq("prioridade", "alta").in("status", ["aberto", "em_andamento"]).order("created_at"),
    supabase.from("cobrancas").select("*").eq("status", "pendente").gte("vencimento", hoje).lte("vencimento", em30dias).order("vencimento").limit(5),
  ]);

  const mesAtual = hoje.slice(0, 7) + "-01";
  const doMes = cobrancas.filter((c) => c.competencia === mesAtual && c.status !== "cancelado");
  const recebidoMes = doMes.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
  const analiseMes = doMes.filter((c) => c.status === "em_analise").reduce((s, c) => s + Number(c.valor), 0);
  const previstoMes = doMes.reduce((s, c) => s + Number(c.valor), 0);
  const pct = (n: number) => (previstoMes ? Math.round((n / previstoMes) * 100) : 0);

  const emAberto = cobrancas.filter((c) => c.status === "pendente" && c.vencimento <= hoje);
  const totalAberto = emAberto.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
  const emCobranca = emAberto.filter((c) => situacao(c, hoje) === "em_cobranca");
  const inadimplentes = new Set(emCobranca.map((c) => c.inquilino_id));

  const comprovantes = comps ?? [];
  const cobrancaPorId = new Map(cobrancas.map((c) => [c.id, c]));
  const valorComprovantes = comprovantes.reduce((s, cp) => s + Number(cobrancaPorId.get(cp.cobranca_id)?.valor ?? 0), 0);

  // Itens que pedem ação: comprovantes, inquilinos em cobrança e chamados urgentes
  const porInquilinoEmCobranca = new Map<string, Cobranca[]>();
  emCobranca.forEach((c) => porInquilinoEmCobranca.set(c.inquilino_id, [...(porInquilinoEmCobranca.get(c.inquilino_id) ?? []), c]));
  const cobrancasAtencao = Array.from(porInquilinoEmCobranca.entries())
    .map(([id, lista]) => {
      const maisAntiga = [...lista].sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0]!;
      const total = lista.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
      return { id, lista, dias: diffDias(maisAntiga.vencimento, hoje), total };
    })
    .sort((a, b) => b.dias - a.dias);
  const qtdAtencao = comprovantes.length + cobrancasAtencao.length + (chamadosAltos?.length ?? 0);

  const nomeInq = (id: string) => inquilinoDe(id)?.nome || inquilinoDe(id)?.email || "Inquilino";
  const salasTxt = (id: string) => salasDe(id).map((s) => s.nome).join(", ");
  const ocupadas = salas.filter((s) => s.inquilino_id).length;

  // Grade: inquilino x mês
  const grade = new Map<string, Map<number, Cobranca[]>>();
  cobrancas.forEach((c) => {
    const m = Number(c.competencia.slice(5, 7)) - 1;
    const linha = grade.get(c.inquilino_id) ?? new Map();
    linha.set(m, [...(linha.get(m) ?? []), c]);
    grade.set(c.inquilino_id, linha);
  });
  const atrasado = (id: string) => emAberto.some((c) => c.inquilino_id === id);
  const todasLinhas = inquilinos.filter((i) => grade.has(i.id) || i.ativo);
  const linhas = todasLinhas.filter((i) => filtro === "todos" || (filtro === "atraso" ? atrasado(i.id) : !atrasado(i.id)));
  const contagem: Record<string, number> = {
    todos: todasLinhas.length,
    atraso: todasLinhas.filter((i) => atrasado(i.id)).length,
    emdia: todasLinhas.filter((i) => !atrasado(i.id)).length,
  };
  const abertoDe = (id: string) =>
    emAberto.filter((c) => c.inquilino_id === id).reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
  const qs = (p: { ano?: number; f?: string }) => `/admin?ano=${p.ano ?? ano}${(p.f ?? filtro) !== "todos" ? `&f=${p.f ?? filtro}` : ""}`;

  return (
    <>
      <PageHeader
        sobretitulo={dataPorExtenso(hoje)}
        titulo="Painel"
        acoes={
          <>
            <Link href="/admin/whatsapp" className="btn-secondary">Lembrar atrasados</Link>
            <form action={gerarCobrancasMes}>
              <input type="hidden" name="mes" value={hoje.slice(0, 7)} />
              <BotaoConfirmar
                className="btn-primary"
                mensagem="Gerar as cobranças deste mês para todos os contratos ativos? (as já existentes não são duplicadas)"
              >
                Gerar cobranças do mês
              </BotaoConfirmar>
            </form>
          </>
        }
      />

      <section aria-label="Indicadores do mês" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          rotulo={`Recebido em ${mesAnoLongo(mesAtual).split(" ")[0]}`}
          valor={brl(recebidoMes)}
          detalhe={`${analiseMes ? `+ ${brl(analiseMes)} em análise · ` : ""}de ${brl(previstoMes)} previstos`}
        >
          <div className="flex h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
            <div className="bg-brand-600" style={{ width: `${pct(recebidoMes)}%` }} />
            <div className="bg-[#b9a6f2]" style={{ width: `${pct(analiseMes)}%` }} />
          </div>
        </Stat>
        <Stat
          rotulo="Em aberto (vencidos)"
          valor={brl(totalAberto)}
          detalhe={`${emAberto.length} boleto(s) · ${inadimplentes.size} inquilino(s) em cobrança`}
          destaque={emAberto.length ? "alerta" : undefined}
          href="/admin/whatsapp"
        />
        <Stat
          rotulo="Comprovantes a analisar"
          valor={comprovantes.length}
          detalhe={comprovantes.length ? `${brl(valorComprovantes)} aguardando sua aprovação` : "Nada pendente"}
          destaque={comprovantes.length ? "info" : undefined}
          href="/admin/pagamentos"
        />
        <Stat
          rotulo="Chamados com prioridade alta"
          valor={chamadosAltos?.length ?? 0}
          detalhe="abertos ou em andamento"
          destaque={chamadosAltos?.length ? "aviso" : undefined}
          href="/admin/chamados"
        />
      </section>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <section className="card min-w-0 flex-[2_1_520px] p-0 py-2">
          <div className="flex items-center justify-between px-5 pb-2.5 pt-3.5">
            <h2 className="titulo-secao">Precisa da sua atenção</h2>
            <span className="text-[13px] text-stone-600">{qtdAtencao} item(ns)</span>
          </div>
          {qtdAtencao === 0 && <p className="border-t border-stone-100 px-5 py-6 text-sm text-stone-600">Tudo em dia por aqui.</p>}
          <ul>
            {comprovantes.map((cp) => {
              const cob = cobrancaPorId.get(cp.cobranca_id);
              return (
                <li key={cp.id} className="flex flex-wrap items-center gap-3.5 border-t border-stone-100 px-5 py-3.5">
                  <span aria-hidden="true" className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-[#e6defa] text-[13px] font-bold text-[#5b21b6]">?</span>
                  <div className="min-w-0 flex-[1_1_240px]">
                    <div className="text-sm font-semibold">
                      Comprovante{cob ? ` de ${mesAnoLongo(cob.competencia).split(" ")[0]}` : ""} · {nomeInq(cp.inquilino_id)}
                    </div>
                    <div className="text-[13px] text-stone-600">
                      {[salasTxt(cp.inquilino_id), cob && brl(cob.valor), `enviado em ${dataBR(cp.enviado_em)}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Link href="/admin/pagamentos" className="btn-secondary btn-sm">Analisar</Link>
                </li>
              );
            })}
            {cobrancasAtencao.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3.5 border-t border-stone-100 px-5 py-3.5">
                <span aria-hidden="true" className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-[#b42318] text-[13px] font-bold text-white">!</span>
                <div className="min-w-0 flex-[1_1_240px]">
                  <div className="text-sm font-semibold">Em cobrança há {x.dias} dias · {nomeInq(x.id)}</div>
                  <div className="text-[13px] text-stone-600">
                    {[salasTxt(x.id), `${x.lista.length} boleto(s)`, `${brl(x.total)} atualizado`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Link href={`/admin/inquilinos/${x.id}`} className="btn-whatsapp btn-sm">Cobrar</Link>
              </li>
            ))}
            {(chamadosAltos ?? []).map((ch) => (
              <li key={ch.id} className="flex flex-wrap items-center gap-3.5 border-t border-stone-100 px-5 py-3.5">
                <span aria-hidden="true" className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-[#f6d27a] text-[13px] font-bold text-[#4d3803]">!</span>
                <div className="min-w-0 flex-[1_1_240px]">
                  <div className="text-sm font-semibold">Chamado com prioridade alta · {ch.titulo}</div>
                  <div className="text-[13px] text-stone-600">{nomeInq(ch.inquilino_id)} · aberto em {dataBR(ch.created_at)}</div>
                </div>
                <Link href={`/admin/chamados/${ch.id}`} className="btn-secondary btn-sm">Abrir</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <h2 className="titulo-secao">Próximos vencimentos</h2>
          {proximas?.length ? (
            <ul className="flex flex-col gap-3.5">
              {(proximas as Cobranca[]).map((c) => {
                const ehHoje = c.vencimento === hoje;
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <div className={`w-12 shrink-0 rounded-[10px] py-1.5 text-center ${ehHoje ? "bg-[#fbefc9] text-[#4d3803]" : "bg-stone-100 text-stone-700"}`}>
                      <div className="text-[11px] font-semibold uppercase">{ehHoje ? "Hoje" : nomeMesCurto(Number(c.vencimento.slice(5, 7)) - 1)}</div>
                      <div className="text-[17px] font-bold">{c.vencimento.slice(8, 10)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{nomeInq(c.inquilino_id)}</div>
                      <div className="truncate text-[13px] text-stone-600">{salasTxt(c.inquilino_id) || "—"}</div>
                    </div>
                    <span className="text-sm font-semibold">{brl(c.valor)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">Nenhum vencimento nos próximos 30 dias.</p>
          )}
          <div className="flex flex-col gap-2 border-t border-stone-100 pt-3.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-stone-600">Ocupação da galeria</span>
              <b>{ocupadas} de {salas.length} salas</b>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
              <div className="h-full bg-brand-600" style={{ width: `${salas.length ? Math.round((ocupadas / salas.length) * 100) : 0}%` }} />
            </div>
          </div>
        </section>
      </div>

      <section className="card px-0 pb-4 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3.5 px-5 pb-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <h2 className="titulo-secao">Quem está pagando, mês a mês</h2>
            <div className="flex items-center gap-1">
              <Link href={qs({ ano: ano - 1 })} className="btn-secondary btn-sm w-9 px-0" aria-label="Ano anterior">‹</Link>
              <span className="w-[52px] text-center text-[15px] font-bold">{ano}</span>
              <Link href={qs({ ano: ano + 1 })} className="btn-secondary btn-sm w-9 px-0" aria-label="Próximo ano">›</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((x) => (
              <Link key={x.v} href={qs({ f: x.v })} className={`chip ${filtro === x.v ? "chip-ativo" : ""}`}>
                {x.r} <span className="opacity-70">{contagem[x.v]}</span>
              </Link>
            ))}
          </div>
        </div>
        {linhas.length ? (
          <div className="overflow-x-auto xl:overflow-visible">
            <div className="min-w-[940px]">
              <div className="grid grid-cols-[230px_repeat(12,minmax(0,1fr))_140px] items-center px-5 pb-2.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                <span>Inquilino</span>
                {Array.from({ length: 12 }, (_, m) => (
                  <span key={m} className="text-center">{nomeMesCurto(m)}</span>
                ))}
                <span className="text-right">Em aberto</span>
              </div>
              {linhas.map((i) => {
                const aberto = abertoDe(i.id);
                const dia = grade.get(i.id) ? contratoDe(Array.from(grade.get(i.id)!.values())[0]![0]!)?.dia_vencimento : undefined;
                return (
                  <div key={i.id} className="grid grid-cols-[230px_repeat(12,minmax(0,1fr))_140px] items-center border-t border-stone-100 px-5 py-2.5 hover:bg-stone-50/60">
                    <div className="min-w-0">
                      <Link href={`/admin/inquilinos/${i.id}`} className="block truncate text-sm font-semibold text-stone-900 hover:underline">
                        {i.nome || i.email}
                      </Link>
                      <div className="truncate text-xs text-stone-600">
                        {[salasTxt(i.id), dia && `vence dia ${dia}`].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    {Array.from({ length: 12 }, (_, m) => {
                      const lista = grade.get(i.id)?.get(m) ?? [];
                      if (!lista.length) return <span key={m} className="text-center text-stone-400" aria-hidden="true">·</span>;
                      return (
                        <span key={m} className="flex flex-wrap justify-center gap-0.5">
                          {lista.map((c) => (
                            <CelulaSituacao
                              key={c.id}
                              situacao={situacao(c, hoje)}
                              dica={`${mesAnoLongo(c.competencia)} · ${detalheSituacao(c, contratoDe(c), hoje)}`}
                            />
                          ))}
                        </span>
                      );
                    })}
                    <span className={`text-right text-sm font-semibold ${aberto ? "text-[#b42318]" : "text-[#2f7d55]"}`}>
                      {aberto ? brl(aberto) : "Em dia"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5"><Vazio>Nenhum inquilino neste filtro.</Vazio></div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-stone-100 px-5 pt-4">
          <LegendaSituacoes itens={LEGENDA} />
          <span className="ml-auto text-[13px] text-stone-600">Passe o mouse sobre um mês para ver a data do pagamento</span>
        </div>
      </section>
    </>
  );
}
