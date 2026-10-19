import Link from "next/link";
import { notFound } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
import { urlsAssinadas } from "@/lib/auth";
import { dataHoraBR } from "@/lib/format";
import type { Chamado, ChamadoMensagem } from "@/lib/types";
import { alterarStatusChamado, enviarMensagemChamado } from "@/app/chamados-actions";
import { StatusBadge } from "./ui";
import { CATEGORIAS } from "@/lib/chamados";

export async function ChamadoDetalhe({
  supabase,
  id,
  modo,
}: {
  supabase: ReturnType<typeof createClient>;
  id: string;
  modo: "admin" | "inquilino";
}) {
  const { data } = await supabase.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const chamado = data as Chamado;
  const [{ data: msgs }, { data: inq }, { data: sala }] = await Promise.all([
    supabase.from("chamado_mensagens").select("*").eq("chamado_id", id).order("created_at"),
    supabase.from("profiles").select("nome, email, telefone").eq("id", chamado.inquilino_id).maybeSingle(),
    chamado.sala_id
      ? supabase.from("salas").select("nome").eq("id", chamado.sala_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const mensagens = (msgs ?? []) as ChamadoMensagem[];
  const urls = await urlsAssinadas(supabase, "chamados", [chamado.foto_path]);
  const nomeInquilino = inq?.nome || inq?.email || "Inquilino";
  const voltar = modo === "admin" ? "/admin/chamados" : "/inquilino/chamados";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={voltar} className="link text-sm">← Voltar aos chamados</Link>
      <div className="card mt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">{chamado.titulo}</h1>
            <p className="mt-1 text-sm text-stone-600">
              Aberto em {dataHoraBR(chamado.created_at)} · {CATEGORIAS[chamado.categoria] ?? chamado.categoria}
              {sala?.nome && <> · {sala.nome}</>}
              {modo === "admin" && <> · {nomeInquilino}</>}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={chamado.prioridade} />
            <StatusBadge status={chamado.status} />
          </div>
        </div>
        <p className="mt-4 whitespace-pre-line text-sm text-stone-700">{chamado.descricao}</p>
        {chamado.foto_path && urls[chamado.foto_path] && (
          <a href={urls[chamado.foto_path]} target="_blank" rel="noreferrer" className="mt-4 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[chamado.foto_path]} alt="Foto do problema" className="max-h-80 rounded-lg border object-contain" />
          </a>
        )}
        {modo === "admin" && (
          <form action={alterarStatusChamado.bind(null, chamado.id)} className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-4">
            <label className="text-sm text-stone-600" htmlFor="status">Status:</label>
            <select id="status" name="status" defaultValue={chamado.status} className="input w-auto">
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em andamento</option>
              <option value="resolvido">Resolvido</option>
              <option value="fechado">Fechado</option>
            </select>
            <button className="btn-secondary btn-sm">Salvar</button>
          </form>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-stone-600">Conversa</h2>
      <div className="space-y-3">
        {mensagens.map((m) => {
          const doInquilino = m.autor_id === chamado.inquilino_id;
          const minha = (modo === "inquilino") === doInquilino;
          return (
            <div key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${minha ? "bg-brand-600 text-white" : "border border-stone-200 bg-white"}`}>
                <div className={`mb-0.5 text-xs ${minha ? "text-brand-100" : "text-stone-600"}`}>
                  {doInquilino ? nomeInquilino : "Administração"} · {dataHoraBR(m.created_at)}
                </div>
                <p className="whitespace-pre-line">{m.mensagem}</p>
              </div>
            </div>
          );
        })}
        {!mensagens.length && <p className="text-sm text-stone-600">Nenhuma mensagem ainda.</p>}
      </div>
      {chamado.status !== "fechado" && (
        <form action={enviarMensagemChamado.bind(null, chamado.id)} className="mt-4 flex gap-2">
          <textarea name="mensagem" rows={2} required className="input" placeholder="Escreva uma mensagem..." />
          <button className="btn-primary self-end">Enviar</button>
        </form>
      )}
    </div>
  );
}
