/* Alma Viajera · «Pegar vuelo de Sci Web» en el cotizador: lee el texto (o una captura) del itinerario y completa el aéreo */
(() => {
'use strict';
const MESES = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12 };
const AEROLINEAS = { LA:'LATAM', JJ:'LATAM', '4M':'LATAM', XL:'LATAM', AR:'Aerolíneas Argentinas', G3:'GOL', AD:'Azul', JA:'JetSMART', WJ:'JetSMART', H2:'Sky Airline', FO:'Flybondi',
  CM:'Copa Airlines', AV:'Avianca', IB:'Iberia', UX:'Air Europa', AA:'American Airlines', DL:'Delta', UA:'United', AF:'Air France', KL:'KLM', LH:'Lufthansa', TK:'Turkish Airlines',
  EK:'Emirates', QR:'Qatar Airways', AZ:'ITA Airways', TP:'TAP Air Portugal', LX:'Swiss', BA:'British Airways', AM:'Aeroméxico', ET:'Ethiopian', AC:'Air Canada', O6:'Avianca Brasil', '2Z':'Voepass', PZ:'Paranair' };
const CIUDADES = { EZE:'Buenos Aires', AEP:'Buenos Aires', BUE:'Buenos Aires', GRU:'San Pablo', CGH:'San Pablo', VCP:'Campinas', GIG:'Río de Janeiro', SDU:'Río de Janeiro', NAT:'Natal',
  REC:'Recife', SSA:'Salvador', FOR:'Fortaleza', MCZ:'Maceió', JPA:'João Pessoa', AJU:'Aracaju', FLN:'Florianópolis', BPS:'Porto Seguro', IGU:'Foz do Iguaçu', CWB:'Curitiba', POA:'Porto Alegre',
  BSB:'Brasilia', CNF:'Belo Horizonte', NVT:'Navegantes', CFB:'Cabo Frío', BNU:'Blumenau', COR:'Córdoba', MDZ:'Mendoza', BRC:'Bariloche', FTE:'El Calafate', USH:'Ushuaia', IGR:'Iguazú',
  SLA:'Salta', JUJ:'Jujuy', TUC:'Tucumán', NQN:'Neuquén', REL:'Trelew', PMY:'Puerto Madryn', MDQ:'Mar del Plata', ROS:'Rosario', CRD:'Comodoro Rivadavia', RGL:'Río Gallegos',
  MVD:'Montevideo', PDP:'Punta del Este', SCL:'Santiago de Chile', LIM:'Lima', CUZ:'Cusco', BOG:'Bogotá', CTG:'Cartagena', ADZ:'San Andrés', PTY:'Panamá', CUN:'Cancún', MEX:'Ciudad de México',
  PUJ:'Punta Cana', SDQ:'Santo Domingo', HAV:'La Habana', VRA:'Varadero', AUA:'Aruba', CUR:'Curazao', MIA:'Miami', MCO:'Orlando', FLL:'Fort Lauderdale', JFK:'Nueva York', EWR:'Nueva York',
  LAX:'Los Ángeles', LAS:'Las Vegas', SFO:'San Francisco', MAD:'Madrid', BCN:'Barcelona', FCO:'Roma', MXP:'Milán', LIS:'Lisboa', OPO:'Oporto', CDG:'París', ORY:'París', LHR:'Londres',
  AMS:'Ámsterdam', FRA:'Fráncfort', IST:'Estambul', DXB:'Dubái', DOH:'Doha', ATH:'Atenas', ASU:'Asunción', VVI:'Santa Cruz de la Sierra', UIO:'Quito', GYE:'Guayaquil' };
const tc = s => String(s || '').toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

/* ---------- lector del texto ---------- */
function leer(texto) {
  const lines = String(texto || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const r = { secciones: [], precio: null, moneda: '', cabina: '', tarifa: '' };
  let sec = null, seg = null, ultimo = null, esperaDur = false, antesDeIda = true, monedaSuelta = '';
  const nuevoSeg = () => { seg = { vuelo: '', operado: '', fSale: '', origen: '', hSale: '', aOrig: '', fLlega: '', mas1: false, destino: '', hLlega: '', aDest: '', espera: '', cambioAeropuerto: false }; sec.segs.push(seg); return seg; };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // precio: «USD 604,41» o «USD» y en el renglón siguiente «604,41»
    let m = l.match(/^(USD|ARS|EUR|U\$S)\s*([\d.]+,\d{2}|\d+(?:\.\d{2})?)$/i);
    if (m && r.precio == null) { r.moneda = m[1].toUpperCase().replace('U$S', 'USD'); r.precio = num(m[2]); continue; }
    if (/^(USD|ARS|EUR)$/i.test(l)) { monedaSuelta = l.toUpperCase(); continue; }
    if (monedaSuelta && /^[\d.]+,\d{2}$/.test(l) && r.precio == null) { r.moneda = monedaSuelta; r.precio = num(l); monedaSuelta = ''; continue; }
    monedaSuelta = '';
    // inicio de Ida / Vuelta
    m = l.match(/^\W*(ida|vuelta|regreso)\b/i);
    if (m && l.length < 80) { sec = { tipo: /ida/i.test(m[1]) ? 'ida' : 'vuelta', segs: [], duracion: '' }; r.secciones.push(sec); seg = null; ultimo = null; antesDeIda = false;
      const d = l.match(/(\d{1,2}h\s?\d{1,2}m)/); if (d && /duraci/i.test(l)) sec.duracion = d[1]; continue; }
    if (antesDeIda || !sec) continue;
    if (/duraci[oó]n total/i.test(l)) { const d = l.match(/(\d{1,2}h\s?\d{1,2}m)/); if (d) sec.duracion = d[1]; else esperaDur = true; continue; }
    if (esperaDur) { const d = l.match(/^(\d{1,2}h\s?\d{1,2}m)$/); if (d) { sec.duracion = d[1]; esperaDur = false; continue; } }
    if (/^(econ[oó]mica|premium|business|ejecutiva|primera)/i.test(l) && !r.cabina) r.cabina = tc(l.split(' ')[0]);
    { const t = l.match(/\b(BASIC|LIGHT|PLUS|TOP|FULL|STANDARD|CLASSIC|FLEX|SMART|PROMO)\b/); if (t && !r.tarifa) r.tarifa = t[1]; }
    m = l.match(/espera de (\d{1,2}h\s?\d{1,2}m)/i);
    if (m) { if (seg) { seg.espera = m[1]; seg.cambioAeropuerto = /cambio de aeropuerto/i.test(l); } continue; }
    m = l.match(/operado por:?\s*([A-Z0-9]{2})/i);
    if (m) { if (seg) seg.operado = m[1].toUpperCase(); continue; }
    // tramos: en un mismo renglón puede haber número de vuelo, fecha, salida y llegada (capturas)
    const ev = [];
    const push = (re, t) => { let x; const g = new RegExp(re.source, 'g'); while ((x = g.exec(l))) ev.push({ t, i: x.index, x }); };
    push(/\b([A-Z][A-Z0-9]|[0-9][A-Z])\s?(\d{2,4})\b(?!\s*(?:de|h|m)\b)(?!:)/, 'vuelo');
    push(/(\d{1,2}) de ([a-záéíóú]+) de (\d{4})\s*(\(\+1\))?/i, 'fecha');
    push(/\b([A-Z]{3}) (\d{1,2}:\d{2})\b/, 'sale');
    push(/\b(\d{1,2}:\d{2}) ([A-Z]{3})\b/, 'llega');
    ev.sort((a, b) => a.i - b.i);
    // descarta «vuelos» que en realidad son parte de una hora o de un aeropuerto
    const evs = ev.filter(e => !(e.t === 'vuelo' && ev.some(o => o !== e && o.t !== 'vuelo' && e.i >= o.i && e.i < o.i + o.x[0].length)));
    if (!evs.length) {
      // renglón con el nombre del aeropuerto («EZEIZA - Ministro Pistarini»)
      if (/ - /.test(l) && ultimo && seg) { if (ultimo === 'sale' && !seg.aOrig) seg.aOrig = l; if (ultimo === 'llega' && !seg.aDest) seg.aDest = l; }
      continue;
    }
    for (const e of evs) {
      const x = e.x;
      if (e.t === 'vuelo') { if (!seg || seg.vuelo) nuevoSeg(); seg.vuelo = x[1] + ' ' + x[2]; ultimo = 'vuelo'; }
      else if (e.t === 'fecha') { const mes = MESES[x[2].toLowerCase()]; if (!mes) continue; const f = x[3] + '-' + String(mes).padStart(2, '0') + '-' + String(x[1]).padStart(2, '0');
        if (!seg) nuevoSeg(); if (!seg.hSale && !seg.fSale) seg.fSale = f; else { seg.fLlega = f; if (x[4]) seg.mas1 = true; } }
      else if (e.t === 'sale') { if (!seg || seg.hSale) nuevoSeg(); seg.origen = x[1]; seg.hSale = x[2].padStart(5, '0'); ultimo = 'sale'; }
      else if (e.t === 'llega') { if (!seg) nuevoSeg(); seg.destino = x[2]; seg.hLlega = x[1].padStart(5, '0'); ultimo = 'llega'; }
    }
  }
  for (const s of r.secciones) for (const g of s.segs) { if (!g.fLlega) g.fLlega = g.fSale; if (g.fLlega && g.fSale && g.fLlega > g.fSale) g.mas1 = true; }
  r.secciones = r.secciones.filter(s => s.segs.some(g => g.origen || g.destino));
  return r;
}
function num(s) { s = String(s); return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); }
const ciudad = (cod, aeropuerto) => CIUDADES[cod] || (aeropuerto ? tc(aeropuerto.split(' - ')[0]) : '') || cod;
const aerolinea = r => { const c = r.secciones.flatMap(s => s.segs.map(g => (g.vuelo || '').split(' ')[0])).filter(Boolean); return c.length ? (AEROLINEAS[c[0]] || c[0]) : ''; };
const fmtF = f => f ? f.split('-').reverse().join('/') : '';

