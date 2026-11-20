-- Sistema aparte (codigo.html): neto del paquete, comisión de Martín y ganancia.
alter table public.codigo_cotizaciones rename column costo to neto;
alter table public.codigo_cotizaciones add column if not exists comision_pct numeric(6,2);
alter table public.codigo_cotizaciones add column if not exists comision_base text not null default 'venta';
alter table public.codigo_cotizaciones add column if not exists paquete text;
