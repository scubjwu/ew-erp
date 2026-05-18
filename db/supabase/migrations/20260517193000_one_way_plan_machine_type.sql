alter table public.one_way_plan
  add column if not exists machine_type text;

notify pgrst, 'reload schema';
