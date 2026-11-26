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
 info.textContent=q?(list.length?list.length+(list.length===1?' coincidencia':' coincidencias')+(list.length>1?' · elegí abajo si no es el primero':''):(selId==='expenseOperation'?'Sin coincidencias: probá con el número de file o el nombre':'Sin coincidencias: se carga como pasajero nuevo')):'';
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
const ALMA_CAP={'Single':1,'Doble matrimonial':2,'Doble twin':2,'Triple':3,'Cuádruple':4,'A compartir':1};
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

/* ---------- 11) Recibo de media hoja: el diseño compacto de impresión está en login.css ---------- */
window.addEventListener('afterprint',()=>{const r=$('receiptPaper');if(r)r.style.zoom=''});

/* ---------- 12) Buscador de recibos (por pasajero, salida / viaje y estado) ---------- */
function almaReciboViaje(p){const b=findBooking(p.bookingId);return {b,kind:p.snapshot?.kind||b?.kind||'',gid:b?.groupId||p.snapshot?.groupId||''}}
function almaRecibosFiltrados(){
 const q=almaNorm($('almaRecQ')?.value||'').trim(),sal=$('almaRecSal')?.value||'',est=$('almaRecEst')?.value||'';
 const words=q?q.split(/\s+/):[];
 return state.payments.filter(p=>{const {b,kind,gid}=almaReciboViaje(p);
  if(sal==='individual'||sal==='aereo'){if(kind!==sal)return false}else if(sal&&gid!==sal)return false;
  if(est==='vigentes'&&p.voidedAt)return false;if(est==='anulados'&&!p.voidedAt)return false;
  if(!words.length)return true;
  const nombres=[p.snapshot?.client,b?.client,p.forPassengerName,...(b?almaViajeros(b).map(i=>almaPax(i)?.name):[])].join(' ');
  const hay=almaNorm(nombres+' '+p.number+' '+(p.snapshot?.fileNumber||(b?bookingFile(b):''))+' '+(p.snapshot?.trip||(b?trip(b):'')));
  return words.every(w=>hay.includes(w))})}
window.almaRecFiltrar=()=>renderPayments();
function almaRecInfoUpd(){const n=almaRecibosFiltrados(),tot={};for(const p of n)if(!p.voidedAt){const c=p.snapshot?.currency||(findBooking(p.bookingId)?cur(findBooking(p.bookingId)):'USD');tot[c]=(tot[c]||0)+Number(p.amount)}
 const el=$('almaRecInfo');if(el)el.textContent=n.length+(n.length===1?' recibo':' recibos')+(Object.keys(tot).length?' · cobrado (sin anulados): '+Object.entries(tot).map(([c,v])=>money(v,c)).join(' + '):'')};
function almaRecSalidas(){const s=$('almaRecSal');if(!s)return;const v=s.value;
 s.innerHTML='<option value="">Todos los viajes</option><option value="individual">Viajes individuales</option><option value="aereo">Aéreos</option>'+state.groups.slice().sort((a,b)=>String(a.departure).localeCompare(String(b.departure))).map(g=>'<option value="'+esc(g.id)+'">'+esc((g.fileNumber?g.fileNumber+' · ':'')+g.name)+'</option>').join('');s.value=[...s.options].some(o=>o.value===v)?v:''}
{const o=renderPayments;renderPayments=(...a)=>{almaRecSalidas();const r=o(...a);almaRecInfoUpd();return r}}

/* ---------- 13) Cobros sin efectivo: a dónde fue el dinero y cuándo se acreditó ---------- */
const ALMA_MP='Mercado Pago Grupostur (antigua SRL) · cuenta de socio';
const ALMA_DESTINOS=['BBVA pesos (agencia)','BBVA dólares (agencia)',ALMA_MP,'Caja oficina Centro','Caja oficina Gaona','Otro'];
function almaDestTxt(p){if(!p||p.method==='Efectivo')return '';return p.destination?' · Destino: '+p.destination+(p.destinationDetail?' ('+p.destinationDetail+')':'')+(p.creditedDate?' · acreditado '+fmt(p.creditedDate):''):' · Destino sin indicar'}
function almaDestFields(x){if(x.method==='Efectivo'||!x.almaDest)return {};return {destination:x.almaDest,destinationDetail:String(x.almaDestDet||'').trim(),creditedDate:x.almaDestFecha||x.date||today()}}
{const o=window.almaPayFxSync;window.almaPayFxSync=(...a)=>{o(...a);const f=$('paymentForm'),w=$('almaDestWrap');if(!f||!w)return;const no=f.elements.method.value!=='Efectivo';
 w.style.display=no?'':'none';f.elements.almaDest.required=no;const otro=no&&f.elements.almaDest.value==='Otro';f.elements.almaDestDet.required=otro;$('almaDestDetLbl').textContent=otro?'¿A qué cuenta fue? (obligatorio)':'Detalle (opcional)';if(no&&!f.elements.almaDestFecha.value)f.elements.almaDestFecha.value=f.elements.date?.value||today()}}
$('paymentForm')?.elements.date?.addEventListener('change',e=>{const f=$('paymentForm');if(f.elements.almaDestFecha&&!f.elements.almaDestFecha.dataset.tocado)f.elements.almaDestFecha.value=e.target.value});
$('paymentForm')?.elements.almaDestFecha?.addEventListener('change',e=>{e.target.dataset.tocado='1'});
{const o=window.openPayment;window.openPayment=(...a)=>{o(...a);const f=$('paymentForm');if(f?.elements.almaDest){f.elements.almaDest.value=ALMA_MP;f.elements.almaDestDet.value='';f.elements.almaDestFecha.value=f.elements.date?.value||today();f.elements.almaDestFecha.dataset.tocado='';almaPayFxSync()}}}
/* Caja del día: cobros que no son efectivo (no entran en el arqueo) */
function almaNoEfectivoHoy(box){const ps=state.payments.filter(p=>p.cashbox===box&&p.date===today()&&p.method!=='Efectivo'&&!p.voidedAt);if(!ps.length)return '';
 return '<div class="alma-noef"><b>Cobros de hoy sin efectivo</b> <span class="sub">(no entran en el arqueo)</span>'+ps.map(p=>{const b=findBooking(p.bookingId),c=p.payCurrency||p.snapshot?.currency||(b?cur(b):'USD');
  return '<div class="alma-noef-row"><span>'+esc(p.number)+' · '+esc(p.forPassengerName||p.snapshot?.client||b?.client||'')+' · <b>'+money(p.payCurrency?p.payAmount:p.amount,c)+'</b> · '+esc(p.method)+'</span><span class="sub">'+(p.destination?'→ '+esc(p.destination)+(p.destinationDetail?' ('+esc(p.destinationDetail)+')':'')+(p.creditedDate?' · acreditado '+fmt(p.creditedDate):''):'<span class="alma-auto">Destino sin indicar</span>')+'</span>'
   +(!p.destination&&window.demoRole==='socio'?'<button type="button" class="btn ghost tiny" onclick="almaDestEditar(&quot;'+p.id+'&quot;)">Indicar destino</button>':'')+'</div>'}).join('')+'</div>'}
/* Indicar el destino de un cobro ya registrado (socios) */
window.almaDestEditar=id=>{const p=state.payments.find(x=>x.id===id);if(!p)return;let d=$('almaDestDialog');
 if(!d){d=document.createElement('dialog');d.id='almaDestDialog';d.className='dialog';
  d.innerHTML='<form method="dialog" id="almaDestForm"><div class="modalhead"><h2>¿A dónde fue el dinero?</h2></div><div class="modalbody"><p class="hint" id="almaDestInfo"></p><div class="formgrid">'
   +'<label class="field">Destino<select name="dest" required><option value="">— Elegí —</option>'+ALMA_DESTINOS.map(x=>'<option>'+x+'</option>').join('')+'</select></label>'
   +'<label class="field">Fecha de acreditación<input type="date" name="fecha" required></label>'
   +'<label class="field full">Detalle (si es «Otro», a qué cuenta fue)<input name="det" placeholder="Ej.: cuenta personal de Hernan, Galicia"></label></div></div>'
   +'<div class="modalfoot"><button type="button" class="btn ghost" onclick="closeDialog(\'almaDestDialog\')">Cancelar</button><button class="btn" type="submit">Guardar</button></div></form>';
  document.body.appendChild(d);
  d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const f=e.target,q=state.payments.find(x=>x.id===d.dataset.pid);if(!q)return;if(f.elements.dest.value==='Otro'&&!f.elements.det.value.trim())return alert('Escribí a qué cuenta fue el dinero.');
   q.destination=f.elements.dest.value;q.destinationDetail=f.elements.det.value.trim();q.creditedDate=f.elements.fecha.value;
   audit('Destino del cobro','Cobros',q.number+' → '+q.destination);save();closeDialog('almaDestDialog');render();notify('Destino guardado')})}
 d.dataset.pid=id;const f=d.querySelector('form');f.reset();f.elements.fecha.value=p.date||today();
 $('almaDestInfo').textContent=p.number+' · '+(p.snapshot?.client||'')+' · '+p.method;openDlg('almaDestDialog')};

$('paymentForm')?.elements.almaDest?.addEventListener('change',()=>almaPayFxSync());

/* ---------- 14) Compromiso con proveedor: buscador de file ---------- */
almaBuscadorInit('expenseOperation');
{const i=$('expenseOperationBuscar');if(i)i.placeholder='🔍 Buscar file por número, pasajero, salida o destino'}
{const o=window.refreshExpenseFiles;if(o)window.refreshExpenseFiles=(...a)=>{const r=o(...a);const s=$('expenseOperation'),v=s?.value;almaBuscadorReset('expenseOperation');if(s&&v)s.value=v;return r}}

/* ---------- 15) Reservas: buscador (file, pasajero, viaje) y filtros ---------- */
function almaReservasFiltradas(){
 const q=almaNorm($('almaResQ')?.value||'').trim(),tipo=$('almaResTipo')?.value||'',est=$('almaResEst')?.value||'';const words=q?q.split(/\s+/):[];
 return state.bookings.filter(b=>{
  if(tipo==='individual'||tipo==='aereo'||tipo==='grupal'){if(b.kind!==tipo)return false}else if(tipo&&b.groupId!==tipo)return false;
  const st=accountStatus(b);if(est==='abiertas'&&!(st==='Abierta'||st==='Reabierta'))return false;if(est==='saldo'&&!(balance(b)>0.009))return false;if(est==='cerradas'&&st!=='Cerrada')return false;if(est==='baja'&&st!=='Baja')return false;
  const amb=$('almaResAmb')?.value||'';if(amb&&(amb==='-'?almaAmbito(b):almaAmbito(b)!==amb))return false;
  if(!words.length)return true;
  const g=b.kind==='grupal'?findGroup(b.groupId):null;
  const hay=almaNorm([b.client,...almaViajeros(b).map(i=>almaPax(i)?.name),b.fileNumber,bookingFile(b),g?.fileNumber,g?.name,trip(b),b.owner].join(' '));
  return words.every(w=>hay.includes(w))})}
function almaResOpciones(){const s=$('almaResTipo');if(!s)return;const v=s.value;
 s.innerHTML='<option value="">Todos los tipos</option><option value="individual">Viajes individuales</option><option value="aereo">Aéreos</option><option value="grupal">Todas las salidas grupales</option>'+state.groups.slice().sort((a,b)=>String(a.departure).localeCompare(String(b.departure))).map(g=>'<option value="'+esc(g.id)+'">'+esc((g.fileNumber?g.fileNumber+' · ':'')+g.name)+'</option>').join('');s.value=[...s.options].some(o=>o.value===v)?v:''}
window.almaResFiltrar=()=>renderBookings();
{const o=renderBookings;renderBookings=(...a)=>{almaResOpciones();const r=o(...a);const n=almaReservasFiltradas().length,t=state.bookings.length,el=$('almaResInfo');if(el)el.textContent=n===t?t+' reservas':n+' de '+t+' reservas';return r}}

// ── Teléfono repetido en la ficha del pasajero: avisa al cargarlo y al guardar ──
function almaTelClave(v){const d=String(v||'').replace(/\D/g,'');return d.length>=8?d.slice(-8):''}
function almaTelRepetidos(tel,exceptId){const k=almaTelClave(tel);if(!k)return [];return state.passengers.filter(q=>q.id!==exceptId&&almaTelClave(q.phone)===k)}
window.almaTelAviso=()=>{const f=$('passengerForm');if(!f||!f.elements.phone)return;let el=$('almaTelDup');
 if(!el){el=document.createElement('div');el.id='almaTelDup';el.className='sub';el.style.cssText='color:#b45309;font-weight:600;margin-top:4px';f.elements.phone.insertAdjacentElement('afterend',el)}
 const r=almaTelRepetidos(f.elements.phone.value,f.elements.editId?.value||'');el.textContent=r.length?'⚠ Este teléfono ya está en la ficha de: '+r.map(q=>q.name).join(', '):'';el.style.display=r.length?'':'none'};
{const f=$('passengerForm');if(f&&f.elements.phone){f.elements.phone.addEventListener('input',almaTelAviso);f.elements.phone.addEventListener('blur',almaTelAviso);
 f.addEventListener('submit',e=>{const id=f.elements.editId?.value||'',tel=f.elements.phone.value,p=state.passengers.find(q=>q.id===id);
  if(p&&almaTelClave(p.phone)===almaTelClave(tel))return; // no cambió el teléfono
  const r=almaTelRepetidos(tel,id);if(!r.length)return;
  if(!confirm('El teléfono '+tel+' ya está cargado en la ficha de:\n• '+r.map(q=>q.name).join('\n• ')+'\n\nSi es la misma persona, cancelá y usá esa ficha.\n¿Guardar igual con este teléfono?')){e.preventDefault();e.stopImmediatePropagation()}},true)}}
{const o=window.openPassengerForm;window.openPassengerForm=(...a)=>{o(...a);almaTelAviso()}}

// ── Caja (socios): Movimientos arriba, Historial de aperturas y cierres abajo ──
{const hist=$('cashSessionsHistory')?.closest('.panel'),mov=$('cashCentroBalance')?.closest('.panel'),bank=$('bankPanel');
 if(hist&&mov&&bank){bank.before(mov);bank.after(hist)}}

