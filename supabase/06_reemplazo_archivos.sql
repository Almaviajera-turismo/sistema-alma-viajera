-- Reemplazo de archivos (aplicado el 16/11/2026, migración "reemplazo_archivos").
-- Folletos: socios y vendedores pueden subir/reemplazar (borrar: solo socios).
-- cambiar_folleto(): cambia el folleto de una salida y guarda el anterior en extra.folletos_anteriores.
-- bitacora_archivos: registra en la bitácora subida / reemplazo / borrado de fotos de pasaportes.
-- Los pasaportes reemplazados se guardan en <pasajero>/anteriores/ (no se borran).
drop policy if exists "folletos_subir" on storage.objects;
drop policy if exists "folletos_reemplazar" on storage.objects;
create policy "folletos_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'folletos' and public.es_personal());
create policy "folletos_reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'folletos' and public.es_personal())
  with check (bucket_id = 'folletos' and public.es_personal());
-- (funciones cambiar_folleto y bitacora_archivos + trigger en storage.objects: ver la migración en Supabase)
