/* Alma Viajera · «Pegar WhatsApp»
   Lee un mensaje copiado de WhatsApp y completa solo el formulario.
   Funciona en el navegador, sin IA ni servicios pagos: busca patrones conocidos
   (teléfonos, destinos, fechas, cantidad de pasajeros, hotel, régimen, vuelos, precios).
   Lo que no reconoce queda vacío para completarlo a mano. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const sinAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const low = s => sinAcento(s).toLowerCase();
const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- datos de referencia ---------- */
const DESTINOS = ['Bariloche', 'San Martín de los Andes', 'Villa La Angostura', 'Mendoza', 'San Rafael', 'Salta', 'Jujuy', 'Purmamarca', 'Humahuaca',
  'Cafayate', 'Iguazú', 'Cataratas del Iguazú', 'Cataratas', 'Ushuaia', 'El Calafate', 'El Chaltén', 'Puerto Madryn', 'Península Valdés', 'Mar del Plata',
  'Pinamar', 'Villa Gesell', 'Cariló', 'Las Grutas', 'Termas de Río Hondo', 'Merlo', 'Córdoba', 'Villa Carlos Paz', 'Tucumán', 'Esteros del Iberá',
  'Talampaya', 'Ischigualasto', 'Tandil', 'Florianópolis', 'Floripa', 'Camboriú', 'Bombinhas', 'Buzios', 'Búzios', 'Río de Janeiro', 'Rio de Janeiro',
  'Arraial do Cabo', 'Cabo Frío', 'Porto Seguro', 'Arraial d\'Ajuda', 'Salvador de Bahía', 'Salvador', 'Praia do Forte', 'Morro de São Paulo',
  'Maceió', 'Maragogi', 'Porto de Galinhas', 'Recife', 'Natal', 'Fortaleza', 'Jericoacoara', 'João Pessoa', 'Ilha Grande', 'Foz do Iguaçu', 'Gramado',
  'San Pablo', 'São Paulo', 'Punta Cana', 'Bayahibe', 'Samaná', 'Cancún', 'Riviera Maya', 'Playa del Carmen', 'Tulum', 'Isla Mujeres', 'Cozumel',
  'Ciudad de México', 'Aruba', 'Curazao', 'Varadero', 'La Habana', 'Cayo Santa María', 'Jamaica', 'Montego Bay', 'San Andrés', 'Cartagena',
  'Panamá', 'Costa Rica', 'Miami', 'Orlando', 'Disney', 'Nueva York', 'Las Vegas', 'Los Ángeles', 'San Francisco', 'Cusco', 'Machu Picchu', 'Lima',
  'Santiago de Chile', 'Viña del Mar', 'San Pedro de Atacama', 'Torres del Paine', 'Punta del Este', 'Colonia', 'Montevideo', 'Piriápolis',
  'Madrid', 'Barcelona', 'Andalucía', 'Sevilla', 'Roma', 'Florencia', 'Venecia', 'Milán', 'Costa Amalfitana', 'Sicilia', 'París', 'Londres', 'Lisboa',
  'Oporto', 'Ámsterdam', 'Praga', 'Viena', 'Budapest', 'Atenas', 'Islas Griegas', 'Santorini', 'Mykonos', 'Estambul', 'Capadocia', 'Turquía', 'Egipto',
  'El Cairo', 'Marruecos', 'Dubái', 'Tailandia', 'Bali', 'Japón', 'China', 'India', 'Vietnam', 'Australia', 'Nueva Zelanda', 'Sudáfrica', 'Europa',
  'España', 'Italia', 'Francia', 'Grecia', 'Portugal', 'Inglaterra', 'Escocia', 'Irlanda', 'Alemania', 'Suiza', 'Croacia', 'Noruega', 'Islandia',
  'Brasil', 'Perú', 'Chile', 'Uruguay', 'Colombia', 'México', 'Cuba', 'Caribe', 'Estados Unidos', 'Canadá', 'Crucero', 'Sudeste Asiático', 'Medio Oriente'];
