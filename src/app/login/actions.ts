"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; ok?: string } | null;

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed"))
      return { erro: "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada)." };
    return { erro: "E-mail ou senha incorretos." };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, ativo")
    .eq("id", data.user.id)
    .single();

  if (perfil && !perfil.ativo) {
    await supabase.auth.signOut();
    return { erro: "Seu acesso está desativado. Fale com a administração." };
  }
  redirect(perfil?.role === "admin" ? "/admin" : "/inquilino");
}

export async function cadastrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const telefone = String(form.get("telefone") ?? "").trim();
  const cpf_cnpj = String(form.get("cpf_cnpj") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");

  if (!nome || !email || !telefone || !senha) return { erro: "Preencha nome, e-mail, WhatsApp e senha." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmar) return { erro: "As senhas não conferem." };

  const origem = headers().get("origin") ?? "";
  const supabase = createClient();
  // O perfil é criado pelo banco SEMPRE como "inquilino" (o role não vem do formulário).
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, telefone, cpf_cnpj },
      emailRedirectTo: `${origem}/auth/callback`,
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already registered"))
      return { erro: "Este e-mail já está cadastrado." };
    return { erro: error.message };
  }
  if (data.session) redirect("/inquilino");
  return { ok: "Cadastro realizado! Enviamos um link de confirmação para o seu e-mail." };
}
