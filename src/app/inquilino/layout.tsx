import { AppShell, type ItemMenu } from "@/components/AppShell";
import { getConfig } from "@/lib/config";
import { exigirPerfil } from "@/lib/auth";
import { hojeISO } from "@/lib/format";

export default async function InquilinoLayout({ children }: { children: React.ReactNode }) {
  const [{ supabase, perfil }, config] = await Promise.all([exigirPerfil("inquilino"), getConfig()]);
  const [{ count: pendencias }, { data: salas }] = await Promise.all([
    supabase
      .from("cobrancas")
      .select("id", { count: "exact", head: true })
      .eq("inquilino_id", perfil.id)
      .eq("status", "pendente")
      .lte("vencimento", hojeISO()),
    supabase.from("salas").select("nome").eq("inquilino_id", perfil.id).order("nome"),
  ]);

  const menu: ItemMenu[] = [
    { href: "/inquilino", rotulo: "Início", icone: "inicio" },
    { href: "/inquilino/pagamentos", rotulo: "Pagamentos", icone: "pagamentos", contador: pendencias ?? 0, corContador: "alerta" },
    { href: "/inquilino/multas", rotulo: "Multas", icone: "multas" },
    { href: "/inquilino/contratos", rotulo: "Contratos", icone: "contratos" },
    { href: "/inquilino/galeria", rotulo: "A Galeria", icone: "galeria" },
    { href: "/inquilino/chamados", rotulo: "Chamados", icone: "chamados" },
  ];

  return (
    <AppShell
      galeria={{ nome: config.nome, logo: config.logoMarcaUrl }}
      titulo="Portal do Inquilino"
      usuario={perfil.nome || perfil.email}
      perfil={salas?.length ? salas.map((s) => s.nome).join(", ") : "Inquilino"}
      menu={menu}
    >
      {children}
    </AppShell>
  );
}
