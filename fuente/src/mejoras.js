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

/* ---------- 7) Tipo de habitación y con quién la comparte (al inscribir y al editar la reserva) ---------- */
const ALMA_CAP={'Single':1,'Doble matrimonial':2,'Doble twin':2,'Triple':3,'Cuádruple':4};
const ALMA_TIPO_VIEJO={'Doble':'Doble matrimonial','Twin':'Doble twin'};
function almaPaxOpts(excl){return '<option value="">— Elegí un pasajero de la base —</option>'+state.passengers.filter(p=>p.name&&p.id!==excl).slice().sort((a,b)=>a.name.localeCompare(b.name,'es')).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(p.doc?' · DNI '+esc(p.doc):'')+'</option>').join('')}
function almaHabSync(pre){const t=$(pre+'RoomType')?.value||'',n=(ALMA_CAP[t]||1)-1;$(pre+'RoomMates').style.display=n>0?'':'none';for(const k of [1,2,3])$(pre+'Mate'+k+'Wrap').style.display=n>=k?'':'none'}
window.almaRoomSync=()=>almaHabSync('alma');window.almaERoomSync=()=>almaHabSync('almaE');
function almaHabMates(pre,tit,vals=[]){for(const k of [1,2,3]){const s=$(pre+'Mate'+k);if(!s)continue;s.innerHTML=almaPaxOpts(tit);almaBuscadorReset(pre+'Mate'+k);s.value=vals[k-1]||''}}
function almaHabLeer(pre,tit){const t=$(pre+'RoomType')?.value||'',cap=ALMA_CAP[t]||1;return {type:t,mates:[...new Set([1,2,3].slice(0,cap-1).map(k=>$(pre+'Mate'+k)?.value).filter(v=>v&&v!==tit))]}}
function almaRoomLabel(g,type){const pre=type.startsWith('Doble')?'Doble':type;let n=1;while((g.rooms||[]).some(r=>r.label===pre+' '+String(n).padStart(2,'0')))n++;return pre+' '+String(n).padStart(2,'0')}
/* Ubica a la reserva b (y a sus compañeros) en una habitación del tipo pedido. Devuelve true si cambió algo. */
function almaAsignarHab(b,type,mates){
 const g=findGroup(b.groupId);if(!g)return false;g.rooms||=[];const activa=x=>accountStatus(x)!=='Baja';
 const old=g.rooms.find(r=>r.id===b.roomId),ocup=r=>state.bookings.filter(x=>x.kind==='grupal'&&x.groupId===g.id&&x.roomId===r.id&&activa(x)),pl=a=>a.reduce((n,x)=>n+almaPlaza(x),0);
 const limpiar=()=>{g.rooms=g.rooms.filter(r=>ocup(r).length>0)};
 if(!type){if(!old)return false;b.roomId='';b.roomType='';limpiar();audit('Habitación quitada','Rooming',b.client+' · '+g.name);return true}
 const cap=ALMA_CAP[type]||1;mates=cap>1?mates.slice(0,Math.max(0,cap-almaPlaza(b))):[];
 const mb=[],faltan=[];
 for(const pid of mates){const x=state.bookings.find(y=>y.kind==='grupal'&&y.groupId===g.id&&y.passengerId===pid&&activa(y));if(x)mb.push(x);else{const p=state.passengers.find(z=>z.id===pid);if(p)faltan.push(p)}}
 if(faltan.length){const libres=g.capacity>0?g.capacity-almaPlazas(g.id):99;
  if(libres<faltan.length)alert(faltan.map(p=>p.name).join(' y ')+': no quedan cupos en la salida, no se pudo/pudieron inscribir.');
  else if(confirm(faltan.map(p=>p.name).join(' y ')+(faltan.length>1?' no están inscriptos':' no está inscripto/a')+' en '+g.name+'.\n\n¿Inscribir también, con el mismo precio ('+money(b.basePrice,g.currency)+') y en la misma habitación?\nCada pasajero tiene su propia cuenta.'))
   for(const p of faltan){const x={id:uid(),kind:'grupal',groupId:g.id,client:p.name,phone:p.phone||'',passengerId:p.id,basePrice:Number(b.basePrice),owner:almaYo()||b.owner,notes:'',status:'Abierta',extensions:[]};captureSeller(x);state.bookings.unshift(x);mb.push(x);audit('Pasajero inscripto','Reserva grupal',x.client+' · '+g.name+' (comparte habitación con '+b.client+')')}}
 const todos=[b,...mb];
 if(old&&old.type===type&&todos.every(x=>x.roomId===old.id)&&ocup(old).every(x=>todos.includes(x)))return false; // sin cambios
 let room=null;
 if(old&&ocup(old).every(x=>todos.includes(x))){room=old}            // la misma habitación, se reacomoda
 else for(const x of mb){const r=g.rooms.find(r=>r.id===x.roomId);if(r&&r.type===type&&pl(ocup(r).filter(y=>!todos.includes(y)))+pl(todos)<=cap){room=r;break}}
 if(!room){room={id:uid(),label:almaRoomLabel(g,type),type,capacity:cap,notes:''};g.rooms.push(room);audit('Habitación creada','Rooming',g.name+' · '+room.label)}
 if(room.type!==type){room.type=type;room.capacity=cap;room.label=almaRoomLabel(g,type)}
 for(const x of todos){x.roomId=room.id;x.roomType=type}
 limpiar();audit('Habitación asignada','Rooming',g.name+' · '+room.label+' · '+todos.map(x=>x.client).join(', '));
 notify('Habitación '+room.label+': '+todos.map(x=>x.client).join(', '));return true}
