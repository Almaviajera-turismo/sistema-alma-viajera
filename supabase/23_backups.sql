-- Backup diario de todos los datos del sistema (tablas públicas) dentro de la base, últimos 30 días.
-- Se descarga desde el sistema (Finanzas → Backups, solo socios).
create extension if not exists pg_cron;
create table if not exists public.backups (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  origen text not null default 'automático',
  tablas int not null default 0,
  registros int not null default 0,
  bytes int not null default 0,
  datos jsonb not null
);
alter table public.backups enable row level security;
revoke all on public.backups from anon, authenticated;
grant select on public.backups to authenticated;
create policy backups_ver on public.backups for select to authenticated using (public.es_hernan());   -- incluye la sección Código: solo Hernan

create or replace function public.hacer_backup(p_origen text default 'automático')
returns jsonb language plpgsql security definer set search_path = public as $$
declare t record; d jsonb := '{}'::jsonb; filas jsonb; n int := 0; nt int := 0; r jsonb;
begin
  if auth.uid() is not null and not public.es_hernan() then raise exception 'Solo Hernan puede hacer un backup'; end if;
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('backups', 'avisos_cobro') order by tablename loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t.tablename) into filas;
    d := d || jsonb_build_object(t.tablename, filas);
    n := n + jsonb_array_length(filas); nt := nt + 1;
  end loop;
  d := jsonb_build_object('sistema', 'Alma Viajera Turismo', 'generado', now(), 'tablas', d);
  insert into public.backups(origen, tablas, registros, bytes, datos)
    values (case when auth.uid() is null then p_origen else 'manual · ' || coalesce(public.mi_nombre(), '') end, nt, n, length(d::text), d);
  delete from public.backups where id not in (select id from public.backups order by creado desc limit 30);
  select jsonb_build_object('ok', true, 'tablas', nt, 'registros', n) into r; return r;
end $$;
revoke all on function public.hacer_backup(text) from public, anon;
grant execute on function public.hacer_backup(text) to authenticated;

-- 03:00 de Argentina = 06:00 UTC. A las 04:00 se controla: si no hubo backup, aviso a los socios.
select cron.schedule('backup-diario', '0 6 * * *', $$select public.hacer_backup('automático')$$);
select cron.schedule('backup-control', '0 7 * * *', $$
  select net.http_post(url := 'https://kwybigrovltwbgvbngdx.supabase.co/functions/v1/aviso-cobro',
    headers := '{"Content-Type":"application/json"}'::jsonb, body := '{"alerta":"backup"}'::jsonb)
  where not exists (select 1 from public.backups where creado > now() - interval '20 hours')
$$);
