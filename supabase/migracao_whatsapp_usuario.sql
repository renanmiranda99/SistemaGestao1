-- =====================================================================
-- Migração: ligar/desligar o envio de WhatsApp por inquilino
-- Rode uma vez no Supabase (SQL Editor → New query → Run).
-- Pode rodar de novo sem problema.
-- =====================================================================

-- true = recebe mensagens (cobranças, lembretes, envios em massa); false = não recebe nenhuma
alter table public.profiles add column if not exists whatsapp_ativo boolean not null default true;

-- Só o administrador pode mudar essa opção (o inquilino não consegue mudar a dele pelo app)
create or replace function public.protect_whatsapp_ativo()
returns trigger
language plpgsql
as $$
begin
  if new.whatsapp_ativo is distinct from old.whatsapp_ativo
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Somente a administração pode ligar ou desligar o WhatsApp.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_whatsapp on public.profiles;
create trigger profiles_protect_whatsapp
  before update on public.profiles
  for each row execute function public.protect_whatsapp_ativo();

-- Faz a API do Supabase enxergar a coluna nova na hora
notify pgrst, 'reload schema';
