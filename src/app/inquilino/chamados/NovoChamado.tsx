"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nomeSeguro, TAMANHO_MAXIMO } from "@/lib/arquivos";
import { CATEGORIAS } from "@/lib/chamados";

export function NovoChamado({ inquilinoId, salas }: { inquilinoId: string; salas: { id: string; nome: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const foto = form.get("foto") as File | null;
    setErro(null);
    setEnviando(true);
    const supabase = createClient();

    let foto_path: string | null = null;
    if (foto && foto.size > 0) {
      if (foto.size > TAMANHO_MAXIMO) {
        setErro("A foto deve ter no máximo 10 MB.");
        setEnviando(false);
        return;
      }
      foto_path = `${inquilinoId}/${nomeSeguro(foto.name)}`;
      const { error } = await supabase.storage.from("chamados").upload(foto_path, foto);
      if (error) {
        setErro(`Falha ao enviar foto: ${error.message}`);
        setEnviando(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("chamados")
      .insert({
        inquilino_id: inquilinoId,
        sala_id: (form.get("sala_id") as string) || null,
        titulo: String(form.get("titulo")),
        descricao: String(form.get("descricao")),
        categoria: String(form.get("categoria")),
        prioridade: String(form.get("prioridade")),
        foto_path,
      })
      .select("id")
      .single();
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.push(`/inquilino/chamados/${data.id}`);
    router.refresh();
  }

  if (!aberto) {
    return (
      <button className="btn-primary" onClick={() => setAberto(true)}>
        + Abrir chamado
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="card mb-6 w-full space-y-4">
      <h2 className="font-semibold">Novo chamado</h2>
      <div>
        <label className="label" htmlFor="titulo">Título</label>
        <input id="titulo" name="titulo" className="input" required placeholder="Ex.: Lâmpada queimada na entrada da sala" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="categoria">Categoria</label>
          <select id="categoria" name="categoria" className="input" defaultValue="outros">
            {Object.entries(CATEGORIAS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="prioridade">Prioridade</label>
          <select id="prioridade" name="prioridade" className="input" defaultValue="media">
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sala_id">Sala</label>
          <select id="sala_id" name="sala_id" className="input" defaultValue={salas[0]?.id ?? ""}>
            <option value="">Área comum / Outra</option>
            {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="descricao">Descreva o problema</label>
        <textarea id="descricao" name="descricao" rows={4} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="foto">Foto (opcional)</label>
        <input id="foto" name="foto" type="file" accept="image/*" className="text-sm" />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={enviando}>{enviando ? "Enviando..." : "Registrar chamado"}</button>
        <button type="button" className="btn-secondary" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
