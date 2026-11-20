-- Nadie más que el dueño de la sección puede vaciar la tabla (TRUNCATE no respeta las reglas por fila)
revoke truncate, references, trigger on public.codigo_cotizaciones from authenticated, anon, public;
