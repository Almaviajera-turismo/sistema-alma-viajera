/* Alma Viajera · Ficha de la salida grupal (pestaña «Ficha de la salida») y «✎ Editar salida».
   Se inserta dentro del script principal (build.py). */
function almaNoches(a,b){if(!a||!b)return null;const d=Math.round((Date.parse(b)-Date.parse(a))/864e5);return d>=0?d:null}
function almaFila(k,v){return '<div class="alma-ff"><span>'+k+'</span><b>'+v+'</b></div>'}
window.almaRenderGroupFicha=()=>{
 const el=$('almaGroupFicha'),id=window.currentGroupDetail;if(!el||!id)return;
 const g=findGroup(id);if(!g){el.innerHTML='';return}
 const socio=window.demoRole==='socio',c=g.currency||'USD';
 const ins=state.bookings.filter(b=>b.kind==='grupal'&&b.groupId===id&&accountStatus(b)!=='Baja');
 const vendido=ins.reduce((s,b)=>s+total(b),0),cobrado=ins.reduce((s,b)=>s+paid(b),0);
 const n=almaNoches(g.departure,g.returnDate),cap=Number(g.capacity||0);
 let h='<div class="alma-ficha-head"><h3>'+esc(g.name)+'</h3>'+(socio?'<button type="button" class="btn ghost tiny" onclick="almaEditarSalida(&quot;'+id+'&quot;)">✎ Editar salida</button>':'')+'</div>';
 h+='<div class="alma-ficha-grid">'
  +almaFila('File',esc(g.fileNumber||'—'))
  +almaFila('Destino / circuito',esc(g.destination||'—'))
  +almaFila('Salida',fmt(g.departure)||'—')
  +almaFila('Regreso',fmt(g.returnDate)||'—')
  +almaFila('Duración',n==null?'—':(n+1)+' días · '+n+' noches')
  +almaFila('Precio por pasajero',money(g.price,c))
  +almaFila('Cupos',cap?ins.length+' de '+cap+' · '+Math.max(cap-ins.length,0)+' libres':ins.length+' inscriptos · sin límite')
  +almaFila('Vencimiento del saldo (pasajeros)',g.balanceDueDate?fmt(g.balanceDueDate)+(g.balanceDueDate<today()?' · vencido':''):'Sin fecha')
  +almaFila('Responsable',esc(g.owner||'—'))
  +'</div>';
 h+='<h4>Programa y servicios incluidos</h4><div class="alma-ficha-prog">'+(g.description?esc(g.description):'<span class="sub">Sin programa cargado.</span>')+'</div>';
 h+='<h4>Pasajeros</h4><div class="alma-ficha-grid">'+almaFila('Inscriptos',String(ins.length))+almaFila('Total vendido',money(vendido,c))+almaFila('Cobrado',money(cobrado,c))+almaFila('Saldo a cobrar',money(vendido-cobrado,c))+'</div>';
 if(socio){
  const es=state.expenses.filter(e=>e.operationKey==='G:'+id);
  h+='<div class="alma-ficha-head"><h4>Pagos al operador y vencimientos</h4><button type="button" class="btn tiny" onclick="openGroupExpense(&quot;'+id+'&quot;)">+ Agregar compromiso y vencimientos</button></div>';
  h+=es.length?'<div class="tablewrap"><table class="table"><thead><tr><th>Próximo vencimiento</th><th>Proveedor / concepto</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th>Acción</th></tr></thead><tbody>'
   +es.map(e=>{const pend=Number(e.amount)-paidSupplier(e);return '<tr><td>'+expenseDueCell(e)+(e.depositDueDate?'<span class="sub">Seña: '+fmt(e.depositDueDate)+'</span>':'')+(e.dueDate?'<span class="sub">Saldo: '+fmt(e.dueDate)+'</span>':'')+'</td><td><b>'+esc(e.provider||'—')+'</b><span class="sub">'+esc(e.concept||'')+esc(expenseRefLine(e))+'</span></td><td>'+money(e.amount,e.currency)+'</td><td>'+money(paidSupplier(e),e.currency)+'</td><td><b>'+money(pend,e.currency)+'</b></td><td>'+(pend>.001?'<button class="btn tiny" onclick="openSupplierPayment(&quot;'+e.id+'&quot;)">Pagar</button>':'Saldado')+'</td></tr>'}).join('')
   +'</tbody></table></div>':'<p class="sub">Todavía no cargaste lo que se le debe al operador para esta salida. Tocá «+ Agregar compromiso y vencimientos» y cargá el importe, la fecha de la seña y la del saldo.</p>';
 }
 el.innerHTML=h};
{const sgt=window.showGroupTab;window.showGroupTab=(tab,skip=false)=>{
 const f=tab==='ficha',fp=$('groupFichaPanel'),tb=$('tabGroupFicha');
 if(fp)fp.style.display=f?'block':'none';if(tb)tb.className='btn tiny'+(f?'':' ghost');
 if(!f)return sgt(tab,skip);
 if(!skip&&!navRestoring&&window.groupTab!==tab)pushNav('tab');window.groupTab='ficha';
 $('groupRoomingPanel').style.display='none';$('groupPassengersPanel').style.display='none';
 $('tabGroupRooming').className='btn tiny ghost';$('tabGroupPassengers').className='btn tiny ghost';
 almaRenderGroupFicha()}}