// ── Historial de caja: ver los movimientos del día de cada apertura ──
window.almaCajaDia=id=>{const x=state.cashSessions.find(s=>s.id===id);if(!x)return;let d=$('almaCajaDiaDialog');
 if(!d){d=document.createElement('dialog');d.id='almaCajaDiaDialog';d.className='dialog';d.style.maxWidth='980px';
  d.innerHTML='<div class="modalhead"><h2 id="almaCajaDiaTit">Caja del día</h2><button class="btn ghost tiny" type="button" onclick="closeDialog(\'almaCajaDiaDialog\')">Cerrar</button></div><style>#almaCajaDiaBody table{width:100%;border-collapse:collapse}#almaCajaDiaBody th,#almaCajaDiaBody td{padding:7px 10px;border-bottom:1px solid var(--line,#eee);text-align:left;vertical-align:top}#almaCajaDiaBody th{font-size:12px;color:#666}</style><div class="modalbody" id="almaCajaDiaBody"></div>';document.body.appendChild(d)}
 const box=x.cashbox,dia=x.date,ses=state.cashSessions.filter(s=>s.cashbox===box&&s.date===dia).sort((a,b)=>String(a.openedAt||'').localeCompare(String(b.openedAt||'')));
 const rows=cashLedgerRows().filter(m=>m.cashbox===box&&m.date===dia).sort((a,b)=>String(a.recordedAt||'').localeCompare(String(b.recordedAt||'')));
 const ef=m=>(m.method||'Efectivo')==='Efectivo',ing=rows.filter(m=>ef(m)&&m.amount>=0),egr=rows.filter(m=>ef(m)&&m.amount<0),otros=rows.filter(m=>!ef(m));
 const monedas=[...new Set(['ARS','USD',...rows.map(m=>m.currency)])].filter(Boolean);
 const sum=(l,c)=>l.filter(m=>m.currency===c).reduce((a,m)=>a+Number(m.amount||0),0);
 const ap=ses[0]?.opening||{},ult=ses[ses.length-1],cerr=ult?.status==='cerrada';
 const hora=m=>{if(!m.recordedAt)return '—';const t=new Date(m.recordedAt);return isNaN(t)?'—':t.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false})};
 const tabla=(tit,l,vacio)=>'<h3 style="margin:18px 0 6px">'+tit+' ('+l.length+')</h3>'+(l.length?'<div class="tablewrap"><table><thead><tr><th>Hora</th><th>Categoría</th><th>Detalle</th><th>Medio</th><th>Registró</th><th style="text-align:right">Importe</th></tr></thead><tbody>'
   +l.map(m=>'<tr><td>'+esc(hora(m))+'</td><td>'+esc(m.category)+'</td><td>'+esc(m.detail||'—')+'</td><td>'+esc(m.method||'—')+'</td><td>'+esc(m.recordedBy||'—')+'</td><td style="text-align:right;white-space:nowrap"><b>'+(m.amount<0?'−':'+')+money(Math.abs(m.amount),m.currency)+'</b></td></tr>').join('')+'</tbody></table></div>':'<p class="empty">'+vacio+'</p>');
 const resumen='<div class="tablewrap"><table><thead><tr><th>Efectivo</th>'+monedas.map(c=>'<th style="text-align:right">'+c+'</th>').join('')+'</tr></thead><tbody>'
   +'<tr><td>Apertura</td>'+monedas.map(c=>'<td style="text-align:right">'+money(Number(ap[c]||0),c)+'</td>').join('')+'</tr>'
   +'<tr><td>+ Ingresos en efectivo</td>'+monedas.map(c=>'<td style="text-align:right">'+money(sum(ing,c),c)+'</td>').join('')+'</tr>'
   +'<tr><td>− Egresos en efectivo</td>'+monedas.map(c=>'<td style="text-align:right">'+money(Math.abs(sum(egr,c)),c)+'</td>').join('')+'</tr>'
   +'<tr><td><b>= Debería haber</b></td>'+monedas.map(c=>'<td style="text-align:right"><b>'+money(Number(ap[c]||0)+sum(ing,c)+sum(egr,c),c)+'</b></td>').join('')+'</tr>'
   +(cerr?'<tr><td>Contado al cierre</td>'+monedas.map(c=>'<td style="text-align:right">'+money(Number(ult.counted?.[c]||0),c)+'</td>').join('')+'</tr>':'')
   +'<tr><td>Transferencias y otros medios (no es efectivo)</td>'+monedas.map(c=>'<td style="text-align:right">'+money(sum(otros,c),c)+'</td>').join('')+'</tr>'
   +'</tbody></table></div>';
 $('almaCajaDiaTit').textContent='Caja '+cashboxName(box)+' · '+fmt(dia);
 $('almaCajaDiaBody').innerHTML='<p class="hint">'+ses.map((s,i)=>'Turno '+(i+1)+': abrió '+esc(s.openedBy||'—')+(s.status==='cerrada'?' · cerró '+esc(s.closedBy||'—'):' · sin cerrar')).join('<br>')+(ses.length>1?'<br>Se muestran los movimientos de todo el día (todos los turnos).':'')+'</p>'+resumen
   +tabla('Ingresos en efectivo',ing,'Sin ingresos en efectivo.')+tabla('Egresos en efectivo',egr,'Sin egresos en efectivo.')+tabla('Transferencias y otros medios',otros,'Sin transferencias ni otros medios ese día.');
 openDlg('almaCajaDiaDialog')};

// ── Nacional / internacional: salidas, viajes individuales y aéreos; reservas y ventas por vendedor ──
function almaAmbito(b){if(!b)return '';if(b.kind==='grupal')return findGroup(b.groupId)?.scope||'';return b.scope||''}
function almaAmbitoTag(b){const a=almaAmbito(b);return a?' <span class="tag '+(a==='Nacional'?'green':'')+'" style="margin-left:4px">'+a+'</span>':' <span class="sub" style="display:inline;color:#aa431d">Sin indicar nac./int.</span>'}
function almaAmbitoCampo(req,kinds){return '<label class="field"'+(kinds?' data-edit-kind="'+kinds+'"':'')+'>Nacional / internacional<select name="scope"'+(req?' required':'')+'><option value="">— Elegí —</option><option>Nacional</option><option>Internacional</option></select></label>'}
for(const [fid,campo,req,kinds] of [['groupForm','destination',1,''],['individualForm','tour',1,''],['flightForm','destination',1,''],['editBookingForm','tour',0,'individual aereo']]){
 const f=$(fid),el=f?.elements[campo]?.closest('label');if(el&&!f.elements.scope)el.insertAdjacentHTML('afterend',almaAmbitoCampo(req,kinds))}
{const o=window.editBooking;window.editBooking=(id,...a)=>{o(id,...a);const b=findBooking(id),f=$('editBookingForm');if(b&&f?.elements.scope)f.elements.scope.value=b.kind==='grupal'?'':(b.scope||'')}}
$('editBookingForm')?.addEventListener('submit',e=>{const f=e.target,b=findBooking(f.elements.editId.value);if(b&&b.kind!=='grupal'&&f.elements.scope&&(b.scope||'')!==f.elements.scope.value){b.scope=f.elements.scope.value;audit('Nacional / internacional','Reserva',b.client+' → '+(b.scope||'sin indicar'))}},true);
{const o=window.openIndividual;if(o)window.openIndividual=(...a)=>{const r=o(...a);const f=$('individualForm');if(f?.elements.scope&&!a[0])f.elements.scope.value='';return r}}

/* Ventas por vendedor (en Comisiones): mes elegido, filtro nacional / internacional */
function almaVentasVend(){const el=$('almaVentasVend');if(!el)return;const month=$('commissionMonth')?.value||today().slice(0,7),mode=$('commissionMode')?.value||'venta',amb=$('almaVentasAmb')?.value||'';
 const bs=state.bookings.filter(b=>accountStatus(b)!=='Baja'&&commissionMonthOf(b,mode)===month&&(!amb||(amb==='-'?!almaAmbito(b):almaAmbito(b)===amb)));
 const vend=[...new Set(bs.map(b=>b.owner||'Sin responsable'))].sort((a,b)=>a.localeCompare(b));
 const mon=[...new Set(bs.map(b=>cur(b)))].sort().reverse();
 const tot=(l,c)=>l.filter(b=>cur(b)===c).reduce((s,b)=>s+total(b),0);
 let h='<h3 style="margin:18px 0 6px">Ventas por vendedor</h3><div class="formgrid"><label class="field">Mostrar<select id="almaVentasAmb" onchange="almaVentasVend()"><option value="">Nacional e internacional</option><option>Nacional</option><option>Internacional</option><option value="-">Sin indicar</option></select></label></div><p class="hint">Reservas del mes elegido arriba ('+(mode==='salida'?'por mes de salida':'por mes de venta')+'), sin las dadas de baja. Importes vendidos al pasajero, con descuentos.</p>';
 if(!bs.length)h+='<div class="empty">No hay ventas en '+esc(month)+(amb?' con ese filtro':'')+'.</div>';
 else h+='<div class="tablewrap"><table class="table"><thead><tr><th>Vendedor</th><th>Files</th><th>Nacional</th><th>Internacional</th>'+mon.map(c=>'<th style="text-align:right">Vendido '+c+'</th>').join('')+'</tr></thead><tbody>'
  +vend.map(v=>{const l=bs.filter(b=>(b.owner||'Sin responsable')===v);return '<tr><td><details><summary style="cursor:pointer"><b>'+esc(v)+'</b></summary>'+l.map(b=>'<span class="sub">'+esc(bookingFile(b)||'—')+' · '+esc(b.client)+' · '+esc(trip(b))+' · '+(almaAmbito(b)||'sin indicar')+' · '+money(total(b),cur(b))+'</span>').join('')+'</details></td><td>'+l.length+'</td><td>'+l.filter(b=>almaAmbito(b)==='Nacional').length+'</td><td>'+l.filter(b=>almaAmbito(b)==='Internacional').length+'</td>'+mon.map(c=>'<td style="text-align:right">'+money(tot(l,c),c)+'</td>').join('')+'</tr>'}).join('')
  +'<tr><td><b>Total</b></td><td><b>'+bs.length+'</b></td><td><b>'+bs.filter(b=>almaAmbito(b)==='Nacional').length+'</b></td><td><b>'+bs.filter(b=>almaAmbito(b)==='Internacional').length+'</b></td>'+mon.map(c=>'<td style="text-align:right"><b>'+money(tot(bs,c),c)+'</b></td>').join('')+'</tr></tbody></table></div>';
 h+='<h3 style="margin:18px 0 6px">Comisiones a liquidar</h3>';
 el.innerHTML=h;const s=$('almaVentasAmb');if(s)s.value=amb}
window.almaVentasVend=almaVentasVend;
{const o=renderCommissions;renderCommissions=(...a)=>{const r=o(...a);almaVentasVend();return r};window.renderCommissions=renderCommissions}

// ── Salidas grupales: impuestos y gastos administrativos por pasajero ──
function almaCargosDe(b){const z={tax:0,adm:0,sgl:0};if(!b||b.kind!=='grupal')return z;const g=findGroup(b.groupId);if(!g)return z;
 if(cur(b)!==(g.currency||'USD'))return z;return {tax:Number(g.taxes||0)||0,adm:Number(g.adminFee||0)||0,sgl:b.roomType==='Single'?Number(g.singleSupplement||0)||0:0}}
function almaCargos(b){const c=almaCargosDe(b);return c.tax+c.adm+c.sgl}
function almaCargosTxt(b){const c=almaCargosDe(b),cu=cur(b);return [c.tax?'impuestos '+money(c.tax,cu):'',c.adm?'gastos adm. '+money(c.adm,cu):'',c.sgl?'suplemento single '+money(c.sgl,cu):''].filter(Boolean).join(' · ')}
{const f=$('groupForm'),cap=f?.elements.capacity?.closest('label');if(cap&&!f.elements.taxes)cap.insertAdjacentHTML('beforebegin',
 '<label class="field">Impuestos por pasajero<input name="taxes" type="number" min="0" step="0.01" placeholder="0"><small class="hint">Misma moneda de la salida. Se suma al total de cada inscripto.</small></label><label class="field">Gastos administrativos por pasajero<input name="adminFee" type="number" min="0" step="0.01" placeholder="0"><small class="hint">Se suma al total de cada inscripto.</small></label>'+'<label class="field">Suplemento single<input name="singleSupplement" type="number" min="0" step="0.01" placeholder="0"><small class="hint">Se suma solo a quien viaja en habitación Single.</small></label>')}
// Ganancia y comisiones: los impuestos no son venta de la agencia (los gastos administrativos sí)
{const o=bookingProfit;bookingProfit=(b,...a)=>{const r=o(b,...a);const t=almaCargosDe(b).tax;if(t&&r){if('sale' in r)r.sale-=t;if('gain' in r)r.gain-=t}return r}}

// ── Comisiones: porcentaje nacional / internacional y extra (bono) del mes ──
function almaRateRec(name){return state.commissionRates.find(x=>x.seller===name)}
function almaRates(name){const r=almaRateRec(name)||{},g=Number(r.percent||0);return {nac:r.percentNac!=null&&r.percentNac!==''?Number(r.percentNac):g,int:r.percentInt!=null&&r.percentInt!==''?Number(r.percentInt):g}}
function almaRateFor(name,b){const r=almaRates(name),a=almaAmbito(b);return a==='Nacional'?r.nac:a==='Internacional'?r.int:0}
function almaRateTxt(name,ls){const rs=[...new Set((ls||[]).map(l=>l.rate))];if(rs.length)return rs.map(r=>String(r).replace('.',',')+' %').join(' / ');const r=almaRates(name);return ''}
function almaBono(seller,month,c){const x=(almaRateRec(seller)?.bonuses||{})[month+'|'+c];return {amount:Number(x?.amount||0)||0,reason:x?.reason||''}}
function almaBonoKeys(month){const out=[];for(const r of state.commissionRates)for(const [k,v] of Object.entries(r.bonuses||{})){const [m,c]=k.split('|');if(m===month&&Number(v?.amount))out.push(r.seller+'|'+c)}return out}
function almaBonoHtml(seller,month,c,pagada){const b=almaBono(seller,month,c);
 if(pagada)return b.amount?'<p class="sub" style="margin-top:8px">Extra incluido: '+money(b.amount,c)+(b.reason?' · '+esc(b.reason):'')+'</p>':'';
 const id=btoa(unescape(encodeURIComponent(seller+'|'+c))).replace(/=/g,'');
 return '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:10px"><label class="field" style="max-width:160px">Extra / bono ('+c+')<input type="number" min="0" step="0.01" id="almaBonoA'+id+'" value="'+(b.amount||'')+'" placeholder="0"></label><label class="field" style="flex:1;min-width:200px">Motivo<input id="almaBonoR'+id+'" value="'+esc(b.reason)+'" placeholder="Ej.: premio por objetivo del mes"></label><button type="button" class="btn ghost tiny" style="margin-bottom:6px" onclick="almaBonoGuardar(&quot;'+esc(seller)+'&quot;,&quot;'+c+'&quot;,&quot;'+id+'&quot;)">Guardar extra</button></div>'}
window.almaBonoGuardar=(seller,c,id)=>{if(!adminOnly())return;const month=$('commissionMonth').value,v=Number(String($('almaBonoA'+id).value||0).replace(',','.')),why=$('almaBonoR'+id).value.trim();
 if(!(v>=0))return alert('Poné un importe válido');let r=almaRateRec(seller);if(!r){r={id:uid(),seller,percent:0};state.commissionRates.push(r)}
 r.bonuses={...(r.bonuses||{})};if(v)r.bonuses[month+'|'+c]={amount:v,reason:why};else delete r.bonuses[month+'|'+c];
 audit('Extra de comisión','Comisiones',seller+' · '+month+' · '+money(v,c)+(why?' · '+why:''));save();render();notify(v?'Extra guardado para '+seller:'Extra quitado')};
window.almaExtraNuevo=()=>{if(!adminOnly())return;const s=$('almaExtraVend')?.value,c=$('almaExtraMon')?.value||'USD';if(!s)return alert('Elegí el vendedor');
 const v=Number(String(prompt('Extra / bono para '+s+' ('+c+'):','')||'').replace(',','.'));if(!(v>0))return;const why=prompt('Motivo (opcional):','')||'';
 const month=$('commissionMonth').value;let r=almaRateRec(s);if(!r){r={id:uid(),seller:s,percent:0};state.commissionRates.push(r)}r.bonuses={...(r.bonuses||{}),[month+'|'+c]:{amount:v,reason:why}};
 audit('Extra de comisión','Comisiones',s+' · '+month+' · '+money(v,c));save();render()};
