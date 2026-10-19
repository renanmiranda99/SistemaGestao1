"use client";

import { useFormState, useFormStatus } from "react-dom";
import { entrar } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function LoginForm({ erroInicial }: { erroInicial?: string }) {
  const [estado, acao] = useFormState(entrar, erroInicial ? { erro: erroInicial } : null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <input className="input" id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Botao />
    </form>
  );
}
