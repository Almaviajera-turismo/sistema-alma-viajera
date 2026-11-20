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
  catch (e) { const err = new Error('Sin conexión a internet o servidor no disponible.'); err.offline = true; throw err; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(authError(j));
  return j;
}
// Último email usado en este dispositivo (para no tener que escribirlo)
const EKEY = 'alma-email-v1';
const lastEmail = () => { try { return localStorage.getItem(EKEY) || ''; } catch (e) { return ''; } };
// Si otra pestaña renovó la sesión, usar la misma (evita que se cierre sola)
window.addEventListener('storage', e => {
  if (e.key !== SKEY || !e.newValue) return;
  try { const s = JSON.parse(e.newValue); if (s?.refresh_token) session = s; } catch (err) {}
});
function keepSession(j) {
  session = { access_token: j.access_token, refresh_token: j.refresh_token,
              expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000, user: j.user };
  try { localStorage.setItem(SKEY, JSON.stringify(session)); } catch (e) {}
}
let refreshing = null;
async function token() {
  if (!session) throw new Error('Tu sesión se cerró. Volvé a ingresar.');
  if (Date.now() > session.expires_at - 90_000) {
    // otra pestaña pudo haberla renovado recién
    try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s?.expires_at > session.expires_at) session = s; } catch (e) {}
  }
  if (Date.now() > session.expires_at - 90_000) {
    refreshing ||= auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
      .then(keepSession).finally(() => { refreshing = null; });
    try { await refreshing; }
    catch (e) {
      if (e.offline) throw new Error('Sin conexión a internet.');   // sin internet no se cierra la sesión
      logout(true); throw new Error('Tu sesión venció. Volvé a ingresar.');
    }
  }
  return session.access_token;
}
/* Cierre por inactividad: 1 hora sin usar el sistema (compartido entre pestañas) */
const IDLE_MS = 60 * 60 * 1000, AKEY = 'alma-actividad-v1', IDLE_MSG = 'alma-cierre-inactividad';
const lastActivity = () => { try { return Number(localStorage.getItem(AKEY)) || 0; } catch (e) { return 0; } };
let lastMark = 0;
function markActivity() {
  const now = Date.now();
  if (now - lastMark < 15_000) return;            // no escribir en cada movimiento
  lastMark = now;
  try { localStorage.setItem(AKEY, String(now)); } catch (e) {}
}
['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(ev =>
  window.addEventListener(ev, () => { if (session) markActivity(); }, { passive: true, capture: true }));
