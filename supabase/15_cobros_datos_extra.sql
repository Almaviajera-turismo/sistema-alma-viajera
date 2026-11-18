-- 15: un recibo emitido sigue sin poder modificarse, salvo los datos administrativos
-- (columna extra: destino del dinero, fecha de acreditación), que un socio puede completar después.
create or replace function public.solo_anular_cobro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.anulado is null and new.anulado is null
     and (to_jsonb(new) - 'extra') = (to_jsonb(old) - 'extra') then
    return new;
  end if;
  if old.anulado is not null then raise exception 'El recibo ya está anulado'; end if;
  if new.anulado is null or coalesce(trim(new.motivo_anulacion), '') = '' then
    raise exception 'Para anular un recibo hay que indicar el motivo';
  end if;
  if (to_jsonb(new) - array['anulado','anulado_por','motivo_anulacion','extra'])
     <> (to_jsonb(old) - array['anulado','anulado_por','motivo_anulacion','extra']) then
    raise exception 'Un recibo emitido no se puede modificar, solo anular';
  end if;
  new.anulado := now();
  new.anulado_por := public.mi_nombre();
  return new;
end $$;
revoke execute on function public.solo_anular_cobro() from public, anon, authenticated;
