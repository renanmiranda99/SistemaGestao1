import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { dadosFinanceirosInquilino } from "@/lib/dados";
import { detalheSituacao, ehPendente, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, dataHoraBR, hojeISO, mesAno, mesAnoLongo } from "@/lib/format";
import { apiWhatsAppConfigurada, mensagemCobranca } from "@/lib/whatsapp";
import type { Aditivo, Profile } from "@/lib/types";
import {
  criarAditivo,
  criarContrato,
  encerrarContrato,
  lancarMulta,
  marcarCobranca,
  marcarMulta,
  salvarInquilino,
} from "../../actions";
import { PageHeader, SituacaoBadge, StatusBadge, Vazio } from "@/components/ui";
import { BotaoWhatsApp } from "@/components/BotaoWhatsApp";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { UploadAditivo, UploadContrato } from "@/components/AdminUploads";
import { CamposFiador, resumoFiador } from "@/components/CamposFiador";

export default async function AdminInquilino({ params }: { params: { id: string } }) {
  const [{ supabase }, config] = await Promise.all([exigirPerfil("admin"), getConfig()]);
  const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).maybeSingle();
  if (!p) notFound();
  const inq = p as Profile;
  const hoje = hojeISO();
  const api = apiWhatsAppConfigurada();

  const { contratos, cobrancas, multas, contratoDe } = await dadosFinanceirosInquilino(supabase, inq.id);
  const [{ data: ads }, { data: todasSalas }, { data: msgs }] = await Promise.all([
    contratos.length
      ? supabase.from("aditivos").select("*").in("contrato_id", contratos.map((c) => c.id)).order("data")
      : Promise.resolve({ data: [] }),
    supabase.from("salas").select("id, nome, inquilino_id").order("nome"),
    supabase.from("mensagens_whatsapp").select("*").eq("inquilino_id", inq.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const aditivos = (ads ?? []) as Aditivo[];
  const salasLivres = (todasSalas ?? []).filter((s) => !s.inquilino_id || s.inquilino_id === inq.id);
  const nomeSala = new Map((todasSalas ?? []).map((s) => [s.id, s.nome as string]));
  const urls = await urlsAssinadas(supabase, "contratos", [
    ...contratos.map((c) => c.arquivo_path),
    ...aditivos.map((a) => a.arquivo_path),
  ]);
  const pendentes = cobrancas.filter((c) => ehPendente(c, hoje));
  const totalPendente = pendentes.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);

  return (
    <>
      <Link href="/admin/inquilinos" className="link mb-4 inline-flex min-h-8 items-center text-sm">← Inquilinos</Link>
      <PageHeader
        titulo={inq.nome || inq.email}
        descricao={
          <>
            {inq.email}
            {inq.telefone ? ` · ${inq.telefone}` : ""} · Em aberto:{" "}
            <b className={totalPendente ? "text-[#b42318]" : "text-[#2f7d55]"}>{brl(totalPendente)}</b>
          </>
        }
        acoes={
          <BotaoWhatsApp
            inquilinoId={inq.id}
            telefone={inq.telefone}
            apiConfigurada={api}
            rotulo="Mensagem no WhatsApp"
            mensagem={`Olá, ${inq.nome.split(" ")[0]}! `}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dados */}
        <section className="card lg:col-span-1">
          <h2 className="mb-4 font-semibold">Dados do inquilino</h2>
          <form action={salvarInquilino.bind(null, inq.id)} className="space-y-3">
            <div><label className="label">Nome / Razão social</label><input name="nome" defaultValue={inq.nome} className="input" /></div>
            <div><label className="label">WhatsApp</label><input name="telefone" defaultValue={inq.telefone ?? ""} className="input" /></div>
            <div><label className="label">CPF / CNPJ</label><input name="cpf_cnpj" defaultValue={inq.cpf_cnpj ?? ""} className="input" /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ativo" defaultChecked={inq.ativo} /> Acesso ativo
            </label>
            <button className="btn-primary btn-sm">Salvar</button>
          </form>
        </section>

        {/* Contratos */}
        <section className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold">Contratos e aditivos</h2>
          {!contratos.length && <p className="mb-4 text-sm text-stone-600">Nenhum contrato ainda.</p>}
          <div className="space-y-4">
            {contratos.map((c) => (
              <div key={c.id} className={`rounded-lg border border-stone-200 p-4 ${c.ativo ? "" : "bg-stone-50 opacity-70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-semibold">
                      {c.sala_id ? nomeSala.get(c.sala_id) : "Sem sala"} · {brl(c.valor_mensal)}/mês · vence dia {c.dia_vencimento}
                      {!c.ativo && " · encerrado"}
                    </div>
                    <div className="text-stone-600">
                      {c.data_assinatura && <>Assinado em {dataBR(c.data_assinatura)} · </>}Vigência {dataBR(c.data_inicio)} a {dataBR(c.data_fim)} · multa {Number(c.multa_percentual)}% · juros {Number(c.juros_mensal_percentual)}% a.m.
                    </div>
                    {resumoFiador(c) && <div className="text-stone-600">Fiador: {resumoFiador(c)}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.arquivo_path && urls[c.arquivo_path] && (
                      <a href={urls[c.arquivo_path]} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Ver PDF</a>
                    )}
                    <UploadContrato contratoId={c.id} inquilinoId={inq.id} temArquivo={Boolean(c.arquivo_path)} />
                    {c.ativo && (
                      <form action={encerrarContrato.bind(null, c.id, inq.id)}>
                        <BotaoConfirmar mensagem="Encerrar este contrato? A sala ficará disponível." className="btn-secondary btn-sm text-red-600">
                          Encerrar
                        </BotaoConfirmar>
                      </form>
                    )}
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {aditivos.filter((a) => a.contrato_id === c.id).map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-stone-50 px-3 py-1.5">
                      <span><span className="font-medium">{a.titulo}</span> <span className="text-stone-600">· {dataBR(a.data)}</span></span>
                      <span className="flex items-center gap-2">
                        {a.arquivo_path && urls[a.arquivo_path] && (
                          <a href={urls[a.arquivo_path]} target="_blank" rel="noreferrer" className="link text-xs">ver</a>
                        )}
                        <UploadAditivo aditivoId={a.id} inquilinoId={inq.id} temArquivo={Boolean(a.arquivo_path)} />
                      </span>
                    </li>
                  ))}
                </ul>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand-600">+ Novo aditivo</summary>
                  <form action={criarAditivo.bind(null, c.id, inq.id)} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <input name="titulo" required placeholder="Título (ex.: Reajuste 2026)" className="input" />
                    <input name="data" type="date" defaultValue={hoje} className="input" />
                    <button className="btn-primary btn-sm">Adicionar</button>
                    <textarea name="descricao" placeholder="Descrição (opcional)" className="input sm:col-span-3" rows={2} />
                  </form>
                </details>
              </div>
            ))}
          </div>

          <details className="mt-4 rounded-lg border border-dashed border-stone-300 p-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Novo contrato</summary>
            <form action={criarContrato.bind(null, inq.id)} className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Sala</label>
                <select name="sala_id" className="input">
                  <option value="">—</option>
                  {salasLivres.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div><label className="label">Data de assinatura</label><input name="data_assinatura" type="date" className="input" defaultValue={hoje} /></div>
              <div><label className="label">Início</label><input name="data_inicio" type="date" required className="input" defaultValue={hoje} /></div>
              <div><label className="label">Vencimento do contrato</label><input name="data_fim" type="date" className="input" /></div>
              <div><label className="label">Aluguel (R$)</label><input name="valor_mensal" required inputMode="decimal" placeholder="1500,00" className="input" /></div>
              <div><label className="label">Dia de vencimento</label><input name="dia_vencimento" type="number" min={1} max={28} required defaultValue={10} className="input" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Multa %</label><input name="multa_percentual" defaultValue={String(config.multaPadrao).replace(".", ",")} className="input" /></div>
                <div><label className="label">Juros % a.m.</label><input name="juros_mensal_percentual" defaultValue={String(config.jurosPadrao).replace(".", ",")} className="input" /></div>
              </div>
              <div className="sm:col-span-3"><CamposFiador prefixo="ni" /></div>
              <div className="sm:col-span-3">
                <p className="mb-2 text-xs text-stone-600">As cobranças mensais desde o início do contrato até o mês atual são lançadas automaticamente. Depois anexe o PDF.</p>
                <button className="btn-primary">Criar contrato</button>
              </div>
            </form>
          </details>
        </section>
      </div>

      {/* Cobranças */}
      <section className="card mt-6 overflow-x-auto lg:overflow-visible">
        <h2 className="mb-4 font-semibold">Pagamentos mês a mês</h2>
        {cobrancas.length ? (
          <table className="table">
            <thead>
              <tr><th>Mês</th><th>Vencimento</th><th className="text-right">Valor</th><th className="text-right">Atualizado</th><th>Situação</th><th>Pago em</th><th className="text-right">Ações</th></tr>
            </thead>
            <tbody>
              {cobrancas.map((c) => {
                const s = situacao(c, hoje);
                const v = valorAtualizado(c, contratoDe(c), hoje);
                return (
                  <tr key={c.id}>
                    <td className="font-medium capitalize">{mesAnoLongo(c.competencia)}</td>
                    <td>{dataBR(c.vencimento)}</td>
                    <td className="text-right">{brl(c.valor)}</td>
                    <td className="text-right">{v.total !== v.base ? <span className="text-red-700">{brl(v.total)}</span> : "—"}</td>
                    <td><SituacaoBadge situacao={s} dica={detalheSituacao(c, contratoDe(c), hoje)} /></td>
                    <td>{dataBR(c.pago_em)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {c.status !== "pago" && c.status !== "cancelado" && (
                          <form action={marcarCobranca.bind(null, c.id, "pago")}>
                            <BotaoConfirmar mensagem={`Marcar ${mesAno(c.competencia)} como pago hoje?`}>Marcar pago</BotaoConfirmar>
                          </form>
                        )}
                        {(c.status === "pago" || c.status === "cancelado") && (
                          <form action={marcarCobranca.bind(null, c.id, "pendente")}>
                            <BotaoConfirmar mensagem="Reabrir esta cobrança?">Reabrir</BotaoConfirmar>
                          </form>
                        )}
                        {c.status === "pendente" && (
                          <form action={marcarCobranca.bind(null, c.id, "cancelado")}>
                            <BotaoConfirmar mensagem="Cancelar esta cobrança?" className="btn-secondary btn-sm text-red-600">Cancelar</BotaoConfirmar>
                          </form>
                        )}
                        {(s === "em_cobranca" || s === "vencida") && (
                          <BotaoWhatsApp
                            inquilinoId={inq.id}
                            cobrancaId={c.id}
                            telefone={inq.telefone}
                            apiConfigurada={api}
                            rotulo="Cobrar"
                            mensagem={mensagemCobranca({ nome: inq.nome, competencia: c.competencia, vencimento: c.vencimento, valor: v.total, dias: v.dias })}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Vazio>Sem cobranças. Crie um contrato para gerar as cobranças mensais.</Vazio>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Multas */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Multas</h2>
          {multas.length ? (
            <ul className="mb-4 divide-y divide-stone-100 text-sm">
              {multas.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <div className="font-medium">{m.descricao}</div>
                    <div className="text-xs text-stone-600">{dataBR(m.data)} · {brl(m.valor)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={m.status} />
                    {m.status === "pendente" && (
                      <>
                        <form action={marcarMulta.bind(null, m.id, "paga")}><BotaoConfirmar>Paga</BotaoConfirmar></form>
                        <form action={marcarMulta.bind(null, m.id, "cancelada")}><BotaoConfirmar mensagem="Cancelar multa?">Cancelar</BotaoConfirmar></form>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-stone-600">Nenhuma multa.</p>
          )}
          <form action={lancarMulta.bind(null, inq.id)} className="grid gap-2 border-t border-stone-100 pt-4 sm:grid-cols-2">
            <input name="descricao" required placeholder="Motivo da multa" className="input sm:col-span-2" />
            <input name="valor" required inputMode="decimal" placeholder="Valor (R$)" className="input" />
            <input name="data" type="date" defaultValue={hoje} className="input" />
            <select name="cobranca_id" className="input sm:col-span-2">
              <option value="">Não vinculada a um mês</option>
              {cobrancas.map((c) => <option key={c.id} value={c.id}>Referente a {mesAnoLongo(c.competencia)}</option>)}
            </select>
            <button className="btn-primary btn-sm sm:col-span-2">Lançar multa</button>
          </form>
        </section>

        {/* Histórico WhatsApp */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Mensagens de WhatsApp</h2>
          {msgs?.length ? (
            <ul className="space-y-3 text-sm">
              {msgs.map((m) => (
                <li key={m.id} className="rounded-lg bg-stone-50 p-3">
                  <div className="mb-1 flex justify-between text-xs text-stone-600">
                    <span>{dataHoraBR(m.created_at)} · {m.tipo === "automatica" ? "Automática" : "Manual"}</span>
                    <span>{m.status}</span>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-line text-stone-700">{m.mensagem}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">Nenhuma mensagem enviada.</p>
          )}
        </section>
      </div>
    </>
  );
}
