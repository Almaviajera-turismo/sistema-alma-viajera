-- =====================================================================
-- Alma Viajera Turismo · Sistema de gestión online
-- Paso 1: estructura de la base de datos, permisos y bitácora
--
-- Cómo usarlo: en Supabase → SQL Editor → New query → pegar TODO este
-- archivo → Run. Se ejecuta una sola vez sobre un proyecto vacío.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Usuarios del sistema y roles
-- ---------------------------------------------------------------------
-- Cada persona entra con su email (Supabase Auth). Esta tabla dice
-- quién es y qué rol tiene. Solo un socio puede cambiar roles.
create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null unique,
  rol         text not null check (rol in ('socio','vendedor')),
  oficina     text check (oficina in ('centro','gaona')),   -- oficina asignada (vendedores)
  activo      boolean not null default true,
  creado      timestamptz not null default now()
);

-- Lista de personas autorizadas. Cuando alguien de esta lista se
-- registra con ese email, se le crea el perfil con su rol. Cualquier
-- otro email que intente registrarse queda sin acceso.
create table public.usuarios_autorizados (
  email   text primary key,
  nombre  text not null,
  rol     text not null check (rol in ('socio','vendedor')),
  oficina text check (oficina in ('centro','gaona'))
);

-- Funciones de ayuda para los permisos
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;

create or replace function public.es_socio() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() = 'socio', false)
$$;

create or replace function public.es_personal() returns boolean
language sql stable security definer set search_path = public as $$
  select public.mi_rol() is not null
$$;

create or replace function public.mi_nombre() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nombre from public.perfiles where id = auth.uid()), 'sistema')
$$;

-- Al registrarse un usuario nuevo: si está autorizado, se crea su perfil.
create or replace function public.crear_perfil_al_registrarse() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.usuarios_autorizados;
begin
  select * into a from public.usuarios_autorizados where lower(email) = lower(new.email);
  if found then
    insert into public.perfiles (id, nombre, email, rol, oficina)
    values (new.id, a.nombre, lower(new.email), a.rol, a.oficina)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();

-- ---------------------------------------------------------------------
-- 2. Datos comerciales (los usan socios y vendedores)
-- ---------------------------------------------------------------------
create table public.pasajeros (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  telefono           text,
  email              text,
  fecha_nacimiento   date,
  nacionalidad       text,
  documento          text,
  cuil               text,
  pasaporte_numero   text,
  pasaporte_emision  date,
  pasaporte_vence    date,
  lugar_nacimiento   text,
  sexo_documento     text,
  notas              text,
  creado             timestamptz not null default now(),
  creado_por         text not null default public.mi_nombre()
);
create unique index pasajeros_nombre_unico on public.pasajeros (lower(trim(nombre)));

create table public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  cliente          text not null,
  telefono         text,
  tipo             text not null default 'individual' check (tipo in ('individual','grupal')),
  salida_id        uuid,                       -- si es grupal (se enlaza más abajo)
  destino          text not null,
  cuando           text,
  pasajeros_cant   int check (pasajeros_cant > 0),
  precio_cotizado  numeric(14,2) check (precio_cotizado >= 0),
  moneda           text check (moneda in ('USD','ARS')),
  responsable      text,
  estado           text not null default 'Pendiente',
  fecha            date not null default current_date,
  notas            text,
  vendedor         text not null default public.mi_nombre(),
  creado           timestamptz not null default now()
);

-- Numeración de files: SG-AAAA-0001 (grupales) y VI-AAAA-0001 (individuales)
create table public.contadores_file (
  prefijo text not null,
  anio    int  not null,
  ultimo  int  not null default 0,
  primary key (prefijo, anio)
);

create or replace function public.proximo_file(p_prefijo text, p_fecha date)
returns text language plpgsql security definer set search_path = public as $$
declare n int; y int := extract(year from coalesce(p_fecha, current_date));
begin
  insert into public.contadores_file (prefijo, anio, ultimo) values (p_prefijo, y, 1)
  on conflict (prefijo, anio) do update set ultimo = contadores_file.ultimo + 1
  returning ultimo into n;
  return p_prefijo || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;

