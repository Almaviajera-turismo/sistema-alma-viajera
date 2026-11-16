-- Comisiones de vendedores (aplicado el 16/11/2026).
-- Porcentaje sobre la ganancia de cada file, distinto por vendedor. Lo cargan y ven solo los socios.
create table public.comisiones_vendedor (
  id          uuid primary key default gen_random_uuid(),
  vendedor    text not null unique,
  porcentaje  numeric not null check (porcentaje >= 0 and porcentaje <= 100),
  creado      timestamptz not null default now(),
  extra       jsonb not null default '{}'::jsonb
);
-- Liquidación mensual por vendedor y moneda. El vendedor ve solo las suyas.
create table public.liquidaciones_comision (
  id          uuid primary key default gen_random_uuid(),
  vendedor    text not null,
  mes         text not null check (mes ~ '^\d{4}-\d{2}$'),
  moneda      text not null check (moneda in ('USD', 'ARS')),
  importe     numeric not null check (importe >= 0),
  detalle     jsonb not null default '[]'::jsonb,
  pagado      date,
  pagado_por  text,
  creado      timestamptz not null default now(),
  creado_por  text not null default public.mi_nombre(),
  extra       jsonb not null default '{}'::jsonb,
  unique (vendedor, mes, moneda)
);
alter table public.comisiones_vendedor enable row level security;
alter table public.liquidaciones_comision enable row level security;
create policy comisiones_socio on public.comisiones_vendedor for all using (public.es_socio()) with check (public.es_socio());
create policy liquidaciones_socio on public.liquidaciones_comision for all using (public.es_socio()) with check (public.es_socio());
create policy liquidaciones_vendedor_ver on public.liquidaciones_comision for select using (public.es_personal() and vendedor = public.mi_nombre());
grant select, insert, update, delete on public.comisiones_vendedor, public.liquidaciones_comision to authenticated;
create trigger bitacora_comisiones_vendedor after insert or update or delete on public.comisiones_vendedor
  for each row execute function public.registrar_bitacora();
create trigger bitacora_liquidaciones_comision after insert or update or delete on public.liquidaciones_comision
  for each row execute function public.registrar_bitacora();