/* Inscribir */
{const o=window.openGroupBooking;window.openGroupBooking=(...a)=>{o(...a);if($('almaRoomType'))$('almaRoomType').value='';almaHabMates('alma',$('bookingExistingPassenger')?.value||'');almaRoomSync()}}
$('bookingExistingPassenger')?.addEventListener('change',()=>{const tit=$('bookingExistingPassenger').value,v=[1,2,3].map(k=>$('almaMate'+k)?.value);almaHabMates('alma',tit,v.map(x=>x===tit?'':x))});
{let antes=null;
 $('groupBookingForm').addEventListener('submit',()=>{antes=new Set(state.bookings.map(b=>b.id))},true);
 $('groupBookingForm').addEventListener('submit',()=>{if(!antes)return;const nueva=state.bookings.find(b=>!antes.has(b.id)&&b.kind==='grupal');antes=null;if(!nueva)return;
  let {type,mates}=almaHabLeer('alma',nueva.passengerId);const fam=window.__almaFam;window.__almaFam=null;
  if(fam&&fam.mates.length){nueva.companions=fam.mates.slice();nueva.familyAccount=true;nueva.basePrice=Math.round(Number(nueva.basePrice)*(1+fam.mates.length)*100)/100;
   audit('Cuenta familiar','Reserva grupal',nueva.client+' + '+fam.mates.map(i=>almaPax(i)?.name).join(', '));mates=[]}
  if(type)almaAsignarHab(nueva,type,mates);
  save();if(window.currentGroupDetail===nueva.groupId)renderGroupDetail();
  const av=almaAutorizacion(nueva);if(av.length)setTimeout(()=>alert('Recordale al pasajero:\n\n• '+av.join('\n• ')+'\n\nPara viajes al exterior la autorización se hace ante escribano, en el Registro Civil o en Migraciones.'),300)})}
/* Editar reserva (grupal): muestra la habitación actual y deja cambiarla */
{const o=window.editBooking;window.editBooking=(id,...a)=>{o(id,...a);const b=findBooking(id),box=$('almaERoomBox');if(!box)return;
 if(!b||b.kind!=='grupal'){box.style.display='none';return}box.style.display='';
 const g=findGroup(b.groupId),r=(g?.rooms||[]).find(x=>x.id===b.roomId);
 const occ=r?state.bookings.filter(x=>x.id!==b.id&&x.kind==='grupal'&&x.groupId===b.groupId&&x.roomId===r.id&&accountStatus(x)!=='Baja'):[];const fam=(b.companions||[]).map(i=>({passengerId:i,client:almaPax(i)?.name||''}));occ.unshift(...fam);
 const t=r?(ALMA_TIPO_VIEJO[r.type]||r.type):'';const sel=$('almaERoomType');if(t&&![...sel.options].some(o=>o.value===t))sel.add(new Option(t,t));sel.value=t;
 almaHabMates('almaE',b.passengerId,occ.map(x=>x.passengerId));almaERoomSync();
 $('almaERoomNow').innerHTML=r?'Hoy: <b>'+esc(r.label)+'</b> ('+esc(r.type)+')'+(occ.length?' con <b>'+occ.map(x=>esc(x.client)).join(', ')+'</b>':' · sin compañeros asignados'):'Hoy: sin habitación asignada.';
 window.__almaEditRoom={id,type:sel.value,mates:occ.map(x=>x.passengerId).sort().join(',')}}}
