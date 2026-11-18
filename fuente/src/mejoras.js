/* Alma Viajera · mejoras (se inserta dentro del script principal, build.py):
   1) Responsable / Registrado por = usuario logueado
   2) Buscador de pasajeros en «Inscribir» y «Viaje individual»
   3) Ficha del pasajero: documento DNI o Pasaporte, con su vencimiento
   4) Cobros: moneda del pago (USD, ARS, EUR) con cotización y comprobante de transferencia */

/* ---------- 1) Responsable = usuario logueado ---------- */
function almaYo(){return window.demoOperator||''}
function almaFijar(id,solo){const s=typeof id==='string'?$(id):id,y=almaYo();if(!s||!y)return;
 if(solo){s.innerHTML='<option>'+esc(y)+'</option>';s.value=y;return}
 if(![...s.options].some(o=>o.value===y))s.add(new Option(y,y));s.value=y}
{const o=window.openOrder;window.openOrder=(...a)=>{o(...a);almaFijar('orderOwner',true)}}
{const o=window.openGroup;window.openGroup=(...a)=>{o(...a);almaFijar('groupOwner')}}
{const o=window.openGroupBooking;window.openGroupBooking=(...a)=>{o(...a);almaFijar('bookingOwner');almaBuscadorReset('bookingExistingPassenger')}}
{const o=window.openIndividual;window.openIndividual=(orderId,...a)=>{o(orderId,...a);if(!orderId)almaFijar($('individualForm').elements.owner);almaBuscadorReset('individualExistingPassenger')}}
{const o=window.openPayment;window.openPayment=(...a)=>{o(...a);almaFijar('payRecordedBy',true);$('almaPayCur').dataset.tocado='';const fi=$('almaPayFile');if(fi)fi.value='';almaPayFxSync()}}
{const o=window.openCashMovement;window.openCashMovement=(...a)=>{o(...a);almaFijar('cashRecordedBy',true)}}

