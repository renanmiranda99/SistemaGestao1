import { brl, dataBR, diffDias, hojeISO } from "./format";
import type { Cobranca, Contrato } from "./types";

import { diasTolerancia } from "./regras";

/** Dias após o vencimento para entrar em cobrança (definido no painel de Configurações). */
export { diasTolerancia };

export type Situacao =
  | "paga"
  | "paga_atraso" // paga depois do vencimento
  | "em_analise"
  | "a_vencer"
  | "vence_hoje"
  | "vencida"      // venceu há menos de 3 dias (tolerância)
  | "em_cobranca"  // a partir do 3º dia após o vencimento
  | "cancelada";

export function diasDeAtraso(c: Pick<Cobranca, "vencimento">, hoje = hojeISO()) {
  return Math.max(0, diffDias(c.vencimento, hoje));
}

export function situacao(c: Pick<Cobranca, "status" | "vencimento" | "pago_em">, hoje = hojeISO()): Situacao {
  if (c.status === "pago") return c.pago_em && c.pago_em.slice(0, 10) > c.vencimento ? "paga_atraso" : "paga";
  if (c.status === "cancelado") return "cancelada";
  if (c.status === "em_analise") return "em_analise";
  const d = diffDias(c.vencimento, hoje);
  if (d < 0) return "a_vencer";
  if (d === 0) return "vence_hoje";
  if (d < diasTolerancia()) return "vencida";
  return "em_cobranca";
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  paga: "Paga em dia",
  paga_atraso: "Paga com atraso",
  em_analise: "Comprovante em análise",
  a_vencer: "A vencer",
  vence_hoje: "Vence hoje",
  vencida: "Vencida",
  em_cobranca: "Em cobrança",
  cancelada: "Cancelada",
};

/** Cores do selo (badge) de cada situação. */
export const COR_SITUACAO: Record<Situacao, string> = {
  paga: "bg-[#dcefe3] text-[#14532d]",
  paga_atraso: "bg-[#dcefe3] text-[#14532d] shadow-[inset_0_0_0_1.5px_#e07b2e]",
  em_analise: "bg-[#ece6fb] text-[#5b21b6]",
  a_vencer: "bg-stone-100 text-stone-700",
  vence_hoje: "bg-[#fbefc9] text-[#5c4204]",
  vencida: "bg-[#fce3cc] text-[#7a3306]",
  em_cobranca: "bg-[#fbdad7] text-[#8a1c12]",
  cancelada: "bg-stone-100 text-stone-500 line-through",
};

/** Cores do quadradinho da grade mês a mês (mais fortes que o selo). */
export const COR_CELULA: Record<Situacao, string> = {
  paga: "bg-[#2f7d55] text-white",
  paga_atraso: "bg-[#cde8d7] text-[#14532d] shadow-[inset_0_0_0_2px_#e07b2e]",
  em_analise: "bg-[#e6defa] text-[#5b21b6]",
  a_vencer: "border-[1.5px] border-dashed border-stone-300 text-stone-600",
  vence_hoje: "bg-[#f6d27a] text-[#4d3803]",
  vencida: "bg-[#ef9b52] text-[#3d1c04]",
  em_cobranca: "bg-[#b42318] text-white",
  cancelada: "bg-stone-100 text-stone-400",
};

export const SIMBOLO_SITUACAO: Record<Situacao, string> = {
  paga: "✓",
  paga_atraso: "✓",
  em_analise: "?",
  a_vencer: "–",
  vence_hoje: "!",
  vencida: "!",
  em_cobranca: "!",
  cancelada: "×",
};

/**
 * Texto do balão que aparece ao passar o mouse sobre uma cobrança:
 * quando foi paga (e com quantos dias de atraso), ou quando vence/venceu.
 */
export function detalheSituacao(
  c: Pick<Cobranca, "valor" | "vencimento" | "status" | "pago_em">,
  contrato?: Pick<Contrato, "multa_percentual" | "juros_mensal_percentual"> | null,
  hoje = hojeISO()
) {
  const s = situacao(c, hoje);
  const venc = dataBR(c.vencimento);
  const linhas = [ROTULO_SITUACAO[s]];
  if (s === "paga" || s === "paga_atraso") {
    const pago = c.pago_em ? c.pago_em.slice(0, 10) : null;
    if (!pago) {
      linhas.push(`Pago · vencimento ${venc}`);
    } else if (s === "paga_atraso") {
      const dias = diffDias(c.vencimento, pago);
      const devido = valorAtualizado({ ...c, status: "pendente" }, contrato, pago);
      linhas.push(`Pago em ${dataBR(pago)} · ${dias} dia(s) após o vencimento (${venc})`);
      linhas.push(`${brl(devido.total)} com multa e juros na data do pagamento`);
    } else {
      const antes = diffDias(pago, c.vencimento);
      linhas.push(`Pago em ${dataBR(pago)} · ${antes === 0 ? "no dia do vencimento" : `${antes} dia(s) antes do vencimento`}`);
    }
  } else if (s === "em_analise") {
    linhas.push(`Comprovante aguardando aprovação · vencimento ${venc}`);
  } else if (s === "a_vencer") {
    linhas.push(`Vence em ${venc} · ${brl(c.valor)}`);
  } else if (s === "vence_hoje") {
    linhas.push(`Vence hoje · ${brl(c.valor)}`);
  } else if (s === "vencida" || s === "em_cobranca") {
    const v = valorAtualizado(c, contrato, hoje);
    linhas.push(`Venceu em ${venc} · ${v.dias} dia(s) em atraso`);
    linhas.push(`${brl(v.total)} atualizado com multa e juros`);
  }
  return linhas.join("\n");
}

/** Valor com multa e juros pro rata dia, conforme o contrato. */
export function valorAtualizado(
  c: Pick<Cobranca, "valor" | "vencimento" | "status">,
  contrato?: Pick<Contrato, "multa_percentual" | "juros_mensal_percentual"> | null,
  hoje = hojeISO()
) {
  const base = Number(c.valor);
  const dias = diffDias(c.vencimento, hoje);
  if (c.status !== "pendente" || dias <= 0 || !contrato) {
    return { base, multa: 0, juros: 0, total: base, dias: Math.max(0, dias) };
  }
  const multa = base * (Number(contrato.multa_percentual) / 100);
  const juros = base * (Number(contrato.juros_mensal_percentual) / 100 / 30) * dias;
  const r = (n: number) => Math.round(n * 100) / 100;
  return { base, multa: r(multa), juros: r(juros), total: r(base + multa + juros), dias };
}

/** Pendências = cobranças em aberto que já venceram (ou vencem hoje). */
export function ehPendente(c: Pick<Cobranca, "status" | "vencimento">, hoje = hojeISO()) {
  return c.status === "pendente" && diffDias(c.vencimento, hoje) >= 0;
}
