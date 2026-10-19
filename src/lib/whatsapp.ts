import { brl, dataBR, mesAnoLongo, somenteDigitos } from "./format";

/** Normaliza para o formato internacional brasileiro: 55 + DDD + número. */
export function telefoneWhatsApp(telefone: string | null | undefined) {
  const d = somenteDigitos(telefone);
  if (!d) return "";
  if (d.startsWith("55") && d.length >= 12) return d;
  return `55${d}`;
}

/** Link que abre o WhatsApp (app ou web) com a mensagem pronta. */
export function linkWhatsApp(telefone: string | null | undefined, mensagem: string) {
  const tel = telefoneWhatsApp(telefone);
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemCobranca(p: {
  nome: string;
  competencia: string;
  vencimento: string;
  valor: number;
  dias: number;
}) {
  const primeiroNome = p.nome.split(" ")[0] || p.nome;
  return (
    `Olá, ${primeiroNome}! Tudo bem?\n\n` +
    `Identificamos que o aluguel referente a ${mesAnoLongo(p.competencia)}, ` +
    `com vencimento em ${dataBR(p.vencimento)}, no valor de ${brl(p.valor)}, ` +
    `está em aberto há ${p.dias} dia(s).\n\n` +
    `Se já realizou o pagamento, por favor envie o comprovante pelo portal do inquilino. ` +
    `Qualquer dúvida, estamos à disposição.`
  );
}

export function apiWhatsAppConfigurada() {
  return Boolean(process.env.WHATSAPP_API_URL);
}

/**
 * Envio automático por API (opcional). Formato compatível com Z-API:
 *   POST {WHATSAPP_API_URL}  body: { phone, message }
 * Ex.: WHATSAPP_API_URL=https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text
 * Para outro provedor, ajuste o corpo/cabeçalhos aqui.
 */
export async function enviarWhatsAppApi(telefone: string, mensagem: string) {
  const url = process.env.WHATSAPP_API_URL;
  if (!url) return { ok: false, erro: "API de WhatsApp não configurada" };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.WHATSAPP_API_TOKEN) headers.Authorization = `Bearer ${process.env.WHATSAPP_API_TOKEN}`;
  if (process.env.WHATSAPP_CLIENT_TOKEN) headers["Client-Token"] = process.env.WHATSAPP_CLIENT_TOKEN;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: telefoneWhatsApp(telefone), message: mensagem }),
    });
    if (!res.ok) return { ok: false, erro: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true as const };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
