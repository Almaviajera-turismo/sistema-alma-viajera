-- Gastos de la agencia pagados por los socios de su bolsillo, y su reintegro (solo socios).
create table if not exists public.gastos_socios (
  id uuid primary key default gen_random_uuid(), fecha date, comprobante text, vencimiento date, descripcion text not null, categoria text,
  importe numeric(14,2) not null, moneda text not null default 'ARS', pagadores jsonb not null default '[]'::jsonb, notas text,
  registrado_por text, creado timestamptz not null default now(), extra jsonb not null default '{}'::jsonb);
create table if not exists public.reintegros_socios (
  id uuid primary key default gen_random_uuid(), gasto_id uuid not null references public.gastos_socios(id) on delete cascade,
  socio text not null, importe numeric(14,2) not null, moneda text not null default 'ARS', fecha date, origen text,
  tipo text not null default 'reintegro' check (tipo in ('reintegro','capital')), registrado_por text,
  registrado timestamptz not null default now(), extra jsonb not null default '{}'::jsonb);
alter table public.gastos_socios enable row level security;
alter table public.reintegros_socios enable row level security;
create policy gastos_socios_socio on public.gastos_socios for all using (es_socio()) with check (es_socio());
create policy reintegros_socios_socio on public.reintegros_socios for all using (es_socio()) with check (es_socio());
revoke all on public.gastos_socios, public.reintegros_socios from anon;
grant select, insert, update, delete on public.gastos_socios, public.reintegros_socios to authenticated;
create trigger bitacora_gastos_socios after insert or delete or update on public.gastos_socios for each row execute function registrar_bitacora();
create trigger bitacora_reintegros_socios after insert or delete or update on public.reintegros_socios for each row execute function registrar_bitacora();
