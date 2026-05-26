alter table public.container
  add column if not exists yom integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'container_yom_check'
      and conrelid = 'public.container'::regclass
  ) then
    alter table public.container
      add constraint container_yom_check
      check (yom is null or yom between 1900 and 2100);
  end if;
end $$;

with ranked_purchase_container_yom as (
  select
    poc.container_id,
    poc.yom,
    row_number() over (
      partition by poc.container_id
      order by poc.updated_at desc nulls last, poc.created_at desc nulls last, poc.id desc
    ) as row_num
  from public.purchase_order_container poc
  where poc.container_id is not null
    and poc.yom between 1900 and 2100
)
update public.container c
set yom = ranked_purchase_container_yom.yom
from ranked_purchase_container_yom
where c.id = ranked_purchase_container_yom.container_id
  and ranked_purchase_container_yom.row_num = 1
  and c.yom is distinct from ranked_purchase_container_yom.yom;

notify pgrst, 'reload schema';
