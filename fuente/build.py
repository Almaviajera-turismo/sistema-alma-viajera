"""Arma index.html (versión online) a partir del sistema original v32."""
import re, sys, pathlib

SRC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
HERE = pathlib.Path(__file__).parent
html = SRC.read_text(encoding='utf-8')

def sub(old, new, s, count=1, required=True):
    n = s.count(old)
    if required and n == 0:
        raise SystemExit(f'No encontrado: {old[:90]!r}')
    return s.replace(old, new) if count == 0 else s.replace(old, new, count)

# ---------- separar el script principal ----------
start = html.index('<script>', html.index('</dialog>'))
end = html.index('</script>', start)
app = html[start + len('<script>'):end]
before, after = html[:start], html[end + len('</script>'):]

# ---------- cambios en la lógica ----------
app = sub("let state;try{state=JSON.parse(localStorage.getItem(key))}catch(e){};", "let state=window.__ALMA_STATE__;", app)
app = sub("function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch(e){alert('No se pudo guardar en el navegador')}}",
          "function save(){window.__almaSave&&window.__almaSave()}", app)
app = sub("function audit(action, entity, details){state.audit.unshift({id:uid(),when:new Date().toISOString(),user:currentDemoOperator()+' (simulado)',action,entity,details:details||''})}",
          "function audit(){/* la bitácora la registra el servidor */}", app)
app = sub("function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}",
          "function uid(){return crypto.randomUUID()}", app)
app = sub("owners.concat(['Vendedor 1 (demo)','Vendedor 2 (demo)','Vendedor 3 (demo)'])", "[currentDemoOperator()]", app)
app = sub("' · Autorizado por Socio (demo)'", "' · Autorizado por '+currentDemoOperator()", app)
app = sub("'Socio (demo)'", "currentDemoOperator()", app, count=0)
app = sub("'Vista de vendedor de prueba (no es seguridad real)':'Vista de socio de prueba'", "'Ingresaste como vendedor':'Ingresaste como socio'", app)
app = sub("notify('Recibo de prueba generado')", "notify('Recibo generado')", app)
app = sub("alert('En este diseño la finanzas queda reservada a socios. Esta es una simulación, sin autenticación real.')",
          "alert('Esta sección está reservada a los socios.')", app)
app = sub("En la demo, los movimientos en efectivo se registran solo con fecha de hoy y caja abierta. Para rectificar otro día hará falta una operación autorizada.",
          "Los movimientos en efectivo se registran solo con fecha de hoy y con la caja abierta.", app)
app = sub('DEMOSTRACIÓN: recibo provisional de prueba. No constituye factura ni comprobante fiscal. No utilizar para cobros reales hasta implementar el sistema seguro y verificar sus datos.',
          'Recibo provisorio. No constituye factura ni comprobante fiscal.', app)
for old, new in [(' en esta demostración', ''), (' en la demostración', ''), (' (demostración)', ''),
                 ('Exportación de demostración', 'Exportación'), ('DNI ficticio', 'DNI'), ('CUIL ficticio', 'CUIL'),
                 ('DNI (ficticio)', 'DNI'), ('usuario ficticio', 'usuario'), ('Todas las acciones son DEMOSTRACIÓN LOCAL; no hay autenticación ni servidor.', ''),
                 (' | Documento de prueba', '')]:
    app = app.replace(old, new)
# Directorio de pasajeros: columna Documento con pasaporte (y su vencimiento) + DNI
app = sub("table('passengersDirectory',['Pasajero','Contacto','DNI','Viajes','Acción']",
          "table('passengersDirectory',['Pasajero','Contacto','Documento','Viajes','Acción']", app)
app = sub("</td><td>'+esc(p.doc||'—')+'<span class=\"sub\">Vence: '+fmt(p.passportExpiry)+'</span></td>",
          "</td><td>'+docCell(p)+'</td>", app)
app = sub("// Semana de lunes a domingo y mes calendario",
          "function docCell(p){const parts=[],hoy=new Date().toISOString().slice(0,10);"
          "const vence=d=>{const v=d&&d<hoy;return d?'<span class=\"sub\"'+(v?' style=\"color:#b42318;font-weight:600\"':'')+'>Vence: '+fmt(d)+(v?' · vencido':'')+'</span>':''};"
          "if(p.docType==='DNI'){if(p.doc)parts.push('DNI '+esc(p.doc)+vence(p.dniExpiry));if(p.passportNumber)parts.push('<span class=\"sub\">Pasaporte '+esc(p.passportNumber)+'</span>')}"
          "else{if(p.passportNumber)parts.push('Pasaporte '+esc(p.passportNumber)+vence(p.passportExpiry));"
          "if(p.doc)parts.push((p.passportNumber?'<span class=\"sub\">':'')+'DNI '+esc(p.doc)+(p.passportNumber?'</span>':''))}"
          "if(window.__almaDocIds&&window.__almaDocIds.has(p.id))parts.push('<span class=\"sub alma-clip\">📎 Foto del documento</span>');"
          "return parts.join('')||'—'}\n// Semana de lunes a domingo y mes calendario", app)
# Ficha del pasajero: fotos del pasaporte (las maneja online.js)
app = sub("<span>Copia de pasaporte: disponible solo en futura versión segura</span></div>",
          "</div><div id=\"almaDocs\" class=\"alma-docs\"></div>", app)
app = sub(" // El acumulado es por oficina y moneda", " if(window.demoRole==='vendedor')for(const m of state.cashOthers||[])out.push({...m});\n // El acumulado es por oficina y moneda", app)
# Botón "Inicio" junto a "Volver" (pantallas y ventanas) y "Contraseña" solo en el Inicio
app = sub("function updateBackButton(){const btn=document.getElementById('navBackButton');if(btn)btn.disabled=navHistory.length===0 && activePageId()==='inicio' && visibleDialogs().length===0 && !window.currentGroupDetail}",
          "function updateBackButton(){const atHome=activePageId()==='inicio';const btn=document.getElementById('navBackButton');if(btn)btn.disabled=navHistory.length===0 && atHome && visibleDialogs().length===0 && !window.currentGroupDetail;"
          "const home=document.getElementById('navHomeButton');if(home)home.style.display=(atHome&&visibleDialogs().length===0&&!window.currentGroupDetail)?'none':'';"
          "const pw=document.getElementById('almaPwBtn');if(pw)pw.style.display=atHome?'':'none'}", app)
app = sub("window.goBack=()=>{",
          "window.goHome=()=>{const ds=visibleDialogs();for(const id of [...ds].reverse()){const d=$(id);if(d&&!discardDialogChanges(d))return}"
          "navRestoring=true;try{ds.forEach(id=>{const d=$(id);if(d&&d.open)d.close()});if(window.currentGroupDetail&&window.closeGroupDetail)window.closeGroupDetail();switchPage('inicio')}finally{navRestoring=false}"
          "navHistory.length=0;window.scrollTo({top:0,behavior:'smooth'});updateBackButton()};\n"
          "document.querySelectorAll('dialog .modalhead button[onclick=\"goBack()\"]').forEach(b=>{const h=document.createElement('button');h.type='button';h.className=b.className;h.textContent='⌂ Inicio';h.onclick=()=>window.goHome();b.after(h);b.parentElement.style.gap='6px'});\n"
          "window.goBack=()=>{", app)

# Folleto de la salida: se actualiza cada vez que se muestra el detalle (lo maneja online.js)
app = sub("function renderGroupDetail(){const id=window.currentGroupDetail;if(!id)return;",
          "function renderGroupDetail(){const id=window.currentGroupDetail;if(!id)return;window.almaFolleto&&window.almaFolleto(id);", app)

# Pedidos: botón «Cotizar» que abre el flyer de cotización (lo maneja cotizador.js)
app = sub("onclick=\"editOrder(&quot;'+o.id+'&quot;)\">✎ Editar pedido</button></div>",
          "onclick=\"editOrder(&quot;'+o.id+'&quot;)\">✎ Editar pedido</button> "
          "<button class=\"btn tiny\" style=\"margin:6px 0\" onclick=\"almaCotizar(&quot;'+o.id+'&quot;)\">'+(o.quote?'🖼 Ver cotización':'🖼 Cotizar')+'</button> <button class=\"btn ghost tiny\" style=\"margin:6px 0\" onclick=\"newQuoteOption(&quot;'+o.id+'&quot;)\">+ Otra opción</button> <button class=\"btn ghost tiny\" style=\"margin:6px 0\" onclick=\"openTripPassengers(&quot;order&quot;,&quot;'+o.id+'&quot;)\">👥 Pasajeros ('+(o.travelers||[]).length+')</button></div>"
          "'+optionTag(o)+(o.quote&&o.quote.precio?'<span class=\"sub\" style=\"color:#1f8fa8;font-weight:600\">Cotizado: '+esc(o.quote.moneda||'')+' '+esc(Number(o.quote.precio).toLocaleString('es-AR'))+' por pasajero</span>':'')+'", app)

