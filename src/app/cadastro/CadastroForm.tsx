"use client";

import { useFormState, useFormStatus } from "react-dom";
import { cadastrar } from "../login/actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? "Cadastrando..." : "Criar conta"}
    </button>
  );
}

export function CadastroForm() {
  const [estado, acao] = useFormState(cadastrar, null);
  if (estado?.ok) {
    return <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{estado.ok}</p>;
  }
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="label" htmlFor="nome">Nome completo / Razão social</label>
        <input className="input" id="nome" name="nome" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="telefone">WhatsApp (com DDD)</label>
          <input className="input" id="telefone" name="telefone" placeholder="(85) 99999-9999" required />
        </div>
        <div>
          <label className="label" htmlFor="cpf_cnpj">CPF ou CNPJ</label>
          <input className="input" id="cpf_cnpj" name="cpf_cnpj" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <input className="input" id="senha" name="senha" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <div>
          <label className="label" htmlFor="confirmar">Confirmar senha</label>
          <input className="input" id="confirmar" name="confirmar" type="password" minLength={8} autoComplete="new-password" required />
        </div>
      </div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <Botao />
    </form>
  );
}
