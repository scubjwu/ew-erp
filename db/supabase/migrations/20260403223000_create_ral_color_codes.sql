create table if not exists public.ral_color_codes (
  id uuid primary key default gen_random_uuid(),
  color_code text not null unique
);

grant select on table public.ral_color_codes to anon;
grant select on table public.ral_color_codes to authenticated;
grant select on table public.ral_color_codes to service_role;

alter table public.ral_color_codes enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'ral_color_codes'
          and policyname = 'ral_color_codes_public_select'
    ) then
        create policy ral_color_codes_public_select
            on public.ral_color_codes
            for select
            to public
            using (true);
    end if;
end $$;