create table public.salidas (
  id           uuid primary key default gen_random_uuid(),
  file         text unique,
  nombre       text not null,
  destino      text not null,
  fecha_salida date not null,
  fecha_regreso date not null,
  precio       numeric(14,2) not null check (precio >= 0),
  moneda       text not null default 'USD' check (moneda in ('USD','ARS')),
  cupos        int not null default 0 check (cupos >= 0),
  responsable  text,
  descripcion  text,
  publicada_web boolean not null default false,   -- para mostrarla en la página web
  creado       timestamptz not null default now(),
  check (fecha_regreso >= fecha_salida)
);

alter table public.pedidos
  add constraint pedidos_salida_fk foreign key (salida_id) references public.salidas(id);

create or replace function public.asignar_file_salida() returns trigger
language plpgsql as $$
begin
  if new.file is null then new.file := public.proximo_file('SG', new.fecha_salida); end if;
  return new;
end $$;
create trigger salidas_file before insert on public.salidas
  for each row execute function public.asignar_file_salida();

-- Rooming: una distribución fija de habitaciones por salida
create table public.habitaciones (
  id         uuid primary key default gen_random_uuid(),
  salida_id  uuid not null references public.salidas(id) on delete cascade,
  tipo       text not null,
  ocupantes  uuid[] not null default '{}',     -- ids de reservas
  notas      text,
  creado     timestamptz not null default now()
);

-- Reservas / cuentas: una por pasajero y por viaje (grupal, individual o aéreo)
create table public.reservas (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('grupal','individual','aereo')),
  pasajero_id    uuid not null references public.pasajeros(id),
  salida_id      uuid references public.salidas(id),
  file           text unique,
  cliente        text not null,
  telefono       text,
  viaje          text,                 -- destino/recorrido (individual y aéreo)
  fecha_salida   date,
  fecha_regreso  date,
  precio         numeric(14,2) not null check (precio >= 0),   -- paquete o total
  moneda         text not null default 'USD' check (moneda in ('USD','ARS')),
  transporte     text,
  hotel          text,
  habitacion     text,
  regimen        text,
  operador       text,
  ref_operador   text,
  etapa          text,
  estado         text not null default 'Abierta' check (estado in ('Abierta','Cerrada','Baja')),
  responsable    text,
  notas          text,
  vendedor       text not null default public.mi_nombre(),
  pedido_id      uuid references public.pedidos(id),
  creado         timestamptz not null default now(),
  check (tipo <> 'grupal' or salida_id is not null),
  check (fecha_regreso is null or fecha_salida is null or fecha_regreso >= fecha_salida)
);
-- Un pasajero no puede tener dos cuentas activas en la misma salida
create unique index reservas_una_por_salida on public.reservas (salida_id, pasajero_id)
  where tipo = 'grupal' and estado <> 'Baja';

create or replace function public.preparar_reserva() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.salidas; ocupados int;
begin
  if new.tipo = 'grupal' then
    select * into s from public.salidas where id = new.salida_id;
    new.moneda := s.moneda;
    -- Solo un socio puede cobrar una tarifa distinta a la de la salida
    if not public.es_socio() and new.precio <> s.precio then
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
create trigger reservas_preparar before insert or update on public.reservas
  for each row execute function public.preparar_reserva();

-- Extensiones individuales (suman a la cuenta de ese pasajero solamente)
create table public.extensiones (
  id          uuid primary key default gen_random_uuid(),
  reserva_id  uuid not null references public.reservas(id) on delete cascade,
  titulo      text not null,
  desde       date,
  hasta       date,
  importe     numeric(14,2) not null check (importe >= 0),
  notas       text,
  creado      timestamptz not null default now()
);

