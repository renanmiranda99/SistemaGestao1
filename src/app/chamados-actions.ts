"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function enviarMensagemChamado(chamadoId: string, form: FormData) {
  const mensagem = String(form.get("mensagem") ?? "").trim();
  if (!mensagem) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("chamado_mensagens").insert({ chamado_id: chamadoId, autor_id: user.id, mensagem });
  revalidatePath(`/inquilino/chamados/${chamadoId}`);
  revalidatePath(`/admin/chamados/${chamadoId}`);
}

export async function alterarStatusChamado(chamadoId: string, form: FormData) {
  const status = String(form.get("status") ?? "");
  if (!["aberto", "em_andamento", "resolvido", "fechado"].includes(status)) return;
  const supabase = createClient();
  // RLS: só o admin consegue alterar
  await supabase.from("chamados").update({ status, updated_at: new Date().toISOString() }).eq("id", chamadoId);
  revalidatePath(`/admin/chamados/${chamadoId}`);
  revalidatePath("/admin/chamados");
}
