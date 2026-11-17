-- 13: el número de file nunca repite uno existente (el contador había quedado atrasado
-- porque las primeras salidas se cargaron con su file a mano).
create or replace function public.proximo_file(p_prefijo text, p_fecha date)
returns text language plpgsql security definer set search_path = public as $$
declare n int; m int; y int := extract(year from coalesce(p_fecha, current_date));
begin
  select coalesce(max(right(f.file, 4)::int), 0) into m
    from (select file from public.salidas union all select file from public.reservas) f
   where f.file ~ ('^' || p_prefijo || '-' || y || '-[0-9]{4}$');
  insert into public.contadores_file (prefijo, anio, ultimo) values (p_prefijo, y, m + 1)
    on conflict (prefijo, anio) do update set ultimo = greatest(contadores_file.ultimo + 1, m + 1)
    returning ultimo into n;
  return p_prefijo || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;
revoke execute on function public.proximo_file(text, date) from public, anon;
grant execute on function public.proximo_file(text, date) to authenticated;
