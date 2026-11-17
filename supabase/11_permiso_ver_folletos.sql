-- Arreglo: no se podían subir folletos ni fotos de cotizaciones ("No tenés permiso").
-- El sistema sube con "x-upsert" (reemplaza si ya existe), y Supabase Storage exige
-- para eso también permiso de lectura (SELECT) sobre el archivo. Los buckets son públicos
-- para ver por link; esta regla sólo habilita al personal a leerlos desde la API.
drop policy if exists "folletos_ver" on storage.objects;
create policy "folletos_ver" on storage.objects for select to authenticated
  using (bucket_id = 'folletos' and public.es_personal());
drop policy if exists "cotizaciones_ver" on storage.objects;
create policy "cotizaciones_ver" on storage.objects for select to authenticated
  using (bucket_id = 'cotizaciones' and public.es_personal());
