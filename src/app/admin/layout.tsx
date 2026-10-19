import { AppShell } from "@/components/AppShell";
import { exigirPerfil } from "@/lib/auth";

const MENU = [
  { href: "/admin", rotulo: "Painel" },
  { href: "/admin/inquilinos", rotulo: "Inquilinos" },
  { href: "/admin/pagamentos", rotulo: "Pagamentos" },
  { href: "/admin/whatsapp", rotulo: "WhatsApp" },
  { href: "/admin/chamados", rotulo: "Chamados" },
  { href: "/admin/galeria", rotulo: "Galeria e salas" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirPerfil("admin");
  return (
    <AppShell titulo="Administração da Galeria" usuario={perfil.nome || perfil.email} perfil="Administrador" menu={MENU}>
      {children}
    </AppShell>
  );
}
