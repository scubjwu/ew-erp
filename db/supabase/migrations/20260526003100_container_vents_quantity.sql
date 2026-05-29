alter table public.container
  add column if not exists vents_quantity integer;

with ranked_purchase_container_vents as (
  select
    poc.container_id,
    poc.vents_count,
    row_number() over (
      partition by poc.container_id
      order by poc.updated_at desc nulls last, poc.created_at desc nulls last, poc.id desc
    ) as row_num
  from public.purchase_order_container poc
  where poc.container_id is not null
    and poc.vents_count >= 0
)
update public.container c
set vents_quantity = ranked_purchase_container_vents.vents_count
from ranked_purchase_container_vents
where c.id = ranked_purchase_container_vents.container_id
  and ranked_purchase_container_vents.row_num = 1
  and c.vents_quantity is distinct from ranked_purchase_container_vents.vents_count;

alter table public.container
  alter column vents drop default;

alter table public.container
  drop column if exists vents;

alter table public.container
  rename column vents_quantity to vents;

alter table public.container
  alter column vents drop default;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'container_vents_check'
      and conrelid = 'public.container'::regclass
  ) then
    alter table public.container
      add constraint container_vents_check
      check (vents is null or vents >= 0);
  end if;
end $$;

notify pgrst, 'reload schema';