$('editBookingForm').addEventListener('submit',()=>{const st=window.__almaEditRoom;if(!st||$('editBookingDialog').open)return;window.__almaEditRoom=null;
 const b=findBooking(st.id);if(!b||b.kind!=='grupal')return;const {type,mates}=almaHabLeer('almaE',b.passengerId);
 if(type===st.type&&mates.slice().sort().join(',')===st.mates)return;
 if(b.familyAccount){const antes=(b.companions||[]).join(',');b.companions=mates.slice(0,Math.max(0,(ALMA_CAP[type]||1)-1));if(b.companions.join(',')!==antes){audit('Cuenta familiar modificada','Reserva grupal',b.client+' + '+b.companions.map(i=>almaPax(i)?.name).join(', '));alert('Cambiaron los integrantes de la cuenta familiar. Revisá el precio de la reserva si corresponde.')}mates=[]}
 almaAsignarHab(b,type,mates);save();if(window.currentGroupDetail===b.groupId)renderGroupDetail();
 const av=almaAutorizacion(b);if(av.length)alert('Recordale al pasajero:\n\n• '+av.join('\n• '))});
/* Ficha del pasajero: con quién comparte habitación / viaja */
function almaHabInfo(b,pid){
 if(b.kind==='grupal'){const g=findGroup(b.groupId),r=(g?.rooms||[]).find(x=>x.id===b.roomId);if(!r)return '';
  const ids=[];for(const x of state.bookings)if(x.kind==='grupal'&&x.groupId===b.groupId&&x.roomId===r.id&&accountStatus(x)!=='Baja')almaViajeros(x).forEach(i=>i!==pid&&ids.push(i));
  const m=ids.map(almaPax).filter(Boolean);
  return '<span class="sub alma-hab">🛏 '+esc(r.type)+' · '+esc(r.label)+(m.length?' · comparte con '+m.map(almaLink).join(', '):'')+'</span>'+(b.familyAccount?'<span class="sub alma-hab">👪 Cuenta familiar a nombre de '+esc(b.client)+'</span>':'')+almaAutoHtml(b)}
 const ids=[b.passengerId,...(b.companions||[])].filter(x=>x&&x!==pid),ps=ids.map(x=>state.passengers.find(p=>p.id===x)).filter(Boolean);
 return (ps.length?'<span class="sub alma-hab">👥 Viaja con '+ps.map(almaLink).join(', ')+'</span>':'')+almaAutoHtml(b)}
for(const id of ['almaMate1','almaMate2','almaMate3','almaEMate1','almaEMate2','almaEMate3'])almaBuscadorInit(id);

/* ---------- 8) Familias: menores con sus padres, cuenta familiar y aviso de autorización ---------- */
function almaPlaza(b){return 1+(b.companions||[]).length}
function almaPlazas(gid){return state.bookings.filter(b=>b.kind==='grupal'&&b.groupId===gid&&accountStatus(b)!=='Baja').reduce((n,b)=>n+almaPlaza(b),0)}
function almaMenor(p,al){const e=almaEdad(p?.birthDate,al);return e!=null&&e<18}
function almaEdad(nac,al){if(!nac)return null;const a=new Date((al||today())+'T12:00:00'),n=new Date(nac+'T12:00:00');if(isNaN(a)||isNaN(n))return null;let e=a.getFullYear()-n.getFullYear();const m=a.getMonth()-n.getMonth();if(m<0||(m===0&&a.getDate()<n.getDate()))e--;return e}
function almaPax(id){return state.passengers.find(p=>p.id===id)}
function almaLink(p){return '<button type="button" class="textlink" onclick="openPassengerProfile(&quot;'+p.id+'&quot;)">'+esc(p.name)+'</button>'}
function almaPadres(p){return [p.guardian1,p.guardian2].filter(Boolean).map(almaPax).filter(Boolean)}
function almaHijos(p){return state.passengers.filter(x=>x.guardian1===p.id||x.guardian2===p.id)}
function almaFamInfo(p){const e=almaEdad(p.birthDate),pa=almaPadres(p),hi=almaHijos(p),out=[];
 if(e!=null&&e<18)out.push('<span class="tag alma-menor">Menor · '+e+' años</span>');
 if(pa.length)out.push('<span>Hijo/a de '+pa.map(almaLink).join(' y ')+'</span>');
 if(hi.length)out.push('<span>Hijos/as: '+hi.map(h=>almaLink(h)+(almaMenor(h)?' ('+almaEdad(h.birthDate)+')':'')).join(', ')+'</span>');
 return out.length?'<div class="alma-fam-info">👪 '+out.join(' · ')+'</div>':''}