commissionLines=(month,mode)=>{const out=[];for(const b of state.bookings){if(accountStatus(b)==='Baja'||!b.owner)continue;if(commissionMonthOf(b,mode)!==month)continue;const rate=almaRateFor(b.owner,b);if(!rate)continue;const pr=bookingProfit(b);const amount=Math.max(0,pr.gain)*rate/100;out.push({bookingId:b.id,seller:b.owner,file:bookingFile(b)||'—',client:b.client,trip:trip(b),scope:almaAmbito(b),c:pr.c,sale:pr.sale,cost:pr.cost,gain:pr.gain,rate,amount:Math.round(amount*100)/100})}return out};
window.almaRateGuardar=name=>{if(!adminOnly())return;const k=CSS.escape(name),n=Number(String(document.querySelector('[data-rnac="'+k+'"]').value||0).replace(',','.')),i=Number(String(document.querySelector('[data-rint="'+k+'"]').value||0).replace(',','.'));
 if(!(n>=0&&n<=100&&i>=0&&i<=100))return alert('Poné porcentajes entre 0 y 100');let r=almaRateRec(name);if(!r){r={id:uid(),seller:name,percent:0};state.commissionRates.push(r)}
 r.percentNac=n;r.percentInt=i;r.percent=Math.max(n,i);audit('Porcentaje de comisión','Comisiones',name+' · nacional '+n+' % · internacional '+i+' %');save();render();notify('Comisión de '+name+': nacional '+n+' % · internacional '+i+' %')};
{const o=renderCommissions;renderCommissions=(...a)=>{const r=o(...a);const el=$('commissionRates');if(el){const sel=sellerNames();
  el.innerHTML=sel.length?sel.map(n=>{const r=almaRates(n);return '<div class="field"><b>'+esc(n)+'</b><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px">Nacional <input data-rnac="'+esc(n)+'" type="number" min="0" max="100" step="0.5" value="'+(r.nac||'')+'" placeholder="%" style="max-width:80px"> % · Internacional <input data-rint="'+esc(n)+'" type="number" min="0" max="100" step="0.5" value="'+(r.int||'')+'" placeholder="%" style="max-width:80px"> % <button type="button" class="btn ghost tiny" onclick="almaRateGuardar(&quot;'+esc(n)+'&quot;)">Guardar</button></span></div>'}).join('')
   +'<div class="field"><b>Agregar un extra / bono del mes</b><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px"><select id="almaExtraVend"><option value="">Vendedor…</option>'+sel.map(n=>'<option>'+esc(n)+'</option>').join('')+'</select><select id="almaExtraMon"><option>USD</option><option>ARS</option></select><button type="button" class="btn ghost tiny" onclick="almaExtraNuevo()">+ Extra</button></span><small class="hint">Para darle un extra a un vendedor aunque no tenga files con comisión ese mes.</small></div>':'<p class="hint">Todavía no hay vendedores dados de alta.</p>'}
  return r};window.renderCommissions=renderCommissions}

{const o=renderCommissions;renderCommissions=(...a)=>{const r=o(...a);document.querySelectorAll('.alma-comcard').forEach(c=>{const tb=c.querySelector('tbody');if(tb&&!tb.children.length){const w=tb.closest('.tablewrap');if(w)w.outerHTML='<p class="sub">Sin files con comisión este mes.</p>'}});return r};window.renderCommissions=renderCommissions}

// ── Página «Vendedores» (Administración, solo socios): ficha, ventas, comisiones y liquidaciones ──
pageTitles.vendedores='Vendedores';
{const nav=document.querySelector('[data-page="tesoreria"]');if(nav&&!document.querySelector('[data-page="vendedores"]')){
  nav.insertAdjacentHTML('afterend','<button data-page="vendedores" data-admin-only="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.4.1 4.2 1.6 4.8 4.3"/></svg><span>Vendedores</span></button>');
  const b=document.querySelector('[data-page="vendedores"]');b.addEventListener('click',()=>switchPage('vendedores'));if(window.demoRole==='vendedor')b.style.display='none'}
 const tes=$('tesoreria');if(tes&&!$('vendedores')){tes.insertAdjacentHTML('afterend','<section class="page" id="vendedores"><p class="description">Ficha de cada vendedor con sus datos, ventas, comisiones y liquidaciones. Solo socios.</p>'
  +'<div class="panel"><div class="panelhead"><h2>Equipo de ventas</h2><div class="actionset"><label class="field" style="margin:0">Mes<input type="month" id="almaVMes" onchange="almaVendRender()"></label><button class="btn ghost" type="button" onclick="almaVendNuevo()">+ Agregar vendedor</button></div></div><div id="almaVendCards" class="alma-vcards"></div></div>'
  +'<div class="panel" id="almaVendFicha" style="display:none"></div></section>');
  const cp=$('commissionPanel');if(cp)$('vendedores').appendChild(cp)}}
{const o=window.switchPage;window.switchPage=(id,...a)=>{if(id==='vendedores'&&!adminOnly())return;return o(id,...a)}}
/* Menú lateral: acceso a Proveedores debajo de Finanzas (solo socios) */
{const nav=document.querySelector('nav [data-page="tesoreria"],.sidebar [data-page="tesoreria"]')||document.querySelector('[data-page="tesoreria"]');
 if(nav&&!nav.parentElement.querySelector(':scope > [data-page="proveedores"]')){
  nav.insertAdjacentHTML('afterend','<button data-page="proveedores" data-admin-only="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/></svg><span>Proveedores</span></button>');
  const b=nav.nextElementSibling;b.addEventListener('click',()=>switchPage('proveedores'));if(window.demoRole==='vendedor')b.style.display='none'}}
window.__almaVendSel=null;
function almaVendMes(){const el=$('almaVMes');if(el&&!el.value)el.value=$('commissionMonth')?.value||today().slice(0,7);return el?.value||today().slice(0,7)}
function almaVendModo(){return $('commissionMode')?.value||'venta'}
function almaVendVentas(n,mes){return state.bookings.filter(b=>b.owner===n&&accountStatus(b)!=='Baja'&&commissionMonthOf(b,almaVendModo())===mes)}
function almaPorMoneda(l,f){const m={};for(const x of l){const c=x.c||cur(x);m[c]=(m[c]||0)+f(x)}return Object.entries(m).map(([c,v])=>money(v,c)).join(' · ')||'—'}
function almaVendCom(n,mes){const ls=commissionLines(mes,almaVendModo()).filter(l=>l.seller===n);const cs=[...new Set([...ls.map(l=>l.c),'USD','ARS'])];
 return cs.map(c=>({c,files:ls.filter(l=>l.c===c),amount:ls.filter(l=>l.c===c).reduce((s,l)=>s+l.amount,0)+almaBono(n,mes,c).amount,bono:almaBono(n,mes,c),paid:state.commissionPayouts.find(p=>p.seller===n&&p.month===mes&&p.currency===c)})).filter(x=>x.files.length||x.bono.amount||x.paid)}
window.almaVendRender=()=>{const box=$('almaVendCards');if(!box||!adminView())return;const mes=almaVendMes(),vs=sellerNames();
 box.innerHTML=vs.length?vs.map(n=>{const f=almaRateRec(n)?.ficha||{},bs=almaVendVentas(n,mes),r=almaRates(n),com=almaVendCom(n,mes);
  return '<button type="button" class="alma-vcard'+(window.__almaVendSel===n?' sel':'')+'" onclick="almaVendVer(&quot;'+esc(n)+'&quot;)"><b>'+esc(n)+'</b><span class="sub">'+esc(f.office||'Oficina sin cargar')+(f.phone?' · '+esc(f.phone):'')+'</span>'
   +'<span>'+bs.length+' file/s en el mes · '+bs.filter(b=>almaAmbito(b)==='Nacional').length+' nac. · '+bs.filter(b=>almaAmbito(b)==='Internacional').length+' int.</span>'
   +'<span>Vendido: '+almaPorMoneda(bs,b=>total(b))+'</span><span>Comisión: '+(com.length?com.map(x=>money(x.amount,x.c)+(x.paid?' ✓':'')).join(' · '):'—')+'</span><span class="sub">Nacional '+r.nac+' % · Internacional '+r.int+' %</span></button>'}).join(''):'<p class="empty">Todavía no hay vendedores. Tocá «+ Agregar vendedor».</p>';
 if(window.__almaVendSel)almaVendFicha(window.__almaVendSel)};
window.almaVendVer=n=>{window.__almaVendSel=n;almaVendRender();$('almaVendFicha')?.scrollIntoView({behavior:'smooth',block:'start'})};
function almaVendFicha(n){const el=$('almaVendFicha');if(!el)return;const rec=almaRateRec(n),f=rec?.ficha||{},r=almaRates(n),mes=almaVendMes(),bs=almaVendVentas(n,mes),com=almaVendCom(n,mes);
 const fila=(k,v)=>'<div class="alma-ff"><span>'+k+'</span><b>'+(v?esc(v):'—')+'</b></div>';
 const meses=[];{const d=new Date(mes+'-01T12:00:00');for(let i=5;i>=0;i--){const x=new Date(d);x.setMonth(d.getMonth()-i);meses.push(x.toISOString().slice(0,7))}}
 const pays=state.commissionPayouts.filter(p=>p.seller===n);
 let h='<div class="panelhead"><h2>'+esc(n)+'</h2><div class="actionset"><button class="btn ghost tiny" type="button" onclick="almaVendEditar(&quot;'+esc(n)+'&quot;)">✎ Editar datos</button><button class="btn ghost tiny" type="button" onclick="window.__almaVendSel=null;$(\'almaVendFicha\').style.display=\'none\';almaVendRender()">Cerrar</button></div></div>';
 h+='<h3 class="alma-vh">Datos del vendedor</h3><div class="alma-ficha-grid">'+fila('DNI',f.dni)+fila('CUIL',f.cuil)+fila('Fecha de nacimiento',f.birth?fmt(f.birth):'')+fila('Teléfono',f.phone)+fila('Email',f.email)+fila('Dirección',f.address)+fila('Oficina',f.office)+fila('Fecha de ingreso',f.since?fmt(f.since):'')+fila('CBU / alias para pagos',f.cbu)+'</div>'+(f.notes?'<p class="hint" style="margin-top:8px">'+esc(f.notes)+'</p>':'');
 h+='<h3 class="alma-vh">Comisión</h3><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">Nacional <input data-rnac="'+esc(n)+'" type="number" min="0" max="100" step="0.5" value="'+(r.nac||'')+'" placeholder="%" style="max-width:90px"> % · Internacional <input data-rint="'+esc(n)+'" type="number" min="0" max="100" step="0.5" value="'+(r.int||'')+'" placeholder="%" style="max-width:90px"> % <button type="button" class="btn ghost tiny" onclick="almaRateGuardar(&quot;'+esc(n)+'&quot;)">Guardar</button></div>';
 h+='<h3 class="alma-vh">Ventas de '+esc(mes)+' ('+bs.length+')</h3>'+(bs.length?'<div class="tablewrap"><table class="table"><thead><tr><th>File</th><th>Pasajero / viaje</th><th>Tipo</th><th style="text-align:right">Vendido</th><th style="text-align:right">Cobrado</th></tr></thead><tbody>'+bs.map(b=>'<tr><td><b>'+esc(bookingFile(b)||'—')+'</b></td><td>'+esc(b.client)+'<span class="sub">'+esc(trip(b))+'</span></td><td>'+(almaAmbito(b)||'Sin indicar')+'</td><td style="text-align:right">'+money(total(b),cur(b))+'</td><td style="text-align:right">'+money(paid(b),cur(b))+'</td></tr>').join('')+'</tbody></table></div>':'<p class="empty">Sin ventas en este mes.</p>');
 h+='<h3 class="alma-vh">Comisión de '+esc(mes)+'</h3>'+(com.length?com.map(x=>'<p><b>'+money(x.amount,x.c)+'</b> · '+x.files.length+' file/s'+(x.bono.amount?' · incluye extra '+money(x.bono.amount,x.c)+(x.bono.reason?' ('+esc(x.bono.reason)+')':''):'')+(x.paid?' <span class="tag green">PAGADA '+fmt(x.paid.paidDate)+'</span>':' <span class="tag">Pendiente</span>')+'</p>').join('')+'<p class="hint">Para liquidar, usá «Comisiones a liquidar» más abajo.</p>':'<p class="empty">Sin comisión este mes.</p>');
 h+='<h3 class="alma-vh">Últimos 6 meses</h3><div class="tablewrap"><table class="table"><thead><tr><th>Mes</th><th>Files</th><th>Nac.</th><th>Int.</th><th style="text-align:right">Vendido</th><th style="text-align:right">Comisión</th></tr></thead><tbody>'
  +meses.map(m=>{const l=almaVendVentas(n,m),c=almaVendCom(n,m);return '<tr><td>'+m+'</td><td>'+l.length+'</td><td>'+l.filter(b=>almaAmbito(b)==='Nacional').length+'</td><td>'+l.filter(b=>almaAmbito(b)==='Internacional').length+'</td><td style="text-align:right">'+almaPorMoneda(l,b=>total(b))+'</td><td style="text-align:right">'+(c.length?c.map(x=>money(x.amount,x.c)).join(' · '):'—')+'</td></tr>'}).join('')+'</tbody></table></div>';
 h+='<h3 class="alma-vh">Liquidaciones pagadas</h3>'+(pays.length?'<div class="tablewrap"><table class="table"><thead><tr><th>Mes</th><th>Pagada</th><th>Por</th><th style="text-align:right">Importe</th></tr></thead><tbody>'+pays.map(p=>'<tr><td>'+esc(p.month)+'</td><td>'+fmt(p.paidDate)+'</td><td>'+esc(p.paidBy||'—')+'</td><td style="text-align:right"><b>'+money(p.amount,p.currency)+'</b></td></tr>').join('')+'</tbody></table></div>':'<p class="empty">Todavía no hay liquidaciones.</p>');
 el.innerHTML=h;el.style.display=''}
window.almaVendNuevo=()=>{if(!adminOnly())return;const n=(prompt('Nombre y apellido del vendedor:')||'').replace(/\s+/g,' ').trim();if(!n)return;
 if(sellerNames().some(x=>x.toLowerCase()===n.toLowerCase()))return alert('Ese vendedor ya está en la lista.');state.commissionRates.push({id:uid(),seller:n,percent:0,ficha:{}});audit('Vendedor agregado','Vendedores',n);save();window.__almaVendSel=n;render();almaVendEditar(n)};
window.almaVendEditar=n=>{if(!adminOnly())return;let d=$('almaVendDialog');const F=[['dni','DNI'],['cuil','CUIL'],['birth','Fecha de nacimiento','date'],['phone','Teléfono'],['email','Email','email'],['address','Dirección'],['since','Fecha de ingreso','date'],['cbu','CBU / alias para pagos']];
 if(!d){d=document.createElement('dialog');d.id='almaVendDialog';d.className='dialog';
  d.innerHTML='<form id="almaVendForm"><div class="modalhead"><h2 id="almaVendTit">Ficha del vendedor</h2></div><div class="modalbody"><div class="formgrid">'+F.map(([k,t,ty])=>'<label class="field">'+t+'<input name="'+k+'" type="'+(ty||'text')+'"></label>').join('')
   +'<label class="field">Oficina<select name="office"><option value="">—</option><option>Centro</option><option>Gaona</option></select></label><label class="field full">Notas<textarea name="notes" rows="2"></textarea></label></div></div><div class="modalfoot"><button type="button" class="btn ghost" onclick="closeDialog(\'almaVendDialog\')">Cancelar</button><button class="btn" type="submit">Guardar ficha</button></div></form>';
  document.body.appendChild(d);
  d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const s=d.dataset.seller,fm=e.target;let r=almaRateRec(s);if(!r){r={id:uid(),seller:s,percent:0};state.commissionRates.push(r)}
   const x={};for(const el of fm.elements)if(el.name)x[el.name]=String(el.value||'').trim();r.ficha=x;audit('Ficha de vendedor','Vendedores',s);save();closeDialog('almaVendDialog');window.__almaVendSel=s;render();notify('Ficha de '+s+' guardada')})}
 d.dataset.seller=n;$('almaVendTit').textContent='Ficha de '+n;const f=almaRateRec(n)?.ficha||{},fm=d.querySelector('form');fm.reset();for(const el of fm.elements)if(el.name)el.value=f[el.name]||'';openDlg('almaVendDialog')};
{const o=renderCommissions;renderCommissions=(...a)=>{const r=o(...a);almaVendRender();return r};window.renderCommissions=renderCommissions}

