import Link from "next/link";
import { CadastroForm } from "./CadastroForm";
import { AuthCard } from "@/components/AuthCard";

export default function CadastroPage() {
  return (
    <AuthCard titulo="Cadastro de inquilino" subtitulo="Crie seu acesso ao portal da galeria">
      <CadastroForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta? <Link href="/login" className="link">Entrar</Link>
      </p>
    </AuthCard>
  );
}
