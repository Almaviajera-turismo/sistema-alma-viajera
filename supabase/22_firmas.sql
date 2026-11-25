-- Firmas digitalizadas (imagen PNG) de socios y vendedores, para los recibos de cobro.
create table if not exists public.firmas (
  nombre text primary key,
  imagen text not null check (imagen like 'data:image/png;base64,%' and length(imagen) < 1500000),
  actualizado timestamptz not null default now(),
  actualizado_por text
);
alter table public.firmas enable row level security;
revoke all on public.firmas from anon, authenticated;
grant select, insert, update, delete on public.firmas to authenticated;
create policy firmas_ver on public.firmas for select to authenticated using (public.es_personal());
create policy firmas_alta on public.firmas for insert to authenticated with check (public.es_socio() or nombre = public.mi_nombre());
create policy firmas_cambio on public.firmas for update to authenticated using (public.es_socio() or nombre = public.mi_nombre()) with check (public.es_socio() or nombre = public.mi_nombre());
create policy firmas_baja on public.firmas for delete to authenticated using (public.es_socio() or nombre = public.mi_nombre());
