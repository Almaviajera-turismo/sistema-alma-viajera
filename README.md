# Sistema de gestión · Alma Viajera Turismo

Sistema online de la agencia: pedidos, salidas grupales, viajes individuales, aéreos,
pasajeros, reservas, cobros y recibos, caja (Centro y Gaona), proveedores, informes y bitácora.

- **Ingreso:** https://almaviajera-turismo.github.io/sistema-alma-viajera/
- **Datos:** Supabase (proyecto `kwybigrovltwbgvbngdx`). Cada persona entra con su email y contraseña;
  los permisos (socio / vendedor) los controla el servidor.

## Archivos
- `index.html` — el sistema publicado.
- `supabase/*.sql` — estructura de la base (ya aplicadas). La cotización de cada pedido se guarda en `pedidos.extra -> quote` y sus fotos en el espacio público `cotizaciones`.
- `cotizador/` — logo, fondos y tipografía del flyer de cotización (botón «Cotizar» en Pedidos).
- `fuente/` — base original (v32) y el script que arma `index.html`:
  `python3 fuente/build.py fuente/Alma_Viajera_Sistema_v32.html index.html`
- `fuente/src/tema.css` y `fuente/tema.py` — apariencia (colores, menú con íconos, tablas, ventanas). Solo estética.

## Agregar un usuario
1. Supabase → SQL Editor:
   `insert into public.usuarios_autorizados (email, nombre, rol, oficina) values ('email@almaviajeraturismo.com', 'Nombre Apellido', 'vendedor', 'centro');`
   (rol: `socio` o `vendedor`; oficina: `centro`, `gaona` o `null`)
2. Supabase → Authentication → Users → Add user → Create new user (tildar *Auto Confirm User*).
