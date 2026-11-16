-- Fotos de las cotizaciones (destino y hotel) para el flyer (aplicado el 16/11/2026).
-- Espacio público "cotizaciones" (solo fotos de destinos/hoteles, nada personal).
-- Subir / reemplazar: todo el personal. Borrar: solo socios.
-- Los datos de la cotización se guardan en pedidos.extra -> 'quote'.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cotizaciones', 'cotizaciones', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "cotizaciones_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'cotizaciones' and public.es_personal());
create policy "cotizaciones_reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'cotizaciones' and public.es_personal())
  with check (bucket_id = 'cotizaciones' and public.es_personal());
create policy "cotizaciones_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'cotizaciones' and public.es_socio());