function idleExpired() { const a = lastActivity(); return !!a && Date.now() - a > IDLE_MS; }
function checkIdle() {
  if (!session || !idleExpired()) return;
  if (syncing) return;                             // esperar a que termine de guardar
  try { sessionStorage.setItem(IDLE_MSG, '1'); } catch (e) {}
  logout(false);
}
setInterval(checkIdle, 30_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkIdle(); });

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
    owner: ['responsable'], description: ['descripcion'], brochure: ['folleto'] } },
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
    salesperson: ['vendedor'], sourceOrderId: ['pedido_id', FK], soldAt: ['creado'] },
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
    date: ['fecha', D], notes: ['notas'], recordedBy: ['registrado_por'], recordedAt: ['registrado'] } },
  commissionRates: { table: 'comisiones_vendedor', order: 'vendedor.asc', cols: {
    seller: ['vendedor'], percent: ['porcentaje', N] } },
  commissionPayouts: { table: 'liquidaciones_comision', order: 'creado.desc', cols: {
    seller: ['vendedor'], month: ['mes'], currency: ['moneda'], amount: ['importe', N], detail: ['detalle', J],
    paidDate: ['pagado', D], paidBy: ['pagado_por'] } },
  bankAccounts: { table: 'cuentas_banco', order: 'creado.asc', cols: {
    name: ['nombre'], opening: [['saldo_inicial_ars', 'saldo_inicial_usd'], PAIR], since: ['desde', D] } },
  partnerExpenses: { table: 'gastos_socios', order: 'fecha.asc', cols: {
    date: ['fecha', D], receipt: ['comprobante'], dueDate: ['vencimiento', D], description: ['descripcion'], category: ['categoria'],
    amount: ['importe', N], currency: ['moneda'], payers: ['pagadores', J], notes: ['notas'], recordedBy: ['registrado_por'], createdAt: ['creado'] } },
  partnerRefunds: { table: 'reintegros_socios', order: 'registrado.asc', cols: {
    expenseId: ['gasto_id', FK], partner: ['socio'], amount: ['importe', N], currency: ['moneda'], date: ['fecha', D],
    source: ['origen'], kind: ['tipo'], recordedBy: ['registrado_por'], recordedAt: ['registrado'] } }
};
// Orden de guardado (respeta las dependencias entre tablas)
const ORDER = ['passengers', 'groups', 'rooms', 'orders', 'bookings', 'extensions', 'flights', 'payments',
  'cashSessions', 'cashMovements', 'cashTransfers', 'providers', 'expenses', 'supplierPayments', 'groupExtras',
  'commissionRates', 'commissionPayouts', 'bankAccounts', 'partnerExpenses', 'partnerRefunds'];
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
  perfiles: 'Usuario', usuarios_autorizados: 'Usuario autorizado', archivos: 'Archivo',
  comisiones_vendedor: 'Porcentaje de comisión', liquidaciones_comision: 'Liquidación de comisión', cuentas_banco: 'Cuenta bancaria' };

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
  await loadDocIndex();
  return state;
}
function auditRow(b) {
  const d = b.despues || b.antes || {};
  if (b.tabla === 'archivos') return { id: 'b' + b.id, when: b.cuando, user: b.usuario, action: d.evento || 'Archivo', entity: 'Archivo', details: d.nombre || '' };
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
      const json = JSON.stringify(row), parentId = map.parent ? row[map.parent[2]] : undefined;
      let saved;
      if (!before.has(id)) {
        const body = Object.fromEntries(Object.entries(row).filter(([k, v]) => v !== null && !SERVER_ONLY.has(k)));
        [saved] = await rest('POST', map.table, body, 'return=representation');
      } else if (before.get(id) !== json) {
        const old = JSON.parse(before.get(id)), diff = {};
        for (const k of Object.keys(row)) if (!SERVER_ONLY.has(k) && JSON.stringify(row[k]) !== JSON.stringify(old[k])) diff[k] = row[k];
        for (const k of Object.keys(old)) if (!(k in row) && !SERVER_ONLY.has(k)) diff[k] = null;
        if (!Object.keys(diff).length) continue;
        [saved] = await rest('PATCH', `${map.table}?id=eq.${encodeURIComponent(id)}`, diff, 'return=representation');
        if (!saved) throw new Error('No tenés permiso para modificar este registro.');
      } else continue;
      // Si mientras se guardaba hubo otro cambio en este registro, no se pisa con la respuesta:
      // se guarda en la próxima vuelta.
      if (JSON.stringify(toRow(o, map, parentId)) !== json) { again = true; (snap[name] ||= new Map()).set(id, json); continue; }
      merge(o, saved, map);
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
  const em = $('almaEmail');
  if (em && !em.value) em.value = lastEmail();
  setTimeout(() => (em?.value ? $('almaPass') : em)?.focus(), 50);
}
async function boot() {
  try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
  let idleMsg = '';
  try { if (sessionStorage.getItem(IDLE_MSG)) { idleMsg = 'Por seguridad se cerró la sesión después de 1 hora sin uso. Volvé a ingresar.'; sessionStorage.removeItem(IDLE_MSG); } } catch (e) {}
  if (session && idleExpired()) {                  // quedó abierta y pasó más de 1 hora sin uso
    const t = session.access_token; session = null;
    try { localStorage.removeItem(SKEY); } catch (e) {}
    auth('logout', null, 'POST', t).catch(() => {});
    idleMsg = 'Por seguridad se cerró la sesión después de 1 hora sin uso. Volvé a ingresar.';
  }
  if (!session) return showLogin(idleMsg);
  markActivity();
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
    try { window.__ALMA_PERSONAL__ = await rest('POST', 'rpc/lista_personal', {}); } catch (e) { window.__ALMA_PERSONAL__ = null; }
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
  wireFormDoc();
  window.almaWhatsapp?.iniciar();
  APP.render();
  $('almaLoading').hidden = true;
  status('ok');
}
/* ------------------------------------------------------------------ */
/* Fotos de pasaportes (espacio privado "pasaportes" de Supabase)       */
/* Cada archivo se guarda como <id del pasajero>/<nombre>.<ext>        */
/* ------------------------------------------------------------------ */
const BUCKET = 'pasaportes';
let docIds = new Set();
window.__almaDocIds = docIds;
async function storage(method, path, body, headers = {}) {
  const h = { apikey: CFG.key, Authorization: 'Bearer ' + await token(), ...headers };
  let r;
  try { r = await fetch(CFG.url + '/storage/v1/' + path, { method, headers: h, body }); }
  catch (e) { throw new Error('Sin conexión a internet.'); }
  if (!r.ok) {
    let j = {}; try { j = await r.json(); } catch (e) {}
    const m = String(j.message || j.error || '');
    if (r.status === 401 || /jwt/i.test(m)) throw new Error('Tu sesión venció. Volvé a ingresar.');
    if (r.status === 413 || /too large|size/i.test(m)) throw new Error('El archivo es demasiado grande (máximo 10 MB).');
    if (/mime/i.test(m)) throw new Error('Tipo de archivo no admitido. Usá una foto (JPG o PNG) o un PDF.');
    if (r.status === 403 || /row-level|policy|unauthorized/i.test(m)) throw new Error('No tenés permiso para hacer esta acción con tu usuario.');
    throw new Error(m || 'Error del servidor (' + r.status + ').');
  }
  return r;
}
const JSONH = { 'Content-Type': 'application/json' };
async function listDocs(prefix, limit = 100, offset = 0) {
  const r = await storage('POST', 'object/list/' + BUCKET,
    JSON.stringify({ prefix, limit, offset, sortBy: { column: 'created_at', order: 'desc' } }), JSONH);
  return r.json();
}
async function loadDocIndex() {
  try {
    const all = [];
    for (let off = 0; ; off += 1000) {
      const rows = await listDocs('', 1000, off);
      all.push(...rows);
      if (rows.length < 1000) break;
    }
    docIds = new Set(all.filter(x => !x.id).map(x => x.name)); // las "carpetas" son los ids de pasajeros
    window.__almaDocIds = docIds;
  } catch (e) {}
}
// Fotos grandes de celular: se achican antes de subir (2000 px, JPG)
async function prepareFile(file) {
  const ext = String(file.name.split('.').pop() || '').toLowerCase();
  if (file.type === 'application/pdf' || ext === 'pdf') return { blob: file, type: 'application/pdf', ext: 'pdf' };
  if (!/^image\//.test(file.type) && !/^(jpe?g|png|webp|heic|heif)$/.test(ext))
    throw new Error('"' + file.name + '" no es una foto ni un PDF.');
  const simple = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  if (simple && file.size < 1.5e6) return { blob: file, type: file.type, ext: simple };
  let bmp = null;
  try { bmp = await createImageBitmap(file); } catch (e) {}
  if (!bmp) return { blob: file, type: file.type || 'image/jpeg', ext: ext || 'jpg' };
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  return { blob, type: 'image/jpeg', ext: 'jpg' };
}
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
const safeName = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-');
async function uploadDoc(pid, file, base) {
  const p = await prepareFile(file);
  const name = safeName(base || ('pasaporte-' + stamp())) + '.' + p.ext;
  await storage('POST', 'object/' + BUCKET + '/' + pid + '/' + name, p.blob, { 'Content-Type': p.type, 'x-upsert': 'true' });
  docIds.add(pid);
  return name;
}
// Reemplazo: el archivo anterior no se borra, pasa a <pasajero>/anteriores/ (lo ven los socios)
async function archiveDoc(pid, name) {
  await storage('POST', 'object/move', JSON.stringify({ bucketId: BUCKET, sourceKey: pid + '/' + name,
    destinationKey: pid + '/anteriores/' + stamp() + '-' + name }), JSONH);
}
// Sube el nuevo y recién después guarda los actuales como anteriores (si falla la subida, no se pierde nada)
async function replaceDocs(pid, file, base, olds) {
  const name = await uploadDoc(pid, file, base);
  for (const o of olds) if (o !== name) await archiveDoc(pid, o);
  return name;
}
const currentDocs = async pid => (await listDocs(pid + '/')).filter(x => x.id).map(x => x.name);

/* Ventana de confirmación con vista previa: actual / nuevo */
function confirmReplace(title, oldUrl, oldIsPdf, file) {
  return new Promise(resolve => {
    const d = $('almaReplaceDialog');
    const nuevo = URL.createObjectURL(file), isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const box = (url, pdf, alt) => !url ? '<div class="alma-rep-empty">—</div>'
      : pdf ? '<a class="alma-pdf" href="' + esc(url) + '" target="_blank" rel="noopener">PDF · abrir</a>' : '<img src="' + esc(url) + '" alt="' + alt + '">';
    $('almaReplaceTitle').textContent = title;
    $('almaReplaceOld').innerHTML = box(oldUrl, oldIsPdf, 'Actual');
    $('almaReplaceNew').innerHTML = box(nuevo, isPdf, 'Nuevo');
    $('almaReplaceInfo').textContent = file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB';
    const done = ok => { d.onclose = null; d.close(); URL.revokeObjectURL(nuevo); resolve(ok); };
    $('almaReplaceOk').onclick = () => done(true);
    $('almaReplaceNo').onclick = () => done(false);
    d.onclose = () => { URL.revokeObjectURL(nuevo); resolve(false); };
    d.showModal();
  });
}
const objPath = path => path.split('/').map(encodeURIComponent).join('/');
async function fetchDoc(path) { return (await storage('GET', 'object/authenticated/' + BUCKET + '/' + objPath(path))).blob(); }

const docUrls = [];
function clearUrls() { while (docUrls.length) URL.revokeObjectURL(docUrls.pop()); }
window.almaLoadDocs = async pid => {
  const box = $('almaDocs'); if (!box) return;
  clearUrls();
  box.dataset.pid = pid;
  const p = APP?.getState().passengers.find(x => x.id === pid);
  const vencido = p?.passportExpiry && p.passportExpiry < new Date().toISOString().slice(0, 10);
  box.innerHTML = '<div class="alma-docs-head"><b>Pasaporte (foto o PDF)</b>'
    + '<label class="btn ghost tiny">+ Agregar archivo<input type="file" accept="image/*,application/pdf" hidden onchange="almaUploadOne(\'' + pid + '\',this)"></label></div>'
    + (vencido ? '<div class="alma-vencido">⚠ El pasaporte figura vencido (' + esc(p.passportExpiry.split('-').reverse().join('/')) + '). Cuando llegue el nuevo, tocá «Reemplazar» y actualizá los datos de la ficha.</div>' : '')
    + '<div class="alma-docs-list"><span class="sub">Cargando…</span></div><div class="alma-docs-old"></div>';
  const list = box.querySelector('.alma-docs-list');
  let all;
  try { all = await listDocs(pid + '/'); }
  catch (e) { if (box.dataset.pid === pid) list.innerHTML = '<span class="alma-msg">' + esc(e.message) + '</span>'; return; }
  if (box.dataset.pid !== pid) return;
  const items = all.filter(x => x.id), hasOld = all.some(x => !x.id && x.name === 'anteriores');
  if (profile?.rol === 'socio' && hasOld)
    box.querySelector('.alma-docs-old').innerHTML = '<button type="button" class="textlink subtle-link" onclick="almaVerAnteriores(\'' + pid + '\')">Ver archivos anteriores (reemplazados)</button>';
  if (!items.length) { list.innerHTML = '<span class="sub">Todavía no hay foto del pasaporte. Tocá «+ Agregar archivo».</span>'; return; }
  list.innerHTML = items.map((it, i) => '<div class="alma-doc" data-i="' + i + '"><div class="alma-thumb">…</div><div class="alma-doc-info">'
    + '<span class="sub">' + (it.metadata?.mimetype === 'application/pdf' ? 'PDF' : 'Foto') + ' · subido ' + esc(String(it.created_at || '').slice(0, 10).split('-').reverse().join('/')) + '</span>'
    + '<div class="alma-doc-btns"><a class="btn ghost tiny" target="_blank" rel="noopener">Ver</a><a class="btn ghost tiny">Descargar</a>'
    + '<label class="btn ghost tiny' + (vencido ? ' alma-rep-hot' : '') + '">↻ Reemplazar<input type="file" accept="image/*,application/pdf" hidden onchange="almaReplaceOne(\'' + pid + '\',\'' + esc(it.name) + '\',' + i + ',this)"></label>'
    + (profile?.rol === 'socio' ? '<button class="btn plain tiny" onclick="almaDeleteDoc(\'' + pid + '\',\'' + esc(it.name) + '\')">Borrar</button>' : '')
    + '</div></div></div>').join('');
  items.forEach(async (it, i) => {
    const el = list.querySelector('[data-i="' + i + '"]');
    try {
      const blob = await fetchDoc(pid + '/' + it.name);
      if (box.dataset.pid !== pid) return;
      const url = URL.createObjectURL(blob); docUrls.push(url);
      const isPdf = blob.type === 'application/pdf';
      el.dataset.url = url; el.dataset.pdf = isPdf ? '1' : '';
      el.querySelector('.alma-thumb').innerHTML = isPdf ? '<span class="alma-pdf">PDF</span>' : '<img alt="Pasaporte" src="' + url + '">';
      const [ver, bajar] = el.querySelectorAll('a');
      ver.href = url; bajar.href = url;
      bajar.download = 'Pasaporte ' + (p?.name || '') + (items.length > 1 ? ' (' + (i + 1) + ')' : '') + '.' + (it.name.split('.').pop() || 'jpg');
    } catch (e) { el.querySelector('.alma-thumb').textContent = '⚠'; }
  });
};
window.almaUploadOne = async (pid, input) => {
  const file = input.files?.[0]; input.value = '';
  if (!file) return;
  const box = $('almaDocs'); const list = box?.querySelector('.alma-docs-list');
  if (list) list.innerHTML = '<span class="sub">Subiendo…</span>';
  try { await uploadDoc(pid, file); }
  catch (e) { alert('No se pudo subir: ' + e.message); }
  window.almaLoadDocs(pid); APP?.render();
};
window.almaReplaceOne = async (pid, name, i, input) => {
  const file = input.files?.[0]; input.value = '';
  if (!file) return;
  const el = $('almaDocs')?.querySelector('[data-i="' + i + '"]');
  const p = APP?.getState().passengers.find(x => x.id === pid);
  if (!await confirmReplace('Reemplazar pasaporte · ' + (p?.name || ''), el?.dataset.url, !!el?.dataset.pdf, file)) return;
  const list = $('almaDocs')?.querySelector('.alma-docs-list');
  if (list) list.innerHTML = '<span class="sub">Reemplazando…</span>';
  try { await replaceDocs(pid, file, null, [name]); notifyOk('Pasaporte reemplazado. El anterior quedó guardado.'); }
  catch (e) { alert('No se pudo reemplazar: ' + e.message); }
  window.almaLoadDocs(pid); APP?.render();
};
window.almaVerAnteriores = async pid => {
  const box = $('almaDocs')?.querySelector('.alma-docs-old'); if (!box) return;
  box.innerHTML = '<span class="sub">Cargando…</span>';
  try {
    const items = (await listDocs(pid + '/anteriores/')).filter(x => x.id);
    if (!items.length) { box.innerHTML = '<span class="sub">No hay archivos anteriores.</span>'; return; }
    box.innerHTML = '<b class="sub">Archivos anteriores (solo socios)</b>' + items.map((it, i) => {
      const m = it.name.match(/^(\d{4})(\d{2})(\d{2})/);
      return '<div class="alma-old" data-o="' + i + '"><span class="sub">Reemplazado ' + (m ? m[3] + '/' + m[2] + '/' + m[1] : '') + '</span> '
        + '<a class="btn ghost tiny" target="_blank" rel="noopener">Ver</a> <a class="btn ghost tiny">Descargar</a></div>';
    }).join('');
    items.forEach(async (it, i) => {
      const el = box.querySelector('[data-o="' + i + '"]');
      try {
        const url = URL.createObjectURL(await fetchDoc(pid + '/anteriores/' + it.name)); docUrls.push(url);
        const [ver, bajar] = el.querySelectorAll('a'); ver.href = url; bajar.href = url; bajar.download = 'Pasaporte anterior ' + it.name;
      } catch (e) { el.append(' ⚠'); }
    });
  } catch (e) { box.innerHTML = '<span class="alma-msg">' + esc(e.message) + '</span>'; }
};
window.almaDeleteDoc = async (pid, name) => {
  if (!confirm('¿Borrar este archivo del pasaporte? No se puede deshacer.')) return;
  try {
    await storage('DELETE', 'object/' + BUCKET, JSON.stringify({ prefixes: [pid + '/' + name] }), JSONH);
    const left = (await listDocs(pid + '/')).filter(x => x.id);
    if (!left.length) docIds.delete(pid);
  } catch (e) { alert('No se pudo borrar: ' + e.message); }
  window.almaLoadDocs(pid); APP?.render();
};
/* Comprobantes de cobros (transferencias): espacio privado "comprobantes", carpeta = id del recibo */
const CBUCKET = 'comprobantes';
window.almaProbarAvisoMail = async () => {
  try {
    const t = await token();
    const r = await fetch(CFG.url + '/functions/v1/aviso-cobro', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + t }, body: JSON.stringify({ prueba: true }) });
    const tx = await r.text();
    alert(r.ok ? 'Listo: se envió un mail de prueba a los 4 socios desde info@almaviajeraturismo.com. Revisá la bandeja (y spam).' : 'No se pudo enviar el mail de prueba: ' + tx);
  } catch (e) { alert('No se pudo enviar el mail de prueba: ' + (e.message || e)); }
};
/* Envío del recibo al pasajero desde info@ (función "enviar-recibo"). Si el cobro recién se cargó
   y todavía no llegó al servidor, espera y reintenta unos segundos. */
