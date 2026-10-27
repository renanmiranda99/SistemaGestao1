"use client";

import { useFormState, useFormStatus } from "react-dom";
import { pedirRedefinicao, redefinirSenha } from "./actions";

function Botao({ texto, enviando }: { texto: string; enviando: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? enviando : texto}
    </button>
  );
}

export function PedirLink() {
  const [estado, acao] = useFormState(pedirRedefinicao, null);
  if (estado?.ok) {
    return <p className="rounded-xl bg-[#e3f2e9] p-4 text-sm leading-relaxed text-[#0f3d24]" role="status">{estado.ok}</p>;
  }
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail cadastrado</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      {estado?.erro && <p className="text-sm text-red-700" role="alert">{estado.erro}</p>}
      <Botao texto="Enviar link" enviando="Enviando..." />
    </form>
  );
}

export function NovaSenha() {
  const [estado, acao] = useFormState(redefinirSenha, null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="label" htmlFor="senha">Senha nova</label>
        <input className="input" id="senha" name="senha" type="password" minLength={8} autoComplete="new-password" required autoFocus />
        <p className="mt-1.5 text-xs text-stone-600">Mínimo de 8 caracteres.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirmar">Confirmar senha nova</label>
        <input className="input" id="confirmar" name="confirmar" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      {estado?.erro && <p className="text-sm text-red-700" role="alert">{estado.erro}</p>}
      <Botao texto="Salvar senha nova" enviando="Salvando..." />
    </form>
  );
}
