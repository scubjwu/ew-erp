alter table if exists public.transfer_item
  add column if not exists remark1 text;

notify pgrst, 'reload schema';
