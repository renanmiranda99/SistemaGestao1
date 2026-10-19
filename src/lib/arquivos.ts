/** Nome de arquivo seguro para o Storage (sem acentos/espaços). */
export function nomeSeguro(nome: string) {
  const ponto = nome.lastIndexOf(".");
  const ext = ponto > 0 ? nome.slice(ponto).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  const base = (ponto > 0 ? nome.slice(0, ponto) : nome)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${Date.now()}-${base || "arquivo"}${ext}`;
}

export const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB
