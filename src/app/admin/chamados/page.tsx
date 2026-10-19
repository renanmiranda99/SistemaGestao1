import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dataBR } from "@/lib/format";
import { CATEGORIAS } from "@/lib/chamados";
import type { Chamado } from "@/lib/types";
import { PageHeader, StatusBadge, Vazio } from "@/components/ui";

const FILTROS = [
  { v: "abertos", r: "Em aberto" },
  { v: "resolvido", r: "Resolvidos" },
  { v: "fechado", r: "Fechados" },
  { v: "todos", r: "Todos" },
];

export default async function ChamadosAdmin({ searchParams }: { searchParams: { f?: string } }) {
  const { supabase } = await exigirPerfil("admin");
  const f = searchParams.f ?? "abertos";
  let q = supabase.from("chamados").select("*").order("created_at", { ascending: false });
  if (f === "abertos") q = q.in("status", ["aberto", "em_andamento"]);
  else if (f !== "todos") q = q.eq("status", f);
  const [{ data: ch }, { data: perfis }, { data: salas }] = await Promise.all([
    q,
    supabase.from("profiles").select("id, nome, email"),
    supabase.from("salas").select("id, nome"),
  ]);
  const chamados = (ch ?? []) as Chamado[];
  const nome = new Map((perfis ?? []).map((p) => [p.id as string, (p.nome || p.email) as string]));
  const sala = new Map((salas ?? []).map((s) => [s.id as string, s.nome as string]));

  return (
    <>
      <PageHeader titulo="Chamados" descricao="Problemas e solicitações registrados pelos inquilinos." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((x) => (
          <Link key={x.v} href={`/admin/chamados?f=${x.v}`} className={f === x.v ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
            {x.r}
          </Link>
        ))}
      </div>
      {chamados.length ? (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Aberto em</th><th>Título</th><th>Inquilino</th><th>Sala</th><th>Categoria</th><th>Prioridade</th><th>Status</th></tr></thead>
            <tbody>
              {chamados.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td>{dataBR(c.created_at)}</td>
                  <td><Link href={`/admin/chamados/${c.id}`} className="font-medium hover:underline">{c.titulo}</Link></td>
                  <td>{nome.get(c.inquilino_id) ?? "—"}</td>
                  <td>{c.sala_id ? sala.get(c.sala_id) : "Área comum"}</td>
                  <td>{CATEGORIAS[c.categoria] ?? c.categoria}</td>
                  <td><StatusBadge status={c.prioridade} /></td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio>Nenhum chamado aqui.</Vazio>
      )}
    </>
  );
}
