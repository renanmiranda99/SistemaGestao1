import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dataBR } from "@/lib/format";
import { CATEGORIAS } from "@/lib/chamados";
import type { Chamado } from "@/lib/types";
import { PageHeader, StatusBadge, Vazio } from "@/components/ui";
import { NovoChamado } from "./NovoChamado";

export default async function ChamadosInquilino() {
  const { supabase, perfil } = await exigirPerfil("inquilino");
  const [{ data: ch }, { data: salas }] = await Promise.all([
    supabase.from("chamados").select("*").eq("inquilino_id", perfil.id).order("created_at", { ascending: false }),
    supabase.from("salas").select("id, nome").eq("inquilino_id", perfil.id).order("nome"),
  ]);
  const chamados = (ch ?? []) as Chamado[];

  return (
    <>
      <PageHeader
        titulo="Chamados"
        descricao="Registre problemas, solicitações de manutenção ou dúvidas."
        acoes={<NovoChamado inquilinoId={perfil.id} salas={salas ?? []} />}
      />
      {chamados.length ? (
        <div className="card divide-y divide-stone-100 p-0">
          {chamados.map((c) => (
            <Link key={c.id} href={`/inquilino/chamados/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-stone-50">
              <div>
                <div className="font-medium text-stone-900">{c.titulo}</div>
                <div className="text-xs text-stone-600">{dataBR(c.created_at)} · {CATEGORIAS[c.categoria] ?? c.categoria}</div>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      ) : (
        <Vazio>Você ainda não abriu nenhum chamado.</Vazio>
      )}
    </>
  );
}
