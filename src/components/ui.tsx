import Link from "next/link";
import { COR_SITUACAO, ROTULO_SITUACAO, type Situacao } from "@/lib/cobranca";

export function PageHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function SituacaoBadge({ situacao }: { situacao: Situacao }) {
  return <span className={`badge ${COR_SITUACAO[situacao]}`}>{ROTULO_SITUACAO[situacao]}</span>;
}

const CORES_STATUS: Record<string, string> = {
  aberto: "bg-amber-100 text-amber-800 ring-amber-200",
  em_andamento: "bg-sky-100 text-sky-800 ring-sky-200",
  resolvido: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  fechado: "bg-slate-100 text-slate-600 ring-slate-200",
  pendente: "bg-red-100 text-red-800 ring-red-200",
  paga: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cancelada: "bg-slate-100 text-slate-500 ring-slate-200",
  em_analise: "bg-sky-100 text-sky-800 ring-sky-200",
  aprovado: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  rejeitado: "bg-red-100 text-red-800 ring-red-200",
  baixa: "bg-slate-100 text-slate-600 ring-slate-200",
  media: "bg-amber-100 text-amber-800 ring-amber-200",
  alta: "bg-red-100 text-red-800 ring-red-200",
};

const ROTULOS: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${CORES_STATUS[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {ROTULOS[status] ?? status}
    </span>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function Stat({
  rotulo,
  valor,
  detalhe,
  destaque,
  href,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  destaque?: "alerta" | "ok" | "info";
  href?: string;
}) {
  const cor =
    destaque === "alerta"
      ? "border-red-200 bg-red-50"
      : destaque === "ok"
        ? "border-emerald-200 bg-emerald-50"
        : destaque === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-stone-200 bg-white";
  const conteudo = (
    <div className={`rounded-xl border p-4 shadow-sm ${cor} ${href ? "transition hover:shadow" : ""}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-slate-500">{detalhe}</div>}
    </div>
  );
  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}

export function Alerta({
  tipo = "info",
  children,
}: {
  tipo?: "info" | "erro" | "aviso" | "ok";
  children: React.ReactNode;
}) {
  const cor = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    erro: "border-red-200 bg-red-50 text-red-900",
    aviso: "border-amber-200 bg-amber-50 text-amber-900",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tipo];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cor}`}>{children}</div>;
}