window.almaEnviarRecibo = async (cobroId, to, subject, body, pdf) => {
  for (let i = 0; ; i++) {
    const t = await token();
    const r = await fetch(CFG.url + '/functions/v1/enviar-recibo', { method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + t },
      body: JSON.stringify({ cobro_id: cobroId, to, subject, body, pdf }) });
    if (r.ok) return true;
    const tx = await r.text();
    if (r.status === 404 && i < 8) { await new Promise(res => setTimeout(res, 2500)); continue; }
    throw new Error(tx || ('error ' + r.status));
  }
};
window.almaComprobantes = {
  async listar(rid) {
    const r = await storage('POST', 'object/list/' + CBUCKET,
      JSON.stringify({ prefix: rid + '/', limit: 20, offset: 0, sortBy: { column: 'created_at', order: 'asc' } }), JSONH);
    return (await r.json()).filter(x => x.id);
  },
  async subir(rid, file) {
    const p = await prepareFile(file);
    const name = 'comprobante-' + stamp() + '.' + p.ext;
    await storage('POST', 'object/' + CBUCKET + '/' + rid + '/' + name, p.blob, { 'Content-Type': p.type, 'x-upsert': 'true' });
    return name;
  },
  async abrir(rid, name) {
    const w = window.open('', '_blank');
    try {
      const blob = await (await storage('GET', 'object/authenticated/' + CBUCKET + '/' + rid + '/' + encodeURIComponent(name))).blob();
      const url = URL.createObjectURL(blob);
      if (w) w.location.href = url; else location.href = url;
    } catch (e) { if (w) w.close(); alert('No se pudo abrir el comprobante: ' + e.message); }
  }
};
/* Al eliminar un pasajero (botón de socios): borra todas las fotos de su pasaporte */
window.almaBorrarDocsPasajero = async pid => {
  try {
    const paths = [];
    for (const it of await listDocs(pid + '/')) {
      if (it.id) paths.push(pid + '/' + it.name);
      else for (const sub of await listDocs(pid + '/' + it.name + '/')) if (sub.id) paths.push(pid + '/' + it.name + '/' + sub.name);
    }
    if (paths.length) await storage('DELETE', 'object/' + BUCKET, JSON.stringify({ prefixes: paths }), JSONH);
    docIds.delete(pid);
  } catch (e) { alert('El pasajero se eliminó, pero no se pudieron borrar las fotos del pasaporte: ' + e.message); }
};
function notifyOk(t) { const el = $('toast'); if (!el) return; el.textContent = t; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 3000); }

