-- =====================================================================
-- Alma Viajera Turismo · Paso 2: ajustes para conectar el sistema
-- Se ejecuta UNA vez, después del paso 1. No borra datos.
-- =====================================================================

-- Campo "extra" en cada tabla: guarda datos complementarios de la
-- pantalla (por ejemplo, la habitación asignada en el rooming).
do $$
declare t text;
begin
  foreach t in array array['pasajeros','pedidos','salidas','habitaciones','reservas','extensiones',
    'aereos','cobros','turnos_caja','movimientos_caja','transferencias_caja','proveedores',
    'compromisos','pagos_proveedores','extras_salida']
  loop
    execute format('alter table public.%I add column if not exists extra jsonb not null default ''{}''', t);
  end loop;
end $$;

-- Habitaciones: el identificador visible va en "extra"
alter table public.habitaciones alter column tipo drop not null;

-- Reservas: se agrega el estado "Reabierta" (lo usa el sistema)
alter table public.reservas drop constraint if exists reservas_estado_check;
alter table public.reservas add constraint reservas_estado_check
  check (estado in ('Abierta','Reabierta','Cerrada','Baja'));

-- El control de tarifa grupal se aplica solo cuando cambia el precio
create or replace function public.preparar_reserva() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.salidas; ocupados int;
begin
  if new.tipo = 'grupal' then
    select * into s from public.salidas where id = new.salida_id;
    new.moneda := s.moneda;
    if not public.es_socio() and new.precio <> s.precio
       and (tg_op = 'INSERT' or new.precio is distinct from old.precio) then
      raise exception 'Solo un socio puede fijar una tarifa distinta del precio de la salida';
    end if;
    if tg_op = 'INSERT' and s.cupos > 0 then
      select count(*) into ocupados from public.reservas
        where salida_id = s.id and estado <> 'Baja';
      if ocupados >= s.cupos then raise exception 'La salida no tiene cupos disponibles'; end if;
    end if;
  end if;
  if tg_op = 'INSERT' and new.tipo = 'individual' and new.file is null then
    new.file := public.proximo_file('VI', new.fecha_salida);
  end if;
  return new;
end $$;

-- Cobros: acepta cuentas reabiertas y conserva el detalle del recibo
create or replace function public.preparar_cobro() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.reservas; t numeric; c numeric;
begin
  select * into r from public.reservas where id = new.reserva_id for update;
  if r.estado not in ('Abierta','Reabierta') then raise exception 'La cuenta no está abierta'; end if;
  t := public.total_reserva(r.id);
  c := public.cobrado_reserva(r.id);
  if new.importe > t - c + 0.001 then
    raise exception 'El cobro supera el saldo pendiente (% %)', round(t - c, 2), r.moneda;
  end if;
  if new.medio = 'Efectivo' and not public.caja_abierta(new.caja) then
    raise exception 'La caja % no está abierta. Abrila antes de cobrar en efectivo.',
      case new.caja when 'gaona' then 'Gaona' else 'Centro' end;
  end if;
  new.moneda := r.moneda;
  new.registrado_por := public.mi_nombre();
  new.registrado := now();
  new.anulado := null;
  new.concepto := case
    when c = 0 and new.importe < t - 0.001 then 'Seña'
    when c + new.importe >= t - 0.001 then 'Saldo'
    else 'A cuenta' end;
  -- Las cifras del recibo las fija el servidor
  new.foto := coalesce(new.foto, '{}') || jsonb_build_object(
    'total', t, 'paidBefore', c, 'balanceAfter', greatest(0, round(t - c - new.importe, 2)));
  return new;
end $$;

-- Un recibo emitido no se edita: solo se anula (con motivo)
create or replace function public.solo_anular_cobro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.anulado is not null then raise exception 'El recibo ya está anulado'; end if;
  if new.anulado is null or coalesce(trim(new.motivo_anulacion), '') = '' then
    raise exception 'Para anular un recibo hay que indicar el motivo';
  end if;
  if (to_jsonb(new) - array['anulado','anulado_por','motivo_anulacion','extra'])
     <> (to_jsonb(old) - array['anulado','anulado_por','motivo_anulacion','extra']) then
    raise exception 'Un recibo emitido no se puede modificar, solo anular';
  end if;
  new.anulado := now();
  new.anulado_por := public.mi_nombre();
  return new;
end $$;

-- Rooming: cualquier integrante del personal puede quitar una habitación
drop policy if exists habitaciones_borrar on public.habitaciones;
create policy habitaciones_borrar on public.habitaciones for delete using (public.es_personal());

-- Permisos para las columnas nuevas
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Efectivo de movimientos internos (sin detalles), para que el vendedor
-- calcule bien el arqueo al cerrar la caja sin ver gastos ni proveedores.
create or replace function public.efectivo_interno()
returns table (caja text, moneda text, fecha date, registrado timestamptz, importe numeric, medio text)
language sql stable security definer set search_path = public as $$
  select m.caja, m.moneda, m.fecha, m.registrado,
         case when m.tipo = 'ingreso' then m.importe else -m.importe end, m.medio
    from public.movimientos_caja m where public.es_personal()
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