/* ---------- 2) Buscador de pasajeros ---------- */
const almaBusq={};
function almaNorm(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function almaBuscadorInit(selId){
 const sel=$(selId);if(!sel||$(selId+'Buscar'))return;
 const box=document.createElement('div');box.className='alma-buscar';
 box.innerHTML='<input type="search" id="'+selId+'Buscar" placeholder="🔍 Buscar pasajero por nombre, DNI o pasaporte" autocomplete="off"><span class="sub" id="'+selId+'BuscarInfo"></span>';
 sel.parentNode.insertBefore(box,sel);
 $(selId+'Buscar').addEventListener('input',()=>almaBuscar(selId));
}
function almaBuscadorReset(selId){almaBuscadorInit(selId);const sel=$(selId);if(!sel)return;
 almaBusq[selId]=[...sel.options].map(o=>({v:o.value,t:o.textContent}));const i=$(selId+'Buscar');if(i)i.value='';$(selId+'BuscarInfo').textContent=''}
function almaBuscar(selId){
 const sel=$(selId),all=almaBusq[selId]||[],q=almaNorm($(selId+'Buscar').value).trim(),info=$(selId+'BuscarInfo');
 const first=all.filter(o=>!o.v),rest=all.filter(o=>o.v);
 let list=rest;
 if(q){const words=q.split(/\s+/);list=rest.filter(o=>{const p=state.passengers.find(x=>x.id===o.v)||{};
   const hay=almaNorm(o.t+' '+(p.doc||'')+' '+(p.passportNumber||'')+' '+(p.phone||''));return words.every(w=>hay.includes(w))})}
 sel.innerHTML=first.concat(list).map(o=>'<option value="'+esc(o.v)+'">'+esc(o.t)+'</option>').join('');
 if(q&&list.length){sel.value=list[0].v;sel.dispatchEvent(new Event('change',{bubbles:true}))}
 else if(!q){sel.value='';sel.dispatchEvent(new Event('change',{bubbles:true}))}
 info.textContent=q?(list.length?list.length+(list.length===1?' coincidencia':' coincidencias')+(list.length>1?' · elegí abajo si no es el primero':''):'Sin coincidencias: se carga como pasajero nuevo'):'';
}

/* ---------- 3) Documento: DNI o Pasaporte ---------- */
window.almaDocTypeSync=()=>{const f=$('passengerForm');if(!f)return;const dni=f.elements.docType.value==='DNI';
 f.querySelectorAll('.alma-pp').forEach(l=>l.style.display=dni?'none':'');
 const w=$('almaDniExpiryWrap');if(w)w.style.display=dni?'':'none'};
{const o=window.openPassengerForm;window.openPassengerForm=(id='',...a)=>{o(id,...a);const f=$('passengerForm'),p=state.passengers.find(x=>x.id===id);
 if(!f.elements.docType.value)f.elements.docType.value=p&&!p.passportNumber&&p.doc?'DNI':'Pasaporte';almaDocTypeSync()}}

/* ---------- 4) Cobros: moneda del pago y comprobante ---------- */
function almaPayAcct(){const f=$('paymentForm');if(!f)return 'USD';if($('payMode').value==='nuevo')return f.elements.newCurrency.value||'USD';const b=findBooking($('payBooking').value);return b?cur(b):'USD'}
function almaPar(acc,pay){if(acc==='ARS')return [pay,'ARS'];if(pay==='ARS')return [acc,'ARS'];return pay==='EUR'?['EUR',acc]:[acc,'EUR']}
function almaFxApplied(amount,acc){const pay=$('almaPayCur')?.value||acc;if(pay===acc||!(amount>0))return amount;const r=Number($('almaPayRate').value);if(!(r>0))return NaN;const [A]=almaPar(acc,pay);return Math.round((pay===A?amount*r:amount/r)*100)/100}
function almaFxNote(raw,acc){const pay=$('almaPayCur')?.value||acc;if(pay===acc||!(raw>0))return '';const ap=almaFxApplied(raw,acc);
 return Number.isFinite(ap)?'<div class="alma-fx">Pagó '+money(raw,pay)+' → se acreditan <b>'+money(ap,acc)+'</b> en la cuenta</div>':'<div class="alma-fx alma-fx-warn">Ingresá la cotización para convertir '+pay+' a '+acc+'.</div>'}
window.almaPayFxSync=()=>{const f=$('paymentForm');if(!f||!$('almaPayCur'))return;const acc=almaPayAcct(),sel=$('almaPayCur');
 if(!sel.dataset.tocado)sel.value=acc;const pay=sel.value,distinta=pay!==acc;
 $('almaPayRateWrap').style.display=distinta?'':'none';$('almaPayRate').required=distinta;
 if(distinta){const [A,B]=almaPar(acc,pay);$('almaPayRateLbl').textContent='Cotización: 1 '+A+' = ? '+B}
 $('almaPayFileWrap').style.display=f.elements.method.value==='Efectivo'?'none':'';
 $('almaPayAmountLbl')&&($('almaPayAmountLbl').textContent='Importe recibido ('+pay+')');
 updatePaymentPreview()};
function almaFx(x,acc){const pay=x.payCurrency||acc;
 if(pay==='EUR'&&x.method==='Efectivo'){alert('La caja maneja pesos y dólares. Un pago en euros en efectivo no se puede sumar a la caja: elegí otro medio de pago o registralo en dólares o pesos.');return null}
 const amount=Number(x.amount);if(pay===acc)return {applied:amount,fields:{}};
 const r=Number(x.payRate);if(!(r>0)){alert('Ingresá la cotización para convertir '+pay+' a '+acc+'.');return null}
 const [A,B]=almaPar(acc,pay);
 return {applied:Math.round((pay===A?amount*r:amount/r)*100)/100,fields:{payCurrency:pay,payAmount:amount,payRate:r,payRateLabel:'1 '+A+' = '+r+' '+B}}}
function almaFxRecibo(p,acc){return p.payCurrency&&p.payCurrency!==acc?'<br><small>Pagado: '+money(p.payAmount,p.payCurrency)+' · Cotización '+esc(p.payRateLabel||'')+'</small>':''}
if($('paymentForm')){
 $('payBooking')?.addEventListener('change',()=>almaPayFxSync());
 $('paymentForm').elements.newCurrency?.addEventListener('change',()=>almaPayFxSync());
 $('almaPayCur').addEventListener('change',()=>{$('almaPayCur').dataset.tocado='1';almaPayFxSync()});
 let antes=null;
 $('paymentForm').addEventListener('submit',()=>{antes=window.currentReceiptId},true);
 $('paymentForm').addEventListener('submit',()=>{const rid=window.currentReceiptId,fi=$('almaPayFile'),file=fi?.files?.[0];
  if(!rid||rid===antes||!file)return;fi.value='';
  window.almaComprobantes?.subir(rid,file).then(()=>{notify('Comprobante adjuntado al recibo');if(window.currentReceiptId===rid)almaRenderComprob(rid)})
   .catch(e=>alert('El cobro quedó registrado, pero no se pudo subir el comprobante: '+e.message+'\nPodés adjuntarlo desde el recibo con «📎 Adjuntar comprobante».'))});
}
/* Comprobantes en el recibo (fuera del papel que se imprime) */
window.almaRenderComprob=async rid=>{const el=$('almaComprob');if(!el)return;const p=state.payments.find(x=>x.id===rid);if(!p){el.innerHTML='';return}
 el.innerHTML='<b>Comprobante de pago</b> <span class="sub">Buscando…</span>';
 let files=[];try{files=await window.almaComprobantes.listar(rid)}catch(e){el.innerHTML='<b>Comprobante de pago</b> <span class="sub">No se pudo consultar: '+esc(e.message)+'</span>';return}
 if(window.currentReceiptId!==rid)return;
 el.innerHTML='<b>Comprobante de pago</b> '+(files.length?files.map(f=>'<button type="button" class="btn ghost tiny" onclick="almaComprobantes.abrir(&quot;'+rid+'&quot;,&quot;'+esc(f.name)+'&quot;)">📄 Ver '+(/\.pdf$/i.test(f.name)?'PDF':'imagen')+'</button>').join(' '):'<span class="sub">Sin comprobante adjunto.</span>')
  +' <label class="btn ghost tiny">📎 Adjuntar comprobante<input type="file" accept="image/*,application/pdf" hidden onchange="almaAdjuntarComprob(&quot;'+rid+'&quot;,this)"></label>'};
window.almaAdjuntarComprob=(rid,inp)=>{const file=inp.files?.[0];inp.value='';if(!file)return;
 $('almaComprob').innerHTML='<b>Comprobante de pago</b> <span class="sub">Subiendo…</span>';
 window.almaComprobantes.subir(rid,file).then(()=>{notify('Comprobante adjuntado');almaRenderComprob(rid)}).catch(e=>{alert('No se pudo subir el comprobante: '+e.message);almaRenderComprob(rid)})};
{const o=window.showReceipt;window.showReceipt=(id,...a)=>{o(id,...a);almaRenderComprob(id)}}

/* ---------- 5) Pasajero nuevo: obligatorio darlo de alta en la Base de pasajeros ---------- */
const ALMA_ALTA={bookingExistingPassenger:{form:'groupBookingForm',name:'groupPassengerName',phone:null},
                 individualExistingPassenger:{form:'individualForm',name:'individualClient',phone:'individualPhone'}};
function almaAltaInit(selId){const sel=$(selId),c=ALMA_ALTA[selId];if(!sel||$(selId+'Alta'))return;
 const b=document.createElement('div');b.className='alma-alta';
 b.innerHTML='<button type="button" class="btn ghost tiny" id="'+selId+'Alta">➕ Dar de alta pasajero nuevo</button><span class="sub">Si no está en la lista, primero se carga su ficha en la Base de pasajeros.</span>';
 sel.parentNode.insertBefore(b,sel.nextSibling);
 $(selId+'Alta').addEventListener('click',()=>almaAltaAbrir(selId));
 const n=$(c.name);if(n){n.readOnly=true;n.placeholder='Se completa al elegir el pasajero de la base'}
 const f0=sel.options[0];if(f0&&!f0.value)f0.textContent='— Elegí un pasajero de la base —'}
function almaAltaAbrir(selId){const c=ALMA_ALTA[selId];window.__almaAltaFor=selId;openPassengerForm('');
 const pf=$('passengerForm'),q=$(selId+'Buscar')?.value||'';
 pf.elements.name.value=($(c.name)?.value||'').trim()||(/\d/.test(q)?'':q.trim());
 if(c.phone&&$(c.phone)?.value)pf.elements.phone.value=$(c.phone).value;
 setTimeout(()=>pf.elements.name.focus(),50)}
function almaAltaElegir(selId,pid){const sel=$(selId);if(!sel)return;
 const p=state.passengers.find(x=>x.id===pid);if(!p)return;
 if(![...sel.options].some(o=>o.value===pid))sel.add(new Option(p.name+(p.doc?' · DNI '+p.doc:''),pid));
 almaBuscadorReset(selId);sel.value=pid;sel.dispatchEvent(new Event('change',{bubbles:true}));
 const f0=sel.options[0];if(f0&&!f0.value)f0.textContent='— Elegí un pasajero de la base —';notify('Pasajero dado de alta y seleccionado')}
$('passengerForm').addEventListener('submit',e=>{const selId=window.__almaAltaFor;if(!selId)return;
 if($('passengerFormDialog').open)return; // no se guardó (faltan datos o nombre repetido)
 window.__almaAltaFor=null;const name=String(new FormData(e.target).get('name')||'').trim().toLocaleLowerCase('es-AR');
 const p=state.passengers.find(x=>String(x.name||'').trim().toLocaleLowerCase('es-AR')===name);if(p)almaAltaElegir(selId,p.id)});
for(const [selId,c] of Object.entries(ALMA_ALTA)){
 $(c.form)?.addEventListener('submit',e=>{const f=e.target;if(f.elements.existingPassengerId?.value)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(confirm('El pasajero tiene que estar en la Base de pasajeros.\n\nElegilo de la lista (podés buscarlo arriba) o tocá Aceptar para darlo de alta ahora.'))almaAltaAbrir(selId)},true)}
{const o=window.openGroupBooking;window.openGroupBooking=(...a)=>{o(...a);almaAltaInit('bookingExistingPassenger');const f0=$('bookingExistingPassenger').options[0];if(f0&&!f0.value)f0.textContent='— Elegí un pasajero de la base —';almaBuscadorReset('bookingExistingPassenger')}}
{const o=window.openIndividual;window.openIndividual=(...a)=>{o(...a);almaAltaInit('individualExistingPassenger');const f0=$('individualExistingPassenger').options[0];if(f0&&!f0.value)f0.textContent='— Elegí un pasajero de la base —';almaBuscadorReset('individualExistingPassenger')}}
/* Si el buscador no encuentra a nadie, se ofrece el alta */
{const ob=almaBuscar;almaBuscar=selId=>{ob(selId);const info=$(selId+'BuscarInfo');if(ALMA_ALTA[selId]&&info&&/Sin coincidencias/.test(info.textContent))info.textContent='Sin coincidencias: tocá «➕ Dar de alta pasajero nuevo»'}}

/* ---------- 6) Teléfono de contacto al inscribir: viene de la ficha; si la ficha no tiene, se guarda ahí ---------- */
{const o=window.applyExistingPassenger;window.applyExistingPassenger=(...a)=>{o(...a);const p=state.passengers.find(x=>x.id===$('bookingExistingPassenger').value),t=$('almaGroupPhone');
 if(t){t.value=p?.phone||'';t.placeholder=p&&!p.phone?'No tiene en la ficha: cargalo y se guarda':'Ej.: 11 4992-4267'}}}
for(const [form,sel,tel] of [['groupBookingForm','bookingExistingPassenger','almaGroupPhone'],['individualForm','individualExistingPassenger','individualPhone']]){
 $(form)?.addEventListener('submit',()=>{const p=state.passengers.find(x=>x.id===$(sel)?.value),v=String($(tel)?.value||'').trim();
  if(p&&v&&!p.phone){p.phone=v;audit('Teléfono agregado a la ficha','Pasajero',p.name+' · '+v)}},true)}

/* ---------- 7) Tipo de habitación al inscribir y con quién la comparte ---------- */
const ALMA_CAP={'Single':1,'Doble matrimonial':2,'Doble twin':2,'Triple':3};
function almaPaxOpts(excl){return '<option value="">— Elegí un pasajero de la base —</option>'+state.passengers.filter(p=>p.name&&p.id!==excl).slice().sort((a,b)=>a.name.localeCompare(b.name,'es')).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(p.doc?' · DNI '+esc(p.doc):'')+'</option>').join('')}
window.almaRoomSync=()=>{const t=$('almaRoomType')?.value||'',n=(ALMA_CAP[t]||1)-1;
 $('almaRoomMates').style.display=n>0?'':'none';$('almaMate1Wrap').style.display=n>=1?'':'none';$('almaMate2Wrap').style.display=n>=2?'':'none'};