const DEST_IDX = DESTINOS.map(d => ({ d, k: low(d) })).sort((a, b) => b.k.length - a.k.length);
const AEROPUERTOS = { EZE: 'Buenos Aires', AEP: 'Buenos Aires', COR: 'Córdoba', ROS: 'Rosario', MDZ: 'Mendoza', BRC: 'Bariloche', IGR: 'Iguazú',
  USH: 'Ushuaia', FTE: 'El Calafate', SLA: 'Salta', JUJ: 'Jujuy', TUC: 'Tucumán', NQN: 'Neuquén', CPC: 'San Martín de los Andes', PMY: 'Puerto Madryn',
  REL: 'Trelew', MDQ: 'Mar del Plata', FLN: 'Florianópolis', NVT: 'Navegantes', GIG: 'Río de Janeiro', SDU: 'Río de Janeiro', GRU: 'San Pablo',
  CGH: 'San Pablo', BPS: 'Porto Seguro', SSA: 'Salvador', MCZ: 'Maceió', REC: 'Recife', NAT: 'Natal', FOR: 'Fortaleza', IGU: 'Foz do Iguaçu',
  POA: 'Porto Alegre', CWB: 'Curitiba', PUJ: 'Punta Cana', SDQ: 'Santo Domingo', CUN: 'Cancún', MEX: 'Ciudad de México', AUA: 'Aruba',
  CUR: 'Curazao', HAV: 'La Habana', VRA: 'Varadero', MBJ: 'Montego Bay', ADZ: 'San Andrés', CTG: 'Cartagena', BOG: 'Bogotá', PTY: 'Panamá',
  SJO: 'San José', LIM: 'Lima', CUZ: 'Cusco', SCL: 'Santiago', MVD: 'Montevideo', PDP: 'Punta del Este', MIA: 'Miami', MCO: 'Orlando',
  JFK: 'Nueva York', EWR: 'Nueva York', LAS: 'Las Vegas', LAX: 'Los Ángeles', MAD: 'Madrid', BCN: 'Barcelona', FCO: 'Roma', MXP: 'Milán',
  CDG: 'París', ORY: 'París', LHR: 'Londres', LIS: 'Lisboa', OPO: 'Oporto', AMS: 'Ámsterdam', FRA: 'Fráncfort', IST: 'Estambul', ATH: 'Atenas',
  DXB: 'Dubái', DOH: 'Doha', CAI: 'El Cairo', RAK: 'Marrakech' };
const AEROLINEAS = { LA: 'LATAM', JJ: 'LATAM', AR: 'Aerolíneas Argentinas', G3: 'GOL', AD: 'Azul', H2: 'SKY', JA: 'JetSMART', WJ: 'JetSMART',
  FO: 'Flybondi', CM: 'Copa', AV: 'Avianca', AA: 'American Airlines', UA: 'United', DL: 'Delta', AM: 'Aeroméxico', UX: 'Air Europa',
  IB: 'Iberia', AF: 'Air France', KL: 'KLM', AZ: 'ITA Airways', TK: 'Turkish Airlines', EK: 'Emirates', QR: 'Qatar Airways', LH: 'Lufthansa',
  BA: 'British Airways', TP: 'TAP', ET: 'Ethiopian', DM: 'Arajet', '2K': 'Avianca' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES3 = { ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12 };
const NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  quince: 15, veinte: 20, treinta: 30 };
const n = w => (/^\d+$/.test(w) ? Number(w) : NUM[low(w)] || 0);
const RX_NUM = '(\\d{1,3}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta)';

/* ---------- limpieza del texto copiado ---------- */
// "[16/11/26, 10:15] Marta Gómez: hola" · "16/11/26 10:15 - Marta Gómez: hola"
const RX_CAB = /^\s*\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?([^:\n]{1,40}):\s?/i;
function limpiar(texto) {
  const remitentes = [], lineas = [];
  for (const raw of String(texto || '').replace(/\r/g, '').split('\n')) {
    const m = raw.match(RX_CAB);
    if (m) { remitentes.push(m[3].trim()); lineas.push(raw.slice(m[0].length)); } else lineas.push(raw);
  }
  const limpio = lineas.join('\n').replace(/‎|‏/g, '').replace(/<Multimedia omitido>|<Media omitted>|imagen omitida|audio omitido/gi, '')
    .replace(/\n{3,}/g, '\n\n').trim();
  return { limpio, remitentes };
}

