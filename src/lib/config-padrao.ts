/**
 * Configurações editáveis no painel do admin (tabela public.configuracoes).
 * Tudo aqui é público: aparece no site. Segredos ficam nas variáveis de ambiente.
 */
export type Config = {
  // Identidade
  nome: string;
  logoMarcaUrl: string;
  logoCompletaUrl: string;
  // Cores
  corPrimaria: string;
  corMenu: string;
  // Página inicial
  homeTitulo: string;
  homeTexto: string;
  homeTextoVazio: string;
  homeMostrarPrecos: boolean;
  whatsappContato: string;
  rodapeTexto: string;
  // Localização
  endereco: string;
  mapaLink: string;
  mapaConsulta: string;
  mostrarMapa: boolean;
  // Login e cadastro
  loginTitulo: string;
  loginTexto: string;
  // Cobrança
  diasTolerancia: number;
  multaPadrao: number;
  jurosPadrao: number;
  mensagemCobranca: string;
};

export const CORES_PADRAO = { corPrimaria: "#1d4e89", corMenu: "#0f2540" };

export const MENSAGEM_COBRANCA_PADRAO =
  "Olá, {nome}! Tudo bem?\n\n" +
  "Identificamos que o aluguel referente a {mes}, com vencimento em {vencimento}, no valor de {valor}, " +
  "está em aberto há {dias} dia(s).\n\n" +
  "Se já realizou o pagamento, por favor envie o comprovante pelo portal do inquilino. " +
  "Qualquer dúvida, estamos à disposição.";

export const CONFIG_PADRAO: Config = {
  nome: process.env.NEXT_PUBLIC_NOME_GALERIA || "Galeria Asa Branca",
  logoMarcaUrl: "/logo-marca.png",
  logoCompletaUrl: "/logo-asa-branca.png",
  ...CORES_PADRAO,
  homeTitulo: "Salas disponíveis para aluguel",
  homeTexto: "{quantidade} na {nome}. Veja as fotos e fale com a administração.",
  homeTextoVazio: "No momento não há salas disponíveis na {nome}. Fale com a administração para entrar na lista de espera.",
  homeMostrarPrecos: true,
  whatsappContato: process.env.NEXT_PUBLIC_WHATSAPP_CONTATO || "",
  rodapeTexto: "",
  endereco: "Recife, PE",
  mapaLink: "https://maps.app.goo.gl/cowcRYCjyG9GBv4D7",
  mapaConsulta: "-8.0622273,-34.9079164",
  mostrarMapa: true,
  loginTitulo: "Aluguéis da galeria, mês a mês.",
  loginTexto: "Boletos, comprovantes, contratos e chamados em um só lugar, para a administração e para cada inquilino.",
  diasTolerancia: Number(process.env.NEXT_PUBLIC_DIAS_TOLERANCIA_COBRANCA ?? 3) || 3,
  multaPadrao: 2,
  jurosPadrao: 1,
  mensagemCobranca: MENSAGEM_COBRANCA_PADRAO,
};

/** Junta o que veio do banco com os padrões, descartando tipos errados. */
export function normalizarConfig(dados: unknown): Config {
  const d = (dados && typeof dados === "object" ? dados : {}) as Record<string, unknown>;
  const saida = { ...CONFIG_PADRAO } as Record<string, unknown>;
  for (const [chave, padrao] of Object.entries(CONFIG_PADRAO)) {
    const v = d[chave];
    if (v === undefined || v === null) continue;
    if (typeof padrao === "number" && typeof v === "number" && Number.isFinite(v)) saida[chave] = v;
    else if (typeof padrao === "boolean" && typeof v === "boolean") saida[chave] = v;
    else if (typeof padrao === "string" && typeof v === "string") saida[chave] = v;
  }
  const c = saida as Config;
  if (!/^#[0-9a-f]{6}$/i.test(c.corPrimaria)) c.corPrimaria = CORES_PADRAO.corPrimaria;
  if (!/^#[0-9a-f]{6}$/i.test(c.corMenu)) c.corMenu = CORES_PADRAO.corMenu;
  if (!c.logoMarcaUrl) c.logoMarcaUrl = CONFIG_PADRAO.logoMarcaUrl;
  if (!c.logoCompletaUrl) c.logoCompletaUrl = CONFIG_PADRAO.logoCompletaUrl;
  return c;
}

/** Troca {chaves} de um texto configurável pelos valores. */
export function preencher(texto: string, valores: Record<string, string | number>) {
  return texto.replace(/\{(\w+)\}/g, (m, k: string) => (k in valores ? String(valores[k]) : m));
}

export function urlMapaEmbed(consulta: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=17&output=embed`;
}
