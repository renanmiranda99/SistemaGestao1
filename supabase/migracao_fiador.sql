-- =====================================================================
-- Migração: fiador do contrato
-- Rode uma vez no Supabase (SQL Editor → New query → Run).
-- Pode rodar de novo sem problema.
-- =====================================================================

alter table public.contratos add column if not exists fiador_nome text;
alter table public.contratos add column if not exists fiador_cpf text;
alter table public.contratos add column if not exists fiador_telefone text;
alter table public.contratos add column if not exists fiador_email text;
alter table public.contratos add column if not exists fiador_endereco text;

-- Faz a API do Supabase enxergar as colunas novas na hora
notify pgrst, 'reload schema';
