import { exigirPerfil, urlsAssinadas } from "@/lib/auth";
import { dadosFinanceirosInquilino } from "@/lib/dados";
import { brl, dataBR } from "@/lib/format";
import type { Aditivo } from "@/lib/types";
import { PageHeader, Vazio } from "@/components/ui";

export default async function ContratosInquilino() {
  const { supabase, perfil } = await exigirPerfil("inquilino");
  const { contratos } = await dadosFinanceirosInquilino(supabase, perfil.id);
  const { data: ads } = contratos.length
    ? await supabase
        .from("aditivos")
        .select("*")
        .in("contrato_id", contratos.map((c) => c.id))
        .order("data", { ascending: false })
    : { data: [] };
  const aditivos = (ads ?? []) as Aditivo[];
  const { data: salas } = await supabase.from("salas").select("id, nome");
  const nomeSala = new Map((salas ?? []).map((s) => [s.id, s.nome as string]));
  const urls = await urlsAssinadas(supabase, "contratos", [
    ...contratos.map((c) => c.arquivo_path),
    ...aditivos.map((a) => a.arquivo_path),
  ]);

  return (
    <>
      <PageHeader titulo="Contratos e aditivos" descricao="Documentos do seu contrato de locação." />
      {!contratos.length && <Vazio>Nenhum contrato cadastrado ainda.</Vazio>}
      <div className="space-y-4">
        {contratos.map((c) => {
          const meusAditivos = aditivos.filter((a) => a.contrato_id === c.id);
          return (
            <div key={c.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-stone-900">
                    Contrato {c.sala_id ? `— ${nomeSala.get(c.sala_id) ?? "Sala"}` : ""}
                    {!c.ativo && <span className="ml-2 text-xs font-normal text-stone-600">(encerrado)</span>}
                  </h2>
                  <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                    <div><dt className="text-stone-600">Início</dt><dd className="font-medium">{dataBR(c.data_inicio)}</dd></div>
                    <div><dt className="text-stone-600">Vencimento do contrato</dt><dd className="font-medium">{dataBR(c.data_fim)}</dd></div>
                    <div><dt className="text-stone-600">Assinatura</dt><dd className="font-medium">{dataBR(c.data_assinatura)}</dd></div>
                    <div><dt className="text-stone-600">Aluguel</dt><dd className="font-medium">{brl(c.valor_mensal)}</dd></div>
                    <div><dt className="text-stone-600">Vencimento da mensalidade</dt><dd className="font-medium">Todo dia {c.dia_vencimento}</dd></div>
                    {c.fiador_nome && <div className="col-span-2"><dt className="text-stone-600">Fiador</dt><dd className="font-medium">{[c.fiador_nome, c.fiador_cpf].filter(Boolean).join(" · ")}</dd></div>}
                    <div><dt className="text-stone-600">Multa por atraso</dt><dd className="font-medium">{Number(c.multa_percentual)}%</dd></div>
                    <div><dt className="text-stone-600">Juros</dt><dd className="font-medium">{Number(c.juros_mensal_percentual)}% ao mês</dd></div>
                  </dl>
                </div>
                {c.arquivo_path && urls[c.arquivo_path] && (
                  <a href={urls[c.arquivo_path]} target="_blank" rel="noreferrer" className="btn-primary btn-sm">
                    Abrir contrato
                  </a>
                )}
              </div>
              <div className="mt-5 border-t border-stone-100 pt-4">
                <h3 className="mb-2 text-sm font-semibold text-stone-700">Aditivos contratuais</h3>
                {meusAditivos.length ? (
                  <ul className="divide-y divide-stone-100 text-sm">
                    {meusAditivos.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div>
                          <span className="font-medium">{a.titulo}</span>
                          <span className="ml-2 text-stone-600">{dataBR(a.data)}</span>
                          {a.descricao && <p className="text-stone-600">{a.descricao}</p>}
                        </div>
                        {a.arquivo_path && urls[a.arquivo_path] && (
                          <a href={urls[a.arquivo_path]} target="_blank" rel="noreferrer" className="link">abrir</a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-stone-600">Nenhum aditivo.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
