-- Vendedores: pueden cargar la liquidación del operador de SUS reservas (se crea el compromiso del pasajero)
-- y ver la lista de proveedores. Los pagos a proveedores siguen siendo solo de socios.
create or replace function public.es_mi_reserva(p_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.reservas r where r.id::text = p_id and (r.vendedor = public.mi_nombre() or r.responsable = public.mi_nombre()))
$$;
revoke all on function public.es_mi_reserva(text) from public, anon;
grant execute on function public.es_mi_reserva(text) to authenticated;
create policy compromisos_vendedor_ver on public.compromisos for select to authenticated
  using (public.es_personal() and extra ? 'bookingId' and public.es_mi_reserva(extra->>'bookingId'));
create policy compromisos_vendedor_alta on public.compromisos for insert to authenticated
  with check (public.es_personal() and extra ? 'bookingId' and public.es_mi_reserva(extra->>'bookingId'));
create policy compromisos_vendedor_cambio on public.compromisos for update to authenticated
  using (public.es_personal() and extra ? 'bookingId' and public.es_mi_reserva(extra->>'bookingId'))
  with check (public.es_personal() and extra ? 'bookingId' and public.es_mi_reserva(extra->>'bookingId'));
create policy proveedores_personal_ver on public.proveedores for select to authenticated using (public.es_personal());
