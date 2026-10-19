-- =====================================================================
-- Migração: salas disponíveis para aluguel na página inicial pública
-- Rode uma vez no Supabase (SQL Editor → New query → Run).
-- Pode rodar de novo sem problema.
-- =====================================================================

-- Sala anunciada na página inicial como disponível para aluguel
alter table public.salas add column if not exists disponivel_aluguel boolean not null default false;

-- Visitantes (sem login) podem ver as salas anunciadas e as fotos delas
drop policy if exists "salas: disponíveis são públicas" on public.salas;
create policy "salas: disponíveis são públicas" on public.salas
  for select using (disponivel_aluguel and inquilino_id is null);

drop policy if exists "fotos: das salas disponíveis são públicas" on public.fotos;
create policy "fotos: das salas disponíveis são públicas" on public.fotos
  for select using (
    exists (
      select 1 from public.salas s
      where s.id = sala_id and s.disponivel_aluguel and s.inquilino_id is null
    )
  );
