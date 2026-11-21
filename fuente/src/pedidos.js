/* Alma Viajera · Pedidos: filtro por estado, botón «Pedidos cancelados» (los cancelados salen de la lista principal),
   cotizaciones pendientes primero (la más antigua arriba) y en rojo si pasan más de 2 días sin enviar.
   Las enviadas siguen en violeta (clase alma-enviada). Se inserta dentro del script principal (build.py). */
window.almaPedEstado=window.almaPedEstado||'';
const ALMA_PED_PEND=['Pendiente','En preparación'];
function almaPedidoPend(o){return ALMA_PED_PEND.includes(o.status||'Pendiente')}
function almaPedidoFiltro(o){const f=window.almaPedEstado||'';
 if(f==='cancelado')return o.status==='Cancelado';
 if(o.status==='Cancelado')return false;
 if(f==='pendiente')return almaPedidoPend(o);
 if(f==='enviada')return o.status==='Cotización enviada';
 return true}
function almaPedidoDias(o){if(!o.date)return 0;const d=Math.floor((Date.parse(today())-Date.parse(o.date))/864e5);return isNaN(d)?0:d}
function almaPedidoAtrasado(o){return almaPedidoPend(o)&&almaPedidoDias(o)>2}
function almaPedidoClase(o){return o.status==='Cotización enviada'?' class="alma-enviada"':almaPedidoAtrasado(o)?' class="alma-atrasado"':''}
function almaPedidoAviso(o){if(!almaPedidoPend(o))return '';const d=almaPedidoDias(o);
 return '<span class="sub" style="'+(d>2?'color:#b42318;font-weight:700':'')+'">⏰ Sin enviar '+(d<=0?'· llegó hoy':d===1?'hace 1 día':'hace '+d+' días')+'</span>'}
function almaPedidosOrden(records){
 const b=$('almaPedCancBtn');if(b&&window.almaPedEstado!=='cancelado'){const n=state.orders.filter(o=>o.status==='Cancelado').length;b.textContent='Pedidos cancelados'+(n?' ('+n+')':'')}
 const grupos=[],idx=new Map();
 records.forEach((r,i)=>{const g=optionGroupOf(r);if(!idx.has(g)){idx.set(g,grupos.length);grupos.push({i,list:[]})}grupos[idx.get(g)].list.push(r)});
 for(const g of grupos){const p=g.list.filter(almaPedidoPend).map(o=>o.date||'9999-12-31').sort();g.key=p.length?p[0]:null}
 const pend=grupos.filter(g=>g.key!==null).sort((a,b)=>a.key.localeCompare(b.key)||b.i-a.i),resto=grupos.filter(g=>g.key===null);
 return [...pend,...resto].flatMap(g=>g.list)}
window.almaPedFiltrar=v=>{window.almaPedEstado=v||'';const s=$('almaPedFiltro');if(s)s.value=window.almaPedEstado;
 const b=$('almaPedCancBtn');if(b){b.textContent=v==='cancelado'?'← Volver a pedidos':'Pedidos cancelados';b.classList.toggle('ghost',v!=='cancelado')}
 const h=document.querySelector('#pedidos .panelhead h2');if(h)h.textContent=v==='cancelado'?'Pedidos cancelados':'Pedidos de cotización';
 renderOrders()};
window.almaPedCancelados=()=>almaPedFiltrar(window.almaPedEstado==='cancelado'?'':'cancelado');
