"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { salvarConfiguracoes } from "@/app/admin/configuracoes/actions";
import { CONFIG_PADRAO, CORES_PADRAO, MENSAGEM_COBRANCA_PADRAO, preencher, urlMapaEmbed, type Config } from "@/lib/config-padrao";
import { contrasteComBranco, variaveisTema } from "@/lib/cores";
import { createClient } from "@/lib/supabase/client";
import { nomeSeguro, TAMANHO_MAXIMO } from "@/lib/arquivos";

const SECOES = [
  { id: "identidade", r: "Identidade" },
  { id: "cores", r: "Cores" },
  { id: "inicial", r: "Página inicial" },
  { id: "localizacao", r: "Localização" },
  { id: "acesso", r: "Login" },
  { id: "cobranca", r: "Cobrança" },
];

const PALETAS = [
  { r: "Azul-marinho", primaria: "#1d4e89", menu: "#0f2540" },
  { r: "Verde", primaria: "#1f6b4f", menu: "#12332a" },
  { r: "Vinho", primaria: "#8a2846", menu: "#2b0f1a" },
  { r: "Grafite", primaria: "#3a4a5c", menu: "#161b22" },
  { r: "Terracota", primaria: "#a14a22", menu: "#2e1a12" },
  { r: "Roxo", primaria: "#5b3cc4", menu: "#1d1440" },
];

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar configurações"}
    </button>
  );
}

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-6">
      <div className="mb-5">
        <h2 className="titulo-secao">{titulo}</h2>
        <p className="text-[13px] text-stone-600">{descricao}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Campo({ id, rotulo, ajuda, children }: { id: string; rotulo: string; ajuda?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{rotulo}</label>
      {children}
      {ajuda && <p className="mt-1.5 text-xs text-stone-600">{ajuda}</p>}
    </div>
  );
}

function Marcar({ id, nome, rotulo, padrao }: { id: string; nome: string; rotulo: string; padrao: boolean }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input id={id} name={nome} type="checkbox" defaultChecked={padrao} className="h-5 w-5 accent-brand-600" />
      {rotulo}
    </label>
  );
}

/** Envio de imagem (logo) para o Storage público, com prévia. */
function CampoLogo({
  id,
  nome,
  rotulo,
  ajuda,
  valorInicial,
  padrao,
  formato,
}: {
  id: string;
  nome: string;
  rotulo: string;
  ajuda: string;
  valorInicial: string;
  padrao: string;
  formato: "quadrado" | "largo";
}) {
  const [url, setUrl] = useState(valorInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return setErro("Escolha um arquivo de imagem (PNG, JPG, SVG ou WebP).");
    if (arquivo.size > TAMANHO_MAXIMO) return setErro("A imagem deve ter no máximo 10 MB.");
    setErro(null);
    setEnviando(true);
    const supabase = createClient();
    const path = `marca/${nomeSeguro(arquivo.name)}`;
    const { error } = await supabase.storage.from("fotos").upload(path, arquivo, { upsert: false });
    setEnviando(false);
    if (error) return setErro(`Falha no envio: ${error.message}`);
    setUrl(supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div>
      <span className="label">{rotulo}</span>
      <div className="flex flex-wrap items-center gap-4">
        <div className={`grid place-items-center rounded-xl border border-stone-200 bg-stone-50 p-2 ${formato === "quadrado" ? "h-20 w-20" : "h-20 w-56"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Prévia: ${rotulo}`} className="max-h-full max-w-full rounded-md object-contain" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary btn-sm" disabled={enviando} onClick={() => input.current?.click()}>
              {enviando ? "Enviando..." : "Trocar imagem"}
            </button>
            {url !== padrao && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => setUrl(padrao)}>
                Usar a padrão
              </button>
            )}
          </div>
          <p className="text-xs text-stone-600">{ajuda}</p>
        </div>
      </div>
      <input ref={input} id={id} type="file" accept="image/*" className="sr-only" onChange={escolher} />
      <input type="hidden" name={nome} value={url} />
      {erro && <p className="mt-1.5 text-xs text-red-700">{erro}</p>}
    </div>
  );
}