/* Quiénes viajan en una cuenta (titular + acompañantes) y fecha del viaje */
function almaViajeros(b){return [b.passengerId,...(b.companions||[])].filter(Boolean)}
function almaFechaViaje(b){return b.kind==='grupal'?findGroup(b.groupId)?.departure:b.departure}
/* Aviso de autorización de viaje para menores */
function almaAutorizacion(b){const msgs=[],fecha=almaFechaViaje(b);
 let juntos=new Set(almaViajeros(b));
 if(b.kind==='grupal')for(const x of state.bookings)if(x.kind==='grupal'&&x.groupId===b.groupId&&accountStatus(x)!=='Baja')almaViajeros(x).forEach(i=>juntos.add(i));
 for(const id of almaViajeros(b)){const p=almaPax(id);if(!p)continue;const e=almaEdad(p.birthDate,fecha);if(e==null||e>=18)continue;
  const pa=almaPadres(p);if(!pa.length){msgs.push(p.name+' es menor ('+e+'): cargá a sus padres en la ficha para saber qué autorización necesita.');continue}
  const van=pa.filter(x=>juntos.has(x.id)),no=pa.filter(x=>!juntos.has(x.id));
  if(!van.length)msgs.push(p.name+' ('+e+') viaja sin sus padres: necesita autorización de viaje de '+pa.map(x=>x.name).join(' y ')+'.');
  else if(no.length)msgs.push(p.name+' ('+e+') viaja con '+van.map(x=>x.name).join(' y ')+' pero sin '+no.map(x=>x.name).join(' y ')+': necesita su autorización de viaje.')}
 return msgs}
function almaAutoHtml(b){const m=almaAutorizacion(b);return m.length?'<span class="sub alma-auto">⚠ Autorización de viaje: '+m.map(esc).join(' ')+' (para viajes al exterior: ante escribano, Registro Civil o Migraciones).</span>':''}
/* Ficha del pasajero: padres / tutores */
window.almaMenorInfo=()=>{const f=$('passengerForm'),el=$('almaMinorInfo');if(!f||!el)return;const e=almaEdad(f.elements.birthDate.value);
 el.innerHTML=e!=null&&e<18?'<b>Menor de edad ('+e+' años).</b> Elegí a sus padres o tutores: quedan vinculados en las dos fichas.':'Si es menor, elegí a sus padres o tutores (deben estar cargados en la base).'};
{const o=window.openPassengerForm;window.openPassengerForm=(id='',...a)=>{o(id,...a);const p=almaPax(id)||{};
 for(const [k,s] of [['guardian1','almaG1'],['guardian2','almaG2']]){const el=$(s);if(!el)continue;el.innerHTML=almaPaxOpts(id).replace('— Elegí un pasajero de la base —','— Ninguno —');almaBuscadorReset(s);el.value=p[k]||''}
 almaMenorInfo()}}