# Acceso para la capa online
app = sub("render();\nupdateBackButton();\n})();",
          "{const __opp=window.openPassengerProfile;window.openPassengerProfile=id=>{__opp(id);window.almaLoadDocs&&window.almaLoadDocs(id)}}\n"
          "window.__ALMA_APP={getState:()=>state,render:()=>render(),refreshDetail:()=>{try{if(window.currentGroupDetail&&document.getElementById('groupDetailPanel')?.style.display!=='none')renderGroupDetail()}catch(e){}}};\n"
          "render();\nupdateBackButton();\n})();", app)

# Botón «Eliminar» (solo socios, con reglas): lógica en src/eliminar.js, dentro del script principal
app = sub("render();\nupdateBackButton();\n})();",
          (HERE / 'src' / 'eliminar.js').read_text(encoding='utf-8') + '\n' + (HERE / 'src' / 'salida.js').read_text(encoding='utf-8')
          + '\n' + (HERE / 'src' / 'mejoras.js').read_text(encoding='utf-8')
          + '\n' + (HERE / 'src' / 'verreserva.js').read_text(encoding='utf-8')
          + '\n' + (HERE / 'src' / 'pedidos.js').read_text(encoding='utf-8')
          + "\nrender();\nupdateBackButton();\n})();", app)
# Ficha de la salida grupal: pestaña nueva (se abre primero) y edición (src/salida.js)
app = sub("$('groupDetailTitle').textContent=g.name+' · pasajeros';showGroupTab('pasajeros',true);",
          "$('groupDetailTitle').textContent=g.name;showGroupTab('ficha',true);", app)
app = sub("renderRooming()}\n\nwindow.showGroupTab=", "renderRooming();window.almaRenderGroupFicha&&almaRenderGroupFicha()}\n\nwindow.showGroupTab=", app)
app = sub("onclick=\"openPassengerForm(&quot;'+p.id+'&quot;)\">Editar ficha</button>",
          "onclick=\"openPassengerForm(&quot;'+p.id+'&quot;)\">Editar ficha</button> '+almaDelBtn('almaEliminarPasajero',p.id,'Eliminar pasajero')+'", app)
app = sub("onclick=\"openTripPassengers(&quot;booking&quot;,&quot;'+b.id+'&quot;)\">👥 Pasajeros ('+paxCount(b)+')</button></div><span class=\"sub\">'+'<b>File '+esc(b.fileNumber||'—')+'</b> · '+esc(b.tour)",
          "onclick=\"openTripPassengers(&quot;booking&quot;,&quot;'+b.id+'&quot;)\">👥 Pasajeros ('+paxCount(b)+')</button> '+almaDelBtn('almaEliminarViaje',b.id)+'</div><span class=\"sub\">'+'<b>File '+esc(b.fileNumber||'—')+'</b> · '+esc(b.tour)", app)
app = sub("onclick=\"editBooking(&quot;'+f.bookingId+'&quot;)\">✎ Editar reserva</button></div>",
          "onclick=\"editBooking(&quot;'+f.bookingId+'&quot;)\">✎ Editar reserva</button> '+almaDelBtn('almaEliminarViaje',f.bookingId)+'</div>", app)
app = sub("onclick=\"exportGroupExcel(&quot;'+g.id+'&quot;,&quot;rooming&quot;)\">↓ Excel rooming</button></div></td></tr>'}),'No hay salidas",
          "onclick=\"exportGroupExcel(&quot;'+g.id+'&quot;,&quot;rooming&quot;)\">↓ Excel rooming</button>'+almaDelBtn('almaEliminarSalida',g.id)+'</div></td></tr>'}),'No hay salidas", app)
app = sub("'Concepto / operación','Comprometido','Pendiente','Pagar']", "'Concepto / operación','Comprometido','Pendiente','Acción']", app)
app = sub("'+(pending>.001?'<button class=\"btn tiny\" onclick=\"openSupplierPayment(&quot;'+e.id+'&quot;)\">Pagar</button>':'Saldado')+'</td></tr>'}),'No hay compromisos registrados')",
          "'+(pending>.001?'<button class=\"btn tiny\" onclick=\"openSupplierPayment(&quot;'+e.id+'&quot;)\">Pagar</button>':'Saldado')+' '+almaDelBtn('almaEliminarCompromiso',e.id,'Eliminar')+'</td></tr>'}),'No hay compromisos registrados')", app)
app = sub("table('providerPaymentHistory',['Fecha','Proveedor / concepto','Oficina','Medio / ref.','Importe']",
          "table('providerPaymentHistory',['Fecha','Proveedor / concepto','Oficina','Medio / ref.','Importe','Acción']", app)
app = sub("money(p.amount,e?.currency||'USD')+'</b></td></tr>'}),'Sin pagos registrados')",
          "money(p.amount,e?.currency||'USD')+'</b></td><td>'+almaDelBtn('almaEliminarPagoProveedor',p.id)+'</td></tr>'}),'Sin pagos registrados')", app)

# Botón «👁 Ver reserva» junto a cada «✎ Editar reserva» (ficha completa con cobros y pagos: src/verreserva.js)
app, _n = re.subn(r"onclick=\"editBooking\(&quot;'\+([\w.]+)\+'&quot;\)\">✎ Editar reserva</button>",
                  lambda m: m.group(0) + " <button class=\"btn tiny\" style=\"margin:6px 0\" onclick=\"almaVerReserva(&quot;'+" + m.group(1) + "+'&quot;)\">👁 Ver reserva</button>", app)
assert _n >= 3, _n

# ---------- cambios en la pantalla ----------
before = sub("""<button id="tabGroupPassengers" type="button" class="btn tiny" onclick="showGroupTab('pasajeros')">Pasajeros</button>""",
             """<button id="tabGroupFicha" type="button" class="btn tiny" onclick="showGroupTab('ficha')">Ficha de la salida</button>"""
             """<button id="tabGroupPassengers" type="button" class="btn tiny ghost" onclick="showGroupTab('pasajeros')">Pasajeros</button>""", before)
before = sub('<div id="groupPassengersPanel">', '<div id="groupFichaPanel" style="display:none"><div id="almaGroupFicha" class="alma-ficha"></div></div><div id="groupPassengersPanel">', before)
before = sub('<button type="button" class="nav-back" id="navBackButton" onclick="goBack()" aria-label="Volver a la pantalla anterior">← Volver</button>',
             '<div style="display:flex;gap:8px"><button type="button" class="nav-back" id="navBackButton" onclick="goBack()" aria-label="Volver a la pantalla anterior">← Volver</button>'
             '<button type="button" class="nav-back" id="navHomeButton" onclick="goHome()" aria-label="Ir al inicio" style="display:none">⌂ Inicio</button></div>', before)
before = re.sub(r'<title>.*?</title>', '<title>Alma Viajera Turismo · Gestión</title>', before, count=1)
before = re.sub(r'<div class="notice">.*?</div>', '', before, count=1, flags=re.S)
import datetime as _dt
_ver = (_dt.datetime.utcnow() - _dt.timedelta(hours=3)).strftime('%d/%m %H:%M')
before = sub('Versión de prueba · datos solo en este navegador', 'Sistema online · datos compartidos · versión ' + _ver, before)
before = sub('<div class="pill">DEMO V32</div>',
             '<div id="almaUserBox" class="alma-user" hidden><span id="almaSync" class="alma-sync" data-s="ok">✓ Guardado</span>'
             '<div class="alma-who"><b id="almaUserName"></b><small id="almaUserRole"></small></div>'
             '<button type="button" class="btn ghost tiny" onclick="almaOpenHelp()" title="Cómo usar el sistema">❓ Ayuda</button>'
             '<button type="button" class="btn ghost tiny" onclick="almaRefresh()" title="Traer los últimos cambios">↻</button>'
             '<button type="button" id="almaPwBtn" class="btn ghost tiny" onclick="almaOpenPassword()">Contraseña</button>'
             '<button type="button" class="btn ghost tiny" onclick="almaLogout()">Salir</button></div>', before)
before = sub('Respaldo automático de las 23:59: pendiente de instalar en el servidor. Esta demo no realiza backups.',
             'Los datos se guardan en el servidor y se comparten entre Centro y Gaona.', before)
before = before.replace('<b>Demostración:</b> cargá solo nombres y documentos ficticios. La carga de fotos reales de pasaportes estará disponible después de implementar almacenamiento privado, autenticación y permisos.',
                        'Cada ficha puede guardar la foto o el PDF del pasaporte (se ve desde «Ver ficha»).')
before = sub('<button class="btn" onclick="openPassengerForm()">+ Agregar pasajero</button>',
             '<span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" onclick="almaOpenBulk()">Carga masiva de pasaportes</button>'
             '<button class="btn" onclick="openPassengerForm()">+ Agregar pasajero</button></span>', before)
