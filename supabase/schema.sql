-- =====================================================================
-- Sistema de Gestão da Galeria — schema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PERFIS
-- Todo usuário que se cadastra pelo app vira "inquilino".
-- Admin só pode ser definido manualmente no banco (ver supabase/criar_admin.sql).
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  telefone text,
  cpf_cnpj text,
  role text not null default 'inquilino' check (role in ('admin', 'inquilino')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and ativo
  );
$$;

-- Cria o perfil automaticamente no cadastro, SEMPRE como inquilino.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, telefone, cpf_cnpj, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'telefone',
    new.raw_user_meta_data->>'cpf_cnpj',
    'inquilino'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que qualquer usuário logado (inclusive admin pelo app) troque o "role".
-- Pelo SQL Editor (sem usuário logado) a troca é permitida.
create or replace function public.protect_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'O perfil (role) só pode ser alterado diretamente no banco de dados.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

-- ---------------------------------------------------------------------
-- SALAS E FOTOS
-- ---------------------------------------------------------------------
create table if not exists public.salas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                 -- ex.: "Sala 101"
  andar text,
  area_m2 numeric(10,2),
  descricao text,
  valor_aluguel numeric(12,2),
  inquilino_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Fotos de salas (sala_id preenchido) ou das áreas comuns da galeria (sala_id nulo).
create table if not exists public.fotos (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid references public.salas(id) on delete cascade,
  storage_path text not null,
  legenda text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- Avisos / informações gerais da galeria
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CONTRATOS E ADITIVOS
-- ---------------------------------------------------------------------
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  inquilino_id uuid not null references public.profiles(id) on delete cascade,
  sala_id uuid references public.salas(id) on delete set null,
  data_inicio date not null,
  data_fim date,
  valor_mensal numeric(12,2) not null,
  dia_vencimento int not null check (dia_vencimento between 1 and 28),
  multa_percentual numeric(5,2) not null default 2,         -- multa por atraso (%)
  juros_mensal_percentual numeric(5,2) not null default 1,  -- juros ao mês (%)
  arquivo_path text,                                        -- PDF no bucket "contratos"
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.aditivos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  titulo text not null,
  descricao text,
  data date not null default current_date,
  arquivo_path text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- COBRANÇAS (um registro por mês de cada contrato = "boleto")
-- ---------------------------------------------------------------------
create table if not exists public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  inquilino_id uuid not null references public.profiles(id) on delete cascade,
  competencia date not null,              -- sempre o dia 1 do mês de referência
  vencimento date not null,
  valor numeric(12,2) not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_analise', 'pago', 'cancelado')),
  pago_em date,
  boleto_url text,
  linha_digitavel text,
  observacao text,
  created_at timestamptz not null default now(),
  unique (contrato_id, competencia)
);

create index if not exists cobrancas_inquilino_idx on public.cobrancas (inquilino_id, competencia);

create table if not exists public.comprovantes (
  id uuid primary key default gen_random_uuid(),
  cobranca_id uuid not null references public.cobrancas(id) on delete cascade,
  inquilino_id uuid not null references public.profiles(id) on delete cascade,
  arquivo_path text not null,
  status text not null default 'em_analise'
    check (status in ('em_analise', 'aprovado', 'rejeitado')),
  observacao_admin text,
  enviado_em timestamptz not null default now()
);

-- Ao enviar um comprovante, a cobrança passa para "em análise".
create or replace function public.on_comprovante_enviado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cobrancas
     set status = 'em_analise'
   where id = new.cobranca_id
     and inquilino_id = new.inquilino_id
     and status = 'pendente';
  return new;
end;
$$;

drop trigger if exists comprovante_enviado on public.comprovantes;
create trigger comprovante_enviado
  after insert on public.comprovantes
  for each row execute function public.on_comprovante_enviado();

