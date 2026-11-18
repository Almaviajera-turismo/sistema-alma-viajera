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
before = sub('Versión de prueba · datos solo en este navegador', 'Sistema online · datos compartidos', before)
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
fsub("'birthPlace','documentSex','notes']", "'birthPlace','documentSex','notes','docType','dniExpiry']", 0)
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
fsub("$('paymentBalancePreview').innerHTML=msg;", "$('paymentBalancePreview').innerHTML=almaFxNote(Number(raw),currency)+msg;")
fsub("const amount=Number(x.amount);if(!(amount>0)||amount>balance(b)+0.001)", "const fx=almaFx(x,cur(b));if(!fx)return;const amount=fx.applied;if(!(amount>0)||amount>balance(b)+0.001)")
fsub("recordedBy:x.recordedBy,recordedAt:new Date().toISOString()};", "recordedBy:x.recordedBy,recordedAt:new Date().toISOString(),...fx.fields};")
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

# Pedidos: botón «Eliminar pedido» (socios)
fsub("👥 Pasajeros ('+(o.travelers||[]).length+')</button></div>'+optionTag(o)",
     "👥 Pasajeros ('+(o.travelers||[]).length+')</button> '+almaDelBtn('almaEliminarPedido',o.id,'Eliminar pedido')+'</div>'+optionTag(o)")


# Pedidos de cotización: la columna muestra el responsable (quien lo cargó)
fsub("table('ordersTable',['Cliente / destino','Tipo','Pedido','Socio'", "table('ordersTable',['Cliente / destino','Tipo','Pedido','Responsable'")
# Nombre del módulo: «Pedidos recibidos» → «Pedidos de cotización» (solo textos; datos y funciones iguales)
for a, b in [('Pedidos recibidos', 'Pedidos de cotización'), ('pedidos recibidos', 'pedidos de cotización'),
             ('Pedido recibido', 'Pedido de cotización'), ('pedido recibido', 'pedido de cotización')]:
    out = out.replace(a, b)
OUT.write_text(out, encoding='utf-8')
print('OK', OUT, len(out) // 1024, 'KB')
