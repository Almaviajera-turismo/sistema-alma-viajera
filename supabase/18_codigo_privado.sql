-- Sección privada («Código»): cotizaciones de otro proveedor. Solo el usuario de Hernan puede leer o escribir.
create or replace function public.es_hernan() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = 'a089eaad-2dd1-4bc4-bc11-39f6a960fe3c'::uuid
$$;
revoke all on function public.es_hernan() from public, anon;
grant execute on function public.es_hernan() to authenticated;
create table if not exists public.codigo_cotizaciones (
  id uuid primary key default gen_random_uuid(), creado timestamptz not null default now(), actualizado timestamptz not null default now(),
  proveedor text, cliente text, contacto text, destino text, salida date, regreso date, pasajeros int,
  costo numeric(14,2), venta numeric(14,2), moneda text default 'USD', estado text default 'Pendiente', notas text,
  adjuntos jsonb not null default '[]'::jsonb, extra jsonb not null default '{}'::jsonb);
alter table public.codigo_cotizaciones enable row level security;
create policy codigo_solo_hernan on public.codigo_cotizaciones for all to authenticated using (public.es_hernan()) with check (public.es_hernan());
revoke all on public.codigo_cotizaciones from anon;
grant select, insert, update, delete on public.codigo_cotizaciones to authenticated;
insert into storage.buckets (id, name, public) values ('codigo', 'codigo', false) on conflict (id) do nothing;
create policy codigo_archivos_hernan on storage.objects for all to authenticated
  using (bucket_id = 'codigo' and public.es_hernan()) with check (bucket_id = 'codigo' and public.es_hernan());
