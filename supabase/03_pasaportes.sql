-- Fotos de pasaportes: espacio privado (bucket "pasaportes").
-- Cada archivo se guarda como <id del pasajero>/<nombre>.
-- Ver / subir / reemplazar: personal de la agencia. Borrar: solo socios.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pasaportes', 'pasaportes', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;

create policy "pasaportes_ver" on storage.objects for select to authenticated
  using (bucket_id = 'pasaportes' and public.es_personal());
create policy "pasaportes_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'pasaportes' and public.es_personal());
create policy "pasaportes_reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'pasaportes' and public.es_personal())
  with check (bucket_id = 'pasaportes' and public.es_personal());
create policy "pasaportes_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'pasaportes' and public.es_socio());
