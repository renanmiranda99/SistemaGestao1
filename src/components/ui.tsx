import Link from "next/link";
import { COR_CELULA, COR_SITUACAO, ROTULO_SITUACAO, SIMBOLO_SITUACAO, type Situacao } from "@/lib/cobranca";

export function PageHeader({
  titulo,
  descricao,
  acoes,
  sobretitulo,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  sobretitulo?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {sobretitulo && (
          <span className="text-[13px] font-semibold uppercase tracking-wide text-stone-600">{sobretitulo}</span>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-stone-900 md:text-[28px]">{titulo}</h1>
        {descricao && <p className="text-[15px] text-stone-600">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

/** Balão com detalhes ao passar o mouse ou focar com o teclado. */
export function Dica({
  texto,
  children,
  className = "",
}: {
  texto: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span tabIndex={0} className={`dica ${className}`}>
      <span aria-hidden="true" className="contents">{children}</span>
      <span className="sr-only">{texto}</span>
      <span className="dica-balao" aria-hidden="true">{texto}</span>
    </span>
  );
}

export function SituacaoBadge({ situacao, dica }: { situacao: Situacao; dica?: string }) {
  const selo = <span className={`badge ${COR_SITUACAO[situacao]}`}>{ROTULO_SITUACAO[situacao]}</span>;
  return dica ? <Dica texto={dica}>{selo}</Dica> : selo;
}

/** Quadradinho colorido da grade mês a mês, com o detalhe no hover. */
export function CelulaSituacao({ situacao, dica, tamanho = "md" }: { situacao: Situacao; dica: string; tamanho?: "md" | "sm" }) {
  const t = tamanho === "sm" ? "h-[22px] w-[22px] text-[11px]" : "h-[30px] w-[30px] text-[13px]";
  return (
    <Dica texto={dica} className="rounded-lg">
      <span className={`inline-grid place-items-center rounded-lg font-bold ${t} ${COR_CELULA[situacao]}`}>
        {SIMBOLO_SITUACAO[situacao]}
      </span>
    </Dica>
  );
}

/** Legenda das situações, com os mesmos quadradinhos da grade. */
export function LegendaSituacoes({ itens }: { itens: Situacao[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-stone-700">
      {itens.map((s) => (
        <span key={s} className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={`inline-grid h-[22px] w-[22px] place-items-center rounded-md text-[11px] font-bold ${COR_CELULA[s]}`}>
            {SIMBOLO_SITUACAO[s]}
          </span>
          {ROTULO_SITUACAO[s]}
        </span>
      ))}
    </div>
  );
}

const CORES_STATUS: Record<string, string> = {
  aberto: "bg-[#fcedb9] text-[#7a3a00] dark:bg-[#3a2e0d] dark:text-[#f5cf6b]",
  em_andamento: "bg-brand-100 text-brand-700",
  resolvido: "bg-[#d7f7c2] text-[#05690d] dark:bg-[#12361d] dark:text-[#8fe3a1]",
  fechado: "bg-stone-100 text-stone-600",
  pendente: "bg-[#ffe6d5] text-[#9e2f00] dark:bg-[#3d2012] dark:text-[#ffb68a]",
  paga: "bg-[#d7f7c2] text-[#05690d] dark:bg-[#12361d] dark:text-[#8fe3a1]",
  cancelada: "bg-stone-100 text-stone-500",
  em_analise: "bg-[#cff5f6] text-[#0055bc] dark:bg-[#0d2f45] dark:text-[#8fd3ff]",
  aprovado: "bg-[#d7f7c2] text-[#05690d] dark:bg-[#12361d] dark:text-[#8fe3a1]",
  rejeitado: "bg-[#ffe7f2] text-[#b3093c] dark:bg-[#3d1224] dark:text-[#ff9cc0]",
  baixa: "bg-stone-100 text-stone-700",
  media: "bg-[#ffe6d5] text-[#9e2f00] dark:bg-[#3d2012] dark:text-[#ffb68a]",
  alta: "bg-[#ffe7f2] text-[#b3093c] dark:bg-[#3d1224] dark:text-[#ff9cc0]",
};

const ROTULOS: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
  pendente: "Em aberto",
  paga: "Paga",
  cancelada: "Cancelada",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  baixa: "Prioridade baixa",
  media: "Prioridade média",
  alta: "Prioridade alta",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${CORES_STATUS[status] ?? "bg-stone-100 text-stone-600"}`}>
      {ROTULOS[status] ?? status}
    </span>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-superficie px-4 py-10 text-center text-sm text-stone-600">
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
  children,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  destaque?: "alerta" | "ok" | "info" | "aviso";
  href?: string;
  children?: React.ReactNode;
}) {
  const cor =
    destaque === "alerta"
      ? "text-[#df1b41]"
      : destaque === "ok"
        ? "text-[#228403]"
        : destaque === "info"
          ? "text-[#0055bc]"
          : destaque === "aviso"
            ? "text-[#9e2f00]"
            : "text-stone-900";
  const conteudo = (
    <div className={`flex h-full flex-col gap-3 rounded-lg border border-stone-200 bg-superficie p-5 ${href ? "transition hover:border-stone-300 hover:shadow-sm" : ""}`}>
      <div className="text-[13px] font-medium text-stone-600">{rotulo}</div>
      <div className={`text-[26px] font-bold leading-none tracking-tight ${cor}`}>{valor}</div>
      {children}
      {detalhe && <div className="text-xs text-stone-600">{detalhe}</div>}
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
    info: "bg-brand-50 text-brand-700",
    erro: "bg-[#fbe4e1] text-[#5f140c] dark:bg-[#3d1515] dark:text-[#ffb0a6]",
    aviso: "bg-[#fdf1e4] text-[#5c2a06] dark:bg-[#3a2410] dark:text-[#f7c79a]",
    ok: "bg-[#e3f2e9] text-[#0f3d24] dark:bg-[#12361d] dark:text-[#8fe3a1]",
  }[tipo];
  return <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${cor}`}>{children}</div>;
}

/** Iniciais para avatares (ex.: "Juliana Prado" -> "JP"). */
export function iniciais(nome: string | null | undefined) {
  return (nome || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
