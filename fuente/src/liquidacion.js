/* Alma Viajera · lee la liquidación del proveedor (PDF o foto) y completa el compromiso.
   Formato probado: Be The World (sistema Pythagoras: «LIQUIDACION … FILE … TOTALES EN USD … Total Neto Agencia»).
   La lectura es gratis y corre en la computadora (pdf.js / Tesseract.js). */
(() => {
const ARR = () => window.__ALMA_APP?.getState?.() || {};
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const iso = d => { const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return ''; let y = +m[3]; if (y < 100) y += 2000; if (+m[1] === 0) return ''; return y + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0'); };
const num = s => { s = String(s || '').replace(/[^\d.,-]/g, ''); if (!s) return NaN; const c = s.lastIndexOf(','), p = s.lastIndexOf('.');
  if (c > -1 && p > -1) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c > -1) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (p > -1 && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  return Number(s); };
const menosDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
const titulo = s => String(s || '').toLowerCase().replace(/(^|[\s,(/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Y|De|Del|La|Las|Los|En)\b/g, w => w.toLowerCase());

/* Texto → datos */
function parsear(t) {
  t = String(t || '').replace(/\r/g, '');
  const r = { proveedor: '', ref: '', moneda: '', total: NaN, inicio: '', regreso: '', vtoReserva: '', sena: NaN, saldoDias: 0, destino: '', concepto: '', pax: [], venta: NaN, comision: NaN, comisionPct: '' };
  if (/BETHEWORLD|BE\s*THE\s*WORLD|\bBTW\b/i.test(t)) r.proveedor = 'Be The World';
  let m;
  if ((m = t.match(/\bFILE\s*:?\s*(\d{3,})/i))) r.ref = m[1];
  if ((m = t.match(/TOTALES\s+EN\s+(USD|U\$S|ARS|PESOS|\$)/i))) r.moneda = /ARS|PESOS|^\$$/i.test(m[1]) ? 'ARS' : 'USD';
  if ((m = t.match(/Total\s+Neto\s+Agencia\s*:?\s*(-?[\d.,]+)/i))) r.total = num(m[1]);
  if ((m = t.match(/Precio\s+de\s+venta\s*:?\s*(-?[\d.,]+)/i))) r.venta = num(m[1]);
  if ((m = t.match(/Comisi[oó]n\s*:?\s*(-?[\d.,]+)/i))) r.comision = Math.abs(num(m[1]));
  if ((m = t.match(/Comisiones\s+al\s+([\d.,]+)\s*%/i))) r.comisionPct = m[1].replace(/\.00$/, '');
  if ((m = t.match(/INICIO\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i))) r.inicio = iso(m[1]);
  if ((m = t.match(/REGRESO\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i))) r.regreso = iso(m[1]);
  if ((m = t.match(/VTO\.?\s*(?:DE\s*)?RESERVA\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i))) r.vtoReserva = iso(m[1]);
  if ((m = t.match(/Monto\s+M[ií]n\.?\s+Se[ñn]a\s*:?\s*(?:USD|U\$S|ARS|\$)?\s*([\d.,]+)/i))) r.sena = num(m[1]);
  if ((m = t.match(/DESTINO\s*:?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ,]{2,40}?)(?:\s{2,}|\n|$)/))) r.destino = m[1].trim();
  // Saldo: «Salidas Grupales: 60 dias antes de la salida…» (si el file es de salida grupal), si no «cupos aereos: 30 dias…»
  const grupal = /SALIDAS?\s+GRUPAL/i.test(t.split(/Pasajeros/i)[0] || t);
  if (grupal && (m = t.match(/Salidas\s+Grupales\s*:?\s*(\d+)\s*d[ií]as\s+antes/i))) r.saldoDias = +m[1];
  else if ((m = t.match(/cupos\s+a[eé]reos\s*:?\s*(\d+)\s*d[ií]as\s+antes/i)) && /AEREOS/i.test(t)) r.saldoDias = +m[1];
  // Servicios: título del circuito / paquete y rubros
  const rubros = [...t.matchAll(/>>>\s*([A-ZÁÉÍÓÚÑ ]+)/g)].map(x => x[1].trim()).filter(x => !/VARIOS/.test(x));
  const circ = t.match(/>>>\s*(?:CIRCUITOS?|PAQUETES?|HOTELES?|HOTELERIA)\s*\n\s*(?:[A-Z]{3}\s+)?(.+?)\s+\d{2}\/\d{2}\/\d{2}/i) || t.match(/SALIDA\s+GRUPAL\s+([A-ZÁÉÍÓÚÑ ,]+?)(?:\s{2,}|\s+\d{2}\/)/);
  r.concepto = [circ ? titulo(circ[1].replace(/\s+/g, ' ').trim()) : (r.destino ? titulo(r.destino) : ''), rubros.length ? '(' + rubros.map(x => x.toLowerCase()).join(', ') + ')' : ''].filter(Boolean).join(' ');
  // Pasajeros «APELLIDO / NOMBRE x1»
  const seen = new Set();
  for (const x of t.matchAll(/([A-ZÁÉÍÓÚÑ'][A-ZÁÉÍÓÚÑ' ]{1,40}?)\s*\/\s*([A-ZÁÉÍÓÚÑ'][A-ZÁÉÍÓÚÑ' ]{0,40}?)\s*x\s*\d+/g)) {
    const ap = x[1].replace(/^.*(?:PAX|PASAJEROS?)\s*:?\s*/i, '').trim(), no = x[2].trim(), k = ap + '/' + no;
    if (ap && no && !seen.has(k) && !/^(TE|WSP)$/i.test(ap)) { seen.add(k); r.pax.push({ apellido: ap, nombre: no }); } }
  return r;
}

/* Busca al pasajero en la base (el último nombre puede venir cortado: «LETICI») y su viaje */
function buscarReserva(r) {
  const s = ARR(), ps = s.passengers || [], bs = s.bookings || [], gs = s.groups || [];
  const cand = [];
  for (const px of r.pax) {
    const ap = norm(px.apellido).split(' '), no = norm(px.nombre).split(' ');
    for (const p of ps) { const tk = norm(p.name).split(' ');
      const okAp = ap.every(a => tk.includes(a)), okNo = no.every(n => tk.some(w => w.startsWith(n) || n.startsWith(w) && w.length >= 3));
      if (okAp && okNo) cand.push(p); } }
  const res = [];
  for (const p of cand) for (const b of bs) {
    if (b.passengerId !== p.id && !(b.companions || []).includes(p.id)) continue;
    if (String(b.status || '').match(/baja|cancel/i)) continue;
    const g = b.kind === 'grupal' ? gs.find(x => x.id === b.groupId) : null, dep = g ? g.departure : b.departure;
    const dif = r.inicio && dep ? Math.abs((new Date(dep) - new Date(r.inicio)) / 864e5) : 99;
    res.push({ p, b, g, dif }); }
  res.sort((a, z) => a.dif - z.dif);
  return { pasajeros: cand, mejor: res[0] && res[0].dif <= 4 ? res[0] : (res.length === 1 ? res[0] : null), todas: res };
}

/* Archivo → texto */
let tess = null, pdfjs = null;
const cargar = (src, glob) => new Promise((ok, ko) => { if (window[glob]) return ok(window[glob]); const s = document.createElement('script'); s.src = src; s.onload = () => ok(window[glob]); s.onerror = () => ko(new Error('No se pudo cargar el lector (revisá la conexión).')); document.head.appendChild(s); });
const T = () => tess || (tess = cargar('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract').catch(e => { tess = null; throw e; }));
const P = () => pdfjs || (pdfjs = cargar('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'pdfjsLib').then(L => { if (!L.GlobalWorkerOptions.workerSrc) L.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; return L; }).catch(e => { pdfjs = null; throw e; }));
function lineas(items) {
  const its = items.filter(t => String(t.str).trim()).map(t => ({ s: t.str, x: t.transform[4], y: t.transform[5], w: t.width || 0 }));
  its.sort((a, b) => b.y - a.y || a.x - b.x); const ls = [];
  for (const t of its) { const l = ls.find(l => Math.abs(l.y - t.y) < 3); if (l) l.it.push(t); else ls.push({ y: t.y, it: [t] }); }
  return ls.map(l => { l.it.sort((a, b) => a.x - b.x); let s = '', px = null; for (const t of l.it) { s += (px !== null ? (t.x - px > 8 ? '   ' : ' ') : '') + t.s; px = t.x + t.w; } return s; }).join('\n');
}
async function leerTexto(file, cb) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const L = await P(), doc = await L.getDocument({ data: await file.arrayBuffer() }).promise; let txt = '';
    for (let i = 1; i <= Math.min(doc.numPages, 4); i++) { const pg = await doc.getPage(i), tc = await pg.getTextContent(), t = lineas(tc.items);
      if (t.replace(/\s/g, '').length > 40) { txt += '\n' + t; continue; }
      const vp = pg.getViewport({ scale: 2 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      txt += '\n' + (await (await T()).recognize(c, 'spa', { logger: m => { if (m.status === 'recognizing text' && cb) cb(Math.round(m.progress * 100)); } })).data.text; }
    return txt; }
  const bmp = await createImageBitmap(file), k = Math.max(1, Math.min(2.5, 2200 / bmp.width)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.filter = 'grayscale(1) contrast(1.3)'; x.drawImage(bmp, 0, 0, c.width, c.height);
  return (await (await T()).recognize(c, 'spa', { logger: m => { if (m.status === 'recognizing text' && cb) cb(Math.round(m.progress * 100)); } })).data.text;
}
async function leer(file, cb) { const txt = await leerTexto(file, cb), r = parsear(txt); r.texto = txt; r.match = buscarReserva(r);
  r.saldo = r.inicio && r.saldoDias ? menosDias(r.inicio, r.saldoDias) : '';
  r.vence = [r.vtoReserva, r.saldo].filter(Boolean).sort()[0] || '';
  return r; }
const fmtD = d => d ? d.split('-').reverse().join('/') : '';
const fmtN = (n, c) => (c || '') + ' ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function notas(r) { return ['Liquidación ' + (r.proveedor || 'del proveedor') + (r.ref ? ' · File ' + r.ref : ''),
  r.vtoReserva ? 'Vence la reserva: ' + fmtD(r.vtoReserva) : '', r.saldo ? 'Saldar ' + r.saldoDias + ' días antes de la salida: ' + fmtD(r.saldo) : '',
  isFinite(r.venta) ? 'Precio de venta ' + fmtN(r.venta, r.moneda) : '', isFinite(r.comision) ? 'Comisión ' + fmtN(r.comision, r.moneda) + (r.comisionPct ? ' (' + r.comisionPct + ' %)' : '') : '',
  isFinite(r.total) ? 'Total neto agencia ' + fmtN(r.total, r.moneda) : ''].filter(Boolean).join(' · '); }
window.almaLiq = { parsear, buscarReserva, leer, notas, fmtD, fmtN };

/* Formulario «Registrar gasto / compromiso»: al elegir la liquidación, completa los campos */
function aviso(html, tipo) { let a = document.getElementById('almaLiqAviso'); const inp = document.getElementById('almaLiqNueva'); if (!inp) return;
  if (!a) { inp.closest('label').insertAdjacentHTML('afterend', '<div class="field full infobox" id="almaLiqAviso"></div>'); a = document.getElementById('almaLiqAviso'); }
  a.style.display = html ? '' : 'none'; a.innerHTML = html || ''; a.style.background = tipo === 'error' ? '#fff1e8' : tipo === 'ok' ? '#eef8f1' : ''; }
async function alElegir(inp) {
  const f = document.getElementById('expenseForm'), file = inp.files?.[0]; delete f.dataset.almaReemplaza; if (!file) { aviso(''); return; }
  aviso('⏳ Leyendo la liquidación…');
  let r; try { r = await leer(file, p => aviso('⏳ Leyendo la liquidación… ' + p + ' %')); } catch (e) { aviso('No se pudo leer el archivo: ' + e.message + '. Completá los datos a mano.', 'error'); return; }
  if (!isFinite(r.total) && !r.ref) { aviso('No reconocí el formato de esta liquidación. Queda adjunta igual; completá los datos a mano.', 'error'); return; }
  const s = ARR(), E = f.elements, hechos = [];
  if (r.proveedor && !E.providerId.value) { const pr = (s.providers || []).find(p => norm(p.name).replace(/ /g, '').includes(norm(r.proveedor).replace(/ /g, ''))); if (pr) { E.providerId.value = pr.id; window.refreshExpenseFiles?.(); hechos.push('Proveedor: <b>' + pr.name + '</b>'); } }
  const mb = r.match.mejor;
  if (mb) { const key = mb.b.kind === 'grupal' ? 'G:' + mb.b.groupId : 'B:' + mb.b.id, sel = E.operationKey;
    if ([...sel.options].some(o => o.value === key)) { sel.value = key; sel.dispatchEvent(new Event('change')); }
    f.dataset.almaBooking = mb.b.id; hechos.push('Pasajero: <b>' + mb.p.name + '</b> · ' + (mb.g ? 'salida ' + mb.g.name : (mb.b.tour || 'viaje')));
  } else if (r.pax.length) hechos.push('<span style="color:#aa431d">No encontré a ' + r.pax.map(x => x.apellido + ' / ' + x.nombre).join(', ') + ' en la base: elegí el file a mano.</span>');
  if (r.ref) { E.supplierRef.value = r.ref; hechos.push('File del proveedor: <b>' + r.ref + '</b>'); }
  if (r.concepto && !E.concept.value) { E.concept.value = (mb ? mb.p.name + ' · ' : r.pax[0] ? titulo(r.pax[0].apellido) + ' · ' : '') + r.concepto; }
  if (/circuito|paquete/i.test(r.concepto) && E.category) E.category.value = 'Operador mayorista';
  if (r.moneda) E.currency.value = r.moneda;
  if (isFinite(r.total)) { E.amount.value = r.total.toFixed(2); hechos.push('Importe: <b>' + fmtN(r.total, r.moneda) + '</b> (total neto agencia)'); }
  if (isFinite(r.sena) && r.sena > 0) E.depositAmount.value = r.sena.toFixed(2);
  const setFecha = (el, d) => { if (!el || !d) return; if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === d)) el.add(new Option(fmtD(d), d)); el.value = d; };
  if (r.vtoReserva && isFinite(r.sena) && r.sena > 0) setFecha(E.depositDueDate, r.vtoReserva);
  if (r.vence) { setFecha(E.dueDate, r.vence); hechos.push('Vence: <b>' + fmtD(r.vence) + '</b>' + (r.saldo && r.vtoReserva && r.saldo !== r.vtoReserva ? ' <span class="sub" style="display:inline">(reserva ' + fmtD(r.vtoReserva) + ' · saldo ' + r.saldoDias + ' días antes: ' + fmtD(r.saldo) + ')</span>' : '')); }
  E.notes.value = [notas(r), E.notes.value].filter(Boolean).join('\n');
  // Si el pasajero ya tiene el compromiso automático con este proveedor, se actualiza ese en lugar de duplicarlo
  let rep = '';
  if (mb) { const ex = (s.expenses || []).find(e => e.bookingId === mb.b.id && e.providerId === E.providerId.value);
    if (ex) { f.dataset.almaReemplaza = ex.id; rep = '<br>⚠️ Este pasajero ya tiene un compromiso con ' + (ex.provider || 'este proveedor') + ' por <b>' + fmtN(ex.amount, ex.currency) + '</b>. Al guardar <b>se actualiza ese compromiso</b> con los datos de la liquidación (no se duplica).'; } }
  aviso('✅ <b>Datos leídos de la liquidación</b> — revisalos antes de guardar:<br>' + hechos.join('<br>') + rep, 'ok');
}
document.addEventListener('change', e => { if (e.target?.id === 'almaLiqNueva') alElegir(e.target); });
// Guardar: si corresponde, actualizar el compromiso existente en vez de crear otro
document.addEventListener('submit', e => {
  const f = e.target; if (f?.id !== 'expenseForm') return;
  const s = ARR(), bid = f.dataset.almaBooking, rid = f.dataset.almaReemplaza; delete f.dataset.almaBooking; delete f.dataset.almaReemplaza;
  const ex = rid && (s.expenses || []).find(x => x.id === rid);
  if (!ex) { if (bid) window.__almaLiqBooking = bid; return; }
  e.preventDefault(); e.stopImmediatePropagation();
  const E = f.elements, amount = Number(E.amount.value);
  if (!(amount > 0)) { alert('Completá un importe válido'); return; }
  const pagado = (s.supplierPayments || []).filter(p => p.expenseId === ex.id).reduce((a, p) => a + Number(p.amount || 0), 0);
  if (amount < pagado - .001) { alert('Ya se le pagaron ' + fmtN(pagado, ex.currency) + ' a este compromiso: el importe no puede ser menor.'); return; }
  Object.assign(ex, { amount, currency: E.currency.value, supplierRef: E.supplierRef.value, concept: E.concept.value || ex.concept, category: E.category.value, dueDate: E.dueDate.value || ex.dueDate || '', depositDueDate: E.depositDueDate.value || '', depositAmount: E.depositAmount.value === '' ? '' : Number(E.depositAmount.value), notes: E.notes.value });
  const files = [...(document.getElementById('almaLiqNueva')?.files || [])]; document.getElementById('almaLiqNueva').value = ''; aviso('');
  window.almaLiqActualizado?.(ex, files);
}, true);
// Al abrir el formulario, limpiar el aviso
for (const fn of ['openExpense', 'openGroupExpense']) { const o = window[fn]; if (typeof o === 'function') window[fn] = (...a) => { const r = o(...a); aviso(''); const f = document.getElementById('expenseForm'); if (f) { delete f.dataset.almaReemplaza; delete f.dataset.almaBooking; } return r; }; }
})();
