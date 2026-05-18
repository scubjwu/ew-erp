BEGIN;

GRANT INSERT, UPDATE ON TABLE public.users TO anon;
GRANT INSERT, UPDATE ON TABLE public.users TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
