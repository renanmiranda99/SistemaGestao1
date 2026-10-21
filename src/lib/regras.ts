import { CONFIG_PADRAO } from "./config-padrao";

/**
 * Regras de cobrança configuráveis usadas por funções síncronas (situação de
 * um boleto, texto da cobrança). São atualizadas a cada leitura das configurações
 * (getConfig, chamado por getSessao e pela rotina de cobrança). O app é de uma
 * única galeria, então o valor é o mesmo para todas as requisições.
 */
let regras = {
  diasTolerancia: CONFIG_PADRAO.diasTolerancia,
  mensagemCobranca: CONFIG_PADRAO.mensagemCobranca,
  nome: CONFIG_PADRAO.nome,
};

export function definirRegras(novas: typeof regras) {
  regras = { ...novas, diasTolerancia: Math.max(1, Math.round(novas.diasTolerancia)) };
}

/** Dias após o vencimento em que o boleto passa a ser "em cobrança". */
export function diasTolerancia() {
  return regras.diasTolerancia;
}

export function modeloMensagemCobranca() {
  return { modelo: regras.mensagemCobranca, nome: regras.nome };
}
