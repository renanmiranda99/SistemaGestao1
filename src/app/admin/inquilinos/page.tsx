import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dadosAdmin } from "@/lib/dados-admin";
import { ehPendente, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, hojeISO } from "@/lib/format";
import { apiWhatsAppConfigurada, mensagemCobranca } from "@/lib/whatsapp";
import { iniciais, PageHeader, Vazio } from "@/components/ui";
import { BotaoWhatsApp } from "@/components/BotaoWhatsApp";

const SITUACOES = {
  dia: { r: "Em dia", cor: "bg-[#dcefe3] text-[#14532d]" },
  atrasado: { r: "Atrasado", cor: "bg-[#fce3cc] text-[#7a3306]" },
  cobranca: { r: "Em cobrança", cor: "bg-[#fbdad7] text-[#8a1c12]" },
  inativo: { r: "Inativo", cor: "bg-stone-100 text-stone-600" },
} as const;
type ChaveSituacao = keyof typeof SITUACOES;

export default async function AdminInquilinos({ searchParams }: { searchParams: { q?: string; f?: string } }) {
  const { supabase } = await exigirPerfil("admin");
  const { inquilinos, cobrancas, contratoDe, salasDe } = await dadosAdmin(supabase);
  const hoje = hojeISO();
  const api = apiWhatsAppConfigurada();
  const q = (searchParams.q ?? "").toLowerCase();
  const f = (searchParams.f && searchParams.f in SITUACOES ? searchParams.f : "todos") as ChaveSituacao | "todos";

  const comSituacao = inquilinos.map((i) => {
    const pend = cobrancas.filter((c) => c.inquilino_id === i.id && ehPendente(c, hoje));
    const emCobranca = pend.filter((c) => situacao(c, hoje) === "em_cobranca");
    const chave: ChaveSituacao = !i.ativo ? "inativo" : emCobranca.length ? "cobranca" : pend.length ? "atrasado" : "dia";
    return { i, pend, emCobranca, chave };
  });
  const buscados = comSituacao.filter(
    ({ i }) => !q || [i.nome, i.email, i.telefone, i.cpf_cnpj].some((v) => v?.toLowerCase().includes(q))
  );
  const lista = buscados.filter((x) => f === "todos" || x.chave === f);
  const totalAberto = comSituacao.reduce(
    (s, x) => s + x.pend.reduce((t, c) => t + valorAtualizado(c, contratoDe(c), hoje).total, 0),
    0
  );
  const filtros: { v: ChaveSituacao | "todos"; r: string }[] = [
    { v: "todos", r: "Todos" },
    { v: "dia", r: "Em dia" },
    { v: "atrasado", r: "Atrasados" },
    { v: "cobranca", r: "Em cobrança" },
    { v: "inativo", r: "Inativos" },
  ];
  const href = (v: string) => `/admin/inquilinos?${new URLSearchParams({ ...(q ? { q: searchParams.q! } : {}), ...(v !== "todos" ? { f: v } : {}) })}`;

  return (
    <>
      <PageHeader
        titulo="Inquilinos"
        descricao={`${inquilinos.filter((i) => i.ativo).length} ativo(s) · ${brl(totalAberto)} em aberto. Novos inquilinos se cadastram pela tela de cadastro.`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex-[1_1_320px]" role="search">
          {f !== "todos" && <input type="hidden" name="f" value={f} />}
          <label htmlFor="q" className="sr-only">Buscar inquilino</label>
          <input id="q" name="q" defaultValue={searchParams.q} className="input" placeholder="Buscar por nome, e-mail, telefone, CPF/CNPJ" />
        </form>
        <div className="flex flex-wrap gap-2">
          {filtros.map((x) => (
            <Link key={x.v} href={href(x.v)} className={`chip ${f === x.v ? "chip-ativo" : ""}`}>
              {x.r} <span className="opacity-70">{x.v === "todos" ? buscados.length : buscados.filter((b) => b.chave === x.v).length}</span>
            </Link>
          ))}
        </div>
      </div>
      {lista.length ? (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Inquilino</th>
                <th>Sala(s)</th>
                <th>WhatsApp</th>
                <th>Situação</th>
                <th className="text-right">Em aberto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map(({ i, pend, emCobranca, chave }) => {
                const total = pend.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
                const maisAntiga = [...emCobranca].sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
                return (
                  <tr key={i.id} className={`hover:bg-stone-50/60 ${i.ativo ? "" : "opacity-60"}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-700">
                          {iniciais(i.nome || i.email)}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/inquilinos/${i.id}`} className="font-semibold text-stone-900 hover:underline">
                            {i.nome || "(sem nome)"}
                          </Link>
                          <div className="text-xs text-stone-600">{i.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{salasDe(i.id).map((s) => s.nome).join(", ") || "—"}</td>
                    <td className="whitespace-nowrap tabular-nums">{i.telefone || "—"}</td>
                    <td><span className={`badge ${SITUACOES[chave].cor}`}>{SITUACOES[chave].r}</span></td>
                    <td className={`text-right font-semibold ${total ? "text-[#b42318]" : "text-stone-600"}`}>{total ? brl(total) : "—"}</td>
                    <td className="text-right">
                      <BotaoWhatsApp
                        inquilinoId={i.id}
                        cobrancaId={maisAntiga?.id}
                        telefone={i.telefone}
                        apiConfigurada={api}
                        mensagem={
                          maisAntiga
                            ? mensagemCobranca({
                                nome: i.nome,
                                competencia: maisAntiga.competencia,
                                vencimento: maisAntiga.vencimento,
                                valor: valorAtualizado(maisAntiga, contratoDe(maisAntiga), hoje).total,
                                dias: valorAtualizado(maisAntiga, contratoDe(maisAntiga), hoje).dias,
                              })
                            : `Olá, ${i.nome.split(" ")[0]}! `
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio>Nenhum inquilino encontrado.</Vazio>
      )}
    </>
  );
}
