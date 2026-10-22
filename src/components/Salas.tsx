"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { cadastrarSala, excluirFoto, registrarFoto, registrarFotoVistoria, reordenarFotos } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { nomeSeguro, TAMANHO_MAXIMO } from "@/lib/arquivos";
import { CamposFiador } from "./CamposFiador";

type InquilinoOpcao = { id: string; nome: string; email: string };

function BotaoCadastrar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Cadastrando..." : "Cadastrar sala"}
    </button>
  );
}

/**
 * Formulário de nova sala, com fotos da sala. Com inquilino escolhido, já pede os dados
 * do contrato; com "Disponível para aluguel", a sala aparece na página inicial pública.
 */
export function NovaSala({
  inquilinos,
  hoje,
  padroes,
}: {
  inquilinos: InquilinoOpcao[];
  hoje: string;
  /** Multa e juros padrão dos contratos (painel de Configurações) */
  padroes: { multa: number; juros: number };
}) {
  const [estado, acao] = useFormState(cadastrarSala, null);
  const [inquilino, setInquilino] = useState("");
  const [fotos, setFotos] = useState<{ arquivo: File; url: string }[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erroFotos, setErroFotos] = useState<string | null>(null);
  const router = useRouter();
  const comContrato = Boolean(inquilino) && inquilino !== "disponivel";

  // Depois que a sala é criada, envia as fotos escolhidas e abre o cartão da sala
  useEffect(() => {
    const salaId = estado?.id;
    if (!salaId) return;
    let cancelado = false;
    (async () => {
      const supabase = createClient();
      for (const [i, { arquivo }] of fotos.entries()) {
        if (cancelado) return;
        setEnviando(`Enviando foto ${i + 1} de ${fotos.length}...`);
        const path = `salas/${salaId}/${nomeSeguro(arquivo.name)}`;
        const { error } = await supabase.storage.from("fotos").upload(path, arquivo, { upsert: false });
        // A posição escolhida na tela vira a ordem da foto (a primeira é a capa)
        const falha = error ? error.message : await registrarFoto(salaId, path, i);
        if (falha) {
          setErroFotos(`A sala foi cadastrada, mas a foto ${arquivo.name} falhou: ${falha}`);
          break;
        }
      }
      setEnviando(null);
      router.push(`/admin/galeria?nova=${salaId}#sala-${salaId}`);
      router.refresh();
    })();
    return () => {
      cancelado = true;
    };
    // Só reage a uma sala recém-criada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado?.id]);

  function escolherFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const novas = Array.from(e.target.files ?? []);
    e.target.value = "";
    const grandes = novas.filter((a) => a.size > TAMANHO_MAXIMO);
    setErroFotos(grandes.length ? `Fotos acima de 10 MB foram ignoradas: ${grandes.map((g) => g.name).join(", ")}` : null);
    const validas = novas.filter((a) => a.size <= TAMANHO_MAXIMO && a.type.startsWith("image/"));
    setFotos((atual) => [...atual, ...validas.map((arquivo) => ({ arquivo, url: URL.createObjectURL(arquivo) }))]);
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="label" htmlFor="ns-nome">Nome</label>
          <input id="ns-nome" name="nome" required placeholder="Ex.: Loja 13" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ns-andar">Andar</label>
          <select id="ns-andar" name="andar" defaultValue="Térreo" className="input">
            <OpcoesAndar />
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ns-area">Área (m²)</label>
          <input id="ns-area" name="area_m2" inputMode="decimal" placeholder="32" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ns-valor">Aluguel (R$)</label>
          <input id="ns-valor" name="valor_aluguel" inputMode="decimal" placeholder="2.000,00" required={Boolean(inquilino)} className="input" />
          {inquilino === "disponivel" && <p className="mt-1 text-xs text-stone-600">Aparece no anúncio da página inicial.</p>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ns-desc">Descrição</label>
        <textarea id="ns-desc" name="descricao" rows={2} placeholder="Vitrine para o corredor principal, banheiro próprio..." className="input" />
      </div>
      <div>
        <label className="label" htmlFor="ns-inq">Inquilino</label>
        <select id="ns-inq" name="inquilino_id" className="input" value={inquilino} onChange={(e) => setInquilino(e.target.value)}>
          <OpcoesOcupacao inquilinos={inquilinos} />
        </select>
        {inquilino === "disponivel" && (
          <p className="mt-1.5 text-[13px] text-stone-600">
            A sala será anunciada na <a href="/" target="_blank" rel="noreferrer" className="link">página inicial</a> como disponível para aluguel, com as fotos abaixo.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="label mb-0">Fotos da sala</span>
        {fotos.length > 0 && (
          <GradeOrdenavel
            itens={fotos.map((f) => ({ chave: f.url, src: f.url, alt: f.arquivo.name }))}
            aoMover={(de, para) => setFotos((atual) => mover(atual, de, para))}
            aoRemover={(i) =>
              setFotos((atual) => {
                URL.revokeObjectURL(atual[i]!.url);
                return atual.filter((_, j) => j !== i);
              })
            }
          />
        )}
        <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center text-[13px] text-stone-600 hover:bg-stone-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 17l-5-5-9 8" />
          </svg>
          <b className="text-stone-900">{fotos.length ? "Adicionar mais fotos" : "Escolher fotos da sala"}</b>
          Várias de uma vez · até 10 MB cada
          {/* Sem "name": as fotos sobem direto para o Storage depois que a sala é criada */}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={escolherFotos} />
        </label>
      </div>

      {comContrato && (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <legend className="px-1 text-sm font-semibold">Contrato</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="ns-assin">Data de assinatura</label>
              <input id="ns-assin" name="data_assinatura" type="date" defaultValue={hoje} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ns-ini">Início</label>
              <input id="ns-ini" name="data_inicio" type="date" required defaultValue={hoje} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ns-fim">Vencimento do contrato</label>
              <input id="ns-fim" name="data_fim" type="date" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ns-dia">Vencimento da mensalidade</label>
              <select id="ns-dia" name="dia_vencimento" required defaultValue="10" className="input">
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>todo dia {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ns-multa">Multa por atraso (%)</label>
              <input id="ns-multa" name="multa_percentual" defaultValue={String(padroes.multa).replace(".", ",")} inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ns-juros">Juros ao mês (%)</label>
              <input id="ns-juros" name="juros_mensal_percentual" defaultValue={String(padroes.juros).replace(".", ",")} inputMode="decimal" className="input" />
            </div>
          </div>
          <CamposFiador prefixo="ns" />
          <p className="text-[13px] text-stone-600">
            As mensalidades desde o início do contrato são lançadas automaticamente. Depois de cadastrar, anexe o PDF do contrato assinado e as fotos da vistoria.
          </p>
        </fieldset>
      )}

      {estado?.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
      {erroFotos && <p className="text-sm text-red-700">{erroFotos}</p>}
      <div className="flex items-center gap-3">
        <BotaoCadastrar />
        {enviando && <span className="text-sm text-stone-600">{enviando}</span>}
      </div>
    </form>
  );
}

function mover<T>(lista: T[], de: number, para: number) {
  if (para < 0 || para >= lista.length || de === para) return lista;
  const nova = [...lista];
  const [item] = nova.splice(de, 1);
  nova.splice(para, 0, item!);
  return nova;
}

/**
 * Grade de fotos em que se escolhe a ordem: arrastando ou pelas setas.
 * A primeira foto é a capa (aparece em destaque no anúncio da sala).
 */
function GradeOrdenavel({
  itens,
  aoMover,
  aoRemover,
  desabilitado = false,
}: {
  itens: { chave: string; src: string; alt: string }[];
  aoMover: (de: number, para: number) => void;
  aoRemover: (i: number) => void;
  desabilitado?: boolean;
}) {
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const botao = "grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-sm font-bold shadow disabled:opacity-40";

  return (
    <div className="flex flex-col gap-1.5">
      <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {itens.map((item, i) => (
          <li
            key={item.chave}
            draggable={!desabilitado}
            onDragStart={() => setArrastando(i)}
            onDragOver={(e) => {
              e.preventDefault();
              setSobre(i);
            }}
            onDragLeave={() => setSobre((s) => (s === i ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              if (arrastando !== null) aoMover(arrastando, i);
              setArrastando(null);
              setSobre(null);
            }}
            onDragEnd={() => {
              setArrastando(null);
              setSobre(null);
            }}
            className={`relative flex cursor-grab flex-col gap-1 rounded-xl p-1 transition active:cursor-grabbing ${
              sobre === i && arrastando !== i ? "bg-brand-100 ring-2 ring-brand-600" : ""
            } ${arrastando === i ? "opacity-50" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} draggable={false} className="aspect-[4/3] w-full rounded-lg border border-stone-200 object-cover" />
            <span
              className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                i === 0 ? "bg-brand-600 text-white" : "bg-white/95 text-stone-800"
              }`}
            >
              {i === 0 ? "Capa" : `${i + 1}º`}
            </span>
            <div className="flex items-center justify-between gap-1">
              <div className="flex gap-1">
                <button type="button" className={`${botao} text-stone-800`} disabled={desabilitado || i === 0} onClick={() => aoMover(i, i - 1)} aria-label={`Mover foto ${i + 1} para antes`}>
                  ←
                </button>
                <button type="button" className={`${botao} text-stone-800`} disabled={desabilitado || i === itens.length - 1} onClick={() => aoMover(i, i + 1)} aria-label={`Mover foto ${i + 1} para depois`}>
                  →
                </button>
              </div>
              <button type="button" className={`${botao} text-red-700`} disabled={desabilitado} onClick={() => aoRemover(i)} aria-label={`Remover foto ${i + 1}`}>
                ×
              </button>
            </div>
          </li>
        ))}
      </ol>
      {itens.length > 1 && <p className="text-xs text-stone-600">Arraste as fotos ou use as setas para mudar a ordem. A primeira é a capa do anúncio.</p>}
    </div>
  );
}

/** Fotos de uma sala já cadastrada: reordenar (salva na hora) e excluir. */
export function FotosSala({ fotos }: { fotos: { id: string; url: string; legenda: string | null }[] }) {
  const [lista, setLista] = useState(fotos);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  // Acompanha fotos novas enviadas ou removidas pelo servidor
  useEffect(() => setLista(fotos), [fotos]);

  async function aoMover(de: number, para: number) {
    const nova = mover(lista, de, para);
    if (nova === lista) return;
    setLista(nova);
    setSalvando(true);
    const falha = await reordenarFotos(nova.map((f) => f.id));
    setSalvando(false);
    setErro(falha ? `Não foi possível salvar a ordem: ${falha}` : null);
    if (falha) setLista(lista);
  }

  async function aoRemover(i: number) {
    const foto = lista[i]!;
    if (!window.confirm("Excluir esta foto?")) return;
    setLista((atual) => atual.filter((f) => f.id !== foto.id));
    await excluirFoto(foto.id);
    router.refresh();
  }

  if (!lista.length) {
    return <p className="rounded-lg border border-dashed border-stone-300 px-3 py-5 text-center text-sm text-stone-600">Nenhuma foto.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <GradeOrdenavel
        itens={lista.map((f, i) => ({ chave: f.id, src: f.url, alt: f.legenda || `Foto ${i + 1}` }))}
        aoMover={aoMover}
        aoRemover={aoRemover}
        desabilitado={salvando}
      />
      {salvando && <span className="text-xs text-stone-600">Salvando a ordem...</span>}
      {erro && <span className="text-xs text-red-700">{erro}</span>}
    </div>
  );
}

export const ANDARES = ["Térreo", "1º andar"];

/** Opções do campo "Andar". Um valor antigo fora da lista continua aparecendo para não se perder. */
export function OpcoesAndar({ atual }: { atual?: string | null }) {
  return (
    <>
      {atual === "" || atual === null ? <option value="">Não informado</option> : null}
      {atual && !ANDARES.includes(atual) && <option value={atual}>{atual}</option>}
      {ANDARES.map((a) => (
        <option key={a} value={a}>{a}</option>
      ))}
    </>
  );
}

/** Opções do campo "Inquilino" de uma sala (também usadas na edição). */
export function OpcoesOcupacao({ inquilinos }: { inquilinos: InquilinoOpcao[] }) {
  return (
    <>
      <option value="">Sem inquilino (não anunciar)</option>
      <option value="disponivel">Disponível para aluguel (anunciar na página inicial)</option>
      <optgroup label="Inquilinos">
        {inquilinos.map((i) => (
          <option key={i.id} value={i.id}>{i.nome || i.email}</option>
        ))}
      </optgroup>
    </>
  );
}

const TIPOS = [
  { v: "entrada", r: "Vistoria de entrada" },
  { v: "dano", r: "Registro de dano" },
  { v: "saida", r: "Vistoria de saída" },
];

/** Envia uma ou várias fotos da vistoria de uma sala, com tipo, data e legenda. */
export function UploadVistoria({ salaId, hoje }: { salaId: string; hoje: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("entrada");
  const [data, setData] = useState(hoje);
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!arquivos.length) return;
    const grandes = arquivos.filter((a) => a.size > TAMANHO_MAXIMO);
    if (grandes.length) {
      setErro(`Fotos acima de 10 MB não foram enviadas: ${grandes.map((g) => g.name).join(", ")}`);
    } else {
      setErro(null);
    }
    const supabase = createClient();
    const validos = arquivos.filter((a) => a.size <= TAMANHO_MAXIMO);
    for (const [i, arquivo] of validos.entries()) {
      setEnviando(`Enviando ${i + 1} de ${validos.length}...`);
      const path = `${salaId}/${nomeSeguro(arquivo.name)}`;
      const { error } = await supabase.storage.from("vistorias").upload(path, arquivo, { upsert: false });
      const falha = error ? error.message : await registrarFotoVistoria(salaId, path, { tipo, legenda, registradaEm: data });
      if (falha) {
        setErro(`Falha ao enviar ${arquivo.name}: ${falha}`);
        break;
      }
    }
    setEnviando(null);
    setLegenda("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor={`vt-tipo-${salaId}`}>Tipo</label>
          <select id={`vt-tipo-${salaId}`} className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.r}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`vt-data-${salaId}`}>Data</label>
          <input id={`vt-data-${salaId}`} type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`vt-leg-${salaId}`}>Descrição (opcional)</label>
        <input
          id={`vt-leg-${salaId}`}
          className="input"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          placeholder="Ex.: piso sem trincas, parede sem manchas"
        />
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={aoEscolher} />
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" className="btn-primary btn-sm" disabled={Boolean(enviando)} onClick={() => input.current?.click()}>
          {enviando ?? "Adicionar fotos da vistoria"}
        </button>
        <span className="text-xs text-stone-600">Pode escolher várias fotos de uma vez · até 10 MB cada</span>
      </div>
      {erro && <p className="text-xs text-red-700">{erro}</p>}
    </div>
  );
}
