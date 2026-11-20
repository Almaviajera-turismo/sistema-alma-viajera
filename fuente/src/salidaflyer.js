/* Alma Viajera · «Subir flyer» en Nueva / Editar salida grupal: lee el folleto (imagen o PDF) y completa los datos.
   La lectura es gratis y corre en la computadora (Tesseract.js / pdf.js). El flyer queda como folleto de la salida. */
(() => {
'use strict';
function leerSalida(texto, archivo) {
  const MES = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12 };
  const tc = s => s.toLowerCase().replace(/(^|[\s(\-/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y|E|Por|En|A)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase()).replace(/\bEeuu\b/g, 'EEUU');
  let t = String(texto || '').replace(/\r/g, '').replace(/U\s*[\$S]\s*[DS]\b/g, 'USD').replace(/—|–/g, '-');
  const lines = t.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const r = { name: '', destination: '', departure: '', returnDate: '', price: '', currency: '', taxes: '', adminFee: '', scope: '', description: '', avisos: [] };
  const NO = /^(ALMA|VIAJERA|TURISMO|SALIDA|GRUPAL|VALOR|TARIFA|POR PERSONA|INCLUYE|USD|EN BASE|ASEGUR|CONTACT|OPERADOR|COORDINADOR)/;
  // nombre: primeros renglones en mayúsculas grandes (1 a 4 palabras) antes de la lista de ciudades / precios
  const tit = [];
  for (const l of lines.slice(0, 10)) { const x = l.replace(/[^\p{L} ]/gu, '').trim(); const w = x.split(' ').filter(Boolean);
    if (x.length >= 4 && w.length <= 4 && x === x.toUpperCase() && !NO.test(x) && !/ - /.test(l) && !/\d/.test(l)) { tit.push(x); if (tit.length >= 3) break; } else if (tit.length) break; }
  if (tit.length) r.name = tc(tit.join(' '));
  else if (archivo) { const b = archivo.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\b(flyer|folleto|final|copia|\d+)\b/gi, '').trim(); if (b.length > 3) { r.name = tc(b); r.avisos.push('El nombre salió del nombre del archivo'); } }
  // destino: renglones con ciudades separadas por « - »
  const ciu = []; let enLista = false;
  for (const l0 of lines) { const l = l0.replace(/\s*-+[\s-]*/g, ' - '); const sep = (l.match(/ - /g) || []).length;
    const cont = enLista && !/\d/.test(l) && l === l.toUpperCase() && /\p{L}{3}/u.test(l) && !/SALIDA|INCLUYE|TARIFA|VALOR/.test(l);
    if ((sep >= 2 && /\p{L}{3}/u.test(l) && !/\d{2}:\d{2}/.test(l)) || (enLista && sep >= 1) || cont) { ciu.push(l.replace(/^[^\p{L}(]+/u, '').replace(/[^\p{L})]+$/u, '')); enLista = true; } else if (enLista) break; }
  if (ciu.length) r.destination = tc(ciu.join(' ').replace(/\s*-\s*/g, ' - ').replace(/ - (?=\S)/g, ' - ').replace(/\s+/g, ' ')).replace(/ - $/, '').replace(/\(([^)]*)\)/, (m, a) => '(' + a.toLowerCase() + ')');
  // fechas: «13 DE ABRIL», «21 de febrero de 2027», 21/02/2027
  const hoy = new Date(); const fechas = []; let m;
  const reF = /(\d{1,2})\s*de\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s*(?:de|del)?\s*(\d{4}))?|(\d{1,2})\/(\d{1,2})\/(\d{2,4})/gi;
  while ((m = reF.exec(t))) { let y, mo, d;
    if (m[1]) { d = +m[1]; mo = MES[m[2].toLowerCase()]; y = m[3] ? +m[3] : null; } else { d = +m[4]; mo = +m[5]; y = +m[6]; if (y < 100) y += 2000; }
    if (!y) { y = hoy.getFullYear(); if (new Date(y, mo - 1, d) < hoy) y++; r.avisos.push('Año supuesto: ' + y); }
    fechas.push(y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0')); }
  const fs = [...new Set(fechas)].sort(); r.avisos = [...new Set(r.avisos)];
  if (fs[0]) r.departure = fs[0];
  if (fs[1]) r.returnDate = fs[fs.length - 1];
  else if (r.departure) { const dd = t.match(/(\d{1,2})\s*d[ií]as/i), nn = t.match(/(\d{1,2})\s*noches/i);
    const n = dd ? +dd[1] - 1 : nn ? +nn[1] : 0; if (n > 0) { const f = new Date(r.departure + 'T12:00:00'); f.setDate(f.getDate() + n); r.returnDate = f.toISOString().slice(0, 10); r.avisos.push('Regreso calculado por ' + (dd ? dd[1] + ' días' : nn[1] + ' noches') + ' (provisorio)'); } }
  // moneda y precio por persona (el mayor importe que no sea un «+ adicional»)
  r.currency = /USD|U\$S|d[oó]lares/i.test(t) ? 'USD' : /EUR|€/.test(t) ? 'EUR' : /\$|ARS|pesos/i.test(t) ? 'ARS' : '';
  const num = s => { s = s.replace(/[^\d.,]/g, ''); if (/,\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/[.,]/g, ''); return Number(s); };
  const precios = [];
  for (const l of lines) { if (/^\s*\+|impuesto|gastos|reserva|tasas/i.test(l)) continue; const s = l.replace(/\)/g, ' ');
    for (const x of s.matchAll(/(?:USD|U\$S|\$|EUR)\s*((?:\d[\d .,]{0,8})\d)|((?:\d[\d .,]{0,8})\d)\s*(?:USD|EUR)/g)) { const v = num((x[1] || x[2]).replace(/ /g, '')); if (v >= 100 && v < 500000) precios.push(v); } }
  if (precios.length) r.price = Math.max(...precios);
  m = t.match(/\+?\s*((?:USD|U\$S|\$)\s*\d[\d.,]*|\d[\d.,]*\s*USD)\s*(?:de\s*)?impuestos?|impuestos?:?\s*(?:USD|U\$S|\$)?\s*(\d[\d.,]*)/i); if (m) r.taxes = num(m[1] || m[2]);
  m = t.match(/gastos\s*(?:de\s*reserva|administrativos?)\s*:?\s*(?:USD|U\$S|\$)?\s*(\d[\d.,]*)/i); if (m) r.adminFee = num(m[1]);
  // nacional / internacional
  r.scope = /argentina|bariloche|salta|jujuy|mendoza|iguaz[uú]|ushuaia|calafate|c[oó]rdoba|mar del plata|tucum[aá]n|neuqu[eé]n|puerto madryn|tierra del fuego|patagonia/i.test(t) ? 'Nacional' : (r.destination || r.name ? 'Internacional' : '');
  // servicios incluidos (frases conocidas)
  const S = [/salida grupal acompa[ñn]ada/i, /boletos? a[eé]reos?[^\n·]{0,20}|a[eé]reos(?: ida y vuelta)?/i, /traslados(?: y excursiones)?/i, /alojamiento por \d+ noches/i, /\d+\s*d[ií]as/i, /\d+\s*noches/i,
    /desayuno(?: buffet)?/i, /media pensi[oó]n|pensi[oó]n completa|all inclusive/i, /\d+\s*comidas/i, /coordinador(?: acompa[ñn]ante| y gu[ií]as durante todo el recorrido)?/i, /excursiones/i, /seguro de viaje|asistencia al viajero/i, /operador responsable [\p{L} ]+/iu];
  const serv = [];
  for (const re of S) { const x = t.match(re); if (x) { let v = x[0].replace(/\s+/g, ' ').trim().replace(/[.,;:]+$/, ''); v = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(); if (!serv.some(o => o.toLowerCase().includes(v.toLowerCase()))) serv.push(v); } }
  r.description = serv.join(' · ').replace(/operador responsable ([\p{L}])/iu, (m, c) => 'Operador responsable ' + c.toUpperCase());
  return r;
}

let tess = null, pdfjs = null;
const cargar = (src, glob) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(window[glob]); s.onerror = () => ko(new Error('No se pudo cargar el lector (revisá la conexión).')); document.head.appendChild(s); });
const T = () => tess || (tess = cargar('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract').catch(e => { tess = null; throw e; }));
const P = () => pdfjs || (pdfjs = cargar('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'pdfjsLib').then(L => { L.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; return L; }).catch(e => { pdfjs = null; throw e; }));
async function lienzos(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const L = await P(), doc = await L.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
    for (let i = 1; i <= Math.min(doc.numPages, 4); i++) { const pg = await doc.getPage(i), tc = await pg.getTextContent();
      let t = '', y = null; for (const it of tc.items) { const yy = Math.round(it.transform[5]); t += (y !== null && Math.abs(yy - y) > 3 ? '\n' : ' ') + it.str; y = yy; }
      if (t.replace(/\s/g, '').length > 40) { out.push(t); continue; }
      const vp = pg.getViewport({ scale: 2 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; out.push(c); }
    return out;
  }
  const bmp = await createImageBitmap(file), k = Math.max(1, Math.min(2.5, 2000 / bmp.width)), mk = f => { const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); const x = c.getContext('2d'); x.filter = f; x.drawImage(bmp, 0, 0, c.width, c.height); return c; };
  return [mk('grayscale(1) contrast(1.3)'), mk('grayscale(1) invert(1) contrast(1.3)')];   // dos pasadas: texto oscuro y texto blanco sobre foto
}
async function leerArchivo(file, cb) { let txt = ''; const ls = await lienzos(file);
  for (let i = 0; i < ls.length; i++) { if (typeof ls[i] === 'string') { txt += '\n' + ls[i]; continue; } const Tz = await T();
    txt += '\n' + (await Tz.recognize(ls[i], 'spa', { logger: m => { if (m.status === 'recognizing text') cb(Math.round((i + m.progress) / ls.length * 100)); } })).data.text; }
  return txt; }
window.almaLeerFlyerSalida = async (file, cb = () => {}) => leerSalida(await leerArchivo(file, cb), file.name);
window.__almaLeerSalidaTexto = leerSalida;

const $ = id => document.getElementById(id);
let pendiente = null;
function caja() {
  const f = $('groupForm'); if (!f || $('almaSfBox')) return;
  const box = document.createElement('div'); box.id = 'almaSfBox'; box.className = 'alma-sf';
  box.innerHTML = '<label class="btn ghost tiny" style="cursor:pointer">📎 Subir flyer de la salida<input type="file" id="almaSfFile" accept="image/*,application/pdf" hidden></label><span class="sub" id="almaSfEst" style="display:inline">Completa nombre, destino, fechas, precio, impuestos y servicios. El flyer queda como folleto de la salida.</span><div id="almaSfRes"></div>';
  const first = f.querySelector('.field, label'); (first?.parentElement || f).insertBefore(box, first);
  box.querySelector('#almaSfFile').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return; const est = $('almaSfEst'), res = $('almaSfRes'); res.innerHTML = '';
    try { est.textContent = 'Leyendo el flyer…'; const r = await window.almaLeerFlyerSalida(file, p => est.textContent = 'Leyendo el flyer… ' + p + ' %'); aplicar(f, r, file); }
    catch (er) { est.textContent = ''; alert(er.message || 'No se pudo leer el flyer'); }
  };
}
function aplicar(f, r, file) {
  const editando = !!window.__almaEditGroup;
  const campos = [['name', 'Nombre'], ['destination', 'Destino'], ['scope', 'Nacional / internacional'], ['departure', 'Salida'], ['returnDate', 'Regreso'], ['price', 'Precio por pasajero'], ['currency', 'Moneda'], ['taxes', 'Impuestos'], ['adminFee', 'Gastos administrativos'], ['description', 'Programa y servicios']];
  const ocupados = campos.filter(([k]) => r[k] !== '' && f.elements[k] && f.elements[k].value && String(f.elements[k].value) !== String(r[k]) && !(k === 'currency'));
  if (editando && ocupados.length && !confirm('El flyer trae datos distintos en: ' + ocupados.map(c => c[1]).join(', ') + '.\n¿Reemplazarlos?')) return;
  const puestos = [];
  for (const [k, t] of campos) { const el = f.elements[k]; if (!el || r[k] === '' || r[k] == null) continue; if (k === 'description' && el.value && !editando) { el.value = el.value + '\n' + r[k]; } else el.value = r[k]; puestos.push(t); el.classList.add('alma-sf-ok'); setTimeout(() => el.classList.remove('alma-sf-ok'), 4000); }
  f.dispatchEvent(new Event('input', { bubbles: true })); f.elements.departure?.dispatchEvent(new Event('change', { bubbles: true }));
  pendiente = file;
  const falta = campos.filter(([k]) => f.elements[k] && !f.elements[k].value).map(c => c[1]);
  $('almaSfEst').textContent = '✓ Datos tomados del flyer: ' + (puestos.join(', ') || 'ninguno') + '.';
  $('almaSfRes').innerHTML = (r.avisos.length ? '<p class="sub" style="color:#8a5a00;margin:4px 0 0">Revisá: ' + r.avisos.join(' · ') + '.</p>' : '') + (falta.length ? '<p class="sub" style="margin:2px 0 0">Completá a mano: ' + falta.join(', ') + '.</p>' : '') + '<p class="sub" style="margin:2px 0 0">📄 ' + file.name.replace(/[<>&]/g, '') + ' se guarda como folleto de la salida al tocar «Guardar salida».</p>';
}
// al guardar: el flyer queda como folleto de la salida (nueva o editada)
document.addEventListener('submit', e => {
  if (e.target?.id !== 'groupForm' || !pendiente) return;
  const file = pendiente, st = window.__ALMA_APP?.getState?.(), antes = new Set((st?.groups || []).map(g => g.id)), editId = window.__almaEditGroup || '';
  pendiente = null;
  setTimeout(() => { const gs = window.__ALMA_APP?.getState?.().groups || []; const g = editId ? gs.find(x => x.id === editId) : gs.find(x => !antes.has(x.id));
    if (g && window.almaFolletoParaSalida) window.almaFolletoParaSalida(g.id, file); else pendiente = file; }, 300);
}, true);
const obs = new MutationObserver(() => { const f = $('groupForm'); if (f && !$('almaSfBox')) caja(); });
obs.observe(document.documentElement, { childList: true, subtree: true }); caja();
// limpiar al abrir el formulario
document.addEventListener('click', e => { if (e.target.closest?.('[onclick*="openGroup"], [onclick*="almaEditarSalida"]')) { pendiente = null; setTimeout(() => { if ($('almaSfRes')) $('almaSfRes').innerHTML = ''; if ($('almaSfEst')) $('almaSfEst').textContent = 'Completa nombre, destino, fechas, precio, impuestos y servicios. El flyer queda como folleto de la salida.'; }, 50); } }, true);
})();
