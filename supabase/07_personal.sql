-- Lista de socios y vendedores activos para los desplegables «Responsable» (aplicado el 16/11/2026).
-- Los vendedores no pueden leer la tabla perfiles completa; esta función les da solo nombre y rol.
create or replace function public.lista_personal()
returns table (nombre text, rol text)
language sql stable security definer set search_path = public
as $$
  select p.nombre, p.rol from public.perfiles p
  where p.activo and public.es_personal()
  order by case p.rol when 'socio' then 0 else 1 end, p.nombre;
$$;
revoke all on function public.lista_personal() from public, anon;
grant execute on function public.lista_personal() to authenticated;