// ── Base de pasajeros: teléfono editable directo en la lista ──
function almaTelCelda(p){const id=esc(p.id);
 const inp='<span class="alma-telin" id="almaTelIn'+id+'"'+(p.phone?' style="display:none"':'')+'><input type="tel" value="'+esc(p.phone||'')+'" placeholder="+ Agregar teléfono" onkeydown="if(event.key===\'Enter\'){event.preventDefault();almaTelGuardar(&quot;'+id+'&quot;)}if(event.key===\'Escape\')almaTelCancelar(&quot;'+id+'&quot;)"><button type="button" class="btn tiny" onclick="almaTelGuardar(&quot;'+id+'&quot;)">Guardar</button></span>';
 return p.phone?'<span id="almaTelTx'+id+'">'+esc(p.phone)+' <button type="button" class="btn ghost tiny" title="Corregir teléfono" onclick="almaTelEditar(&quot;'+id+'&quot;)">✎</button></span>'+inp:inp}
window.almaTelEditar=id=>{const t=$('almaTelTx'+id),i=$('almaTelIn'+id);if(t)t.style.display='none';if(i){i.style.display='';i.querySelector('input').focus()}};
window.almaTelCancelar=id=>{renderPassengersDirectory()};
window.almaTelGuardar=id=>{const p=state.passengers.find(x=>x.id===id),inp=$('almaTelIn'+id)?.querySelector('input');if(!p||!inp)return;const v=inp.value.replace(/\s+/g,' ').trim();
 if(v===(p.phone||''))return renderPassengersDirectory();
 if(v){const r=almaTelRepetidos(v,id);if(r.length&&!confirm('El teléfono '+v+' ya está cargado en la ficha de:\n• '+r.map(q=>q.name).join('\n• ')+'\n\n¿Guardarlo igual en '+p.name+'?'))return}
 const antes=p.phone||'';p.phone=v;for(const b of state.bookings.filter(b=>b.passengerId===p.id))b.phone=v;
 audit(antes?'Teléfono modificado':'Teléfono agregado','Pasajero',p.name+' · '+(antes?antes+' → ':'')+(v||'(vacío)'));save();renderPassengersDirectory();notify('Teléfono de '+p.name+' guardado')};

// ── Caja: «Pago a proveedores» se registra desde el compromiso (así impacta en el proveedor y en el file) ──
window.almaCashProvAviso=()=>{const sel=$('cashMovementCategory');if(!sel)return;let el=$('almaCashProv');
 if(!el){el=document.createElement('div');el.id='almaCashProv';el.className='alma-aviso';sel.closest('label')?.insertAdjacentElement('afterend',el)}
 const on=sel.value==='Pago a proveedores';el.style.display=on?'':'none';
 el.innerHTML=on?'<b>Los pagos a proveedores se registran desde su compromiso.</b> Así se descuentan de lo que se le debe al proveedor y del file, y salen de esta caja igual (si es en efectivo).<div style="margin-top:8px"><button type="button" class="btn tiny" onclick="closeDialog(\'cashMovementDialog\');openSupplierPayment()">Registrar pago a proveedor</button></div>':'';
 const sb=$('cashMovementSubmit');if(sb)sb.disabled=on};
$('cashMovementCategory')?.addEventListener('change',almaCashProvAviso);
{const o=window.syncCashCategories;window.syncCashCategories=(...a)=>{const r=o(...a);almaCashProvAviso();return r}}
{const o=window.openCashMovement;if(o)window.openCashMovement=(...a)=>{const r=o(...a);almaCashProvAviso();return r}}
$('cashMovementForm')?.addEventListener('submit',e=>{if($('cashMovementCategory')?.value==='Pago a proveedores'&&!e.target.elements.editId?.value){e.preventDefault();e.stopImmediatePropagation();alert('Registrá el pago desde «Registrar pago a proveedor», así impacta en el proveedor y en el file.')}},true);

// ── Cumpleaños de pasajeros: aviso arriba de todas las pantallas (hoy y próximos 7 días) ──
function almaCumples(dias){const hoy=new Date();hoy.setHours(12,0,0,0);const out=[];
 for(const p of state.passengers){const bd=String(p.birthDate||'');const m=bd.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)continue;
  for(let d=0;d<=dias;d++){const f=new Date(hoy);f.setDate(hoy.getDate()+d);let mm=+m[2],dd=+m[3];
   if(mm===2&&dd===29&&!(new Date(f.getFullYear(),1,29).getMonth()===1))dd=28;
   if(f.getMonth()+1===mm&&f.getDate()===dd){out.push({p,d,edad:f.getFullYear()-(+m[1]),fecha:f});break}}}
 return out.sort((a,b)=>a.d-b.d||a.p.name.localeCompare(b.p.name,'es-AR'))}
function almaWaNum(t){let d=String(t||'').replace(/\D/g,'');if(!d)return '';if(d.startsWith('00'))d=d.slice(2);if(d.startsWith('54'))return d.startsWith('549')?d:'549'+d.slice(2);if(d.startsWith('0'))d=d.slice(1);if(d.length===10)return '549'+d;return d}
function almaCumpleBanner(){const head=document.querySelector('.main > .head')||document.querySelector('.head');if(!head)return;let el=$('almaCumple');
 if(!el){el=document.createElement('div');el.id='almaCumple';el.className='alma-cumple';head.insertAdjacentElement('afterend',el)}
 const key='almaCumpleOculto',hoyIso=today();let oculto='';try{oculto=localStorage.getItem(key)||''}catch(e){}
 const ls=almaCumples(7),hoy=ls.filter(x=>x.d===0),prox=ls.filter(x=>x.d>0);
 if(!ls.length||oculto===hoyIso){el.style.display='none';return}
 const sk='almaSaludados-'+hoyIso;let sal=[];try{sal=JSON.parse(localStorage.getItem(sk)||'[]')}catch(e){}
 const wa=x=>{const n=almaWaNum(x.p.phone);if(!n)return ' <span class="sub" style="display:inline;color:#aa431d">sin teléfono cargado</span>';const ok=sal.includes(x.p.id);const txt=encodeURIComponent('¡Feliz cumpleaños, '+x.p.name.split(' ')[0]+'! 🎉 Te saludamos con mucho cariño desde Alma Viajera Turismo.');return ' <a class="alma-cumple-wa'+(ok?' alma-saludado':'')+'" href="https://wa.me/'+n+'?text='+txt+'" target="_blank" rel="noopener" title="Saludar por WhatsApp" onclick="almaSaludado(&quot;'+esc(x.p.id)+'&quot;,this)">'+(ok?'✓ Saludado':'💬 Saludar')+'</a>'};
 const nom=x=>'<button type="button" class="textlink" onclick="openPassengerProfile(&quot;'+esc(x.p.id)+'&quot;)">'+esc(x.p.name)+'</button> <span class="sub" style="display:inline">('+x.edad+')</span>';
 const dia=x=>x.d===1?'mañana':x.fecha.toLocaleDateString('es-AR',{weekday:'short',day:'2-digit',month:'2-digit'});
 el.innerHTML='<span class="alma-cumple-ic">🎂</span><div class="alma-cumple-txt">'
  +(hoy.length?'<b>Hoy cumple'+(hoy.length>1?'n':'')+' años:</b>'+hoy.map(x=>'<div class="alma-cumple-hoy">'+nom(x)+wa(x)+'</div>').join(''):'<b>Hoy no hay cumpleaños.</b>')
  +(prox.length?'<details><summary>Próximos 7 días ('+prox.length+')</summary>'+prox.map(x=>'<div>'+esc(dia(x))+' · '+nom(x)+'</div>').join('')+'</details>':'')
  +'</div><button type="button" class="alma-cumple-x" title="Ocultar por hoy" onclick="try{localStorage.setItem(\'almaCumpleOculto\',\''+hoyIso+'\')}catch(e){};document.getElementById(\'almaCumple\').style.display=\'none\'">✕</button>';
 el.style.display=''}
window.almaSaludado=(id,a)=>{const sk='almaSaludados-'+today();let sal=[];try{sal=JSON.parse(localStorage.getItem(sk)||'[]')}catch(e){}if(!sal.includes(id))sal.push(id);try{localStorage.setItem(sk,JSON.stringify(sal))}catch(e){}setTimeout(()=>{a.classList.add('alma-saludado');a.textContent='✓ Saludado'},300)};
{const o=render;render=(...a)=>{const r=o(...a);try{almaCumpleBanner()}catch(e){}return r}}

// ── Finanzas: probar el aviso por mail de cobros (solo socios) ──
{const d=document.querySelector('#tesoreria > .description');if(d&&!$('almaAvisoMailBtn'))d.insertAdjacentHTML('afterend','<div id="almaAvisoMailBtn" class="hint" style="margin:-4px 0 14px">📧 Cada cobro que se registra (o se anula) se avisa por mail a los socios desde info@almaviajeraturismo.com. <button type="button" class="btn ghost tiny" onclick="almaProbarAvisoMail()">Enviar mail de prueba</button></div>')}

