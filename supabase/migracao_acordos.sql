-- =====================================================================
-- Migração: acordos judiciais
-- Rode uma vez no Supabase (SQL Editor → New query → Run).
-- Pode rodar de novo sem problema.
-- =====================================================================

-- Acordo feito na justiça com um inquilino. As mensalidades que ele quita
-- ficam marcadas como pagas e apontam para o acordo (cobrancas.acordo_id).
create table if not exists public.acordos_judiciais (
  id uuid primary key default gen_random_uuid(),
  inquilino_id uuid not null references public.profiles(id) on delete cascade,
  contrato_id uuid references public.contratos(id) on delete set null,
  numero_processo text,
  orgao text,                         -- vara / comarca / tribunal
  data_acordo date not null,
  valor_acordado numeric(12,2) not null check (valor_acordado >= 0),
  condicoes text,                     -- forma de pagamento, parcelas, prazos
  observacoes text,
  arquivo_path text,                  -- PDF do acordo no bucket "contratos": <inquilino_id>/acordos/...
  created_at timestamptz not null default now()
);
create index if not exists acordos_inquilino_idx on public.acordos_judiciais (inquilino_id, data_acordo);

-- Mensalidade quitada por um acordo
alter table public.cobrancas
  add column if not exists acordo_id uuid references public.acordos_judiciais(id) on delete set null;
create index if not exists cobrancas_acordo_idx on public.cobrancas (acordo_id);

alter table public.acordos_judiciais enable row level security;

drop policy if exists "acordos: admin" on public.acordos_judiciais;
create policy "acordos: admin" on public.acordos_judiciais
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "acordos: inquilino lê os seus" on public.acordos_judiciais;
create policy "acordos: inquilino lê os seus" on public.acordos_judiciais
  for select using (inquilino_id = auth.uid());

-- Faz a API do Supabase enxergar as mudanças na hora
notify pgrst, 'reload schema';