before = before.replace('Recibo provisional de demostración', 'Recibo')
# Formulario de pasajero: campo para adjuntar la foto del pasaporte (lo maneja online.js)
before = re.sub(r'<div class="field full" style="background:#fff4e6;border-radius:10px;padding:12px"><strong>Imagen de pasaporte.*?</small></div>',
    lambda m: '<div class="field full alma-formdoc"><span>Foto del pasaporte (opcional)</span>'
    '<div class="alma-formdoc-row"><label class="btn ghost tiny">📷 Sacar foto o elegir archivo'
    '<input id="almaFormDoc" type="file" accept="image/*,application/pdf" hidden></label>'
    '<span id="almaFormDocInfo" class="sub">Sin archivo</span></div><div id="almaFormDocPrev"></div>'
    '<small class="sub">Página de los datos del pasaporte (foto o PDF). Se guarda junto con la ficha.</small></div>',
    before, count=1, flags=re.S)
assert 'almaFormDoc' in before

# Botones «Ver folleto» y «Subir folleto» en la ficha de la salida
before = sub('<h2 id="groupDetailTitle">Pasajeros de la salida</h2><div class="actionset">',
             '<h2 id="groupDetailTitle">Pasajeros de la salida</h2><div class="actionset">'
             '<button type="button" id="almaFolletoVer" class="btn tiny btn-folleto" onclick="almaVerFolleto()" hidden>🖼 Ver folleto</button>'
             '<label class="btn ghost tiny"><span id="almaFolletoSubirTxt">+ Subir folleto</span>'
             '<input type="file" accept="image/*,application/pdf" hidden onchange="almaSubirFolleto(this)"></label>', before)

logo = re.search(r'<img src="(data:image/png;base64,[^"]+)"', before).group(1)
login = (HERE / 'src' / 'login.html').read_text(encoding='utf-8').replace('{{LOGO}}', logo)
online = (HERE / 'src' / 'online.js').read_text(encoding='utf-8')
online += '\n' + (HERE / 'src' / 'ayuda.js').read_text(encoding='utf-8')
online += '\n' + (HERE / 'src' / 'cotizador.js').read_text(encoding='utf-8')
online += '\n' + (HERE / 'src' / 'sciweb.js').read_text(encoding='utf-8')
online += '\n' + (HERE / 'src' / 'salidaflyer.js').read_text(encoding='utf-8')
online += '\n' + (HERE / 'src' / 'codigo.js').read_text(encoding='utf-8')
online += '\n' + (HERE / 'src' / 'whatsapp.js').read_text(encoding='utf-8')

before = sub('</head>', (HERE / 'src' / 'login.css').read_text(encoding='utf-8') + (HERE / 'src' / 'cotizador.css').read_text(encoding='utf-8') + '</head>', before)
sys.path.insert(0, str(HERE))
import tema
before = tema.aplicar(before)
out = (before + login
       + '<script>' + online + '</script>\n'
       + '<script type="text/plain" id="almaAppSource">' + app + '</script>' + after)
assert '</script>' not in app
# ---------- textos de la demo ----------
import re as _re
TEXTOS = [
    (' en esta demostración', ''), ('Solo socios · Demo', 'Solo socios'),
    (' Acceso administrativo simulado: solo socios.', ' Acceso exclusivo de socios.'),
    ('quedan en la bitácora de demostración', 'quedan en la bitácora'), (' La bitácora de esta demo no es inmutable.', ''),
    ('En esta demostración los registros son locales y NO están protegidos contra modificaciones fuera de la interfaz.',
     'Los registros los genera el servidor automáticamente y nadie puede editarlos ni borrarlos.'),
    ('placeholder="Cliente de prueba"', 'placeholder="Nombre y apellido"'), ('placeholder="Pasajero de prueba"', 'placeholder="Nombre y apellido"'),
    ('Registrado por (usuario de prueba)', 'Registrado por'), ('Opcional (datos de prueba)', 'Opcional'),
    ('Para enviar en esta demo: ', 'Para enviar: '), ('placeholder="Solo datos ficticios"', 'placeholder="Opcional"'),
    ('Buscar por nombre, teléfono o datos ficticios de documento', 'Buscar por nombre, teléfono, DNI o pasaporte'),
    ('DNI (ficticio)', 'DNI'), ('CUIL / CUIT (ficticio)', 'CUIL / CUIT'), (' · solo pruebas', ''),
    ('Nº de pasaporte (ficticio)', 'Nº de pasaporte'), ('Pasaporte ficticio:', 'Pasaporte:'),
    ('Imagen de pasaporte · pendiente de implementación segura', 'Foto del pasaporte'),
    ('En la futura aplicación, aquí se podrá adjuntar el documento en almacenamiento privado, con permisos de consulta. Esta demostración NO acepta ni almacena imágenes de pasaportes.',
     'Después de guardar la ficha, abrila con «Ver ficha» y usá «+ Subir archivo» para adjuntar la foto o el PDF del pasaporte.'),
    ('Para proteger datos personales, no cargues DNI, pasaportes ni fotos reales en esta demostración local. Los dos pasaportes recibidos se usan solo para definir los campos, no están insertados aquí.',
     'Los datos personales quedan guardados en el servidor y solo los ve el personal de la agencia con su usuario.'),
    ('; en esta demo es necesario adjuntar el PDF manualmente.', '; es necesario adjuntar el PDF manualmente.'),
    ('En la demo, solo se admite efectivo con fecha de hoy.', 'Solo se admite efectivo con fecha de hoy.'),
    ('No se puede anular desde esta demo porque', 'No se puede anular porque'),
    ('Informe financiero de DEMOSTRACIÓN', 'Informe financiero'),
    ('Todavía no hay reservas creadas por este usuario ficticio.', 'Todavía no hay reservas creadas por tu usuario.'),
]
for a, b in TEXTOS:
    out = out.replace(a, b)
# Formulario de pasajero: textos que quedaban de la demo
for a, b in [('Para proteger datos personales, no cargues DNI, pasaportes ni fotos reales local. Los dos pasaportes recibidos se usan solo para definir los campos, no están insertados aquí.',
              'Los datos personales quedan guardados en el servidor y solo los ve el personal de la agencia con su usuario.'),
             ('Ficha del pasajero · Demostración', 'Ficha del pasajero'), ('Observaciones no sensibles', 'Observaciones'),
             ('placeholder="Notas generales de ejemplo"', 'placeholder="Notas generales"')]:
    out = out.replace(a, b)
out = _re.sub(r'<b>Versión de prueba:</b>[^<]*', '<b>Envío por email:</b> se abre un borrador en tu aplicación de correo. Antes de enviarlo, adjuntá el PDF del recibo.', out)
out = _re.sub(r'<div class="panel"><b>En la versión real</b>.*?</div>', '', out, flags=_re.S)
out = _re.sub(r'<div class="panel"><b>Documentos privados en la versión definitiva</b>.*?</div>', '', out, flags=_re.S)
# Textos que quedaban de la versión de prueba
for a, b in [
    (' El envío automático se implementará en la versión online.', ''),
    (' En el sistema online cada vendedor utilizará únicamente su oficina asignada.', ''),
    (' El sistema todavía no envía automáticamente.', ''),
    ('En la versión online el usuario se tomará de su sesión, sin poder elegir otro.', 'Queda registrado con tu usuario.'),
    (' Se requerirá un ajuste autorizado en la versión online.', ' Consultá con un socio para registrar un ajuste.'),
    ('Este prototipo no sustituye una conciliación bancaria.', 'No reemplaza la conciliación bancaria.'),
    ("['Fecha / hora','Perfil de prueba','Acción','Objeto / detalle']", "['Fecha / hora','Usuario','Acción','Objeto / detalle']"),
    ('No se encontró apertura para la fecha del navegador.', 'Todavía no se abrió la caja hoy.'),
    ("notify('Usuario ficticio: '+value)", "notify('Usuario: '+value)"),
    ('placeholder="ejemplo@correo.test"', 'placeholder="nombre@correo.com"'),
    ('placeholder="pasajero@ejemplo.test"', 'placeholder="nombre@correo.com"'),
    ('placeholder="comercial@ejemplo.com"', 'placeholder="comercial@operador.com"'),
    ('placeholder="Ej.: Operador de ejemplo"', 'placeholder="Ej.: nombre del operador u hotel"'),
    ('placeholder="Ej.: Persona de ejemplo"', 'placeholder="Como figura en el pasaporte"'),
    ('placeholder="No uses documentos reales"', 'placeholder="Ej.: 30123456"'),
]:
    if a not in out:
        raise SystemExit(f'Texto de prueba no encontrado: {a[:70]!r}')
    out = out.replace(a, b)

