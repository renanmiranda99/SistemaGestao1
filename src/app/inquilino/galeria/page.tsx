import { exigirPerfil, urlPublicaFoto } from "@/lib/auth";
import { brl, dataBR } from "@/lib/format";
import type { Aviso, Foto, Sala } from "@/lib/types";
import { PageHeader, Vazio } from "@/components/ui";

export default async function GaleriaInquilino() {
  const { supabase } = await exigirPerfil("inquilino");
  const [{ data: s }, { data: f }, { data: a }] = await Promise.all([
    supabase.from("salas").select("*").order("nome"),
    supabase.from("fotos").select("*").order("ordem"),
    supabase.from("avisos").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  const salas = (s ?? []) as Sala[];
  const fotos = (f ?? []) as Foto[];
  const avisos = (a ?? []) as Aviso[];
  const fotosComuns = fotos.filter((x) => !x.sala_id);

  return (
    <>
      <PageHeader titulo="A Galeria" descricao="Avisos, fotos e informações das salas." />

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Avisos</h2>
        {avisos.length ? (
          <div className="space-y-3">
            {avisos.map((av) => (
              <article key={av.id} className="card">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{av.titulo}</h3>
                  <span className="text-xs text-stone-600">{dataBR(av.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{av.conteudo}</p>
              </article>
            ))}
          </div>
        ) : (
          <Vazio>Nenhum aviso no momento.</Vazio>
        )}
      </section>

      {fotosComuns.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Áreas comuns</h2>
          <GradeFotos fotos={fotosComuns} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Salas</h2>
        {salas.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {salas.map((sala) => {
              const daSala = fotos.filter((x) => x.sala_id === sala.id);
              return (
                <div key={sala.id} className="card">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{sala.nome}</h3>
                    <span className={`text-xs ${sala.inquilino_id ? "text-stone-600" : "font-medium text-brand-600"}`}>
                      {sala.inquilino_id ? "Ocupada" : "Disponível"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {[sala.andar && `Andar ${sala.andar}`, sala.area_m2 && `${Number(sala.area_m2)} m²`, !sala.inquilino_id && sala.valor_aluguel && brl(sala.valor_aluguel)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {sala.descricao && <p className="mt-2 text-sm text-stone-600">{sala.descricao}</p>}
                  {daSala.length > 0 && <div className="mt-3"><GradeFotos fotos={daSala} /></div>}
                </div>
              );
            })}
          </div>
        ) : (
          <Vazio>Nenhuma sala cadastrada.</Vazio>
        )}
      </section>
    </>
  );
}

function GradeFotos({ fotos }: { fotos: Foto[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {fotos.map((f) => (
        <a key={f.id} href={urlPublicaFoto(f.storage_path)} target="_blank" rel="noreferrer" className="group block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlPublicaFoto(f.storage_path)}
            alt={f.legenda ?? "Foto"}
            className="aspect-[4/3] w-full rounded-lg object-cover transition group-hover:opacity-90"
          />
          {f.legenda && <span className="mt-1 block text-xs text-stone-600">{f.legenda}</span>}
        </a>
      ))}
    </div>
  );
}