$('passengerForm')?.elements.birthDate?.addEventListener('change',()=>almaMenorInfo());
$('passengerForm')?.addEventListener('submit',e=>{const f=e.target;if(f.elements.guardian1&&f.elements.guardian1.value&&f.elements.guardian1.value===f.elements.guardian2?.value)f.elements.guardian2.value=''},true);
for(const id of ['almaG1','almaG2'])almaBuscadorInit(id);
/* Inscribir: cuenta familiar */
window.almaFamSync=()=>{const n=(ALMA_CAP[$('almaRoomType')?.value]||1)-1,box=$('almaFamBox');if(!box)return;
 const hay=[1,2,3].slice(0,n).some(k=>$('almaMate'+k)?.value);box.style.display=n>0&&hay?'':'none';
 const tit=almaPax($('bookingExistingPassenger')?.value),menores=[1,2,3].slice(0,n).map(k=>almaPax($('almaMate'+k)?.value)).filter(p=>p&&almaMenor(p));
 $('almaFamHint').textContent=menores.length&&!box.dataset.tocado?'Hay menores: se sugiere cuenta familiar.':'';
 if(menores.length&&!box.dataset.tocado)$('almaFamSi').checked=true;
 const g=findGroup($('bookingGroup')?.value),pr=Number($('bookingBasePrice')?.value||0),cant=1+[1,2,3].slice(0,n).filter(k=>$('almaMate'+k)?.value).length;
 $('almaFamTotal').textContent=$('almaFamSi').checked&&g?'Cuenta a nombre de '+(tit?.name||'el titular')+' por '+cant+' pasajeros: '+money(pr*cant,g.currency)+' ('+cant+' × '+money(pr,g.currency)+'). Si hay tarifa de menor, un socio la ajusta con descuento.':''};
for(const id of ['almaRoomType','almaMate1','almaMate2','almaMate3','bookingExistingPassenger','bookingBasePrice'])$(id)?.addEventListener(id==='bookingBasePrice'?'input':'change',()=>almaFamSync());
for(const id of ['almaFamSi','almaFamNo'])$(id)?.addEventListener('change',()=>{$('almaFamBox').dataset.tocado='1';almaFamSync()});
{const o=window.openGroupBooking;window.openGroupBooking=(...a)=>{o(...a);const b=$('almaFamBox');if(b){b.dataset.tocado='';$('almaFamNo').checked=true}almaFamSync()}}
/* Antes de inscribir con cuenta familiar: cupos y que nadie esté ya inscripto */
$('groupBookingForm')?.addEventListener('submit',e=>{window.__almaFam=null;if(!$('almaFamSi')?.checked||$('almaFamBox').style.display==='none')return;
 const g=findGroup($('bookingGroup').value),tit=$('bookingExistingPassenger').value;if(!g||!tit)return;
 const {mates}=almaHabLeer('alma',tit);if(!mates.length)return;
 const ya=mates.filter(pid=>state.bookings.some(b=>b.kind==='grupal'&&b.groupId===g.id&&accountStatus(b)!=='Baja'&&almaViajeros(b).includes(pid)));
 if(ya.length){e.preventDefault();e.stopImmediatePropagation();alert('Ya están inscriptos en esta salida: '+ya.map(i=>almaPax(i)?.name).join(', ')+'. Sacalos de la lista o usá una cuenta por pasajero.');return}
 if(g.capacity>0&&almaPlazas(g.id)+1+mates.length>g.capacity){e.preventDefault();e.stopImmediatePropagation();alert('No hay cupos para '+(1+mates.length)+' pasajeros en esta salida.');return}
 window.__almaFam={mates}},true);

/* ---------- 9) Registrar cobro: empezar por el pasajero de la base y elegir el viaje ---------- */
function almaPayTrips(pid){return state.bookings.filter(b=>payable(b)&&almaViajeros(b).includes(pid))}
function almaTripLabel(b,pid){const k=b.kind==='grupal'?'Salida grupal':b.kind==='aereo'?'Aéreo':'Viaje individual';
 const t=trip(b),fi=b.fileNumber||bookingFile(b);return (t.startsWith(k)?t:k+' · '+t)+(fi&&fi!=='Aéreo'?' · File '+fi:'')+' · saldo '+money(balance(b),cur(b))+(b.passengerId!==pid?' (cuenta de '+b.client+')':'')}
window.almaPayPaxSync=()=>{const pid=$('almaPayPax').value,ts=$('almaPayTrip'),p=almaPax(pid);
 if(!p){ts.innerHTML='<option value="">Primero elegí el pasajero</option>';$('almaPayTripWrap').style.display='none';almaPayOcultar(false);return}
 const list=almaPayTrips(pid);$('almaPayTripWrap').style.display='';
 ts.innerHTML=list.map(b=>'<option value="'+esc(b.id)+'">'+esc(almaTripLabel(b,pid))+'</option>').join('')
  +'<option value="nuevo:grupal">➕ Cuenta nueva: inscribirlo en una salida grupal</option><option value="nuevo:individual">➕ Cuenta nueva: viaje individual</option><option value="nuevo:aereo">➕ Cuenta nueva: solo aéreo</option>';
 $('almaPayTripInfo').textContent=list.length?(list.length===1?'Tiene 1 viaje con saldo.':'Tiene '+list.length+' viajes con saldo: elegí a cuál le cobrás.'):'No tiene viajes con saldo pendiente: abrí una cuenta nueva.';
 ts.value=list[0]?.id||'nuevo:individual';almaPayTripSync()};