# ---- Mejoras: responsable, buscador, DNI/pasaporte, moneda y comprobante de cobros (src/mejoras.js) ----
def fsub(a, b, count=1):
    global out
    if a not in out:
        raise SystemExit(f'No encontrado (mejoras): {a[:80]!r}')
    out = out.replace(a, b) if count == 0 else out.replace(a, b, count)
fsub("'birthPlace','documentSex','notes']", "'birthPlace','documentSex','notes','docType','dniExpiry','guardian1','guardian2']", 0)
fsub('<label class="field">DNI <input name="doc" placeholder="Ej.: 30123456"></label>',
     '<label class="field">Documento de viaje<select name="docType" onchange="almaDocTypeSync()"><option value="Pasaporte">Pasaporte</option><option value="DNI">DNI</option></select></label>'
     '<label class="field">Número de DNI<input name="doc" placeholder="Ej.: 30123456"></label>'
     '<label class="field" id="almaDniExpiryWrap" style="display:none">Vencimiento del DNI<input name="dniExpiry" type="date"></label>')
fsub('<label class="field">Nº de pasaporte<input name="passportNumber"', '<label class="field alma-pp">Nº de pasaporte<input name="passportNumber"')
fsub('<label class="field">Fecha de emisión del pasaporte<input name="passportIssued"', '<label class="field alma-pp">Fecha de emisión del pasaporte<input name="passportIssued"')
fsub('<label class="field">Vencimiento del pasaporte<input name="passportExpiry"', '<label class="field alma-pp">Vencimiento del pasaporte<input name="passportExpiry"')
fsub("<span>Vencimiento pasaporte: '+fmt(p.passportExpiry)+'</span>",
     "<span>Documento de viaje: '+esc(p.docType||(p.passportNumber?'Pasaporte':p.doc?'DNI':'—'))+'</span><span>'+(p.docType==='DNI'?'Vencimiento DNI: '+fmt(p.dniExpiry):'Vencimiento pasaporte: '+fmt(p.passportExpiry))+'</span>")
fsub("owner:owners[0],status:'Abierta'", "owner:almaYo()||owners[0],status:'Abierta'", 0)
# cobros: moneda del pago + cotización + comprobante
fsub('<label class="field">Importe recibido<input type="number" name="amount" id="paymentAmount"',
     '<label class="field"><span id="almaPayAmountLbl">Importe recibido</span><input type="number" name="amount" id="paymentAmount"')
fsub('<label class="field">Medio de pago<select name="method"><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Depósito</option><option>Otro</option></select></label><div class="field"><label for="paymentAutoConcept">',
     '<label class="field">Medio de pago<select name="method" onchange="almaPayFxSync()"><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Depósito</option><option>Otro</option></select></label>'
     '<label class="field">Moneda del pago<select name="payCurrency" id="almaPayCur"><option value="USD">Dólares (USD)</option><option value="ARS">Pesos (ARS)</option><option value="EUR">Euros (EUR)</option></select></label>'
     '<label class="field" id="almaPayRateWrap" style="display:none"><span id="almaPayRateLbl">Cotización</span><input name="payRate" id="almaPayRate" type="number" min="0" step="0.0001" inputmode="decimal" oninput="updatePaymentPreview()" placeholder="Ej.: 1200"></label>'
     '<label class="field full" id="almaPayFileWrap">Comprobante de la transferencia (opcional)<input type="file" id="almaPayFile" accept="image/*,application/pdf"></label>'
     '<div class="field"><label for="paymentAutoConcept">')
fsub("const raw=form.elements.amount.value;\n const amount=Number(raw);", "const raw=form.elements.amount.value;\n const amount=almaFxApplied(Number(raw),currency);")
fsub("$('paymentBalancePreview').innerHTML=msg;", "$('paymentBalancePreview').innerHTML=almaFxNote(Number(raw),currency)+almaPorNote(amount,currency)+msg;")
fsub("const amount=Number(x.amount);if(!(amount>0)||amount>balance(b)+0.001)", "const fx=almaFx(x,cur(b));if(!fx)return;const amount=fx.applied;if(!(amount>0)||amount>balance(b)+0.001)")
fsub("recordedBy:x.recordedBy,recordedAt:new Date().toISOString()};", "recordedBy:x.recordedBy,recordedAt:new Date().toISOString(),...fx.fields,...almaPorPaxFields(b,amount),...almaDestFields(x)};")
fsub('<b>RECIBIDO AHORA:</b><br><b>${money(p.amount,snap.currency)}</b>', '<b>RECIBIDO AHORA:</b><br><b>${money(p.amount,snap.currency)}</b>${almaFxRecibo(p,snap.currency)}')
fsub('<div id="receiptPaper" class="receipt"></div>', '<div id="receiptPaper" class="receipt"></div><div id="almaComprob" class="alma-comp"></div>')
# caja y banco: el efectivo/transferencia entra en la moneda en que se pagó
fsub("for(const p of state.payments){const b=findBooking(p.bookingId),currency=b?cur(b):(p.snapshot?.currency||'USD');",
     "for(const p of state.payments){const b=findBooking(p.bookingId),currency=p.payCurrency||(b?cur(b):(p.snapshot?.currency||'USD')),recv=p.payCurrency?Number(p.payAmount):Number(p.amount);")
fsub("method:p.method,currency,amount:Number(p.amount)});", "method:p.method,currency,amount:recv});")
fsub("method:p.method,currency,amount:-Number(p.amount)})", "method:p.method,currency,amount:-recv})")
fsub("cur(findBooking(p.bookingId)||{kind:'individual',currency:c})===c).reduce((sum,p)=>sum+Number(p.amount),0)",
     "(p.payCurrency||cur(findBooking(p.bookingId)||{kind:'individual',currency:c}))===c).reduce((sum,p)=>sum+Number(p.payCurrency?p.payAmount:p.amount),0)")

# Menú: «Caja» para todos (vendedor → Caja operativa; socio → Caja · Centro y Gaona)
CAJA_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/></svg>'
fsub('<span>Cobros y recibos</span></button>',
     '<span>Cobros y recibos</span></button><button data-page="cajaoperativa" class="alma-nav-vend">' + CAJA_SVG + '<span>Caja</span></button>'
     '<button data-page="caja" class="alma-nav-socio">' + CAJA_SVG + '<span>Caja</span></button>')
fsub('<button data-page="caja" data-admin-only="true">' + CAJA_SVG + 'Caja</button>',
     '<button data-page="cajaoperativa" class="alma-nav-vend">' + CAJA_SVG + 'Caja</button><button data-page="caja" data-admin-only="true">' + CAJA_SVG + 'Caja</button>')

# Caja: «Abrir caja nueva» para que no se confunda con abrir la caja existente
fsub(">+ Abrir caja</button>", ">+ Abrir caja nueva</button>", 0)
fsub("usar «Abrir caja» para", "usar «Abrir caja nueva» para")

# Ficha del pasajero: mostrar fecha de nacimiento y edad
fsub("<span>Nacionalidad: '+esc(p.nationality||'—')+'</span>",
     "<span>Fecha de nacimiento: '+(p.birthDate?fmt(p.birthDate)+(almaEdad(p.birthDate)!=null?' ('+almaEdad(p.birthDate)+' años)':''):'—')+'</span><span>Nacionalidad: '+esc(p.nationality||'—')+'</span>")

# Caja: categoría de gasto «Pago a proveedores»
fsub("'Viáticos','Caja chica','Otros egresos'],retiro", "'Viáticos','Caja chica','Pago a proveedores','Otros egresos'],retiro")
fsub("<option>Caja chica</option><option>Retiro de socios</option>", "<option>Caja chica</option><option>Pago a proveedores</option><option>Retiro de socios</option>")

# Historial de caja: botón «Ver movimientos» por apertura
fsub("' · Turno '+turn+'</span>'+(x.reopeningReason?", "' · Turno '+turn+'</span><button type=\"button\" class=\"btn ghost tiny\" style=\"margin-top:6px\" onclick=\"almaCajaDia(&quot;'+x.id+'&quot;)\">👁 Ver movimientos del día</button>'+(x.reopeningReason?")

# Pedidos: botón «Eliminar pedido» (socios)
# (abajo de «Confirmar pedido», separado de «+ Otra opción»)
fsub("orderNextStep(o)+'</td></tr>'",
     "orderNextStep(o)+(almaEsSocio()?'<div style=\"margin-top:10px\">'+almaDelBtn('almaEliminarPedido',o.id,'Eliminar pedido')+'</div>':'')+'</td></tr>'")

# «+ Otra opción» pide confirmación antes de copiar el pedido
fsub("window.newQuoteOption=id=>{const o=findOrder(id);if(!o)return;",
     "window.newQuoteOption=id=>{const o=findOrder(id);if(!o)return;if(!confirm('¿Crear otra opción de cotización para '+o.client+'?\\n\\nSe hace una copia de este pedido para cotizar otro hotel, fecha o precio. El pedido original no cambia.'))return;")


