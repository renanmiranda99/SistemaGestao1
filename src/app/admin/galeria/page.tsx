import Link from "next/link";
import { exigirPerfil, urlPublicaFoto, urlsAssinadas } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { brl, dataBR, diffDias, hojeISO } from "@/lib/format";
import type { Aviso, Contrato, Foto, Profile, Sala, TipoVistoria, VistoriaFoto } from "@/lib/types";
import { excluirAviso, excluirFotoVistoria, excluirSala, publicarAviso, salvarSala } from "../actions";
import { Alerta, PageHeader, Vazio } from "@/components/ui";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { UploadContrato, UploadFoto } from "@/components/AdminUploads";
import { FotosSala, NovaSala, OpcoesAndar, OpcoesOcupacao, UploadVistoria } from "@/components/Salas";

type InquilinoOpcao = Pick<Profile, "id" | "nome" | "email">;

const TIPO_VISTORIA: Record<TipoVistoria, { r: string; cor: string }> = {
  entrada: { r: "Entrada", cor: "bg-brand-100 text-brand-700" },
  dano: { r: "Dano", cor: "bg-[#fbdad7] text-[#8a1c12]" },
  saida: { r: "Saída", cor: "bg-stone-100 text-stone-700" },
};

export default async function GaleriaAdmin({ searchParams }: { searchParams: { nova?: string } }) {
  const [{ supabase }, config] = await Promise.all([exigirPerfil("admin"), getConfig()]);
  const hoje = hojeISO();
  const [{ data: s }, { data: f }, { data: a }, { data: p }, { data: c }, { data: v }] = await Promise.all([
    supabase.from("salas").select("*").order("nome"),
    supabase.from("fotos").select("*").order("ordem").order("created_at"),
    supabase.from("avisos").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, nome, email").eq("role", "inquilino").eq("ativo", true).order("nome"),
    supabase.from("contratos").select("*").eq("ativo", true).not("sala_id", "is", null),
    supabase.from("vistoria_fotos").select("*").order("registrada_em").order("created_at"),
  ]);
  const salas = (s ?? []) as Sala[];
  const fotos = (f ?? []) as Foto[];
  const avisos = (a ?? []) as Aviso[];
  const inquilinos = (p ?? []) as InquilinoOpcao[];
  const contratos = (c ?? []) as Contrato[];
  const vistorias = (v ?? []) as VistoriaFoto[];
  const urlsVistoria = await urlsAssinadas(supabase, "vistorias", vistorias.map((x) => x.storage_path));
  const urlsContrato = await urlsAssinadas(supabase, "contratos", contratos.map((x) => x.arquivo_path));
  const nomeInquilino = new Map(inquilinos.map((i) => [i.id, i.nome || i.email]));
  const ocupadas = salas.filter((x) => x.inquilino_id).length;

  return (
    <>
      <PageHeader titulo="Galeria e salas" descricao="Salas, contratos, vistorias, fotos e avisos da galeria." />

      <details className="card mb-6" open={salas.length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="titulo-secao">Nova sala</span>
          <span className="btn-primary btn-sm">+ Cadastrar sala</span>
        </summary>
        <div className="mt-5 border-t border-stone-100 pt-5">
          <NovaSala inquilinos={inquilinos} hoje={hoje} padroes={{ multa: config.multaPadrao, juros: config.jurosPadrao }} />
        </div>
      </details>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="titulo-secao">Salas</h2>
          <span className="text-[13px] text-stone-600">{ocupadas} de {salas.length} ocupadas</span>
        </div>
        {!salas.length && <Vazio>Nenhuma sala cadastrada ainda.</Vazio>}
        <div className="flex flex-col gap-4">
          {salas.map((sala) => (
            <CartaoSala
              key={sala.id}
              sala={sala}
              nova={searchParams.nova === sala.id}
              hoje={hoje}
              contrato={contratos.find((x) => x.sala_id === sala.id) ?? null}
              inquilinoNome={sala.inquilino_id ? nomeInquilino.get(sala.inquilino_id) ?? "Inquilino" : null}
              inquilinos={inquilinos}
              vistorias={vistorias.filter((x) => x.sala_id === sala.id)}
              fotos={fotos.filter((x) => x.sala_id === sala.id)}
              urlsVistoria={urlsVistoria}
              urlsContrato={urlsContrato}
            />
          ))}
        </div>
      </section>

      <div>
        <section className="card">
          <h2 className="titulo-secao mb-4">Avisos</h2>
          <form action={publicarAviso} className="mb-4 space-y-2">
            <input name="titulo" required placeholder="Título" className="input" aria-label="Título do aviso" />
            <textarea name="conteudo" required rows={3} placeholder="Texto do aviso" className="input" aria-label="Texto do aviso" />
            <button className="btn-primary btn-sm">Publicar aviso</button>
          </form>
          <ul className="divide-y divide-stone-100 text-sm">
            {avisos.map((av) => (
              <li key={av.id} className="flex items-start justify-between gap-2 py-2.5">
                <div>
                  <div className="font-semibold">{av.titulo} <span className="text-xs font-normal text-stone-600">{dataBR(av.created_at)}</span></div>
                  <p className="line-clamp-2 text-stone-600">{av.conteudo}</p>
                </div>
                <form action={excluirAviso.bind(null, av.id)}>
                  <BotaoConfirmar mensagem="Excluir aviso?" className="btn-danger btn-sm">Excluir</BotaoConfirmar>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function CartaoSala({
  sala,
  nova,
  hoje,
  contrato,
  inquilinoNome,
  inquilinos,
  vistorias,
  fotos,
  urlsVistoria,
  urlsContrato,
}: {
  sala: Sala;
  nova: boolean;
  hoje: string;
  contrato: Contrato | null;
  inquilinoNome: string | null;
  inquilinos: InquilinoOpcao[];
  vistorias: VistoriaFoto[];
  fotos: Foto[];
  urlsVistoria: Record<string, string>;
  urlsContrato: Record<string, string>;
}) {
  const detalhes = [sala.andar, sala.area_m2 && `${String(sala.area_m2).replace(".", ",")} m²`, sala.valor_aluguel && `ref. ${brl(sala.valor_aluguel)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <article id={`sala-${sala.id}`} className={`card scroll-mt-6 ${nova ? "ring-2 ring-brand-600" : ""}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{sala.nome}</h3>
          {detalhes && <p className="text-[13px] text-stone-600">{detalhes}</p>}
        </div>
        {sala.inquilino_id ? (
          <Link href={`/admin/inquilinos/${sala.inquilino_id}`} className="badge bg-brand-100 text-brand-700 hover:underline">
            {inquilinoNome}
          </Link>
        ) : sala.disponivel_aluguel ? (
          <a href="/" target="_blank" rel="noreferrer" className="badge bg-[#dcefe3] text-[#14532d] hover:underline">
            Disponível para aluguel · anunciada
          </a>
        ) : (
          <span className="badge bg-stone-100 text-stone-700">Sem inquilino · não anunciada</span>
        )}
      </header>

      {nova && (
        <div className="mb-4">
          <Alerta tipo="ok">
            <strong>Sala cadastrada.</strong> Agora adicione as fotos da vistoria de entrada
            {contrato && !contrato.arquivo_path ? " e anexe o PDF do contrato assinado" : ""}.
          </Alerta>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          <BlocoContrato sala={sala} contrato={contrato} hoje={hoje} urlsContrato={urlsContrato} />

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Fotos da sala</h4>
              <UploadFoto salaId={sala.id} />
            </div>
            <p className="mb-2 text-xs text-stone-600">Aparecem no portal dos inquilinos e, se a sala estiver disponível para aluguel, no anúncio da página inicial.</p>
            <FotosSala fotos={fotos.map((x) => ({ id: x.id, url: urlPublicaFoto(x.storage_path), legenda: x.legenda }))} />
          </section>
        </div>

        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 p-4">
          <div>
            <h4 className="text-sm font-semibold">Vistoria ({vistorias.length} foto{vistorias.length === 1 ? "" : "s"})</h4>
            <p className="text-xs text-stone-600">
              Registro do estado da sala para eventual cobrança de danos. Ficam guardadas de forma privada; o inquilino da sala pode consultar.
            </p>
          </div>
          {vistorias.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {vistorias.map((ft) => (
                <figure key={ft.id} className="group relative flex flex-col gap-1">
                  <a href={urlsVistoria[ft.storage_path]} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlsVistoria[ft.storage_path]}
                      alt={ft.legenda || `Foto de vistoria de ${dataBR(ft.registrada_em)}`}
                      className="aspect-[4/3] w-full rounded-lg border border-stone-200 object-cover"
                    />
                  </a>
                  <figcaption className="flex flex-col gap-0.5 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className={`badge min-h-5 px-2 text-[11px] ${TIPO_VISTORIA[ft.tipo].cor}`}>{TIPO_VISTORIA[ft.tipo].r}</span>
                      <span className="text-stone-600">{dataBR(ft.registrada_em)}</span>
                    </span>
                    {ft.legenda && <span className="line-clamp-2 text-stone-700">{ft.legenda}</span>}
                  </figcaption>
                  <form action={excluirFotoVistoria.bind(null, ft.id)} className="absolute right-1 top-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <BotaoConfirmar mensagem="Excluir esta foto da vistoria?" className="btn-danger btn-sm min-h-8 px-2">×</BotaoConfirmar>
                  </form>
                </figure>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-stone-300 px-3 py-5 text-center text-sm text-stone-600">
              Nenhuma foto de vistoria ainda.
            </p>
          )}
          <div className="border-t border-stone-100 pt-3">
            <UploadVistoria salaId={sala.id} hoje={hoje} />
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-stone-100 pt-4">
        <details className="min-w-0 flex-1">
          <summary className="link cursor-pointer text-sm">Editar dados da sala</summary>
          <div className="mt-3"><FormSala sala={sala} inquilinos={inquilinos} /></div>
        </details>
        <form action={excluirSala.bind(null, sala.id)}>
          <BotaoConfirmar mensagem={`Excluir ${sala.nome} e todas as suas fotos?`} className="btn-danger btn-sm">Excluir sala</BotaoConfirmar>
        </form>
      </div>
    </article>
  );
}

function BlocoContrato({
  sala,
  contrato,
  hoje,
  urlsContrato,
}: {
  sala: Sala;
  contrato: Contrato | null;
  hoje: string;
  urlsContrato: Record<string, string>;
}) {
  if (!sala.inquilino_id) {
    return <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">Sala sem inquilino, sem contrato ativo.</p>;
  }
  if (!contrato) {
    return (
      <div className="rounded-xl bg-[#fdf1e4] px-4 py-3 text-sm text-[#5c2a06]">
        Esta sala tem inquilino, mas nenhum contrato ativo.{" "}
        <Link href={`/admin/inquilinos/${sala.inquilino_id}`} className="font-semibold underline">Criar contrato</Link>
      </div>
    );
  }
  const diasParaFim = contrato.data_fim ? diffDias(hoje, contrato.data_fim) : null;
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-stone-50 p-4">
      <h4 className="text-sm font-semibold">Contrato</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div><dt className="text-xs text-stone-600">Assinatura</dt><dd className="font-semibold">{dataBR(contrato.data_assinatura)}</dd></div>
        <div><dt className="text-xs text-stone-600">Início</dt><dd className="font-semibold">{dataBR(contrato.data_inicio)}</dd></div>
        <div>
          <dt className="text-xs text-stone-600">Vencimento do contrato</dt>
          <dd className="font-semibold">{contrato.data_fim ? dataBR(contrato.data_fim) : "Sem data"}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-600">Mensalidade</dt>
          <dd className="font-semibold">{brl(contrato.valor_mensal)} · todo dia {contrato.dia_vencimento}</dd>
        </div>
      </dl>
      {diasParaFim !== null && diasParaFim < 0 && (
        <Alerta tipo="erro">O contrato venceu em {dataBR(contrato.data_fim)}. Renove por aditivo ou encerre.</Alerta>
      )}
      {diasParaFim !== null && diasParaFim >= 0 && diasParaFim <= 60 && (
        <Alerta tipo="aviso">O contrato vence em {diasParaFim} dia(s).</Alerta>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {contrato.arquivo_path && urlsContrato[contrato.arquivo_path] && (
          <a href={urlsContrato[contrato.arquivo_path]} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Ver contrato assinado</a>
        )}
        <UploadContrato contratoId={contrato.id} inquilinoId={contrato.inquilino_id} temArquivo={Boolean(contrato.arquivo_path)} />
        <Link href={`/admin/inquilinos/${contrato.inquilino_id}`} className="link text-sm">Aditivos e cobranças</Link>
      </div>
    </section>
  );
}

function FormSala({ sala, inquilinos }: { sala: Sala; inquilinos: InquilinoOpcao[] }) {
  return (
    <form action={salvarSala.bind(null, sala.id)} className="grid gap-2.5 sm:grid-cols-2">
      <input name="nome" required defaultValue={sala.nome} placeholder="Nome (ex.: Sala 101)" className="input" aria-label="Nome" />
      <select name="andar" defaultValue={sala.andar ?? ""} className="input" aria-label="Andar">
        <OpcoesAndar atual={sala.andar} />
      </select>
      <input name="area_m2" defaultValue={sala.area_m2 ?? ""} placeholder="Área (m²)" className="input" aria-label="Área (m²)" />
      <input
        name="valor_aluguel"
        defaultValue={sala.valor_aluguel ? String(sala.valor_aluguel).replace(".", ",") : ""}
        placeholder="Aluguel de referência (R$)"
        className="input"
        aria-label="Aluguel de referência (R$)"
      />
      <select
        name="inquilino_id"
        defaultValue={sala.inquilino_id ?? (sala.disponivel_aluguel ? "disponivel" : "")}
        className="input sm:col-span-2"
        aria-label="Inquilino"
      >
        <OpcoesOcupacao inquilinos={inquilinos} />
      </select>
      <textarea name="descricao" defaultValue={sala.descricao ?? ""} rows={2} placeholder="Descrição" className="input sm:col-span-2" aria-label="Descrição" />
      <div className="sm:col-span-2"><button className="btn-primary btn-sm">Salvar</button></div>
    </form>
  );
}