function almaRoomReset(){const tit=$('bookingExistingPassenger')?.value||'';
 for(const id of ['almaMate1','almaMate2']){const s=$(id);if(!s)continue;s.innerHTML=almaPaxOpts(tit);almaBuscadorReset(id)}
 if($('almaRoomType'))$('almaRoomType').value='';almaRoomSync()}
{const o=window.openGroupBooking;window.openGroupBooking=(...a)=>{o(...a);almaRoomReset()}}
$('bookingExistingPassenger')?.addEventListener('change',()=>{const tit=$('bookingExistingPassenger').value;for(const id of ['almaMate1','almaMate2']){const s=$(id);if(!s)continue;const v=s.value;s.innerHTML=almaPaxOpts(tit);s.value=v===tit?'':v;almaBuscadorReset(id)}});
function almaRoomLabel(g,type){const pre=type.startsWith('Doble')?'Doble':type;const n=(g.rooms||[]).filter(r=>String(r.label||'').startsWith(pre+' ')).length+1;return pre+' '+String(n).padStart(2,'0')}
{let antes=null;
 $('groupBookingForm').addEventListener('submit',()=>{antes=new Set(state.bookings.map(b=>b.id))},true);
 $('groupBookingForm').addEventListener('submit',()=>{
  if(!antes)return;const nueva=state.bookings.find(b=>!antes.has(b.id)&&b.kind==='grupal');antes=null;if(!nueva)return;
  const type=nueva.roomType||'';if(!type)return;const g=findGroup(nueva.groupId);if(!g)return;g.rooms||=[];
  const cap=ALMA_CAP[type]||1,activa=b=>accountStatus(b)!=='Baja';
  const mates=cap>1?[...new Set([$('almaMate1')?.value,$('almaMate2')?.value].slice(0,cap-1).filter(v=>v&&v!==nueva.passengerId))]:[];
  const mb=[],faltan=[];
  for(const pid of mates){const b=state.bookings.find(x=>x.kind==='grupal'&&x.groupId===g.id&&x.passengerId===pid&&activa(x));if(b)mb.push(b);else faltan.push(state.passengers.find(p=>p.id===pid))}
  if(faltan.length){const libres=g.capacity>0?g.capacity-state.bookings.filter(b=>b.kind==='grupal'&&b.groupId===g.id&&activa(b)).length:99;
   if(libres<faltan.length)alert(faltan.map(p=>p.name).join(' y ')+' no se pudo/pudieron inscribir: no quedan cupos en la salida.');
   else if(confirm(faltan.map(p=>p.name).join(' y ')+(faltan.length>1?' no están inscriptos':' no está inscripto/a')+' en '+g.name+'.\n\n¿Inscribir también, con el mismo precio ('+money(nueva.basePrice,g.currency)+') y en la misma habitación?\nCada pasajero tiene su propia cuenta.'))
    for(const p of faltan){const b={id:uid(),kind:'grupal',groupId:g.id,client:p.name,phone:p.phone||'',passengerId:p.id,basePrice:Number(nueva.basePrice),owner:nueva.owner,notes:'',roomType:type,status:'Abierta',extensions:[]};captureSeller(b);state.bookings.unshift(b);mb.push(b);audit('Pasajero inscripto','Reserva grupal',b.client+' · '+g.name+' (comparte habitación con '+nueva.client+')')}}
  // si un compañero ya está en una habitación con lugar, se suma ahí; si no, habitación nueva
  const todos=[nueva,...mb];let room=null;
  for(const b of mb){const r=g.rooms.find(r=>r.id===b.roomId);if(r){const occ=state.bookings.filter(x=>x.groupId===g.id&&x.roomId===r.id&&activa(x)&&!todos.includes(x)).length;if(occ+todos.length<=Number(r.capacity)){room=r;break}}}
  if(!room){room={id:uid(),label:almaRoomLabel(g,type),type,capacity:cap,notes:''};g.rooms.push(room);audit('Habitación creada','Rooming',g.name+' · '+room.label)}
  for(const b of todos){b.roomId=room.id;b.roomType=room.type}
  audit('Habitación asignada','Rooming',g.name+' · '+room.label+' · '+todos.map(b=>b.client).join(', '));
  save();if(window.currentGroupDetail===g.id)renderGroupDetail();notify('Habitación '+room.label+': '+todos.map(b=>b.client).join(', '))})}
