BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_code text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS remarks text;

ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL;

UPDATE public.users
SET
  status = COALESCE(NULLIF(status, ''), 'Active'),
  last_login_at = COALESCE(last_login_at, created_at, timezone('utc', now()));

DO $$
DECLARE
  user_row record;
  raw_prefix text;
  normalized_prefix text;
  next_sequence integer;
BEGIN
  FOR user_row IN
    SELECT id, full_name
    FROM public.users
    WHERE user_code IS NULL OR btrim(user_code) = ''
    ORDER BY created_at, id
  LOOP
    raw_prefix := CASE
      WHEN COALESCE(btrim(user_row.full_name), '') = '' THEN 'US'
      WHEN array_length(regexp_split_to_array(btrim(user_row.full_name), '\s+'), 1) >= 2 THEN
        COALESCE(left((regexp_split_to_array(btrim(user_row.full_name), '\s+'))[1], 1), 'U') ||
        COALESCE(left((regexp_split_to_array(btrim(user_row.full_name), '\s+'))[2], 1), 'S')
      ELSE
        left(regexp_replace(upper(user_row.full_name), '[^A-Z0-9]', '', 'g'), 2)
    END;

    normalized_prefix := regexp_replace(upper(COALESCE(raw_prefix, 'US')), '[^A-Z]', 'U', 'g');
    normalized_prefix := rpad(left(normalized_prefix, 2), 2, 'U');

    SELECT COALESCE(MAX(right(user_code, 4)::integer), 0) + 1
    INTO next_sequence
    FROM public.users
    WHERE user_code ~ ('^' || normalized_prefix || '[0-9]{4}$');

    UPDATE public.users
    SET user_code = normalized_prefix || lpad(next_sequence::text, 4, '0')
    WHERE id = user_row.id;
  END LOOP;
END $$;

ALTER TABLE public.users
  ALTER COLUMN user_code SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'Active',
  ALTER COLUMN last_login_at SET DEFAULT timezone('utc', now());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_user_code_format_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_user_code_format_check
      CHECK (user_code ~ '^[A-Z]{2}[0-9]{4}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_status_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('Active', 'Inactive'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_user_code_key ON public.users(user_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

NOTIFY pgrst, 'reload schema';

COMMIT;
