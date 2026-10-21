"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { CONFIG_PADRAO, normalizarConfig, type Config } from "@/lib/config-padrao";
import { somenteDigitos } from "@/lib/format";

export type EstadoConfig = { ok?: string; erro?: string; aviso?: string } | null;

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = txt(f, k).replace(",", ".");
  return v === "" ? NaN : Number(v);
};

/** Só links do Google Maps são consultados (evita o servidor buscar endereços arbitrários). */
const HOSTS_MAPA = /^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+)$/i;

/** Tira "lat,lng" de uma URL do Google Maps (prefere o pino do local ao centro do mapa). */
function coordenadasDaUrl(url: string) {
  const pino = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pino) return `${pino[1]},${pino[2]}`;
  const centro = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (centro) return `${centro[1]},${centro[2]}`;
  const q = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (q) return `${q[1]},${q[2]}`;
  const lugar = url.match(/\/place\/([^/@?]+)/);
  if (lugar) return decodeURIComponent(lugar[1]!.replace(/\+/g, " "));
  return null;
}

/** Segue o link curto do Google Maps (maps.app.goo.gl) para descobrir as coordenadas. */
async function localizacaoDoLink(link: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !HOSTS_MAPA.test(url.hostname)) return null;
  const direta = coordenadasDaUrl(url.toString());
  if (direta) return direta;
  try {
    let atual = url.toString();
    for (let i = 0; i < 4; i++) {
      const r = await fetch(atual, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      const destino = r.headers.get("location");
      if (!destino) break;
      const proxima = new URL(destino, atual);
      if (!HOSTS_MAPA.test(proxima.hostname)) break;
      const achou = coordenadasDaUrl(proxima.toString());
      if (achou) return achou;
      atual = proxima.toString();
    }
  } catch {
    // sem internet ou link inválido: o admin pode digitar o endereço manualmente
  }
  return null;
}

function urlImagem(v: string, padrao: string) {
  if (!v) return padrao;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? v : padrao;
  } catch {
    return padrao;
  }
}

export async function salvarConfiguracoes(_: EstadoConfig, form: FormData): Promise<EstadoConfig> {
  const { supabase } = await exigirPerfil("admin");

  const nome = txt(form, "nome");
  if (!nome) return { erro: "Informe o nome da galeria." };

  const diasTolerancia = num(form, "diasTolerancia");
  const multaPadrao = num(form, "multaPadrao");
  const jurosPadrao = num(form, "jurosPadrao");
  if (!Number.isInteger(diasTolerancia) || diasTolerancia < 1 || diasTolerancia > 30)
    return { erro: "Os dias para entrar em cobrança devem ser um número inteiro de 1 a 30." };
  if (!(multaPadrao >= 0 && multaPadrao <= 20)) return { erro: "A multa padrão deve estar entre 0% e 20%." };
  if (!(jurosPadrao >= 0 && jurosPadrao <= 10)) return { erro: "Os juros padrão devem estar entre 0% e 10% ao mês." };

  const whatsapp = somenteDigitos(txt(form, "whatsappContato"));
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13))
    return { erro: "O WhatsApp de contato deve ter DDD e número (ex.: 81 99999-9999)." };

  const mapaLink = txt(form, "mapaLink");
  let mapaConsulta = txt(form, "mapaConsulta");
  let aviso: string | undefined;
  if (mapaLink && (form.get("extrairDoLink") === "on" || !mapaConsulta)) {
    const achou = await localizacaoDoLink(mapaLink);
    if (achou) mapaConsulta = achou;
    else aviso = "Não consegui ler a localização do link. Digite o endereço ou as coordenadas no campo do mapa.";
  }

  const dados: Config = normalizarConfig({
    nome,
    logoMarcaUrl: urlImagem(txt(form, "logoMarcaUrl"), CONFIG_PADRAO.logoMarcaUrl),
    logoCompletaUrl: urlImagem(txt(form, "logoCompletaUrl"), CONFIG_PADRAO.logoCompletaUrl),
    corPrimaria: txt(form, "corPrimaria").toLowerCase(),
    corMenu: txt(form, "corMenu").toLowerCase(),
    homeTitulo: txt(form, "homeTitulo") || CONFIG_PADRAO.homeTitulo,
    homeTexto: txt(form, "homeTexto") || CONFIG_PADRAO.homeTexto,
    homeTextoVazio: txt(form, "homeTextoVazio") || CONFIG_PADRAO.homeTextoVazio,
    homeMostrarPrecos: form.get("homeMostrarPrecos") === "on",
    whatsappContato: whatsapp,
    rodapeTexto: txt(form, "rodapeTexto"),
    endereco: txt(form, "endereco"),
    mapaLink,
    mapaConsulta,
    mostrarMapa: form.get("mostrarMapa") === "on",
    loginTitulo: txt(form, "loginTitulo") || CONFIG_PADRAO.loginTitulo,
    loginTexto: txt(form, "loginTexto") || CONFIG_PADRAO.loginTexto,
    diasTolerancia,
    multaPadrao,
    jurosPadrao,
    mensagemCobranca: txt(form, "mensagemCobranca") || CONFIG_PADRAO.mensagemCobranca,
  });

  const { error } = await supabase
    .from("configuracoes")
    .upsert({ id: 1, dados, updated_at: new Date().toISOString() });
  if (error) {
    // PGRST205 / 42P01: tabela inexistente · 42501: bloqueado pelas permissões (RLS)
    if (error.code === "PGRST205" || error.code === "42P01")
      return { erro: "A tabela de configurações ainda não existe. Rode supabase/migracao_configuracoes.sql no Supabase." };
    if (error.code === "42501")
      return { erro: "O banco recusou a gravação por permissão. Confira se você está logado como administrador." };
    return { erro: `Não foi possível salvar: ${error.message}` };
  }

  // Nome, cores e textos aparecem em todas as páginas
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas.", aviso };
}
