/* Alma Viajera · capa online: ingreso, carga y guardado en Supabase */
(() => {
'use strict';
const CFG = Object.assign({
  url: 'https://kwybigrovltwbgvbngdx.supabase.co',
  key: 'sb_publishable__WIXiJicmWGT5c59Lxj12Q_ENA3Xc9W'
}, window.ALMA_CFG || {});
const SKEY = 'alma-sesion-v1';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let session = null, profile = null, APP = null, started = false;

/* ------------------------------------------------------------------ */
/* Sesión                                                              */
/* ------------------------------------------------------------------ */
function authError(j) {
  const m = (j && (j.error_description || j.msg || j.message || j.error)) || '';
  if (/invalid login|invalid_credentials|invalid grant/i.test(m)) return 'Email o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'El email todavía no fue confirmado. Pedile a un socio que lo confirme.';
  if (/password.*(at least|short|weak)/i.test(m)) return 'La contraseña es muy corta o débil (mínimo 8 caracteres).';
  if (/same.*password|different from the old/i.test(m)) return 'La contraseña nueva tiene que ser distinta de la anterior.';
  return m || 'No se pudo conectar con el servidor.';
}
async function auth(path, body, method = 'POST', token) {
  const h = { apikey: CFG.key, 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  let r;
  try { r = await fetch(CFG.url + '/auth/v1/' + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { throw new Error('Sin conexión a internet o servidor no disponible.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(authError(j));
  return j;
}
function keepSession(j) {
  session = { access_token: j.access_token, refresh_token: j.refresh_token,
              expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000, user: j.user };
  try { localStorage.setItem(SKEY, JSON.stringify(session)); } catch (e) {}
}
let refreshing = null;
async function token() {
  if (!session) throw new Error('Tu sesión se cerró. Volvé a ingresar.');
  if (Date.now() > session.expires_at - 90_000) {
    refreshing ||= auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
      .then(keepSession).finally(() => { refreshing = null; });
    try { await refreshing; } catch (e) { logout(true); throw new Error('Tu sesión venció. Volvé a ingresar.'); }
  }
  return session.access_token;
}
async function logout(expired) {
  const t = session?.access_token;
  session = null; profile = null;
  try { localStorage.removeItem(SKEY); } catch (e) {}
  if (t && !expired) { try { await auth('logout', null, 'POST', t); } catch (e) {} }
  location.reload();
}

/* ------------------------------------------------------------------ */
/* Acceso a la base (API REST de Supabase)                             */
/* ------------------------------------------------------------------ */
function restError(j, txt, status) {
  const code = j?.code, m = j?.message || txt || '';
  if (status === 401 || /JWT/i.test(m)) return 'Tu sesión venció. Volvé a ingresar.';
  if (code === '42501' || /row-level security|permission denied/i.test(m)) return 'No tenés permiso para hacer esta acción con tu usuario.';
  if (code === '23505') {
    if (/pasajeros_nombre/.test(m)) return 'Ya existe un pasajero con ese nombre.';
    if (/reservas_una_por_salida/.test(m)) return 'Ese pasajero ya tiene una cuenta en esta salida.';
    if (/numero/.test(m)) return 'Otro usuario emitió un recibo al mismo tiempo. Se recargan los datos: volvé a registrar el cobro.';
    if (/un_turno_abierto/.test(m)) return 'Esa caja ya tiene un turno abierto.';
    return 'Ya existe un registro con esos datos.';
  }
  if (code === '23503') return 'No se puede: hay otros registros que dependen de este.';
  if (code === '23514' || code === '23502') return 'Hay un dato inválido o incompleto (' + (j?.message || '') + ').';
  return m || 'Error del servidor (' + status + ').';
}
async function rest(method, path, body, prefer) {
  const h = { apikey: CFG.key, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' };
  if (prefer) h.Prefer = prefer;
  let r;
  try { r = await fetch(CFG.url + '/rest/v1/' + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { throw new Error('Sin conexión a internet. Los cambios no se guardaron.'); }
  const txt = await r.text();
  let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
  if (r.status === 401) { setTimeout(() => logout(true), 1500); }
  if (!r.ok) throw new Error(restError(j, txt, r.status));
  return j;
}
async function selectAll(table, order) {
  const out = [], page = 1000;
  for (let from = 0; ; from += page) {
    const rows = await rest('GET', `${table}?select=*&order=${order}&offset=${from}&limit=${page}`);
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

/* ------------------------------------------------------------------ */
/* Correspondencia entre la pantalla y las tablas                      */
/* ------------------------------------------------------------------ */
const D = 'date', N = 'num', FK = 'fk', J = 'json', CAJA = 'caja', PAIR = 'pair';
const MAPS = {
  passengers: { table: 'pasajeros', order: 'creado.asc', cols: {
    name: ['nombre'], phone: ['telefono'], email: ['email'], birthDate: ['fecha_nacimiento', D],
    nationality: ['nacionalidad'], doc: ['documento'], cuil: ['cuil'], passportNumber: ['pasaporte_numero'],
    passportIssued: ['pasaporte_emision', D], passportExpiry: ['pasaporte_vence', D],
    birthPlace: ['lugar_nacimiento'], documentSex: ['sexo_documento'], notes: ['notas'] } },
  groups: { table: 'salidas', order: 'creado.asc', skip: ['rooms'], cols: {
    fileNumber: ['file'], name: ['nombre'], destination: ['destino'], departure: ['fecha_salida', D],
    returnDate: ['fecha_regreso', D], price: ['precio', N], currency: ['moneda'], capacity: ['cupos', N],
    owner: ['responsable'], description: ['descripcion'] } },
  rooms: { table: 'habitaciones', order: 'creado.asc', parent: ['groups', 'rooms', 'salida_id'], cols: {} },
  orders: { table: 'pedidos', order: 'creado.desc', cols: {
    client: ['cliente'], phone: ['telefono'], type: ['tipo'], groupId: ['salida_id', FK], destination: ['destino'],
    when: ['cuando'], pax: ['pasajeros_cant', N], quoteAmount: ['precio_cotizado', N], quoteCurrency: ['moneda'],
    owner: ['responsable'], status: ['estado'], date: ['fecha', D], notes: ['notas'], salesperson: ['vendedor'] } },
  bookings: { table: 'reservas', order: 'creado.desc', skip: ['extensions', 'basePrice', 'total'], cols: {
    kind: ['tipo'], passengerId: ['pasajero_id', FK], groupId: ['salida_id', FK], fileNumber: ['file'],
    client: ['cliente'], phone: ['telefono'], tour: ['viaje'], departure: ['fecha_salida', D],
    returnDate: ['fecha_regreso', D], currency: ['moneda'], transport: ['transporte'], hotel: ['hotel'],
    room: ['habitacion'], meals: ['regimen'], operator: ['operador'], operatorRef: ['ref_operador'],
    stage: ['etapa'], status: ['estado'], owner: ['responsable'], notes: ['notas'],
    salesperson: ['vendedor'], sourceOrderId: ['pedido_id', FK] },
    toExtra(o, row) { row.precio = num(o.kind === 'grupal' ? o.basePrice : o.total); },
    fromExtra(row, o) { if (row.tipo === 'grupal') o.basePrice = Number(row.precio); else o.total = Number(row.precio); } },
  extensions: { table: 'extensiones', order: 'creado.asc', parent: ['bookings', 'extensions', 'reserva_id'], cols: {
    title: ['titulo'], departure: ['desde', D], returnDate: ['hasta', D], amount: ['importe', N], notes: ['notas'] } },
  flights: { table: 'aereos', order: 'creado.desc', cols: {
    bookingId: ['reserva_id', FK], requestDate: ['fecha_pedido', D], destination: ['destino'],
    departure: ['fecha_vuelo', D], operator: ['operador'], net: ['neto', N], stage: ['etapa'],
    reference: ['localizador'], notes: ['notas'] } },
  payments: { table: 'cobros', order: 'registrado.desc', cols: {
    number: ['numero'], bookingId: ['reserva_id', FK], date: ['fecha', D], amount: ['importe', N],
    method: ['medio'], cashbox: ['caja', CAJA], concept: ['concepto'], notes: ['notas'], snapshot: ['foto', J],
    recordedBy: ['registrado_por'], recordedAt: ['registrado'], voidedAt: ['anulado'],
    voidBy: ['anulado_por'], voidReason: ['motivo_anulacion'] } },
  cashSessions: { table: 'turnos_caja', order: 'abierto.asc', cols: {
    cashbox: ['caja', CAJA], date: ['fecha', D], status: ['estado'],
    opening: [['apertura_ars', 'apertura_usd'], PAIR], expected: [['esperado_ars', 'esperado_usd'], PAIR],
    counted: [['contado_ars', 'contado_usd'], PAIR], openedBy: ['abierto_por'], openedAt: ['abierto'],
    openingNotes: ['notas_apertura'], reopeningReason: ['motivo_reapertura'], closedBy: ['cerrado_por'],
    closedAt: ['cerrado'], closingNotes: ['notas_cierre'] } },
  cashMovements: { table: 'movimientos_caja', order: 'registrado.desc', cols: {
    cashbox: ['caja', CAJA], type: ['tipo'], category: ['categoria'], currency: ['moneda'], amount: ['importe', N],
    date: ['fecha', D], method: ['medio'], reference: ['referencia'], notes: ['notas'],
    recordedBy: ['registrado_por'], recordedAt: ['registrado'], corrections: ['correcciones', J] } },
  cashTransfers: { table: 'transferencias_caja', order: 'registrado.desc', cols: {
    from: ['desde', CAJA], to: ['hacia', CAJA], currency: ['moneda'], amount: ['importe', N], date: ['fecha', D],
    notes: ['notas'], recordedBy: ['registrado_por'], recordedAt: ['registrado'] } },
  providers: { table: 'proveedores', order: 'creado.desc', cols: {
    name: ['nombre'], category: ['categoria'], contact: ['contacto'], phone: ['telefono'], email: ['email'],
    taxId: ['cuit'], notes: ['notas'] } },
  expenses: { table: 'compromisos', order: 'creado.desc', skip: ['operationKey'], cols: {
    providerId: ['proveedor_id', FK], category: ['categoria'], concept: ['concepto'], amount: ['importe', N],
    currency: ['moneda'], dueDate: ['vencimiento', D], notes: ['notas'] },
    toExtra(o, row) {
      const k = String(o.operationKey || 'GENERAL');
      row.salida_id = k.startsWith('G:') ? k.slice(2) : null;
      row.reserva_id = k.startsWith('B:') ? k.slice(2) : null;
    },
    fromExtra(row, o) { o.operationKey = row.salida_id ? 'G:' + row.salida_id : row.reserva_id ? 'B:' + row.reserva_id : 'GENERAL'; } },
  supplierPayments: { table: 'pagos_proveedores', order: 'registrado.desc', cols: {
    expenseId: ['compromiso_id', FK], cashbox: ['caja', CAJA], amount: ['importe', N], date: ['fecha', D],
    method: ['medio'], reference: ['referencia'], recordedBy: ['registrado_por'], recordedAt: ['registrado'] } },
  groupExtras: { table: 'extras_salida', order: 'registrado.asc', cols: {
    groupId: ['salida_id', FK], kind: ['tipo'], currency: ['moneda'], concept: ['concepto'], amount: ['importe', N],
    date: ['fecha', D], notes: ['notas'], recordedBy: ['registrado_por'], recordedAt: ['registrado'] } }
};
// Orden de guardado (respeta las dependencias entre tablas)
const ORDER = ['passengers', 'groups', 'rooms', 'orders', 'bookings', 'extensions', 'flights', 'payments',
  'cashSessions', 'cashMovements', 'cashTransfers', 'providers', 'expenses', 'supplierPayments', 'groupExtras'];
// Columnas que fija el servidor y nunca se reenvían al editar
const SERVER_ONLY = new Set(['creado', 'creado_por', 'registrado', 'abierto', 'cerrado', 'anulado_por']);

const num = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const toCaja = v => v === 'policlinico' ? 'gaona' : v;
const fromCaja = v => v === 'gaona' ? 'policlinico' : (v ?? '');

function toRow(o, map, parentId) {
  const row = { id: o.id }, extra = {};
  const skip = new Set(['id', ...(map.skip || [])]);
  for (const k of Object.keys(o)) {
    if (skip.has(k) || o[k] === undefined) continue;
    const m = map.cols[k];
    if (!m) { extra[k] = o[k]; continue; }
    const [col, type] = m, v = o[k];
    if (type === PAIR) { row[col[0]] = num(v?.ARS); row[col[1]] = num(v?.USD); if (v && typeof v === 'object') { const rest = { ...v }; delete rest.ARS; delete rest.USD; if (Object.keys(rest).length) extra['__' + k] = rest; } }
    else if (type === D) row[col] = isDate(v) ? v : null;
    else if (type === N) row[col] = num(v);
    else if (type === FK) row[col] = v ? String(v) : null;
    else if (type === CAJA) row[col] = toCaja(v) || null;
    else if (type === J) row[col] = v ?? null;
    else row[col] = v === null ? null : String(v);
  }
  if (map.parent) row[map.parent[2]] = parentId;
  if (map.toExtra) map.toExtra(o, row);
  row.extra = extra;
  return row;
}
function fromRow(row, map) {
  const o = { ...(row.extra || {}), id: row.id };
  for (const [k, [col, type]] of Object.entries(map.cols)) {
    if (type === PAIR) {
      const a = row[col[0]], b = row[col[1]], more = o['__' + k];
      delete o['__' + k];
      if (a == null && b == null && !more) continue;
      o[k] = { ARS: Number(a || 0), USD: Number(b || 0), ...(more || {}) };
      continue;
    }
    const v = row[col];
    if (v === null || v === undefined) { if (!(k in o)) o[k] = type === J ? (col === 'correcciones' ? [] : {}) : ''; continue; }
    o[k] = type === N ? Number(v) : type === CAJA ? fromCaja(v) : v;
  }
  if (map.fromExtra) map.fromExtra(row, o);
  return o;
}

/* ------------------------------------------------------------------ */
/* Carga completa desde la base                                       */
/* ------------------------------------------------------------------ */
const snap = {};           // tabla -> Map(id -> JSON de la fila guardada)
const TABLE_LABEL = { pasajeros: 'Pasajero', salidas: 'Salida grupal', habitaciones: 'Rooming', pedidos: 'Pedido',
  reservas: 'Reserva', extensiones: 'Extensión', aereos: 'Aéreo', cobros: 'Recibo', turnos_caja: 'Caja',
  movimientos_caja: 'Movimiento de caja', transferencias_caja: 'Transferencia entre cajas', proveedores: 'Proveedor',
  compromisos: 'Compromiso con proveedor', pagos_proveedores: 'Pago a proveedor', extras_salida: 'Extra de salida',
  perfiles: 'Usuario', usuarios_autorizados: 'Usuario autorizado' };

async function loadAll() {
  const rows = {};
  await Promise.all(ORDER.map(async name => { rows[name] = await selectAll(MAPS[name].table, MAPS[name].order); }));
  const state = { nextReceipt: 1, audit: [] };
  for (const name of ORDER) if (!MAPS[name].parent) state[name] = rows[name].map(r => fromRow(r, MAPS[name]));
  for (const name of ORDER.filter(n => MAPS[n].parent)) {
    const [pName, field, fk] = MAPS[name].parent;
    const byId = new Map(state[pName].map(p => [p.id, p]));
    state[pName].forEach(p => { p[field] = []; });
    for (const r of rows[name]) byId.get(r[fk])?.[field].push(fromRow(r, MAPS[name]));
  }
  state.nextReceipt = 1 + Math.max(0, ...state.payments.map(p => Number(String(p.number || '').replace(/\D/g, '')) || 0));
  if (profile?.rol === 'vendedor') {
    try {
      state.cashOthers = (await rest('POST', 'rpc/efectivo_interno', {})).map(r => ({
        date: r.fecha, recordedAt: r.registrado || '', recordedBy: '', cashbox: fromCaja(r.caja), category: 'Movimiento interno',
        detail: '', method: r.medio, currency: r.moneda, amount: Number(r.importe) }));
    } catch (e) { state.cashOthers = []; }
  }
  if (profile?.rol === 'socio') {
    try { state.audit = (await rest('GET', 'bitacora?select=*&order=id.desc&limit=500')).map(auditRow); } catch (e) {}
  }
  return state;
}
function auditRow(b) {
  const d = b.despues || b.antes || {};
  let action = b.accion === 'INSERT' ? 'Alta' : b.accion === 'DELETE' ? 'Eliminación' : 'Modificación';
  if (b.tabla === 'cobros' && b.accion === 'UPDATE' && b.despues?.anulado) action = 'Anulación';
  if (b.tabla === 'turnos_caja') action = b.accion === 'INSERT' ? 'Apertura' : (b.despues?.estado === 'cerrada' ? 'Cierre' : action);
  const details = [d.numero, d.cliente || d.nombre, d.titulo || d.concepto, d.importe != null ? d.importe + ' ' + (d.moneda || '') : '']
    .filter(Boolean).join(' · ');
  return { id: 'b' + b.id, when: b.cuando, user: b.usuario, action: action + ' · ' + (TABLE_LABEL[b.tabla] || b.tabla), entity: TABLE_LABEL[b.tabla] || b.tabla, details };
}
// Filas actuales de la pantalla, por tabla (incluye las anidadas)
function collect(state) {
  const out = {};
  for (const name of ORDER) {
    const map = MAPS[name], list = new Map();
    if (map.parent) {
      const [pName, field] = map.parent;
      for (const p of state[pName] || []) for (const o of p[field] || []) list.set(o.id, { o, row: toRow(o, map, p.id) });
    } else for (const o of state[name] || []) list.set(o.id, { o, row: toRow(o, map) });
    out[name] = list;
  }
  return out;
}
function takeSnapshot(state) {
  const cur = collect(state);
  for (const name of ORDER) snap[name] = new Map([...cur[name]].map(([id, x]) => [id, JSON.stringify(x.row)]));
}
function replaceState(fresh) {
  const st = APP.getState();
  for (const k of Object.keys(fresh)) st[k] = fresh[k];
  takeSnapshot(st);
}

/* ------------------------------------------------------------------ */
/* Guardado: compara con lo último guardado y envía solo los cambios   */
/* ------------------------------------------------------------------ */
let syncing = false, again = false;
function scheduleSave() { if (syncing) { again = true; return; } runSync(); }
async function runSync() {
  syncing = true; status('saving');
  try {
    do { again = false; await syncOnce(); } while (again);
    status('ok');
    APP.render(); APP.refreshDetail?.();
  } catch (e) {
    status('error');
    alert('No se pudo guardar: ' + e.message + '\n\nSe vuelven a cargar los datos del servidor.');
    try { replaceState(await loadAll()); APP.render(); APP.refreshDetail?.(); status('ok'); } catch (e2) { status('error'); }
  } finally { syncing = false; }
}
async function syncOnce() {
  const st = APP.getState(), cur = collect(st);
  // altas y modificaciones, en orden de dependencias
  for (const name of ORDER) {
    const map = MAPS[name], before = snap[name] || new Map();
    for (const [id, { o, row }] of cur[name]) {
      const json = JSON.stringify(row);
      if (!before.has(id)) {
        const body = Object.fromEntries(Object.entries(row).filter(([k, v]) => v !== null && !SERVER_ONLY.has(k)));
        const [saved] = await rest('POST', map.table, body, 'return=representation');
        merge(o, saved, map);
      } else if (before.get(id) !== json) {
        const old = JSON.parse(before.get(id)), diff = {};
        for (const k of Object.keys(row)) if (!SERVER_ONLY.has(k) && JSON.stringify(row[k]) !== JSON.stringify(old[k])) diff[k] = row[k];
        for (const k of Object.keys(old)) if (!(k in row) && !SERVER_ONLY.has(k)) diff[k] = null;
        if (Object.keys(diff).length) {
          const [saved] = await rest('PATCH', `${map.table}?id=eq.${encodeURIComponent(id)}`, diff, 'return=representation');
          if (!saved) throw new Error('No tenés permiso para modificar este registro.');
          merge(o, saved, map);
        }
      } else continue;
      const parentId = map.parent ? row[map.parent[2]] : undefined;
      (snap[name] ||= new Map()).set(id, JSON.stringify(toRow(o, map, parentId)));
    }
  }
  // bajas, en orden inverso
  for (const name of [...ORDER].reverse()) {
    const map = MAPS[name];
    for (const id of [...(snap[name] || new Map()).keys()]) {
      if (cur[name].has(id)) continue;
      const gone = await rest('DELETE', `${map.table}?id=eq.${encodeURIComponent(id)}`, undefined, 'return=representation');
      if (!gone?.length) throw new Error('No tenés permiso para eliminar este registro.');
      snap[name].delete(id);
    }
  }
}
// Copia en pantalla lo que fijó el servidor (número de file, concepto, fechas de carga…)
function merge(o, saved, map) {
  const fresh = fromRow(saved, map);
  for (const k of Object.keys(fresh)) if (!(map.skip || []).includes(k)) o[k] = fresh[k];
}

/* ------------------------------------------------------------------ */
/* Actualización periódica (ver lo que cargan las otras oficinas)      */
/* ------------------------------------------------------------------ */
async function refresh(force) {
  if (!APP || syncing || (!force && document.querySelector('dialog[open]'))) return;
  try { const fresh = await loadAll(); if (syncing) return; replaceState(fresh); APP.render(); APP.refreshDetail?.(); status('ok'); }
  catch (e) { status('offline'); }
}
setInterval(() => refresh(false), 60_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });

/* ------------------------------------------------------------------ */
/* Interfaz: ingreso, usuario y estado de guardado                     */
/* ------------------------------------------------------------------ */
function status(s) {
  const el = $('almaSync'); if (!el) return;
  const t = { saving: ['Guardando…', 'saving'], ok: ['✓ Guardado', 'ok'], error: ['⚠ Error al guardar', 'error'], offline: ['Sin conexión', 'error'] }[s];
  el.textContent = t[0]; el.dataset.s = t[1];
}
function showLogin(msg) {
  $('almaLogin').hidden = false; $('almaLoading').hidden = true;
  $('almaLoginMsg').textContent = msg || '';
  setTimeout(() => $('almaEmail')?.focus(), 50);
}
async function boot() {
  try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
  if (!session) return showLogin();
  $('almaLoading').hidden = false;
  try {
    const uid = session.user?.id;
    const p = await rest('GET', `perfiles?select=*&id=eq.${encodeURIComponent(uid)}`);
    profile = p?.[0];
    if (!profile || !profile.activo) {
      session = null; try { localStorage.removeItem(SKEY); } catch (e) {}
      return showLogin('Tu usuario no está habilitado en el sistema. Pedile a un socio que te agregue a la lista de usuarios autorizados.');
    }
    const state = await loadAll();
    start(state);
  } catch (e) {
    if (!session) return showLogin(e.message);
    $('almaLoading').hidden = true;
    $('almaFatal').hidden = false;
    $('almaFatalMsg').textContent = e.message;
  }
}
function start(state) {
  if (started) return; started = true;
  window.__ALMA_STATE__ = state;
  const s = document.createElement('script');
  s.textContent = $('almaAppSource').textContent;
  document.body.appendChild(s);
  APP = window.__ALMA_APP;
  // Usuario real en lugar del selector de prueba
  window.changeDemoRole(profile.rol);
  window.demoOperator = profile.nombre;
  document.body.classList.add('alma-online');
  $('almaUserName').textContent = profile.nombre;
  $('almaUserRole').textContent = profile.rol === 'socio' ? 'Socio' : 'Vendedor' + (profile.oficina ? ' · ' + (profile.oficina === 'gaona' ? 'Gaona' : 'Centro') : '');
  $('almaUserBox').hidden = false;
  takeSnapshot(APP.getState());
  APP.render();
  $('almaLoading').hidden = true;
  status('ok');
}
window.__almaSave = () => { if (APP) scheduleSave(); };
window.almaLogout = () => { if (syncing && !confirm('Hay cambios guardándose. ¿Salir igual?')) return; logout(false); };
window.almaRefresh = () => refresh(true);
window.almaOpenPassword = () => { $('almaPwForm').reset(); $('almaPwMsg').textContent = ''; $('almaPwDialog').showModal(); };

document.addEventListener('DOMContentLoaded', () => {
  $('almaLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('almaLoginBtn'); btn.disabled = true; $('almaLoginMsg').textContent = '';
    try {
      const j = await auth('token?grant_type=password', { email: $('almaEmail').value.trim().toLowerCase(), password: $('almaPass').value });
      keepSession(j);
      $('almaLogin').hidden = true;
      await boot();
    } catch (err) { $('almaLoginMsg').textContent = err.message; }
    finally { btn.disabled = false; }
  });
  $('almaPwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const a = $('almaPw1').value, b = $('almaPw2').value, msg = $('almaPwMsg');
    if (a.length < 8) { msg.textContent = 'Usá al menos 8 caracteres.'; return; }
    if (a !== b) { msg.textContent = 'Las dos contraseñas no coinciden.'; return; }
    try { await auth('user', { password: a }, 'PUT', await token()); $('almaPwDialog').close(); alert('Contraseña cambiada. La próxima vez ingresá con la nueva.'); }
    catch (err) { msg.textContent = err.message; }
  });
  boot();
});
})();
