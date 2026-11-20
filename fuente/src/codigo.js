/* Alma Viajera · sección privada («Código»): se abre tocando la versión al pie del menú.
   Pide de nuevo email y contraseña y solo deja pasar a Hernan. Los datos están protegidos en la base
   (tabla codigo_cotizaciones y archivos «codigo»: solo su usuario puede leerlos o escribirlos). */
(() => {
'use strict';
const URL_ = 'https://kwybigrovltwbgvbngdx.supabase.co', KEY = 'sb_publishable__WIXiJicmWGT5c59Lxj12Q_ENA3Xc9W';
const DUENO = 'a089eaad-2dd1-4bc4-bc11-39f6a960fe3c';
const ESTADOS = ['Pendiente', 'Cotizada', 'Enviada', 'Confirmada', 'Perdida'];
let tok = null, exp = 0, filas = [], editando = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, c) => n == null || n === '' ? '—' : (c || 'USD') + ' ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—';
const $ = id => document.getElementById(id);

async function api(path, opt = {}) {
  if (!tok || Date.now() > exp) { cerrar(); throw new Error('La sesión de esta sección venció. Volvé a entrar.'); }
  const r = await fetch(URL_ + path, { ...opt, headers: { apikey: KEY, Authorization: 'Bearer ' + tok, ...(opt.headers || {}) } });
  if (!r.ok) { let m = ''; try { const j = await r.json(); m = j.message || j.error || ''; } catch (e) {} throw new Error(m || ('Error ' + r.status)); }
  return r;
}
const rest = (p, o) => api('/rest/v1/' + p, o);

function ventana() {
  let d = $('almaCodigo'); if (d) return d;
  d = document.createElement('dialog'); d.id = 'almaCodigo'; d.className = 'dialog alma-codigo';
  d.innerHTML = '<div class="modalhead"><h2>Sistema de código de programación</h2><button type="button" class="btn ghost tiny" id="cdSalir">Salir</button></div><div class="modalbody" id="cdBody"></div>';
  document.body.appendChild(d);
  d.querySelector('#cdSalir').onclick = cerrar;
  d.addEventListener('cancel', e => { e.preventDefault(); cerrar(); });
  return d;
}
function cerrar() { tok = null; exp = 0; filas = []; const d = $('almaCodigo'); if (d) { d.querySelector('#cdBody').innerHTML = ''; if (d.open) d.close(); } }

function pantallaLogin() {
  const b = $('cdBody');
  b.innerHTML = '<form id="cdLogin" class="formgrid" autocomplete="off" style="max-width:420px"><p class="hint full">Acceso restringido.</p>'
    + '<label class="field full">Email<input name="email" type="email" required autocomplete="off"></label>'
    + '<label class="field full">Contraseña<input name="pass" type="password" required autocomplete="new-password"></label>'
    + '<p id="cdErr" class="full" style="color:#b42318;min-height:1em;margin:0"></p><div class="full"><button class="btn" type="submit">Entrar</button></div></form>';
  b.querySelector('#cdLogin').onsubmit = async e => {
    e.preventDefault(); const f = e.target, err = $('cdErr'); err.textContent = '';
    try {
      const r = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email.value.trim(), password: f.pass.value }) });
      const j = await r.json().catch(() => ({}));
      f.pass.value = '';
      if (!r.ok || j.user?.id !== DUENO) { err.textContent = 'Acceso denegado.'; return; }
      tok = j.access_token; exp = Date.now() + Math.min(Number(j.expires_in || 3600), 3600) * 1000 - 60000;
      await cargar();
    } catch (x) { err.textContent = 'No se pudo conectar.'; }
  };
  setTimeout(() => b.querySelector('[name=email]')?.focus(), 50);
}

