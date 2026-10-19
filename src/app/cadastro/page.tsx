import Link from "next/link";
import { CadastroForm } from "./CadastroForm";
import { AuthCard } from "@/components/AuthCard";

export default function CadastroPage() {
  return (
    <AuthCard titulo="Cadastro de inquilino" subtitulo="Depois do cadastro, a administração vincula seu contrato e seus boletos aparecem no portal.">
      <CadastroForm />
      <p className="mt-6 text-center text-sm text-stone-600">
        Já tem conta? <Link href="/login" className="link">Entrar</Link>
      </p>
    </AuthCard>
  );
}
