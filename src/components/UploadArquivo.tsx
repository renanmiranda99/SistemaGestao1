"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nomeSeguro, TAMANHO_MAXIMO } from "@/lib/arquivos";

/**
 * Envia um arquivo para o Storage e depois chama `aoEnviar(path)` para gravar o registro no banco.
 * `pasta` deve começar com o id do dono quando o bucket exige (ex.: "<inquilino_id>/...").
 */
export function UploadArquivo({
  bucket,
  pasta,
  rotulo = "Enviar arquivo",
  aceitar = "application/pdf,image/*",
  aoEnviar,
  className = "btn-secondary btn-sm",
}: {
  bucket: string;
  pasta: string;
  rotulo?: string;
  aceitar?: string;
  aoEnviar: (path: string, arquivo: File) => Promise<string | null | void>;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro("Arquivo maior que 10 MB.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const supabase = createClient();
    const path = `${pasta.replace(/\/$/, "")}/${nomeSeguro(arquivo.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, arquivo, { upsert: false });
    if (error) {
      setErro(`Falha no envio: ${error.message}`);
      setEnviando(false);
      return;
    }
    const falha = await aoEnviar(path, arquivo);
    setEnviando(false);
    if (falha) {
      setErro(falha);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <input ref={input} type="file" accept={aceitar} className="hidden" onChange={aoEscolher} />
      <button type="button" className={className} disabled={enviando} onClick={() => input.current?.click()}>
        {enviando ? "Enviando..." : rotulo}
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </span>
  );
}
