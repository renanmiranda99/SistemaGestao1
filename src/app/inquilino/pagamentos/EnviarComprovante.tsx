"use client";

import { UploadArquivo } from "@/components/UploadArquivo";
import { createClient } from "@/lib/supabase/client";

export function EnviarComprovante({ cobrancaId, inquilinoId }: { cobrancaId: string; inquilinoId: string }) {
  return (
    <UploadArquivo
      bucket="comprovantes"
      pasta={`${inquilinoId}/${cobrancaId}`}
      rotulo="Enviar comprovante"
      className="btn-primary btn-sm"
      aoEnviar={async (path) => {
        const supabase = createClient();
        const { error } = await supabase.from("comprovantes").insert({
          cobranca_id: cobrancaId,
          inquilino_id: inquilinoId,
          arquivo_path: path,
        });
        return error ? `Erro ao registrar: ${error.message}` : null;
      }}
    />
  );
}
