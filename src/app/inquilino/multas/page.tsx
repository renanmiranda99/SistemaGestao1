import { exigirPerfil } from "@/lib/auth";
import { dadosFinanceirosInquilino } from "@/lib/dados";
import { brl, dataBR, mesAnoLongo } from "@/lib/format";
import { PageHeader, StatusBadge, Vazio } from "@/components/ui";

export default async function MultasInquilino() {
  const { supabase, perfil } = await exigirPerfil("inquilino");
  const { multas, cobrancas } = await dadosFinanceirosInquilino(supabase, perfil.id);
  const cobrancaPorId = new Map(cobrancas.map((c) => [c.id, c]));
  const emAberto = multas.filter((m) => m.status === "pendente").reduce((s, m) => s + Number(m.valor), 0);

  return (
    <>
      <PageHeader titulo="Multas" descricao={`Total em aberto: ${brl(emAberto)}`} />
      {multas.length ? (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Referente a</th>
                <th className="text-right">Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {multas.map((m) => {
                const cob = m.cobranca_id ? cobrancaPorId.get(m.cobranca_id) : null;
                return (
                  <tr key={m.id}>
                    <td>{dataBR(m.data)}</td>
                    <td>{m.descricao}</td>
                    <td className="capitalize">{cob ? mesAnoLongo(cob.competencia) : "—"}</td>
                    <td className="text-right font-medium">{brl(m.valor)}</td>
                    <td><StatusBadge status={m.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio>Você não possui multas. 🎉</Vazio>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Multa e juros por atraso de boleto já aparecem no valor atualizado de cada pagamento. Aqui ficam as multas
        lançadas pela administração (ex.: descumprimento de regras da galeria).
      </p>
    </>
  );
}
