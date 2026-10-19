import Link from "next/link";
import type { Metadata } from "next";
import { getSessao, urlPublicaFoto } from "@/lib/auth";
import { brl, somenteDigitos } from "@/lib/format";
import type { Foto, Sala } from "@/lib/types";
import { AnuncioSala, type DadosAnuncio } from "@/components/AnuncioSala";

import { LOGO_COMPLETA, LOGO_MARCA, NOME_GALERIA } from "@/lib/galeria";
const LINK_MAPA = "https://maps.app.goo.gl/cowcRYCjyG9GBv4D7";
const MAPA_EMBED = "https://www.google.com/maps?q=-8.0622273,-34.9079164&z=17&output=embed";
// WhatsApp para interessados (opcional). Ex.: NEXT_PUBLIC_WHATSAPP_CONTATO=5581999999999
const WHATSAPP = somenteDigitos(process.env.NEXT_PUBLIC_WHATSAPP_CONTATO);

export const metadata: Metadata = {
  title: `Salas para alugar · ${NOME_GALERIA}`,
  description: `Salas disponíveis para aluguel na ${NOME_GALERIA}.`,
};

// Página pública: lista as salas marcadas como "Disponível para aluguel"
export const dynamic = "force-dynamic";

export default async function Home() {
  const { supabase, perfil } = await getSessao();
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

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-brand-900 text-[#e6ecf5]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_MARCA} alt="" width={40} height={40} className="h-10 w-10 rounded-[11px] ring-1 ring-white/25" />
            <span className="text-[17px] font-semibold text-white">{NOME_GALERIA}</span>
          </Link>
          <Link
            href={portal ?? "/login"}
            className="btn min-h-10 border-[#3a5577] bg-transparent text-white hover:bg-brand-800"
          >
            {portal ? "Ir para o portal" : "Entrar"}
          </Link>
        </div>
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 pb-12 pt-8 md:px-8 md:pb-16 md:pt-12">
          <h1 className="max-w-[680px] text-[34px] font-bold leading-tight tracking-tight text-white md:text-[44px]">
            Salas disponíveis para aluguel
          </h1>
          <p className="max-w-[560px] text-base leading-relaxed text-[#b7c6da]">
            {salas.length
              ? `${salas.length} ${salas.length === 1 ? "sala disponível" : "salas disponíveis"} na ${NOME_GALERIA}. Veja as fotos e fale com a administração.`
              : `No momento não há salas disponíveis na ${NOME_GALERIA}. Fale com a administração para entrar na lista de espera.`}
          </p>
          {WHATSAPP && (
            <div className="mt-2">
              <a href={linkWhats(`Olá! Tenho interesse em alugar uma sala na ${NOME_GALERIA}.`)} target="_blank" rel="noreferrer" className="btn-whatsapp">
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
              <AnuncioSala key={sala.id} sala={dadosAnuncio(sala, fotos.filter((x) => x.sala_id === sala.id))} />
            ))}
          </section>
        )}

        <section aria-labelledby="localizacao" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="localizacao" className="text-[22px] font-bold tracking-tight">Localização</h2>
              <p className="text-[15px] text-stone-600">{NOME_GALERIA} · Recife, PE</p>
            </div>
            <a href={LINK_MAPA} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
              Abrir no Google Maps
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <iframe
              src={MAPA_EMBED}
              title={`Mapa com a localização da ${NOME_GALERIA}`}
              className="block h-[280px] w-full md:h-[340px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-stone-600 md:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_COMPLETA} alt={NOME_GALERIA} width={1000} height={278} className="h-auto w-[170px]" />
          <Link href={portal ?? "/login"} className="link">{portal ? "Ir para o portal" : "Área do inquilino e da administração"}</Link>
        </div>
      </footer>
    </div>
  );
}

function linkWhats(texto: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

function dadosAnuncio(sala: Sala, fotos: Foto[]): DadosAnuncio {
  return {
    id: sala.id,
    nome: sala.nome,
    valor: sala.valor_aluguel ? brl(sala.valor_aluguel) : null,
    detalhes: [sala.andar, sala.area_m2 && `${String(sala.area_m2).replace(".", ",")} m²`].filter(Boolean).join(" · "),
    descricao: sala.descricao,
    fotos: fotos.map((f, i) => ({ url: urlPublicaFoto(f.storage_path), alt: f.legenda || `Foto ${i + 1} da ${sala.nome}` })),
    linkInteresse: WHATSAPP ? linkWhats(`Olá! Tenho interesse na ${sala.nome} da ${NOME_GALERIA}.`) : null,
  };
}