-- Ventas de aéreos (datos del vuelo; la cuenta del pasajero está en reservas)
create table public.aereos (
  id             uuid primary key default gen_random_uuid(),
  reserva_id     uuid not null unique references public.reservas(id) on delete cascade,
  fecha_pedido   date not null default current_date,
  destino        text not null,
  fecha_vuelo    date,
  operador       text not null,
  neto           numeric(14,2) not null check (neto >= 0),
  etapa          text not null default 'Solicitado',
  localizador    text,
  notas          text,
  creado         timestamptz not null default now()
);

-- Total y saldo de cada cuenta (se calculan, no se escriben a mano)
create or replace function public.total_reserva(r_id uuid) returns numeric
language sql stable as $$
  select r.precio + coalesce((select sum(importe) from public.extensiones e where e.reserva_id = r.id), 0)
  from public.reservas r where r.id = r_id
$$;

-- ---------------------------------------------------------------------
-- 3. Cobros y recibos
-- ---------------------------------------------------------------------
create sequence public.numero_recibo start 1;

create table public.cobros (
  id            uuid primary key default gen_random_uuid(),
  numero        text unique not null default ('RP-' || lpad(nextval('public.numero_recibo')::text, 6, '0')),
  reserva_id    uuid not null references public.reservas(id),
  fecha         date not null default current_date,
  importe       numeric(14,2) not null check (importe > 0),
  moneda        text not null check (moneda in ('USD','ARS')),
  medio         text not null check (medio in ('Transferencia','Efectivo','Tarjeta','Depósito','Otro')),
  caja          text not null check (caja in ('centro','gaona')),
  concepto      text not null,                 -- Seña / A cuenta / Saldo (automático)
  notas         text,
  foto          jsonb not null default '{}',   -- copia de la cuenta al momento del recibo
  registrado_por text not null default public.mi_nombre(),
  registrado    timestamptz not null default now(),
  -- anulación (solo socios; el recibo original se conserva)
  anulado       timestamptz,
  anulado_por   text,
  motivo_anulacion text
);

create or replace function public.cobrado_reserva(r_id uuid) returns numeric
language sql stable as $$
  select coalesce(sum(importe), 0) from public.cobros where reserva_id = r_id and anulado is null
$$;

create or replace view public.cuentas with (security_invoker = true) as
select r.*,
       public.total_reserva(r.id)                                   as total,
       public.cobrado_reserva(r.id)                                 as cobrado,
       public.total_reserva(r.id) - public.cobrado_reserva(r.id)    as saldo
from public.reservas r;

-- Al registrar un cobro: valida el saldo, la caja abierta y fija el concepto
create or replace function public.preparar_cobro() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.reservas; t numeric; c numeric;
begin
  select * into r from public.reservas where id = new.reserva_id for update;
  if r.estado <> 'Abierta' then raise exception 'La cuenta no está abierta'; end if;
  t := public.total_reserva(r.id);
  c := public.cobrado_reserva(r.id);
  if new.importe > t - c + 0.001 then
    raise exception 'El cobro supera el saldo pendiente (% %)', t - c, r.moneda;
  end if;
  if new.medio = 'Efectivo' and not public.caja_abierta(new.caja) then
    raise exception 'La caja % no está abierta', new.caja;
  end if;
  new.moneda := r.moneda;
  new.registrado_por := public.mi_nombre();
  new.registrado := now();
  new.anulado := null;
  new.concepto := case
    when c = 0 and new.importe < t then 'Seña'
    when c + new.importe >= t - 0.001 then 'Saldo'
    else 'A cuenta' end;
  new.foto := jsonb_build_object(
    'cliente', r.cliente, 'file', r.file, 'tipo', r.tipo, 'moneda', r.moneda,
    'total', t, 'pagado_antes', c, 'saldo_despues', greatest(0, t - c - new.importe),
    'extensiones', (select coalesce(jsonb_agg(to_jsonb(e)), '[]') from public.extensiones e where e.reserva_id = r.id));
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 4. Caja (Centro y Gaona)
-- ---------------------------------------------------------------------
create table public.turnos_caja (
  id               uuid primary key default gen_random_uuid(),
  caja             text not null check (caja in ('centro','gaona')),
  fecha            date not null default current_date,
  estado           text not null default 'abierta' check (estado in ('abierta','cerrada')),
  apertura_ars     numeric(14,2) not null check (apertura_ars >= 0),
  apertura_usd     numeric(14,2) not null check (apertura_usd >= 0),
  abierto_por      text not null default public.mi_nombre(),
  abierto          timestamptz not null default now(),
  notas_apertura   text,
  motivo_reapertura text,
  esperado_ars     numeric(14,2),
  esperado_usd     numeric(14,2),
  contado_ars      numeric(14,2),
  contado_usd      numeric(14,2),
  cerrado_por      text,
  cerrado          timestamptz,
  notas_cierre     text
);
-- Solo un turno abierto por caja
create unique index un_turno_abierto on public.turnos_caja (caja) where estado = 'abierta';