/* ---------- detectores ---------- */
function telefono(t) {
  const cands = t.match(/(?:\+?\s?54[\s-]?9?[\s-]?)?(?:\(?0?\d{2,4}\)?[\s.-]?)?(?:15[\s.-]?)?\d{3,4}[\s.-]?\d{4}\b/g) || [];
  for (const c of cands) {
    const dig = c.replace(/\D/g, '');
    if (dig.length >= 10 && dig.length <= 13 && !/^\d{1,2}[\/.-]\d{1,2}/.test(c.trim())) return c.trim().replace(/\s+/g, ' ');
  }
  const m = t.match(/(?:cel(?:ular)?|tel(?:efono|éfono)?|whatsapp|wsp|n[uú]mero)\D{0,5}([\d\s().+-]{8,20})/i);
  return m ? m[1].trim() : '';
}
const NOMBRE = "(\\p{Lu}[\\p{Ll}']+(?:\\s+(?:de\\s+|del\\s+)?\\p{Lu}[\\p{Ll}']+){0,3})";
function nombre(t, remitentes) {
  const m = t.match(new RegExp('(?:\\bsoy|me llamo|mi nombre es|habla|les escribe|te escribe)\\s+(?:el\\s+|la\\s+)?' + NOMBRE, 'u'));
  if (m) return m[1].trim();
  const m2 = t.match(new RegExp('(?:nombre|pasajer[oa]|titular|cliente)\\s*[:\\-]\\s*' + NOMBRE, 'u'));
  if (m2) return m2[1].trim();
  const m3 = t.match(/(?:[Gg]racias|[Ss]aludos|[Aa]brazos?|[Bb]esos|[Ss]lds)[!.,\s]+(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)\s*[.!]?\s*$/u);
  if (m3) return m3[1];
  const r = remitentes.filter(x => !/^\+?[\d\s-]+$/.test(x) && !/alma viajera/i.test(x));
  return r[0] || '';
}
function destino(t) {
  const l = low(t);
  let mejor = null;
  for (const { d, k } of DEST_IDX) {
    const i = l.search(new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])'));
    if (i >= 0 && (!mejor || i < mejor.i)) mejor = { d: d === 'Floripa' ? 'Florianópolis' : d === 'Búzios' ? 'Buzios' : d === 'Rio de Janeiro' ? 'Río de Janeiro' : d, i };
  }
  if (mejor) return mejor.d;
  const m = t.match(/(?:viajar|viaje|ir|paquete|cotizar|cotizaci[oó]n|vacaciones)\s+(?:a|para|en|por)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+(?:de|del|do|da)?\s*[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)?)/);
  return m ? m[1] : '';
}
function pasajeros(t) {
  const l = low(t);
  let total = 0, m;
  const ad = l.match(new RegExp(RX_NUM + '\\s*(?:adultos?|mayores|adt)\\b'));
  const me = l.match(new RegExp(RX_NUM + '\\s*(?:menores|ninos?|nenes?|chicos?|hijos?|chd|infantes?|bebes?)\\b'));
  if (ad) total += n(ad[1]);
  if (me) total += n(me[1]);
  if (total) return total;
  if ((m = l.match(new RegExp('somos\\s+' + RX_NUM)))) return n(m[1]);
  if ((m = l.match(new RegExp('(?:para|x)\\s*' + RX_NUM + '\\s*(?:personas?|pasajeros?|pax|adultos?)')))) return n(m[1]);
  if ((m = l.match(new RegExp(RX_NUM + '\\s*(?:personas?|pasajeros?|pax)\\b')))) return n(m[1]);
  if (/\b(mi (esposo|esposa|marido|mujer|novio|novia|pareja) y yo|en pareja|matrimonio|somos dos)\b/.test(l)) return 2;
  return 0;
}
function edades(t) {
  const m = low(t).match(/(?:de|edades?:?)\s*(\d{1,2}(?:\s*(?:,|y)\s*\d{1,2})+)\s*anos/);
  return m ? m[1].replace(/\s+/g, ' ') + ' años' : '';
}
function noches(t) { const m = low(t).match(new RegExp(RX_NUM + '\\s*noches')); return m ? n(m[1]) : 0; }
// Fechas: devuelve [{iso, i}] en orden de aparición
function fechas(t, hoy = new Date()) {
  const out = [], l = low(t);
  const anioDe = (mes, dia, y) => {
    if (y) return y < 100 ? 2000 + y : y;
    const cand = new Date(hoy.getFullYear(), mes - 1, dia);
    return cand < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1) ? hoy.getFullYear() + 1 : hoy.getFullYear();
  };
  const iso = (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  let m;
  const r1 = /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/g;            // 15/01 · 15/01/27
  while ((m = r1.exec(l))) { const d = +m[1], mo = +m[2]; if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) out.push({ iso: iso(anioDe(mo, d, m[3] && +m[3]), mo, d), i: m.index }); }
  const r2 = new RegExp('\\b(\\d{1,2})\\s*(?:de\\s+)?(' + MESES.join('|') + ')(?:\\s*(?:de|del)?\\s*(\\d{4}))?', 'g');   // 15 de enero 2027
  while ((m = r2.exec(l))) { const mo = MESES.indexOf(m[2]) + 1; out.push({ iso: iso(anioDe(mo, +m[1], m[3] && +m[3]), mo, +m[1]), i: m.index }); }
  // "del 15 al 22 de enero": el primer número toma el mes del segundo
  const r3 = new RegExp('\\b(?:del?\\s+)?(\\d{1,2})\\s*(?:al|-|a)\\s*(\\d{1,2})\\s*(?:de\\s+)?(' + MESES.join('|') + ')(?:\\s*(?:de|del)?\\s*(\\d{4}))?', 'g');
  while ((m = r3.exec(l))) { const mo = MESES.indexOf(m[3]) + 1; out.push({ iso: iso(anioDe(mo, +m[1], m[4] && +m[4]), mo, +m[1]), i: m.index - 0.5 }); }
  const r4 = /\b(\d{1,2})\s?(ene|jan|feb|mar|abr|apr|may|jun|jul|ago|aug|sep|set|oct|nov|dic|dec)\b/gi;   // 15ENE
  while ((m = r4.exec(t))) { const mo = MES3[m[2].toUpperCase()]; out.push({ iso: iso(anioDe(mo, +m[1]), mo, +m[1]), i: m.index }); }
  const vistos = new Set();
  return out.sort((a, b) => a.i - b.i).filter(f => !vistos.has(f.iso) && vistos.add(f.iso));
}
function cuando(t) {
  const l = low(t), partes = [];
  const r = new RegExp('(?:(?:primera|segunda|1ra|1era|2da|1ª|2ª)\\s+quincena\\s+de\\s+|(?:fines|finales|principios|mediados|comienzos)\\s+de\\s+)?(' + MESES.join('|') + ')(?:\\s*(?:de|del)?\\s*(\\d{4}))?', 'g');
  let m; const vistos = new Set();
  // rangos explícitos primero
  const rr = new RegExp('(?:del?\\s+)?\\d{1,2}\\s*(?:al|-|a)\\s*\\d{1,2}\\s*(?:de\\s+)?(?:' + MESES.join('|') + ')(?:\\s*(?:de|del)?\\s*\\d{4})?', 'g');
  while ((m = rr.exec(l))) { partes.push(t.substr(m.index, m[0].length).trim()); m[0].match(new RegExp(MESES.join('|'), 'g')).forEach(x => vistos.add(x)); }
  const rf = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*(?:al|-|a|hasta)\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g;
  while ((m = rf.exec(l))) partes.push(m[0]);
  while ((m = r.exec(l))) if (!vistos.has(m[1])) { vistos.add(m[1]); partes.push(t.substr(m.index, m[0].length).trim()); }
  const extra = [];
  const no = noches(t); if (no) extra.push(no + ' noches');
  if (/vacaciones de invierno/.test(l)) extra.push('vacaciones de invierno');
  if (/semana santa/.test(l)) extra.push('Semana Santa');
  if (/fin de ano|año nuevo|ano nuevo|navidad/.test(l)) extra.push('Fiestas');
  if (/flexible|flexibles/.test(l)) extra.push('fechas flexibles');
  const s = partes.concat(extra).join(', ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
function regimen(t) {
  const l = low(t);
  if (/all[\s-]?inclusive|todo incluido|\bai\b/.test(l)) return 'All Inclusive';
  if (/pension completa|\bpc\b/.test(l)) return 'Pensión completa';
  if (/media pension|\bmap\b|\bmp\b/.test(l)) return 'Media pensión';
  if (/desayuno|\bcp\b|\bbb\b/.test(l)) return 'Con desayuno';
  if (/solo alojamiento|sin comidas|\bro\b|\bep\b/.test(l)) return 'Solo alojamiento';
  return '';
}
function base(t) {
  const m = low(t).match(/(?:base|habitaci[oó]n|hab\.?|en)\s+(single|simple|doble|dbl|triple|tpl|cu[aá]druple|quintuple|familiar)/);
  if (!m) return '';
  const k = { simple: 'single', dbl: 'doble', tpl: 'triple', 'cuádruple': 'cuádruple', cuadruple: 'cuádruple' }[m[1]] || m[1];
  return 'Base ' + k;
}
function hotel(t) {
  const lineas = t.split('\n').map(x => x.trim()).filter(Boolean);
  for (const x of lineas) {
    const m = x.match(/^(?:🏨\s*)?(?:hotel|alojamiento|hospedaje|resort)\s*[:\-–]\s*(.{3,70})$/i);
    if (m) return m[1].replace(/[*_]/g, '').trim();
  }
  const P = "[\\p{Lu}0-9][\\p{L}\\d&'.-]*";
  const m = t.match(new RegExp('(?<![\\p{L}])((?:Hotel|Resort|Pousada|Posada|Apart(?:\\s?hotel)?|Club)\\s+' + P + '(?:\\s+(?:' + P + '|de|del|do|da|y|&)){0,6})', 'u'));
  if (m) return m[1].replace(/\s+(?:de|del|do|da|y|&)$/i, '').trim();
  const m2 = t.match(new RegExp('(?<![\\p{L}\\d])(\\p{Lu}[\\p{L}\\d&\'.-]*(?:\\s+' + P + '){0,4}\\s+(?:Resort|Hotel|Suites|Inn|Beach|Palace|Plaza|Spa)(?:\\s+(?:&\\s+)?' + P + '){0,3})', 'u'));
  return m2 ? m2[1].trim() : '';
}
function precios(t) {
  const out = [];
  const rx = /(u\$s|us\$|usd|u\$d|dolares|dólares|eur|euros|€|\$|ars)?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(u\$s|us\$|usd|dolares|dólares|eur|euros|€|pesos|ars)?/gi;
  let m;
  while ((m = rx.exec(t))) {
    const cur = low(m[1] || m[4] || '');
    if (!cur) continue;
    const valor = Number(m[2].replace(/[.,\s]/g, '') + (m[3] ? '.' + m[3] : ''));
    if (!valor || valor < 10) continue;
    const moneda = /eur|€/.test(cur) ? 'EUR' : /u|dol/.test(cur) ? 'USD' : 'ARS';
    const cerca = low(t.slice(m.index, m.index + m[0].length + 40)) + ' ' + low(t.slice(Math.max(0, m.index - 30), m.index));
    out.push({ valor, moneda, porPersona: /por persona|p\/p|\bpp\b|por pasajero|por pax|c\/u|cada uno/.test(cerca), total: /total/.test(cerca),
      presupuesto: /presupuesto|tenemos|hasta|maximo|gastar|disponemos/.test(low(t.slice(Math.max(0, m.index - 40), m.index))) });
  }
  return out;
}
function vuelos(t) {
  const out = [];
  for (const linea of t.split('\n')) {
    const fl = linea.match(/\b([A-Z0-9]{2})\s?(\d{2,4})\b/);
    const ap = linea.match(/\b([A-Z]{3})\s*(?:[\/\-–>]+|\s)\s*([A-Z]{3})\b/);
    if (!ap || !(ap[1] in AEROPUERTOS || ap[2] in AEROPUERTOS)) continue;
    const horas = [...linea.matchAll(/(?<![\d.,:])([01]?\d|2[0-3])[:h.]([0-5]\d)(?![\d.,]*\d)(?!\s*(?:kg|usd))/gi)]
      .filter(h => !(fl && h.index >= fl.index && h.index < fl.index + fl[0].length)).map(h => h[1].padStart(2, '0') + ':' + h[2]);
    const f = fechas(linea);
    const cod = fl && /[A-Z]/.test(fl[1]) ? fl[1] : '';
    out.push({ cod, vuelo: cod ? cod + ' ' + fl[2] : '', orig: ap[1], dest: ap[2], sale: horas[0] || '', llega: horas[1] || '', fecha: f[0]?.iso || '' });
  }
  return out;
}
const ciudad = c => (AEROPUERTOS[c] ? AEROPUERTOS[c] + ' (' + c + ')' : c);
function incluye(t) {
  const items = [];
  for (let x of t.split('\n')) {
    x = x.replace(/^[\s•*·✔️✅\-–>]+/u, '').replace(/[*_]/g, '').trim();
    const l = low(x);
    if (x.length < 4 || x.length > 90) continue;
    if (/traslado|transfer|asistencia|seguro|excursi|city tour|paseo|entrada|visita|guia|tasas|impuestos incluidos/.test(l) && !/no incluye/.test(l)) items.push(x);
  }
  return items.slice(0, 4).join('\n');
}
function equipaje(t) {
  const x = t.split('\n').find(y => /equipaje|valija|carry|bodega|\b\d{2}\s?kg\b|mochila|bolso de mano/i.test(y));
  return x ? x.replace(/^[\s•*·\-–]+/, '').replace(/[*_]/g, '').replace(/^equipaje\s*(incluido)?\s*[:\-–]\s*/i, '').trim().slice(0, 90) : '';
}

/* ---------- armado de cada formulario ---------- */
function armarPedido(texto, grupos) {
  const { limpio, remitentes } = limpiar(texto);
  const r = {};
  r.client = nombre(limpio, remitentes);
  r.phone = telefono(limpio);
  r.destination = destino(limpio);
  r.when = cuando(limpio);
  const pax = pasajeros(limpio); if (pax) r.pax = pax;
  const ed = edades(limpio);
  const pr = precios(limpio);
  const g = (grupos || []).find(x => x.name && (low(limpio).includes(low(x.name)) || (x.destination && low(limpio).includes('salida') && low(limpio).includes(low(x.destination)))));
  if (g) { r.type = 'grupal'; r.groupId = g.id; if (!r.destination) r.destination = g.destination || g.name; }
  const presu = pr.find(p => p.presupuesto);
  const resumen = [];
  if (ed) resumen.push('Edades: ' + ed);
  if (presu) resumen.push('Presupuesto: ' + presu.moneda + ' ' + presu.valor.toLocaleString('es-AR'));
  const reg = regimen(limpio); if (reg) resumen.push('Régimen: ' + reg);
  r.notes = (resumen.length ? resumen.join(' · ') + '\n\n' : '') + limpio;
  return r;
}
function armarCotizacion(texto) {
  const { limpio, remitentes } = limpiar(texto);
  const r = {};
  const nom = nombre(limpio, []); if (nom) r.cliente = nom;
  r.destino = destino(limpio);
  const hoy = new Date();
  const vs = vuelos(limpio);
  // fechas de estadía: las que no son de los vuelos
  const fs = fechas(limpio, hoy).map(f => f.iso);
  if (fs[0]) r.desde = fs[0];
  if (fs[1] && fs[1] > fs[0]) r.hasta = fs[1];
  const no = noches(limpio); if (no) r.noches = no;
  if (r.desde && !r.hasta && no) { const d = new Date(r.desde + 'T12:00:00'); d.setDate(d.getDate() + no); r.hasta = d.toISOString().slice(0, 10); }
  r.regimen = regimen(limpio);
  r.base = base(limpio);
  r.hotel = hotel(limpio);
  const pax = pasajeros(limpio); if (pax) r.pax = pax;
  const pr = precios(limpio).filter(p => !p.presupuesto);
  const pp = pr.find(p => p.porPersona) || pr.find(p => !p.total) || null;
  const tot = pr.find(p => p.total);
  if (pp) { r.precio = pp.valor; r.moneda = pp.moneda; }
  else if (tot && (pax || 1) > 0) { r.precio = Math.round(tot.valor / (pax || 1) * 100) / 100; r.moneda = tot.moneda; }
  if (vs.length) {
    const ida = vs[0], vuelta = vs[1];
    const cod = ida.cod || vuelta?.cod;
    if (cod && AEROLINEAS[cod]) r.aerolinea = AEROLINEAS[cod];
    else { const a = Object.values(AEROLINEAS).find(x => low(limpio).includes(low(x))); if (a) r.aerolinea = a; }
    r.tipoVuelo = /escala/i.test(limpio) ? 'Con escalas' : vuelta ? 'Vuelos directos' : 'Vuelo directo';
    Object.assign(r, { iFecha: ida.fecha || r.desde || '', iOrig: ciudad(ida.orig), iDest: ciudad(ida.dest), iSale: ida.sale, iLlega: ida.llega, iVuelo: ida.vuelo });
    if (vuelta) Object.assign(r, { rFecha: vuelta.fecha || r.hasta || '', rOrig: ciudad(vuelta.orig), rDest: ciudad(vuelta.dest), rSale: vuelta.sale, rLlega: vuelta.llega, rVuelo: vuelta.vuelo });
  } else {
    const a = Object.values(AEROLINEAS).find(x => low(limpio).includes(low(x))); if (a) r.aerolinea = a;
  }
  const eq = equipaje(limpio); if (eq) r.equipaje = eq;
  const inc = incluye(limpio); if (inc) r.incluye = inc;
  for (const k of Object.keys(r)) if (r[k] === '' || r[k] == null) delete r[k];
  return r;
}

/* ---------- ventana para pegar ---------- */
const ICONO = '<span class="alma-wa-ico" aria-hidden="true">💬</span>';
function ventana() {
  let d = $('almaPegarWa');
  if (d) return d;
  d = document.createElement('dialog');
  d.id = 'almaPegarWa'; d.className = 'dialog';
  d.innerHTML = '<div class="modalhead"><h2>' + ICONO + ' Pegar WhatsApp</h2></div><div class="modalbody">'
    + '<p class="hint">Copiá el o los mensajes en WhatsApp (mantené apretado → Copiar) y pegalos acá. Se completa solo lo que se reconoce; revisá antes de guardar.</p>'
    + '<textarea id="almaPegarWaTxt" rows="10" style="width:100%;box-sizing:border-box" placeholder="Pegá acá el mensaje…"></textarea>'
    + '<div id="almaPegarWaMsg" class="alma-msg"></div></div>'
    + '<div class="modalfoot"><button type="button" class="btn plain" id="almaPegarWaNo">Cancelar</button><button type="button" class="btn alma-wa-btn" id="almaPegarWaSi">Armar</button></div>';
  document.body.appendChild(d);
  $('almaPegarWaNo').onclick = () => d.close();
  return d;
}
async function pedirTexto() {
  const d = ventana(), ta = $('almaPegarWaTxt');
  ta.value = ''; $('almaPegarWaMsg').textContent = '';
  try { const c = await navigator.clipboard?.readText?.(); if (c && c.trim().length > 3) ta.value = c; } catch (e) {}
  d.showModal(); setTimeout(() => ta.focus(), 50);
  return new Promise(ok => {
    $('almaPegarWaSi').onclick = () => { const v = ta.value.trim(); if (!v) { $('almaPegarWaMsg').textContent = 'Pegá el mensaje primero.'; return; } d.close(); ok(v); };
    d.addEventListener('close', () => ok(null), { once: true });
  });
}
function aviso(cont, completos, faltan) {
  cont.querySelector('.alma-wa-note')?.remove();
  const fila = cont.querySelector('.alma-wa-fila');
  (fila || cont).insertAdjacentHTML(fila ? 'afterend' : 'afterbegin', '<div class="alma-wa-note">' + ICONO + ' Armado desde WhatsApp. '
    + (completos.length ? 'Completé: <b>' + completos.map(escH).join(', ') + '</b>. ' : 'No reconocí datos para completar. ')
    + (faltan.length ? 'Revisá o completá: ' + faltan.map(escH).join(', ') + '.' : 'Revisalo antes de guardar.') + '</div>');
}
function poner(form, campos, etiquetas) {
  const hechos = [];
  for (const [k, v] of Object.entries(campos)) {
    const el = form.elements[k];
    if (!el || v === undefined || v === null || v === '') continue;
    if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === String(v))) continue;
    el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    if (etiquetas[k] && !hechos.includes(etiquetas[k])) hechos.push(etiquetas[k]);
  }
  return hechos;
}

