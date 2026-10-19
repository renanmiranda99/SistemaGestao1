import { AppShell, type ItemMenu } from "@/components/AppShell";
import { exigirPerfil } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, perfil } = await exigirPerfil("admin");
  const [{ count: comprovantes }, { count: chamados }] = await Promise.all([
    supabase.from("comprovantes").select("id", { count: "exact", head: true }).eq("status", "em_analise"),
    supabase.from("chamados").select("id", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]),
  ]);

  const menu: ItemMenu[] = [
    { href: "/admin", rotulo: "Painel", icone: "painel" },
    { href: "/admin/inquilinos", rotulo: "Inquilinos", icone: "inquilinos" },
    { href: "/admin/pagamentos", rotulo: "Pagamentos", icone: "pagamentos", contador: comprovantes ?? 0, corContador: "analise" },
    { href: "/admin/whatsapp", rotulo: "WhatsApp", icone: "whatsapp" },
    { href: "/admin/chamados", rotulo: "Chamados", icone: "chamados", contador: chamados ?? 0, corContador: "aviso" },
    { href: "/admin/galeria", rotulo: "Galeria e salas", icone: "galeria" },
  ];

  return (
    <AppShell titulo="Administração" usuario={perfil.nome || perfil.email} perfil="Administrador" menu={menu}>
      {children}
    </AppShell>
  );
}
