"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { anexarArquivoAcordo, registrarAcordo } from "@/app/admin/acordos/actions";
import { UploadArquivo } from "./UploadArquivo";

export type CobrancaAberta = {
  id: string;
  mes: string;
  vencimento: string;
  valor: number;
  atualizado: number;
  situacao: string;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function BotaoRegistrar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Registrando..." : "Registrar acordo"}
    </button>
  );
}

/** Formulário de novo acordo: escolhe o inquilino e marca as mensalidades quitadas. */
export function NovoAcordo({
  inquilinos,
  abertasPorInquilino,
  hoje,
}: {
  inquilinos: { id: string; nome: string }[];
  abertasPorInquilino: Record<string, CobrancaAberta[]>;
  hoje: string;
}) {
  const [estado, acao] = useFormState(registrarAcordo, null);
  const [inquilino, setInquilino] = useState("");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const form = useRef<HTMLFormElement>(null);

  // Limpa o formulário depois de registrar
  useEffect(() => {
    if (!estado?.ok) return;
    form.current?.reset();
    setInquilino("");
    setMarcadas(new Set());
  }, [estado]);

  const abertas = inquilino ? abertasPorInquilino[inquilino] ?? [] : [];
  const selecionadas = abertas.filter((c) => marcadas.has(c.id));
  const soma = selecionadas.reduce((s, c) => s + c.valor, 0);
  const somaAtualizada = selecionadas.reduce((s, c) => s + c.atualizado, 0);
  const alternar = (id: string) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <form ref={form} action={acao} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ac-inq">Inquilino</label>
          <select
            id="ac-inq"
            name="inquilino_id"
            required
            value={inquilino}
            onChange={(e) => {
              setInquilino(e.target.value);
              setMarcadas(new Set());
            }}
            className="input"
          >
            <option value="" disabled>Escolha o inquilino</option>
            {inquilinos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome} {abertasPorInquilino[i.id]?.length ? `· ${abertasPorInquilino[i.id]!.length} em aberto` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ac-data">Data do acordo</label>
          <input id="ac-data" name="data_acordo" type="date" required defaultValue={hoje} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ac-valor">Valor acordado (R$)</label>
          <input id="ac-valor" name="valor_acordado" required inputMode="decimal" placeholder="0,00" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ac-proc">Número do processo</label>
          <input id="ac-proc" name="numero_processo" placeholder="0000000-00.0000.0.00.0000" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ac-orgao">Vara / comarca</label>
          <input id="ac-orgao" name="orgao" placeholder="Ex.: 3ª Vara Cível de Recife" className="input" />
        </div>
      </div>

      <fieldset className="rounded-xl border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Mensalidades quitadas pelo acordo</legend>
        {!inquilino ? (
          <p className="text-sm text-stone-600">Escolha o inquilino para ver as mensalidades em aberto.</p>
        ) : !abertas.length ? (
          <p className="text-sm text-stone-600">Este inquilino não tem mensalidades em aberto.</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => setMarcadas(new Set(abertas.map((c) => c.id)))}>Marcar todas</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setMarcadas(new Set())}>Desmarcar</button>
            </div>
            <ul className="flex flex-col divide-y divide-stone-100">
              {abertas.map((c) => (
                <li key={c.id}>
                  <label className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      name="cobranca_ids"
                      value={c.id}
                      checked={marcadas.has(c.id)}
                      onChange={() => alternar(c.id)}
                      className="h-5 w-5 accent-brand-600"
                    />
                    <span className="min-w-0 flex-[1_1_160px] font-semibold capitalize">{c.mes}</span>
                    <span className="text-stone-600">vence {c.vencimento}</span>
                    <span className="badge bg-stone-100 text-stone-700">{c.situacao}</span>
                    <span className="w-28 text-right tabular-nums">{brl(c.valor)}</span>
                    <span className="w-32 text-right tabular-nums text-[#b42318]">{c.atualizado !== c.valor ? brl(c.atualizado) : ""}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <b>{selecionadas.length}</b> marcada(s) · valor original <b>{brl(soma)}</b>
              {somaAtualizada !== soma && <> · com multa e juros <b className="text-[#b42318]">{brl(somaAtualizada)}</b></>}
            </p>
          </>
        )}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ac-cond">Condições do acordo</label>
          <textarea id="ac-cond" name="condicoes" rows={3} placeholder="Ex.: entrada de R$ 2.000,00 + 5 parcelas de R$ 1.000,00 todo dia 10" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ac-obs">Observações</label>
          <textarea id="ac-obs" name="observacoes" rows={3} className="input" />
        </div>
      </div>

      <p className="text-[13px] text-stone-600">
        As mensalidades marcadas passam a contar como pagas na planilha, com a situação “Quitada por acordo” e a data do acordo. Se o acordo for excluído, elas voltam a ficar em aberto.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <BotaoRegistrar />
        {estado?.ok && <span className="text-sm font-semibold text-[#14532d]" role="status">{estado.ok}</span>}
        {estado?.erro && <span className="text-sm text-red-700" role="alert">{estado.erro}</span>}
      </div>
    </form>
  );
}

export function UploadAcordo({ acordoId, inquilinoId, temArquivo }: { acordoId: string; inquilinoId: string; temArquivo: boolean }) {
  return (
    <UploadArquivo
      bucket="contratos"
      pasta={`${inquilinoId}/acordos`}
      aceitar="application/pdf,image/*"
      rotulo={temArquivo ? "Substituir documento" : "Anexar documento do acordo"}
      aoEnviar={(path) => anexarArquivoAcordo(acordoId, path)}
    />
  );
}