/* Editar salida: reutiliza el formulario de «Nueva salida» */
window.__almaEditGroup=null;
function almaGroupTitle(t){const h=document.querySelector('#groupDialog .modalhead h2');if(h)h.textContent=t}
{const og=window.openGroup;window.openGroup=()=>{window.__almaEditGroup=null;almaGroupTitle('Nueva salida grupal');og()}}
window.almaEditarSalida=id=>{
 if(!adminOnly())return;const g=findGroup(id);if(!g)return;
 const f=$('groupForm');f.reset();window.__almaEditGroup=id;almaGroupTitle('Editar salida grupal');
 for(const k of ['name','destination','departure','returnDate','price','currency','capacity','balanceDueDate','description']){const i=f.elements[k];if(i)i.value=g[k]==null?'':(k==='capacity'&&!Number(g[k])?'':g[k])}
 const ow=f.elements.owner;if(ow){if(g.owner&&![...ow.options].some(o=>o.value===g.owner))ow.add(new Option(g.owner,g.owner));ow.value=g.owner||ow.value}
 $('groupFilePreview').value=g.fileNumber||'';openDlg('groupDialog')};
$('groupForm').elements.departure.addEventListener('change',()=>{const g=window.__almaEditGroup&&findGroup(window.__almaEditGroup);if(g)$('groupFilePreview').value=g.fileNumber||''});
$('groupForm').addEventListener('submit',e=>{
 const id=window.__almaEditGroup;if(!id)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(!adminOnly())return;const g=findGroup(id);if(!g)return alert('No se encontró la salida.');
 const x=formData(e.target);
 if(x.returnDate<x.departure)return alert('La fecha de regreso no puede ser anterior a la salida');
 const ins=state.bookings.filter(b=>b.kind==='grupal'&&b.groupId===id&&accountStatus(b)!=='Baja').length,cap=Number(x.capacity||0);
 if(cap&&cap<ins)return alert('Hay '+ins+' pasajeros inscriptos: los cupos no pueden ser menos que eso.');
 const price=Number(x.price);
 if(ins&&Math.abs(price-Number(g.price))>.009&&!confirm('Cambiaste el precio de '+money(g.price,g.currency)+' a '+money(price,x.currency)+'.\n\nEl precio nuevo se usa para los próximos inscriptos. Los '+ins+' ya inscriptos conservan su precio (si hay que cambiarlo, se edita en cada reserva).\n\n¿Guardar?'))return;
 Object.assign(g,{name:x.name.trim(),destination:x.destination,departure:x.departure,returnDate:x.returnDate,price,currency:x.currency,capacity:cap,balanceDueDate:x.balanceDueDate||'',owner:x.owner||g.owner,description:x.description});
 window.__almaEditGroup=null;save();closeDialog('groupDialog');
 $('groupDetailTitle')&&window.currentGroupDetail===id&&($('groupDetailTitle').textContent=g.name);
 render();renderGroupDetail();notify('Salida actualizada')},true);
