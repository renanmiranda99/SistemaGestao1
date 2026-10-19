"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/actions";

export type ItemMenu = { href: string; rotulo: string };

export function AppShell({
  titulo,
  usuario,
  perfil,
  menu,
  children,
}: {
  titulo: string;
  usuario: string;
  perfil: string;
  menu: ItemMenu[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const raiz = menu[0]?.href;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={raiz ?? "/"} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              G
            </span>
            <span className="font-semibold text-slate-900">{titulo}</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden text-right sm:block">
              <div className="font-medium text-slate-800">{usuario}</div>
              <div className="text-xs text-slate-500">{perfil}</div>
            </div>
            <form action={sair}>
              <button className="btn-secondary btn-sm">Sair</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1 whitespace-nowrap">
            {menu.map((item) => {
              const ativo = item.href === raiz ? path === item.href : path.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-block border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                      ativo
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
