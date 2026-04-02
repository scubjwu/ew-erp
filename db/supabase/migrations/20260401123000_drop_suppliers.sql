alter table if exists public.purchase_order
  drop constraint if exists purchase_order_supplier_id_fkey;

alter table if exists public.purchase_order
  drop column if exists supplier_id;

drop table if exists public.vendor_attachment_links cascade;

drop table if exists public.suppliers cascade;

notify pgrst, 'reload schema';
