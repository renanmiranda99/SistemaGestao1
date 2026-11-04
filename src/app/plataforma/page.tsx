import Link from "next/link";
import type { Metadata } from "next";
import { getSessao } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { somenteDigitos } from "@/lib/format";
import { telefoneWhatsApp } from "@/lib/whatsapp";
import { BotaoTema } from "@/components/BotaoTema";

export const metadata: Metadata = {
  title: "Asa Gestão de Imóveis · gestão patrimonial para proprietários",
  description:
    "Receita, inadimplência, ocupação e contratos de todos os seus imóveis em um painel, com cobrança, WhatsApp e portal do inquilino.",
};

export const dynamic = "force-dynamic";

/** Leva cada cliente ao seu sistema de gestão (este app). */
function BotaoEntrar({ gestao, claro = false, tamanho = "normal" }: { gestao: string; claro?: boolean; tamanho?: "normal" | "pequeno" }) {
  const alt = tamanho === "pequeno" ? "min-h-10" : "min-h-12 px-5 text-[15px]";
  return (
    <Link href={gestao} className={`btn self-start ${alt} ${claro ? "bg-white text-[#0a2540] hover:bg-white/90" : "bg-brand-600 text-white hover:bg-brand-700"}`}>
      Entrar
    </Link>
  );
}

function Marca() {
  return (
    <Link href="/plataforma" aria-label="Asa Gestão de Imóveis, início" className="flex items-center gap-3 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/asa-gestao-icone.svg" alt="" width={40} height={40} className="h-10 w-10 rounded-full ring-1 ring-white/30" />
      <span className="flex flex-col gap-1 leading-none">
        <span className="font-['Manrope',_Inter,_sans-serif] text-[22px] font-extrabold tracking-[-0.02em]">Asa</span>
        <span className="font-['Manrope',_Inter,_sans-serif] text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">Gestão de Imóveis</span>
      </span>
    </Link>
  );
}