/* Ficha del pasajero: con quién comparte habitación / viaja */
function almaHabInfo(b,pid){
 if(b.kind==='grupal'){const g=findGroup(b.groupId),r=(g?.rooms||[]).find(x=>x.id===b.roomId);if(!r)return '';
  const m=state.bookings.filter(x=>x.id!==b.id&&x.kind==='grupal'&&x.groupId===b.groupId&&x.roomId===r.id&&accountStatus(x)!=='Baja');
  return '<span class="sub alma-hab">🛏 '+esc(r.type)+' · '+esc(r.label)+(m.length?' · comparte con '+m.map(x=>'<button type="button" class="textlink" onclick="openPassengerProfile(&quot;'+x.passengerId+'&quot;)">'+esc(x.client)+'</button>').join(', '):'')+'</span>'}
 const ids=[b.passengerId,...(b.companions||[])].filter(x=>x&&x!==pid),ps=ids.map(x=>state.passengers.find(p=>p.id===x)).filter(Boolean);
 return ps.length?'<span class="sub alma-hab">👥 Viaja con '+ps.map(p=>'<button type="button" class="textlink" onclick="openPassengerProfile(&quot;'+p.id+'&quot;)">'+esc(p.name)+'</button>').join(', ')+'</span>':''}
for(const id of ['almaMate1','almaMate2'])almaBuscadorInit(id);
