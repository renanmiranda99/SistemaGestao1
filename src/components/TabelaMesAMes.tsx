import { situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, mesAnoLongo } from "@/lib/format";
import type { Cobranca, Contrato } from "@/lib/types";
import { SituacaoBadge } from "./ui";

export function TabelaMesAMes({
  cobrancas,
  contratoDe,
  hoje,
}: {
  cobrancas: Cobranca[];
  contratoDe: (c: Cobranca) => Contrato | null;
  hoje: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Mês</th>
            <th>Vencimento</th>
            <th className="text-right">Valor</th>
            <th className="text-right">Valor atualizado</th>
            <th>Situação</th>
            <th>Pago em</th>
          </tr>
        </thead>
        <tbody>
          {cobrancas.map((c) => {
            const v = valorAtualizado(c, contratoDe(c), hoje);
            return (
              <tr key={c.id}>
                <td className="font-medium capitalize">{mesAnoLongo(c.competencia)}</td>
                <td>{dataBR(c.vencimento)}</td>
                <td className="text-right">{brl(c.valor)}</td>
                <td className="text-right">
                  {v.total !== v.base ? (
                    <span title={`Multa ${brl(v.multa)} + juros ${brl(v.juros)} (${v.dias} dias)`} className="font-medium text-red-700">
                      {brl(v.total)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td><SituacaoBadge situacao={situacao(c, hoje)} /></td>
                <td>{dataBR(c.pago_em)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
