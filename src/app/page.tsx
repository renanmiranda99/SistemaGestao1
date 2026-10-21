import Link from "next/link";
import type { Metadata } from "next";
import { getSessao, urlPublicaFoto } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { preencher, urlMapaEmbed, type Config } from "@/lib/config-padrao";
import { brl, somenteDigitos } from "@/lib/format";
import { telefoneWhatsApp } from "@/lib/whatsapp";
import type { Foto, Sala } from "@/lib/types";
import { AnuncioSala, type DadosAnuncio } from "@/components/AnuncioSala";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  return {
    title: `Salas para alugar · ${config.nome}`,
    description: `Salas disponíveis para aluguel na ${config.nome}.`,
  };
}

// Página pública: lista as salas marcadas como "Disponível para aluguel"
export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ supabase, perfil }, config] = await Promise.all([getSessao(), getConfig()]);
  const { data: s } = await supabase
    .from("salas")
    .select("*")
    .eq("disponivel_aluguel", true)
    .is("inquilino_id", null)
    .order("nome");
  const salas = (s ?? []) as Sala[];
  const { data: f } = salas.length
    ? await supabase.from("fotos").select("*").in("sala_id", salas.map((x) => x.id)).order("ordem").order("created_at")
    : { data: [] };
  const fotos = (f ?? []) as Foto[];
  const portal = perfil ? (perfil.role === "admin" ? "/admin" : "/inquilino") : null;
  const whatsapp = somenteDigitos(config.whatsappContato) ? telefoneWhatsApp(config.whatsappContato) : "";
  const linkWhats = (texto: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}`;
  const quantidade = `${salas.length} ${salas.length === 1 ? "sala disponível" : "salas disponíveis"}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-brand-900 text-white/90">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.logoMarcaUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-[11px] object-cover ring-1 ring-white/25" />
            <span className="text-[17px] font-semibold text-white">{config.nome}</span>
          </Link>
          <Link href={portal ?? "/login"} className="btn min-h-10 border-white/25 bg-transparent text-white hover:bg-brand-800">
            {portal ? "Ir para o portal" : "Entrar"}
          </Link>
        </div>
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 pb-12 pt-8 md:px-8 md:pb-16 md:pt-12">
          <h1 className="max-w-[680px] text-[34px] font-bold leading-tight tracking-tight text-white md:text-[44px]">
            {config.homeTitulo}
          </h1>
          <p className="max-w-[560px] whitespace-pre-line text-base leading-relaxed text-white/70">
            {preencher(salas.length ? config.homeTexto : config.homeTextoVazio, { nome: config.nome, quantidade })}
          </p>
          {whatsapp && (
            <div className="mt-2">
              <a href={linkWhats(`Olá! Tenho interesse em alugar uma sala na ${config.nome}.`)} target="_blank" rel="noreferrer" className="btn-whatsapp">
                Falar com a administração
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-[1180px] flex-col gap-12 px-4 py-10 md:px-8">
        {salas.length > 0 && (
          <section aria-label="Salas disponíveis" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {salas.map((sala) => (
              <AnuncioSala
                key={sala.id}
                sala={dadosAnuncio(sala, fotos.filter((x) => x.sala_id === sala.id), config, whatsapp ? linkWhats : null)}
              />
            ))}
          </section>
        )}

        {config.mostrarMapa && config.mapaConsulta && (
          <section aria-labelledby="localizacao" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="localizacao" className="text-[22px] font-bold tracking-tight">Localização</h2>
                <p className="text-[15px] text-stone-600">{[config.nome, config.endereco].filter(Boolean).join(" · ")}</p>
              </div>
              {config.mapaLink && (
                <a href={config.mapaLink} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                  Abrir no Google Maps
                </a>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <iframe
                src={urlMapaEmbed(config.mapaConsulta)}
                title={`Mapa com a localização da ${config.nome}`}
                className="block h-[280px] w-full md:h-[340px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-stone-600 md:px-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.logoCompletaUrl} alt={config.nome} className="h-auto max-h-12 w-auto max-w-[170px]" />
            {config.rodapeTexto && <span className="whitespace-pre-line">{config.rodapeTexto}</span>}
          </div>
          <Link href={portal ?? "/login"} className="link">{portal ? "Ir para o portal" : "Área do inquilino e da administração"}</Link>
        </div>
      </footer>
    </div>
  );
}

function dadosAnuncio(sala: Sala, fotos: Foto[], config: Config, linkWhats: ((t: string) => string) | null): DadosAnuncio {
  return {
    id: sala.id,
    nome: sala.nome,
    valor: config.homeMostrarPrecos && sala.valor_aluguel ? brl(sala.valor_aluguel) : null,
    detalhes: [sala.andar, sala.area_m2 && `${String(sala.area_m2).replace(".", ",")} m²`].filter(Boolean).join(" · "),
    descricao: sala.descricao,
    fotos: fotos.map((f, i) => ({ url: urlPublicaFoto(f.storage_path), alt: f.legenda || `Foto ${i + 1} da ${sala.nome}` })),
    linkInteresse: linkWhats ? linkWhats(`Olá! Tenho interesse na ${sala.nome} da ${config.nome}.`) : null,
  };
}
