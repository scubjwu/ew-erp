BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

DROP POLICY IF EXISTS users_public_select ON public.users;
CREATE POLICY users_public_select
ON public.users
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS users_public_insert ON public.users;
CREATE POLICY users_public_insert
ON public.users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS users_public_update ON public.users;
CREATE POLICY users_public_update
ON public.users
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

COMMIT;
