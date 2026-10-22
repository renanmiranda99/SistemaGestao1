export type Role = "admin" | "inquilino";

export type Profile = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf_cnpj: string | null;
  role: Role;
  ativo: boolean;
  created_at: string;
};

export type Sala = {
  id: string;
  nome: string;
  andar: string | null;
  area_m2: number | null;
  descricao: string | null;
  valor_aluguel: number | null;
  inquilino_id: string | null;
  /** Anunciada na página inicial pública (só vale sem inquilino). */
  disponivel_aluguel: boolean;
  created_at: string;
};

export type Foto = {
  id: string;
  sala_id: string | null;
  storage_path: string;
  legenda: string | null;
  ordem: number;
};

/** Acordo feito na justiça; as mensalidades que ele quita contam como pagas. */
export type AcordoJudicial = {
  id: string;
  inquilino_id: string;
  contrato_id: string | null;
  numero_processo: string | null;
  orgao: string | null;
  data_acordo: string;
  valor_acordado: number;
  condicoes: string | null;
  observacoes: string | null;
  arquivo_path: string | null;
  created_at: string;
};

export type TipoVistoria ="entrada" | "saida" | "dano";

/** Foto da vistoria de uma sala (prova do estado do imóvel para cobrança de danos). */
export type VistoriaFoto = {
  id: string;
  sala_id: string;
  storage_path: string;
  tipo: TipoVistoria;
  legenda: string | null;
  registrada_em: string;
  created_at: string;
};

export type Aviso = {
  id: string;
  titulo: string;
  conteudo: string;
  created_at: string;
};

export type Contrato = {
  id: string;
  inquilino_id: string;
  sala_id: string | null;
  data_assinatura: string | null;
  data_inicio: string;
  fiador_nome?: string | null;
  fiador_cpf?: string | null;
  fiador_telefone?: string | null;
  fiador_email?: string | null;
  fiador_endereco?: string | null;
  data_fim: string | null;
  valor_mensal: number;
  dia_vencimento: number;
  multa_percentual: number;
  juros_mensal_percentual: number;
  arquivo_path: string | null;
  ativo: boolean;
  created_at: string;
};

export type Aditivo = {
  id: string;
  contrato_id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  arquivo_path: string | null;
};

export type StatusCobranca = "pendente" | "em_analise" | "pago" | "cancelado";

export type Cobranca = {
  id: string;
  contrato_id: string;
  inquilino_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: StatusCobranca;
  pago_em: string | null;
  /** Preenchido quando a mensalidade foi quitada por um acordo judicial */
  acordo_id?: string | null;
  boleto_url: string | null;
  linha_digitavel: string | null;
  observacao: string | null;
};

export type Comprovante = {
  id: string;
  cobranca_id: string;
  inquilino_id: string;
  arquivo_path: string;
  status: "em_analise" | "aprovado" | "rejeitado";
  observacao_admin: string | null;
  enviado_em: string;
};

export type Multa = {
  id: string;
  inquilino_id: string;
  cobranca_id: string | null;
  descricao: string;
  valor: number;
  data: string;
  status: "pendente" | "paga" | "cancelada";
};

export type Chamado = {
  id: string;
  inquilino_id: string;
  sala_id: string | null;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: "baixa" | "media" | "alta";
  status: "aberto" | "em_andamento" | "resolvido" | "fechado";
  foto_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ChamadoMensagem = {
  id: string;
  chamado_id: string;
  autor_id: string;
  mensagem: string;
  created_at: string;
};
