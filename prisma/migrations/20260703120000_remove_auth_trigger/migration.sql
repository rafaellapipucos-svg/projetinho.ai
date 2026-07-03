-- ─────────────────────────────────────────────────────────────────────────────
-- Remove o trigger auth.users → public.users.
--
-- O trigger `on_auth_user_created` (migration de fundação) fazia o signup do
-- Supabase falhar com "Database error saving new user" (500). O espelho de
-- usuários já é garantido em código por `userRepo.ensureMirror` no
-- TenantContext (primeiro acesso autenticado), que é o caminho robusto e
-- portável — o trigger era redundante e frágil.
--
-- Guardado por DO: em bancos sem o schema auth (shadow db) o bloco é ignorado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
  END IF;
END
$outer$;

DROP FUNCTION IF EXISTS public.handle_new_auth_user();
