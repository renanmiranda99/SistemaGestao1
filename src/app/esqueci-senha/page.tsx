import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { PedirLink } from "./FormularioSenha";

export default function EsqueciSenhaPage() {
  return (
    <AuthCard titulo="Esqueci a senha" subtitulo="Informe o e-mail do seu cadastro e enviaremos um link para você criar uma senha nova.">
      <PedirLink />
      <p className="mt-6 text-center text-sm text-stone-600">
        Lembrou a senha? <Link href="/login" className="link">Voltar para o login</Link>
      </p>
    </AuthCard>
  );
}
