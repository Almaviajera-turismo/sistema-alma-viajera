-- Aviso por mail a los socios cuando se registra o se anula un cobro.
-- La base llama (sin esperar) a la función «aviso-cobro», que envía el mail desde info@almaviajeraturismo.com.
create extension if not exists pg_net with schema extensions;

create table if not exists public.avisos_cobro (
  cobro_id uuid not null references public.cobros(id) on delete cascade,
  tipo     text not null check (tipo in ('nuevo','anulado')),
  enviado  timestamptz not null default now(),
  primary key (cobro_id, tipo)
);
alter table public.avisos_cobro enable row level security;   -- sin políticas: solo el servidor la usa

create or replace function public.avisar_cobro() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  if tg_op = 'INSERT' then t := 'nuevo';
  elsif new.anulado is not null and old.anulado is null then t := 'anulado';
  else return new; end if;
  perform net.http_post(
    url     := 'https://kwybigrovltwbgvbngdx.supabase.co/functions/v1/aviso-cobro',
    body    := jsonb_build_object('id', new.id, 'tipo', t),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 20000);
  return new;
exception when others then
  return new;   -- el aviso nunca impide registrar el cobro
end $$;
revoke all on function public.avisar_cobro() from public, anon, authenticated;

drop trigger if exists aviso_cobro_mail on public.cobros;
create trigger aviso_cobro_mail after insert or update of anulado on public.cobros
  for each row execute function public.avisar_cobro();