// ── Finanzas: gastos de la agencia pagados por los socios y su reintegro ──
const ALMA_SOCIOS=['Hernan Ruiz','Diego Ruiz','Adriel Tuyarot','Sandro Cobas'];
const ALMA_GS_CATS=['Oficina (alquiler y expensas)','Servicios (luz, agua, internet)','Limpieza','Insumos y almacén','Web, dominio y correo','Sistemas y suscripciones','Sociedad y bancos','Equipamiento','Movilidad','Otros'];
const ALMA_GS_ORIG=[['centro','Caja Centro · efectivo'],['gaona','Caja Gaona · efectivo'],['bbva','BBVA · transferencia'],['capital','Aporte de capital (no se devuelve)']];
function almaSocios(){const p=Array.isArray(window.__ALMA_PERSONAL__)?window.__ALMA_PERSONAL__.filter(x=>x.rol==='socio').map(x=>x.nombre):[];return p.length?p:ALMA_SOCIOS}
function almaGsPartes(g){const ps=g.payers||[];return ps.map(p=>({socio:p.socio,monto:Math.round(Number(g.amount||0)*Number(p.pct||0))/100}))}
function almaGsDevuelto(g,socio){return (state.partnerRefunds||[]).filter(r=>r.expenseId===g.id&&(!socio||r.partner===socio)).reduce((n,r)=>n+Number(r.amount||0),0)}
function almaGsPend(g,socio){if(socio){const p=almaGsPartes(g).find(x=>x.socio===socio);return p?Math.max(0,Math.round((p.monto-almaGsDevuelto(g,socio))*100)/100):0}return Math.max(0,Math.round((Number(g.amount||0)-almaGsDevuelto(g))*100)/100)}
function almaGsEstado(g){const d=almaGsDevuelto(g);return d<=0.009?'Pendiente':almaGsPend(g)<=0.009?((state.partnerRefunds||[]).filter(r=>r.expenseId===g.id).every(r=>r.kind==='capital')?'Capital':'Reintegrado'):'Parcial'}
function almaGsNombre(g){const ps=g.payers||[];return ps.map(p=>p.socio.split(' ')[0]+(ps.length>1?' '+String(p.pct).replace('.',',')+' %':'')).join(' · ')}
window.__almaGsF={q:'',est:'pend',socio:''};
function almaGsPanel(){if(!adminView())return;state.partnerExpenses||=[];state.partnerRefunds||=[];
 let el=$('almaGsPanel');const tes=$('tesoreria');if(!tes)return;
 if(!el){el=document.createElement('div');el.className='panel';el.id='almaGsPanel';const first=tes.querySelector('.panel');(first?first:tes.firstElementChild).insertAdjacentElement('afterend',el)}
 const F=window.__almaGsF,gs=state.partnerExpenses.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const deuda={};for(const g of gs)for(const p of almaGsPartes(g)){const k=p.socio+'|'+(g.currency||'ARS');deuda[k]=(deuda[k]||0)+almaGsPend(g,p.socio)}
 const cards=Object.entries(deuda).filter(([,v])=>v>0.009).sort().map(([k,v])=>{const [s,c]=k.split('|');return '<div class="metric" style="cursor:pointer" title="Ver sus gastos" onclick="window.__almaGsF.socio=&quot;'+esc(s)+'&quot;;window.__almaGsF.est=&quot;pend&quot;;almaGsPanel()"><small>Le debemos a '+esc(s.split(' ')[0])+'</small><strong>'+money(v,c)+'</strong></div>'}).join('');
 const tot={};for(const [k,v] of Object.entries(deuda)){const c=k.split('|')[1];tot[c]=(tot[c]||0)+v}
 const ls=gs.filter(g=>{const e=almaGsEstado(g);if(F.est==='pend'&&!(e==='Pendiente'||e==='Parcial'))return false;if(F.est==='ok'&&(e==='Pendiente'||e==='Parcial'))return false;if(F.socio&&!(g.payers||[]).some(p=>p.socio===F.socio))return false;if(F.q&&!(g.description+' '+(g.receipt||'')+' '+(g.category||'')).toLowerCase().includes(F.q.toLowerCase()))return false;return true});
 el.innerHTML='<div class="panelhead"><h2>Gastos adelantados por socios</h2><div class="actionset"><button class="btn" type="button" onclick="almaGsForm()">+ Cargar gasto</button></div></div>'
  +'<p class="hint">Gastos de la agencia que pagó algún socio de su bolsillo. Quedan como deuda de la agencia con ese socio hasta que se le reintegran (de una caja o del BBVA) o se toman como aporte de capital.</p>'
  +(cards?'<div class="fin-metrics">'+cards+'</div><p class="sub" style="margin:4px 0 10px">Total que la agencia debe a socios: <b>'+Object.entries(tot).filter(([,v])=>v>0.009).map(([c,v])=>money(v,c)).join(' · ')+'</b></p>':'<p class="sub">La agencia no tiene deudas pendientes con los socios.</p>')
  +'<div class="formgrid" style="margin:8px 0"><label class="field">Buscar<input id="almaGsQ" value="'+esc(F.q)+'" placeholder="Descripción, comprobante o categoría" oninput="window.__almaGsF.q=this.value;clearTimeout(window.__almaGsT);window.__almaGsT=setTimeout(()=>{almaGsPanel();const i=$(\'almaGsQ\');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)"></label>'
  +'<label class="field">Estado<select onchange="window.__almaGsF.est=this.value;almaGsPanel()"><option value="pend"'+(F.est==='pend'?' selected':'')+'>Pendientes de reintegro</option><option value="ok"'+(F.est==='ok'?' selected':'')+'>Reintegrados / capital</option><option value="todos"'+(F.est==='todos'?' selected':'')+'>Todos</option></select></label>'
  +'<label class="field">Pagado por<select onchange="window.__almaGsF.socio=this.value;almaGsPanel()"><option value="">Todos los socios</option>'+almaSocios().map(s=>'<option'+(s===F.socio?' selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label></div>'
  +(ls.length?'<div class="tablewrap"><table class="table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Pagado por</th><th style="text-align:right">Importe</th><th style="text-align:right">Pendiente</th><th>Estado</th><th></th></tr></thead><tbody>'
   +ls.map(g=>{const e=almaGsEstado(g),p=almaGsPend(g);return '<tr><td>'+fmt(g.date)+(g.dueDate?'<span class="sub">vence '+fmt(g.dueDate)+'</span>':'')+'</td><td><b>'+esc(g.description)+'</b><span class="sub">'+esc([g.category,g.receipt?'Comp. '+g.receipt:''].filter(Boolean).join(' · '))+'</span></td><td>'+esc(almaGsNombre(g))+'</td><td style="text-align:right;white-space:nowrap">'+money(g.amount,g.currency)+'</td><td style="text-align:right;white-space:nowrap"><b>'+(p>0.009?money(p,g.currency):'—')+'</b></td><td><span class="tag '+(e==='Pendiente'?'orange':e==='Parcial'?'':'green')+'">'+e+'</span></td>'
    +'<td style="white-space:nowrap">'+(p>0.009?'<button class="btn tiny" type="button" onclick="almaGsReintegrar(&quot;'+g.id+'&quot;)">Reintegrar</button> ':'')+'<button class="btn ghost tiny" type="button" onclick="almaGsForm(&quot;'+g.id+'&quot;)">✎</button></td></tr>'}).join('')+'</tbody></table></div>':'<p class="empty">No hay gastos con ese filtro.</p>');
}
window.almaGsPanel=almaGsPanel;
function almaGsDlg(id,titulo,cuerpo,onOk,okTxt){let d=$(id);if(!d){d=document.createElement('dialog');d.id=id;d.className='dialog';document.body.appendChild(d)}
 d.innerHTML='<form><div class="modalhead"><h2>'+titulo+'</h2></div><div class="modalbody">'+cuerpo+'</div><div class="modalfoot"><button type="button" class="btn ghost" data-x>Cancelar</button><button class="btn" type="submit">'+(okTxt||'Guardar')+'</button></div></form>';
 d.querySelector('[data-x]').onclick=()=>closeDialog(id);d.querySelector('form').onsubmit=e=>{e.preventDefault();onOk(e.target)};openDlg(id);return d}
window.almaGsForm=id=>{if(!adminOnly())return;state.partnerExpenses||=[];const g=id?state.partnerExpenses.find(x=>x.id===id):null,v=g||{date:today(),currency:'ARS',payers:[{socio:currentDemoOperator(),pct:100}]};
 const ref=g?(state.partnerRefunds||[]).filter(r=>r.expenseId===g.id):[];
 const socios=almaSocios(),pct=s=>(v.payers||[]).find(p=>p.socio===s)?.pct;
 const d=almaGsDlg('almaGsDialog',g?'Editar gasto adelantado':'Cargar gasto adelantado por socios',
  '<div class="formgrid"><label class="field">Fecha<input name="date" type="date" required value="'+esc(v.date||'')+'"></label><label class="field">Comprobante / factura<input name="receipt" value="'+esc(v.receipt||'')+'"></label>'
  +'<label class="field full">Descripción<input name="description" required value="'+esc(v.description||'')+'"></label>'
  +'<label class="field">Categoría<input name="category" list="almaGsCats" value="'+esc(v.category||'')+'"><datalist id="almaGsCats">'+ALMA_GS_CATS.map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist></label><label class="field">Vencimiento<input name="dueDate" type="date" value="'+esc(v.dueDate||'')+'"></label>'
  +'<label class="field">Importe<input name="amount" required inputmode="decimal" value="'+(v.amount??'')+'" '+(ref.length?'readonly title="Ya tiene reintegros"':'')+'></label><label class="field">Moneda<select name="currency" '+(ref.length?'disabled':'')+'>'+['ARS','USD'].map(c=>'<option'+(c===v.currency?' selected':'')+'>'+c+'</option>').join('')+'</select></label>'
  +'<div class="field full"><b>¿Quién lo pagó?</b><span class="sub">Marcá los socios y qué parte puso cada uno (se reparte en partes iguales al marcar).</span>'
  +socios.map(s=>'<label style="display:flex;gap:8px;align-items:center;margin-top:6px;font-weight:400"><input type="checkbox" data-soc="'+esc(s)+'"'+(pct(s)!=null?' checked':'')+(ref.length?' disabled':'')+'> <span style="min-width:140px">'+esc(s)+'</span><input data-pct="'+esc(s)+'" type="number" step="0.01" min="0" max="100" value="'+(pct(s)??'')+'" style="max-width:90px"'+(ref.length?' disabled':'')+'> %</label>').join('')+'</div>'
  +'<label class="field full">Notas<textarea name="notes" rows="2">'+esc(v.notes||'')+'</textarea></label>'
  +(ref.length?'<div class="full"><b>Reintegros</b>'+ref.map(r=>'<div class="sub">'+fmt(r.date)+' · '+esc(r.partner)+' · '+money(r.amount,r.currency)+' · '+esc(r.kind==='capital'?'aporte de capital':(ALMA_GS_ORIG.find(o=>o[0]===r.source)?.[1]||r.source))+'</div>').join('')+'<span class="sub">Con reintegros cargados no se puede cambiar el importe ni quién lo pagó.</span></div>':'')
  +(g&&!ref.length?'<div class="full"><button type="button" class="btn ghost tiny" style="color:#b42318" onclick="almaGsBorrar(&quot;'+g.id+'&quot;)">Eliminar gasto</button></div>':'')+'</div>',
  f=>{const amt=parseMoneyInput(f.amount.value);if(!(amt>0))return alert('Poné un importe válido');
   const payers=ref.length?(g.payers||[]):[...f.querySelectorAll('[data-soc]')].filter(c=>c.checked).map(c=>({socio:c.dataset.soc,pct:Number(f.querySelector('[data-pct="'+CSS.escape(c.dataset.soc)+'"]').value||0)}));
   if(!payers.length)return alert('Marcá quién lo pagó');const sum=payers.reduce((n,p)=>n+p.pct,0);if(Math.abs(sum-100)>0.05)return alert('Las partes tienen que sumar 100 % (ahora suman '+sum+' %)');
   const x={date:f.date.value,receipt:f.receipt.value.trim(),description:f.description.value.trim(),category:f.category.value.trim(),dueDate:f.dueDate.value||'',amount:ref.length?g.amount:amt,currency:ref.length?g.currency:f.currency.value,payers,notes:f.notes.value.trim()};
   if(g){Object.assign(g,x);audit('Gasto de socio modificado','Finanzas',x.description+' · '+money(x.amount,x.currency))}else{state.partnerExpenses.push({id:uid(),...x,recordedBy:currentDemoOperator()});audit('Gasto de socio cargado','Finanzas',x.description+' · '+money(x.amount,x.currency)+' · '+almaGsNombre(x))}
   save();closeDialog('almaGsDialog');render();notify('Gasto guardado')});
 const cbs=[...d.querySelectorAll('[data-soc]')];cbs.forEach(c=>c.onchange=()=>{const on=cbs.filter(x=>x.checked);const each=on.length?Math.round(10000/on.length)/100:0;cbs.forEach(x=>{const i=d.querySelector('[data-pct="'+CSS.escape(x.dataset.soc)+'"]');i.value=x.checked?each:''});if(on.length){const last=d.querySelector('[data-pct="'+CSS.escape(on[on.length-1].dataset.soc)+'"]');last.value=Math.round((100-each*(on.length-1))*100)/100}})};
window.almaGsBorrar=id=>{const g=state.partnerExpenses.find(x=>x.id===id);if(!g||!adminOnly())return;if(!requireKeyword('ELIMINAR','Eliminar gasto de socio',g.description+' · '+money(g.amount,g.currency)))return;
 state.partnerExpenses=state.partnerExpenses.filter(x=>x.id!==id);audit('Gasto de socio eliminado','Finanzas',g.description+' · '+money(g.amount,g.currency));save();closeDialog('almaGsDialog');render()};
window.almaGsReintegrar=id=>{if(!adminOnly())return;const g=state.partnerExpenses.find(x=>x.id===id);if(!g)return;const ps=almaGsPartes(g).filter(p=>almaGsPend(g,p.socio)>0.009);
 almaGsDlg('almaGsReDialog','Reintegrar · '+esc(g.description),
  '<p class="hint">Importe total '+money(g.amount,g.currency)+'. Poné cuánto se le devuelve a cada socio (0 si a alguno no).</p><div class="formgrid">'
  +ps.map(p=>'<label class="field">'+esc(p.socio)+' <span class="sub" style="display:inline">(pendiente '+money(almaGsPend(g,p.socio),g.currency)+')</span><input data-re="'+esc(p.socio)+'" inputmode="decimal" value="'+almaGsPend(g,p.socio)+'"></label>').join('')
  +'<label class="field">Fecha<input name="date" type="date" value="'+today()+'" required></label><label class="field">¿De dónde sale la plata?<select name="source">'+ALMA_GS_ORIG.map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join('')+'</select></label></div>'
  +'<p class="sub">Si sale de una caja o del BBVA, se registra solo como egreso «Reintegro a socio» en ese lugar. «Aporte de capital» no mueve plata: el socio deja ese dinero en la agencia.</p>',
  f=>{const src=f.source.value,date=f.date.value,items=ps.map(p=>({socio:p.socio,monto:parseMoneyInput(f.querySelector('[data-re="'+CSS.escape(p.socio)+'"]').value||0)})).filter(i=>i.monto>0);
   if(!items.length)return alert('Poné algún importe');for(const i of items){const pend=almaGsPend(g,i.socio);if(i.monto>pend+0.009)return alert('A '+i.socio+' se le deben '+money(pend,g.currency)+'; no se puede reintegrar más.')}
   const tot=items.reduce((n,i)=>n+i.monto,0),origen=ALMA_GS_ORIG.find(o=>o[0]===src)[1];
   if(!confirm('Registrar '+(src==='capital'?'como aporte de capital ':'reintegro ')+money(tot,g.currency)+' ('+items.map(i=>i.socio.split(' ')[0]+' '+money(i.monto,g.currency)).join(', ')+')'+(src==='capital'?'':' desde '+origen)+'?'))return;
   state.partnerRefunds||=[];const now=new Date().toISOString();
   for(const i of items){state.partnerRefunds.push({id:uid(),expenseId:g.id,partner:i.socio,amount:i.monto,currency:g.currency,date,source:src,kind:src==='capital'?'capital':'reintegro',recordedBy:currentDemoOperator()});
    if(src!=='capital')state.cashMovements.unshift({id:uid(),cashbox:src==='gaona'?'policlinico':'centro',type:'gasto',category:'Reintegro a socio',currency:g.currency,amount:i.monto,date,method:src==='bbva'?'Transferencia':'Efectivo',reference:i.socio,notes:'Reintegro de gasto adelantado: '+g.description+(g.receipt?' (comp. '+g.receipt+')':''),recordedBy:currentDemoOperator(),recordedAt:now})}
   audit(src==='capital'?'Aporte de capital de socio':'Reintegro a socio','Finanzas',g.description+' · '+items.map(i=>i.socio+' '+money(i.monto,g.currency)).join(', ')+(src==='capital'?'':' · '+origen));
   save();closeDialog('almaGsReDialog');render();notify(src==='capital'?'Registrado como aporte de capital':'Reintegro registrado')},'Registrar')};
{const o=render;render=(...a)=>{const r=o(...a);try{almaGsPanel()}catch(e){console.error(e)}return r}}
{const q=document.querySelector('#tesoreria .quick:last-of-type')?.parentElement;if(q&&!$('almaGsQuick'))q.insertAdjacentHTML('beforeend','<button class="quick" id="almaGsQuick" onclick="document.getElementById(\'almaGsPanel\')?.scrollIntoView({behavior:\'smooth\'})"><b>👥 &nbsp; Gastos de socios</b><small>Lo que pagaron los socios de su bolsillo y su reintegro.</small></button>')}

// ── Proveedores: adjuntar el recibo de cada pago (se guarda en «comprobantes/prov-<pago>») ──
function almaProvRecibos(sp){const rs=sp.receipts||[];
 return rs.map((n,i)=>'<a href="#" onclick="event.preventDefault();almaComprobantes.abrir(&quot;prov-'+sp.id+'&quot;,&quot;'+esc(n)+'&quot;)">📄 Recibo'+(rs.length>1?' '+(i+1):'')+'</a>').join('<br>')
  +(rs.length?'<br>':'')+'<label class="btn ghost tiny" style="cursor:pointer;margin-top:3px">📎 '+(rs.length?'Otro':'Adjuntar')+'<input type="file" accept="image/*,application/pdf" hidden onchange="almaProvSubir(&quot;'+sp.id+'&quot;,this)"></label>'}
window.almaProvRecibos=almaProvRecibos;
async function almaProvGuardarRecibo(sp,file){const name=await window.almaComprobantes.subir('prov-'+sp.id,file);sp.receipts=[...(sp.receipts||[]),name];
 const e=state.expenses.find(x=>x.id===sp.expenseId);audit('Recibo de pago a proveedor','Finanzas',(e?.concept||'Pago')+' · '+money(sp.amount,e?.currency||'USD'));save();return name}
window.almaProvSubir=async(id,inp)=>{const file=inp.files?.[0];inp.value='';const sp=state.supplierPayments.find(x=>x.id===id);if(!file||!sp)return;const cell=$('almaPR'+id);if(cell)cell.innerHTML='<span class="sub">Subiendo…</span>';
 try{await almaProvGuardarRecibo(sp,file);notify('Recibo adjuntado')}catch(e){alert('No se pudo subir el recibo: '+e.message)}const c2=$('almaPR'+id);if(c2)c2.innerHTML=almaProvRecibos(sp)};
{const o=window.commitSupplierPayment;window.commitSupplierPayment=(...a)=>{const antes=new Set(state.supplierPayments.map(x=>x.id)),inp=$('almaProvRecibo'),file=inp?.files?.[0];const r=o(...a);
 const nuevo=state.supplierPayments.find(x=>!antes.has(x.id));if(nuevo&&file){inp.value='';almaProvGuardarRecibo(nuevo,file).then(()=>notify('Pago registrado con su recibo')).catch(e=>alert('El pago se registró, pero no se pudo subir el recibo: '+e.message+'. Podés adjuntarlo desde la cuenta del proveedor.'))}
 return r}}
{const o=window.openSupplierPayment;if(o)window.openSupplierPayment=(...a)=>{const r=o(...a);const i=$('almaProvRecibo');if(i)i.value='';return r}}

/* ---------- Recibo: ORIGINAL + DUPLICADO en la misma hoja A4, y envío por mail al pasajero desde info@ ---------- */
function almaRecDuplicar(){const r=$('receiptPaper');if(!r)return;
 r.querySelectorAll('.alma-copia').forEach(x=>x.remove());document.querySelectorAll('#almaRecDup,.alma-corte').forEach(x=>x.remove());
 if(!r.innerHTML.trim())return;
 const lab=t=>{const d=document.createElement('div');d.className='alma-copia';d.textContent=t;return d};
 const d=r.cloneNode(true);d.id='almaRecDup';r.prepend(lab('ORIGINAL · PASAJERO'));d.prepend(lab('DUPLICADO · ALMA VIAJERA'));
 const c=document.createElement('div');c.className='alma-corte';c.innerHTML='<span>✂ cortar por aquí</span>';r.after(c);c.after(d)}
window.addEventListener('beforeprint',()=>{if($('receiptDialog')?.open&&!document.body.classList.contains('print-report'))almaRecDuplicar()});
{const o=window.print.bind(window);window.print=()=>{if($('receiptDialog')?.open&&!document.body.classList.contains('print-report'))almaRecDuplicar();o()}}
function almaRecEmail(p){const b=findBooking(p.bookingId),ps=state.passengers;
 const quien=(p.forPassengerId&&ps.find(x=>x.id===p.forPassengerId))||(b&&ps.find(x=>x.id===b.passengerId));
 return String(quien?.email||b?.email||'').trim()}
function almaRecTexto(p){const b=findBooking(p.bookingId),n=p.forPassengerName||p.snapshot?.client||b?.client||'';
 return{subject:'Alma Viajera Turismo · Recibo '+p.number,
  body:'Hola'+(n?' '+n:'')+':\n\nTe enviamos adjunto el recibo '+p.number+' correspondiente a tu pago.\n\nAnte cualquier consulta, respondé este correo.\n\nSaludos,\nAlma Viajera Turismo\ninfo@almaviajeraturismo.com · +54 9 11 2671-3436'}}
const ALMA_H2C='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',ALMA_JSPDF='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
function almaJs(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ko(new Error('no se pudo cargar el generador de PDF (revisá la conexión)'));document.head.appendChild(s)})}
async function almaReciboPdf(){
 if(!window.html2canvas)await almaJs(ALMA_H2C);if(!window.jspdf)await almaJs(ALMA_JSPDF);
 const box=document.createElement('div');box.style.cssText='position:fixed;left:-12000px;top:0;width:820px;background:#fff';
 const c=$('receiptPaper').cloneNode(true);c.removeAttribute('id');c.querySelectorAll('.alma-copia').forEach(x=>x.remove());c.style.maxWidth='none';c.style.margin='0';
 box.appendChild(c);document.body.appendChild(box);
 try{const cv=await window.html2canvas(c,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
  let w=190,h=cv.height*w/cv.width;if(h>277){w=w*277/h;h=277}
  doc.addImage(cv.toDataURL('image/jpeg',0.92),'JPEG',(210-w)/2,10,w,h);
  return doc.output('datauristring').split(',')[1]}finally{box.remove()}}
function almaRecMailEstado(p){const el=$('almaRecMail');if(!el)return;const m=(p&&p.mailed)||[];
 el.innerHTML=m.length?'✉ Enviado por mail: '+m.map(x=>esc(x.to)+' ('+formatCaptureStamp(x.at)+')').join(' · '):'';el.style.display=m.length?'':'none'}
async function almaMandarRecibo(p,to,subject,body){
 if(window.currentReceiptId!==p.id||!$('receiptDialog')?.open)showReceipt(p.id);
 const pdf=await almaReciboPdf();
 await window.almaEnviarRecibo(p.id,to,subject,body,pdf);
 p.mailed=[...(p.mailed||[]),{to,at:new Date().toISOString(),by:currentDemoOperator()}];save();
 if(window.currentReceiptId===p.id)almaRecMailEstado(p);notify('Recibo enviado por mail a '+to)}
{const o=window.showReceipt;window.showReceipt=(id,...a)=>{o(id,...a);almaRecDuplicar();
 if(!$('almaRecMail'))$('receiptPaper')?.insertAdjacentHTML('beforebegin','<div id="almaRecMail" class="alma-recmail"></div>');
 almaRecMailEstado(state.payments.find(x=>x.id===id))}}
{const o=window.openReceiptEmail;window.openReceiptEmail=(...a)=>{const r=o(...a);const p=state.payments.find(x=>x.id===window.currentReceiptId);
 if(p&&$('receiptEmailDialog')?.open){const t=almaRecTexto(p);if(!$('receiptEmailTo').value)$('receiptEmailTo').value=almaRecEmail(p);$('receiptEmailBody').value=t.body;
  $('receiptEmailInfo').textContent='Se envía desde info@almaviajeraturismo.com con el recibo '+p.number+' en PDF adjunto (llega también una copia a info@).'+((p.mailed||[]).length?' Ya se envió antes a: '+p.mailed.map(x=>x.to).join(', ')+'.':'');
  const bt=$('receiptEmailForm').querySelector('button[type=submit]');if(bt)bt.textContent='✉ Enviar desde info@'}
 return r}}
document.addEventListener('submit',async e=>{if(e.target?.id!=='receiptEmailForm')return;e.preventDefault();e.stopPropagation();
 const p=state.payments.find(x=>x.id===window.currentReceiptId);if(!p)return;if(p.voidedAt){alert('Este recibo fue anulado y no puede enviarse.');return}
 const to=$('receiptEmailTo').value.trim();if(!to||!$('receiptEmailTo').checkValidity()){alert('Ingresá una dirección de correo válida');return}
 const bt=e.target.querySelector('button[type=submit]'),txt=bt?.textContent;if(bt){bt.disabled=true;bt.textContent='Enviando…'}
 try{closeDialog('receiptEmailDialog');await almaMandarRecibo(p,to,$('receiptEmailSubject').value,$('receiptEmailBody').value)}
 catch(err){alert('No se pudo enviar el recibo: '+(err.message||err))}
 finally{if(bt){bt.disabled=false;bt.textContent=txt}}},true);
/* Al registrar un cobro nuevo: si el pasajero tiene email cargado, se le envía el recibo automáticamente */
if($('paymentForm')){let antes=null;
 $('paymentForm').addEventListener('submit',()=>{antes=window.currentReceiptId},true);
 $('paymentForm').addEventListener('submit',()=>{const rid=window.currentReceiptId;if(!rid||rid===antes)return;
  const p=state.payments.find(x=>x.id===rid);if(!p||p.voidedAt)return;const to=almaRecEmail(p);
  if(!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to))return;const t=almaRecTexto(p);
  setTimeout(()=>almaMandarRecibo(p,to,t.subject,t.body).catch(err=>alert('El cobro quedó registrado, pero no se pudo enviar el recibo por mail a '+to+': '+(err.message||err)+'\nPodés reenviarlo con «✉ Enviar por mail».')),400)})}

