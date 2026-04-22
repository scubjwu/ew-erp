do $$
begin
  if exists (select 1 from public.cities where city_code = 'TESTA') then
    raise exception 'Cannot normalize TEST city code because TESTA already exists.';
  end if;

  if exists (select 1 from public.cities where city_code = 'TSTCY') then
    raise exception 'Cannot normalize TESTCITY city code because TSTCY already exists.';
  end if;

  if exists (select 1 from public.cities where city_code = 'RGTST') then
    raise exception 'Cannot normalize RG2882 city code because RGTST already exists.';
  end if;
end $$;

update public.cities
set city_code = 'TESTA'
where city_code = 'TEST';

update public.cities
set city_code = 'TSTCY'
where city_code = 'TESTCITY';

update public.cities
set city_code = 'RGTST'
where city_code = 'RG2882';

alter table public.cities
  drop constraint if exists cities_city_code_format_check;

alter table public.cities
  add constraint cities_city_code_format_check
  check (city_code ~ '^[A-Z]{5}$');
