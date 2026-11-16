-- Cuentas bancarias (BBVA) con saldo inicial; el resto del saldo se calcula con los
-- cobros, pagos y movimientos hechos por transferencia, depósito o tarjeta (aplicado el 16/11/2026).
create table public.cuentas_banco (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null unique,
  saldo_inicial_ars  numeric not null default 0,
  saldo_inicial_usd  numeric not null default 0,
  desde              date not null default current_date,
  creado             timestamptz not null default now(),
  extra              jsonb not null default '{}'::jsonb
);
alter table public.cuentas_banco enable row level security;
create policy cuentas_banco_socio on public.cuentas_banco for all using (public.es_socio()) with check (public.es_socio());
grant select, insert, update, delete on public.cuentas_banco to authenticated;
create trigger bitacora_cuentas_banco after insert or update or delete on public.cuentas_banco
  for each row execute function public.registrar_bitacora();