function aCampos(r) {
  const o = {}, pref = { ida: 'i', vuelta: 'r' };
  const escalas = r.secciones.some(s => s.segs.length > 1);
  o.aerolinea = aerolinea(r);
  o.tipoVuelo = escalas ? 'Con escalas' : (r.secciones.length > 1 ? 'Vuelos directos' : 'Vuelo directo');
  for (const s of r.secciones) {
    const p = pref[s.tipo]; if (!p || o[p + 'Fecha']) continue;
    const a = s.segs[0], z = s.segs[s.segs.length - 1];
    o[p + 'Fecha'] = a.fSale || '';
    o[p + 'Orig'] = a.origen ? ciudad(a.origen, a.aOrig) + ' (' + a.origen + ')' : '';
    o[p + 'Dest'] = z.destino ? ciudad(z.destino, z.aDest) + ' (' + z.destino + ')' : '';
    o[p + 'Sale'] = a.hSale || '';
    o[p + 'Llega'] = z.hLlega || '';
    const vias = s.segs.slice(0, -1).map(g => g.destino).filter(Boolean);
    const vs = s.segs.map(g => g.vuelo).filter(Boolean); o[p + 'Vuelo'] = vs.length ? vs.join(' / ') + (vias.length ? ' vía ' + [...new Set(vias)].join(', ') : '') : '';
  }
  return o;
}

