-- =====================================================================
-- Migração: vistoria das salas + data de assinatura do contrato
-- Rode uma vez no Supabase (SQL Editor → New query → Run).
-- Pode rodar de novo sem problema: tudo é "if not exists" / "drop if exists".
-- =====================================================================

-- Data em que o contrato foi assinado
alter table public.contratos add column if not exists data_assinatura date;

-- Fotos da vistoria de cada sala (estado na entrada, na saída e registros de danos).
-- Ficam em bucket privado: servem de prova para cobrança de danos.
create table if not exists public.vistoria_fotos (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas(id) on delete cascade,
  storage_path text not null,                  -- no bucket "vistorias": <sala_id>/...
  tipo text not null default 'entrada' check (tipo in ('entrada', 'saida', 'dano')),
  legenda text,
  registrada_em date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists vistoria_fotos_sala_idx on public.vistoria_fotos (sala_id, registrada_em);

alter table public.vistoria_fotos enable row level security;

-- Admin faz tudo; o inquilino da sala pode ver as fotos da própria sala
drop policy if exists "vistoria: admin" on public.vistoria_fotos;
create policy "vistoria: admin" on public.vistoria_fotos
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "vistoria: inquilino da sala lê" on public.vistoria_fotos;
create policy "vistoria: inquilino da sala lê" on public.vistoria_fotos
  for select using (
    exists (select 1 from public.salas s where s.id = sala_id and s.inquilino_id = auth.uid())
  );

-- Bucket privado das fotos de vistoria (o admin já tem acesso total pela política "storage: admin tudo")
insert into storage.buckets (id, name, public) values ('vistorias', 'vistorias', false)
on conflict (id) do nothing;

drop policy if exists "storage: inquilino lê vistoria da própria sala" on storage.objects;
create policy "storage: inquilino lê vistoria da própria sala" on storage.objects
  for select using (
    bucket_id = 'vistorias'
    and exists (
      select 1 from public.salas s
      where s.id::text = (storage.foldername(name))[1] and s.inquilino_id = auth.uid()
    )
  );
