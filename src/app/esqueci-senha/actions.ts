"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EstadoSenha = { erro?: string; ok?: string } | null;

/**
 * Envia o e-mail de redefinição de senha. A resposta é sempre a mesma, exista
 * ou não o e-mail, para não revelar quem tem cadastro.
 */
export async function pedirRedefinicao(_: EstadoSenha, form: FormData): Promise<EstadoSenha> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };

  const origem = headers().get("origin") ?? "";
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/auth/callback?next=/redefinir-senha`,
  });
  if (error?.status === 429) {
    return { erro: "Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo." };
  }
  return {
    ok: "Se este e-mail estiver cadastrado, você vai receber um link para criar uma senha nova. Confira também a caixa de spam.",
  };
}

/** Grava a senha nova do usuário que abriu o link do e-mail. */
export async function redefinirSenha(_: EstadoSenha, form: FormData): Promise<EstadoSenha> {
  const senha = String(form.get("senha") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmar) return { erro: "As senhas não conferem." };

  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { erro: "O link expirou ou já foi usado. Peça um novo em “Esqueci a senha”." };

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    if (error.code === "same_password") return { erro: "A senha nova precisa ser diferente da anterior." };
    if (error.code === "weak_password") return { erro: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números." };
    return { erro: `Não foi possível trocar a senha: ${error.message}` };
  }

  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(perfil?.role === "admin" ? "/admin?senha=redefinida" : "/inquilino?senha=redefinida");
}
