# SistemaGestao1 — Gestão de Galeria

Sistema de gestão de aluguéis de uma galeria comercial: quem está pagando, quem não está, mês a mês.

**Stack:** Next.js 14 (App Router) + Supabase (login, banco Postgres, armazenamento de arquivos) + Tailwind CSS.

## Perfis

**Admin** (só pode ser criado manualmente no banco — veja abaixo)
- Painel com a grade *inquilino × mês* mostrando quem pagou, quem está em análise e quem está em atraso
- Lista de inquilinos com situação (em dia / atrasado / em cobrança) e valor em aberto
- Cadastro de contratos (valor, dia de vencimento, multa %, juros %), PDF do contrato e aditivos
- Geração das cobranças mensais, link do boleto / linha digitável, marcar como pago
- Análise de comprovantes enviados (aprovar / rejeitar)
- Lançamento de multas
- Disparo de mensagens de WhatsApp (individual, por boleto, ou em massa) e histórico
- Chamados dos inquilinos (status + conversa)
- Salas, fotos e avisos da galeria

**Inquilino** (cadastro pela tela `/cadastro`)
- Pagamentos mês a mês do que já deveria ter pago, com valor atualizado (multa + juros)
- Upload de comprovantes
- Pendências e multas
- Contratos e aditivos (PDF)
- Dia de vencimento e próximo vencimento
- Aviso de cobrança a partir do 3º dia após o vencimento de cada boleto
- Fotos das salas, áreas comuns e avisos da galeria
- Abertura de chamados com foto e conversa com a administração

## Como rodar (primeira vez)

### 1. Criar o projeto no Supabase
1. Crie uma conta grátis em https://supabase.com e um novo projeto.
2. No painel do projeto: **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique **Run**.
3. Em **Project Settings → API**, copie a *Project URL*, a chave *anon public* e a chave *service_role*.
4. (Opcional, para testes) Em **Authentication → Providers → Email**, desative *Confirm email* para não precisar confirmar o e-mail no cadastro.

### 2. Configurar o projeto no PC
No PowerShell, dentro da pasta do projeto:

```powershell
copy .env.example .env.local
notepad .env.local      # cole a URL e as chaves do Supabase
npm install
npm run dev
```

Abra http://localhost:3000.

### 3. Criar o admin
1. Cadastre-se normalmente em http://localhost:3000/cadastro com o e-mail do administrador.
2. No Supabase, **SQL Editor**, rode o conteúdo de `supabase/criar_admin.sql` trocando o e-mail.
3. Saia e entre de novo: você cairá no painel do admin.

> O banco impede que qualquer usuário logado altere o próprio perfil para admin — a troca só funciona pelo SQL Editor.

## Fluxo de uso
1. **Admin → Galeria e salas:** cadastre as salas e fotos.
2. O inquilino se cadastra em `/cadastro`.
3. **Admin → Inquilinos → (inquilino) → Novo contrato:** escolha a sala, valor e dia de vencimento. As cobranças desde o início do contrato são lançadas automaticamente. Anexe o PDF.
4. Todo mês: **Pagamentos → Gerar cobranças do mês** (ou deixe a rotina automática fazer).
5. O inquilino envia o comprovante → o admin aprova em **Pagamentos**.
6. Boletos com 3+ dias de atraso aparecem em **WhatsApp** para cobrança.

## WhatsApp
- **Sem configuração:** os botões abrem o WhatsApp (app ou web) com a mensagem pronta; é só apertar enviar.
- **Envio automático:** configure um provedor de API (o código segue o formato da [Z-API](https://z-api.io); outros provedores exigem ajustar `src/lib/whatsapp.ts`) em `.env.local`:
  ```
  WHATSAPP_API_URL=https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text
  WHATSAPP_CLIENT_TOKEN=seu-client-token
  ```

## Cobrança automática diária
A rota `GET /api/cron/cobrancas` (protegida por `Authorization: Bearer <CRON_SECRET>`):
1. gera as cobranças do mês atual;
2. envia mensagem de cobrança no 3º dia após o vencimento e repete a cada `INTERVALO_REPETICAO_COBRANCA` dias enquanto estiver em aberto (só com a API de WhatsApp configurada).

Na Vercel, o `vercel.json` já agenda a rota todo dia às 9h (horário de Fortaleza). Em outro servidor, agende uma chamada diária, por exemplo:
```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://seu-dominio/api/cron/cobrancas
```

## Estrutura
```
supabase/schema.sql        tabelas, regras de segurança (RLS), buckets de arquivos
supabase/criar_admin.sql   promover usuário a admin
src/app/login, cadastro    autenticação
src/app/inquilino/*        portal do inquilino
src/app/admin/*            painel administrativo
src/app/api/cron/*         rotina diária de cobrança
src/lib/cobranca.ts        regras de situação, multa e juros
src/lib/whatsapp.ts        mensagens e envio por API
```
