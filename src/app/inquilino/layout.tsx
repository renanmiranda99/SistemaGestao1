import { AppShell } from "@/components/AppShell";
import { exigirPerfil } from "@/lib/auth";

const MENU = [
  { href: "/inquilino", rotulo: "Início" },
  { href: "/inquilino/pagamentos", rotulo: "Pagamentos" },
  { href: "/inquilino/multas", rotulo: "Multas" },
  { href: "/inquilino/contratos", rotulo: "Contratos" },
  { href: "/inquilino/galeria", rotulo: "A Galeria" },
  { href: "/inquilino/chamados", rotulo: "Chamados" },
];

export default async function InquilinoLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirPerfil("inquilino");
  return (
    <AppShell titulo="Portal do Inquilino" usuario={perfil.nome || perfil.email} perfil="Inquilino" menu={MENU}>
      {children}
    </AppShell>
  );
}