# Pedidos de cotización: la columna muestra el responsable (quien lo cargó)
fsub("table('ordersTable',['Cliente / destino','Tipo','Pedido','Socio'", "table('ordersTable',['Cliente / destino','Tipo','Pedido','Responsable'")

# Pasajero obligatorio de la base (src/mejoras.js, punto 5)
fsub('Pasajero ya registrado (opcional)<select id="bookingExistingPassenger"', 'Pasajero (de la Base de pasajeros)<select id="bookingExistingPassenger"')
fsub('Pasajero ya cargado (opcional)<select id="individualExistingPassenger"', 'Titular (de la Base de pasajeros)<select id="individualExistingPassenger"')
# Inscribir en grupo: «Teléfono de contacto», se completa con la ficha y si falta se guarda en la ficha
fsub('placeholder="Un pasajero por ficha" required></label><label class="field">Contacto<input name="phone" placeholder="Opcional"></label>',
     'placeholder="Un pasajero por ficha" required></label><label class="field">Teléfono de contacto<input name="phone" id="almaGroupPhone" type="tel" placeholder="Ej.: 11 4992-4267"></label>')
fsub('<label class="field">Contacto / teléfono<input name="phone" id="individualPhone" placeholder="Opcional">',
     '<label class="field">Teléfono de contacto<input name="phone" id="individualPhone" type="tel" placeholder="Ej.: 11 4992-4267">')
# Inscribir: tipo de habitación y compañeros de habitación (src/mejoras.js, punto 7)
fsub('<label class="field">Responsable<select name="owner" id="bookingOwner"></select></label>',
     '<label class="field">Tipo de habitación<select name="roomType" id="almaRoomType" onchange="almaRoomSync()"><option value="">Sin definir (asignar después)</option><option>Single</option><option>Doble matrimonial</option><option>Doble twin</option><option>Triple</option><option>Cuádruple</option><option value="A compartir">A compartir (con pasajero del operador)</option></select></label>'
     '<div class="field full alma-mates" id="almaRoomMates" style="display:none"><span>Comparte la habitación con</span>'
     '<label class="field" id="almaMate1Wrap">Pasajero 2<select id="almaMate1"></select></label>'
     '<label class="field" id="almaMate2Wrap">Pasajero 3<select id="almaMate2"></select></label>'
     '<label class="field" id="almaMate3Wrap">Pasajero 4<select id="almaMate3"></select></label>'
     '<small class="hint">Si todavía no está inscripto en la salida, el sistema ofrece inscribirlo con su propia cuenta. Si no está en la base, dalo de alta primero.</small></div>'
     '<label class="field">Responsable<select name="owner" id="bookingOwner"></select></label>')
fsub('<label class="field" data-edit-kind="grupal individual aereo">Precio del paquete / viaje<input type="number" name="price"',
     '<div class="field full" id="almaERoomBox" style="display:none"><div class="formgrid">'
     '<label class="field">Tipo de habitación<select id="almaERoomType" onchange="almaERoomSync()"><option value="">Sin definir (asignar después)</option><option>Single</option><option>Doble matrimonial</option><option>Doble twin</option><option>Triple</option><option>Cuádruple</option><option value="A compartir">A compartir (con pasajero del operador)</option></select></label>'
     '<div class="field full alma-mates" id="almaERoomMates" style="display:none"><span>Comparte la habitación con</span>'
     '<label class="field" id="almaEMate1Wrap">Pasajero 2<select id="almaEMate1"></select></label>'
     '<label class="field" id="almaEMate2Wrap">Pasajero 3<select id="almaEMate2"></select></label>'
     '<label class="field" id="almaEMate3Wrap">Pasajero 4<select id="almaEMate3"></select></label>'
     '<small class="hint">Si todavía no está inscripto en la salida, el sistema ofrece inscribirlo con su propia cuenta. Si no está en la base, dalo de alta primero.</small></div>'
     '</div><small class="hint" id="almaERoomNow"></small></div>'
     '<label class="field" data-edit-kind="grupal individual aereo">Precio del paquete / viaje<input type="number" name="price"')
fsub("(b.passengerId!==id?' · acompañante de '+esc(b.client):'')+'</span></td>",
     "(b.passengerId!==id?' · acompañante de '+esc(b.client):'')+'</span>'+almaHabInfo(b,id)+'</td>")
# Familias: padres/tutores en la ficha, cuenta familiar, plazas y aviso de autorización (src/mejoras.js, punto 8)
fsub('<label class="field full">Observaciones<textarea name="notes" placeholder="Notas generales"></textarea></label>',
     '<div class="field full alma-mates"><span>Familia · padres o tutores (si es menor)</span>'
     '<label class="field">Padre / madre / tutor 1<select name="guardian1" id="almaG1"></select></label>'
     '<label class="field">Padre / madre / tutor 2<select name="guardian2" id="almaG2"></select></label>'
     '<small class="hint" id="almaMinorInfo"></small></div>'
     '<label class="field full">Observaciones<textarea name="notes" placeholder="Notas generales"></textarea></label>')
fsub('</div><div id="almaDocs" class="alma-docs"></div><p class="hint">Ficha general', "</div>'+almaFamInfo(p)+'<div id=\"almaDocs\" class=\"alma-docs\"></div><p class=\"hint\">Ficha general")
fsub('<small class="hint">Si todavía no está inscripto en la salida, el sistema ofrece inscribirlo con su propia cuenta. Si no está en la base, dalo de alta primero.</small></div><label class="field">Responsable<select name="owner" id="bookingOwner">',
     '<small class="hint">Si todavía no está inscripto en la salida, el sistema ofrece inscribirlo con su propia cuenta. Si no está en la base, dalo de alta primero.</small>'
     '<div id="almaFamBox" style="display:none"><b>Cuenta</b> <label class="alma-radio"><input type="radio" name="almaFam" id="almaFamNo" checked> Una cuenta por pasajero</label>'
     '<label class="alma-radio"><input type="radio" name="almaFam" id="almaFamSi"> Cuenta familiar a nombre del titular</label>'
     '<small class="hint" id="almaFamHint"></small><small class="hint" id="almaFamTotal"></small></div></div>'
     '<label class="field">Responsable<select name="owner" id="bookingOwner">')
# cupos por plazas (una cuenta familiar ocupa una plaza por integrante)
fsub("if(g.capacity>0&&state.bookings.filter(b=>b.kind==='grupal'&&b.groupId===g.id&&accountStatus(b)!=='Baja').length>=g.capacity)", "if(g.capacity>0&&almaPlazas(g.id)>=g.capacity)")
fsub("let count=state.bookings.filter(b=>b.kind==='grupal'&&b.groupId===g.id&&accountStatus(b)!=='Baja').length;", "let count=almaPlazas(g.id);")
fsub("<small>Pasajeros activos</small><strong>'+active.length+' / '", "<small>Pasajeros activos</small><strong>'+almaPlazas(g.id)+' / '")
fsub("const occupants=bs.filter(b=>b.roomId===room.id);out+='<div class=\"room-card\"><b>'+'Habitación / grupo '+esc(room.label)+'</b><span class=\"sub\">'+esc(room.type)+' · '+occupants.length+' de '",
     "const occupants=bs.filter(b=>b.roomId===room.id);out+='<div class=\"room-card\"><b>'+'Habitación / grupo '+esc(room.label)+'</b><span class=\"sub\">'+esc(room.type)+' · '+occupants.reduce((n,b)=>n+almaPlaza(b),0)+' de '")
fsub("onclick=\"openPassengerProfile(&quot;'+b.passengerId+'&quot;)\">'+esc(b.client)+'</button> <button class=\"btn ghost tiny\" title=\"Quitar de esta habitación\"",
     "onclick=\"openPassengerProfile(&quot;'+b.passengerId+'&quot;)\">'+esc(b.client)+'</button>'+((b.companions||[]).length?' + '+(b.companions||[]).map(i=>esc(state.passengers.find(p=>p.id===i)?.name||'')).join(', '):'')+' <button class=\"btn ghost tiny\" title=\"Quitar de esta habitación\"")
fsub("&&x.id!==bookingId&&accountStatus(x)!=='Baja').length;if(occ>=Number(room.capacity))", "&&x.id!==bookingId&&accountStatus(x)!=='Baja').reduce((n,x)=>n+almaPlaza(x),0);if(occ+almaPlaza(b)>Number(room.capacity))")
# detalle de la salida: integrantes de la cuenta familiar y aviso
fsub("'+esc(b.client)+'</button><span class=\"sub\">ID cuenta: '+esc(b.id.slice(0,8))+'</span>'",
     "'+esc(b.client)+'</button>'+((b.companions||[]).length?'<span class=\"sub alma-hab\">👪 Cuenta familiar: + '+(b.companions||[]).map(i=>esc(state.passengers.find(p=>p.id===i)?.name||'')).join(', ')+'</span>':'')+almaAutoHtml(b)+'<span class=\"sub\">ID cuenta: '+esc(b.id.slice(0,8))+'</span>'")