/* Formulario de alta / edición: foto del pasaporte opcional, se sube al guardar */
function wireFormDoc() {
  const f = $('passengerForm'), inp = $('almaFormDoc');
  if (!f || !inp) return;
  let prevUrl = null, idsBefore = null;
  const clear = () => {
    inp.value = ''; $('almaFormDocInfo').textContent = 'Sin archivo'; $('almaFormDocPrev').innerHTML = '';
    if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
  };
  inp.addEventListener('change', () => {
    const file = inp.files?.[0];
    if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
    $('almaFormDocInfo').textContent = file ? file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB' : 'Sin archivo';
    const pv = $('almaFormDocPrev');
    if (file && /^image\//.test(file.type)) { prevUrl = URL.createObjectURL(file); pv.innerHTML = '<img alt="Vista previa del pasaporte" src="' + prevUrl + '">'; }
    else pv.innerHTML = file ? '<span class="alma-pdf">PDF</span>' : '';
  });
  const open = window.openPassengerForm;
  window.openPassengerForm = (...a) => { open(...a); clear(); };
  // antes del guardado de la app: qué pasajeros había
  f.addEventListener('submit', () => { idsBefore = new Set(APP.getState().passengers.map(p => p.id)); }, true);
  // después del guardado de la app: subir la foto a la ficha
  f.addEventListener('submit', async () => {
    const file = inp.files?.[0];
    if (!file || f.closest('dialog')?.open) return;          // sin foto, o la ficha no se guardó
    const st = APP.getState(), edit = f.elements.editId?.value;
    const pid = (edit && st.passengers.some(p => p.id === edit)) ? edit : st.passengers.find(p => !idsBefore?.has(p.id))?.id;
    clear();
    if (!pid) return;
    try { status('saving'); await replaceDocs(pid, file, null, docIds.has(pid) ? await currentDocs(pid) : []); APP.render(); status('ok'); }
    catch (e) { status('ok'); alert('La ficha se guardó, pero la foto del pasaporte no se pudo subir: ' + e.message + '\nPodés subirla desde «Ver ficha».'); }
  });
}

/* Carga masiva: cada archivo se llama como el Nº de pasaporte (o el DNI) del pasajero */
let bulk = [];
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
window.almaOpenBulk = () => { bulk = []; $('almaBulkFiles').value = ''; $('almaBulkList').innerHTML = ''; $('almaBulkMsg').textContent = ''; $('almaBulkGo').disabled = true; $('almaBulkDialog').showModal(); };
function bulkMatch(files) {
  const pp = APP.getState().passengers;
  const byPass = new Map(), byDoc = new Map();
  for (const p of pp) { if (p.passportNumber) byPass.set(norm(p.passportNumber), p); if (p.doc) byDoc.set(norm(p.doc), p); }
  return [...files].map(f => {
    const base = norm(f.name.replace(/\.[^.]+$/, '').replace(/\s*\(\d+\)$/, ''));
    return { file: f, p: byPass.get(base) || byDoc.get(base) || null, state: '' };
  });
}
function bulkRender() {
  const ok = bulk.filter(b => b.p).length;
  $('almaBulkList').innerHTML = '<p class="hint">' + ok + ' de ' + bulk.length + ' archivos coinciden con un pasajero.'
    + (ok < bulk.length ? ' Los que no coinciden no se suben.' : '') + '</p><div class="tablewrap"><table class="table"><thead><tr><th>Archivo</th><th>Pasajero</th><th></th></tr></thead><tbody>'
    + bulk.map(b => '<tr><td>' + esc(b.file.name) + '</td><td>' + (b.p ? esc(b.p.name) + (docIds.has(b.p.id) ? '<span class="sub">ya tiene foto · se reemplaza (la anterior queda guardada)</span>' : '') : '<span class="sub">Sin coincidencia</span>') + '</td><td>' + esc(b.state) + '</td></tr>').join('')
    + '</tbody></table></div>';
  $('almaBulkGo').disabled = !ok;
}
window.almaBulkPick = input => { bulk = bulkMatch(input.files || []); bulkRender(); };
window.almaBulkRun = async () => {
  const go = $('almaBulkGo'), msg = $('almaBulkMsg'); go.disabled = true;
  let done = 0, fail = 0; const todo = bulk.filter(b => b.p && b.state !== '✓');
  for (const b of todo) {
    b.state = 'Subiendo…'; bulkRender(); go.disabled = true;
    try { await replaceDocs(b.p.id, b.file, 'pasaporte-' + norm(b.p.passportNumber || b.p.doc) + '-' + stamp(), docIds.has(b.p.id) ? await currentDocs(b.p.id) : []); b.state = '✓'; done++; }
    catch (e) { b.state = '⚠ ' + e.message; fail++; }
    msg.textContent = 'Subidos ' + done + ' de ' + todo.length + (fail ? ' · ' + fail + ' con error' : '');
  }
  bulkRender(); go.disabled = true; APP?.render();
  msg.textContent = 'Listo: se subieron ' + done + ' archivo/s' + (fail ? '. ' + fail + ' no se pudieron subir (ver la lista).' : '.');
};


/* ------------------------------------------------------------------ */
/* Folleto de cada salida grupal (bucket público "folletos")           */
/* ------------------------------------------------------------------ */
const FBUCKET = 'folletos';
const isPdfUrl = u => /\.pdf(\?|$)/i.test(u || '');
window.almaFolleto = id => {
  const g = APP?.getState().groups.find(x => x.id === id);
  const ver = $('almaFolletoVer'), sub = $('almaFolletoSubirTxt');
  if (!ver || !g) return;
  ver.hidden = !g.brochure;
  if (sub) sub.textContent = g.brochure ? '↻ Reemplazar folleto' : '+ Subir folleto';
};
window.almaVerFolleto = () => {
  const g = APP?.getState().groups.find(x => x.id === window.currentGroupDetail);
  if (!g?.brochure) return;
  const url = g.brochure, d = $('almaFolletoDialog');
  $('almaFolletoTitulo').textContent = 'Folleto · ' + g.name;
  const prev = profile?.rol === 'socio' ? (g.folletos_anteriores || []) : [];
  $('almaFolletoCuerpo').innerHTML = (isPdfUrl(url)
    ? '<iframe src="' + esc(url) + '" title="Folleto"></iframe>'
    : '<img src="' + esc(url) + '" alt="Folleto de ' + esc(g.name) + '">')
    + (prev.length ? '<div class="alma-docs-old" style="text-align:left"><b class="sub">Folletos anteriores (solo socios)</b>'
      + prev.slice().reverse().map(x => '<div class="alma-old"><span class="sub">Reemplazado ' + esc(String(x.hasta || '').slice(0, 10).split('-').reverse().join('/')) + (x.por ? ' por ' + esc(x.por) : '') + '</span> <a class="btn ghost tiny" target="_blank" rel="noopener" href="' + esc(x.url) + '">Ver</a></div>').join('') + '</div>' : '');
  $('almaFolletoAbrir').href = url;
  d.dataset.url = url; d.dataset.name = g.name;
  $('almaFolletoCompartir').hidden = !navigator.share;
  d.showModal();
};
async function folletoArchivo(d) {
  const r = await fetch(d.dataset.url);
  if (!r.ok) throw new Error('No se pudo descargar el folleto.');
  const blob = await r.blob();
  const ext = isPdfUrl(d.dataset.url) ? 'pdf' : (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return new File([blob], 'Folleto ' + d.dataset.name + '.' + ext, { type: blob.type });
}
window.almaBajarFolleto = async () => {
  const d = $('almaFolletoDialog');
  try {
    const f = await folletoArchivo(d), url = URL.createObjectURL(f), a = document.createElement('a');
    a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) { window.open(d.dataset.url, '_blank'); }
};
window.almaCompartirFolleto = async () => {
  const d = $('almaFolletoDialog');
  try {
    const f = await folletoArchivo(d);
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: f.name });
    else await navigator.share({ title: 'Folleto ' + d.dataset.name, url: d.dataset.url });
  } catch (e) { if (e.name !== 'AbortError') alert('No se pudo compartir: ' + e.message); }
};
// Socios y vendedores: el cambio lo hace el servidor (cambiar_folleto) y guarda el anterior en el historial
window.almaSubirFolleto = async input => {
  const file = input.files?.[0]; input.value = '';
  const id = window.currentGroupDetail;
  const g = APP?.getState().groups.find(x => x.id === id);
  if (!file || !g) return;
  if (g.brochure && !await confirmReplace('Reemplazar folleto · ' + g.name, g.brochure, isPdfUrl(g.brochure), file)) return;
  const txt = $('almaFolletoSubirTxt'); if (txt) txt.textContent = 'Subiendo…';
  try {
    const p = await prepareFile(file);
    const path = id + '/' + safeName('folleto-' + stamp()) + '.' + p.ext;
    await storage('POST', 'object/' + FBUCKET + '/' + path, p.blob, { 'Content-Type': p.type, 'x-upsert': 'true' });
    await rest('POST', 'rpc/cambiar_folleto', { p_salida: id, p_url: CFG.url + '/storage/v1/object/public/' + FBUCKET + '/' + path });
    const row = (await rest('GET', 'salidas?select=*&id=eq.' + encodeURIComponent(id)))?.[0];
    if (row) {
      Object.assign(g, fromRow(row, MAPS.groups));
      snap.groups?.set(id, JSON.stringify(toRow(g, MAPS.groups)));  // ya está guardado en el servidor
    }
    notifyOk(g.folletos_anteriores?.length ? 'Folleto reemplazado. El anterior quedó guardado.' : 'Folleto subido.');
  } catch (e) { alert('No se pudo subir el folleto: ' + e.message); }
  window.almaFolleto(id);
};

