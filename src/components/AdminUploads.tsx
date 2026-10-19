"use client";

import { UploadArquivo } from "./UploadArquivo";
import { anexarArquivoAditivo, anexarArquivoContrato, registrarFoto } from "@/app/admin/actions";

export function UploadContrato({ contratoId, inquilinoId, temArquivo }: { contratoId: string; inquilinoId: string; temArquivo: boolean }) {
  return (
    <UploadArquivo
      bucket="contratos"
      pasta={`${inquilinoId}/contratos`}
      aceitar="application/pdf"
      rotulo={temArquivo ? "Substituir PDF" : "Anexar PDF do contrato"}
      aoEnviar={(path) => anexarArquivoContrato(contratoId, path)}
    />
  );
}

export function UploadAditivo({ aditivoId, inquilinoId, temArquivo }: { aditivoId: string; inquilinoId: string; temArquivo: boolean }) {
  return (
    <UploadArquivo
      bucket="contratos"
      pasta={`${inquilinoId}/aditivos`}
      aceitar="application/pdf"
      rotulo={temArquivo ? "Substituir PDF" : "Anexar PDF"}
      aoEnviar={(path) => anexarArquivoAditivo(aditivoId, path)}
    />
  );
}

export function UploadFoto({ salaId }: { salaId: string | null }) {
  return (
    <UploadArquivo
      bucket="fotos"
      pasta={salaId ? `salas/${salaId}` : "galeria"}
      aceitar="image/*"
      rotulo="+ Adicionar foto"
      aoEnviar={(path) => registrarFoto(salaId, path)}
    />
  );
}