# Excel: una fila por integrante de la cuenta familiar
fsub("if(mode==='pasajeros')sorted.sort(", "{const ex=[];for(const e of sorted){ex.push(e);for(const c of (e.b.companions||[]))ex.push({b:{...e.b,__pid:c,client:state.passengers.find(x=>x.id===c)?.name||''},room:e.room})}sorted.length=0;sorted.push(...ex)}if(mode==='pasajeros')sorted.sort(")
fsub("const p=state.passengers.find(x=>x.id===b.passengerId)||{},style=room?excelRowColor", "const p=state.passengers.find(x=>x.id===(b.__pid||b.passengerId))||{},style=room?excelRowColor")
# Cobro: primero el pasajero (de la base) y el viaje a cobrar (src/mejoras.js, punto 9)
fsub('<form id="paymentForm"><div class="modalbody"><div class="formgrid">',
     '<form id="paymentForm"><div class="modalbody"><div class="formgrid">'
     '<div class="field full alma-mates alma-paybox"><label class="field full">Pasajero (de la Base de pasajeros)<select id="almaPayPax"></select></label>'
     '<div class="alma-alta"><button type="button" class="btn ghost tiny" onclick="almaPayAlta()">➕ Dar de alta pasajero nuevo</button></div>'
     '<label class="field full" id="almaPayTripWrap" style="display:none">Viaje al que le cobrás<select id="almaPayTrip" onchange="almaPayTripSync()"></select><small class="hint" id="almaPayTripInfo"></small></label></div>')
# Cobro por un solo pasajero de la reserva (src/mejoras.js, punto 10)
fsub('<div class="field full"><div class="infobox" id="payInfo"></div></div>', '<div class="field full"><div class="infobox" id="payInfo"></div></div><div class="field full alma-mates" id="almaPorBox" style="display:none"><label class="field full">¿Por quién paga?<select id="almaPor"><option value="">Toda la reserva</option></select></label>'
     '<label class="field" id="almaPorShareWrap" style="display:none"><span id="almaPorShareLbl">Parte de este pasajero</span><input type="number" id="almaPorShare" min="0" step="0.01" inputmode="decimal"></label>'
     '<small class="hint">El recibo muestra el saldo de ese pasajero. La parte se propone dividiendo el total en partes iguales; podés cambiarla.</small></div>')
fsub('<b>PASAJERO:</b> ${esc(snap.client)}</div>', '<b>PASAJERO:</b> ${almaReciboPasajero(p,snap)}</div>')
fsub('<div class="receipt-line"><b>TOTAL DEL VIAJE:</b><br><b>${money(snap.total,snap.currency)}</b></div><div class="receipt-line"><b>PAGOS ANTERIORES:</b><br>${money(snap.paidBefore,snap.currency)}</div><div class="receipt-line"><b>RECIBIDO AHORA:</b><br><b>${money(p.amount,snap.currency)}</b>${almaFxRecibo(p,snap.currency)}</div><div class="receipt-line"><b>SALDO PENDIENTE TRAS ESTE PAGO:</b><br><b>${money(snap.balanceAfter,snap.currency)}</b></div>',
     '${almaReciboMontos(p,snap,extended,`<div class="receipt-line"><b>TOTAL DEL VIAJE:</b><br><b>${money(snap.total,snap.currency)}</b></div><div class="receipt-line"><b>PAGOS ANTERIORES:</b><br>${money(snap.paidBefore,snap.currency)}</div><div class="receipt-line"><b>RECIBIDO AHORA:</b><br><b>${money(p.amount,snap.currency)}</b>${almaFxRecibo(p,snap.currency)}</div><div class="receipt-line"><b>SALDO PENDIENTE TRAS ESTE PAGO:</b><br><b>${money(snap.balanceAfter,snap.currency)}</b></div>`)}')
# Recibo: sin espacio vacío bajo el logo, sin «Registrado el» y sin extensiones si no hay
fsub('<div style="font-size:11px">Cerrito 228, piso 8 A · CABA<br>+54 9 11 2671-3436<br>info@almaviajeraturismo.com</div></div><div><div class="receipt-line"><b>RECIBO Nº:</b> ${esc(p.number)}</div><div class="receipt-line"><b>FECHA DEL PAGO:</b> ${fmt(p.date)}</div><div class="receipt-line"><b>REGISTRADO EL:</b> ${formatCaptureStamp(p.recordedAt)}</div><div class="receipt-line"><b>PUNTO DE VENTA:</b> ${esc(cashboxName(p.cashbox))}</div><div class="receipt-line"><b>PASAJERO:</b> ${almaReciboPasajero(p,snap)}</div><div class="receipt-line"><b>FILE:</b> ${esc(snap.fileNumber||bookingFile(b))}</div><div class="receipt-line"><b>REGISTRADO POR:</b> ${esc(p.recordedBy||"No registrado")}</div><div class="receipt-line"><b>MODALIDAD:</b> ${snap.kind===\'grupal\'?\'Salida grupal\':snap.kind===\'aereo\'?\'Solo aéreo\':\'Viaje individual a medida\'}</div></div></div>',
     '<div class="alma-rc-dir">Cerrito 228, piso 8 A · CABA<br>+54 9 11 2671-3436<br>info@almaviajeraturismo.com</div><div class="receipt-line"><b>PUNTO DE VENTA:</b> ${esc(cashboxName(p.cashbox))}</div><div class="receipt-line"><b>REGISTRADO POR:</b> ${esc(p.recordedBy||"No registrado")}</div></div><div><div class="receipt-line"><b>RECIBO Nº:</b> ${esc(p.number)}</div><div class="receipt-line"><b>FECHA DEL PAGO:</b> ${fmt(p.date)}</div><div class="receipt-line"><b>PASAJERO:</b> ${almaReciboPasajero(p,snap)}</div><div class="receipt-line"><b>FILE:</b> ${esc(snap.fileNumber||bookingFile(b))}</div><div class="receipt-line"><b>MODALIDAD:</b> ${snap.kind===\'grupal\'?\'Salida grupal\':snap.kind===\'aereo\'?\'Solo aéreo\':\'Viaje individual a medida\'}</div></div></div>')
fsub('<div class="receipt-line"><b>EXTENSIÓN INDIVIDUAL:</b> ${extensionsLabel}</div>', '${extended>0?`<div class="receipt-line"><b>EXTENSIÓN INDIVIDUAL:</b> ${extensionsLabel}</div>`:\'\'}')
fsub('<div class="receipt-line"><b>EXTENSIÓN/ES:</b><br>${money(extended,snap.currency)}</div>', '${extended>0?`<div class="receipt-line"><b>EXTENSIÓN/ES:</b><br>${money(extended,snap.currency)}</div>`:\'\'}')
# Recibo de media hoja: observaciones en la columna izquierda
fsub("<b>CONCEPTO:</b> <strong>${esc(p.concept||'No informado')}</strong></div></div><div><div class=\"receipt-line\"><b>PRECIO BASE:</b>",
     "<b>CONCEPTO:</b> <strong>${esc(p.concept||'No informado')}</strong></div>${notes?`<div class=\"receipt-line\"><b>OBSERVACIONES:</b> ${esc(notes)}</div>`:''}</div><div><div class=\"receipt-line\"><b>PRECIO BASE:</b>")
fsub('<div class="receipt-notes"><b>OBSERVACIONES:</b> ${esc(notes||\'—\')}</div>', '')
# Cobros: buscador de recibos (src/mejoras.js, punto 12)
fsub('<div id="paymentsTable"></div>',
     '<div class="alma-recfiltros"><input type="search" id="almaRecQ" placeholder="🔍 Buscar por pasajero, recibo o file" oninput="almaRecFiltrar()" autocomplete="off">'
     '<select id="almaRecSal" onchange="almaRecFiltrar()"><option value="">Todos los viajes</option></select>'
     '<select id="almaRecEst" onchange="almaRecFiltrar()"><option value="">Vigentes y anulados</option><option value="vigentes">Solo vigentes</option><option value="anulados">Solo anulados</option></select>'
     '<small class="hint" id="almaRecInfo"></small></div><div id="paymentsTable"></div>')
fsub("function renderPayments(){table('paymentsTable',['Recibo','Pasajero / viaje','Fecha','Cobrado','Acción'],state.payments.map(",
     "function renderPayments(){table('paymentsTable',['Recibo','Pasajero / viaje','Fecha','Cobrado','Acción'],almaRecibosFiltrados().map(")