// Folleto desde «Subir flyer» de Nueva/Editar salida: espera a que la salida esté guardada y lo sube
window.almaFolletoParaSalida = async (id, file) => {
  for (let i = 0; i < 40 && !snap.groups?.has(id); i++) await new Promise(r => setTimeout(r, 500));
  const g = APP?.getState().groups.find(x => x.id === id); if (!g) return;
  try {
    const p = await prepareFile(file);
    const path = id + '/' + safeName('folleto-' + stamp()) + '.' + p.ext;
    await storage('POST', 'object/' + FBUCKET + '/' + path, p.blob, { 'Content-Type': p.type, 'x-upsert': 'true' });
    await rest('POST', 'rpc/cambiar_folleto', { p_salida: id, p_url: CFG.url + '/storage/v1/object/public/' + FBUCKET + '/' + path });
    const row = (await rest('GET', 'salidas?select=*&id=eq.' + encodeURIComponent(id)))?.[0];
    if (row) { Object.assign(g, fromRow(row, MAPS.groups)); snap.groups?.set(id, JSON.stringify(toRow(g, MAPS.groups))); }
    notifyOk('Folleto guardado en la salida ' + g.name + '.'); APP?.render();
  } catch (e) { alert('La salida se guardó, pero no se pudo subir el folleto: ' + e.message + '. Podés subirlo desde la salida.'); }
};