function resumenHtml(r) {
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  if (!r.secciones.length) return '<p class="sw-err">No encontré tramos en el texto. Copiá desde «Ida» hasta el final del itinerario (con el detalle abierto en Sci Web).</p>';
  let h = '';
  for (const s of r.secciones) {
    h += '<div class="sw-sec"><b>' + (s.tipo === 'ida' ? 'IDA' : 'REGRESO') + ' · ' + fmtF(s.segs[0]?.fSale) + ' · ' + (s.segs.length > 1 ? (s.segs.length - 1) + ' escala/s' : 'Directo') + (s.duracion ? ' · ' + e(s.duracion) : '') + '</b><ul>';
    for (const g of s.segs) {
      const falta = !g.vuelo || !g.hSale || !g.hLlega || !g.origen || !g.destino;
      h += '<li' + (falta ? ' class="sw-falta"' : '') + '>' + e(g.vuelo || '¿vuelo?') + ': ' + e(g.origen || '¿?') + ' ' + e(g.hSale || '¿?') + ' → ' + e(g.destino || '¿?') + ' ' + e(g.hLlega || '¿?') + (g.mas1 ? ' <b>(+1)</b>' : '') + (g.operado ? ' <span class="sub" style="display:inline">· operado por ' + e(g.operado) + '</span>' : '') + '</li>';
      if (g.espera) h += '<li class="sw-espera">Espera de ' + e(g.espera) + (g.cambioAeropuerto ? ' · <b>con cambio de aeropuerto</b>' : '') + '</li>';
    }
    h += '</ul></div>';
  }
  const datos = [aerolinea(r), r.cabina, r.tarifa].filter(Boolean).join(' · ');
  if (datos) h += '<p>' + e(datos) + '</p>';
  if (r.precio != null) h += '<p class="sub">Precio en Sci Web: <b>' + e(r.moneda || 'USD') + ' ' + r.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 }) + '</b> (es el costo del aéreo; no se copia a «Tarifa final»).</p>';
  if (r.secciones.some(s => s.segs.some(g => !g.vuelo || !g.hSale || !g.hLlega))) h += '<p class="sw-err">Algún dato no se pudo leer (marcado en rojo). Completalo a mano después de «Usar estos datos».</p>';
  return h;
}