# Cobros sin efectivo: destino del dinero y fecha de acreditación (src/mejoras.js, punto 13)
fsub('<label class="field full" id="almaPayFileWrap">',
     '<div class="field full alma-mates" id="almaDestWrap" style="display:none"><span>¿A dónde fue el dinero?</span>'
     '<label class="field">Destino<select name="almaDest"><option value="">— Elegí —</option><option>BBVA pesos (agencia)</option><option>BBVA dólares (agencia)</option><option>Mercado Pago Grupostur (antigua SRL) · cuenta de socio</option><option>Otro</option></select></label>'
     '<label class="field">Fecha de acreditación<input type="date" name="almaDestFecha"></label>'
     '<label class="field full"><span id="almaDestDetLbl">Detalle (opcional)</span><input name="almaDestDet" placeholder="Ej.: cuenta personal de Hernan, Galicia"></label></div>'
     '<label class="field full" id="almaPayFileWrap">')
fsub("+' · File '+(p.snapshot?.fileNumber||bookingFile(b)),method:p.method,currency,amount:recv});",
     "+' · File '+(p.snapshot?.fileNumber||bookingFile(b))+almaDestTxt(p),method:p.method,currency,amount:recv,dest:p.destination||''});")
fsub("method:p.method,currency,amount:-recv})", "method:p.method,currency,amount:-recv,dest:p.destination||''})")
fsub("if(BANK_METHODS.includes(m.method))out.push", "if(BANK_METHODS.includes(m.method)&&(!m.dest||String(m.dest).startsWith('BBVA')))out.push")
fsub("Para movimientos en efectivo, abrí la caja primero.</p>')+'</div>'}", "Para movimientos en efectivo, abrí la caja primero.</p>')+almaNoEfectivoHoy(box)+'</div>'}")
fsub("+'</b><span class=\"sub\">'+esc(p.method)+' · '+esc(cashboxName(p.cashbox))+'</span>'+(p.voidedAt?",
     "+'</b><span class=\"sub\">'+esc(p.method)+' · '+esc(cashboxName(p.cashbox))+'</span>'+(p.method!=='Efectivo'?'<span class=\"sub\">'+(p.destination?'→ '+esc(p.destination)+(p.destinationDetail?' ('+esc(p.destinationDetail)+')':'')+(p.creditedDate?' · acreditado '+fmt(p.creditedDate):''):'<span class=\"alma-auto\">Destino sin indicar</span>'+(window.demoRole==='socio'&&!p.voidedAt?' <button type=\"button\" class=\"btn ghost tiny\" onclick=\"almaDestEditar(&quot;'+p.id+'&quot;)\">Indicar destino</button>':''))+'</span>':'')+(p.voidedAt?")
# Reservas: botón Eliminar (socios) en cada reserva
fsub("onclick=\"setAccountStatus(&quot;'+b.id+'&quot;,&quot;reabrir&quot;)\">Reabrir</button>')+'</div></td></tr>'),'No hay reservas todavía')",
     "onclick=\"setAccountStatus(&quot;'+b.id+'&quot;,&quot;reabrir&quot;)\">Reabrir</button>')+almaDelBtn('almaEliminarViaje',b.id)+'</div></td></tr>'),'No hay reservas todavía')")
# Reservas: buscador y filtros (src/mejoras.js, punto 15)
fsub('<div id="bookingsTable"></div>',
     '<div class="alma-recfiltros"><input type="search" id="almaResQ" placeholder="🔍 Buscar por file, pasajero o viaje" oninput="almaResFiltrar()" autocomplete="off">'
     '<select id="almaResTipo" onchange="almaResFiltrar()"><option value="">Todos los tipos</option></select>'
     '<select id="almaResEst" onchange="almaResFiltrar()"><option value="">Todos los estados</option><option value="abiertas">Abiertas</option><option value="saldo">Con saldo pendiente</option><option value="cerradas">Cerradas</option><option value="baja">Dadas de baja</option></select>'
     '<small class="hint" id="almaResInfo"></small></div><div id="bookingsTable"></div>')
fsub("function renderBookings(){table('bookingsTable',['Pasajero / viaje','Tipo / cuenta','Total','Abonado / saldo','Acciones'],state.bookings.map(",
     "function renderBookings(){table('bookingsTable',['Pasajero / viaje','Tipo / cuenta','Total','Abonado / saldo','Acciones'],almaReservasFiltradas().map(")
# Nombre del módulo: «Pedidos recibidos» → «Pedidos de cotización» (solo textos; datos y funciones iguales)
for a, b in [('Pedidos recibidos', 'Pedidos de cotización'), ('pedidos recibidos', 'pedidos de cotización'),
             ('Pedido recibido', 'Pedido de cotización'), ('pedido recibido', 'pedido de cotización'),
             ('Ingreso extraordinario', 'Ingreso')]:
    out = out.replace(a, b)

# Nacional / internacional: aéreos guardan el ámbito; reservas muestran la etiqueta
fsub("kind:'aereo',client:x.client", "kind:'aereo',scope:x.scope||'',client:x.client")
fsub("<td>'+badge(b.kind)+'<span class=\"sub\">'+accountChip(b)+'</span></td><td><b>'+money(total(b)",
     "<td>'+badge(b.kind)+almaAmbitoTag(b)+'<span class=\"sub\">'+accountChip(b)+'</span></td><td><b>'+money(total(b)")
fsub('<select id="almaResEst" onchange="almaResFiltrar()">', '<select id="almaResAmb" onchange="almaResFiltrar()"><option value="">Nacional e internacional</option><option>Nacional</option><option>Internacional</option><option value="-">Sin indicar</option></select><select id="almaResEst" onchange="almaResFiltrar()">')
fsub('<div id="commissionTable"></div></div>', '<div id="almaVentasVend"></div><div id="commissionTable"></div></div>')

# Salidas grupales: impuestos y gastos administrativos por pasajero (se suman al total de cada inscripto)
fsub("function grossTotal(b){return (b.kind==='grupal'?Number(b.basePrice||0):Number(b.total||0))",
     "function grossTotal(b){return (b.kind==='grupal'?Number(b.basePrice||0)+almaCargos(b):Number(b.total||0))")
fsub("base:b.kind==='grupal'?Number(b.basePrice):Number(b.total),", "base:b.kind==='grupal'?Number(b.basePrice):Number(b.total),taxes:almaCargosDe(b).tax,adminFee:almaCargosDe(b).adm,")
fsub("${extended>0?`<div class=\"receipt-line\"><b>EXTENSIÓN/ES:</b>",
     "${Number(snap.taxes||0)>0?`<div class=\"receipt-line\"><b>IMPUESTOS:</b><br>${money(snap.taxes,snap.currency)}</div>`:''}${Number(snap.adminFee||0)>0?`<div class=\"receipt-line\"><b>GASTOS ADMINISTRATIVOS:</b><br>${money(snap.adminFee,snap.currency)}</div>`:''}${extended>0?`<div class=\"receipt-line\"><b>EXTENSIÓN/ES:</b>")
fsub("(b.kind==='grupal'?'<span class=\"sub\">Incluye '+(b.extensions||[]).length+' extensión/es</span>':'')",
     "(b.kind==='grupal'?(almaCargos(b)?'<span class=\"sub\">Incluye impuestos y gastos adm. '+money(almaCargos(b),cur(b))+'</span>':'')+'<span class=\"sub\">Incluye '+(b.extensions||[]).length+' extensión/es</span>':'')")

# Comisiones: % nacional / internacional y extra (bono) por vendedor y mes (src/mejoras.js)
fsub("<div class=\"room-card\" style=\"margin-top:12px\"><h3>'+esc(seller)+' · '+c+' · '+commissionRate(seller)+' %</h3>'", "<div class=\"room-card alma-comcard\" style=\"margin-top:16px\"><h3>'+esc(seller)+' · '+c+' '+almaRateTxt(seller,ls)+'</h3>'")
fsub("'<tr><td><b>'+esc(l.file)+'</b></td>", "'<tr><td><b>'+esc(l.file)+'</b><span class=\"sub\">'+esc(l.scope||'Sin indicar')+' · '+l.rate+' %</span></td>")
fsub("const tot=ls.reduce((n,l)=>n+l.amount,0);", "const tot=ls.reduce((n,l)=>n+l.amount,0)+almaBono(seller,month,c).amount;")
fsub("'<p style=\"margin:10px 0 0\"><b>Total a pagar", "almaBonoHtml(seller,month,c,!!paid)+'<p style=\"margin:10px 0 0\"><b>Total a pagar")
fsub("const amount=Math.round(lines.reduce((n,l)=>n+l.amount,0)*100)/100;", "const amount=Math.round((lines.reduce((n,l)=>n+l.amount,0)+almaBono(seller,month,currency).amount)*100)/100;")
fsub("detail:lines.map(l=>({file:l.file,client:l.client,gain:Math.round(l.gain*100)/100,rate:l.rate,amount:l.amount}))",
     "detail:lines.map(l=>({file:l.file,client:l.client,gain:Math.round(l.gain*100)/100,rate:l.rate,amount:l.amount})).concat(almaBono(seller,month,currency).amount?[{file:'Extra',client:almaBono(seller,month,currency).reason||'Extra',gain:0,rate:0,amount:almaBono(seller,month,currency).amount}]:[])")
