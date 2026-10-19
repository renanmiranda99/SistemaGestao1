"use client";

import { useState } from "react";
import { enviarWhatsApp } from "@/app/admin/actions";
import { linkWhatsApp } from "@/lib/whatsapp";

export function BotaoWhatsApp({
  inquilinoId,
  cobrancaId,
  telefone,
  mensagem,
  apiConfigurada,
  rotulo = "WhatsApp",
}: {
  inquilinoId: string;
  cobrancaId?: string | null;
  telefone: string | null;
  mensagem: string;
  apiConfigurada: boolean;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(mensagem);
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "erro">("");
  const [erro, setErro] = useState("");

  if (!telefone) {
    return <span className="text-xs text-stone-600" title="Cadastre o telefone do inquilino">sem telefone</span>;
  }

  async function enviar() {
    setEstado("enviando");
    if (!apiConfigurada) {
      // Abre já (antes de qualquer await) para o navegador não bloquear a janela
      window.open(linkWhatsApp(telefone, texto), "_blank", "noopener");
    }
    const r = await enviarWhatsApp({ inquilinoId, cobrancaId, telefone: telefone!, mensagem: texto });
    if (r.ok) {
      setEstado("ok");
      setTimeout(() => setAberto(false), 1200);
    } else {
      setEstado("erro");
      setErro(r.erro ?? "Falha no envio");
    }
  }

  return (
    <span className="relative inline-block">
      <button type="button" className="btn-whatsapp btn-sm" onClick={() => { setAberto(!aberto); setEstado(""); }}>
        {rotulo}
      </button>
      {aberto && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg">
          <textarea className="input text-xs" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-stone-600">
              {estado === "ok"
                ? "Enviado ✓"
                : estado === "erro"
                  ? <span className="text-red-600">{erro}</span>
                  : apiConfigurada ? "Envio automático pela API" : "Abre o WhatsApp com a mensagem"}
            </span>
            <div className="flex gap-1">
              <button type="button" className="btn-secondary btn-sm" onClick={() => setAberto(false)}>Fechar</button>
              <button type="button" className="btn-whatsapp btn-sm" disabled={estado === "enviando"} onClick={enviar}>
                {estado === "enviando" ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