window.almaPayTripSync=()=>{const v=$('almaPayTrip').value,p=almaPax($('almaPayPax').value);if(!p)return;const f=$('paymentForm');
 if(v.startsWith('nuevo:')){$('payKind').value=v.slice(6);$('payMode').value='nuevo';syncPayMode();
  f.elements.newClient.value=p.name;f.elements.newClient.readOnly=true;f.elements.newPhone.value=p.phone||'';if(f.elements.newEmail)f.elements.newEmail.value=p.email||''}
 else{const b=findBooking(v);if(!b)return;f.elements.newClient.readOnly=false;$('payKind').value=b.kind;$('payMode').value='existente';
  if(b.kind==='grupal')$('payExistingGroup').dataset.targetGroup=b.groupId;syncPayMode();$('payBooking').value=b.id;syncPaymentInfo()}
 almaPayOcultar(true);$('almaPayCur').dataset.tocado='';almaPayFxSync()};
function almaPayOcultar(si){for(const el of [$('payKind')?.closest('label'),$('payMode')?.closest('label'),$('payExistingGroupBox'),$('payExistingBox')])if(el)el.style.display=si?'none':(el.id==='payExistingGroupBox'?($('payKind').value==='grupal'&&$('payMode').value!=='nuevo'?'flex':'none'):el.id==='payExistingBox'?($('payMode').value==='nuevo'?'none':'flex'):'')}
window.almaPayAlta=()=>{window.__almaAltaFor='almaPayPax';openPassengerForm('');const q=$('almaPayPaxBuscar')?.value||'';if(q&&!/\d/.test(q))$('passengerForm').elements.name.value=q};
{const o=window.openPayment;window.openPayment=(id,...a)=>{o(id,...a);const s=$('almaPayPax');if(!s)return;
 s.innerHTML=almaPaxOpts('');almaBuscadorReset('almaPayPax');const b=findBooking(id);
 if(b){s.value=b.passengerId;almaPayPaxSync();$('almaPayTrip').value=b.id;almaPayTripSync()}else{s.value='';almaPayPaxSync()}}}
$('almaPayPax')?.addEventListener('change',()=>almaPayPaxSync());
almaBuscadorInit('almaPayPax');
/* Cuenta nueva: el pasajero tiene que estar en la base */
$('paymentForm')?.addEventListener('submit',e=>{const f=e.target;if($('payMode').value!=='nuevo')return;
 const n=String(f.elements.newClient.value||'').trim().toLocaleLowerCase('es-AR');
 if(n&&state.passengers.some(p=>String(p.name||'').trim().toLocaleLowerCase('es-AR')===n))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(confirm('El pasajero tiene que estar en la Base de pasajeros.\n\nBuscalo arriba en «Pasajero» o tocá Aceptar para darlo de alta ahora.'))almaPayAlta()},true);

/* ---------- 10) Cobro por un solo pasajero de una reserva con varios ---------- */
function almaPagadoPor(b,pid,excl){return state.payments.filter(p=>p.bookingId===b.id&&!p.voidedAt&&p.forPassengerId===pid&&p.id!==excl).reduce((n,p)=>n+Number(p.amount),0)}
function almaPorBooking(){if($('payMode')?.value==='nuevo')return null;return findBooking($('payBooking')?.value)}
window.almaPorSync=()=>{const box=$('almaPorBox');if(!box)return;const b=almaPorBooking(),ids=b?almaViajeros(b):[];
 if(!b||ids.length<2){box.style.display='none';$('almaPor').innerHTML='<option value="">Toda la reserva</option>';$('almaPorShareWrap').style.display='none';updatePaymentPreview();return}
 box.style.display='';const sel=$('almaPor'),v=sel.value;
 sel.innerHTML='<option value="">Toda la reserva ('+ids.length+' pasajeros)</option>'+ids.map(i=>'<option value="'+esc(i)+'">Solo '+esc(almaPax(i)?.name||'pasajero')+'</option>').join('');
 sel.value=ids.includes(v)?v:'';const uno=!!sel.value;$('almaPorShareWrap').style.display=uno?'':'none';
 if(uno&&!$('almaPorShare').dataset.tocado)$('almaPorShare').value=Math.round(total(b)/ids.length*100)/100;
 $('almaPorShareLbl').textContent='Parte de este pasajero ('+cur(b)+')';updatePaymentPreview()};
