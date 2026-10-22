# Leitura automática de contratos — como ativar

Em **Admin → Contratos → Novo contrato**, o botão **"Ler contrato em PDF"** envia o contrato
(PDF ou foto) ao Claude, que preenche o formulário (locatário, sala, datas, aluguel, vencimento,
multa, juros e fiador) para conferência. Ao criar o contrato, o PDF é anexado automaticamente.

Sem a chave da API, o botão só mostra o aviso "A leitura automática não está configurada";
o resto do sistema funciona normalmente.

## 1. Rodar a migração do fiador (uma vez)

No Supabase: **SQL Editor → New query**, cole o conteúdo de
[`supabase/migracao_fiador.sql`](../supabase/migracao_fiador.sql) e clique em **Run**.
Sem ela, criar contrato dá erro, com ou sem a leitura automática.

## 2. Criar a chave da API da Anthropic

1. Acesse https://console.anthropic.com e entre (ou crie a conta da empresa).
2. Em **Billing**, cadastre um meio de pagamento ou créditos.
3. Em **API Keys → Create Key**, dê um nome (ex.: `galeria-contratos`) e copie a chave.
   Ela só aparece uma vez.

## 3. Colocar a chave no computador

No arquivo `.env.local` (na raiz do projeto), adicione a linha:

```bash
ANTHROPIC_API_KEY=cole-a-chave-aqui
```

Depois reinicie o servidor:

```bash
npm run dev
```

## 4. Colocar a chave na Vercel (produção)

Na Vercel: **Project → Settings → Environment Variables → Add**

- Name: `ANTHROPIC_API_KEY`
- Value: a mesma chave
- Environments: Production (e Preview, se quiser testar lá)

Depois faça um novo deploy (**Deployments → ⋯ → Redeploy**) para a chave valer.

## Cuidados

- **Nunca** use o prefixo `NEXT_PUBLIC_` nessa variável e **nunca** coloque a chave no GitHub,
  no painel de Configurações do sistema ou em mensagens. O `.env.local` já é ignorado pelo git.
- Se a chave vazar, apague-a em **API Keys** no console da Anthropic e crie outra.
- **Custo:** cada leitura é cobrada pela Anthropic conforme o tamanho do documento
  (para um contrato comum, centavos). Acompanhe em **Usage** no console.
- **Privacidade:** o conteúdo do contrato (CPF, endereços) é enviado à Anthropic para a leitura.
  Mencione isso na política de privacidade se for comercializar o sistema.

## Onde fica no código

- `src/lib/leitura-contrato.ts` — chamada ao Claude (modelo, instruções e campos extraídos)
- `src/app/admin/contratos/actions.ts` — lê o arquivo enviado e procura inquilino e sala cadastrados
- `src/components/NovoContrato.tsx` — formulário com o botão "Ler contrato em PDF"