/* Pedido */
const ETQ_PEDIDO = { client: 'cliente', phone: 'teléfono', destination: 'destino', when: 'fecha', pax: 'pasajeros', groupId: 'salida grupal', notes: 'detalle del pedido' };
async function pegarPedido() {
  const texto = await pedirTexto(); if (!texto) return;
  const f = $('orderForm'), st = window.__ALMA_APP?.getState() || {};
  const r = armarPedido(texto, st.groups);
  if (r.type) { f.elements.type.value = r.type; window.toggleOrderType?.(); }
  if (f.elements.notes.value.trim() && r.notes) r.notes = f.elements.notes.value.trim() + '\n\n' + r.notes;
  const hechos = poner(f, r, ETQ_PEDIDO);
  const faltan = ['client', 'destination', 'when', 'pax'].filter(k => !r[k]).map(k => ETQ_PEDIDO[k]);
  aviso(f.querySelector('.modalbody'), hechos, faltan);
}
/* Cotización */
const ETQ_COT = { cliente: 'pasajero', pax: 'pasajeros', base: 'base', destino: 'destino', desde: 'fechas', hasta: 'fechas', noches: 'noches',
  regimen: 'régimen', hotel: 'hotel', moneda: 'moneda', precio: 'precio', aerolinea: 'aerolínea', tipoVuelo: 'tipo de vuelo', equipaje: 'equipaje',
  iFecha: 'vuelo de ida', iOrig: 'vuelo de ida', iVuelo: 'vuelo de ida', rFecha: 'vuelo de regreso', rOrig: 'vuelo de regreso', rVuelo: 'vuelo de regreso', incluye: 'qué incluye' };
