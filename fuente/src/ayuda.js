/* Alma Viajera · Guía de ayuda (botón "? Ayuda")
   Para agregar o corregir una explicación, editá la lista AYUDA.
   - pantallas: en qué pantallas aparece primero (ids de página: inicio, pedidos, grupales,
     individuales, aereos, pasajeros, reservas, cobros, tesoreria, caja, cajaoperativa,
     proveedores, informes, bitacora)
   - socios: true = sólo lo pueden hacer los socios (los vendedores no lo ven en la guía) */
(() => {
'use strict';
const AYUDA = [
  /* ---------------- General ---------------- */
  { tema: 'General', titulo: 'Ingresar, salir y cambiar la contraseña', pantallas: ['inicio'],
    claves: 'login clave usuario email entrar sesion cerrar olvide',
    pasos: [
      'Entrá con tu email de la agencia (nombre@almaviajeraturismo.com) y tu contraseña. El email queda recordado en cada dispositivo.',
      'Para cambiar la contraseña andá al <b>Inicio</b> y tocá <b>Contraseña</b> (arriba, al lado de tu nombre). Mínimo 8 caracteres.',
      'Para salir tocá <b>Salir</b>. Por seguridad, si no usás el sistema durante 1 hora la sesión se cierra sola.',
    ],
    nota: '¿Te olvidaste la contraseña? Pedile a Hernán que te la restablezca.' },
  { tema: 'General', titulo: 'Moverse por el sistema (Volver, Inicio y el menú)', pantallas: ['inicio'],
    claves: 'navegar menu volver atras pantalla principal actualizar guardado',
    pasos: [
      'Usá el menú (a la izquierda en la computadora, abajo en el celular) para ir a cada sección.',
      '<b>← Volver</b> te lleva a la pantalla anterior; <b>⌂ Inicio</b> te lleva directo a la pantalla principal. Los dos aparecen arriba y en cada ventana.',
      'Todo se guarda solo: arriba ves <b>✓ Guardado</b>. Si dice <b>Guardando…</b> esperá un momento antes de cerrar.',
      'Lo que cargan los demás (Centro y Gaona) se actualiza cada minuto. Para verlo ya, tocá <b>↻</b>.',
    ] },

  /* ---------------- Pedidos ---------------- */
  { tema: 'Pedidos', titulo: 'Anotar un pedido que llegó por WhatsApp', pantallas: ['pedidos', 'inicio'],
    claves: 'consulta cotizacion whatsapp nuevo pedido cliente presupuesto',
    pasos: [
      'Andá a <b>Pedidos recibidos</b> y tocá <b>+ Nuevo pedido</b> (o desde el Inicio: <b>Anotar pedido recibido</b>).',
      'Completá cliente, WhatsApp, tipo de viaje (individual o grupal; si es grupal elegí la salida), destino, fecha deseada y cantidad de pasajeros.',
      'En <b>¿Qué te pidió exactamente?</b> anotá el detalle: hotel, régimen, edades, presupuesto, desde dónde sale, etc.',
      'Tocá <b>Guardar pedido</b>. Queda en estado <b>Pendiente</b>.',
    ] },
  { tema: 'Pedidos', titulo: 'Pegar un WhatsApp para armar el pedido o la cotización', pantallas: ['pedidos', 'inicio'],
    claves: 'pegar whatsapp mensaje copiar automatico armar completar cotizacion',
    pasos: [
      'En WhatsApp mantené apretado el mensaje (o seleccioná varios) y tocá <b>Copiar</b>.',
      'En el sistema abrí <b>+ Nuevo pedido</b> (o <b>🖼 Cotizar</b> en el pedido) y tocá el botón verde <b>💬 Pegar WhatsApp</b>.',
      'Pegá el texto y tocá <b>Armar</b>. Se completan solos cliente, teléfono, destino, fechas y pasajeros; en la cotización también hotel, régimen, vuelos, qué incluye y precio.',
      'Revisá el recuadro verde: dice qué completó y qué falta. Corregí lo necesario y guardá.',
    ],
    nota: 'Funciona sin internet extra ni costo: reconoce patrones conocidos. Si algo no lo detecta, completalo a mano.' },
  { tema: 'Pedidos', titulo: 'Cambiar el estado de un pedido o corregirlo', pantallas: ['pedidos'],
    claves: 'estado editar pedido cotizacion enviada aceptada cancelado seguimiento',
    pasos: [
      'En <b>Pedidos recibidos</b>, en la columna <b>Estado / siguiente paso</b>, elegí el estado nuevo: En preparación, Cotización enviada, Cotización aceptada, Confirmado o Cancelado.',
      'Para corregir datos tocá <b>✎ Editar pedido</b> debajo del nombre del cliente y después <b>Guardar cambios</b>. Así no se duplica.',
      'Usá el buscador para encontrar un pedido por cliente o destino.',
    ] },
  { tema: 'Pedidos', titulo: 'El cliente aceptó: pasar el pedido a reserva', pantallas: ['pedidos', 'individuales'],
    claves: 'acepto aceptada reserva confirmar viaje individual crear',
    pasos: [
      '<b>Viaje individual:</b> tocá <b>✓ Confirmar pedido</b> (o cambiá el estado a <b>Confirmado</b>) y aceptá el aviso. Se abre solo el viaje individual con los datos de la cotización; revisá fechas, hotel, precio total y operador, y tocá <b>Guardar viaje individual</b>. Desde ese momento aparece en <b>Viajes individuales</b> y en <b>Reservas</b>. Si cerraste la ventana, usá el botón <b>Pasar a viajes individuales</b> del pedido.',
      '<b>Salida grupal:</b> inscribí al pasajero en la salida (ver «Inscribir un pasajero en una salida grupal»).',
      'Después registrá la seña desde <b>Cobros y recibos</b>.',
    ] },

  /* ---------------- Salidas grupales ---------------- */
  { tema: 'Salidas grupales', titulo: 'Crear una salida grupal', pantallas: ['grupales'], socios: true,
    claves: 'nueva salida grupo paquete file cupos',
    pasos: [
      'Andá a <b>Salidas grupales</b> y tocá <b>+ Nueva salida</b>.',
      'Completá nombre, destino, fechas de salida y regreso, precio del paquete por pasajero, moneda, cupos y el programa con los servicios incluidos.',
      'Tocá <b>Guardar salida</b>. El número de file se asigna solo.',
    ] },
  { tema: 'Salidas grupales', titulo: 'Inscribir un pasajero en una salida grupal', pantallas: ['grupales', 'reservas'],
    claves: 'inscribir agregar pasajero grupo salida reserva',
    pasos: [
      'En <b>Salidas grupales</b> tocá <b>Abrir salida</b> en la salida que corresponde, y después <b>+ Inscribir pasajero</b>. (También desde <b>Reservas → + Inscribir al grupo</b>.)',
      'Si el pasajero ya está cargado, elegilo en <b>Pasajero ya registrado</b>; si no, escribí su nombre y se crea la ficha.',
      'Revisá el precio (es el del paquete) y tocá <b>Inscribir pasajero</b>. Se crea su cuenta para esa salida.',
    ],
    nota: 'Cada pasajero tiene una cuenta separada por cada viaje: los pagos de una salida no se mezclan con otra.' },
  { tema: 'Salidas grupales', titulo: 'Armar el rooming y descargar los Excel', pantallas: ['grupales'],
    claves: 'rooming habitaciones excel lista pasajeros descargar compartir',
    pasos: [
      'Abrí la salida y entrá a la pestaña <b>Rooming · Habitaciones</b>.',
      'Tocá <b>+ Agregar habitación</b>, poné un identificador (ej. «Hab. 1 – Pérez»), el tipo y la capacidad.',
      'En la lista elegí, para cada pasajero, en qué habitación va.',
      'Para mandarle al operador usá <b>↓ Excel pasajeros</b> o <b>↓ Excel rooming</b>.',
    ] },
  { tema: 'Salidas grupales', titulo: 'Agregar una extensión a un pasajero del grupo', pantallas: ['grupales', 'reservas'],
    claves: 'extension noches extra adicional pasajero grupo',
    pasos: [
      'Abrí la salida (o andá a <b>Reservas</b>) y en la fila del pasajero tocá <b>Extensión</b> / <b>+ Extensión</b>.',
      'Completá el nombre de la extensión, las fechas y el costo adicional.',
      'Tocá <b>Guardar extensión</b>. Se suma sólo a la cuenta de ese pasajero; los demás mantienen su precio.',
    ] },
  { tema: 'Salidas grupales', titulo: 'Dar de baja, cerrar o reabrir la cuenta de un pasajero', pantallas: ['grupales', 'reservas'], socios: true,
    claves: 'baja cancelar pasajero cerrar cuenta reabrir',
    pasos: [
      'Abrí la salida y buscá al pasajero.',
      '<b>Cerrar cuenta</b>: sólo se puede con saldo en cero.',
      '<b>Dar de baja</b>: lo saca de la salida; la cuenta y los recibos quedan en el historial.',
      '<b>Reabrir cuenta</b>: para volver a cargar pagos o cambios en una cuenta cerrada.',
    ] },
  { tema: 'Salidas grupales', titulo: 'Ver la cuenta económica de una salida', pantallas: ['grupales', 'tesoreria'], socios: true,
    claves: 'cuenta salida costos operador ganancia resultado finanzas grupo',
    pasos: [
      'Abrí la salida y tocá <b>▤ Cuenta de la salida</b>.',
      'Ahí ves lo vendido, lo cobrado, lo comprometido con operadores y lo pagado.',
      'Podés agregar <b>+ Compromiso / costo de operador</b>, <b>+ Pago a operador</b> o <b>+ Agregar extra previsto</b>, y bajar el <b>↓ Excel de la cuenta</b>.',
    ] },

  /* ---------------- Viajes individuales y aéreos ---------------- */
  { tema: 'Viajes individuales', titulo: 'Crear un viaje individual', pantallas: ['individuales'],
    claves: 'individual a medida reserva crear viaje hotel operador',
    pasos: [
      'Si el cliente todavía está pidiendo precio, anotalo como pedido. Cuando lo confirma, cambiá el pedido a <b>Confirmado</b> y pasa solo a <b>Viajes individuales</b>.',
      'Completá titular, destino, fechas (las noches se calculan solas), transporte, hotel, habitación, régimen, precio total, moneda y operador.',
      'Tocá <b>Guardar viaje individual</b>. Se crea la cuenta del pasajero con su número de file.',
    ] },
  { tema: 'Aéreos', titulo: 'Registrar una venta de aéreo', pantallas: ['aereos'],
    claves: 'aereo vuelo pasaje boleto emitido localizador neto margen',
    pasos: [
      'Andá a <b>Aéreos</b> y tocá <b>+ Registrar aéreo</b>.',
      'Completá pasajero, destino, fecha del vuelo, operador, neto y precio vendido.',
      'Elegí el estado (Solicitado, Cotizado, Vendido, Emitido) y, si ya está, el localizador.',
      'Tocá <b>Guardar aéreo</b>. El margen (vendido − neto) se calcula solo.',
    ],
    nota: 'Para cobrar un aéreo usá Cobros y recibos → tipo de operación «Solo aéreo».' },

  /* ---------------- Pasajeros ---------------- */
  { tema: 'Pasajeros', titulo: 'Dar de alta un pasajero (con su pasaporte)', pantallas: ['pasajeros'],
    claves: 'nuevo pasajero alta ficha cliente agregar pasaporte dni foto',
    pasos: [
      'Andá a <b>Base de pasajeros</b> y tocá <b>+ Agregar pasajero</b>.',
      'Completá nombre y apellido (tal cual figura en el pasaporte), teléfono, email, DNI y los datos del pasaporte.',
      'Abajo, en <b>Foto del pasaporte</b>, tocá <b>📷 Sacar foto o elegir archivo</b> para adjuntar la página de los datos (foto o PDF).',
      'Tocá <b>Guardar ficha</b>.',
    ],
    nota: 'No puede haber dos pasajeros con el mismo nombre. Si te avisa, buscalo: seguramente ya está cargado.' },
  { tema: 'Pasajeros', titulo: 'Buscar un pasajero y ver o corregir su ficha', pantallas: ['pasajeros'],
    claves: 'buscar ficha editar telefono email corregir datos viajes historial',
    pasos: [
      'En <b>Base de pasajeros</b> escribí en el buscador el nombre, teléfono, DNI o número de pasaporte.',
      'Tocá <b>Ver ficha</b>: ves sus datos, el pasaporte y todos sus viajes con el saldo de cada uno.',
      'Para cambiar algo tocá <b>Editar ficha</b> y después <b>Guardar ficha</b>.',
    ] },
  { tema: 'Pasajeros', titulo: 'Ver, subir o descargar la foto del pasaporte', pantallas: ['pasajeros'],
    claves: 'foto pasaporte imagen pdf descargar ver subir adjuntar documento',
    pasos: [
      'En <b>Base de pasajeros</b> tocá <b>Ver ficha</b> del pasajero.',
      'En la sección <b>Pasaporte (foto o PDF)</b>: <b>Ver</b> lo abre, <b>Descargar</b> lo guarda en tu dispositivo.',
      'Para agregar uno tocá <b>+ Subir archivo</b>. Las fotos grandes se achican solas.',
      'En la lista, los que ya tienen foto muestran «📎 Foto del pasaporte».',
    ],
    nota: 'Borrar un archivo sólo lo pueden hacer los socios.' },
  { tema: 'Pasajeros', titulo: 'Pasaporte vencido o por vencer', pantallas: ['pasajeros'],
    claves: 'vencido vencimiento renovar pasaporte nuevo rojo',
    pasos: [
      'En la lista de pasajeros, el vencimiento aparece en <b>rojo</b> con la palabra «vencido» cuando ya no sirve.',
      'Cuando el pasajero renueva, entrá a <b>Ver ficha → Editar ficha</b>, cargá el número, emisión y vencimiento nuevos, adjuntá la foto y guardá.',
    ] },
  { tema: 'Pasajeros', titulo: 'Cargar muchas fotos de pasaporte juntas', pantallas: ['pasajeros'], socios: true,
    claves: 'carga masiva fotos pasaportes varios archivos',
    pasos: [
      'Desde la computadora, nombrá cada archivo con el número de pasaporte o el DNI del pasajero (ej. AAJ522098.jpg).',
      'En <b>Base de pasajeros</b> tocá <b>Carga masiva de pasaportes</b> → <b>Elegir archivos</b> y seleccioná todos.',
      'Revisá a qué pasajero corresponde cada uno y tocá <b>Subir</b>.',
    ] },

  /* ---------------- Reservas y cobros ---------------- */
  { tema: 'Reservas', titulo: 'Ver cuánto pagó y cuánto debe un pasajero', pantallas: ['reservas', 'grupales'],
    claves: 'saldo deuda debe pagado cuenta reserva abonado',
    pasos: [
      'Andá a <b>Reservas</b>: en cada fila ves el total, lo abonado y el <b>Saldo</b>.',
      'Para ver el detalle con todos los recibos: en la ficha del pasajero tocá <b>Abrir cuenta</b> en ese viaje, o dentro de la salida grupal tocá <b>Ver cuenta individual</b>.',
      'Con <b>Tomar seguimiento</b> quedás vos como responsable de esa reserva.',
    ] },
  { tema: 'Reservas', titulo: 'Corregir una reserva', pantallas: ['reservas', 'grupales'],
    claves: 'editar reserva cambiar fecha hotel operador localizador',
    pasos: [
      'En <b>Reservas</b> (o dentro de la salida) tocá <b>✎ Editar reserva</b>.',
      'Cambiá lo que haga falta y tocá <b>Guardar cambios</b>. Los recibos ya emitidos no se modifican.',
      'El nombre y el documento se corrigen desde la ficha del pasajero.',
    ],
    nota: 'Los cambios de importes, fechas o servicios sensibles los hacen los socios. Si la cuenta está cerrada, primero un socio tiene que reabrirla.' },
  { tema: 'Cobros', titulo: 'Registrar un cobro y emitir el recibo', pantallas: ['cobros', 'reservas', 'inicio'],
    claves: 'cobrar pago seña recibo cobro efectivo transferencia tarjeta registrar',
    pasos: [
      'Andá a <b>Cobros y recibos → + Registrar cobro</b> (o tocá <b>Cobrar</b> en la reserva del pasajero).',
      'Elegí el tipo de operación (salida grupal, viaje individual o solo aéreo) y la cuenta del pasajero. Si todavía no tiene cuenta, elegí <b>Pasajero nuevo / cuenta nueva</b>.',
      'Elegí la oficina (Centro o Gaona), el importe, la fecha y el medio de pago.',
      'Tocá <b>Guardar y ver recibo</b>. El número y el concepto (Seña, A cuenta o Saldo) se ponen solos.',
    ],
    nota: 'Los cobros en efectivo necesitan la caja de esa oficina abierta hoy.' },
  { tema: 'Cobros', titulo: 'Imprimir o mandar un recibo por email', pantallas: ['cobros', 'reservas'],
    claves: 'imprimir pdf mail email enviar recibo comprobante',
    pasos: [
      'En <b>Cobros y recibos</b> tocá <b>Ver / imprimir</b> (o desde la cuenta del pasajero: <b>Ver recibo</b>).',
      '<b>🖨 Imprimir / guardar PDF</b>: en la ventana de impresión elegí la impresora o «Guardar como PDF».',
      '<b>✉ Preparar correo</b>: se abre un borrador en tu correo con el mensaje armado. Adjuntá el PDF antes de enviarlo.',
    ] },
  { tema: 'Cobros', titulo: 'Anular un recibo', pantallas: ['cobros'], socios: true,
    claves: 'anular recibo error cobro mal cargado devolver',
    pasos: [
      'En <b>Cobros y recibos</b> buscá el recibo y tocá <b>Anular recibo</b>.',
      'Escribí el motivo (obligatorio).',
      'El recibo queda marcado como ANULADO y el saldo del pasajero se recalcula.',
    ],
    nota: 'Si fue en efectivo, la caja tiene que estar abierta hoy y el día del cobro no puede estar cerrado.' },

  /* ---------------- Caja ---------------- */
  { tema: 'Caja', titulo: 'Abrir la caja del día', pantallas: ['cajaoperativa', 'caja', 'inicio'],
    claves: 'abrir caja apertura efectivo inicial mañana',
    pasos: [
      'Vendedores: desde el Inicio tocá <b>Caja operativa</b>. Socios: <b>Finanzas → Caja</b>.',
      'Tocá <b>+ Abrir caja</b> y elegí la oficina.',
      'Contá el efectivo y confirmá los importes en pesos y en dólares (te propone lo que quedó en el último cierre).',
      'Tocá <b>Confirmar apertura</b>.',
    ] },
  { tema: 'Caja', titulo: 'Cerrar la caja (arqueo)', pantallas: ['cajaoperativa', 'caja'],
    claves: 'cerrar caja cierre arqueo contar billetes noche fin del dia',
    pasos: [
      'Tocá <b>Cerrar caja</b> y elegí la oficina. Te muestra cuánto efectivo debería haber.',
      'Contá los billetes y cargá el efectivo <b>CONTADO</b> en pesos y en dólares.',
      'Tocá <b>Confirmar cierre</b>. Si hay diferencia, queda registrada.',
    ],
    nota: 'Si entra un pago después del cierre, un socio puede abrir otro turno indicando el motivo.' },
  { tema: 'Caja', titulo: 'Registrar un gasto o ingreso de la oficina', pantallas: ['caja'], socios: true,
    claves: 'gasto ingreso retiro alquiler sueldo servicios movimiento caja chica',
    pasos: [
      'Andá a <b>Finanzas → Caja → + Registrar movimiento</b>.',
      'Elegí oficina, si es ingreso, gasto o retiro, la categoría, moneda, importe y medio.',
      'Escribí el motivo y tocá <b>Guardar movimiento</b>.',
    ],
    nota: 'No cargues acá los cobros a pasajeros (van en Cobros) ni los pagos a operadores (van en Proveedores): ya aparecen solos en la caja.' },
  { tema: 'Caja', titulo: 'Pasar efectivo entre Centro y Gaona', pantallas: ['caja', 'tesoreria'], socios: true,
    claves: 'transferir transferencia entre cajas mover plata oficinas',
    pasos: [
      'Tocá <b>Transferir entre cajas</b>.',
      'Elegí desde qué oficina, hacia cuál, la moneda y el importe.',
      'Tocá <b>Guardar transferencia</b>. Sale de una caja y entra en la otra.',
    ] },

  /* ---------------- Proveedores ---------------- */
  { tema: 'Proveedores', titulo: 'Cargar un proveedor u operador', pantallas: ['proveedores'], socios: true,
    claves: 'proveedor operador mayorista hotel nuevo',
    pasos: [
      'Andá a <b>Finanzas → Proveedores → + Nuevo proveedor</b>.',
      'Completá nombre, categoría, contacto, teléfono, email y CUIT.',
      'Tocá <b>Guardar proveedor</b>.',
    ] },
  { tema: 'Proveedores', titulo: 'Anotar lo que le debemos a un operador y pagarle', pantallas: ['proveedores', 'tesoreria'], socios: true,
    claves: 'deuda compromiso pagar operador proveedor pago vencimiento',
    pasos: [
      'Primero la deuda: <b>+ Registrar compromiso</b>. Elegí el proveedor y después el <b>file propio</b> (arriba aparecen los files de ese proveedor), cargá el <b>localizador del proveedor</b>, el concepto, el importe y los vencimientos de <b>seña</b> y de <b>saldo</b>. (Esto todavía no descuenta plata.)',
      'Cuando pagás la seña, el aviso de seña desaparece y queda solo el vencimiento del saldo. Cuando se paga el total, el compromiso queda <b>Saldado · cerrado</b>.',
      'Cuando pagás: <b>+ Registrar pago</b>, elegí el compromiso, la oficina, el monto y el medio.',
      'Tocá <b>Revisar pago</b>, escribí <b>PAGAR</b> y confirmá. El egreso aparece solo en la caja.',
    ],
    nota: 'Si el pago es en efectivo, la caja tiene que estar abierta y tener dinero suficiente en esa moneda.' },

  /* ---------------- Informes y bitácora ---------------- */
  { tema: 'Informes', titulo: 'Sacar el informe semanal o mensual', pantallas: ['informes'], socios: true,
    claves: 'informe reporte semana mes imprimir pdf',
    pasos: [
      'Andá a <b>Finanzas → Informes</b>.',
      'Elegí el período (semanal o mensual) y la fecha de referencia.',
      'Para guardarlo tocá <b>🖨 Imprimir / Guardar PDF del informe</b>.',
    ] },
  { tema: 'Bitácora', titulo: 'Ver quién hizo cada cambio', pantallas: ['bitacora'], socios: true,
    claves: 'bitacora historial quien modifico borro auditoria',
    pasos: [
      'Andá a <b>Bitácora</b>.',
      'Ves cada alta, cambio y baja con la fecha, la hora y el usuario que lo hizo.',
      'Nadie puede editar ni borrar estos registros.',
    ] },
  { tema: 'General', titulo: 'Agregar un usuario nuevo o restablecer una contraseña', pantallas: ['inicio'], socios: true,
    claves: 'usuario nuevo vendedor alta acceso contraseña olvido restablecer',
    pasos: [
      'Pasale a Hernán el nombre, email de la agencia y oficina de la persona.',
      'Se le crea el usuario con una clave temporal, que después cambia desde <b>Contraseña</b> en el Inicio.',
    ] },
];

const $ = id => document.getElementById(id);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, ' ');
const plain = a => norm(a.titulo + ' ' + a.tema + ' ' + a.claves + ' ' + a.pasos.join(' ') + ' ' + (a.nota || ''));
const esSocio = () => window.demoRole === 'socio';
const visibles = () => AYUDA.filter(a => !a.socios || esSocio());
const pagina = () => document.querySelector('.page.active')?.id || 'inicio';

function tarjeta(a, abierta) {
  return '<details class="alma-help-item"' + (abierta ? ' open' : '') + '><summary><span class="alma-help-tema">' + a.tema + '</span><span class="alma-help-tit">' + a.titulo + '</span>'
    + (a.socios ? ' <span class="alma-help-socio">Socios</span>' : '') + '</summary><ol>'
    + a.pasos.map(p => '<li>' + p + '</li>').join('') + '</ol>' + (a.nota ? '<p class="alma-help-nota">💡 ' + a.nota + '</p>' : '') + '</details>';
}
const palabrasDe = t => t.split(/[^a-z0-9ñ]+/).filter(Boolean);
function buscar(q, lista = visibles()) {
  const qs = palabrasDe(norm(q)).filter(w => w.length > 1);
  return lista.map(a => {
    const tit = palabrasDe(norm(a.titulo + ' ' + a.claves)), todo = palabrasDe(plain(a));
    let puntos = 0;
    for (const w of qs) {
      const raiz = w.length > 4 ? w.slice(0, -2) : w;      // cobro/cobrar, pasaporte/pasaportes
      if (tit.some(x => x.startsWith(w))) puntos += 3;
      else if (tit.some(x => x.startsWith(raiz))) puntos += 2;
      else if (todo.some(x => x.startsWith(raiz))) puntos += 1;
    }
    return { a, puntos };
  }).filter(x => x.puntos > 0).sort((x, y) => y.puntos - x.puntos).map(x => x.a);
}
function mostrar() {
  const q = $('almaHelpQ').value.trim(), out = $('almaHelpList');
  if (q) {
    const r = buscar(q);
    const deSocios = !esSocio() && !r.length ? buscar(q, AYUDA.filter(a => a.socios)) : [];
    out.innerHTML = r.length ? r.map((a, i) => tarjeta(a, i === 0)).join('')
      : deSocios.length ? '<p class="hint">Eso lo hace un socio: <b>' + deSocios[0].titulo + '</b>. Pediselo a Diego, Adriel, Sandro o Hernán.</p>'
      : '<p class="hint">No encontré nada con «' + q.replace(/[<>&]/g, '') + '». Probá con otra palabra (ej. «cobro», «caja», «pasaporte») o preguntale a Hernán.</p>';
    return;
  }
  const pg = pagina(), aca = visibles().filter(a => a.pantallas.includes(pg)), resto = visibles().filter(a => !a.pantallas.includes(pg));
  const temas = [...new Set(resto.map(a => a.tema))];
  out.innerHTML = (aca.length ? '<h3 class="alma-help-h">En esta pantalla</h3>' + aca.map(a => tarjeta(a, false)).join('') : '')
    + temas.map(t => '<h3 class="alma-help-h">' + t + '</h3>' + resto.filter(a => a.tema === t).map(a => tarjeta(a, false)).join('')).join('');
}
window.almaOpenHelp = () => { $('almaHelpQ').value = ''; mostrar(); $('almaHelpDialog').showModal(); $('almaHelpList').scrollTop = 0; };
document.addEventListener('DOMContentLoaded', () => { $('almaHelpQ')?.addEventListener('input', mostrar); });
window.__almaAyuda = AYUDA;
})();
