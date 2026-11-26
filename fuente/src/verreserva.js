/* Alma Viajera · «👁 Ver reserva»: ficha completa de una reserva, solo lectura.
   Muestra datos del viaje, pasajeros, importes, cobros (recibos) y pagos a proveedores.
   Se inserta dentro del script principal (build.py), así usa el estado y las funciones del sistema. */
(function(){
 if(document.getElementById('almaVerResDialog'))return;
 const d=document.createElement('dialog');d.className='dialog';d.id='almaVerResDialog';
 d.innerHTML='<div class="modalhead"><h2 id="almaVerResTitle">Reserva</h2><div style="display:flex;gap:6px">'
  +'<button class="btn ghost tiny" type="button" onclick="goBack()">← Volver</button>'
  +'<button class="btn ghost tiny" type="button" onclick="goHome()">⌂ Inicio</button></div></div>'
  +'<div class="modalbody"><div id="almaVerResBody" class="alma-ficha"></div></div>';
 document.body.appendChild(d);
})();
function almaVRFila(k,v){return v===''||v==null?'':'<div class="alma-ff"><span>'+k+'</span><b>'+v+'</b></div>'}
function almaVRTabla(cols,rows,vacio){
 if(!rows.length)return '<p class="hint">'+vacio+'</p>';
 return '<div class="tablewrap"><table class="table"><thead><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'}
function almaVRProveedores(key,titulo,nota,filtro){
 const exps=(state.expenses||[]).filter(e=>e.operationKey===key&&(!filtro||filtro(e)));
 let h='<h4>'+titulo+'</h4>'+(nota?'<p class="hint">'+nota+'</p>':'');
 if(!exps.length)return h+'<p class="hint">No hay compromisos con proveedores cargados.</p>';
 const tot={};
 for(const e of exps){
  const c=e.currency||'USD',pagado=paidSupplier(e),pend=Number(e.amount||0)-pagado;
  tot[c]=tot[c]||{comp:0,pag:0};tot[c].comp+=Number(e.amount||0);tot[c].pag+=pagado;
  const pagos=(state.supplierPayments||[]).filter(p=>p.expenseId===e.id).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  h+='<div class="alma-vr-prov"><div class="alma-vr-provhead"><div><b>'+esc(e.provider||'Proveedor')+'</b><span class="sub">'+esc(e.concept||'')+(e.supplierRef?' · Loc. '+esc(e.supplierRef):'')+'</span></div>'
   +'<div style="text-align:right">Compromiso <b>'+money(e.amount,c)+'</b><span class="sub">'+(pend>.001?'<b style="color:#aa431d">Pendiente '+money(pend,c)+'</b>'+(e.dueDate?' · vence '+fmt(e.dueDate):''):'<span class="tag green">Saldado</span>')+'</span></div></div>'
   +(typeof almaLiqHtml==='function'?'<div class="alma-liq" id="almaLiq'+e.id+'">'+almaLiqHtml(e)+'</div>':'')
   +almaVRTabla(['Fecha','Oficina','Medio / ref.','Importe'],pagos.map(p=>'<tr><td>'+fmt(p.date)+'</td><td>'+esc(cashboxName(p.cashbox))+'</td><td>'+esc(p.method||'—')+(p.reference?'<span class="sub">'+esc(p.reference)+'</span>':'')+'</td><td><b>'+money(p.amount,c)+'</b></td></tr>'),'Todavía no se le pagó nada a este proveedor.')
   +'</div>'}
 h+='<div class="alma-ficha-grid">'+Object.entries(tot).map(([c,t])=>almaVRFila('Pagado a proveedores ('+c+')',money(t.pag,c)+'<span class="sub">de '+money(t.comp,c)+' comprometido</span>')).join('')+'</div>';
 return h}
