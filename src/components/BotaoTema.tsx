"use client";

import { useEffect, useState } from "react";

/** Liga e desliga o modo escuro; a escolha fica salva neste navegador. */
export function BotaoTema({ claro = false, comTexto = false }: { claro?: boolean; comTexto?: boolean }) {
  const [escuro, setEscuro] = useState<boolean | null>(null);

  useEffect(() => setEscuro(document.documentElement.classList.contains("dark")), []);

  function alternar() {
    const novo = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "escuro" : "claro");
    } catch {
      // Sem acesso ao armazenamento (janela anônima): vale só até recarregar
    }
    setEscuro(novo);
  }

  const rotulo = escuro ? "Usar modo claro" : "Usar modo escuro";
  // Sobre o topo em degradê o botão fica claro; no resto, segue o tema
  const cores = claro
    ? "text-white/90 hover:bg-white/15 hover:text-white"
    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={comTexto ? undefined : rotulo}
      title={rotulo}
      className={`inline-flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${comTexto ? "w-full" : "w-11 justify-center px-0"} ${cores}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        {escuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
      {comTexto && <span className="flex-1 text-left">{escuro ? "Modo claro" : "Modo escuro"}</span>}
    </button>
  );
}

/**
 * Roda antes da página aparecer, para não piscar o tema errado:
 * usa a escolha salva ou, sem ela, o tema do sistema.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");if(t==="escuro"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
