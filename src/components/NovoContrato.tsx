"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { criarContratoGeral } from "@/app/admin/actions";
import { lerContrato } from "@/app/admin/contratos/actions";
import { createClient } from "@/lib/supabase/client";
import { nomeSeguro } from "@/lib/arquivos";

type Opcao = { id: string; nome: string };

const VAZIO = {
  inquilino_id: "",
  sala_id: "",
  data_assinatura: "",
  data_inicio: "",
  data_fim: "",
  dia_vencimento: "10",
  valor_mensal: "",
  multa_percentual: "",
  juros_mensal_percentual: "",
  fiador_nome: "",
  fiador_cpf: "",
  fiador_telefone: "",
  fiador_email: "",
  fiador_endereco: "",
};
type Campos = typeof VAZIO;

const decimal = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Criando..." : "Criar contrato"}
    </button>
  );
}

/**
 * Formulário de novo contrato. "Ler contrato em PDF" envia o arquivo, o Claude
 * extrai os dados e preenche os campos; nada é salvo até clicar em Criar contrato.
 */
export function NovoContrato({
  inquilinos,
  salas,
  hoje,
  padroes,
}: {
  inquilinos: Opcao[];
  salas: Opcao[];
  hoje: string;
  padroes: { multa: number; juros: number };
}) {
  const inicial: Campos = {
    ...VAZIO,
    data_assinatura: hoje,
    data_inicio: hoje,
    multa_percentual: decimal(padroes.multa),
    juros_mensal_percentual: decimal(padroes.juros),
  };
  const [campos, setCampos] = useState<Campos>(inicial);
  const [lidos, setLidos] = useState<Set<keyof Campos>>(new Set());
  const [arquivo, setArquivo] = useState<{ path: string; nome: string } | null>(null);
  const [lendo, setLendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const mudar = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCampos((c) => ({ ...c, [k]: e.target.value }));
  const destaque = (k: keyof Campos) => (lidos.has(k) ? "bg-brand-50 border-brand-200" : "");

  async function ler(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const ok = f.type === "application/pdf" || f.type.startsWith("image/");
    if (!ok) return setErro("Envie o contrato em PDF ou como foto.");
    if (f.size > 25 * 1024 * 1024) return setErro("O arquivo passa de 25 MB.");
    setErro(null);
    setAvisos([]);
    setObservacoes(null);
    setLendo("Enviando o arquivo...");

    const supabase = createClient();
    const path = `importados/${nomeSeguro(f.name)}`;
    const { error } = await supabase.storage.from("contratos").upload(path, f, { upsert: false });
    if (error) {
      setLendo(null);
      return setErro(`Falha no envio: ${error.message}`);
    }

    setLendo("Lendo o contrato... (pode levar até um minuto)");
    const r = await lerContrato(path);
    setLendo(null);
    if (!r.ok) return setErro(r.erro);

    const d = r.dados;
    const novos: Partial<Campos> = {
      inquilino_id: r.inquilinoId ?? "",
      sala_id: r.salaId ?? "",
      data_assinatura: d.data_assinatura ?? "",
      data_inicio: d.data_inicio ?? "",
      data_fim: d.data_fim ?? "",
      dia_vencimento: d.dia_vencimento ? String(d.dia_vencimento) : "",
      valor_mensal: decimal(d.valor_mensal),
      multa_percentual: decimal(d.multa_percentual),
      juros_mensal_percentual: decimal(d.juros_mensal_percentual),
      fiador_nome: d.fiador_nome ?? "",
      fiador_cpf: d.fiador_cpf ?? "",
      fiador_telefone: d.fiador_telefone ?? "",
      fiador_email: d.fiador_email ?? "",
      fiador_endereco: d.fiador_endereco ?? "",
    };
    // Só substitui o que veio preenchido; o resto mantém o que já estava (ex.: multa padrão)
    const preenchidos = (Object.keys(novos) as (keyof Campos)[]).filter((k) => novos[k]);
    setCampos((c) => ({ ...c, ...Object.fromEntries(preenchidos.map((k) => [k, novos[k]])) }));
    setLidos(new Set(preenchidos));
    setArquivo({ path, nome: f.name });
    setAvisos(r.avisos);
    setObservacoes(d.observacoes);
  }

  function limpar() {
    setCampos(inicial);
    setLidos(new Set());
    setArquivo(null);
    setAvisos([]);
    setObservacoes(null);
    setErro(null);
  }

  const campoTexto = (k: keyof Campos, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`nc-${k}`}>{rotulo}</label>
      <input id={`nc-${k}`} name={k} value={campos[k]} onChange={mudar(k)} className={`input ${destaque(k)}`} {...extra} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border-[1.5px] border-dashed border-brand-200 bg-brand-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={Boolean(lendo)} onClick={() => input.current?.click()}>
            {lendo ? "Lendo..." : arquivo ? "Ler outro contrato" : "Ler contrato em PDF"}
          </button>
          <p className="min-w-0 flex-[1_1_260px] text-[13px] text-stone-700">
            {lendo ?? (arquivo
              ? `Dados lidos de "${arquivo.nome}". Os campos em azul vieram do documento: confira antes de criar. O PDF será anexado ao contrato.`
              : "Envie o contrato assinado (PDF ou foto) e os campos abaixo são preenchidos automaticamente para você conferir.")}
          </p>
          {arquivo && !lendo && (
            <button type="button" className="btn-secondary btn-sm" onClick={limpar}>Limpar</button>
          )}
        </div>
        <input ref={input} type="file" accept="application/pdf,image/*" className="sr-only" onChange={ler} aria-label="Arquivo do contrato" />
        {erro && <p className="text-sm text-red-700" role="alert">{erro}</p>}
        {avisos.map((a) => (
          <p key={a} className="rounded-lg bg-[#fdf1e4] px-3 py-2 text-sm text-[#5c2a06]">{a}</p>
        ))}
        {observacoes && (
          <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-700"><b>Observações do contrato:</b> {observacoes}</p>
        )}
      </div>

      <form action={criarContratoGeral} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="arquivo_importado" value={arquivo?.path ?? ""} />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nc-inq">Inquilino</label>
          <select id="nc-inq" name="inquilino_id" required value={campos.inquilino_id} onChange={mudar("inquilino_id")} className={`input ${destaque("inquilino_id")}`}>
            <option value="" disabled>Escolha o inquilino</option>
            {inquilinos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nc-sala">Sala</label>
          <select id="nc-sala" name="sala_id" value={campos.sala_id} onChange={mudar("sala_id")} className={`input ${destaque("sala_id")}`}>
            <option value="">Sem sala</option>
            {salas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </div>
        {campoTexto("data_assinatura", "Data de assinatura", { type: "date" })}
        {campoTexto("data_inicio", "Início", { type: "date", required: true })}
        {campoTexto("data_fim", "Vencimento do contrato", { type: "date" })}
        <div>
          <label className="label" htmlFor="nc-dia">Vencimento da mensalidade</label>
          <select id="nc-dia" name="dia_vencimento" required value={campos.dia_vencimento} onChange={mudar("dia_vencimento")} className={`input ${destaque("dia_vencimento")}`}>
            {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={String(i + 1)}>todo dia {i + 1}</option>)}
          </select>
        </div>
        {campoTexto("valor_mensal", "Aluguel (R$)", { required: true, inputMode: "decimal", placeholder: "1.500,00" })}
        {campoTexto("multa_percentual", "Multa (%)", { inputMode: "decimal" })}
        {campoTexto("juros_mensal_percentual", "Juros ao mês (%)", { inputMode: "decimal" })}

        <fieldset className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-4">
          <legend className="px-1 text-sm font-semibold">Fiador <span className="font-normal text-stone-600">(opcional)</span></legend>
          {campoTexto("fiador_nome", "Nome completo", { autoComplete: "off" })}
          {campoTexto("fiador_cpf", "CPF ou CNPJ", { inputMode: "numeric", autoComplete: "off" })}
          {campoTexto("fiador_telefone", "Telefone / WhatsApp", { inputMode: "tel", autoComplete: "off" })}
          {campoTexto("fiador_email", "E-mail", { type: "email", autoComplete: "off" })}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="nc-fiador_endereco">Endereço</label>
            <input id="nc-fiador_endereco" name="fiador_endereco" value={campos.fiador_endereco} onChange={mudar("fiador_endereco")} autoComplete="off" className={`input ${destaque("fiador_endereco")}`} />
          </div>
        </fieldset>

        <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-4">
          <p className="text-[13px] text-stone-600">As mensalidades desde o início do contrato são lançadas automaticamente.{arquivo ? " O PDF lido será anexado ao contrato." : " Depois anexe o PDF assinado."}</p>
          <div><BotaoCriar /></div>
        </div>
      </form>
    </div>
  );
}