async function cargar() {
  filas = await (await rest('codigo_cotizaciones?select=*&order=creado.desc')).json();
  lista();
}
function lista() {
  const b = $('cdBody'), q = ($('cdBuscar')?.value || '').toLowerCase(), est = $('cdEstado')?.value || '';
  const ls = filas.filter(r => (!est || r.estado === est) && (!q || [r.proveedor, r.cliente, r.destino, r.contacto, r.notas].join(' ').toLowerCase().includes(q)));
  const tot = {}; for (const r of ls) { if (r.estado === 'Perdida') continue; const c = r.moneda || 'USD'; tot[c] = tot[c] || { v: 0, g: 0 }; tot[c].v += Number(r.venta || 0); tot[c].g += Number(r.venta || 0) - Number(r.costo || 0); }
  b.innerHTML = '<div class="cd-barra"><input id="cdBuscar" placeholder="Buscar proveedor, cliente, destino…" value="' + esc($('cdBuscar')?.value || '') + '">'
    + '<select id="cdEstado"><option value="">Todos los estados</option>' + ESTADOS.map(s => '<option' + (s === est ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>'
    + '<button type="button" class="btn" id="cdNueva">+ Nueva cotización</button></div>'
    + '<p class="hint">' + ls.length + ' cotización/es' + Object.entries(tot).map(([c, t]) => ' · Venta ' + money(t.v, c) + ' · Ganancia ' + money(t.g, c)).join('') + ' (sin las perdidas)</p>'
    + (ls.length ? '<div class="tablewrap"><table class="table"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Cliente / destino</th><th>Viaje</th><th style="text-align:right">Costo</th><th style="text-align:right">Venta</th><th style="text-align:right">Ganancia</th><th>Estado</th><th></th></tr></thead><tbody>'
      + ls.map(r => '<tr><td>' + fmt(r.creado) + '</td><td><b>' + esc(r.proveedor || '—') + '</b></td><td>' + esc(r.cliente || '—') + '<span class="sub">' + esc(r.destino || '') + (r.contacto ? ' · ' + esc(r.contacto) : '') + '</span></td>'
        + '<td>' + fmt(r.salida) + (r.regreso ? ' al ' + fmt(r.regreso) : '') + (r.pasajeros ? '<span class="sub">' + r.pasajeros + ' pax</span>' : '') + '</td>'
        + '<td style="text-align:right">' + money(r.costo, r.moneda) + '</td><td style="text-align:right">' + money(r.venta, r.moneda) + '</td><td style="text-align:right"><b>' + (r.venta != null && r.costo != null ? money(r.venta - r.costo, r.moneda) : '—') + '</b></td>'
        + '<td>' + esc(r.estado || '') + ((r.adjuntos || []).length ? '<span class="sub">📎 ' + r.adjuntos.length + '</span>' : '') + '</td><td><button type="button" class="btn ghost tiny" data-ed="' + r.id + '">Abrir</button></td></tr>').join('')
      + '</tbody></table></div>' : '<p class="empty">No hay cotizaciones' + (q || est ? ' con ese filtro' : ' todavía') + '.</p>');
  $('cdBuscar').oninput = () => { const pos = $('cdBuscar').selectionStart; lista(); const i = $('cdBuscar'); i.focus(); i.setSelectionRange(pos, pos); };
  $('cdEstado').onchange = lista;
  $('cdNueva').onclick = () => form(null);
  b.querySelectorAll('[data-ed]').forEach(x => x.onclick = () => form(filas.find(r => r.id === x.dataset.ed)));
}

function form(r) {
  editando = r; const v = r || { moneda: 'USD', estado: 'Pendiente', adjuntos: [] }, b = $('cdBody');
  const campo = (n, t, ty = 'text', extra = '') => '<label class="field">' + t + '<input name="' + n + '" type="' + ty + '" value="' + esc(v[n] ?? '') + '" ' + extra + '></label>';
  b.innerHTML = '<form id="cdForm" class="formgrid">'
    + campo('proveedor', 'Proveedor', 'text', 'required') + campo('cliente', 'Cliente / pasajero') + campo('contacto', 'Contacto (teléfono o email)') + campo('destino', 'Destino')
    + campo('salida', 'Salida', 'date') + campo('regreso', 'Regreso', 'date') + campo('pasajeros', 'Pasajeros', 'number', 'min="0"')
    + '<label class="field">Moneda<select name="moneda">' + ['USD', 'ARS', 'EUR'].map(c => '<option' + (c === v.moneda ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label>'
    + campo('costo', 'Costo (proveedor)', 'number', 'step="0.01" min="0"') + campo('venta', 'Precio de venta', 'number', 'step="0.01" min="0"')
    + '<label class="field">Estado<select name="estado">' + ESTADOS.map(s => '<option' + (s === v.estado ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>'
    + '<p class="hint" id="cdGan" style="align-self:end"></p>'
    + '<label class="field full">Notas<textarea name="notas" rows="3">' + esc(v.notas || '') + '</textarea></label>'
    + '<div class="full"><b>Archivos</b> <label class="btn ghost tiny" style="cursor:pointer;margin-left:6px">📎 Adjuntar<input type="file" id="cdFile" hidden multiple></label><div id="cdAdj" style="margin-top:6px"></div></div>'
    + '<div class="full" style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><span>' + (r ? '<button type="button" class="btn ghost tiny" id="cdBorrar" style="color:#b42318">Eliminar</button>' : '') + '</span>'
    + '<span style="display:flex;gap:8px"><button type="button" class="btn ghost" id="cdVolver">Volver</button><button class="btn" type="submit">Guardar</button></span></div></form>';
  const f = $('cdForm'), adj = [...(v.adjuntos || [])];
  const gan = () => { const c = Number(f.costo.value), s = Number(f.venta.value); $('cdGan').textContent = f.costo.value && f.venta.value ? 'Ganancia: ' + money(s - c, f.moneda.value) + (c ? ' (' + Math.round((s - c) / c * 1000) / 10 + ' % sobre el costo)' : '') : ''; };
  const pintarAdj = () => { $('cdAdj').innerHTML = adj.length ? adj.map((a, i) => '<div>📄 <a href="#" data-ab="' + i + '">' + esc(a.nombre) + '</a> <button type="button" class="btn ghost tiny" data-qt="' + i + '">Quitar</button></div>').join('') : '<span class="sub">Sin archivos.</span>';
    $('cdAdj').querySelectorAll('[data-ab]').forEach(x => x.onclick = async e => { e.preventDefault(); const a = adj[+x.dataset.ab]; const w = window.open('', '_blank');
      try { const blob = await (await api('/storage/v1/object/authenticated/codigo/' + a.ruta)).blob(); const u = URL.createObjectURL(blob); if (w) w.location.href = u; else location.href = u; } catch (er) { if (w) w.close(); alert(er.message); } });
    $('cdAdj').querySelectorAll('[data-qt]').forEach(x => x.onclick = async () => { const a = adj[+x.dataset.qt]; if (!confirm('¿Quitar ' + a.nombre + '?')) return;
      try { await api('/storage/v1/object/codigo/' + a.ruta, { method: 'DELETE' }); } catch (er) {} adj.splice(+x.dataset.qt, 1); pintarAdj(); }); };
  pintarAdj(); gan(); f.costo.oninput = f.venta.oninput = f.moneda.onchange = gan;
  $('cdFile').onchange = async e => { for (const file of e.target.files) { const ruta = (r?.id || 'nuevo') + '/' + Date.now() + '-' + file.name.replace(/[^\w.\-]+/g, '_');
      try { await api('/storage/v1/object/codigo/' + ruta, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file }); adj.push({ nombre: file.name, ruta }); } catch (er) { alert('No se pudo subir ' + file.name + ': ' + er.message); } }
    e.target.value = ''; pintarAdj(); };
  $('cdVolver').onclick = lista;
  if (r) $('cdBorrar').onclick = async () => { if (!confirm('¿Eliminar esta cotización y sus archivos?')) return;
    try { for (const a of adj) { try { await api('/storage/v1/object/codigo/' + a.ruta, { method: 'DELETE' }); } catch (er) {} }
      await rest('codigo_cotizaciones?id=eq.' + r.id, { method: 'DELETE' }); await cargar(); } catch (er) { alert(er.message); } };
  f.onsubmit = async e => { e.preventDefault();
    const n = x => x === '' ? null : Number(x), d = x => x || null;
    const body = { proveedor: f.proveedor.value.trim(), cliente: f.cliente.value.trim(), contacto: f.contacto.value.trim(), destino: f.destino.value.trim(), salida: d(f.salida.value), regreso: d(f.regreso.value),
      pasajeros: n(f.pasajeros.value), moneda: f.moneda.value, costo: n(f.costo.value), venta: n(f.venta.value), estado: f.estado.value, notas: f.notas.value.trim(), adjuntos: adj, actualizado: new Date().toISOString() };
    try { if (r) await rest('codigo_cotizaciones?id=eq.' + r.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      else await rest('codigo_cotizaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await cargar(); } catch (er) { alert('No se pudo guardar: ' + er.message); } };
}

// entrada: tocar «versión …» al pie del menú
function enganchar() {
  const pie = document.querySelector('.side-foot'); if (!pie || pie.querySelector('#almaVer')) return;
  pie.innerHTML = pie.innerHTML.replace(/(versión [0-9/: ]+)/, '<span id="almaVer">$1</span>');
  const v = pie.querySelector('#almaVer'); if (!v) return;
  v.addEventListener('click', () => { const d = ventana(); cerrar(); pantallaLogin(); d.showModal(); });
}
enganchar(); document.addEventListener('DOMContentLoaded', enganchar); setTimeout(enganchar, 1500);
// si cierran la sesión del sistema, se cierra también esta sección
window.addEventListener('beforeunload', cerrar);
})();
