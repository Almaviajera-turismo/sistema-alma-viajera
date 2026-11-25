/* Alma Viajera · Botón «Eliminar» (solo socios). Se inserta dentro del script principal (build.py),
   así usa el estado y las funciones del sistema. Reglas:
   - No se borra nada que tenga cobros o pagos registrados (ni recibos anulados: los recibos numerados no se borran).
   - Hay que escribir ELIMINAR para confirmar.
   - La bitácora del servidor registra quién borró y el registro completo. */
function almaEsSocio(){return window.demoRole==='socio'}
function almaDelBtn(fn,id,txt){return almaEsSocio()?'<button type="button" class="btn danger tiny" style="margin:6px 0" onclick="'+fn+'(&quot;'+id+'&quot;)">🗑 '+(txt||'Eliminar')+'</button>':''}
function almaNoSe(que,motivos){alert('No se puede eliminar '+que+':\n\n• '+motivos.join('\n• '));return false}
function almaConfirmar(titulo,detalle){return requireKeyword('ELIMINAR',titulo,detalle+'\n\nEsto no se puede deshacer. Queda registrado en la Bitácora.')}
function almaQuitar(arr,id){const i=arr.findIndex(x=>x.id===id);if(i>=0)arr.splice(i,1)}
function almaRecibos(bid){return state.payments.filter(p=>p.bookingId===bid)}
function almaCompromisosDe(key){return state.expenses.filter(e=>e.operationKey===key)}
function almaBorrarReserva(b){for(const f of state.flights.filter(f=>f.bookingId===b.id))almaQuitar(state.flights,f.id);for(const e of state.expenses.filter(e=>e.bookingId===b.id&&e.auto&&!state.supplierPayments.some(p=>p.expenseId===e.id)))almaQuitar(state.expenses,e.id);almaQuitar(state.bookings,b.id)}

window.almaEliminarPasajero=id=>{
 if(!adminOnly())return;
 const p=state.passengers.find(x=>x.id===id);if(!p)return;
 const titular=state.bookings.filter(b=>b.passengerId===id),acomp=state.bookings.filter(b=>(b.companions||[]).includes(id)),
       peds=state.orders.filter(o=>(o.travelers||[]).includes(id)),m=[];
 if(titular.length)m.push('Es titular de '+titular.length+' viaje/s ('+titular.map(b=>bookingFile(b)||b.tour).join(', ')+'). Eliminá o pasá esos viajes a otra ficha primero.');
 if(acomp.length)m.push('Es acompañante en '+acomp.length+' viaje/s. Quitalo desde «👥 Pasajeros» de cada viaje.');
 if(peds.length)m.push('Está agregado en '+peds.length+' pedido/s. Quitalo desde «👥 Pasajeros» del pedido.');
 if(m.length)return almaNoSe('a '+p.name,m);
 if(!almaConfirmar('Eliminar pasajero','Pasajero: '+p.name+'\nDocumento: '+(p.passportNumber||p.doc||'—')+'\nTambién se borran las fotos de su pasaporte.'))return;
 almaQuitar(state.passengers,id);save();
 window.almaBorrarDocsPasajero&&window.almaBorrarDocsPasajero(id);
 try{$('passengerProfileDialog')?.open&&closeDialog('passengerProfileDialog')}catch(e){}
 render();notify('Pasajero eliminado')};

window.almaEliminarViaje=id=>{
 if(!adminOnly())return;
 const b=findBooking(id);if(!b)return;
 const g=b.kind==='grupal'?findGroup(b.groupId):null,que=b.kind==='aereo'?'el aéreo de '+b.client:g?'la inscripción de '+b.client+' en '+g.name:'el viaje de '+b.client,m=[];
 const rec=almaRecibos(id),comp=[...almaCompromisosDe('B:'+id),...state.expenses.filter(e=>e.bookingId===id&&state.supplierPayments.some(p=>p.expenseId===e.id))];
 if(rec.length)m.push('Tiene '+rec.length+' recibo/s ('+rec.map(p=>p.number+(p.voidedAt?' anulado':'')).join(', ')+'). Los recibos numerados no se borran: dejá la reserva y anulá los recibos que estén mal'+(g?' (o dala de baja dentro de la salida).':'.'));
 if(comp.length)m.push('Tiene '+comp.length+' compromiso/s con proveedores. Eliminalos primero en Proveedores.');
 if(m.length)return almaNoSe(que,m);
 if(!almaConfirmar(b.kind==='aereo'?'Eliminar aéreo':g?'Eliminar inscripción a la salida':'Eliminar viaje individual','Pasajero: '+b.client+'\nFile: '+(b.fileNumber||bookingFile(b)||'—')+'\nViaje: '+(g?g.name:(b.tour||'—'))+((b.companions||[]).length?'\nCon: '+(b.companions||[]).map(i=>state.passengers.find(p=>p.id===i)?.name||'').join(', '):'')+'\nTotal: '+money(total(b),cur(b))))return;
 almaBorrarReserva(b);if(g&&g.rooms)g.rooms=g.rooms.filter(r=>state.bookings.some(x=>x.roomId===r.id));save();render();if(g&&window.currentGroupDetail===g.id)renderGroupDetail();notify(b.kind==='aereo'?'Aéreo eliminado':g?'Inscripción eliminada':'Reserva eliminada')};