/* ---------- captura: lector de texto gratuito que corre en la computadora (Tesseract.js) ---------- */
let tess = null;
function cargarTesseract() {
  if (tess) return tess;
  tess = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload = () => ok(window.Tesseract); s.onerror = () => { tess = null; ko(new Error('No se pudo cargar el lector de imágenes (revisá la conexión).')); }; document.head.appendChild(s); });
  return tess;
}
async function leerImagen(blob, estado) {
  const T = await cargarTesseract();
  // agrandar y pasar a grises mejora la lectura de letras chicas
  const bmp = await createImageBitmap(blob); const k = Math.max(1, Math.min(3, 2400 / bmp.width));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.filter = 'grayscale(1) contrast(1.4)'; x.drawImage(bmp, 0, 0, c.width, c.height);
  const res = await T.recognize(c, 'spa', { logger: m => { if (m.status === 'recognizing text') estado('Leyendo la captura… ' + Math.round(m.progress * 100) + ' %'); } });
  return res.data.text;
}

/* ---------- ventana ---------- */
function ventana() {
  let d = document.getElementById('almaSciDialog'); if (d) return d;
  d = document.createElement('dialog'); d.id = 'almaSciDialog'; d.className = 'dialog';
  d.innerHTML = '<div class="modalhead"><h2>Pegar vuelo de Sci Web</h2><button type="button" class="btn ghost tiny" data-x>✕</button></div><div class="modalbody">'
    + '<p class="hint">En Sci Web abrí <b>Ver Detalle</b>, seleccioná el itinerario con el mouse (de «Ida» hasta el final de la vuelta), copiá (Ctrl+C) y pegalo acá (Ctrl+V). También podés pegar o subir una <b>captura</b>: se lee sola, pero conviene revisar los números de vuelo.</p>'
    + '<textarea id="swTexto" rows="7" style="width:100%" placeholder="Pegá acá el texto o la captura del itinerario"></textarea>'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0"><label class="btn ghost tiny" style="cursor:pointer">📷 Subir captura<input type="file" id="swImg" accept="image/*" hidden></label><span id="swEstado" class="sub"></span></div>'
    + '<div id="swRes" class="sw-res"></div></div>'
    + '<div class="modalfoot"><button type="button" class="btn ghost" data-x>Cancelar</button><button type="button" class="btn" id="swUsar" disabled>Usar estos datos</button></div>';
  document.body.appendChild(d);
  const ta = d.querySelector('#swTexto'), res = d.querySelector('#swRes'), est = d.querySelector('#swEstado'), usar = d.querySelector('#swUsar');
  let actual = null;
  const analizar = () => { actual = leer(ta.value); res.innerHTML = ta.value.trim() ? resumenHtml(actual) : ''; usar.disabled = !actual.secciones.length; };
  const imagen = async blob => { est.textContent = 'Preparando el lector…'; usar.disabled = true;
    try { ta.value = await leerImagen(blob, t => est.textContent = t); est.textContent = 'Captura leída. Revisá los datos.'; analizar(); }
    catch (e) { est.textContent = ''; alert(e.message || 'No se pudo leer la captura'); } };
  ta.addEventListener('input', analizar);
  ta.addEventListener('paste', e => { const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); imagen(it.getAsFile()); } });
  d.querySelector('#swImg').addEventListener('change', e => { const f = e.target.files[0]; if (f) imagen(f); e.target.value = ''; });
  d.querySelectorAll('[data-x]').forEach(b => b.onclick = () => d.close());
  usar.onclick = () => {
    const form = document.getElementById('cotForm'); if (!form || !actual) return;
    const o = aCampos(actual);
    const ocupado = ['iFecha', 'iOrig', 'iVuelo', 'rFecha', 'rVuelo'].some(k => form.elements[k]?.value);
    if (ocupado && !confirm('El aéreo de la cotización ya tiene datos. ¿Reemplazarlos con los de Sci Web?')) return;
    for (const k of ['iFecha', 'iOrig', 'iDest', 'iSale', 'iLlega', 'iVuelo', 'rFecha', 'rOrig', 'rDest', 'rSale', 'rLlega', 'rVuelo']) if (form.elements[k]) form.elements[k].value = o[k] || '';
    if (o.aerolinea && form.elements.aerolinea) form.elements.aerolinea.value = o.aerolinea;
    if (form.elements.tipoVuelo) form.elements.tipoVuelo.value = o.tipoVuelo;
    form.dispatchEvent(new Event('input', { bubbles: true }));
    d.close();
    const notas = actual.secciones.flatMap(s => s.segs.filter(g => g.cambioAeropuerto)).length;
    if (notas) alert('Ojo: hay una escala con CAMBIO DE AEROPUERTO. Avisale al pasajero.');
  };
  return d;
}
window.almaSciWeb = () => { const d = ventana(); d.querySelector('#swTexto').value = ''; d.querySelector('#swRes').innerHTML = ''; d.querySelector('#swEstado').textContent = ''; d.querySelector('#swUsar').disabled = true; d.showModal(); setTimeout(() => d.querySelector('#swTexto').focus(), 50); };
window.__almaSciLeer = leer; window.__almaSciCampos = aCampos;

// botón dentro de la sección «Aéreo» del cotizador
function boton() {
  const form = document.getElementById('cotForm'); if (!form || form.querySelector('#swBtn')) return;
  const lg = [...form.querySelectorAll('legend')].find(x => /a[eé]reo/i.test(x.textContent)); if (!lg) return;
  lg.insertAdjacentHTML('afterend', '<button type="button" id="swBtn" class="btn ghost tiny" style="margin:4px 0 10px" onclick="almaSciWeb()">📋 Pegar vuelo de Sci Web</button>');
}
const o = window.almaCotizar;
if (o) window.almaCotizar = async (...a) => { const r = await o(...a); boton(); return r; };
new MutationObserver(boton).observe(document.documentElement, { childList: true, subtree: true });
})();