create or replace function public.caja_abierta(p_caja text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.turnos_caja where caja = p_caja and estado = 'abierta')
$$;

create trigger cobros_preparar before insert on public.cobros
  for each row execute function public.preparar_cobro();

-- Movimientos manuales de caja (solo socios)
create table public.movimientos_caja (
  id             uuid primary key default gen_random_uuid(),
  caja           text not null check (caja in ('centro','gaona')),
  tipo           text not null check (tipo in ('ingreso','gasto','retiro')),
  categoria      text not null,
  moneda         text not null check (moneda in ('USD','ARS')),
  importe        numeric(14,2) not null check (importe > 0),
  fecha          date not null default current_date,
  medio          text not null,
  referencia     text,
  notas          text not null,
  registrado_por text not null default public.mi_nombre(),
  registrado     timestamptz not null default now(),
  correcciones   jsonb not null default '[]'
);

create table public.transferencias_caja (
  id             uuid primary key default gen_random_uuid(),
  desde          text not null check (desde in ('centro','gaona')),
  hacia          text not null check (hacia in ('centro','gaona')),
  moneda         text not null check (moneda in ('USD','ARS')),
  importe        numeric(14,2) not null check (importe > 0),
  fecha          date not null default current_date,
  notas          text,
  registrado_por text not null default public.mi_nombre(),
  registrado     timestamptz not null default now(),
  check (desde <> hacia)
);

-- ---------------------------------------------------------------------
-- 5. Proveedores y finanzas (solo socios)
-- ---------------------------------------------------------------------
create table public.proveedores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  categoria  text,
  contacto   text,
  telefono   text,
  email      text,
  cuit       text,
  notas      text,
  creado     timestamptz not null default now()
);
create unique index proveedores_nombre_unico on public.proveedores (lower(trim(nombre)));

-- Compromisos (deudas con proveedores). No mueven caja.
create table public.compromisos (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references public.proveedores(id),
  salida_id     uuid references public.salidas(id),
  reserva_id    uuid references public.reservas(id),   -- null en ambos = gasto general
  categoria     text not null,
  concepto      text not null,
  importe       numeric(14,2) not null check (importe > 0),
  moneda        text not null check (moneda in ('USD','ARS')),
  vencimiento   date,
  notas         text,
  creado        timestamptz not null default now()
);

create table public.pagos_proveedores (
  id             uuid primary key default gen_random_uuid(),
  compromiso_id  uuid not null references public.compromisos(id),
  caja           text not null check (caja in ('centro','gaona')),
  importe        numeric(14,2) not null check (importe > 0),
  fecha          date not null default current_date,
  medio          text not null,
  referencia     text,
  registrado_por text not null default public.mi_nombre(),
  registrado     timestamptz not null default now()
);

create or replace function public.validar_pago_proveedor() returns trigger
language plpgsql security definer set search_path = public as $$
declare pendiente numeric;
begin
  select c.importe - coalesce((select sum(importe) from public.pagos_proveedores p where p.compromiso_id = c.id), 0)
    into pendiente from public.compromisos c where c.id = new.compromiso_id for update;
  if new.importe > pendiente + 0.001 then
    raise exception 'El pago supera lo pendiente con el proveedor (%)', pendiente;
  end if;
  if new.medio = 'Efectivo' and not public.caja_abierta(new.caja) then
    raise exception 'La caja % no está abierta', new.caja;
  end if;
  new.registrado_por := public.mi_nombre();
  return new;
