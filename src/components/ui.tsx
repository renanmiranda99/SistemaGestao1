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
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-stone-900 md:text-[32px]">{titulo}</h1>
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
  aberto: "bg-[#fbefc9] text-[#5c4204]",
  em_andamento: "bg-brand-100 text-brand-700",
  resolvido: "bg-[#dcefe3] text-[#14532d]",
  fechado: "bg-stone-100 text-stone-600",
  pendente: "bg-[#fce3cc] text-[#7a3306]",
  paga: "bg-[#dcefe3] text-[#14532d]",
  cancelada: "bg-stone-100 text-stone-500",
  em_analise: "bg-[#ece6fb] text-[#5b21b6]",
  aprovado: "bg-[#dcefe3] text-[#14532d]",
  rejeitado: "bg-[#fbdad7] text-[#8a1c12]",
  baixa: "bg-stone-100 text-stone-700",
  media: "bg-[#fce3cc] text-[#7a3306]",
  alta: "bg-[#fbdad7] text-[#8a1c12]",
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
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center text-sm text-stone-600">
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
      ? "text-[#b42318]"
      : destaque === "ok"
        ? "text-[#2f7d55]"
        : destaque === "info"
          ? "text-[#5b21b6]"
          : destaque === "aviso"
            ? "text-[#7a3306]"
            : "text-stone-900";
  const conteudo = (
    <div className={`flex h-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 ${href ? "transition hover:border-stone-300 hover:shadow-sm" : ""}`}>
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
    info: "bg-brand-50 text-brand-900",
    erro: "bg-[#fbe4e1] text-[#5f140c]",
    aviso: "bg-[#fdf1e4] text-[#5c2a06]",
    ok: "bg-[#e3f2e9] text-[#0f3d24]",
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
