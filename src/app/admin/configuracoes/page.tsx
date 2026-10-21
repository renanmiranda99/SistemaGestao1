import { exigirPerfil } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { PageHeader } from "@/components/ui";
import { FormConfiguracoes } from "@/components/Configuracoes";

export default async function ConfiguracoesAdmin() {
  const [, config] = await Promise.all([exigirPerfil("admin"), getConfig()]);
  return (
    <>
      <PageHeader
        titulo="Configurações"
        descricao="Nome, logos, cores, textos, localização e regras de cobrança do sistema."
      />
      <FormConfiguracoes config={config} />
    </>
  );
}
