alter table public.transfer_order
  add column if not exists hold_reason text,
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at timestamptz;