function almaPorNote(amount,c){const b=almaPorBooking(),pid=$('almaPor')?.value;if(!b||!pid)return '';const p=almaPax(pid),share=Number($('almaPorShare').value||0),antes=almaPagadoPor(b,pid);
 if(!(share>0))return '<div class="alma-fx alma-fx-warn">Ingresá la parte que le corresponde a '+esc(p?.name||'este pasajero')+'.</div>';
 const desp=Math.max(0,share-antes-(Number.isFinite(amount)?amount:0));
 const extra=(Number.isFinite(amount)?amount:0)-(share-antes);
 return '<div class="alma-fx'+(extra>0.009?' alma-fx-warn':'')+'">Pago de <b>'+esc(p?.name||'')+'</b> · su parte: '+money(share,c)+' · pagó antes: '+money(antes,c)+' · <b>su saldo luego del pago: '+money(desp,c)+'</b>'+(extra>0.009?'<br>Ojo: paga '+money(extra,c)+' más que lo que le falta a este pasajero.':'')+'</div>'}
function almaPorPaxFields(b,amount){const pid=$('almaPor')?.value;if(!pid||!b||!almaViajeros(b).includes(pid))return {};
 const share=Number($('almaPorShare').value||0),antes=almaPagadoPor(b,pid);
 return {forPassengerId:pid,forPassengerName:almaPax(pid)?.name||'',forPaxCount:almaViajeros(b).length,forShare:share,forPaidBefore:antes,forBalanceAfter:Math.max(0,Math.round((share-antes-amount)*100)/100)}}
function almaReciboPasajero(p,snap){return p.forPassengerId?esc(p.forPassengerName)+(p.forPassengerName!==snap.client?' <small>(reserva a nombre de '+esc(snap.client)+')</small>':''):esc(snap.client)}
function almaReciboMontos(p,snap,extended,orig){if(!p.forPassengerId)return orig;const c=snap.currency;
 return '<div class="receipt-line"><b>PAGO A CUENTA DE:</b><br><b>'+esc(p.forPassengerName)+'</b> (1 de '+p.forPaxCount+' pasajeros)</div>'
  +'<div class="receipt-line"><b>PARTE DEL PASAJERO:</b><br>'+money(p.forShare,c)+'</div>'
  +'<div class="receipt-line"><b>PAGOS ANTERIORES DEL PASAJERO:</b><br>'+money(p.forPaidBefore,c)+'</div>'
  +'<div class="receipt-line"><b>RECIBIDO AHORA:</b><br><b>'+money(p.amount,c)+'</b>'+almaFxRecibo(p,c)+'</div>'
  +'<div class="receipt-line"><b>SALDO DEL PASAJERO TRAS ESTE PAGO:</b><br><b>'+money(p.forBalanceAfter,c)+'</b></div>'
  +'<div class="receipt-line"><small>Total de la reserva: '+money(snap.total,c)+' · saldo total de la reserva: '+money(snap.balanceAfter,c)+'</small></div>'}
for(const id of ['payBooking','payMode','payKind','payExistingGroup'])$(id)?.addEventListener('change',()=>almaPorSync());
$('almaPor')?.addEventListener('change',()=>almaPorSync());
$('almaPorShare')?.addEventListener('input',()=>{$('almaPorShare').dataset.tocado='1';updatePaymentPreview()});
{const o=window.syncPaymentInfo;window.syncPaymentInfo=(...a)=>{const r=o(...a);if($('almaPorShare'))$('almaPorShare').dataset.tocado='';almaPorSync();return r}}
{const o=window.openPayment;window.openPayment=(...a)=>{if($('almaPor'))$('almaPor').value='';if($('almaPorShare'))$('almaPorShare').dataset.tocado='';o(...a);almaPorSync()}}