function CampoCor({ id, nome, rotulo, valor, aoMudar, ajuda }: { id: string; nome: string; rotulo: string; valor: string; aoMudar: (v: string) => void; ajuda: string }) {
  const [texto, setTexto] = useState(valor);
  // Mantém o campo de texto igual à cor escolhida no seletor ou nas paletas
  if (texto.toLowerCase() !== valor.toLowerCase() && /^#[0-9a-f]{6}$/i.test(texto)) setTexto(valor);
  return (
    <div>
      <label className="label" htmlFor={id}>{rotulo}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valor}
          onChange={(e) => {
            aoMudar(e.target.value);
            setTexto(e.target.value);
          }}
          className="h-11 w-14 cursor-pointer rounded-[10px] border border-stone-300 bg-white p-1"
          aria-label={`${rotulo}: seletor`}
        />
        <input
          id={id}
          name={nome}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) aoMudar(e.target.value);
          }}
          className="input w-32 font-mono uppercase"
          maxLength={7}
          pattern="#[0-9a-fA-F]{6}"
        />
      </div>
      <p className="mt-1.5 text-xs text-stone-600">{ajuda}</p>
    </div>
  );
}

/** Miniatura do menu e de um botão com as cores escolhidas. */
function PreviaCores({ primaria, menu }: { primaria: string; menu: string }) {
  const vars = variaveisTema(primaria, menu) as React.CSSProperties;
  return (
    <div style={vars} className="flex overflow-hidden rounded-xl border border-stone-200" aria-label="Prévia das cores" role="img">
      <div className="flex w-36 flex-col gap-1.5 bg-brand-900 p-3">
        <span className="mb-1 h-2 w-16 rounded bg-white/60" />
        <span className="rounded-md bg-stone-50 px-2 py-1.5 text-[11px] font-semibold text-brand-900">Painel</span>
        <span className="rounded-md px-2 py-1.5 text-[11px] text-white/80">Inquilinos</span>
        <span className="rounded-md bg-brand-800 px-2 py-1.5 text-[11px] text-white">Pagamentos</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2.5 bg-stone-50 p-4">
        <span className="text-sm font-semibold text-stone-900">Exemplo de página</span>
        <div className="flex flex-wrap gap-2">
          <span className="btn-primary btn-sm pointer-events-none">Botão principal</span>
          <span className="badge bg-brand-100 text-brand-700">Selo</span>
          <span className="text-sm font-semibold text-brand-600 underline">Link</span>
        </div>
      </div>
    </div>
  );
}

