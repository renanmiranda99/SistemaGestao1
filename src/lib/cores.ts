/** Gera a paleta do tema (variáveis CSS) a partir da cor principal e da cor do menu. */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function misturar(hex: string, com: [number, number, number], t: number) {
  const c = rgb(hex);
  return c.map((v, i) => Math.round(v + (com[i]! - v) * t)) as [number, number, number];
}

const BRANCO: [number, number, number] = [255, 255, 255];
const PRETO: [number, number, number] = [0, 0, 0];

/** Luminância relativa (WCAG), de 0 (preto) a 1 (branco). */
export function luminancia(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Contraste do texto branco sobre a cor (≥ 4,5 é o mínimo recomendado). */
export function contrasteComBranco(hex: string) {
  return 1.05 / (luminancia(hex) + 0.05);
}

/** Variáveis CSS no formato "r g b" usadas pelas cores `brand-*` do Tailwind. */
export function variaveisTema(corPrimaria: string, corMenu: string) {
  const v = (c: [number, number, number]) => c.join(" ");
  return {
    "--brand-50": v(misturar(corPrimaria, BRANCO, 0.93)),
    "--brand-100": v(misturar(corPrimaria, BRANCO, 0.85)),
    "--brand-200": v(misturar(corPrimaria, BRANCO, 0.7)),
    "--brand-500": v(misturar(corPrimaria, BRANCO, 0.15)),
    "--brand-600": v(rgb(corPrimaria)),
    "--brand-700": v(misturar(corPrimaria, PRETO, 0.25)),
    "--brand-800": v(misturar(corMenu, BRANCO, 0.08)),
    "--brand-900": v(rgb(corMenu)),
  };
}

export function cssTema(corPrimaria: string, corMenu: string) {
  const vars = Object.entries(variaveisTema(corPrimaria, corMenu))
    .map(([k, val]) => `${k}:${val}`)
    .join(";");
  return `:root{${vars}}`;
}