window.almaVerReserva=id=>{
 const b=findBooking(id);if(!b)return;
 const g=b.kind==='grupal'?findGroup(b.groupId):null,c=cur(b),socio=window.demoRole==='socio';
 const salida=g?g.departure:b.departure,regreso=g?g.returnDate:b.returnDate;
 const tipo=b.kind==='grupal'?'Salida grupal':b.kind==='individual'?'Viaje individual':'Solo aéreo';
 let h='<div class="alma-ficha-head"><h3>'+esc(b.client)+'</h3><div style="display:flex;gap:6px;flex-wrap:wrap">'
  +(accountStatus(b)==='Abierta'?'<button type="button" class="btn ghost tiny" onclick="closeDialog(&quot;almaVerResDialog&quot;);editBooking(&quot;'+b.id+'&quot;)">✎ Editar reserva</button>':'')
  +(payable(b)?'<button type="button" class="btn tiny" onclick="closeDialog(&quot;almaVerResDialog&quot;);openPayment(&quot;'+b.id+'&quot;)">Cobrar</button>':'')
  +'</div></div><p class="hint">'+esc(trip(b))+' · File '+esc(bookingFile(b))+' · '+tipo+' · '+accountChip(b)+'</p>';
 // Datos del viaje
 const noches=salida&&regreso?Math.round((Date.parse(regreso)-Date.parse(salida))/864e5):null;
 h+='<h4>Datos del viaje</h4><div class="alma-ficha-grid">'
  +almaVRFila('File',esc(bookingFile(b)))
  +almaVRFila('Viaje',esc(trip(b)))
  +(g?almaVRFila('Destino',esc(g.destination||'—')):'')
  +almaVRFila('Salida',fmt(salida))
  +almaVRFila('Regreso',fmt(regreso))
  +(noches!=null&&noches>=0?almaVRFila('Noches',String(noches)):'')
  +(b.kind!=='grupal'?almaVRFila('Transporte',esc(b.transport||'—'))+almaVRFila('Hotel',esc(b.hotel||'—'))+almaVRFila('Habitación',esc(b.room||'—'))+almaVRFila('Régimen',esc(b.meals||'—'))
     +almaVRFila('Operador',esc(b.operator||'Sin confirmar'))+almaVRFila('Ref. operador',esc(b.operatorRef||'—'))+almaVRFila('Etapa',esc(b.stage||'En gestión')):'')
  +almaVRFila('Vendedor de origen',esc(sellerName(b)))
  +almaVRFila('Seguimiento',esc(b.owner||'Sin asignar'))
  +(b.soldAt?almaVRFila('Fecha de venta',fmt(String(b.soldAt).slice(0,10))):'')
  +'</div>';
 if(b.kind==='grupal'&&typeof almaHabInfo==='function'){const hab=almaHabInfo(b,b.passengerId);if(hab)h+='<div style="margin-top:8px">'+hab+'</div>'}
 if(b.notes)h+='<h4>Notas</h4><div class="alma-ficha-prog">'+esc(b.notes)+'</div>';
 // Pasajeros
 const ids=[b.passengerId,...(b.companions||[])].filter(Boolean);
 h+='<h4>Pasajeros ('+ids.length+')</h4>'+almaVRTabla(['Pasajero','Documento','Contacto'],ids.map((pid,i)=>{const p=state.passengers.find(x=>x.id===pid);
  if(!p)return '<tr><td>'+esc(i?paxName(pid):b.client)+'</td><td>—</td><td>—</td></tr>';
  return '<tr><td><button class="textlink" onclick="openPassengerProfile(&quot;'+p.id+'&quot;)">'+esc(p.name)+'</button>'+(i?'':'<span class="sub">Titular de la cuenta</span>')+(p.birthDate?'<span class="sub">Nac. '+fmt(p.birthDate)+'</span>':'')+'</td>'
   +'<td>'+(typeof docCell==='function'?docCell(p):esc(p.doc||'—'))+'</td><td>'+esc(p.phone||'—')+(p.email?'<span class="sub">'+esc(p.email)+'</span>':'')+'</td></tr>'}),'Sin pasajeros cargados.');
 // Importes
 const base=b.kind==='grupal'?Number(b.basePrice||0):Number(b.total||0),cargos=typeof almaCargosDe==='function'?almaCargosDe(b):{tax:0,adm:0};
 h+='<h4>Importes</h4><div class="alma-ficha-grid">'
  +almaVRFila(b.kind==='grupal'?'Precio de la salida':'Precio del viaje',money(base,c))
  +(cargos.tax?almaVRFila('Impuestos',money(cargos.tax,c)):'')+(cargos.adm?almaVRFila('Gastos administrativos',money(cargos.adm,c)):'')+(cargos.sgl?almaVRFila('Suplemento single',money(cargos.sgl,c)):'')
  +((b.extensions||[]).length?almaVRFila('Extensiones',money(b.extensions.reduce((s,x)=>s+Number(x.amount||0),0),c)):'')
  +(discountOf(b)?almaVRFila('Descuento','−'+money(discountOf(b),c)+(b.discountReason?'<span class="sub">'+esc(b.discountReason)+'</span>':'')):'')
  +almaVRFila('Total',money(total(b),c))
  +almaVRFila('Abonado',money(paid(b),c))
  +almaVRFila('Saldo',money(balance(b),c))
  +(b.depositDueDate?almaVRFila('Vence la seña',fmt(b.depositDueDate)+(b.depositAmount?'<span class="sub">'+money(b.depositAmount,c)+'</span>':'')):'')
  +(b.balanceDueDate?almaVRFila('Vence el saldo',fmt(b.balanceDueDate)):'')
  +'</div>';
 if((b.extensions||[]).length)h+=almaVRTabla(['Extensión','Fechas','Importe'],b.extensions.map(x=>'<tr><td>'+esc(x.title||'Extensión')+(x.notes?'<span class="sub">'+esc(x.notes)+'</span>':'')+'</td><td>'+fmt(x.departure)+' → '+fmt(x.returnDate)+'</td><td>'+money(x.amount,c)+'</td></tr>'),'');
 // Aéreos
 const vuelos=(state.flights||[]).filter(f=>f.bookingId===b.id);
 if(vuelos.length)h+='<h4>Aéreos</h4>'+almaVRTabla(['Vuelo','Operador','Localizador','Etapa'],vuelos.map(f=>'<tr><td>'+esc(f.destination||'—')+'<span class="sub">'+fmt(f.departure)+'</span></td><td>'+esc(f.operator||'—')+'</td><td>'+esc(f.reference||'—')+'</td><td>'+esc(f.stage||'—')+'</td></tr>'),'');
 // Cobros
 const cobros=state.payments.filter(p=>p.bookingId===b.id).sort((a,z)=>String(a.date||'').localeCompare(String(z.date||'')));
 h+='<h4>Cobros al pasajero ('+cobros.filter(p=>!p.voidedAt).length+')</h4>'+almaVRTabla(['Recibo','Fecha','Medio / oficina','Importe',''],cobros.map(p=>{const anul=!!p.voidedAt;
  return '<tr'+(anul?' style="opacity:.6"':'')+'><td><b>'+esc(p.number||'—')+'</b>'+(anul?' <span class="tag orange">ANULADO</span>'+(p.voidReason?'<span class="sub">'+esc(p.voidReason)+'</span>':''):'')+(p.concept?'<span class="sub">'+esc(p.concept)+'</span>':'')+'</td>'
   +'<td>'+fmt(p.date)+(p.recordedBy?'<span class="sub">'+esc(p.recordedBy)+'</span>':'')+'</td><td>'+esc(p.method||'—')+'<span class="sub">'+esc(cashboxName(p.cashbox))+'</span></td>'
   +'<td><b'+(anul?' style="text-decoration:line-through"':'')+'>'+money(p.amount,p.snapshot?.currency||c)+'</b></td>'
   +'<td><button type="button" class="btn ghost tiny" onclick="accountReceiptAction(&quot;'+p.id+'&quot;,&quot;ver&quot;)">Ver recibo</button></td></tr>'}),'Todavía no hay cobros registrados en esta reserva.');
 // Pagos a proveedores (solo socios: Finanzas es de socios)
 if(socio){
  if(b.kind==='grupal'){h+=almaVRProveedores('G:'+b.groupId,'Proveedores de este pasajero','Lo que se le debe a cada proveedor por esta reserva, con su liquidación.',e=>e.bookingId===b.id);
   if((state.expenses||[]).some(e=>e.operationKey==='G:'+b.groupId&&!e.bookingId))h+=almaVRProveedores('G:'+b.groupId,'Pagos a proveedores de toda la salida','Son compromisos de toda la salida «'+esc(g?.name||'')+'», compartidos por todos los pasajeros del grupo.',e=>!e.bookingId)}
  else h+=almaVRProveedores('B:'+b.id,'Pagos a proveedores','');
  h+='<div class="alma-liq-top" style="margin:8px 0 14px" id="almaVRLiq"><b>📄 Cargar liquidación del operador</b><span class="sub" style="display:block;margin:4px 0 8px">Subí la liquidación (PDF o foto) y se crea solo el compromiso de pago de este pasajero, con el importe, el file del proveedor y el vencimiento.</span><label class="btn tiny" style="cursor:pointer">📎 Elegir liquidación<input type="file" accept="image/*,application/pdf" hidden onchange="almaCompDesdeLiqInp(&quot;'+b.id+'&quot;,this)"></label></div>';
 const es=(state.expenses||[]).filter(e=>e.bookingId===b.id||(b.kind!=='grupal'&&e.operationKey==='B:'+b.id));
  if(es.length||paid(b)>0){const cs={};const add=(k,c,v)=>{cs[c]=cs[c]||{cobrado:0,pagado:0,falta:0,porCobrar:0};cs[c][k]+=v};
   add('cobrado',c,paid(b));add('porCobrar',c,Math.max(0,balance(b)));for(const e of es){const p=paidSupplier(e);add('pagado',e.currency||'USD',p);add('falta',e.currency||'USD',Math.max(0,Number(e.amount)-p))}
   h+='<h4>💧 Liquidez de esta reserva</h4>'+(es.length?'':'<p class="hint">Todavía no tiene compromiso propio con el operador'+(b.kind==='grupal'?' (los de toda la salida se ven en Finanzas → Liquidez por viaje)':'')+'.</p>')
    +'<div class="alma-ficha-grid">'+Object.entries(cs).map(([cu,x])=>{const enMano=x.cobrado-x.pagado,libre=enMano-x.falta;
     return almaVRFila('En mano ('+cu+')',money(enMano,cu)+'<span class="sub">cobrado '+money(x.cobrado,cu)+' − pagado al operador '+money(x.pagado,cu)+'</span>')
      +almaVRFila('Falta pagar al operador',money(x.falta,cu))
      +almaVRFila('Libre',(libre>=-.009?'<span style="color:#1f7a45">'+money(libre,cu)+'</span><span class="sub">ganancia ya cobrada</span>':'<span style="color:#b13c1c">−'+money(-libre,cu)+'</span><span class="sub">plata del operador en uso</span>'))
      +almaVRFila('Ganancia al final',money(x.cobrado+x.porCobrar-x.pagado-x.falta,cu))}).join('')+'</div>'}
 }else{const mia=[b.salesperson,b.owner].includes(currentDemoOperator());
  if(mia){h+=almaVRProveedores(b.kind==='grupal'?'G:'+b.groupId:'B:'+b.id,'Proveedores de este pasajero','Lo que se le debe al operador por esta reserva, con su liquidación. Los pagos al operador los registran los socios.',e=>e.bookingId===b.id);h+='<div class="alma-liq-top" style="margin:8px 0 14px" id="almaVRLiq"><b>📄 Cargar liquidación del operador</b><span class="sub" style="display:block;margin:4px 0 8px">Subí la liquidación (PDF o foto) y se crea solo el compromiso de pago de este pasajero, con el importe, el file del proveedor y el vencimiento.</span><label class="btn tiny" style="cursor:pointer">📎 Elegir liquidación<input type="file" accept="image/*,application/pdf" hidden onchange="almaCompDesdeLiqInp(&quot;'+b.id+'&quot;,this)"></label></div>'}
  else h+='<h4>Proveedores</h4><p class="hint">Solo el vendedor de esta reserva y los socios ven y cargan la liquidación del operador.</p>'}
 $('almaVerResTitle').textContent='Reserva · '+b.client;
 $('almaVerResBody').innerHTML=h;
 openDlg('almaVerResDialog')};
