import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { COR_SITUACAO, ROTULO_SITUACAO, situacao, valorAtualizado, type Situacao } from "@/lib/cobranca";
import { brl, hojeISO, nomeMesCurto } from "@/lib/format";
import { PageHeader, Stat, Vazio } from "@/components/ui";

const LEGENDA: Situacao[] = ["paga", "em_analise", "a_vencer", "vence_hoje", "vencida", "em_cobranca"];

export default async function AdminPainel({ searchParams }: { searchParams: { ano?: string } }) {
  const { supabase } = await exigirPerfil("admin");
  const hoje = hojeISO();
  const ano = Number(searchParams.ano) || Number(hoje.slice(0, 4));
  const { inquilinos, cobrancas, contratoDe, salasDe } = await dadosAdmin(supabase, {
    de: `${ano}-01-01`,
    ate: `${ano}-12-01`,
  });
  const [{ count: compsAnalise }, { count: chamadosAbertos }] = await Promise.all([
    supabase.from("comprovantes").select("id", { count: "exact", head: true }).eq("status", "em_analise"),
    supabase.from("chamados").select("id", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]),
  ]);

  const mesAtual = hoje.slice(0, 7) + "-01";
  const doMes = cobrancas.filter((c) => c.competencia === mesAtual && c.status !== "cancelado");
  const recebidoMes = doMes.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
  const previstoMes = doMes.reduce((s, c) => s + Number(c.valor), 0);
  const emAberto = cobrancas.filter((c) => c.status === "pendente" && c.vencimento <= hoje);
  const totalAberto = emAberto.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
  const emCobranca = emAberto.filter((c) => situacao(c, hoje) === "em_cobranca");
  const inadimplentes = new Set(emCobranca.map((c) => c.inquilino_id));

  // Grade: inquilino x mês
  const grade = new Map<string, Map<number, typeof cobrancas>>();
  cobrancas.forEach((c) => {
    const m = Number(c.competencia.slice(5, 7)) - 1;
    const linha = grade.get(c.inquilino_id) ?? new Map();
    linha.set(m, [...(linha.get(m) ?? []), c]);
    grade.set(c.inquilino_id, linha);
  });
  const linhas = inquilinos.filter((i) => grade.has(i.id) || i.ativo);

  return (
    <>
      <PageHeader titulo="Painel" descricao="Visão geral dos pagamentos da galeria." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Recebido no mês" valor={brl(recebidoMes)} detalhe={`de ${brl(previstoMes)} previstos`} destaque="ok" />
        <Stat
          rotulo="Em aberto (vencidos)"
          valor={brl(totalAberto)}
          detalhe={`${emAberto.length} boleto(s) · ${inadimplentes.size} inquilino(s) em cobrança`}
          destaque={emAberto.length ? "alerta" : undefined}
          href="/admin/whatsapp"
        />
        <Stat
          rotulo="Comprovantes a analisar"
          valor={compsAnalise ?? 0}
          destaque={compsAnalise ? "info" : undefined}
          href="/admin/pagamentos"
        />
        <Stat rotulo="Chamados abertos" valor={chamadosAbertos ?? 0} href="/admin/chamados" />
      </div>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Quem está pagando — mês a mês</h2>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/admin?ano=${ano - 1}`} className="btn-secondary btn-sm">←</Link>
            <span className="w-12 text-center font-semibold">{ano}</span>
            <Link href={`/admin?ano=${ano + 1}`} className="btn-secondary btn-sm">→</Link>
          </div>
        </div>
        {linhas.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2 text-left font-semibold">Inquilino</th>
                  {Array.from({ length: 12 }, (_, m) => (
                    <th key={m} className="px-1 py-2 text-center font-semibold">{nomeMesCurto(m)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((i) => (
                  <tr key={i.id} className="border-t border-stone-100">
                    <td className="px-2 py-2">
                      <Link href={`/admin/inquilinos/${i.id}`} className="font-medium text-slate-800 hover:underline">
                        {i.nome || i.email}
                      </Link>
                      <div className="text-xs text-slate-400">{salasDe(i.id).map((s) => s.nome).join(", ")}</div>
                    </td>
                    {Array.from({ length: 12 }, (_, m) => {
                      const lista = grade.get(i.id)?.get(m) ?? [];
                      if (!lista.length) return <td key={m} className="px-1 py-2 text-center text-slate-200">·</td>;
                      return (
                        <td key={m} className="px-1 py-2 text-center">
                          {lista.map((c) => {
                            const s = situacao(c, hoje);
                            return (
                              <span
                                key={c.id}
                                title={`${ROTULO_SITUACAO[s]} · ${brl(c.valor)}`}
                                className={`badge w-full justify-center px-1 ${COR_SITUACAO[s]}`}
                              >
                                {s === "paga" ? "✓" : s === "em_analise" ? "?" : s === "a_vencer" ? "–" : "!"}
                              </span>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vazio>Nenhum inquilino cadastrado ainda.</Vazio>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {LEGENDA.map((s) => (
            <span key={s} className={`badge ${COR_SITUACAO[s]}`}>{ROTULO_SITUACAO[s]}</span>
          ))}
        </div>
      </section>
    </>
  );
}
