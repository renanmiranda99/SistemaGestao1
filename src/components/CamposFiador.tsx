import type { Contrato } from "@/lib/types";

/** Bloco de campos do fiador, usado em todos os formulários de contrato. */
export function CamposFiador({ prefixo, valores }: { prefixo: string; valores?: Partial<Contrato> | null }) {
  const id = (k: string) => `${prefixo}-fiador-${k}`;
  return (
    <fieldset className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:col-span-full">
      <legend className="px-1 text-sm font-semibold">Fiador <span className="font-normal text-stone-600">(opcional)</span></legend>
      <div>
        <label className="label" htmlFor={id("nome")}>Nome completo</label>
        <input id={id("nome")} name="fiador_nome" defaultValue={valores?.fiador_nome ?? ""} autoComplete="off" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={id("cpf")}>CPF ou CNPJ</label>
        <input id={id("cpf")} name="fiador_cpf" defaultValue={valores?.fiador_cpf ?? ""} inputMode="numeric" autoComplete="off" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={id("tel")}>Telefone / WhatsApp</label>
        <input id={id("tel")} name="fiador_telefone" defaultValue={valores?.fiador_telefone ?? ""} inputMode="tel" placeholder="(81) 99999-9999" autoComplete="off" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={id("email")}>E-mail</label>
        <input id={id("email")} name="fiador_email" type="email" defaultValue={valores?.fiador_email ?? ""} autoComplete="off" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={id("end")}>Endereço</label>
        <input id={id("end")} name="fiador_endereco" defaultValue={valores?.fiador_endereco ?? ""} autoComplete="off" className="input" />
      </div>
    </fieldset>
  );
}

/** Resumo do fiador em uma linha (para listas e cabeçalhos). */
export function resumoFiador(c: Partial<Contrato>) {
  if (!c.fiador_nome) return null;
  return [c.fiador_nome, c.fiador_cpf, c.fiador_telefone].filter(Boolean).join(" · ");
}
