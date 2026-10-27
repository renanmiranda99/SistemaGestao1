import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/AuthCard";
import { NovaSenha } from "../esqueci-senha/FormularioSenha";

export const dynamic = "force-dynamic";

/** Aberta pelo link do e-mail de redefinição (o callback já criou a sessão). */
export default async function RedefinirSenhaPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <AuthCard titulo="Link expirado" subtitulo="Este link de redefinição já foi usado ou passou do prazo.">
        <Link href="/esqueci-senha" className="btn-primary w-full">Pedir um link novo</Link>
        <p className="mt-6 text-center text-sm text-stone-600">
          <Link href="/login" className="link">Voltar para o login</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Criar senha nova" subtitulo={`Conta: ${data.user.email}`}>
      <NovaSenha />
    </AuthCard>
  );
}