/* ---------- Pedido de cotización: canal de entrada (WhatsApp por defecto en los pedidos nuevos) ---------- */
{const o=window.openOrder;window.openOrder=(...a)=>{const r=o(...a);if($('orderChannel'))$('orderChannel').value='WhatsApp';return r}}
{const o=window.editOrder;window.editOrder=(id,...a)=>{const r=o(id,...a);const p=findOrder(id);if(p&&$('orderChannel'))$('orderChannel').value=p.channel||'';return r}}

/* Inscribir en grupo: el aviso de acompañante se oculta cuando ya se eligió habitación compartida */
{const av=()=>{const a=$('almaAcompAviso');if(a)a.classList.toggle('alma-off',(ALMA_CAP[$('almaRoomType')?.value]||1)>1||$('almaRoomType')?.value==='A compartir')};
 $('almaRoomType')?.addEventListener('change',av);const o=window.openGroupBooking;window.openGroupBooking=(...x)=>{const r=o(...x);av();return r}}

/* ---------- Pago a proveedor: desde qué cuenta se pagó (si no es efectivo) ---------- */
function almaOrigSync(){const f=$('supplierForm'),w=$('almaOrigWrap');if(!f||!w)return;const no=f.elements.method.value!=='Efectivo',v=f.elements.source.value;
 w.style.display=no?'':'none';f.elements.source.required=no;const det=no&&(v==='Otro'||v==='Cuenta personal de un socio');f.elements.sourceDetail.required=det;
 $('almaOrigDetLbl').textContent=v==='Cuenta personal de un socio'?'¿De qué socio? (obligatorio)':det?'¿Qué cuenta? (obligatorio)':'Detalle (opcional)';
 if(!no){f.elements.source.value='';f.elements.sourceDetail.value=''}}
$('supplierForm')?.addEventListener('change',e=>{if(['method','source'].includes(e.target.name))almaOrigSync()},true);
{const o=window.openSupplierPayment;window.openSupplierPayment=(...a)=>{const r=o(...a);const f=$('supplierForm');if(f?.elements.source){f.elements.source.value='';f.elements.sourceDetail.value='';
 const ex=state.expenses.find(e=>e.id===f.elements.expenseId.value);if(f.elements.method.value!=='Efectivo')f.elements.source.value=ex?.currency==='USD'?'BBVA dólares (agencia)':'BBVA pesos (agencia)';almaOrigSync()}return r}}
$('supplierExpense')?.addEventListener('change',()=>{const f=$('supplierForm'),ex=state.expenses.find(e=>e.id===f.elements.expenseId.value);if(ex&&String(f.elements.source.value).startsWith('BBVA'))f.elements.source.value=ex.currency==='USD'?'BBVA dólares (agencia)':'BBVA pesos (agencia)'});

/* ---------- Firma digitalizada en los recibos (la de quien registró el cobro) ---------- */
function almaFirmaEnRecibo(p){const sg=$('receiptPaper')?.querySelector('.receipt-sign');if(!sg||!p)return false;
 sg.querySelector('.alma-firma-wrap')?.replaceWith(Object.assign(document.createElement('span'),{textContent:'Firma y aclaración'}));
 const quien=p.recordedBy||'',img=(window.ALMA_FIRMAS||{})[quien],sp=sg.querySelector(':scope > span');if(!img||!sp)return false;
 const w=document.createElement('div');w.className='alma-firma-wrap';w.innerHTML='<img class="receipt-firma" src="'+img+'" alt="Firma"><span>'+esc(quien)+'</span>';sp.replaceWith(w);return true}
{const o=window.showReceipt;window.showReceipt=(id,...a)=>{o(id,...a);const p=state.payments.find(x=>x.id===id);
 const poner=()=>{if(window.currentReceiptId!==id)return;almaFirmaEnRecibo(p);almaRecDuplicar()};
 if(window.ALMA_FIRMAS)poner();else window.almaFirmas?.cargar().then(poner)}}
/* Ventana «Firmas»: dibujar o subir foto, guardar o quitar */
function almaFirmaDlg(){let d=$('almaFirmaDialog');if(d)return d;
 document.body.insertAdjacentHTML('beforeend','<dialog id="almaFirmaDialog" class="dialog"><div class="modalhead"><h2>✍ Firma para los recibos</h2><button class="btn ghost tiny" type="button" onclick="closeDialog(\'almaFirmaDialog\')">✕</button></div><div class="modalbody">'
  +'<label class="field">Persona<select id="almaFirmaQuien"></select></label>'
  +'<p class="hint" id="almaFirmaHoy"></p>'
  +'<p class="hint">Dibujá la firma con el dedo o el mouse, o subí una foto de la firma hecha en una hoja blanca (el sistema le saca el fondo). Va a salir en los recibos que registre esa persona.</p>'
  +'<canvas id="almaFirmaCanvas" width="700" height="260" class="alma-firma-canvas"></canvas>'
  +'<div class="alma-firma-btns"><button type="button" class="btn ghost tiny" onclick="almaFirmaLimpiar()">Borrar dibujo</button><label class="btn ghost tiny" style="cursor:pointer">📷 Subir foto de la firma<input type="file" accept="image/*" hidden onchange="almaFirmaFoto(this)"></label></div>'
  +'</div><div class="modalfoot"><button type="button" class="btn plain" id="almaFirmaQuitar" onclick="almaFirmaQuitar()">Quitar firma</button><button type="button" class="btn" id="almaFirmaGuardar" onclick="almaFirmaGuardar()">Guardar firma</button></div></dialog>');
 d=$('almaFirmaDialog');const c=$('almaFirmaCanvas'),ctx=c.getContext('2d');let dib=false,last=null;
 const pos=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.addEventListener('pointerdown',e=>{dib=true;last=pos(e);c.setPointerCapture(e.pointerId);c.dataset.sucio='1';e.preventDefault()});
 c.addEventListener('pointermove',e=>{if(!dib)return;const p=pos(e);ctx.strokeStyle='#1d2a6b';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(...p);ctx.stroke();last=p;e.preventDefault()});
 ['pointerup','pointercancel','pointerleave'].forEach(t=>c.addEventListener(t,()=>{dib=false}));
 $('almaFirmaQuien').addEventListener('change',almaFirmaMostrar);return d}
function almaFirmaMostrar(){const n=$('almaFirmaQuien').value,img=(window.ALMA_FIRMAS||{})[n];almaFirmaLimpiar();
 if(img){const im=new Image();im.onload=()=>{const c=$('almaFirmaCanvas'),k=Math.min(c.width/im.width,c.height/im.height);c.getContext('2d').drawImage(im,(c.width-im.width*k)/2,(c.height-im.height*k)/2,im.width*k,im.height*k)};im.src=img}
 $('almaFirmaHoy').textContent=img?'Firma cargada. Podés reemplazarla dibujando o subiendo otra foto.':'Todavía no tiene firma cargada.';$('almaFirmaQuitar').style.display=img?'':'none'}
window.almaFirmaLimpiar=()=>{const c=$('almaFirmaCanvas');c.getContext('2d').clearRect(0,0,c.width,c.height);c.dataset.sucio=''};
window.openFirmas=async()=>{const d=almaFirmaDlg(),yo=currentDemoOperator(),socio=window.demoRole==='socio';
 await window.almaFirmas?.cargar();const s=$('almaFirmaQuien');s.innerHTML=[...new Set(socio?owners:[yo])].map(n=>'<option>'+esc(n)+'</option>').join('');s.value=yo;s.disabled=!socio;almaFirmaMostrar();openDlg('almaFirmaDialog')};
/* Foto de una firma en papel → fondo transparente, recortada */
window.almaFirmaFoto=inp=>{const f=inp.files?.[0];inp.value='';if(!f)return;const url=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{URL.revokeObjectURL(url);const k=Math.min(1,1400/Math.max(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k),mx=Math.round(w*.03),my=Math.round(h*.04);
  const a=document.createElement('canvas');a.width=w;a.height=h;const ax=a.getContext('2d');ax.drawImage(im,0,0,w,h);
  const b=document.createElement('canvas');b.width=w;b.height=h;const bx=b.getContext('2d');bx.filter='blur(25px)';bx.drawImage(a,0,0);
  const D=ax.getImageData(0,0,w,h),B=bx.getImageData(0,0,w,h).data,px=D.data;let x0=w,y0=h,x1=0,y1=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,g=px[i]*.3+px[i+1]*.59+px[i+2]*.11,bg=B[i]*.3+B[i+1]*.59+B[i+2]*.11,d=bg-g;
   if(d>22&&x>mx&&x<w-mx&&y>my&&y<h-my){const al=Math.min(255,(d-22)*255/55);px[i]=px[i]*.55;px[i+1]=px[i+1]*.55;px[i+2]=px[i+2]*.7;px[i+3]=al;if(al>90){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}}else px[i+3]=0}
  if(x1<=x0){alert('No se encontró la firma en la foto. Probá con una foto más nítida, sobre hoja blanca.');return}
  ax.putImageData(D,0,0);const c=$('almaFirmaCanvas'),cx=c.getContext('2d');almaFirmaLimpiar();const pw=x1-x0+16,ph=y1-y0+16,s=Math.min(c.width/pw,c.height/ph);
  cx.drawImage(a,x0-8,y0-8,pw,ph,(c.width-pw*s)/2,(c.height-ph*s)/2,pw*s,ph*s);c.dataset.sucio='1'};
 im.onerror=()=>alert('No se pudo leer la imagen');im.src=url};
