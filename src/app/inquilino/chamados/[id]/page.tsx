import { exigirPerfil } from "@/lib/auth";
import { ChamadoDetalhe } from "@/components/ChamadoDetalhe";

export default async function ChamadoInquilino({ params }: { params: { id: string } }) {
  const { supabase } = await exigirPerfil("inquilino");
  return <ChamadoDetalhe supabase={supabase} id={params.id} modo="inquilino" />;
}