create table if not exists public.multas (
  id uuid primary key default gen_random_uuid(),
  inquilino_id uuid not null references public.profiles(id) on delete cascade,
  cobranca_id uuid references public.cobrancas(id) on delete set null,
  descricao text not null,
  valor numeric(12,2) not null,
  data date not null default current_date,
  status text not null default 'pendente' check (status in ('pendente', 'paga', 'cancelada')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CHAMADOS
-- ---------------------------------------------------------------------
create table if not exists public.chamados (
  id uuid primary key default gen_random_uuid(),
  inquilino_id uuid not null references public.profiles(id) on delete cascade,
  sala_id uuid references public.salas(id) on delete set null,
  titulo text not null,
  descricao text not null,
  categoria text not null default 'outros',
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  status text not null default 'aberto'
    check (status in ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  foto_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chamado_mensagens (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados(id) on delete cascade,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  mensagem text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- HISTÓRICO DE MENSAGENS DE WHATSAPP
-- ---------------------------------------------------------------------
create table if not exists public.mensagens_whatsapp (
  id uuid primary key default gen_random_uuid(),
  inquilino_id uuid references public.profiles(id) on delete set null,
  cobranca_id uuid references public.cobrancas(id) on delete set null,
  telefone text,
  mensagem text not null,
  tipo text not null default 'manual' check (tipo in ('manual', 'automatica')),
  status text not null default 'registrada', -- registrada | enviada | erro
  erro text,
  enviado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- GERAR COBRANÇAS DO MÊS para todos os contratos ativos
-- ---------------------------------------------------------------------
create or replace function public.gerar_cobrancas(p_mes date default current_date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp date := date_trunc('month', p_mes)::date;
  v_qtd int;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas administradores podem gerar cobranças.';
  end if;

  insert into public.cobrancas (contrato_id, inquilino_id, competencia, vencimento, valor)
  select c.id, c.inquilino_id, v_comp,
         (v_comp + (c.dia_vencimento - 1))::date,
         c.valor_mensal
    from public.contratos c
   where c.ativo
     and date_trunc('month', c.data_inicio)::date <= v_comp
     and (c.data_fim is null or c.data_fim >= v_comp)
  on conflict (contrato_id, competencia) do nothing;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS (segurança por linha)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.salas enable row level security;
alter table public.fotos enable row level security;
alter table public.avisos enable row level security;
alter table public.contratos enable row level security;
alter table public.aditivos enable row level security;
alter table public.cobrancas enable row level security;
alter table public.comprovantes enable row level security;
alter table public.multas enable row level security;
alter table public.chamados enable row level security;
alter table public.chamado_mensagens enable row level security;
alter table public.mensagens_whatsapp enable row level security;

-- profiles
drop policy if exists "perfil: ver o próprio ou admin" on public.profiles;
create policy "perfil: ver o próprio ou admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "perfil: editar o próprio ou admin" on public.profiles;
create policy "perfil: editar o próprio ou admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- salas, fotos, avisos: todos os usuários logados veem; só admin altera
drop policy if exists "salas: leitura" on public.salas;
create policy "salas: leitura" on public.salas for select using (auth.uid() is not null);
drop policy if exists "salas: admin" on public.salas;
create policy "salas: admin" on public.salas for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "fotos: leitura" on public.fotos;
create policy "fotos: leitura" on public.fotos for select using (auth.uid() is not null);
drop policy if exists "fotos: admin" on public.fotos;
create policy "fotos: admin" on public.fotos for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "avisos: leitura" on public.avisos;
create policy "avisos: leitura" on public.avisos for select using (auth.uid() is not null);
drop policy if exists "avisos: admin" on public.avisos;
create policy "avisos: admin" on public.avisos for all using (public.is_admin()) with check (public.is_admin());

-- contratos e aditivos: inquilino vê os seus; admin tudo
drop policy if exists "contratos: leitura" on public.contratos;
create policy "contratos: leitura" on public.contratos
  for select using (inquilino_id = auth.uid() or public.is_admin());
drop policy if exists "contratos: admin" on public.contratos;
create policy "contratos: admin" on public.contratos for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "aditivos: leitura" on public.aditivos;
create policy "aditivos: leitura" on public.aditivos
  for select using (
    public.is_admin() or exists (
      select 1 from public.contratos c where c.id = contrato_id and c.inquilino_id = auth.uid()
    )
  );
drop policy if exists "aditivos: admin" on public.aditivos;
create policy "aditivos: admin" on public.aditivos for all using (public.is_admin()) with check (public.is_admin());

-- cobranças: inquilino só lê as suas; admin tudo
drop policy if exists "cobrancas: leitura" on public.cobrancas;
create policy "cobrancas: leitura" on public.cobrancas
  for select using (inquilino_id = auth.uid() or public.is_admin());
drop policy if exists "cobrancas: admin" on public.cobrancas;
create policy "cobrancas: admin" on public.cobrancas for all using (public.is_admin()) with check (public.is_admin());

-- comprovantes: inquilino lê e envia os seus (para cobrança dele); admin tudo
drop policy if exists "comprovantes: leitura" on public.comprovantes;
create policy "comprovantes: leitura" on public.comprovantes
  for select using (inquilino_id = auth.uid() or public.is_admin());
drop policy if exists "comprovantes: inquilino envia" on public.comprovantes;
create policy "comprovantes: inquilino envia" on public.comprovantes
  for insert with check (
    inquilino_id = auth.uid()
    and status = 'em_analise'
    and exists (
      select 1 from public.cobrancas cb
      where cb.id = cobranca_id and cb.inquilino_id = auth.uid()
    )
  );
drop policy if exists "comprovantes: admin" on public.comprovantes;
create policy "comprovantes: admin" on public.comprovantes for all using (public.is_admin()) with check (public.is_admin());

-- multas
drop policy if exists "multas: leitura" on public.multas;
create policy "multas: leitura" on public.multas
  for select using (inquilino_id = auth.uid() or public.is_admin());
drop policy if exists "multas: admin" on public.multas;
create policy "multas: admin" on public.multas for all using (public.is_admin()) with check (public.is_admin());

-- chamados: inquilino cria e lê os seus; admin tudo
drop policy if exists "chamados: leitura" on public.chamados;
create policy "chamados: leitura" on public.chamados
  for select using (inquilino_id = auth.uid() or public.is_admin());
drop policy if exists "chamados: inquilino cria" on public.chamados;
create policy "chamados: inquilino cria" on public.chamados
  for insert with check (inquilino_id = auth.uid() and status = 'aberto');
drop policy if exists "chamados: admin" on public.chamados;
create policy "chamados: admin" on public.chamados for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "chamado_mensagens: leitura" on public.chamado_mensagens;
create policy "chamado_mensagens: leitura" on public.chamado_mensagens
  for select using (
    public.is_admin() or exists (
      select 1 from public.chamados ch where ch.id = chamado_id and ch.inquilino_id = auth.uid()
    )
  );
drop policy if exists "chamado_mensagens: escrever" on public.chamado_mensagens;
create policy "chamado_mensagens: escrever" on public.chamado_mensagens
  for insert with check (
    autor_id = auth.uid() and (
      public.is_admin() or exists (
        select 1 from public.chamados ch where ch.id = chamado_id and ch.inquilino_id = auth.uid()
      )
    )
  );

-- mensagens de WhatsApp: só admin
drop policy if exists "whatsapp: admin" on public.mensagens_whatsapp;
create policy "whatsapp: admin" on public.mensagens_whatsapp
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- STORAGE (arquivos)
--   comprovantes/<inquilino_id>/...  privado
--   contratos/<inquilino_id>/...     privado (só admin envia)
--   chamados/<inquilino_id>/...      privado
--   fotos/...                        público (fotos das salas e da galeria)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('comprovantes', 'comprovantes', false),
  ('contratos', 'contratos', false),
  ('chamados', 'chamados', false),
  ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "storage: admin tudo" on storage.objects;
create policy "storage: admin tudo" on storage.objects
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "storage: inquilino lê a própria pasta" on storage.objects;
create policy "storage: inquilino lê a própria pasta" on storage.objects
  for select using (
    bucket_id in ('comprovantes', 'contratos', 'chamados')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage: inquilino envia na própria pasta" on storage.objects;
create policy "storage: inquilino envia na própria pasta" on storage.objects
  for insert with check (
    bucket_id in ('comprovantes', 'chamados')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage: fotos públicas" on storage.objects;
create policy "storage: fotos públicas" on storage.objects
  for select using (bucket_id = 'fotos');

-- Vistoria das salas e data de assinatura do contrato: veja supabase/migracao_vistoria.sql
-- (rode também aquele arquivo numa instalação nova).
-- Salas anunciadas na página inicial: veja supabase/migracao_salas_disponiveis.sql
-- Painel de configurações (nome, logos, cores, textos, mapa, regras): veja supabase/migracao_configuracoes.sql
-- Acordos judiciais (quitam mensalidades): veja supabase/migracao_acordos.sql
-- Fiador do contrato: veja supabase/migracao_fiador.sql
