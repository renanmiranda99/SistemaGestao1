const TZ = "America/Fortaleza";

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function brl(valor: number | string | null | undefined) {
  const n = Number(valor ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "2026-10-19" -> "19/10/2026" (sem conversão de fuso) */
export function dataBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function dataHoraBR(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** "2026-10-01" -> "out/2026" */
export function mesAno(competencia: string) {
  const [a, m] = competencia.split("-");
  return `${MESES[Number(m) - 1]}/${a}`;
}

export function mesAnoLongo(competencia: string) {
  const [a, m] = competencia.split("-");
  return `${MESES_LONGOS[Number(m) - 1]} de ${a}`;
}

export function nomeMesCurto(indice0: number) {
  return MESES[indice0];
}

/** Data de hoje no fuso da galeria, formato "AAAA-MM-DD". */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function diffDias(deISO: string, ateISO: string) {
  const a = Date.UTC(+deISO.slice(0, 4), +deISO.slice(5, 7) - 1, +deISO.slice(8, 10));
  const b = Date.UTC(+ateISO.slice(0, 4), +ateISO.slice(5, 7) - 1, +ateISO.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function somenteDigitos(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}
