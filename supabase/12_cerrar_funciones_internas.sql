-- 12: cerrar funciones internas (advisors de seguridad de Supabase)
-- Las funciones de trigger no se pueden llamar directo; los triggers siguen funcionando.
revoke execute on function public.asignar_file_salida() from public, anon, authenticated;
revoke execute on function public.bitacora_archivos() from public, anon, authenticated;
revoke execute on function public.crear_perfil_al_registrarse() from public, anon, authenticated;
revoke execute on function public.preparar_cobro() from public, anon, authenticated;
revoke execute on function public.preparar_reserva() from public, anon, authenticated;
revoke execute on function public.registrar_bitacora() from public, anon, authenticated;
revoke execute on function public.registrar_bitacora_autorizados() from public, anon, authenticated;
revoke execute on function public.solo_anular_cobro() from public, anon, authenticated;
revoke execute on function public.validar_pago_proveedor() from public, anon, authenticated;
revoke execute on function public.validar_turno() from public, anon, authenticated;

-- Funciones que usa el sistema: solo con sesión iniciada
revoke execute on function public.caja_abierta(text) from public, anon;
revoke execute on function public.proximo_file(text, date) from public, anon;
revoke execute on function public.total_reserva(uuid) from public, anon;
revoke execute on function public.cobrado_reserva(uuid) from public, anon;
grant execute on function public.caja_abierta(text), public.proximo_file(text, date),
  public.total_reserva(uuid), public.cobrado_reserva(uuid) to authenticated;

-- es_personal / es_socio / mi_nombre / mi_rol quedan abiertas a propósito:
-- las usan las reglas de acceso y sin sesión responden "no".

alter function public.asignar_file_salida() set search_path = public;
alter function public.total_reserva(uuid) set search_path = public;
alter function public.cobrado_reserva(uuid) set search_path = public;
