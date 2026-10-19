import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { AuthCard } from "@/components/AuthCard";

export default function LoginPage({ searchParams }: { searchParams: { erro?: string } }) {
  const erro =
    searchParams.erro === "inativo"
      ? "Seu acesso está desativado. Fale com a administração."
      : searchParams.erro === "confirmacao"
        ? "Não foi possível confirmar o e-mail. Tente entrar ou peça um novo link."
        : undefined;
  return (
    <AuthCard titulo="Entrar" subtitulo="Acesse o portal da galeria">
      <LoginForm erroInicial={erro} />
      <p className="mt-6 text-center text-sm text-slate-500">
        É inquilino e ainda não tem acesso?{" "}
        <Link href="/cadastro" className="link">Cadastre-se</Link>
      </p>
    </AuthCard>
  );
}
