import { diffDias, hojeISO } from "./format";
import type { Cobranca, Contrato } from "./types";

export const DIAS_TOLERANCIA = Number(process.env.NEXT_PUBLIC_DIAS_TOLERANCIA_COBRANCA ?? 3);

export type Situacao =
  | "paga"
  | "em_analise"
  | "a_vencer"
  | "vence_hoje"
  | "vencida"      // venceu há menos de 3 dias (tolerância)
  | "em_cobranca"  // a partir do 3º dia após o vencimento
  | "cancelada";

export function diasDeAtraso(c: Pick<Cobranca, "vencimento">, hoje = hojeISO()) {
  return Math.max(0, diffDias(c.vencimento, hoje));
}

export function situacao(c: Pick<Cobranca, "status" | "vencimento">, hoje = hojeISO()): Situacao {
  if (c.status === "pago") return "paga";
  if (c.status === "cancelado") return "cancelada";
  if (c.status === "em_analise") return "em_analise";
  const d = diffDias(c.vencimento, hoje);
  if (d < 0) return "a_vencer";
  if (d === 0) return "vence_hoje";
  if (d < DIAS_TOLERANCIA) return "vencida";
  return "em_cobranca";
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  paga: "Paga",
  em_analise: "Comprovante em análise",
  a_vencer: "A vencer",
  vence_hoje: "Vence hoje",
  vencida: "Vencida",
  em_cobranca: "Em cobrança",
  cancelada: "Cancelada",
};

export const COR_SITUACAO: Record<Situacao, string> = {
  paga: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  em_analise: "bg-sky-100 text-sky-800 ring-sky-200",
  a_vencer: "bg-slate-100 text-slate-700 ring-slate-200",
  vence_hoje: "bg-amber-100 text-amber-800 ring-amber-200",
  vencida: "bg-orange-100 text-orange-800 ring-orange-200",
  em_cobranca: "bg-red-100 text-red-800 ring-red-200",
  cancelada: "bg-slate-50 text-slate-400 ring-slate-200 line-through",
};

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
