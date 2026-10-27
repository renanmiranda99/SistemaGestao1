# "Esqueci a senha" — configuração no Supabase

O fluxo: **Login → Esqueci a senha** → a pessoa informa o e-mail → recebe um link →
abre a tela **Criar senha nova** → entra direto no portal.

## 1. Endereços permitidos (obrigatório)

No Supabase: **Authentication → URL Configuration**

- **Site URL**: o endereço do site (ex.: `https://seu-app.vercel.app`)
- **Redirect URLs**: adicione
  - `http://localhost:3000/**` (para testar no computador)
  - `https://seu-app.vercel.app/**` (produção)

Use exatamente com `/**` no fim. O link do e-mail passa primeiro por
`/auth/callback?next=/redefinir-senha`; um endereço como `http://localhost:3000/redefinir-senha`
não cobre esse caminho, e o Supabase então manda a pessoa para a **Site URL** (a página inicial).

## 2. Funcionar em outro aparelho (recomendado)

Pelo padrão do Supabase, o link só funciona no **mesmo navegador** em que a pessoa pediu
a senha. Para funcionar também quando ela pede no computador e abre o e-mail no celular:

**Authentication → Emails → Reset Password**, troque o link do modelo por:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha">Criar senha nova</a>
```

Aproveite para traduzir o assunto e o texto do e-mail para português.

## 3. Limite de e-mails (antes de colocar em produção)

O envio de e-mails embutido do Supabase é só para testes: manda poucos e-mails por hora.
Em produção, configure um provedor (Resend, Brevo, Amazon SES etc.) em
**Authentication → Emails → SMTP Settings**. Isso vale também para os e-mails de confirmação de cadastro.

## Segurança

- A mensagem depois de pedir o link é sempre a mesma, exista ou não o e-mail: assim ninguém
  descobre quem tem cadastro.
- O link vale uma vez e expira (prazo configurável em **Authentication → Providers → Email**).
