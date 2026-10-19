import { exigirPerfil, urlPublicaFoto } from "@/lib/auth";
import { brl, dataBR } from "@/lib/format";
import type { Aviso, Foto, Profile, Sala } from "@/lib/types";
import { excluirAviso, excluirFoto, excluirSala, publicarAviso, salvarSala } from "../actions";
import { PageHeader, Vazio } from "@/components/ui";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { UploadFoto } from "@/components/AdminUploads";

export default async function GaleriaAdmin() {
  const { supabase } = await exigirPerfil("admin");
  const [{ data: s }, { data: f }, { data: a }, { data: p }] = await Promise.all([
    supabase.from("salas").select("*").order("nome"),
    supabase.from("fotos").select("*").order("created_at"),
    supabase.from("avisos").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, nome, email").eq("role", "inquilino").eq("ativo", true).order("nome"),
  ]);
  const salas = (s ?? []) as Sala[];
  const fotos = (f ?? []) as Foto[];
  const avisos = (a ?? []) as Aviso[];
  const inquilinos = (p ?? []) as Pick<Profile, "id" | "nome" | "email">[];

  return (
    <>
      <PageHeader titulo="Galeria e salas" descricao="Salas, fotos e avisos que os inquilinos veem no portal." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold">Avisos</h2>
          <form action={publicarAviso} className="mb-4 space-y-2">
            <input name="titulo" required placeholder="Título" className="input" />
            <textarea name="conteudo" required rows={3} placeholder="Texto do aviso" className="input" />
            <button className="btn-primary btn-sm">Publicar aviso</button>
          </form>
          <ul className="divide-y divide-stone-100 text-sm">
            {avisos.map((av) => (
              <li key={av.id} className="flex items-start justify-between gap-2 py-2">
                <div>
                  <div className="font-medium">{av.titulo} <span className="text-xs font-normal text-slate-400">{dataBR(av.created_at)}</span></div>
                  <p className="line-clamp-2 text-slate-500">{av.conteudo}</p>
                </div>
                <form action={excluirAviso.bind(null, av.id)}>
                  <BotaoConfirmar mensagem="Excluir aviso?" className="btn-secondary btn-sm text-red-600">Excluir</BotaoConfirmar>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Fotos das áreas comuns</h2>
            <UploadFoto salaId={null} />
          </div>
          <Fotos fotos={fotos.filter((x) => !x.sala_id)} />
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Salas ({salas.length})</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {salas.map((sala) => (
            <div key={sala.id} className="card">
              <FormSala sala={sala} inquilinos={inquilinos} />
              <div className="mt-4 border-t border-stone-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Fotos</span>
                  <UploadFoto salaId={sala.id} />
                </div>
                <Fotos fotos={fotos.filter((x) => x.sala_id === sala.id)} />
              </div>
              <form action={excluirSala.bind(null, sala.id)} className="mt-3 text-right">
                <BotaoConfirmar mensagem={`Excluir ${sala.nome} e suas fotos?`} className="btn-secondary btn-sm text-red-600">Excluir sala</BotaoConfirmar>
              </form>
            </div>
          ))}
          <div className="card border-dashed">
            <h3 className="mb-3 font-semibold">Nova sala</h3>
            <FormSala sala={null} inquilinos={inquilinos} />
          </div>
        </div>
      </section>
    </>
  );
}

function FormSala({ sala, inquilinos }: { sala: Sala | null; inquilinos: Pick<Profile, "id" | "nome" | "email">[] }) {
  return (
    <form action={salvarSala.bind(null, sala?.id ?? null)} className="grid gap-2 sm:grid-cols-2">
      <input name="nome" required defaultValue={sala?.nome} placeholder="Nome (ex.: Sala 101)" className="input" />
      <input name="andar" defaultValue={sala?.andar ?? ""} placeholder="Andar" className="input" />
      <input name="area_m2" defaultValue={sala?.area_m2 ?? ""} placeholder="Área (m²)" className="input" />
      <input name="valor_aluguel" defaultValue={sala?.valor_aluguel ? String(sala.valor_aluguel).replace(".", ",") : ""} placeholder="Aluguel de referência (R$)" className="input" title={sala?.valor_aluguel ? brl(sala.valor_aluguel) : ""} />
      <select name="inquilino_id" defaultValue={sala?.inquilino_id ?? ""} className="input sm:col-span-2">
        <option value="">Disponível (sem inquilino)</option>
        {inquilinos.map((i) => <option key={i.id} value={i.id}>{i.nome || i.email}</option>)}
      </select>
      <textarea name="descricao" defaultValue={sala?.descricao ?? ""} rows={2} placeholder="Descrição" className="input sm:col-span-2" />
      <div className="sm:col-span-2"><button className="btn-primary btn-sm">{sala ? "Salvar" : "Cadastrar sala"}</button></div>
    </form>
  );
}

function Fotos({ fotos }: { fotos: Foto[] }) {
  if (!fotos.length) return <Vazio>Nenhuma foto.</Vazio>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {fotos.map((f) => (
        <div key={f.id} className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlPublicaFoto(f.storage_path)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
          <form action={excluirFoto.bind(null, f.id)} className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100">
            <BotaoConfirmar mensagem="Excluir foto?" className="btn-danger btn-sm px-2 py-0.5">×</BotaoConfirmar>
          </form>
        </div>
      ))}
    </div>
  );
}
