-- =====================================================================
-- Tornar um usuário ADMIN (só é possível por aqui, direto no banco).
--
-- 1. Cadastre a pessoa normalmente pela tela de cadastro do app
--    (ou em Authentication > Users > Add user no painel do Supabase).
-- 2. Troque o e-mail abaixo e rode no SQL Editor do Supabase.
-- =====================================================================

update public.profiles
   set role = 'admin'
 where email = 'admin@exemplo.com';

-- Conferir:
select id, nome, email, role from public.profiles where role = 'admin';
