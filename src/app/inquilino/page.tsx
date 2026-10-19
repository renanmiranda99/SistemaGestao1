import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { dadosFinanceirosInquilino } from "@/lib/dados";
import { DIAS_TOLERANCIA, ehPendente, situacao, valorAtualizado } from "@/lib/cobranca";
import { brl, dataBR, diffDias, hojeISO, mesAnoLongo } from "@/lib/format";
import { Alerta, PageHeader, Stat, Vazio } from "@/components/ui";
import { TabelaMesAMes } from "@/components/TabelaMesAMes";

export default async function InquilinoInicio() {
  const { supabase, perfil } = await exigirPerfil("inquilino");
  const { contratos, cobrancas, multas, salas, contratoDe } = await dadosFinanceirosInquilino(supabase, perfil.id);
  const hoje = hojeISO();

  const contratoAtivo = contratos.find((c) => c.ativo);
  const pendentes = cobrancas.filter((c) => ehPendente(c, hoje));
  const emCobranca = pendentes.filter((c) => situacao(c, hoje) === "em_cobranca");
  const totalPendente = pendentes.reduce((s, c) => s + valorAtualizado(c, contratoDe(c), hoje).total, 0);
  const multasPendentes = multas.filter((m) => m.status === "pendente");
  const totalMultas = multasPendentes.reduce((s, m) => s + Number(m.valor), 0);
  const proxima = [...cobrancas]
    .filter((c) => c.status === "pendente" && diffDias(hoje, c.vencimento) >= 0)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];

  // "Mês a mês do que já deveria ter sido pago": tudo que venceu até hoje + o mês corrente
  const mesAtual = hoje.slice(0, 7) + "-01";
  const mesAMes = cobrancas.filter((c) => c.competencia <= mesAtual);

  return (
    <>
      <PageHeader
        titulo={`Olá, ${perfil.nome.split(" ")[0] || "inquilino"}!`}
        descricao={salas.length ? `Sala(s): ${salas.map((s) => s.nome).join(", ")}` : undefined}
      />

      {emCobranca.length > 0 && (
        <div className="mb-6">
          <Alerta tipo="erro">
            <strong>
              Você tem {emCobranca.length} boleto(s) em cobrança
            </strong>{" "}
            (mais de {DIAS_TOLERANCIA} dias após o vencimento). Regularize o pagamento e envie o comprovante em{" "}
            <Link href="/inquilino/pagamentos" className="font-semibold underline">Pagamentos</Link>.
          </Alerta>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Dia de vencimento"
          valor={contratoAtivo ? `Dia ${contratoAtivo.dia_vencimento}` : "—"}
          detalhe={contratoAtivo ? "de cada mês" : "Sem contrato ativo"}
        />
        <Stat
          rotulo="Próximo vencimento"
          valor={proxima ? dataBR(proxima.vencimento) : "—"}
          detalhe={proxima ? `${brl(proxima.valor)} · ${mesAnoLongo(proxima.competencia)}` : "Nada a vencer"}
          destaque="info"
        />
        <Stat
          rotulo="Pendências"
          valor={brl(totalPendente)}
          detalhe={`${pendentes.length} boleto(s) vencido(s), com multa e juros`}
          destaque={pendentes.length ? "alerta" : "ok"}
          href="/inquilino/pagamentos"
        />
        <Stat
          rotulo="Multas em aberto"
          valor={brl(totalMultas)}
          detalhe={`${multasPendentes.length} multa(s)`}
          destaque={multasPendentes.length ? "alerta" : undefined}
          href="/inquilino/multas"
        />
      </div>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Pagamentos mês a mês</h2>
          <Link href="/inquilino/pagamentos" className="link text-sm">Enviar comprovante →</Link>
        </div>
        {mesAMes.length ? (
          <TabelaMesAMes cobrancas={mesAMes} contratoDe={contratoDe} hoje={hoje} />
        ) : (
          <Vazio>Nenhuma cobrança lançada ainda.</Vazio>
        )}
      </section>
    </>
  );
}
