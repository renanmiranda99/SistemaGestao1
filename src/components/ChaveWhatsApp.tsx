"use client";

import { useState, useTransition } from "react";
import { alternarWhatsApp } from "@/app/admin/actions";

/** Interruptor que liga/desliga o envio de WhatsApp para um inquilino. */
export function ChaveWhatsApp({ inquilinoId, ativo, nome, comRotulo = false }: { inquilinoId: string; ativo: boolean; nome: string; comRotulo?: boolean }) {
  const [ligado, setLigado] = useState(ativo);
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function alternar() {
    const novo = !ligado;
    setLigado(novo);
    setErro(null);
    iniciar(async () => {
      const falha = await alternarWhatsApp(inquilinoId, novo);
      if (falha) {
        setLigado(!novo);
        setErro(falha);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label={`WhatsApp de ${nome}: ${ligado ? "ligado" : "desligado"}`}
        title={ligado ? "Recebe mensagens de WhatsApp. Clique para desligar." : "Não recebe mensagens de WhatsApp. Clique para ligar."}
        onClick={alternar}
        disabled={salvando}
        className="inline-flex min-h-9 items-center gap-2.5 rounded-full text-sm font-semibold disabled:opacity-60"
      >
        <span className={`relative h-6 w-11 rounded-full transition ${ligado ? "bg-[#1e8e4e]" : "bg-stone-300"}`} aria-hidden="true">
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${ligado ? "left-[22px]" : "left-0.5"}`} />
        </span>
        {comRotulo && <span className={ligado ? "text-[#0f5132]" : "text-stone-600"}>{ligado ? "WhatsApp ligado" : "WhatsApp desligado"}</span>}
      </button>
      {erro && <span className="max-w-[260px] text-xs text-red-700">{erro}</span>}
    </span>
  );
}
