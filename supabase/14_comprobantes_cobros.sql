-- 14: comprobantes de cobros (capturas o PDF de transferencias). Espacio privado "comprobantes",
-- carpeta = id del recibo. Ver / subir: personal. Borrar: solo socios.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;
create policy "comprobantes_ver" on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and public.es_personal());
create policy "comprobantes_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and public.es_personal());
create policy "comprobantes_reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'comprobantes' and public.es_personal())
  with check (bucket_id = 'comprobantes' and public.es_personal());
create policy "comprobantes_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'comprobantes' and public.es_socio());