const Kicker = ({ children, claro = false }: { children: React.ReactNode; claro?: boolean }) => (
  <span className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${claro ? "text-[#d6d3ff]" : "text-brand-600"}`}>{children}</span>
);
const Titulo = ({ children, claro = false }: { children: React.ReactNode; claro?: boolean }) => (
  <h2 className={`text-[30px] font-semibold leading-tight tracking-[-0.02em] md:text-[40px] ${claro ? "text-white" : "text-stone-900"}`}>{children}</h2>
);

// Grade mês a mês de exemplo, com as mesmas cores do painel
const CELULA = {
  P: ["✓", "bg-[#228403] text-white"],
  L: ["✓", "bg-[#d7f7c2] text-[#05690d] shadow-[inset_0_0_0_2px_#d97917]"],
  A: ["?", "bg-[#cff5f6] text-[#0055bc]"],
  C: ["!", "bg-[#df1b41] text-white"],
  V: ["!", "bg-[#fa8b48] text-[#3d1c04]"],
  J: ["§", "bg-[#635bff] text-white"],
  F: ["–", "bg-stone-100 text-stone-600"],
} as const;
const GRADE: [string, string][] = [
  ["Loja 01", "PPPPPP"],
  ["Loja 04", "PPLCCC"],
  ["Sala 102", "PPPPLA"],
  ["Sala 205", "JJJPPV"],
  ["Loja 12", "PLPPPF"],
];
const MESES = ["Mai", "Jun", "Jul", "Ago", "Set", "Out"];
const BARRAS: [number, number][] = [[86, 80], [88, 84], [90, 78], [92, 90], [95, 88], [100, 79]];

const GANHOS = [
  { t: "Visibilidade", d: "Quanto entrou, quem está atrasado e qual sala está vaga, imóvel por imóvel, mês a mês. Sem esperar o relatório do fim do mês.", cor: "bg-[#e5e3ff] text-[#3d33cc] dark:bg-[#24214d] dark:text-[#b8b3ff]", icone: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></> },
  { t: "Tempo", d: "Mensalidades lançadas sozinhas, lembretes e cobranças pelo WhatsApp na hora certa, comprovantes enviados pelo próprio inquilino.", cor: "bg-[#d7f7c2] text-[#05690d] dark:bg-[#12361d] dark:text-[#8fe3a1]", icone: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  { t: "Controle", d: "Contratos, aditivos, fiadores, vistorias com fotos e acordos judiciais organizados e com alerta antes de vencer.", cor: "bg-[#fcedb9] text-[#a82c00] dark:bg-[#3a2e0d] dark:text-[#f5cf6b]", icone: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></> },
];

const RECURSOS = [
  ["Cobrança automática", "Mensalidades lançadas todo mês, com multa e juros calculados pelo contrato."],
  ["WhatsApp na régua certa", "Lembrete antes do vencimento e cobrança a partir do dia que você definir."],
  ["Portal do inquilino", "Boleto, Pix, comprovantes, contratos e chamados num só lugar para cada locatário."],
  ["Leitura de contrato com IA", "Envie o PDF assinado e os dados do contrato e do fiador já vêm preenchidos."],
  ["Contratos e aditivos", "Vigência, reajustes e documentos com alerta antes do vencimento."],
  ["Vistoria com fotos", "Registro de entrada, saída e danos, guardado com data para eventual cobrança."],
  ["Acordos judiciais", "Mensalidades quitadas por acordo contam como pagas e ficam documentadas."],
  ["Unidades disponíveis", "Salas vagas anunciadas numa página pública com fotos, mapa e contato."],
];

const PUBLICOS = [
  ["Galerias e centros comerciais", "Dezenas de lojas e salas, um único painel, portal para cada lojista e anúncio das unidades vagas."],
  ["Proprietários com vários imóveis", "Salas, lojas e apartamentos alugados sem imobiliária, com a cobrança e os contratos em ordem."],
  ["Holdings e administradoras patrimoniais", "Patrimônio da família ou de clientes com relatórios claros para sócios, herdeiros e contador."],
];

const COMPARATIVO = [
  ["Painel de receita e inadimplência", "Montado à mão", "Focado na imobiliária", "Em tempo real, por imóvel"],
  ["Cobrança e lembretes", "Manual", "E-mail e boleto", "Boleto, Pix e WhatsApp automático"],
  ["Portal do inquilino", "Não tem", "Às vezes", "Incluído"],
  ["Contratos, aditivos e fiador", "Pastas soltas", "Sim", "Sim, com leitura do PDF"],
  ["Vistoria e acordos judiciais", "Não tem", "Raramente", "Incluídos"],
  ["Sua marca no sistema", "Não se aplica", "Marca do fornecedor", "Nome, logo e cores seus"],
];

const PASSOS = [
  ["Cadastre os imóveis", "Envie o PDF do contrato e o sistema preenche inquilino, valores, datas e fiador para você conferir."],
  ["Ligue a cobrança", "Mensalidades lançadas todo mês, boleto e Pix para o inquilino e lembretes no WhatsApp."],
  ["Acompanhe pelo painel", "Receita, atrasos, ocupação e contratos num só lugar, no computador ou no celular."],
];

const PLANO_GESTAO = [
  "Painel do proprietário em tempo real",
  "Contratos, aditivos, fiadores e vistorias",
  "Cobrança automática com boleto e Pix",
  "Lembretes e cobranças pelo WhatsApp",
  "Portal do inquilino e chamados",
  "Leitura de contrato com IA e acordos judiciais",
];

const PERGUNTAS = [
  ["O que inclui o Plano Gestão de R$ 29,90?", "Para até 3 imóveis: o painel do proprietário, contratos, cobrança com boleto e Pix, WhatsApp, portal do inquilino, vistorias e acordos. Cenários com necessidades específicas vão para o Plano Customizado."],
  ["Já contratei. Como entro no meu sistema?", "Use o botão “Entrar” no topo desta página ou no fim dela. Ele leva ao login do seu painel; depois de configurado, você entra direto na administração dos seus imóveis."],
  ["Preciso de uma imobiliária para usar?", "Não. A plataforma foi feita para o próprio dono administrar. Se você trabalha com uma administradora, ela também pode usar o sistema e você acompanha pelo painel."],
  ["Como o inquilino paga e envia o comprovante?", "Cada inquilino tem um portal próprio com o boleto ou o Pix do mês, o histórico de pagamentos e o envio do comprovante. Você aprova com um clique."],
  ["A cobrança pelo WhatsApp é automática?", "Sim. Os lembretes e as cobranças seguem uma régua configurável a partir do vencimento, e você pode desligar o envio para qualquer inquilino."],
  ["Consigo usar com a marca do meu empreendimento?", "Sim. Nome, logo, cores, textos e localização são configurados no painel, e o portal do inquilino sai com a sua identidade."],
  ["Meus dados ficam seguros?", "Os dados ficam em banco com controle de acesso por perfil, documentos em armazenamento privado e tratamento conforme a LGPD."],
];

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default async function Plataforma() {
  const [{ perfil }, config] = await Promise.all([getSessao(), getConfig()]);
  // Quem já está logado vai direto ao próprio painel
  const gestao = perfil ? (perfil.role === "admin" ? "/admin" : "/inquilino") : "/login";
  const whatsapp = somenteDigitos(config.whatsappContato) ? telefoneWhatsApp(config.whatsappContato) : null;
  const linkCustomizado = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá! Quero conhecer o Plano Customizado do Asa Gestão de Imóveis.")}`
    : "#acesso";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Topo e chamada principal */}
      <header className="faixa-marca text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-[18px]">
          <Marca />
          <nav aria-label="Principal" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
            <a href="#painel" className="text-white/80 hover:text-white">O painel</a>
            <a href="#recursos" className="text-white/80 hover:text-white">Recursos</a>
            <a href="#para-quem" className="text-white/80 hover:text-white">Para quem</a>
            <a href="#precos" className="text-white/80 hover:text-white">Preços</a>
            <BotaoTema claro />
            <BotaoEntrar gestao={gestao} claro tamanho="pequeno" />
          </nav>
        </div>

        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6 pb-20 pt-12 md:pb-[88px] md:pt-14">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[22px]">
            <Kicker claro>Gestão patrimonial para proprietários de imóveis</Kicker>
            <h1 className="text-[40px] font-light leading-[1.05] tracking-[-0.03em] md:text-[58px]">Seu patrimônio imobiliário inteiro em um painel.</h1>
            <p className="text-[19px] leading-relaxed text-white/80">
              Receita, inadimplência, ocupação e contratos de todos os seus imóveis em tempo real. A cobrança, os lembretes e o atendimento aos inquilinos rodam sozinhos: você só acompanha e decide.
            </p>
            <BotaoEntrar gestao={gestao} claro />
            <ul className="flex flex-wrap gap-[18px] text-sm text-white/70">
              <li>Boleto e Pix</li>
              <li>Cobrança pelo WhatsApp</li>
              <li>Portal do inquilino</li>
              <li>Lei do Inquilinato</li>
            </ul>
          </div>

          {/* Prévia do painel (dados fictícios) */}
          <figure className="min-w-0 flex-[1_1_520px] rounded-xl bg-superficie p-5 text-stone-900 shadow-[0_30px_60px_rgba(10,37,64,0.35),0_18px_36px_rgba(0,0,0,0.2)]" aria-label="Exemplo do painel do proprietário com dados fictícios">
            <div className="mb-3.5 flex items-center justify-between">
              <b className="text-[15px]">Visão geral · outubro</b>
              <span className="text-xs text-stone-600">dados de exemplo</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                ["Recebido no mês", "R$ 48.300", "text-[#228403]", "de R$ 61.200 previstos"],
                ["Inadimplência", "6,4%", "text-[#df1b41]", "3 contratos em cobrança"],
                ["Ocupação", "22 de 24", "text-stone-900", "2 unidades anunciadas"],
                ["Contratos a vencer", "4", "text-[#a82c00] dark:text-[#f5cf6b]", "nos próximos 60 dias"],
              ].map(([r, v, cor, s]) => (
                <div key={r} className="rounded-lg bg-stone-50 p-3.5">
                  <span className="text-xs text-stone-600">{r}</span>
                  <div className={`text-[22px] font-semibold tabular-nums ${cor}`}>{v}</div>
                  <span className="text-xs text-stone-600">{s}</span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 rounded-lg border border-stone-200 p-3.5">
              <span className="text-xs text-stone-600">Recebido × previsto, últimos 6 meses</span>
              <div className="mt-2.5 flex h-24 items-end gap-3" aria-hidden="true">
                {BARRAS.map(([p, r], i) => (
                  <div key={i} className="flex h-full flex-1 items-end gap-[3px]">
                    <span className="flex-1 rounded bg-brand-200" style={{ height: `${p}%` }} />
                    <span className={`flex-1 rounded ${i === BARRAS.length - 1 ? "bg-[#228403]" : "bg-brand-600"}`} style={{ height: `${r}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-stone-600">
                <span>■ previsto</span>
                <span className="text-brand-600">■ recebido</span>
                <span className="text-[#228403]">■ mês atual</span>
              </div>
            </div>
          </figure>
        </div>
      </header>

      {/* Três ganhos */}
      <section className="py-20">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Kicker>Por que muda a sua rotina</Kicker>
            <Titulo>Deixe de administrar planilhas. Passe a administrar patrimônio.</Titulo>
          </div>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {GANHOS.map((g) => (
              <article key={g.t} className="card flex flex-col gap-3 p-7">
                <span aria-hidden="true" className={`grid h-11 w-11 place-items-center rounded-lg ${g.cor}`}>
                  <Icone>{g.icone}</Icone>
                </span>
                <h3 className="text-[21px] font-semibold">{g.t}</h3>
                <p className="leading-relaxed text-stone-600">{g.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* O painel */}
      <section id="painel" className="bg-superficie py-20">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
            <Kicker>O painel do proprietário</Kicker>
            <Titulo>Decisões com números, não com achismo.</Titulo>
            <p className="text-lg leading-relaxed text-stone-600">
              Cada mensalidade aparece numa grade mês a mês: paga em dia, paga com atraso, em análise, vencida, em cobrança ou quitada por acordo. Passe o mouse e veja a data e o valor pago.
            </p>
            <ul className="flex flex-col gap-3 text-stone-700">
              <li>✓ Receita prevista × recebida por imóvel e por mês</li>
              <li>✓ Inadimplência com dias de atraso, multa e juros calculados</li>
              <li>✓ Ocupação e unidades anunciadas para aluguel</li>
              <li>✓ Contratos a vencer e reajustes no radar</li>
            </ul>
          </div>
          <figure className="card min-w-0 flex-[1_1_560px] overflow-x-auto p-[22px]" aria-label="Exemplo da grade mês a mês com dados fictícios">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[150px_repeat(6,minmax(0,1fr))] items-center gap-2 pb-2.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                <span>Unidade</span>
                {MESES.map((m) => <span key={m}>{m}</span>)}
              </div>
              {GRADE.map(([nome, codigo]) => (
                <div key={nome} className="grid grid-cols-[150px_repeat(6,minmax(0,1fr))] items-center gap-2 border-t border-stone-200 py-2">
                  <span className="text-sm font-semibold">{nome}</span>
                  {codigo.split("").map((k, i) => {
                    const [s, cor] = CELULA[k as keyof typeof CELULA];
                    return <span key={i} className={`grid h-[30px] place-items-center rounded-md text-[13px] font-bold ${cor}`}>{s}</span>;
                  })}
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-3.5 text-xs text-stone-600">
                <span>✓ paga</span><span>! em atraso</span><span>? em análise</span><span>§ acordo</span><span>– a vencer</span>
              </div>
            </div>
          </figure>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-20">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Kicker>Tudo o que a administração precisa</Kicker>
            <Titulo>Do contrato assinado ao aluguel na conta.</Titulo>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {RECURSOS.map(([t, d]) => (
              <article key={t} className="card flex flex-col gap-2 p-6">
                <b className="text-[17px]">{t}</b>
                <span className="text-[15px] leading-relaxed text-stone-600">{d}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem */}
      <section id="para-quem" className="faixa-marca py-20 text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Kicker claro>Para quem é</Kicker>
            <Titulo claro>Feito para quem é dono, não para quem intermedia.</Titulo>
            <p className="text-lg leading-relaxed text-white/80">Os sistemas de imobiliária foram pensados para corretores. Aqui o centro é o proprietário e o resultado do patrimônio.</p>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {PUBLICOS.map(([t, d]) => (
              <article key={t} className="flex flex-col gap-2.5 rounded-lg border border-white/15 bg-white/[0.08] p-7">
                <b className="text-[19px]">{t}</b>
                <span className="text-[15px] leading-relaxed text-white/80">{d}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section className="py-20">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Kicker>Comparativo</Kicker>
            <Titulo>Planilha, sistema de imobiliária ou gestão patrimonial?</Titulo>
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[680px] border-collapse text-[15px]">
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wide text-stone-600">
                  <th className="border-b border-stone-200 px-5 py-4"><span className="sr-only">Item</span></th>
                  <th className="border-b border-stone-200 px-5 py-4 font-semibold">Planilha</th>
                  <th className="border-b border-stone-200 px-5 py-4 font-semibold">Sistema de imobiliária</th>
                  <th className="border-b border-stone-200 px-5 py-4 font-semibold text-brand-600">Asa</th>
                </tr>
              </thead>
              <tbody>
                {COMPARATIVO.map(([item, a, b, c]) => (
                  <tr key={item}>
                    <td className="border-b border-stone-200 px-5 py-3.5 font-semibold">{item}</td>
                    <td className="border-b border-stone-200 px-5 py-3.5 text-stone-600">{a}</td>
                    <td className="border-b border-stone-200 px-5 py-3.5 text-stone-600">{b}</td>
                    <td className="border-b border-stone-200 px-5 py-3.5 font-semibold">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-superficie py-20">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Kicker>Como funciona</Kicker>
            <Titulo>Em operação em uma tarde.</Titulo>
          </div>
          <ol className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {PASSOS.map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-2.5">
                <span className="text-[15px] font-semibold tabular-nums text-brand-600">{String(i + 1).padStart(2, "0")}</span>
                <b className="text-[19px]">{t}</b>
                <span className="text-[15px] leading-relaxed text-stone-600">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Planos */}
      <section id="precos" className="py-20">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Kicker>Planos</Kicker>
            <Titulo>Um plano simples. Ou um sob medida.</Titulo>
          </div>
          <div className="grid max-w-[920px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            <article className="card flex flex-col gap-4 p-8 shadow-[0_0_0_2px_rgb(var(--brand-600)),0_15px_35px_rgba(50,50,93,0.12)] dark:shadow-[0_0_0_2px_rgb(var(--brand-600))]">
              <span className="self-start rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">Plano único</span>
              <b className="text-[22px]">Plano Gestão</b>
              <span className="text-[44px] font-semibold leading-none tabular-nums">
                R$ 29,90<span className="text-base font-normal text-stone-600">/mês</span>
              </span>
              <span className="text-sm font-semibold text-brand-600">Para até 3 imóveis</span>
              <ul className="flex flex-col gap-2.5 text-[15px] text-stone-700">
                {PLANO_GESTAO.map((r) => <li key={r}>✓ {r}</li>)}
              </ul>
              <div className="mt-auto pt-2">
                <BotaoEntrar gestao={gestao} />
              </div>
            </article>
            <article className="card flex flex-col gap-4 p-8">
              <span className="self-start rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">Sob medida</span>
              <b className="text-[22px]">Plano Customizado</b>
              <span className="text-[32px] font-semibold leading-tight">Sob consulta</span>
              <p className="text-[15px] leading-relaxed text-stone-600">
                Desenvolvido caso a caso para o seu cenário: mais de 3 imóveis, vários empreendimentos, integrações com o seu banco ou sistema, migração de dados e regras próprias de cobrança.
              </p>
              <a href={linkCustomizado} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined} className="btn-secondary mt-auto min-h-12">
                Quero um plano sob medida
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="bg-superficie py-20">
        <div className="mx-auto flex max-w-[880px] flex-col gap-7 px-6">
          <Titulo>Perguntas frequentes</Titulo>
          <div className="card divide-y divide-stone-200 overflow-hidden p-0">
            {PERGUNTAS.map(([p, r], i) => (
              <details key={p} open={i === 0} className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-6 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                  {p}
                  <span aria-hidden="true" className="text-[22px] text-brand-600 group-open:hidden">+</span>
                  <span aria-hidden="true" className="hidden text-[22px] text-brand-600 group-open:inline">−</span>
                </summary>
                <p className="px-6 pb-5 leading-relaxed text-stone-600">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Acesso aos sistemas */}
      <section id="acesso" className="faixa-marca py-[88px] text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-10 px-6">
          <div className="flex flex-[1_1_420px] flex-col gap-3.5">
            <Kicker claro>Já é cliente?</Kicker>
            <Titulo claro>Entre direto no seu sistema.</Titulo>
            <p className="text-lg leading-relaxed text-white/80">
              Depois de contratar o plano e configurar a sua página, é por aqui que você acessa a gestão dos seus imóveis.
            </p>
          </div>
          <BotaoEntrar gestao={gestao} claro />
        </div>
      </section>

      <footer className="bg-[#0a2540] py-7 text-sm text-white/70">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-6">
          <span>Asa Gestão de Imóveis · inspirada na asa-branca, ave do sertão</span>
          <span>Privacidade e LGPD · Termos · Contato</span>
        </div>
      </footer>
    </div>
  );
}