end $$;
create trigger pagos_proveedores_validar before insert on public.pagos_proveedores
  for each row execute function public.validar_pago_proveedor();

-- Extras previstos de una salida (previsión, no mueve caja)
create table public.extras_salida (
  id             uuid primary key default gen_random_uuid(),
  salida_id      uuid not null references public.salidas(id) on delete cascade,
  tipo           text not null check (tipo in ('ingreso','gasto')),
  moneda         text not null check (moneda in ('USD','ARS')),
  concepto       text not null,
  importe        numeric(14,2) not null check (importe > 0),
  fecha          date not null,
  notas          text,
  registrado_por text not null default public.mi_nombre(),
  registrado     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Bitácora automática (nadie puede editarla ni borrarla)
-- ---------------------------------------------------------------------
create table public.bitacora (
  id        bigserial primary key,
  cuando    timestamptz not null default now(),
  usuario   text not null,
  usuario_id uuid,
  accion    text not null,       -- INSERT / UPDATE / DELETE
  tabla     text not null,
  registro  uuid,
  antes     jsonb,
  despues   jsonb
);

create or replace function public.registrar_bitacora() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bitacora (usuario, usuario_id, accion, tabla, registro, antes, despues)
  values (public.mi_nombre(), auth.uid(), tg_op, tg_table_name,
          coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['perfiles','pasajeros','pedidos','salidas','habitaciones','reservas',
    'extensiones','aereos','cobros','turnos_caja','movimientos_caja','transferencias_caja',
    'proveedores','compromisos','pagos_proveedores','extras_salida','usuarios_autorizados']
  loop
    execute format('create trigger bitacora_%1$s after insert or update or delete on public.%1$I
                    for each row execute function public.registrar_bitacora()', t);
  end loop;
end $$;

-- usuarios_autorizados usa email como clave: ajustar registro
create or replace function public.registrar_bitacora_autorizados() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bitacora (usuario, usuario_id, accion, tabla, antes, despues)
  values (public.mi_nombre(), auth.uid(), tg_op, tg_table_name,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
drop trigger bitacora_usuarios_autorizados on public.usuarios_autorizados;
create trigger bitacora_usuarios_autorizados after insert or update or delete on public.usuarios_autorizados
  for each row execute function public.registrar_bitacora_autorizados();

-- ---------------------------------------------------------------------
-- 7. Permisos (Row Level Security): los controla el servidor
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['perfiles','usuarios_autorizados','pasajeros','pedidos','contadores_file',
    'salidas','habitaciones','reservas','extensiones','aereos','cobros','turnos_caja',
    'movimientos_caja','transferencias_caja','proveedores','compromisos','pagos_proveedores',
    'extras_salida','bitacora']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Perfiles: cada uno ve el suyo; los socios ven y administran todos
create policy perfiles_ver on public.perfiles for select using (id = auth.uid() or public.es_socio());
create policy perfiles_socio on public.perfiles for update using (public.es_socio()) with check (public.es_socio());
create policy autorizados_socio on public.usuarios_autorizados for all using (public.es_socio()) with check (public.es_socio());

-- Tablas comerciales: todo el personal puede ver, cargar y editar
do $$
declare t text;
begin
  foreach t in array array['pasajeros','pedidos','habitaciones','reservas','extensiones','aereos']
  loop
    execute format('create policy %1$s_ver on public.%1$I for select using (public.es_personal())', t);
    execute format('create policy %1$s_cargar on public.%1$I for insert with check (public.es_personal())', t);
    execute format('create policy %1$s_editar on public.%1$I for update using (public.es_personal()) with check (public.es_personal())', t);
    execute format('create policy %1$s_borrar on public.%1$I for delete using (public.es_socio())', t);
  end loop;
end $$;

-- Salidas grupales: todos las ven; solo socios las crean o modifican
create policy salidas_ver on public.salidas for select using (public.es_personal());
create policy salidas_socio on public.salidas for all using (public.es_socio()) with check (public.es_socio());

-- Cobros: todos ven y registran; solo un socio puede anular (nunca borrar)
create policy cobros_ver on public.cobros for select using (public.es_personal());
create policy cobros_cargar on public.cobros for insert with check (public.es_personal());
create policy cobros_anular on public.cobros for update using (public.es_socio()) with check (public.es_socio());

-- Un recibo emitido no se edita: solo se puede anular, con motivo, una vez
create or replace function public.solo_anular_cobro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.anulado is not null then raise exception 'El recibo ya está anulado'; end if;
  if new.anulado is null or coalesce(trim(new.motivo_anulacion), '') = '' then
    raise exception 'Para anular un recibo hay que indicar el motivo';
  end if;
  if (to_jsonb(new) - array['anulado','anulado_por','motivo_anulacion'])
     <> (to_jsonb(old) - array['anulado','anulado_por','motivo_anulacion']) then
    raise exception 'Un recibo emitido no se puede modificar, solo anular';
  end if;
  new.anulado := now();
  new.anulado_por := public.mi_nombre();
  return new;
end $$;
create trigger cobros_solo_anular before update on public.cobros
  for each row execute function public.solo_anular_cobro();

-- Turnos de caja: todos abren y cierran; reabrir el mismo día solo socios (ver trigger)
create policy turnos_ver on public.turnos_caja for select using (public.es_personal());
create policy turnos_abrir on public.turnos_caja for insert with check (public.es_personal());
create policy turnos_cerrar on public.turnos_caja for update using (public.es_personal() and estado = 'abierta') with check (public.es_personal());

create or replace function public.validar_turno() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.turnos_caja where caja = new.caja and fecha = new.fecha and estado = 'cerrada')
       and not public.es_socio() then
      raise exception 'Solo un socio puede reabrir una caja cerrada';
    end if;
    new.abierto_por := public.mi_nombre();
    new.abierto := now();
  elsif tg_op = 'UPDATE' then
    if old.estado = 'cerrada' then raise exception 'Un arqueo cerrado no se puede modificar'; end if;
    if new.estado = 'cerrada' then
      new.cerrado_por := public.mi_nombre();
      new.cerrado := now();
    end if;
  end if;
  return new;
end $$;
create trigger turnos_validar before insert or update on public.turnos_caja
  for each row execute function public.validar_turno();

-- Finanzas: solo socios
do $$
declare t text;
begin
  foreach t in array array['movimientos_caja','transferencias_caja','proveedores','compromisos',
    'pagos_proveedores','extras_salida','contadores_file']
  loop
    execute format('create policy %1$s_socio on public.%1$I for all using (public.es_socio()) with check (public.es_socio())', t);
  end loop;
end $$;

-- Bitácora: solo socios la leen; nadie la edita ni borra (no hay políticas de escritura)
create policy bitacora_ver on public.bitacora for select using (public.es_socio());

-- ---------------------------------------------------------------------
-- 7b. Acceso por la API: solo usuarios con sesión iniciada.
--     Los visitantes anónimos no reciben acceso a ninguna tabla.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ---------------------------------------------------------------------
-- 8. Personas autorizadas  ← REEMPLAZAR los emails por los reales
-- ---------------------------------------------------------------------
insert into public.usuarios_autorizados (email, nombre, rol, oficina) values
  ('hernan@CAMBIAR.com',  'Hernan Ruiz',     'socio',    null),
  ('diego@CAMBIAR.com',   'Diego Ruiz',      'socio',    null),
  ('adriel@CAMBIAR.com',  'Adriel Tuyarot',  'socio',    null),
  ('sandro@CAMBIAR.com',  'Sandro Cobas',    'socio',    null),
  ('romina@CAMBIAR.com',  'Romina',          'vendedor', null),
  ('gerardo@CAMBIAR.com', 'Gerardo',         'vendedor', null),
  ('juan@CAMBIAR.com',    'Juan',            'vendedor', null);
