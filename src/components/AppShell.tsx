"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/actions";

export type Icone = "home" | "configuracoes" | "painel" | "inicio" | "inquilinos" | "pagamentos" | "whatsapp" | "chamados" | "galeria" | "multas" | "contratos";

export type ItemMenu = {
  href: string;
  rotulo: string;
  icone: Icone;
  /** Número exibido ao lado do item (ex.: comprovantes a analisar). Oculto quando 0. */
  contador?: number;
  corContador?: "analise" | "aviso" | "alerta";
};

const COR_CONTADOR = {
  analise: "bg-[#e6defa] text-[#5b21b6]",
  aviso: "bg-[#f6d27a] text-[#4d3803]",
  alerta: "bg-[#ef9b52] text-[#3d1c04]",
};

const CAMINHOS: Record<Icone, React.ReactNode> = {
  configuracoes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  // Vitrine (página inicial pública)
  home: (
    <>
      <path d="M4 9l1.5-5h13L20 9" />
      <path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" />
      <path d="M5 11.5V20h14v-8.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  painel: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  inicio: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  inquilinos: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.8c1.8.7 3 2.5 3.5 5.2" />
    </>
  ),
  pagamentos: (
    <>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  whatsapp: <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />,
  chamados: <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z" />,
  galeria: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-5h6v5" />
    </>
  ),
  multas: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  contratos: (
    <>
      <path d="M14 3H6v18h12V7z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
};

function Svg({ children, tamanho = 20 }: { children: React.ReactNode; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function iniciais(nome: string) {
  return nome
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function AppShell({
  titulo,
  galeria,
  usuario,
  perfil,
  menu,
  children,
}: {
  titulo: string;
  /** Nome e logo da galeria, do painel de Configurações */
  galeria: { nome: string; logo: string };
  usuario: string;
  perfil: string;
  menu: ItemMenu[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const raiz = menu[0]?.href;
  const [aberto, setAberto] = useState(false);
  const ativo = (href: string) => (href === raiz ? path === href : path.startsWith(href));

  // Fecha o menu ao navegar
  useEffect(() => setAberto(false), [path]);

  // Esc fecha; trava a rolagem da página com o menu aberto
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberto]);

  const marca = (
    <Link href="/" title="Ir para a página inicial" className="flex min-w-0 items-center gap-3 rounded-[10px] px-2 hover:opacity-90">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={galeria.logo} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-[10px] ring-1 ring-white/25" />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-white">{galeria.nome}</span>
        <span className="block truncate text-xs text-white/60">{titulo}</span>
      </span>
    </Link>
  );

  const navegacao = (emGaveta: boolean) => (
    <nav aria-label="Menu principal">
      {/* Volta para a página inicial (salas disponíveis e mapa da galeria) */}
      <Link
        href="/"
        tabIndex={emGaveta && !aberto ? -1 : undefined}
        className="mb-3 flex min-h-11 items-center gap-3 rounded-[10px] border border-white/15 px-3 text-sm font-medium text-white/80 transition hover:bg-brand-800 hover:text-white"
      >
        <Svg>{CAMINHOS.home}</Svg>
        <span className="flex-1">Home</span>
      </Link>
      <ul className="flex flex-col gap-1">
        {menu.map((item) => {
          const atual = ativo(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                tabIndex={emGaveta && !aberto ? -1 : undefined}
                aria-current={atual ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition ${
                  atual ? "bg-stone-50 text-brand-900" : "text-white/80 hover:bg-brand-800 hover:text-white"
                }`}
              >
                <Svg>{CAMINHOS[item.icone]}</Svg>
                <span className="flex-1">{item.rotulo}</span>
                {!!item.contador && (
                  <span
                    className={`grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-bold ${COR_CONTADOR[item.corContador ?? "analise"]}`}
                    aria-label={`${item.contador} pendente(s)`}
                  >
                    {item.contador}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const rodape = (emGaveta: boolean) => (
    <div className="mt-auto flex items-center gap-3 rounded-xl bg-brand-800 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white">
        {iniciais(usuario)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{usuario}</span>
        <span className="block truncate text-xs text-white/60">{perfil}</span>
      </span>
      <form action={sair}>
        <button
          className="grid h-11 w-11 place-items-center rounded-[10px] text-white/80 hover:bg-brand-900 hover:text-white"
          aria-label="Sair"
          title="Sair"
          tabIndex={emGaveta && !aberto ? -1 : undefined}
        >
          <Svg>
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 16l-4-4 4-4" />
            <path d="M6 12h10" />
          </Svg>
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop: menu lateral fixo */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-7 overflow-y-auto bg-brand-900 px-4 py-6 md:flex">
        {marca}
        {navegacao(false)}
        {rodape(false)}
      </aside>

      {/* Mobile: barra superior */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-brand-900 px-4 py-3 md:hidden">
        {marca}
        <button
          type="button"
          className="-mr-2 grid h-11 w-11 place-items-center rounded-[10px] text-white hover:bg-brand-800"
          aria-label="Abrir menu"
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          onClick={() => setAberto(true)}
        >
          <Svg tamanho={22}>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </Svg>
        </button>
      </header>

      {/* Mobile: gaveta lateral */}
      <div
        className={`fixed inset-0 z-40 bg-brand-900/50 transition-opacity md:hidden ${
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setAberto(false)}
        aria-hidden="true"
      />
      <aside
        id="menu-mobile"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-7 overflow-y-auto bg-brand-900 px-4 py-5 shadow-xl transition-[transform,visibility] duration-200 md:hidden ${
          aberto ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
        aria-hidden={!aberto}
      >
        <div className="flex items-center justify-between gap-2">
          {marca}
          <button
            type="button"
            className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-white/80 hover:bg-brand-800"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            tabIndex={aberto ? 0 : -1}
          >
            <Svg>
              <path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </button>
        </div>
        {navegacao(true)}
        {rodape(true)}
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
