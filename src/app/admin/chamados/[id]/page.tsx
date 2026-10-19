import { exigirPerfil } from "@/lib/auth";
import { ChamadoDetalhe } from "@/components/ChamadoDetalhe";

export default async function ChamadoAdmin({ params }: { params: { id: string } }) {
  const { supabase } = await exigirPerfil("admin");
  return <ChamadoDetalhe supabase={supabase} id={params.id} modo="admin" />;
}
