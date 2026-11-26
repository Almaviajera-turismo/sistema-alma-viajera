-- El total de la reserva que usa el servidor (para validar cobros y fijar las cifras del recibo) ahora suma
-- los cargos de la salida grupal: impuestos, gastos administrativos y suplemento single (si la habitación es Single),
-- y resta el descuento. Igual que el total que muestra el sistema.
create or replace function public.num_seguro(t text) returns numeric language sql immutable as $$
  select case when t ~ '^\s*-?\d+(\.\d+)?\s*$' then t::numeric else 0 end $$;
create or replace function public.total_reserva(r_id uuid)
returns numeric language sql stable set search_path = public as $$
  select r.precio
    + coalesce((select sum(importe) from public.extensiones e where e.reserva_id = r.id), 0)
    + case when r.tipo = 'grupal' and s.id is not null and coalesce(s.moneda, 'USD') = coalesce(r.moneda, 'USD') then
        public.num_seguro(s.extra->>'taxes') + public.num_seguro(s.extra->>'adminFee')
        + case when r.extra->>'roomType' = 'Single' then public.num_seguro(s.extra->>'singleSupplement') else 0 end
      else 0 end
    - greatest(0, public.num_seguro(r.extra->>'discount'))
  from public.reservas r left join public.salidas s on s.id = r.salida_id
  where r.id = r_id $$;