async function pegarCotizacion() {
  const texto = await pedirTexto(); if (!texto) return;
  const f = $('cotForm'); if (!f) return;
  const r = armarCotizacion(texto);
  const hechos = poner(f, r, ETQ_COT);
  const faltan = ['destino', 'desde', 'hotel', 'precio'].filter(k => !r[k]).map(k => ETQ_COT[k]);
  aviso(f, hechos, faltan);
}

/* ---------- botones ---------- */
function boton(id, fn) {
  const b = document.createElement('button');
  b.type = 'button'; b.id = id; b.className = 'btn alma-wa-btn'; b.innerHTML = ICONO + ' Pegar WhatsApp'; b.onclick = fn;
  return b;
}
function enPedido() {
  const body = $('orderForm')?.querySelector('.modalbody');
  if (!body || $('almaWaPedido')) return;
  const fila = document.createElement('div'); fila.className = 'alma-wa-fila'; fila.appendChild(boton('almaWaPedido', pegarPedido));
  body.prepend(fila);
}
function enCotizacion() {
  const f = $('cotForm');
  if (!f || $('almaWaCot')) return;
  const fila = document.createElement('div'); fila.className = 'alma-wa-fila'; fila.appendChild(boton('almaWaCot', pegarCotizacion));
  f.prepend(fila);
}
function iniciar() {
  enPedido();
  const open = window.openOrder;
  if (open && !open.__wa) { window.openOrder = (...a) => { const x = open(...a); $('orderForm')?.querySelector('.alma-wa-note')?.remove(); enPedido(); return x; }; window.openOrder.__wa = true; }
  const cot = window.almaCotizar;
  if (cot && !cot.__wa) {
    window.almaCotizar = async (...a) => { const x = await cot(...a); enCotizacion(); $('cotForm')?.querySelector('.alma-wa-note')?.remove(); return x; };
    window.almaCotizar.__wa = true;
  }
}
window.almaWhatsapp = { iniciar, armarPedido, armarCotizacion, limpiar };
})();
