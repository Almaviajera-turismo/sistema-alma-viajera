-- Folletos de salidas grupales (aplicado el 16/11/2026).
-- Columna "folleto" con la dirección de la imagen o PDF; espacio público "folletos".
-- Subir / reemplazar / borrar: solo socios.
alter table public.salidas add column if not exists folleto text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('folletos', 'folletos', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
create policy "folletos_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'folletos' and public.es_socio());
create policy "folletos_reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'folletos' and public.es_socio()) with check (bucket_id = 'folletos' and public.es_socio());
create policy "folletos_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'folletos' and public.es_socio());