export function FormConfiguracoes({ config }: { config: Config }) {
  const [estado, acao] = useFormState(salvarConfiguracoes, null);
  const [primaria, setPrimaria] = useState(config.corPrimaria);
  const [menu, setMenu] = useState(config.corMenu);
  const [mapaConsulta, setMapaConsulta] = useState(config.mapaConsulta);
  const [mapaPrevia, setMapaPrevia] = useState(config.mapaConsulta);
  const [mensagem, setMensagem] = useState(config.mensagemCobranca);
  const [dias, setDias] = useState(String(config.diasTolerancia));
  const [nome, setNome] = useState(config.nome);

  const contrastePrimaria = contrasteComBranco(primaria);
  const contrasteMenu = contrasteComBranco(menu);
  const previaMensagem = preencher(mensagem, {
    nome: "Juliana",
    mes: "outubro de 2026",
    vencimento: "17/10/2026",
    valor: "R$ 2.143,40",
    dias: Number(dias) || 3,
    galeria: nome,
  });

  return (
    <form action={acao} className="flex flex-col gap-5">
      <nav aria-label="Seções das configurações" className="flex flex-wrap gap-2">
        {SECOES.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="chip">{s.r}</a>
        ))}
      </nav>

      <Secao id="identidade" titulo="Identidade" descricao="Nome e logos que aparecem no menu, no login, na página inicial e na aba do navegador.">
        <Campo id="cfg-nome" rotulo="Nome da galeria">
          <input id="cfg-nome" name="nome" required value={nome} onChange={(e) => setNome(e.target.value)} className="input max-w-md" />
        </Campo>
        <div className="grid gap-5 lg:grid-cols-2">
          <CampoLogo
            id="cfg-logo-marca"
            nome="logoMarcaUrl"
            rotulo="Ícone (quadrado)"
            ajuda="Usado no menu e como ícone da aba. Ideal: imagem quadrada, 512×512 px."
            valorInicial={config.logoMarcaUrl}
            padrao={CONFIG_PADRAO.logoMarcaUrl}
            formato="quadrado"
          />
          <CampoLogo
            id="cfg-logo-completa"
            nome="logoCompletaUrl"
            rotulo="Logo completa"
            ajuda="Usada no login, no cadastro e no rodapé da página inicial, sobre fundo claro."
            valorInicial={config.logoCompletaUrl}
            padrao={CONFIG_PADRAO.logoCompletaUrl}
            formato="largo"
          />
        </div>
      </Secao>

      <Secao id="cores" titulo="Cores" descricao="A cor principal pinta botões, links e destaques. A cor do menu pinta o menu lateral e o topo das páginas públicas.">
        <div className="flex flex-wrap gap-2" aria-label="Paletas prontas">
          {PALETAS.map((p) => (
            <button
              key={p.r}
              type="button"
              className="chip"
              onClick={() => {
                setPrimaria(p.primaria);
                setMenu(p.menu);
              }}
            >
              <span aria-hidden="true" className="flex">
                <span className="h-4 w-4 rounded-l-full" style={{ background: p.menu }} />
                <span className="h-4 w-4 rounded-r-full" style={{ background: p.primaria }} />
              </span>
              {p.r}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            onClick={() => {
              setPrimaria(CORES_PADRAO.corPrimaria);
              setMenu(CORES_PADRAO.corMenu);
            }}
          >
            Restaurar padrão
          </button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoCor id="cfg-cor-primaria" nome="corPrimaria" rotulo="Cor principal" valor={primaria} aoMudar={setPrimaria} ajuda="Botões, links, abas ativas." />
          <CampoCor id="cfg-cor-menu" nome="corMenu" rotulo="Cor do menu" valor={menu} aoMudar={setMenu} ajuda="Fundo do menu lateral e do topo. Use um tom escuro." />
        </div>
        {(contrastePrimaria < 4.5 || contrasteMenu < 4.5) && (
          <p className="rounded-xl bg-[#fdf1e4] px-4 py-3 text-sm text-[#5c2a06]">
            {contrasteMenu < 4.5 && "A cor do menu está clara demais: o texto branco do menu fica difícil de ler. "}
            {contrastePrimaria < 4.5 && "A cor principal está clara demais: o texto branco dos botões fica difícil de ler."}
          </p>
        )}
        <PreviaCores primaria={primaria} menu={menu} />
      </Secao>

      <Secao id="inicial" titulo="Página inicial" descricao="Página pública com as salas disponíveis para aluguel.">
        <Campo id="cfg-home-titulo" rotulo="Título">
          <input id="cfg-home-titulo" name="homeTitulo" defaultValue={config.homeTitulo} className="input" />
        </Campo>
        <Campo id="cfg-home-texto" rotulo="Texto quando há salas" ajuda="Use {quantidade} para o número de salas e {nome} para o nome da galeria.">
          <textarea id="cfg-home-texto" name="homeTexto" defaultValue={config.homeTexto} rows={2} className="input" />
        </Campo>
        <Campo id="cfg-home-vazio" rotulo="Texto quando não há salas" ajuda="Use {nome} para o nome da galeria.">
          <textarea id="cfg-home-vazio" name="homeTextoVazio" defaultValue={config.homeTextoVazio} rows={2} className="input" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="cfg-whatsapp" rotulo="WhatsApp da administração" ajuda="Com DDD. Mostra os botões “Tenho interesse”. Deixe vazio para esconder.">
            <input id="cfg-whatsapp" name="whatsappContato" defaultValue={config.whatsappContato} inputMode="tel" placeholder="81 99999-9999" className="input" />
          </Campo>
          <Campo id="cfg-rodape" rotulo="Texto do rodapé (opcional)" ajuda="Ex.: horário de funcionamento ou CNPJ.">
            <input id="cfg-rodape" name="rodapeTexto" defaultValue={config.rodapeTexto} className="input" />
          </Campo>
        </div>
        <Marcar id="cfg-precos" nome="homeMostrarPrecos" rotulo="Mostrar o valor do aluguel nos anúncios" padrao={config.homeMostrarPrecos} />
      </Secao>

      <Secao id="localizacao" titulo="Localização" descricao="Mapa no fim da página inicial.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="cfg-endereco" rotulo="Endereço exibido" ajuda="Aparece ao lado do nome, ex.: Rua X, 123 · Recife, PE.">
            <input id="cfg-endereco" name="endereco" defaultValue={config.endereco} className="input" />
          </Campo>
          <Campo id="cfg-mapa-link" rotulo="Link do Google Maps" ajuda="Cole o link de “Compartilhar” do Google Maps. É o destino do botão “Abrir no Google Maps”.">
            <input id="cfg-mapa-link" name="mapaLink" type="url" defaultValue={config.mapaLink} placeholder="https://maps.app.goo.gl/..." className="input" />
          </Campo>
        </div>
        <Campo id="cfg-mapa-consulta" rotulo="Ponto no mapa" ajuda="Endereço completo ou coordenadas (latitude,longitude). Deixe vazio para tirar do link ao salvar.">
          <div className="flex flex-wrap gap-2">
            <input
              id="cfg-mapa-consulta"
              name="mapaConsulta"
              value={mapaConsulta}
              onChange={(e) => setMapaConsulta(e.target.value)}
              className="input min-w-0 flex-[1_1_280px]"
            />
            <button type="button" className="btn-secondary" onClick={() => setMapaPrevia(mapaConsulta)} disabled={!mapaConsulta}>
              Ver no mapa
            </button>
          </div>
        </Campo>
        <Marcar id="cfg-extrair" nome="extrairDoLink" rotulo="Atualizar o ponto do mapa a partir do link ao salvar" padrao={false} />
        <Marcar id="cfg-mapa" nome="mostrarMapa" rotulo="Mostrar o mapa na página inicial" padrao={config.mostrarMapa} />
        {mapaPrevia && (
          <div className="overflow-hidden rounded-xl border border-stone-200">
            <iframe src={urlMapaEmbed(mapaPrevia)} title="Prévia do mapa" className="block h-[240px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}
      </Secao>

      <Secao id="acesso" titulo="Login e cadastro" descricao="Texto do painel lateral das telas de entrar e de cadastro.">
        <Campo id="cfg-login-titulo" rotulo="Título">
          <input id="cfg-login-titulo" name="loginTitulo" defaultValue={config.loginTitulo} className="input" />
        </Campo>
        <Campo id="cfg-login-texto" rotulo="Texto">
          <textarea id="cfg-login-texto" name="loginTexto" defaultValue={config.loginTexto} rows={2} className="input" />
        </Campo>
      </Secao>

      <Secao id="cobranca" titulo="Cobrança" descricao="Regras usadas nos boletos, nos avisos e nos contratos novos.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="cfg-dias" rotulo="Dias até entrar em cobrança" ajuda="Contados a partir do vencimento.">
            <input id="cfg-dias" name="diasTolerancia" type="number" min={1} max={30} required value={dias} onChange={(e) => setDias(e.target.value)} className="input" />
          </Campo>
          <Campo id="cfg-multa" rotulo="Multa padrão (%)" ajuda="Sugerida em contratos novos.">
            <input id="cfg-multa" name="multaPadrao" inputMode="decimal" required defaultValue={String(config.multaPadrao).replace(".", ",")} className="input" />
          </Campo>
          <Campo id="cfg-juros" rotulo="Juros padrão (% ao mês)" ajuda="Sugeridos em contratos novos.">
            <input id="cfg-juros" name="jurosPadrao" inputMode="decimal" required defaultValue={String(config.jurosPadrao).replace(".", ",")} className="input" />
          </Campo>
        </div>
        <Campo
          id="cfg-mensagem"
          rotulo="Mensagem de cobrança no WhatsApp"
          ajuda={<>Use {"{nome}"}, {"{mes}"}, {"{vencimento}"}, {"{valor}"}, {"{dias}"} e {"{galeria}"}. Eles são trocados pelos dados de cada boleto.</>}
        >
          <textarea id="cfg-mensagem" name="mensagemCobranca" value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={6} className="input" />
        </Campo>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-[1_1_320px] rounded-xl bg-stone-50 p-3.5">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600">Prévia</span>
            <p className="whitespace-pre-line rounded-xl rounded-bl-sm bg-[#ddf6e5] px-3.5 py-3 text-sm leading-relaxed text-[#0b2e1a]">{previaMensagem}</p>
          </div>
          {mensagem !== MENSAGEM_COBRANCA_PADRAO && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setMensagem(MENSAGEM_COBRANCA_PADRAO)}>
              Restaurar mensagem padrão
            </button>
          )}
        </div>
      </Secao>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur md:-mx-10 md:px-10">
        <BotaoSalvar />
        {estado?.ok && <span className="text-sm font-semibold text-[#14532d]" role="status">{estado.ok}</span>}
        {estado?.aviso && <span className="text-sm text-[#7a3306]" role="status">{estado.aviso}</span>}
        {estado?.erro && <span className="text-sm text-red-700" role="alert">{estado.erro}</span>}
      </div>
    </form>
  );
}
