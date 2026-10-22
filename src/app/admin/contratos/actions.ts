"use server";

import { exigirPerfil } from "@/lib/auth";
import { somenteDigitos } from "@/lib/format";
import { extrairDadosContrato, type DadosContrato } from "@/lib/leitura-contrato";

export type ResultadoLeitura =
  | { ok: true; dados: DadosContrato; inquilinoId: string | null; salaId: string | null; avisos: string[] }
  | { ok: false; erro: string };

const TAMANHO_MAXIMO = 25 * 1024 * 1024;

const normalizar = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const dataValida = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null);

/**
 * Lê um contrato já enviado ao Storage (pasta "importados/") com o Claude e
 * devolve os campos para preencher o formulário, mais o inquilino e a sala
 * cadastrados que parecem corresponder. Nada é salvo aqui.
 */
export async function lerContrato(path: string): Promise<ResultadoLeitura> {
  const { supabase } = await exigirPerfil("admin");
  if (!/^importados\/[\w.-]+$/.test(path)) return { ok: false, erro: "Arquivo inválido." };

  const { data: arquivo, error } = await supabase.storage.from("contratos").download(path);
  if (error || !arquivo) return { ok: false, erro: "Não encontrei o arquivo enviado. Envie de novo." };
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: "O arquivo passa de 25 MB. Envie uma versão menor." };

  const ext = path.split(".").pop()?.toLowerCase();
  const tipo =
    ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : null;
  if (!tipo) return { ok: false, erro: "Envie o contrato em PDF ou como foto (JPG, PNG ou WebP)." };

  const base64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");
  const leitura = await extrairDadosContrato({ base64, tipo });
  if (!leitura.ok) return leitura;

  const dados: DadosContrato = {
    ...leitura.dados,
    data_assinatura: dataValida(leitura.dados.data_assinatura),
    data_inicio: dataValida(leitura.dados.data_inicio),
    data_fim: dataValida(leitura.dados.data_fim),
  };
  const avisos: string[] = [];
  if (dados.dia_vencimento && (dados.dia_vencimento < 1 || dados.dia_vencimento > 28)) {
    avisos.push(`O contrato vence no dia ${dados.dia_vencimento}; o sistema aceita até o dia 28. Ajustei para o dia 28, confira.`);
    dados.dia_vencimento = 28;
  }

  // Procura o inquilino já cadastrado: primeiro pelo CPF/CNPJ, depois pelo nome
  const [{ data: perfis }, { data: salas }] = await Promise.all([
    supabase.from("profiles").select("id, nome, cpf_cnpj").eq("role", "inquilino").eq("ativo", true),
    supabase.from("salas").select("id, nome, inquilino_id"),
  ]);
  const doc = somenteDigitos(dados.locatario_cpf_cnpj);
  const nome = normalizar(dados.locatario_nome);
  const inquilino =
    (doc && perfis?.find((p) => somenteDigitos(p.cpf_cnpj) === doc)) ||
    (nome && perfis?.find((p) => normalizar(p.nome) === nome)) ||
    null;
  if (dados.locatario_nome && !inquilino) {
    avisos.push(
      `O locatário "${dados.locatario_nome}" não foi encontrado entre os inquilinos cadastrados. Peça que ele se cadastre no portal ou escolha o inquilino na lista.`
    );
  }

  // Procura a sala pelo nome (ex.: "Loja 05" = "loja 5")
  const semZeros = (s: string) => normalizar(s).replace(/\b0+(\d)/g, "$1");
  const sala = dados.sala ? salas?.find((x) => semZeros(x.nome) === semZeros(dados.sala!)) ?? null : null;
  if (dados.sala && !sala) avisos.push(`A sala "${dados.sala}" não foi encontrada no cadastro de salas. Escolha a sala na lista.`);
  if (sala?.inquilino_id && sala.inquilino_id !== inquilino?.id) {
    avisos.push(`${sala.nome} já está ocupada por outro inquilino. Confira antes de salvar.`);
  }

  return { ok: true, dados, inquilinoId: inquilino?.id ?? null, salaId: sala?.id ?? null, avisos };
}