fsub("for(const p of state.commissionPayouts.filter(p=>p.month===month))", "for(const k of almaBonoKeys(month))if(!keys.includes(k))keys.push(k);for(const p of state.commissionPayouts.filter(p=>p.month===month))")

# Base de pasajeros: agregar o corregir el teléfono desde la lista (src/mejoras.js)
fsub("'</button></td><td>'+esc(p.phone||'—')+'<span class=\"sub\">'+esc(p.email||'')+'</span></td>", "'</button></td><td>'+almaTelCelda(p)+'<span class=\"sub\">'+esc(p.email||'')+'</span></td>")

# Finanzas: acceso «Comisión vendedores» lleva a la página Vendedores
fsub("<button class=\"quick\" onclick=\"document.getElementById('commissionPanel').scrollIntoView({behavior:'smooth'})\"><b>％ &nbsp; Comisiones</b><small>Liquidación mensual por vendedor.</small></button>",
     "<button class=\"quick\" onclick=\"switchPage('vendedores')\"><b>％ &nbsp; Comisión vendedores</b><small>Ficha de cada vendedor, ventas y liquidación mensual de comisiones.</small></button>")

# Pedidos: las cotizaciones enviadas se ven sombreadas en violeta
fsub("records.map(o=>'<tr><td><b>'+esc(o.client)+'</b><div><button class=\"btn ghost tiny\" style=\"margin:6px 0\" onclick=\"editOrder(",
     "records.map(o=>'<tr'+(o.status==='Cotización enviada'?' class=\"alma-enviada\"':'')+'><td><b>'+esc(o.client)+'</b><div><button class=\"btn ghost tiny\" style=\"margin:6px 0\" onclick=\"editOrder(")

# Proveedores: recibo de cada pago (src/mejoras.js)
fsub('<div class="field full"><div id="supplierPaymentHelp"', '<label class="field full">Recibo del pago (opcional)<input type="file" id="almaProvRecibo" accept="image/*,application/pdf"><small class="hint">Foto o PDF del recibo/factura. Queda guardado en la cuenta del proveedor.</small></label><div class="field full"><div id="supplierPaymentHelp"')
fsub("<th>Fecha</th><th>Concepto</th><th>Oficina</th><th>Importe</th></tr></thead><tbody>'+ps.map(sp=>{const e=es.find(e=>e.id===sp.expenseId);return '<tr><td>'+fmt(sp.date)+'</td><td>'+esc(e?.concept||'')+'</td><td>'+esc(cashboxName(sp.cashbox))+'</td><td>'+money(sp.amount,e?.currency||'USD')+'</td></tr>'}",
     "<th>Fecha</th><th>Concepto</th><th>Oficina</th><th>Importe</th><th>Recibo</th></tr></thead><tbody>'+ps.map(sp=>{const e=es.find(e=>e.id===sp.expenseId);return '<tr><td>'+fmt(sp.date)+'</td><td>'+esc(e?.concept||'')+'</td><td>'+esc(cashboxName(sp.cashbox))+'</td><td>'+money(sp.amount,e?.currency||'USD')+'</td><td id=\"almaPR'+sp.id+'\">'+almaProvRecibos(sp)+'</td></tr>'}")

# Recibo: envío real por mail desde info@ (con PDF adjunto)
fsub('<button class="btn ghost" onclick="openReceiptEmail()">✉ Preparar correo</button>', '<button class="btn ghost" onclick="openReceiptEmail()">✉ Enviar por mail</button>')
fsub('<p class="hint receipt-email-hint">Para enviar: guardá primero el recibo como PDF y adjuntalo al email.</p>',
     '<p class="hint receipt-email-hint">Al imprimir sale en una hoja A4 el original y el duplicado. Si el pasajero tiene email cargado, el recibo se le envía solo desde info@ al registrar el cobro.</p>')
# Pedidos: filtro por estado, «Pedidos cancelados», pendientes primero y en rojo después de 2 días (src/pedidos.js)
fsub("let records=state.orders.filter(x=>(x.client+' '+x.destination+' '+(x.notes||'')).toLowerCase().includes(q));",
     "let records=state.orders.filter(x=>almaPedidoFiltro(x)&&(x.client+' '+x.destination+' '+(x.notes||'')).toLowerCase().includes(q));")
fsub("records=[...seen.values()].flatMap(list=>list.slice().sort((a,b)=>optionSiblings(a).indexOf(a)-optionSiblings(b).indexOf(b)))}",
     "records=[...seen.values()].flatMap(list=>list.slice().sort((a,b)=>optionSiblings(a).indexOf(a)-optionSiblings(b).indexOf(b)))}records=almaPedidosOrden(records);")
fsub("records.map(o=>'<tr'+(o.status==='Cotización enviada'?' class=\"alma-enviada\"':'')+'><td>", "records.map(o=>'<tr'+almaPedidoClase(o)+'><td>")
fsub("</select>'+orderNextStep(o)+", "</select>'+almaPedidoAviso(o)+orderNextStep(o)+")
fsub("+'</td></tr>'),'Todavía no hay pedidos')}", "+'</td></tr>'),window.almaPedEstado?'No hay pedidos con este estado':'Todavía no hay pedidos')}")
fsub('<button class="btn" onclick="openOrder()">+ Nuevo pedido</button></div></div><div id="ordersTable">',
     '<select id="almaPedFiltro" onchange="almaPedFiltrar(this.value)" aria-label="Filtrar por estado">'
     '<option value="">Todos (sin cancelados)</option><option value="pendiente">Pendientes</option>'
     '<option value="enviada">Cotización enviada</option><option value="cancelado">Cancelados</option></select>'
     '<button class="btn" onclick="openOrder()">+ Nuevo pedido</button>'
     '<button class="btn ghost" id="almaPedCancBtn" onclick="almaPedCancelados()">Pedidos cancelados</button></div></div><div id="ordersTable">')

# Pedido de cotización: por dónde entró la consulta
fsub('<label class="field">WhatsApp / contacto<input name="phone" placeholder="Opcional"></label>',
     '<label class="field">WhatsApp / contacto<input name="phone" placeholder="Opcional"></label><label class="field">¿Por dónde entró la consulta?<select name="channel" id="orderChannel"><option value="">— Sin indicar —</option><option>WhatsApp</option><option>Instagram</option><option>Facebook</option><option>Llamada telefónica</option><option>Email</option><option>Presencial en oficina</option><option>Página web</option><option>Recomendación de un pasajero</option><option>Otro</option></select></label>')
fsub("esc(o.client)+'</b><div><button class=\"btn ghost tiny\" style=\"margin:6px 0\" onclick=\"editOrder(",
     "esc(o.client)+'</b>'+(o.channel?'<span class=\"sub\">vía '+esc(o.channel)+'</span>':'')+'<div><button class=\"btn ghost tiny\" style=\"margin:6px 0\" onclick=\"editOrder(")
# Inscribir en grupo: aviso visible para cargar al acompañante de habitación
fsub('<label class="field full">Nombre del pasajero<input name="client" id="groupPassengerName" placeholder="Un pasajero por ficha" required></label>',
     '<label class="field full">Nombre del pasajero<input name="client" id="groupPassengerName" placeholder="Un pasajero por ficha" required></label><div class="field full alma-acomp-aviso" id="almaAcompAviso">🛏 <b>¿Comparte habitación?</b> Elegí <b>Doble, Triple o Cuádruple</b> en «Tipo de habitación» y ahí seleccionás al acompañante. <button type="button" class="btn ghost tiny" onclick="const s=document.getElementById(\'almaRoomType\');s.scrollIntoView({behavior:\'smooth\',block:\'center\'});s.focus()">Elegir habitación ↓</button></div>')
# Rooming: tipo «A compartir» (comparte con un pasajero del operador)
fsub('<option>Cuádruple</option><option>Otra</option></select>','<option>Cuádruple</option><option>A compartir</option><option>Otra</option></select>')
# Control: el código de la app tiene que compilar (evita publicar una página rota)
import re as _re, shutil as _sh, subprocess as _sp, tempfile as _tf
_m = _re.search(r'<script type="text/plain" id="almaAppSource">([\s\S]*?)</script>', out)
if _m and _sh.which('node'):
    with _tf.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as _f:
        _f.write(_m.group(1))
    _r = _sp.run(['node', '--check', _f.name], capture_output=True, text=True)
    if _r.returncode:
        raise SystemExit('El código de la app no compila:\n' + _r.stderr[-800:])
OUT.write_text(out, encoding='utf-8')
print('OK', OUT, len(out) // 1024, 'KB')
