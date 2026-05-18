alter table public.purchase_order_item_attachment_links
  drop constraint if exists purchase_order_item_attachment_links_attachment_type_check;

alter table public.purchase_order_item_attachment_links
  add constraint purchase_order_item_attachment_links_attachment_type_check
  check (
    attachment_type = any (
      array[
        'VENDOR_RELEASE'::text,
        'GENERAL'::text,
        'INVOICE'::text,
        'CONTRACT'::text
      ]
    )
  );