/* Recorta lo dibujado y lo guarda como PNG transparente */
function almaFirmaPng(){const c=$('almaFirmaCanvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 if(x1<=x0)return null;const t=document.createElement('canvas');t.width=x1-x0+12;t.height=y1-y0+12;t.getContext('2d').drawImage(c,x0-6,y0-6,t.width,t.height,0,0,t.width,t.height);return t.toDataURL('image/png')}
window.almaFirmaGuardar=async()=>{const n=$('almaFirmaQuien').value,img=almaFirmaPng();if(!img){alert('Dibujá o subí la firma primero.');return}
 const bt=$('almaFirmaGuardar');bt.disabled=true;try{await window.almaFirmas.guardar(n,img,currentDemoOperator());audit('Firma cargada','Recibos',n);notify('Firma guardada: '+n);closeDialog('almaFirmaDialog');if(window.currentReceiptId&&$('receiptDialog')?.open)showReceipt(window.currentReceiptId)}
 catch(e){alert('No se pudo guardar la firma: '+e.message)}finally{bt.disabled=false}};
window.almaFirmaQuitar=async()=>{const n=$('almaFirmaQuien').value;if(!confirm('¿Quitar la firma de '+n+'? Los recibos van a salir con la línea en blanco.'))return;
 try{await window.almaFirmas.borrar(n);audit('Firma quitada','Recibos',n);notify('Firma quitada');almaFirmaMostrar()}catch(e){alert('No se pudo quitar: '+e.message)}};

/* ---------- Salida grupal con proveedor: compromiso automático por pasajero + liquidación del proveedor ---------- */
{const f=$('groupForm'),cap=f?.elements.capacity?.closest('label');if(cap&&!f.elements.providerId)cap.insertAdjacentHTML('beforebegin',
 '<label class="field">Proveedor / operador de la salida<select name="providerId" id="almaGProv"><option value="">— Sin proveedor —</option></select><small class="hint">Al inscribir cada pasajero se le carga solo el compromiso de pago con este proveedor.</small></label>'
 +'<label class="field">Costo neto por pasajero (al proveedor)<input name="netPerPax" type="number" min="0" step="0.01" placeholder="Lo que se le paga por cada pasajero"><small class="hint">En la moneda de la salida.</small></label>'
 +'<label class="field">Suplemento single neto (al proveedor)<input name="netSingle" type="number" min="0" step="0.01" placeholder="0"><small class="hint">Se suma al compromiso de quien viaja en Single.</small></label>'
 +'<label class="field">Vencimiento del pago al proveedor<input name="supplierDueDate" type="date"></label>')}
function almaGProvOpts(sel){const s=$('almaGProv');if(!s)return;s.innerHTML='<option value="">— Sin proveedor —</option>'+[...state.providers].sort((a,b)=>String(a.name).localeCompare(b.name)).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');s.value=sel||''}
{const o=window.openGroup;window.openGroup=(...a)=>{const r=o(...a);almaGProvOpts('');return r}}
{const o=window.almaEditarSalida;window.almaEditarSalida=id=>{o(id);const g=findGroup(id),f=$('groupForm');if(!g||!f||window.__almaEditGroup!==id)return;almaGProvOpts(g.providerId);
 f.elements.netPerPax.value=g.netPerPax||'';f.elements.supplierDueDate.value=g.supplierDueDate||'';f.elements.netSingle.value=g.netSingle||'';f.elements.singleSupplement.value=g.singleSupplement||''}}
function almaCompDe(b){return state.expenses.find(e=>e.bookingId===b.id&&e.auto)}
function almaCrearComp(b,g){if(!g?.providerId||!(Number(g.netPerPax)>0)||almaCompDe(b)||accountStatus(b)==='Baja')return null;const pr=state.providers.find(p=>p.id===g.providerId);if(!pr)return null;
 const e={id:uid(),providerId:pr.id,provider:pr.name,operationKey:'G:'+g.id,bookingId:b.id,passengerId:b.passengerId,supplierRef:'',category:'Operador mayorista',concept:g.name+' · '+b.client+(b.roomType==='Single'&&Number(g.netSingle)>0?' (single)':''),amount:Number(g.netPerPax)+(b.roomType==='Single'?Number(g.netSingle||0):0),roomType:b.roomType||'',currency:g.currency||'USD',depositDueDate:'',depositAmount:'',dueDate:g.supplierDueDate||'',notes:'Cargado automáticamente al inscribir al pasajero',auto:true,liquidaciones:[]};
 state.expenses.unshift(e);audit('Compromiso automático','Finanzas',pr.name+' · '+b.client+' · '+money(e.amount,e.currency));return e}
// Edición de salida: guardar proveedor/neto y ofrecer crear los compromisos de los ya inscriptos
document.addEventListener('submit',e=>{if(e.target?.id!=='groupForm')return;const id=window.__almaEditGroup;if(!id)return;const f=e.target,v={providerId:f.elements.providerId.value,netPerPax:Number(f.elements.netPerPax.value||0)||'',supplierDueDate:f.elements.supplierDueDate.value||'',netSingle:Number(f.elements.netSingle.value||0)||'',singleSupplement:Number(f.elements.singleSupplement.value||0)||''};
 setTimeout(()=>{if($('groupDialog')?.open)return;const g=findGroup(id);if(!g)return;Object.assign(g,v);
  const falt=state.bookings.filter(b=>b.kind==='grupal'&&b.groupId===id&&accountStatus(b)!=='Baja'&&!almaCompDe(b));
  if(g.providerId&&g.netPerPax&&falt.length&&confirm('Hay '+falt.length+' pasajero/s inscripto/s sin compromiso con el proveedor.\n\n¿Cargarles ahora '+money(g.netPerPax,g.currency)+' a cada uno?'))falt.forEach(b=>almaCrearComp(b,g));
  save();render();if(window.currentGroupDetail===id)renderGroupDetail()},0)},true);
// Inscripción: crear el compromiso de cada pasajero nuevo (también del acompañante inscripto en el mismo paso)
{let antes=null;document.addEventListener('submit',e=>{if(e.target?.id==='groupBookingForm')antes=new Set(state.bookings.map(b=>b.id))},true);
 document.addEventListener('submit',e=>{if(e.target?.id!=='groupBookingForm'||!antes)return;const a=antes;antes=null;
  setTimeout(()=>{const nuevos=state.bookings.filter(b=>!a.has(b.id)&&b.kind==='grupal');let n=0,tot=null;
   for(const b of nuevos){const x=almaCrearComp(b,findGroup(b.groupId));if(x){n++;tot=x}}
   if(n){save();if(window.currentGroupDetail)renderGroupDetail();notify('Compromiso con '+tot.provider+' cargado: '+money(tot.amount,tot.currency)+(n>1?' × '+n+' pasajeros':''))}},50)},false)}
// Liquidación del proveedor (PDF o foto) en cada compromiso
function almaLiqHtml(e){const ls=e.liquidaciones||[];
 return '<span class="sub" style="display:inline">Liquidación del proveedor: </span>'+(ls.length?ls.map((n,i)=>'<a href="#" onclick="event.preventDefault();almaComprobantes.abrir(&quot;liq-'+e.id+'&quot;,&quot;'+esc(n)+'&quot;)">📄 Ver'+(ls.length>1?' '+(i+1):'')+'</a>').join(' · ')+' ':'<span class="sub" style="display:inline">sin adjuntar</span> ')
  +'<label class="btn ghost tiny" style="cursor:pointer">📎 '+(ls.length?'Agregar otra':'Adjuntar liquidación')+'<input type="file" accept="image/*,application/pdf" hidden onchange="almaLiqSubir(&quot;'+e.id+'&quot;,this)"></label>'}
window.almaLiqHtml=almaLiqHtml;
window.almaLiqSubir=async(id,inp)=>{const file=inp.files?.[0];inp.value='';const e=state.expenses.find(x=>x.id===id);if(!file||!e)return;
 document.querySelectorAll('[id="almaLiq'+id+'"]').forEach(c=>c.innerHTML='<span class="sub">Subiendo…</span>');
 try{const name=await window.almaComprobantes.subir('liq-'+id,file);e.liquidaciones=[...(e.liquidaciones||[]),name];audit('Liquidación de proveedor adjuntada','Finanzas',(e.provider||'')+' · '+(e.concept||''));save();notify('Liquidación adjuntada')}
 catch(err){alert('No se pudo subir la liquidación: '+err.message);document.querySelectorAll('[id="almaLiq'+id+'"]').forEach(c=>c.innerHTML=almaLiqHtml(e));return}
 // Si se puede leer, ofrecer actualizar importe, file del proveedor y vencimiento
 try{const r=await window.almaLiq?.leer(file);if(r&&isFinite(r.total)&&(Math.abs(r.total-Number(e.amount))>.009||(r.ref&&r.ref!==e.supplierRef)||(r.vence&&r.vence!==e.dueDate))){
  const pag=paidSupplier(e);
  if(r.total<pag-.001)alert('La liquidación dice '+money(r.total,r.moneda||e.currency)+', menos de lo ya pagado ('+money(pag,e.currency)+'). Revisalo con el proveedor.');
  else if(confirm('La liquidación dice:\n\nImporte: '+money(r.total,r.moneda||e.currency)+' (el compromiso tiene '+money(e.amount,e.currency)+')'+(r.ref?'\nFile del proveedor: '+r.ref:'')+(r.vence?'\nVence: '+fmt(r.vence):'')+'\n\n¿Actualizar el compromiso con estos datos?')){
   Object.assign(e,{fromLiq:true,amount:r.total,currency:r.moneda||e.currency,supplierRef:r.ref||e.supplierRef||'',dueDate:r.vence||e.dueDate||'',notes:[window.almaLiq.notas(r),e.notes].filter(Boolean).join('\n')});
   audit('Compromiso actualizado con la liquidación','Finanzas',(e.provider||'')+' · '+money(e.amount,e.currency));save();render();if(window.currentGroupDetail)renderGroupDetail();if($('almaVerResDialog')?.open&&e.bookingId)almaVerReserva(e.bookingId);notify('Compromiso actualizado')}}}catch(_){}
 document.querySelectorAll('[id="almaLiq'+id+'"]').forEach(c=>c.innerHTML=almaLiqHtml(e))};

/* Registrar compromiso: adjuntar la liquidación del proveedor en el mismo paso */
{const f=$('expenseForm'),obs=f?.querySelector('.formgrid');if(obs&&!$('almaLiqNueva'))obs.insertAdjacentHTML('afterbegin',
 '<label class="field full alma-liq-top">📄 Liquidación del proveedor (opcional)<input type="file" id="almaLiqNueva" accept="image/*,application/pdf" multiple><small class="hint">Subila primero: el sistema la lee y completa los datos (proveedor, pasajero, file, importe, vencimiento). Queda guardada en el compromiso.</small></label>');
 let antes=null;f?.addEventListener('submit',()=>{antes=new Set(state.expenses.map(e=>e.id))},true);
 f?.addEventListener('submit',()=>{const inp=$('almaLiqNueva'),files=[...(inp?.files||[])],a=antes,bid=window.__almaLiqBooking;antes=null;window.__almaLiqBooking=null;if(!a)return;const e=state.expenses.find(x=>!a.has(x.id));if(!e)return;
  if(bid&&!e.bookingId){const bk=findBooking(bid);if(bk&&(e.operationKey==='G:'+bk.groupId||e.operationKey==='B:'+bk.id)){e.bookingId=bk.id;e.passengerId=bk.passengerId;save()}}
  if(!files.length)return;inp.value='';const av=$('almaLiqAviso');if(av)av.style.display='none';
  (async()=>{try{for(const file of files){const name=await window.almaComprobantes.subir('liq-'+e.id,file);e.liquidaciones=[...(e.liquidaciones||[]),name]}
   audit('Liquidación de proveedor adjuntada','Finanzas',(e.provider||'')+' · '+(e.concept||''));save();render();if(window.currentGroupDetail)renderGroupDetail();notify('Compromiso registrado con su liquidación')}
   catch(err){alert('El compromiso se registró, pero no se pudo subir la liquidación: '+err.message+'\nPodés adjuntarla desde la cuenta del proveedor.')}})()})}
{const o=window.openExpense;if(o)window.openExpense=(...a)=>{const r=o(...a);const i=$('almaLiqNueva');if(i)i.value='';return r}}
{const o=window.openGroupExpense;if(o)window.openGroupExpense=(...a)=>{const r=o(...a);const i=$('almaLiqNueva');if(i)i.value='';return r}}

/* Liquidación leída sobre un compromiso que ya existía (el automático del pasajero): se actualiza y se adjunta */
window.almaLiqActualizado=async(e,files)=>{audit('Compromiso actualizado con la liquidación','Finanzas',(e.provider||'')+' · '+(e.concept||'')+' · '+money(e.amount,e.currency));
 closeDialog('expenseDialog');save();render();if(window.currentGroupDetail)renderGroupDetail();
 try{for(const file of files){const name=await window.almaComprobantes.subir('liq-'+e.id,file);e.liquidaciones=[...(e.liquidaciones||[]),name]}if(files.length){save();render();if(window.currentGroupDetail)renderGroupDetail()}
  notify('Compromiso actualizado con la liquidación: '+money(e.amount,e.currency))}
 catch(err){alert('El compromiso se actualizó, pero no se pudo subir la liquidación: '+err.message)}};

/* ---------- Liquidez por viaje: cuánto de lo cobrado es ganancia y cuánto es del operador ---------- */
function almaLiqOps(){const ops=new Map(),get=(k,tit,sub,fecha,abrir)=>{if(!ops.has(k))ops.set(k,{k,tit,sub,fecha,abrir,c:{}});return ops.get(k)},
 cc=(o,c)=>o.c[c]||(o.c[c]={cobrado:0,porCobrar:0,pagado:0,falta:0,comp:0});
 for(const b of state.bookings){if(accountStatus(b)==='Baja')continue;const g=b.kind==='grupal'?findGroup(b.groupId):null;
  const o=g?get('G:'+g.id,g.name,'Salida grupal · File '+(g.fileNumber||'—'),g.departure,'showGroupDetail(&quot;'+g.id+'&quot;)'):get('B:'+b.id,b.client,(b.kind==='aereo'?'Aéreo':'Viaje individual')+' · '+trip(b)+' · File '+(bookingFile(b)||'—'),b.departure,'almaVerReserva(&quot;'+b.id+'&quot;)');
  const x=cc(o,cur(b));x.cobrado+=paid(b);x.porCobrar+=Math.max(0,balance(b));if(g){o.pax=(o.pax||0)+1}}
 for(const e of state.expenses){const o=ops.get(e.operationKey);if(!o)continue;const x=cc(o,e.currency||'USD'),p=paidSupplier(e);x.pagado+=p;x.falta+=Math.max(0,Number(e.amount)-p);x.comp++;
  const d=expenseNextDue(e);if(d&&(!o.vence||d.date<o.vence.date))o.vence=d}
 return [...ops.values()].filter(o=>Object.values(o.c).some(x=>x.cobrado>.009||x.falta>.009||x.pagado>.009))}
function almaLiqCalc(x){const enMano=x.cobrado-x.pagado;return {enMano,libre:enMano-x.falta,final:x.cobrado+x.porCobrar-x.pagado-x.falta}}
function almaLiqLibre(v,c,sinComp){if(sinComp)return '<b>'+money(v,c)+'</b><span class="sub" style="color:#a06a00">⚠ sin compromisos con el operador cargados</span>';
 return v>=-.009?'<b style="color:#1f7a45">'+money(v,c)+'</b><span class="sub">ganancia ya cobrada</span>':'<b style="color:#b13c1c">−'+money(-v,c)+'</b><span class="sub">es del operador: cubrir con próximos cobros</span>'}
function almaLiqRender(){const el=$('almaLiqBody');if(!el)return;const ops=almaLiqOps(),tot={},filtro=$('almaLiqFiltro')?.value||'activos',hoy=today();
 const lista=ops.filter(o=>filtro==='todos'||Object.values(o.c).some(x=>x.falta>.009||x.porCobrar>.009)||(o.fecha||'')>=hoy).sort((a,b)=>String(a.vence?.date||a.fecha||'9999').localeCompare(String(b.vence?.date||b.fecha||'9999')));
 const filas=[];for(const o of lista)for(const [c,x] of Object.entries(o.c)){const v=almaLiqCalc(x);const t=tot[c]||(tot[c]={cobrado:0,pagado:0,falta:0,porCobrar:0,libre:0,enMano:0,neg:0,sin:0,sinM:0});
  if(!x.comp){t.sin++;t.sinM+=x.cobrado}else{
  t.cobrado+=x.cobrado;t.pagado+=x.pagado;t.falta+=x.falta;t.porCobrar+=x.porCobrar;t.enMano+=v.enMano;t.libre+=v.libre;if(v.libre<-.009)t.neg+=-v.libre}
  filas.push('<tr><td><a href="#" onclick="event.preventDefault();'+o.abrir+'"><b>'+esc(o.tit)+'</b></a><span class="sub">'+esc(o.sub)+(o.pax?' · '+o.pax+' pax':'')+(o.fecha?' · sale '+fmt(o.fecha):'')+'</span></td>'
   +'<td>'+money(x.cobrado,c)+(x.porCobrar>.009?'<span class="sub">falta cobrar '+money(x.porCobrar,c)+'</span>':'')+'</td><td>'+money(x.pagado,c)+'</td><td><b>'+money(v.enMano,c)+'</b></td>'
   +'<td>'+money(x.falta,c)+(o.vence&&x.falta>.009?'<span class="sub">'+o.vence.kind+' '+fmt(o.vence.date)+(o.vence.date<hoy?' · <b style="color:#b13c1c">vencido</b>':'')+'</span>':'')+'</td>'
   +'<td>'+almaLiqLibre(v.libre,c,!x.comp)+'</td><td>'+money(v.final,c)+'</td></tr>')}
 const res=Object.entries(tot).map(([c,t])=>'<div class="alma-liq-card"><span>'+c+'</span><div>En mano por viajes <b>'+money(t.enMano,c)+'</b></div><div>Falta pagar a operadores <b>'+money(t.falta,c)+'</b></div>'
  +'<div class="alma-liq-big" style="color:'+(t.libre>=0?'#1f7a45':'#b13c1c')+'">Libre: '+(t.libre<0?'−':'')+money(Math.abs(t.libre),c)+'</div>'
  +(t.neg>.009?'<small>De lo cobrado, '+money(t.neg,c)+' es plata de operadores que se está usando hoy y hay que cubrir con próximos cobros (por cobrar: '+money(t.porCobrar,c)+').</small>':'<small>Todo lo que está en mano por encima de lo que se debe a operadores es ganancia ya cobrada.</small>')+(t.sin?'<small style="color:#a06a00;margin-top:4px">⚠ '+t.sin+' viaje/s sin compromisos con el operador cargados ('+money(t.sinM,c)+' cobrado): no se cuentan acá hasta cargar lo que se le debe al operador.</small>':'')+'</div>').join('');
 el.innerHTML=(res?'<div class="alma-liq-cards">'+res+'</div>':'')+(filas.length?'<div class="tablewrap"><table class="table"><thead><tr><th>Viaje</th><th>Cobrado al pasajero</th><th>Pagado al operador</th><th>En mano</th><th>Falta pagar al operador</th><th>Libre</th><th>Ganancia al final</th></tr></thead><tbody>'+filas.join('')+'</tbody></table></div>':'<p class="hint">No hay viajes con cobros o compromisos pendientes.</p>')
  +'<p class="hint">En mano = cobrado − pagado al operador. Libre = en mano − lo que falta pagarle al operador. Si da negativo, se está usando plata del operador. Ganancia al final = todo lo que se va a cobrar − todo lo que se le paga al operador.</p>'}
{const fd=$('financeDashboard');if(fd&&!$('almaLiqPanel'))fd.insertAdjacentHTML('afterend','<div class="panel" id="almaLiqPanel"><div class="panelhead"><h2>💧 Liquidez por viaje</h2><select id="almaLiqFiltro" class="tiny" onchange="almaLiqRender()" style="max-width:220px"><option value="activos">Viajes activos</option><option value="todos">Todos</option></select></div><div id="almaLiqBody"></div></div>');
 window.almaLiqRender=almaLiqRender;const o=render;render=(...a)=>{const r=o(...a);try{if(window.demoRole==='socio')almaLiqRender()}catch(e){}return r}}

/* Cuenta del pasajero · Viaje: botón para registrar el cobro directo desde la cuenta */
{const o=window.openAccount;window.openAccount=(id,...a)=>{const r=o(id,...a);const b=findBooking(id),m=$('accountDetailBody')?.querySelector('.fin-metrics');
 if(b&&m&&!$('almaCtaAcc')){const baja=accountStatus(b)==='Baja',saldo=balance(b);
  m.insertAdjacentHTML('afterend','<div class="alma-cta-acc" id="almaCtaAcc">'+(baja?'<span class="hint">La reserva está dada de baja.</span>':'<button class="btn" type="button" onclick="openPayment(&quot;'+b.id+'&quot;)">💵 Registrar cobro'+(saldo>.009?' · saldo '+money(saldo,cur(b)):'')+'</button>')
   +(typeof almaVerReserva==='function'?'<button class="btn ghost" type="button" onclick="almaVerReserva(&quot;'+b.id+'&quot;)">👁 Ver reserva</button>':'')+'</div>')}
 return r}}

/* Single: si cambia la habitación, ajustar el compromiso automático (si no tiene pagos ni vino de una liquidación) y avisar el suplemento al inscribir */
function almaSglAjuste(gid){const g=findGroup(gid);if(!g)return false;let ch=false;
 for(const e of state.expenses.filter(e=>e.auto&&e.operationKey==='G:'+gid&&!e.fromLiq)){const b=findBooking(e.bookingId);if(!b||(e.roomType||'')===(b.roomType||''))continue;
  if(state.supplierPayments.some(p=>p.expenseId===e.id))continue;const ns=Number(g.netSingle||0);
  e.amount=Number(e.amount)+(b.roomType==='Single'?ns:0)-(e.roomType==='Single'?ns:0);e.roomType=b.roomType||'';ch=true}
 return ch}
document.addEventListener('submit',e=>{const id=e.target?.id;if(id!=='groupBookingForm'&&id!=='editBookingForm')return;const gid0=id==='editBookingForm'?findBooking(e.target.elements.editId?.value)?.groupId:e.target.elements.groupId?.value;
 setTimeout(()=>{if(gid0&&almaSglAjuste(gid0)){save();if(window.currentGroupDetail)renderGroupDetail();notify('Compromiso con el proveedor ajustado por el cambio de habitación')}},150)});
function almaSglHint(){const s=$('almaRoomType');if(!s)return;let h=$('almaSglHint');if(!h){s.closest('label')?.insertAdjacentHTML('beforeend','<small class="hint" id="almaSglHint"></small>');h=$('almaSglHint')}
 const g=findGroup($('groupBookingForm')?.elements.groupId?.value),v=Number(g?.singleSupplement||0);h.textContent=s.value==='Single'&&v>0?'Suplemento single: + '+money(v,g.currency||'USD'):'';}
$('almaRoomType')?.addEventListener('change',almaSglHint);$('groupBookingForm')?.addEventListener('change',e=>{if(e.target.name==='groupId')almaSglHint()});

/* ---------- Finanzas → Backups (solo Hernan): estado del backup diario y descarga ---------- */
function almaEsHernan(){return currentDemoOperator()==='Hernan Ruiz'&&window.demoRole==='socio'}
async function almaBkRender(){const el=$('almaBkBody');if(!el||!window.almaBackups)return;el.innerHTML='<p class="hint">Cargando…</p>';
 let ls;try{ls=await window.almaBackups.listar()}catch(e){el.innerHTML='<p class="hint">No se pudieron leer los backups: '+esc(e.message)+'</p>';return}
 const u=ls[0],hs=u?(Date.now()-new Date(u.creado))/36e5:99,ok=hs<26,kb=n=>(Number(n)/1024/1024).toFixed(1).replace('.',',')+' MB';
 const fh=t=>new Date(t).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
 el.innerHTML='<div class="alma-bk-estado '+(ok?'ok':'mal')+'">'+(u?(ok?'✅ ':'⚠️ ')+'<b>Último backup: '+fh(u.creado)+'</b> · '+u.registros.toLocaleString('es-AR')+' registros de '+u.tablas+' tablas · '+kb(u.bytes)+(ok?'':'<br>Hace más de un día que no se hace un backup. Tocá «Hacer backup ahora» y avisame.'):'⚠️ Todavía no hay backups.')+'</div>'
  +'<div class="alma-bk-btns"><button class="btn" type="button" onclick="almaBkBajar('+(u?u.id:0)+')" '+(u?'':'disabled')+'>⬇ Descargar el último</button><button class="btn ghost" type="button" onclick="almaBkHacer(this)">🛟 Hacer backup ahora</button></div>'
  +'<p class="hint">Se hace solo todas las madrugadas a las 3:00 y se guardan los últimos 30. Conviene descargar uno por semana y guardarlo en la PC o en Google Drive (es un archivo .json con todos los datos del sistema). Si algo se rompe o se borra, con ese archivo se puede restaurar.</p>'
  +(ls.length?'<details><summary>Ver los '+ls.length+' backups guardados</summary><div class="tablewrap"><table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Registros</th><th>Tamaño</th><th></th></tr></thead><tbody>'
   +ls.map(b=>'<tr><td>'+fh(b.creado)+'</td><td>'+esc(b.origen)+'</td><td>'+b.registros.toLocaleString('es-AR')+'</td><td>'+kb(b.bytes)+'</td><td><button class="btn ghost tiny" type="button" onclick="almaBkBajar('+b.id+')">⬇ Descargar</button></td></tr>').join('')+'</tbody></table></div></details>':'')}
window.almaBkBajar=async id=>{try{const n=await window.almaBackups.descargar(id);notify('Descargado: '+n)}catch(e){alert('No se pudo descargar: '+e.message)}};
window.almaBkHacer=async bt=>{bt.disabled=true;bt.textContent='Haciendo backup…';try{const r=await window.almaBackups.hacer();notify('Backup hecho: '+r.registros+' registros');audit('Backup manual','Sistema','')}catch(e){alert('No se pudo hacer el backup: '+e.message)}almaBkRender()};
{const fd=$('almaLiqPanel')||$('financeDashboard');if(fd&&!$('almaBkPanel'))fd.insertAdjacentHTML('afterend','<div class="panel" id="almaBkPanel" style="display:none"><div class="panelhead"><h2>🛟 Backups</h2><span class="tag">Solo Hernan</span></div><div id="almaBkBody"></div></div>');
 let ult=0;const o=window.switchPage;window.switchPage=(id,...a)=>{const r=o(id,...a);if(id==='tesoreria'){const p=$('almaBkPanel');if(p){p.style.display=almaEsHernan()?'':'none';if(almaEsHernan()&&Date.now()-ult>60000){ult=Date.now();almaBkRender()}}}return r}}

/* ---------- Compromiso con el operador a partir de la liquidación (al inscribir o desde Ver reserva) ---------- */
async function almaCompDesdeLiq(b,file,avisar){
 if(window.demoRole!=='socio'&&![b.salesperson,b.owner].includes(currentDemoOperator()))throw new Error('solo podés cargar la liquidación de tus propias reservas');
 const r=await window.almaLiq.leer(file),g=b.kind==='grupal'?findGroup(b.groupId):null;
 if(!isFinite(r.total))throw new Error('no se encontró el «Total neto agencia» en la liquidación');
 const n=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 let pr=(r.proveedor&&state.providers.find(p=>n(p.name).includes(n(r.proveedor))))||(g?.providerId&&state.providers.find(p=>p.id===g.providerId));
 if(!pr&&r.proveedor){if(window.demoRole!=='socio')throw new Error('el proveedor «'+r.proveedor+'» no está cargado en el sistema: pedile a un socio que lo dé de alta');pr={id:uid(),name:r.proveedor.toUpperCase(),category:'Operador mayorista'};state.providers.push(pr);audit('Proveedor creado','Proveedores',pr.name)}
 if(!pr)throw new Error('no se reconoció el proveedor en la liquidación');
 const key=b.kind==='grupal'?'G:'+b.groupId:'B:'+b.id;
 let e=state.expenses.find(x=>x.bookingId===b.id&&x.providerId===pr.id)||state.expenses.find(x=>b.kind!=='grupal'&&x.operationKey===key&&x.providerId===pr.id);
 const pag=e?paidSupplier(e):0;if(e&&r.total<pag-.001)throw new Error('la liquidación ('+money(r.total,r.moneda||e.currency)+') es menor a lo ya pagado ('+money(pag,e.currency)+')');
 const datos={providerId:pr.id,provider:pr.name,operationKey:key,bookingId:b.id,passengerId:b.passengerId,supplierRef:r.ref||'',category:'Operador mayorista',
  concept:b.client+' · '+(r.concepto||g?.name||trip(b)),amount:r.total,currency:r.moneda||cur(b),dueDate:r.vence||'',depositDueDate:'',depositAmount:'',notes:window.almaLiq.notas(r),auto:true,fromLiq:true};
 const nuevo=!e;if(e)Object.assign(e,datos);else{e={id:uid(),...datos,liquidaciones:[]};state.expenses.unshift(e)}
 audit(nuevo?'Compromiso desde liquidación':'Compromiso actualizado con la liquidación','Finanzas',pr.name+' · '+b.client+' · '+money(e.amount,e.currency));save();
 try{const name=await window.almaComprobantes.subir('liq-'+e.id,file);e.liquidaciones=[...(e.liquidaciones||[]),name];save()}catch(err){alert('El compromiso quedó cargado, pero no se pudo guardar el archivo de la liquidación: '+err.message)}
 render();if(window.currentGroupDetail)renderGroupDetail();
 if(avisar)notify((nuevo?'Compromiso cargado':'Compromiso actualizado')+' con '+pr.name+': '+money(e.amount,e.currency)+(e.dueDate?' · vence '+fmt(e.dueDate):''));
 if(r.match?.mejor&&r.match.mejor.b.id!==b.id)alert('Atención: la liquidación parece ser de '+r.match.mejor.p.name+', no de '+b.client+'. Revisá el compromiso.');
 return e}
window.almaCompDesdeLiqInp=async(id,inp)=>{const f=inp.files?.[0];inp.value='';const b=findBooking(id);if(!f||!b)return;const box=$('almaVRLiq');if(box)box.insertAdjacentHTML('beforeend','<span class="sub" id="almaVRLiqEst"> ⏳ Leyendo la liquidación…</span>');
 try{await almaCompDesdeLiq(b,f,true)}catch(e){alert('No se pudo cargar el compromiso: '+e.message)}
 if($('almaVerResDialog')?.open)almaVerReserva(id)};
// Inscribir en grupo: campo para la liquidación; al guardar se crea el compromiso del pasajero con ella
{const f=$('groupBookingForm'),ref=f?.querySelector('[name=notes]')?.closest('label');if(ref&&!$('almaInsLiq'))ref.insertAdjacentHTML('beforebegin',
 '<label class="field full alma-liq-top">📄 Liquidación del operador (opcional)<input type="file" id="almaInsLiq" accept="image/*,application/pdf"><small class="hint">Si la subís, al inscribir se crea solo el compromiso de pago con el operador (importe, file del proveedor y vencimiento leídos de la liquidación).</small></label>');
 let antes=null;f?.addEventListener('submit',()=>{antes=new Set(state.bookings.map(b=>b.id))},true);
 f?.addEventListener('submit',()=>{const inp=$('almaInsLiq'),file=inp?.files?.[0],a=antes;antes=null;if(!file||!a)return;inp.value='';
  setTimeout(async()=>{const b=state.bookings.find(x=>!a.has(x.id)&&x.kind==='grupal');if(!b)return;notify('⏳ Leyendo la liquidación…');
   try{await almaCompDesdeLiq(b,file,true)}catch(e){alert('El pasajero quedó inscripto, pero no se pudo cargar el compromiso desde la liquidación: '+e.message+'\nPodés cargarla desde 👁 Ver reserva.')}},200)})}
{const o=window.openGroupBooking;window.openGroupBooking=(...a)=>{const r=o(...a);const i=$('almaInsLiq');if(i)i.value='';return r}}

/* Cobro: medio de pago «Efectivo» por defecto (evita registrar transferencias por error) */
{const o=window.openPayment;window.openPayment=(...a)=>{const r=o(...a);const s=$('paymentForm')?.elements.method;if(s){s.value='Efectivo';s.dispatchEvent(new Event('change',{bubbles:true}))}return r}}
