-- El servidor de avisos (aviso-cobro) solo puede leer cobros y perfiles y anotar qué cobros ya avisó.
grant select on public.perfiles to service_role;
grant select on public.cobros to service_role;
grant select, insert, delete on public.avisos_cobro to service_role;