/* Fotos de las cotizaciones (bucket público "cotizaciones"; lo usa cotizador.js) */
window.almaSubirFotoCot = async (blob, path) => {
  await storage('POST', 'object/cotizaciones/' + path, blob, { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' });
  return CFG.url + '/storage/v1/object/public/cotizaciones/' + path;
};
window.almaPerfil = () => ({ nombre: profile?.nombre || '', email: session?.user?.email || '', rol: profile?.rol || '', oficina: profile?.oficina || '' });

window.__almaSave = () => { if (APP) scheduleSave(); };
window.almaLogout = () => { if (syncing && !confirm('Hay cambios guardándose. ¿Salir igual?')) return; logout(false); };
window.almaRefresh = () => refresh(true);
window.almaOpenPassword = () => { $('almaPwForm').reset(); $('almaPwMsg').textContent = ''; $('almaPwDialog').showModal(); };

document.addEventListener('DOMContentLoaded', () => {
  $('almaLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('almaLoginBtn'); btn.disabled = true; $('almaLoginMsg').textContent = '';
    try {
      const email = $('almaEmail').value.trim().toLowerCase(), password = $('almaPass').value;
      const j = await auth('token?grant_type=password', { email, password });
      keepSession(j);
      lastMark = 0; markActivity();
      try { localStorage.setItem(EKEY, email); } catch (e) {}
      // Ofrecer guardar la contraseña en el navegador (Chrome / Android)
      try { if (window.PasswordCredential && navigator.credentials?.store) await navigator.credentials.store(new PasswordCredential({ id: email, password, name: email })); } catch (e) {}
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