window.almaEliminarSalida=id=>{
 if(!adminOnly())return;
 const g=findGroup(id);if(!g)return;
 const ins=state.bookings.filter(b=>b.groupId===id),peds=state.orders.filter(o=>o.groupId===id),comp=almaCompromisosDe('G:'+id),
       extras=(state.groupExtras||[]).filter(x=>x.groupId===id),m=[];
 if(ins.length)m.push('Tiene '+ins.length+' pasajero/s inscripto/s (aunque estén dados de baja).');
 if(peds.length)m.push('Tiene '+peds.length+' pedido/s asociado/s. Cambiales la salida o eliminá el vínculo editando el pedido.');
 if(comp.length)m.push('Tiene '+comp.length+' compromiso/s con proveedores. Eliminalos primero en Proveedores.');
 if(m.length)return almaNoSe('la salida '+g.name,m);
 if(!almaConfirmar('Eliminar salida grupal','Salida: '+g.name+'\nFile: '+(g.fileNumber||'—')+'\nFechas: '+fmt(g.departure)+' al '+fmt(g.returnDate)+(extras.length?'\nTambién se borran '+extras.length+' extra/s previsto/s de la salida.':'')))return;
 for(const x of extras)almaQuitar(state.groupExtras,x.id);
 almaQuitar(state.groups,id);save();
 try{if(window.currentGroupDetail===id&&window.closeGroupDetail)window.closeGroupDetail()}catch(e){}
 render();notify('Salida eliminada')};

window.almaEliminarCompromiso=id=>{
 if(!adminOnly())return;
 const e=state.expenses.find(x=>x.id===id);if(!e)return;
 const pagos=state.supplierPayments.filter(p=>p.expenseId===id);
 if(pagos.length)return almaNoSe('este compromiso',['Tiene '+pagos.length+' pago/s registrado/s. Eliminá primero esos pagos (más abajo, en «Historial de pagos a proveedores»).']);
 if(!almaConfirmar('Eliminar compromiso con proveedor','Proveedor: '+(e.provider||'—')+'\nConcepto: '+(e.concept||'—')+'\nOperación: '+operationTitle(e.operationKey)+'\nImporte: '+money(e.amount,e.currency)))return;
 almaQuitar(state.expenses,id);save();render();notify('Compromiso eliminado')};

window.almaEliminarPagoProveedor=id=>{
 if(!adminOnly())return;
 const p=state.supplierPayments.find(x=>x.id===id);if(!p)return;
 const e=state.expenses.find(z=>z.id===p.expenseId),mon=e?.currency||'USD';
 if(p.method==='Efectivo'){
  if(cashDaySession(p.cashbox,p.date)?.status==='cerrada')return almaNoSe('este pago',['Fue en efectivo y la caja de ese día ya está cerrada: borrarlo cambiaría un arqueo hecho. Registrá el ajuste como movimiento de caja.']);
  if(!requireCashOpen(p.cashbox,today()))return;
 }
 if(!almaConfirmar('Eliminar pago a proveedor','Proveedor: '+(e?.provider||'—')+'\nConcepto: '+(e?.concept||'—')+'\nFecha: '+fmt(p.date)+'\nImporte: '+money(p.amount,mon)+'\nMedio: '+p.method+' · '+cashboxName(p.cashbox)+'\nEl importe vuelve a quedar pendiente en el compromiso'+(p.method==='Efectivo'?' y se devuelve al efectivo esperado de la caja.':' y se recalcula el saldo del banco.')))return;
 almaQuitar(state.supplierPayments,id);save();render();notify('Pago eliminado')};

window.almaEliminarPedido=id=>{
 if(!adminOnly())return;
 const o=findOrder(id);if(!o)return;
 const res=state.bookings.filter(b=>b.sourceOrderId===id);
 if(res.length)return almaNoSe('este pedido',['Ya se convirtió en '+res.length+' reserva/s ('+res.map(b=>b.fileNumber||bookingFile(b)||b.tour).join(', ')+'). Eliminá primero la reserva, o dejá el pedido como «Cancelado».']);
 const sib=state.orders.filter(x=>x.optionGroup&&x.optionGroup===o.optionGroup&&x.id!==id);
 if(!almaConfirmar('Eliminar pedido de cotización','Cliente: '+o.client+'\nDestino: '+(o.destination||'—')+'\nFecha del pedido: '+fmt(o.date)+(o.quote?'\nTiene una cotización armada: también se borra.':'')+(sib.length?'\nEs una de '+(sib.length+1)+' opciones: las otras quedan.':'')))return;
 almaQuitar(state.orders,id);save();render();notify('Pedido eliminado')};
