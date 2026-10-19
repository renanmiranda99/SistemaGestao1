"use client";

import { useState } from "react";

/** Botão que copia um texto (ex.: linha digitável) para a área de transferência. */
export function CopiarTexto({ texto, rotulo = "Copiar", className = "btn-secondary btn-sm" }: { texto: string; rotulo?: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          window.prompt("Copie o texto:", texto);
        }
      }}
    >
      {copiado ? "Copiado" : rotulo}
    </button>
  );
}
