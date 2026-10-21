-- =====================================================================
-- Migração: painel de configurações (nome, logos, cores, textos, mapa, regras)
-- Rode uma vez no Supabase (SQL Editor → New query → Run).
-- Pode rodar de novo sem problema.
-- =====================================================================

-- Uma única linha (id = 1) com todas as configurações em JSON.
-- Campos ausentes usam os valores padrão definidos no app (src/lib/config.ts).
create table if not exists public.configuracoes (
  id int primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

alter table public.configuracoes enable row level security;

-- Todos leem (a página inicial pública e o login usam nome, logo, cores e textos).
-- Não guarde segredos aqui: chaves e senhas ficam nas variáveis de ambiente.
drop policy if exists "configuracoes: leitura pública" on public.configuracoes;
create policy "configuracoes: leitura pública" on public.configuracoes
  for select using (true);

drop policy if exists "configuracoes: admin altera" on public.configuracoes;
create policy "configuracoes: admin altera" on public.configuracoes
  for all using (public.is_admin()) with check (public.is_admin());

-- Faz a API do Supabase enxergar a tabela nova na hora
notify pgrst, 'reload schema';
