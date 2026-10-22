import Link from "next/link";
import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { brl, dataBR, diffDias, hojeISO } from "@/lib/format";
import type { Aditivo, Contrato, Profile, Sala } from "@/lib/types";
import { atualizarContrato, criarAditivo, encerrarContrato, excluirAditivo } from "../actions";
import { NovoContrato } from "@/components/NovoContrato";
import { PageHeader, Stat, Vazio } from "@/components/ui";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { UploadAditivo, UploadContrato } from "@/components/AdminUploads";
import { CamposFiador, resumoFiador } from "@/components/CamposFiador";

type Filtro = "ativos" | "vencendo" | "encerrados" | "todos";
const FILTROS: { v: Filtro; r: string }[] = [
  { v: "ativos", r: "Vigentes" },
  { v: "vencendo", r: "Vencendo ou vencidos" },
  { v: "encerrados", r: "Encerrados" },
  { v: "todos", r: "Todos" },
];

export default async function ContratosAdmin({ searchParams }: { searchParams: { f?: string; q?: string; aba?: string } }) {
  const [{ supabase }, config] = await Promise.all([exigirPerfil("admin"), getConfig()]);
  const hoje = hojeISO();
  const aba = searchParams.aba === "aditivos" ? "aditivos" : "contratos";
  const filtro = (FILTROS.some((x) => x.v === searchParams.f) ? searchParams.f : "ativos") as Filtro;
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const [{ data: c }, { data: p }, { data: s }, { data: a }] = await Promise.all([
    supabase.from("contratos").select("*").order("data_inicio", { ascending: false }),
    supabase.from("profiles").select("id, nome, email, ativo").eq("role", "inquilino").order("nome"),
    supabase.from("salas").select("id, nome, inquilino_id").order("nome"),
    supabase.from("aditivos").select("*").order("data", { ascending: false }),
  ]);
  const contratos = (c ?? []) as Contrato[];
  const inquilinos = (p ?? []) as Pick<Profile, "id" | "nome" | "email" | "ativo">[];
  const salas = (s ?? []) as Pick<Sala, "id" | "nome" | "inquilino_id">[];
  const aditivos = (a ?? []) as Aditivo[];
  const urls = await urlsAssinadas(supabase, "contratos", [
    ...contratos.map((x) => x.arquivo_path),
    ...aditivos.map((x) => x.arquivo_path),
  ]);

  const nomeInq = new Map(inquilinos.map((i) => [i.id, i.nome || i.email]));
  const nomeSala = new Map(salas.map((x) => [x.id, x.nome]));
  const contratoPorId = new Map(contratos.map((x) => [x.id, x]));
  const diasParaFim = (x: Contrato) => (x.data_fim ? diffDias(hoje, x.data_fim) : null);
  const vencendo = (x: Contrato) => x.ativo && diasParaFim(x) !== null && diasParaFim(x)! <= 60;
  const descricao = (x: Contrato) => `${nomeInq.get(x.inquilino_id) ?? "Inquilino"} · ${x.sala_id ? nomeSala.get(x.sala_id) ?? "Sala" : "Sem sala"}`;
  const busca = (x: Contrato) =>
    !q || [descricao(x), x.fiador_nome, x.fiador_cpf].some((v) => v?.toLowerCase().includes(q));

  const ativos = contratos.filter((x) => x.ativo);
  const lista = contratos
    .filter(busca)
    .filter((x) =>
      filtro === "todos" ? true : filtro === "ativos" ? x.ativo : filtro === "encerrados" ? !x.ativo : vencendo(x)
    );
  const aditivosVisiveis = aditivos.filter((ad) => {
    const ct = contratoPorId.get(ad.contrato_id);
    return !q || (ct && descricao(ct).toLowerCase().includes(q)) || ad.titulo.toLowerCase().includes(q);
  });
  const href = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(aba === "aditivos" ? { aba } : {}), ...(filtro !== "ativos" ? { f: filtro } : {}), ...(q ? { q: searchParams.q! } : {}), ...extra });
    for (const [k, v] of Array.from(p.entries())) if (!v) p.delete(k);
    const qs = p.toString();
    return `/admin/contratos${qs ? `?${qs}` : ""}`;
  };
  const salasLivres = salas.filter((x) => !x.inquilino_id);

  return (
    <>
      <PageHeader
        titulo="Contratos"
        descricao="Todos os contratos de locação, com vigência, documentos e aditivos."
        acoes={<Link href="/admin/acordos" className="btn-secondary">Acordos judiciais</Link>}
      />

      <section aria-label="Resumo" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat rotulo="Contratos vigentes" valor={ativos.length} />
        <Stat
          rotulo="Vencendo em até 60 dias"
          valor={ativos.filter((x) => { const d = diasParaFim(x); return d !== null && d >= 0 && d <= 60; }).length}
          destaque="aviso"
          href={href({ f: "vencendo" })}
        />
        <Stat rotulo="Já vencidos (ainda ativos)" valor={ativos.filter((x) => (diasParaFim(x) ?? 0) < 0).length} destaque="alerta" href={href({ f: "vencendo" })} />
        <Stat rotulo="Sem PDF assinado" valor={ativos.filter((x) => !x.arquivo_path).length} />
      </section>

      <details className="card mb-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="titulo-secao">Novo contrato</span>
          <span className="btn-primary btn-sm">+ Criar contrato</span>
        </summary>
        <div className="mt-5 border-t border-stone-100 pt-5">
          <NovoContrato
            inquilinos={inquilinos.filter((i) => i.ativo).map((i) => ({ id: i.id, nome: i.nome || i.email }))}
            salas={salasLivres.map((x) => ({ id: x.id, nome: x.nome }))}
            hoje={hoje}
            padroes={{ multa: config.multaPadrao, juros: config.jurosPadrao }}
          />
        </div>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-stone-100 p-1" role="tablist" aria-label="Contratos ou aditivos">
          <Link href={href({ aba: "" })} role="tab" aria-selected={aba === "contratos"} className={`rounded-full px-4 py-2 text-sm font-semibold ${aba === "contratos" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>
            Contratos <span className="opacity-60">{contratos.length}</span>
          </Link>
          <Link href={href({ aba: "aditivos" })} role="tab" aria-selected={aba === "aditivos"} className={`rounded-full px-4 py-2 text-sm font-semibold ${aba === "aditivos" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>
            Aditivos <span className="opacity-60">{aditivos.length}</span>
          </Link>
        </div>
        <form className="min-w-0 flex-[1_1_260px]" role="search">
          {aba === "aditivos" && <input type="hidden" name="aba" value="aditivos" />}
          {filtro !== "ativos" && <input type="hidden" name="f" value={filtro} />}
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input id="q" name="q" defaultValue={searchParams.q} placeholder="Buscar por inquilino, fiador, sala ou aditivo" className="input" />
        </form>
        {aba === "contratos" && (
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((x) => (
              <Link key={x.v} href={href({ f: x.v === "ativos" ? "" : x.v })} className={`chip ${filtro === x.v ? "chip-ativo" : ""}`}>{x.r}</Link>
            ))}
          </div>
        )}
      </div>

      {aba === "contratos" ? (
        lista.length ? (
          <div className="flex flex-col gap-3">
            {lista.map((ct) => {
              const dias = diasParaFim(ct);
              const meus = aditivos.filter((ad) => ad.contrato_id === ct.id);
              const selo = !ct.ativo
                ? { r: "Encerrado", cor: "bg-stone-100 text-stone-600" }
                : dias !== null && dias < 0
                  ? { r: `Vencido há ${-dias} dia(s)`, cor: "bg-[#fbdad7] text-[#8a1c12]" }
                  : dias !== null && dias <= 60
                    ? { r: `Vence em ${dias} dia(s)`, cor: "bg-[#fce3cc] text-[#7a3306]" }
                    : { r: "Vigente", cor: "bg-[#dcefe3] text-[#14532d]" };
              return (
                <details key={ct.id} className="card group p-0">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-stone-50/60">
                    <div className="min-w-0 flex-[1_1_240px]">
                      <div className="font-semibold">{nomeInq.get(ct.inquilino_id) ?? "Inquilino"}</div>
                      <div className="text-[13px] text-stone-600">{ct.sala_id ? nomeSala.get(ct.sala_id) ?? "Sala" : "Sem sala"} · {dataBR(ct.data_inicio)} a {ct.data_fim ? dataBR(ct.data_fim) : "sem data"}</div>
                      {resumoFiador(ct) && <div className="text-[13px] text-stone-600">Fiador: {resumoFiador(ct)}</div>}
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold">{brl(ct.valor_mensal)}</div>
                      <div className="text-[13px] text-stone-600">todo dia {ct.dia_vencimento}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${selo.cor}`}>{selo.r}</span>
                      {!ct.arquivo_path && ct.ativo && <span className="badge bg-stone-100 text-stone-700">Sem PDF</span>}
                      {meus.length > 0 && <span className="badge bg-brand-100 text-brand-700">{meus.length} aditivo(s)</span>}
                    </div>
                    <span className="text-sm font-semibold text-brand-600 group-open:hidden">Abrir</span>
                    <span className="hidden text-sm font-semibold text-brand-600 group-open:inline">Fechar</span>
                  </summary>

                  <div className="grid gap-5 border-t border-stone-100 px-5 py-5 xl:grid-cols-2">
                    <section className="flex flex-col gap-4">
                      <h3 className="text-sm font-semibold">Dados do contrato</h3>
                      <form action={atualizarContrato.bind(null, ct.id)} className="grid gap-3 sm:grid-cols-2">
                        <Data id={`as-${ct.id}`} nome="data_assinatura" rotulo="Data de assinatura" valor={ct.data_assinatura ?? ""} />
                        <Data id={`in-${ct.id}`} nome="data_inicio" rotulo="Início" valor={ct.data_inicio} obrigatorio />
                        <Data id={`fi-${ct.id}`} nome="data_fim" rotulo="Vencimento do contrato" valor={ct.data_fim ?? ""} />
                        <div>
                          <label className="label" htmlFor={`di-${ct.id}`}>Vencimento da mensalidade</label>
                          <select id={`di-${ct.id}`} name="dia_vencimento" defaultValue={ct.dia_vencimento} className="input">
                            {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>todo dia {i + 1}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label" htmlFor={`va-${ct.id}`}>Aluguel (R$)</label>
                          <input id={`va-${ct.id}`} name="valor_mensal" inputMode="decimal" defaultValue={String(ct.valor_mensal).replace(".", ",")} className="input" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label" htmlFor={`mu-${ct.id}`}>Multa %</label>
                            <input id={`mu-${ct.id}`} name="multa_percentual" inputMode="decimal" defaultValue={String(ct.multa_percentual).replace(".", ",")} className="input" />
                          </div>
                          <div>
                            <label className="label" htmlFor={`ju-${ct.id}`}>Juros %</label>
                            <input id={`ju-${ct.id}`} name="juros_mensal_percentual" inputMode="decimal" defaultValue={String(ct.juros_mensal_percentual).replace(".", ",")} className="input" />
                          </div>
                        </div>
                        <div className="sm:col-span-2"><CamposFiador prefixo={`ed-${ct.id}`} valores={ct} /></div>
                        <p className="text-xs text-stone-600 sm:col-span-2">Mudanças de valor ou dia valem para as próximas mensalidades. As já lançadas se ajustam em Pagamentos → Boleto.</p>
                        <div className="sm:col-span-2"><button className="btn-primary btn-sm">Salvar alterações</button></div>
                      </form>
                      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                        {ct.arquivo_path && urls[ct.arquivo_path] && (
                          <a href={urls[ct.arquivo_path]} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Ver contrato assinado</a>
                        )}
                        <UploadContrato contratoId={ct.id} inquilinoId={ct.inquilino_id} temArquivo={Boolean(ct.arquivo_path)} />
                        <Link href={`/admin/inquilinos/${ct.inquilino_id}`} className="btn-secondary btn-sm">Ver inquilino e cobranças</Link>
                        {ct.ativo && (
                          <form action={encerrarContrato.bind(null, ct.id, ct.inquilino_id)}>
                            <BotaoConfirmar mensagem="Encerrar este contrato? A sala ficará sem inquilino." className="btn-danger btn-sm">Encerrar contrato</BotaoConfirmar>
                          </form>
                        )}
                      </div>
                    </section>

                    <section className="flex flex-col gap-3 rounded-xl bg-stone-50 p-4">
                      <h3 className="text-sm font-semibold">Aditivos ({meus.length})</h3>
                      {meus.length ? (
                        <ul className="flex flex-col gap-2">
                          {meus.map((ad) => (
                            <li key={ad.id} className="rounded-lg border border-stone-200 bg-white p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold">{ad.titulo}</div>
                                  <div className="text-xs text-stone-600">{dataBR(ad.data)}</div>
                                  {ad.descricao && <p className="mt-1 whitespace-pre-line text-[13px] text-stone-700">{ad.descricao}</p>}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {ad.arquivo_path && urls[ad.arquivo_path] && (
                                    <a href={urls[ad.arquivo_path]} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Ver PDF</a>
                                  )}
                                  <UploadAditivo aditivoId={ad.id} inquilinoId={ct.inquilino_id} temArquivo={Boolean(ad.arquivo_path)} />
                                  <form action={excluirAditivo.bind(null, ad.id)}>
                                    <BotaoConfirmar mensagem={`Excluir o aditivo "${ad.titulo}"?`} className="btn-danger btn-sm">Excluir</BotaoConfirmar>
                                  </form>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-stone-600">Nenhum aditivo.</p>
                      )}
                      <form action={criarAditivo.bind(null, ct.id, ct.inquilino_id)} className="grid gap-2.5 border-t border-stone-200 pt-3 sm:grid-cols-[1fr_auto]">
                        <div>
                          <label className="label" htmlFor={`at-${ct.id}`}>Novo aditivo</label>
                          <input id={`at-${ct.id}`} name="titulo" required placeholder="Ex.: Reajuste 2027" className="input" />
                        </div>
                        <Data id={`ad-${ct.id}`} nome="data" rotulo="Data" valor={hoje} />
                        <textarea name="descricao" rows={2} placeholder="O que muda (opcional)" aria-label="Descrição do aditivo" className="input sm:col-span-2" />
                        <div className="sm:col-span-2">
                          <button className="btn-primary btn-sm">Adicionar aditivo</button>
                          <span className="ml-3 text-xs text-stone-600">Depois anexe o PDF no aditivo criado.</span>
                        </div>
                      </form>
                    </section>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <Vazio>Nenhum contrato neste filtro.</Vazio>
        )
      ) : aditivosVisiveis.length ? (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Aditivo</th><th>Contrato</th><th>PDF</th></tr>
            </thead>
            <tbody>
              {aditivosVisiveis.map((ad) => {
                const ct = contratoPorId.get(ad.contrato_id);
                return (
                  <tr key={ad.id}>
                    <td className="whitespace-nowrap">{dataBR(ad.data)}</td>
                    <td>
                      <div className="font-semibold">{ad.titulo}</div>
                      {ad.descricao && <div className="line-clamp-2 text-[13px] text-stone-600">{ad.descricao}</div>}
                    </td>
                    <td>{ct ? <Link href={`/admin/inquilinos/${ct.inquilino_id}`} className="hover:underline">{descricao(ct)}</Link> : "—"}</td>
                    <td>
                      {ad.arquivo_path && urls[ad.arquivo_path] ? (
                        <a href={urls[ad.arquivo_path]} target="_blank" rel="noreferrer" className="link">Ver PDF</a>
                      ) : ct ? (
                        <UploadAditivo aditivoId={ad.id} inquilinoId={ct.inquilino_id} temArquivo={false} />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio>Nenhum aditivo cadastrado. Abra um contrato na aba Contratos para adicionar.</Vazio>
      )}
    </>
  );
}

function Data({ id, nome, rotulo, valor, obrigatorio }: { id: string; nome: string; rotulo: string; valor?: string; obrigatorio?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{rotulo}</label>
      <input id={id} name={nome} type="date" defaultValue={valor} required={obrigatorio} className="input" />
    </div>
  );
}
