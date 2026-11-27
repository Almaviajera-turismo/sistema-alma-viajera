-- Agenda personal: cada uno ve sus tareas (las suyas y las que creó para otros);
-- los socios pueden ver y manejar también la agenda de los vendedores.
create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) between 1 and 300),
  notas text,
  fecha date,
  hora text,
  prioridad text not null default 'normal' check (prioridad in ('normal', 'urgente')),
  para text not null,
  creada_por text not null default '',
  vinculo jsonb not null default '{}'::jsonb,
  hecha timestamptz,
  hecha_por text,
  creado timestamptz not null default now(),
  extra jsonb not null default '{}'::jsonb
);
create index if not exists tareas_para on public.tareas (para, hecha, fecha);
create or replace function public.es_vendedor_nombre(p text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where nombre = p and rol = 'vendedor') $$;
create or replace function public.puede_ver_tarea(p_para text, p_creada text) returns boolean language sql stable security definer set search_path = public as $$
  select public.es_personal() and (p_para = public.mi_nombre() or p_creada = public.mi_nombre() or (public.es_socio() and public.es_vendedor_nombre(p_para))) $$;
revoke all on function public.es_vendedor_nombre(text), public.puede_ver_tarea(text, text) from public, anon;
grant execute on function public.es_vendedor_nombre(text), public.puede_ver_tarea(text, text) to authenticated;
create or replace function public.preparar_tarea() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.creada_por := coalesce(public.mi_nombre(), new.creada_por); new.creado := now(); end if;
  if tg_op = 'UPDATE' then new.creada_por := old.creada_por; new.creado := old.creado;
    if new.hecha is not null and old.hecha is null then new.hecha := now(); new.hecha_por := public.mi_nombre(); end if;
    if new.hecha is null then new.hecha_por := null; end if; end if;
  if not exists (select 1 from public.perfiles where nombre = new.para and activo) then raise exception 'La tarea tiene que ser para alguien del equipo'; end if;
  return new;
end $$;
drop trigger if exists tareas_preparar on public.tareas;
create trigger tareas_preparar before insert or update on public.tareas for each row execute function public.preparar_tarea();
alter table public.tareas enable row level security;
revoke all on public.tareas from anon, authenticated;
grant select, insert, update, delete on public.tareas to authenticated;
grant select on public.tareas to service_role;
create policy tareas_ver on public.tareas for select to authenticated using (public.puede_ver_tarea(para, creada_por));
create policy tareas_alta on public.tareas for insert to authenticated with check (public.es_personal());
create policy tareas_cambio on public.tareas for update to authenticated using (public.puede_ver_tarea(para, creada_por)) with check (public.puede_ver_tarea(para, creada_por));
create policy tareas_baja on public.tareas for delete to authenticated using (public.puede_ver_tarea(para, creada_por));

-- Mail diario (08:00 de Argentina = 11:00 UTC) con las tareas de cada uno; un solo envío por día.
create table if not exists public.agenda_envios (dia date primary key, enviado timestamptz not null default now());
alter table public.agenda_envios enable row level security;
grant select, insert on public.agenda_envios to service_role;
create or replace function public.agenda_del_dia() returns table (nombre text, email text, tareas jsonb)
language sql stable security definer set search_path = public, auth as $$
  select p.nombre, u.email::text, jsonb_agg(jsonb_build_object('titulo', t.titulo, 'fecha', t.fecha, 'hora', t.hora, 'prioridad', t.prioridad, 'creada_por', t.creada_por, 'vinculo', t.vinculo->>'label', 'notas', t.notas) order by t.fecha, t.hora nulls last)
  from public.perfiles p join auth.users u on u.id = p.id join public.tareas t on t.para = p.nombre
  where p.activo and t.hecha is null and t.fecha is not null and t.fecha <= (now() at time zone 'America/Argentina/Buenos_Aires')::date
  group by p.nombre, u.email $$;
revoke all on function public.agenda_del_dia() from public, anon, authenticated;
grant execute on function public.agenda_del_dia() to service_role;
select cron.schedule('agenda-diaria', '0 11 * * *', $$
  select net.http_post(url := 'https://kwybigrovltwbgvbngdx.supabase.co/functions/v1/agenda-diaria',
    headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb) $$);
