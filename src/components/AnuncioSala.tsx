"use client";

import { useCallback, useEffect, useRef, useState } from "react";


export type DadosAnuncio = {
  id: string;
  nome: string;
  valor: string | null;
  detalhes: string;
  descricao: string | null;
  fotos: { url: string; alt: string }[];
  linkInteresse: string | null;
};

/**
 * Card de uma sala disponível. Ao clicar, abre as fotos no centro da tela,
 * com setas para passar e as informações da sala numa moldura abaixo da foto.
 */
export function AnuncioSala({ sala }: { sala: DadosAnuncio }) {
  const [aberto, setAberto] = useState<number | null>(null);
  const fecharVisualizador = useCallback(() => setAberto(null), []);
  const [capa, ...outras] = sala.fotos;

  return (
    <>
      <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-stone-300 hover:shadow-md">
        <button
          type="button"
          onClick={() => setAberto(0)}
          className="flex flex-1 flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
          aria-label={`Ver fotos e detalhes da ${sala.nome}`}
        >
          <div className="relative w-full">
            {capa ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capa.url} alt={capa.alt} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center bg-stone-100 text-sm text-stone-600">Fotos em breve</div>
            )}
            {sala.fotos.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full bg-brand-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                {sala.fotos.length} fotos
              </span>
            )}
          </div>
          {outras.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 px-3 pt-3" aria-hidden="true">
              {outras.slice(0, 4).map((f, i) => (
                <span key={f.url} className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  {i === 3 && outras.length > 4 && (
                    <span className="absolute inset-0 grid place-items-center rounded-lg bg-brand-900/60 text-sm font-semibold text-white">
                      +{outras.length - 4}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2 p-4">
            <Cabecalho sala={sala} />
            {sala.descricao && <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{sala.descricao}</p>}
            <span className="mt-auto pt-1 text-sm font-semibold text-brand-600 group-hover:underline">Ver fotos e detalhes</span>
          </div>
        </button>
        {sala.linkInteresse && (
          <div className="px-4 pb-4">
            <a href={sala.linkInteresse} target="_blank" rel="noreferrer" className="btn-primary w-full">Tenho interesse</a>
          </div>
        )}
      </article>

      {aberto !== null && <Visualizador sala={sala} inicio={aberto} aoFechar={fecharVisualizador} />}
    </>
  );
}

function Cabecalho({ sala }: { sala: DadosAnuncio }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-stone-900">{sala.nome}</h3>
        {sala.detalhes && <p className="text-[13px] text-stone-600">{sala.detalhes}</p>}
      </div>
      {sala.valor && (
        <span className="shrink-0 text-right">
          <span className="block text-lg font-bold leading-tight text-stone-900">{sala.valor}</span>
          <span className="text-xs text-stone-600">por mês</span>
        </span>
      )}
    </div>
  );
}

function Visualizador({ sala, inicio, aoFechar }: { sala: DadosAnuncio; inicio: number; aoFechar: () => void }) {
  const [atual, setAtual] = useState(inicio);
  const total = sala.fotos.length;
  const foto = sala.fotos[atual];
  const fechar = useRef<HTMLButtonElement>(null);
  const toque = useRef<number | null>(null);

  const passar = useCallback((d: number) => setAtual((i) => (total ? (i + d + total) % total : 0)), [total]);

  // Teclado (Esc fecha, setas passam), trava a rolagem do fundo e devolve o foco ao fechar
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    fechar.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      else if (e.key === "ArrowRight") passar(1);
      else if (e.key === "ArrowLeft") passar(-1);
    };
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
      anterior?.focus();
    };
  }, [aoFechar, passar]);

  const seta =
    "absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-900 shadow-lg transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1626]/85 p-3 backdrop-blur-sm sm:p-6"
      onClick={aoFechar}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos da ${sala.nome}`}
    >
      {/* Moldura: foto em cima, informações embaixo */}
      <div
        className="flex max-h-full w-full max-w-[960px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center bg-[#0f1b2d]"
          onTouchStart={(e) => (toque.current = e.touches[0]!.clientX)}
          onTouchEnd={(e) => {
            if (toque.current === null) return;
            const dx = e.changedTouches[0]!.clientX - toque.current;
            if (Math.abs(dx) > 40) passar(dx < 0 ? 1 : -1);
            toque.current = null;
          }}
        >
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto.url} alt={foto.alt} className="max-h-[62vh] w-full select-none object-contain" draggable={false} />
          ) : (
            <div className="grid h-64 w-full place-items-center text-sm text-[#b7c6da]">Fotos em breve</div>
          )}

          {total > 1 && (
            <>
              <button type="button" className={`${seta} left-3`} onClick={() => passar(-1)} aria-label="Foto anterior">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button type="button" className={`${seta} right-3`} onClick={() => passar(1)} aria-label="Próxima foto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white" aria-live="polite">
                {atual + 1} de {total}
              </span>
            </>
          )}

          <button
            ref={fechar}
            type="button"
            onClick={aoFechar}
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-stone-900 shadow-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-stone-50 px-4 py-3">
            {sala.fotos.map((f, i) => (
              <button
                key={f.url}
                type="button"
                onClick={() => setAtual(i)}
                className={`shrink-0 overflow-hidden rounded-lg ring-offset-2 transition ${i === atual ? "ring-2 ring-brand-600" : "opacity-70 hover:opacity-100"}`}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === atual}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="h-14 w-20 object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 overflow-y-auto p-5 sm:p-6">
          <Cabecalho sala={sala} />
          {sala.descricao && <p className="whitespace-pre-line text-[15px] leading-relaxed text-stone-700">{sala.descricao}</p>}
          {sala.linkInteresse && (
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={sala.linkInteresse} target="_blank" rel="noreferrer" className="btn-primary">Tenho interesse nesta sala</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
