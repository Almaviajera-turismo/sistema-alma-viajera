-- Vendedores: pueden registrar ingresos y gastos en la caja de su oficina (aplicado el 16/11/2026).
-- Ven solo los movimientos que cargaron ellos; no pueden editarlos, borrarlos ni hacer retiros.
create policy movimientos_caja_vendedor_ver on public.movimientos_caja for select to authenticated
  using (public.es_personal() and registrado_por = public.mi_nombre());
create policy movimientos_caja_vendedor_cargar on public.movimientos_caja for insert to authenticated
  with check (
    public.es_personal() and registrado_por = public.mi_nombre() and tipo in ('ingreso', 'gasto')
    and coalesce((select p.oficina from public.perfiles p where p.id = auth.uid()), caja) = caja
  );
-- El efectivo de otros movimientos (para el arqueo del vendedor) ya no repite los que él mismo cargó.
create or replace function public.efectivo_interno()
returns table (caja text, moneda text, fecha date, registrado timestamptz, importe numeric, medio text)
language sql stable security definer set search_path = public as $$
  select m.caja, m.moneda, m.fecha, m.registrado,
         case when m.tipo = 'ingreso' then m.importe else -m.importe end, m.medio
    from public.movimientos_caja m
   where public.es_personal() and (public.es_socio() or m.registrado_por is distinct from public.mi_nombre())
  union all
  select p.caja, c.moneda, p.fecha, p.registrado, -p.importe, p.medio
    from public.pagos_proveedores p join public.compromisos c on c.id = p.compromiso_id where public.es_personal()
  union all
  select t.desde, t.moneda, t.fecha, t.registrado, -t.importe, 'Efectivo' from public.transferencias_caja t where public.es_personal()
  union all
  select t.hacia, t.moneda, t.fecha, t.registrado, t.importe, 'Efectivo' from public.transferencias_caja t where public.es_personal()
$$;
revoke all on function public.efectivo_interno() from public, anon;
grant execute on function public.efectivo_interno() to authenticated;
