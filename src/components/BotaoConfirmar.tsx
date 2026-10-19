"use client";

import { useFormStatus } from "react-dom";

/** Botão de submit que pede confirmação antes de enviar o formulário. */
export function BotaoConfirmar({
  children,
  mensagem,
  className = "btn-secondary btn-sm",
}: {
  children: React.ReactNode;
  mensagem?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (mensagem && !window.confirm(mensagem)) e.preventDefault();
      }}
    >
      {pending ? "..." : children}
    </button>
  );
}
