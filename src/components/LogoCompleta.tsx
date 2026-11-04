import { CONFIG_PADRAO } from "@/lib/config-padrao";

/**
 * Logo completa sobre fundo claro. No modo escuro, a logo padrão troca pela versão
 * branca; uma logo enviada no painel ganha um fundo branco para continuar legível.
 */
export function LogoCompleta({ url, nome, className }: { url: string; nome: string; className: string }) {
  if (url === CONFIG_PADRAO.logoCompletaUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={nome} width={300} height={64} className={`${className} dark:hidden`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/asa-gestao-logo-branca.svg" alt={nome} width={300} height={64} className={`${className} hidden dark:block`} />
      </>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={nome} className={`${className} dark:rounded-md dark:bg-white dark:p-2`} />;
}
