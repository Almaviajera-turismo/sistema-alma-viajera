/* Alma Viajera · Cotizador: flyer de cotización desde cada pedido (lo arma build.py) */
(() => {
'use strict';
const W=2000,H=1500,FONT='"AV Inter"';
const C={petrol:'#12506f',petrolDark:'#0b3d55',teal:'#1f8fa8',tealPill:'#2a9db4',gray:'#4f5f6a',slate:'#4d6472',line:'#a9d6e0'};
const IMG={};const photos={destino:null,hotel:null};
function loadImg(src){return new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ko;i.src=src})}

/* ---------- utilidades de dibujo ---------- */
function font(size,weight){return weight+' '+size+'px '+FONT}
function tw(ctx,s,size,weight,cond){ctx.font=font(size,weight);return ctx.measureText(s).width*cond}
function txt(ctx,s,x,y,o){o=Object.assign({size:40,weight:400,color:'#000',cond:1,align:'left',max:0,min:0},o);if(!o.min)o.min=Math.round(o.size*.72);
 let size=o.size;s=String(s);if(o.max){while(size>o.min&&tw(ctx,s,size,o.weight,o.cond)>o.max)size-=1;
  if(tw(ctx,s,size,o.weight,o.cond)>o.max){while(s.length>1&&tw(ctx,s+'…',size,o.weight,o.cond)>o.max)s=s.slice(0,-1);s=s.trimEnd()+'…'}}
 const w=tw(ctx,s,size,o.weight,o.cond);let x0=x;if(o.align==='right')x0=x-w;else if(o.align==='center')x0=x-w/2;
 ctx.save();ctx.fillStyle=o.color;ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.translate(x0,y);ctx.scale(o.cond,1);ctx.fillText(s,0,0);ctx.restore();return {w,size}}
function wrap(ctx,s,maxW,size,weight,cond){const words=String(s||'').split(/\s+/).filter(Boolean),lines=[];let cur='';
 for(const w of words){const t=cur?cur+' '+w:w;if(tw(ctx,t,size,weight,cond)<=maxW)cur=t;else{if(cur)lines.push(cur);cur=w}}if(cur)lines.push(cur);return lines}
/* Título que entra en 1 o 2 renglones con el mayor tamaño posible */
function fitTitle(ctx,s,maxW,maxSize,minSize,weight,cond,maxLines){s=String(s||'').trim();
 for(let size=maxSize;size>=minSize;size-=2){const L=wrap(ctx,s,maxW,size,weight,cond);if(L.length<=maxLines&&L.every(l=>tw(ctx,l,size,weight,cond)<=maxW))return {lines:L,size}}
 return {lines:wrap(ctx,s,maxW,minSize,weight,cond).slice(0,maxLines),size:minSize}}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function cover(ctx,img,x,y,w,h,fx=.5,fy=.5){const s=Math.max(w/img.width,h/img.height),sw=w/s,sh=h/s;ctx.drawImage(img,(img.width-sw)*fx,(img.height-sh)*fy,sw,sh,x,y,w,h)}
function pill(ctx,x,y,w,h,text,size){const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#33a9bf');g.addColorStop(1,'#1f8ea6');
 ctx.save();ctx.shadowColor='rgba(15,80,110,.25)';ctx.shadowBlur=14;ctx.shadowOffsetY=4;rr(ctx,x,y,w,h,h/2);ctx.fillStyle=g;ctx.fill();ctx.restore();
 txt(ctx,text,x+w/2,y+h/2+size*.36,{size,weight:700,color:'#fff',cond:.86,align:'center',max:w-50})}
function darkBox(ctx,x,y,w,h,r){const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#13607f');g.addColorStop(1,'#0b3a52');
 ctx.save();ctx.shadowColor='rgba(10,40,60,.3)';ctx.shadowBlur=24;ctx.shadowOffsetY=8;rr(ctx,x,y,w,h,r);ctx.fillStyle=g;ctx.fill();ctx.restore()}
function card(ctx,x,y,w,h,r,alpha=.96){ctx.save();ctx.shadowColor='rgba(20,60,90,.22)';ctx.shadowBlur=36;ctx.shadowOffsetY=12;rr(ctx,x,y,w,h,r);ctx.fillStyle='rgba(255,255,255,'+alpha+')';ctx.fill();ctx.restore()}
function hline(ctx,x1,x2,y,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();ctx.restore()}
function vline(ctx,x,y1,y2,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2);ctx.stroke();ctx.restore()}
function wave(ctx){ctx.save();
 let g=ctx.createLinearGradient(0,1300,900,1500);g.addColorStop(0,'rgba(120,205,220,.55)');g.addColorStop(1,'rgba(60,170,195,.3)');
 ctx.beginPath();ctx.moveTo(0,1275);ctx.bezierCurveTo(250,1290,600,1360,960,1500);ctx.lineTo(0,1500);ctx.closePath();ctx.fillStyle=g;ctx.fill();
 g=ctx.createLinearGradient(0,1310,0,1500);g.addColorStop(0,'#2b9fb6');g.addColorStop(1,'#0e6585');
 ctx.beginPath();ctx.moveTo(0,1310);ctx.bezierCurveTo(230,1325,560,1390,880,1500);ctx.lineTo(0,1500);ctx.closePath();ctx.fillStyle=g;ctx.fill();
 ctx.globalAlpha=.14;ctx.strokeStyle='#fff';ctx.lineWidth=2;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(0,1345+i*26);ctx.bezierCurveTo(210,1362+i*24,480,1420+i*14,760-i*60,1500);ctx.stroke()}
 ctx.restore()}
function fadeLeft(ctx,stops){const g=ctx.createLinearGradient(0,0,W,0);for(const [p,a] of stops)g.addColorStop(p,'rgba(255,255,255,'+a+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function drawLogo(ctx,x,y,w){const l=IMG.logo;ctx.drawImage(l,x,y,w,w*l.height/l.width)}

/* ---------- formato ---------- */
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function pd(s){if(!s)return null;const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function rango(a,b){const A=pd(a),B=pd(b);if(!A)return [];if(!B)return [A.getDate()+' de '+MESES[A.getMonth()]+' de '+A.getFullYear()];
 if(A.getFullYear()===B.getFullYear()&&A.getMonth()===B.getMonth())return ['Del '+A.getDate()+' al '+B.getDate()+' de '+MESES[B.getMonth()],'de '+B.getFullYear()];
 if(A.getFullYear()===B.getFullYear())return [A.getDate()+' de '+MESES[A.getMonth()]+' al '+B.getDate()+' de '+MESES[B.getMonth()],'de '+B.getFullYear()];
 return [A.getDate()+' de '+MESES[A.getMonth()]+' de '+A.getFullYear(),'al '+B.getDate()+' de '+MESES[B.getMonth()]+' de '+B.getFullYear()]}
function corta(s){const d=pd(s);return d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getFullYear()).slice(2):''}
function money(n,c){n=Number(n||0);const ent=Math.round(n)===n;return c+' '+n.toLocaleString('es-AR',{minimumFractionDigits:ent?0:2,maximumFractionDigits:2})}
function noches(d){if(d.noches)return Number(d.noches);const A=pd(d.desde),B=pd(d.hasta);return A&&B?Math.round((B-A)/86400000):0}
function up(s){return String(s||'').toUpperCase()}

function incluye(d){const n=noches(d);const items=[];
 if(n||d.hotel)items.push({t:(n?n+' noches de estadía':'Estadía'),s:[d.hotel,d.regimen].filter(Boolean).join(' • ')});
 for(const line of (d.incluye||'').split('\n')){const l=line.trim();if(!l)continue;const [t,s]=l.split('|');items.push({t:t.trim(),s:(s||'').trim()})}
 return items.slice(0,4)}
/* ---------- lámina 1 ---------- */
function slide1(ctx,d){const n=noches(d);
 ctx.clearRect(0,0,W,H);cover(ctx,photos.destino||IMG.bgBeach,0,0,W,H,.65,.5);
 fadeLeft(ctx,[[0,.97],[.2,.93],[.33,.7],[.5,.18],[.62,0]]);
 wave(ctx);
 drawLogo(ctx,80,185,400);
 txt(ctx,'Cotización de viaje a',66,452,{size:48,weight:500,color:C.teal,cond:.9,max:470});
 const t=fitTitle(ctx,up(d.destino||'Destino'),480,124,64,800,.8,2);let y=452;
 for(const l of t.lines){y+=t.size*1.0+(t.lines.length>1?0:6);txt(ctx,l,58,y,{size:t.size,weight:800,color:C.petrol,cond:.8})}
 y+=38;
 const pillTxt=[n?n+' noches':'',d.regimen].filter(Boolean).join('  •  ');
 if(pillTxt){pill(ctx,45,y,490,76,pillTxt,44);y+=76}
 y+=72;for(const l of rango(d.desde,d.hasta)){txt(ctx,l,68,y,{size:50,weight:700,color:'#17465f',cond:.86,max:470});y+=56}
 y+=8;if(d.cliente){txt(ctx,'Para '+d.cliente,68,y,{size:38,weight:600,color:'#17465f',cond:.88,max:470,min:28});y+=50}
 txt(ctx,d.pax+(d.pax>1?' pasajeros':' pasajero'),68,y,{size:38,weight:400,color:C.gray,cond:.9,max:470});
 // precio
 const by=Math.max(y+36,960),bh=(d.pax>1&&d.precio)||d.base?222:186;darkBox(ctx,40,by,505,bh,24);
 txt(ctx,'TARIFA FINAL POR PASAJERO',78,by+52,{size:36,weight:500,color:'#fff',cond:.86,max:440});
 txt(ctx,d.precio?money(d.precio,d.moneda):'A confirmar',76,by+146,{size:100,weight:800,color:'#fff',cond:.84,max:440});
 if(d.pax>1&&d.precio)txt(ctx,d.pax+' pasajeros  •  Total '+money(d.precio*d.pax,d.moneda),78,by+196,{size:36,weight:400,color:'#e6f2f6',cond:.9,max:440});
 else if(d.base)txt(ctx,d.base,78,by+196,{size:34,weight:400,color:'#e6f2f6',cond:.9,max:440});
 // tarjeta hotel
 const cx=560,cy=255,cw=1385,ch=935;card(ctx,cx,cy,cw,ch,36);
 ctx.save();rr(ctx,cx+16,cy+17,715,ch-34,28);ctx.clip();if(photos.hotel)cover(ctx,photos.hotel,cx+16,cy+17,715,ch-34);else{const g=ctx.createLinearGradient(cx,cy,cx+715,cy+ch);g.addColorStop(0,'#cfe9f0');g.addColorStop(1,'#8ccbdb');ctx.fillStyle=g;ctx.fillRect(cx+16,cy+17,715,ch-34);txt(ctx,'Subí la foto del hotel',cx+16+357,cy+ch/2,{size:44,weight:600,color:'#ffffff',cond:.9,align:'center'})};ctx.restore();
 const rx=1328,rw=585;let ry=338;
 txt(ctx,'OPCIÓN DE HOSPEDAJE EN',rx,ry,{size:40,weight:700,color:C.teal,cond:.84,max:rw});
 const ht=fitTitle(ctx,up(d.hotel||'Hotel'),rw,100,56,800,.8,2);ry+=10;
 for(const l of ht.lines){ry+=ht.size*.98;txt(ctx,l,rx-2,ry,{size:ht.size,weight:800,color:C.petrol,cond:.8})}
 if(d.zona){ry+=62;txt(ctx,d.zona,rx,ry,{size:42,weight:600,color:C.slate,cond:.86,max:rw})}
 ry+=40;hline(ctx,rx,rx+rw,ry,C.line);ry+=32;
 const p2=[d.regimen,n?n+' noches':''].filter(Boolean).join('  •  ');if(p2){pill(ctx,rx-6,ry,rw+10,80,p2,44);ry+=80}
 if(d.destacados){ry+=74;txt(ctx,d.destacados.split('·').map(s=>s.trim()).filter(Boolean).join('  •  '),rx,ry,{size:40,weight:700,color:'#17465f',cond:.84,max:rw})}
 if(d.descripcion){ry+=44;hline(ctx,rx,rx+rw,ry,C.line);ry+=20;
  const L=wrap(ctx,d.descripcion,rw,39,400,.9);const maxL=Math.max(1,Math.floor((cy+ch-40-ry)/50));
  L.slice(0,maxL).forEach((l,i)=>txt(ctx,l,rx,ry+52+i*50,{size:39,weight:400,color:C.gray,cond:.9}))}
 if(photos.hotel)txt(ctx,'Imágenes hoteleras ilustrativas',1935,1415,{size:30,weight:500,color:'#17465f',cond:.9,align:'right'});
}

/* ---------- lámina 2 ---------- */
function leg(ctx,x,y,w,h,label,L){card(ctx,x,y,w,h,28,.97);
 ctx.save();rr(ctx,x+20,y+20,205,h-40,22);ctx.fillStyle='#1f8fa8';ctx.fill();ctx.restore();
 txt(ctx,label,x+46,y+96,{size:label.length>4?44:50,weight:700,color:'#fff',cond:.84,max:165});
 txt(ctx,corta(L.fecha),x+46,y+166,{size:40,weight:600,color:'#fff',cond:.86,max:165});
 if(L.tipo)txt(ctx,up(L.tipo),x+46,y+216,{size:25,weight:600,color:'#eaf6f9',cond:.84,max:165});
 const ix=x+255,iw=w-255-32;
 txt(ctx,up(L.orig),ix,y+70,{size:32,weight:700,color:'#17465f',cond:.84,max:iw/2-10});
 txt(ctx,up(L.dest),ix+iw,y+70,{size:32,weight:700,color:'#17465f',cond:.84,align:'right',max:iw/2-10});
 const a=txt(ctx,L.sale||'--:--',ix,y+144,{size:58,weight:700,color:C.teal,cond:.86});
 const b=txt(ctx,L.llega||'--:--',ix+iw,y+144,{size:58,weight:700,color:C.teal,cond:.86,align:'right'});
 hline(ctx,ix+a.w+22,ix+iw-b.w-22,y+124,C.teal);
 hline(ctx,ix,ix+iw,y+182,'#d5e3ea');
 txt(ctx,'AEROLÍNEA',ix,y+232,{size:23,weight:600,color:'#3f5664',cond:.86});
 txt(ctx,up(L.aero),ix,y+278,{size:38,weight:700,color:'#17465f',cond:.84,max:260});
 if(L.vuelo){txt(ctx,'VUELO',ix+275,y+232,{size:23,weight:600,color:'#3f5664',cond:.86});txt(ctx,up(L.vuelo),ix+275,y+278,{size:38,weight:700,color:'#17465f',cond:.84,max:iw-280})}
}
function slide2(ctx,d){
 ctx.clearRect(0,0,W,H);cover(ctx,IMG.bgPlane,0,0,W,H,.5,.5);fadeLeft(ctx,[[0,.9],[.3,.75],[.55,.25],[.7,0]]);wave(ctx);
 const hayVuelo=!!(d.iFecha||d.iOrig||d.iSale);let y;
 drawLogo(ctx,70,118,330);
 if(hayVuelo){
  txt(ctx,'Detalle del aéreo',485,168,{size:100,weight:800,color:C.petrol,cond:.8});
  txt(ctx,[up(d.aerolinea),d.tipoVuelo].filter(Boolean).join('  •  '),487,238,{size:50,weight:500,color:C.teal,cond:.88,max:1000});
  const tipoLeg=d.tipoVuelo==='Con escalas'?'Con escalas':'Vuelo directo';
  const ida={fecha:d.iFecha,orig:d.iOrig,dest:d.iDest,sale:d.iSale,llega:d.iLlega,vuelo:d.iVuelo,aero:d.aerolinea,tipo:tipoLeg};
  const reg={fecha:d.rFecha,orig:d.rOrig,dest:d.rDest,sale:d.rSale,llega:d.rLlega,vuelo:d.rVuelo,aero:d.aerolinea,tipo:tipoLeg};
  if(d.rFecha||d.rSale){leg(ctx,55,300,915,310,'IDA',ida);leg(ctx,1032,300,915,310,'REGRESO',reg)}else leg(ctx,55,300,1100,310,'IDA',ida);
  y=715;
 }else y=560;
 txt(ctx,'Tu viaje a '+up(d.destino||'destino'),62,y,{size:64,weight:700,color:'#17465f',cond:.84,max:1300});
 txt(ctx,'Todo lo que está incluido',64,y+58,{size:50,weight:400,color:C.teal,cond:.88});
 let extra=d.equipaje?1:0;
 // incluye
 const items=incluye(d);const iy=y+92;
 if(items.length){ctx.save();rr(ctx,58,iy,1888,158,26);ctx.fillStyle='rgba(228,245,250,.9)';ctx.fill();ctx.strokeStyle='rgba(150,205,220,.8)';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  const cw=1888/items.length,k=items.length>3?.82:1;items.forEach((it,i)=>{const x=58+i*cw;if(i)vline(ctx,x,iy+28,iy+130,'#a9cfdc');
   ctx.beginPath();ctx.arc(x+30+44*k,iy+79,44*k,0,Math.PI*2);ctx.fillStyle='#1f8fa8';ctx.fill();
   txt(ctx,String(i+1).padStart(2,'0'),x+30+44*k,iy+79+14*k,{size:38*k,weight:700,color:'#fff',cond:.9,align:'center'});
   const tx=x+30+88*k+22,tmax=cw-(tx-x)-22;
   if(it.s){txt(ctx,up(it.t),tx,iy+70,{size:38,weight:700,color:'#17465f',cond:.84,max:tmax});txt(ctx,it.s,tx,iy+118,{size:34,weight:400,color:C.gray,cond:.88,max:tmax})}
   else txt(ctx,up(it.t),tx,iy+92,{size:38,weight:700,color:'#17465f',cond:.84,max:tmax})})}
 // precio
 const py=iy+(items.length?205:0),ph=150;darkBox(ctx,58,py,1888,ph,24);
 const cols=[];cols.push({l:'VALOR FINAL POR PASAJERO',v:d.precio?money(d.precio,d.moneda):'A confirmar'});
 if(d.pax>1&&d.precio)cols.push({l:'TOTAL PARA '+d.pax+' PASAJEROS',v:money(d.precio*d.pax,d.moneda)});
 let x=95;cols.forEach((c,i)=>{if(i)vline(ctx,x-38,py+28,py+122,'rgba(255,255,255,.55)');txt(ctx,c.l,x,py+52,{size:34,weight:500,color:'#e8f3f7',cond:.86,max:470});txt(ctx,c.v,x,py+126,{size:74,weight:800,color:'#fff',cond:.84,max:470});x+=565});
 if(d.condicion){vline(ctx,x-38,py+28,py+122,'rgba(255,255,255,.55)');const cw2=1946-30-x;const L=wrap(ctx,d.condicion,cw2,34,400,.88).slice(0,3);
  const lh=44,top=py+ph/2-(L.length*lh)/2+32;L.forEach((l,i)=>txt(ctx,l,x,top+i*lh,{size:34,weight:400,color:'#fff',cond:.88}))}
 // notas y cierre
 const notas=(d.notas||'').split('\n').map(s=>s.trim()).filter(Boolean);
 if(d.equipaje)notas.unshift('Equipaje: '+d.equipaje+'.');
 if(d.validez)notas.push('Cotización válida hasta el '+corta(d.validez).replace(/\/(\d\d)$/,'/20$1')+'.');
 let ny=py+ph+70;const nmax=1500-ny;const lines=[];for(const n of notas){wrap(ctx,n,1700,34,400,.9).forEach((l,i)=>lines.push({l,first:i===0}))}
 const shown=lines.slice(0,Math.max(0,Math.floor((1395-ny)/46)));
 if(shown.length){vline(ctx,92,ny-36,ny+(shown.length-1)*46+12,C.teal);shown.forEach((o,i)=>{if(o.first){ctx.beginPath();ctx.arc(160,ny+i*46-11,7,0,7);ctx.fillStyle='#17465f';ctx.fill()}txt(ctx,o.l,182,ny+i*46,{size:34,weight:400,color:'#17465f',cond:.9})})}
 if(d.vendedor||d.contacto){const s=[d.vendedor?'Te atiende '+d.vendedor:'',d.contacto].filter(Boolean).join('  ·  ');
  ctx.save();const w=tw(ctx,s,34,600,.9)+60;rr(ctx,1946-w,1388,w,70,35);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();ctx.restore();
  txt(ctx,s,1946-30,1434,{size:34,weight:600,color:C.petrol,cond:.9,align:'right'})}
}

function b64bytes(u){const s=atob(u.split(',')[1]),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
/* PDF mínimo: una lámina JPEG por página (800×600 pt) */
function buildPdf(jpgs,pw,ph){const enc=new TextEncoder(),parts=[],offs=[];let len=0;
 const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);len+=b.length};
 const obj=(n,body)=>{offs[n]=len;push(n+' 0 obj\n');for(const b of body)push(b);push('\nendobj\n')};
 push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');const N=jpgs.length,kids=[];
 for(let i=0;i<N;i++)kids.push((3+i*3)+' 0 R');
 obj(1,['<< /Type /Catalog /Pages 2 0 R >>']);obj(2,['<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+N+' >>']);
 jpgs.forEach((j,i)=>{const p=3+i*3,im=p+1,ct=p+2;const content='q '+pw+' 0 0 '+ph+' 0 0 cm /Im0 Do Q';
  obj(p,['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pw+' '+ph+'] /Resources << /XObject << /Im0 '+im+' 0 R >> >> /Contents '+ct+' 0 R >>']);
  obj(im,['<< /Type /XObject /Subtype /Image /Width '+j.w+' /Height '+j.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+j.b.length+' >>\nstream\n',j.b,'\nendstream']);
  obj(ct,['<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream'])});
 const xref=len,total=3+N*3;let x='xref\n0 '+total+'\n0000000000 65535 f \n';for(let i=1;i<total;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
 push(x+'trailer\n<< /Size '+total+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');return new Blob(parts,{type:'application/pdf'})}

const FORM_HTML=`<form id="cotForm" autocomplete="off">
 <fieldset><legend>Pasajero</legend><div class="grid">
  <label class="full">Nombre del pasajero<input name="cliente" placeholder="María del Carmen Fuertes"></label>
  <label>Cantidad de pasajeros<input name="pax" type="number" min="1" value="1"></label>
  <label>Base de habitación<input name="base" placeholder="Base doble"></label>
 </div></fieldset>

 <fieldset><legend>Destino y fechas</legend><div class="grid">
  <label class="full">Destino<input name="destino" placeholder="Maragogi"></label>
  <label>Desde<input name="desde" type="date"></label>
  <label>Hasta<input name="hasta" type="date"></label>
  <label>Noches<input name="noches" type="number" min="0" placeholder="auto"></label>
  <label>Régimen<input name="regimen" list="cotRegimenes" placeholder="All Inclusive"></label>
  <datalist id="cotRegimenes"><option>All Inclusive</option><option>Todo incluido</option><option>Con desayuno</option><option>Media pensión</option><option>Pensión completa</option><option>Solo alojamiento</option></datalist>
  <label class="full">Foto del destino (fondo)<input name="fotoDestino" type="file" accept="image/*"><span class="hint" id="cotInfoDestino"></span></label>
 </div></fieldset>

 <fieldset><legend>Hotel</legend><div class="grid">
  <label class="full">Nombre del hotel<input name="hotel" placeholder="Grand Oca Maragogi"></label>
  <label class="full">Zona / ubicación<input name="zona" placeholder="Maragogi · Ponta de Mangue"></label>
  <label class="full">Destacados (separados por «·»)<input name="destacados" placeholder="Resort frente al mar · ideal para familias"></label>
  <label class="full">Descripción breve<textarea name="descripcion" maxlength="260"></textarea></label>
  <label class="full">Foto del hotel<input name="fotoHotel" type="file" accept="image/*"><span class="hint" id="cotInfoHotel"></span></label>
 </div></fieldset>

 <fieldset><legend>Precio</legend><div class="grid">
  <label>Moneda<select name="moneda"><option>USD</option><option>ARS</option><option>EUR</option></select></label>
  <label>Tarifa final por pasajero<input name="precio" type="number" min="0" step="0.01"></label>
  <label class="full">Condición de la tarifa<textarea name="condicion">Tarifa sujeta a disponibilidad al momento de la reserva y/o emisión de los pasajes aéreos.</textarea></label>
 </div></fieldset>

 <fieldset><legend>Aéreo</legend><div class="grid">
  <label>Aerolínea<input name="aerolinea" placeholder="LATAM"></label>
  <label>Tipo<select name="tipoVuelo"><option>Vuelos directos</option><option>Con escalas</option><option>Vuelo directo</option></select></label>
  <label class="full">Equipaje<input name="equipaje" placeholder="Equipaje en bodega · sin carry"></label>
 </div>
  <div class="leg"><b>IDA</b>
   <label>Fecha<input name="iFecha" type="date"></label>
   <label>Origen<input name="iOrig" placeholder="Buenos Aires (EZE)"></label>
   <label>Destino<input name="iDest" placeholder="Recife (REC)"></label>
   <label>Sale<input name="iSale" type="time"></label>
   <label>Llega<input name="iLlega" type="time"></label>
   <label>Vuelo<input name="iVuelo" placeholder="LA 8161"></label>
  </div>
  <div class="leg"><b>REGRESO</b>
   <label>Fecha<input name="rFecha" type="date"></label>
   <label>Origen<input name="rOrig" placeholder="Recife (REC)"></label>
   <label>Destino<input name="rDest" placeholder="Buenos Aires (EZE)"></label>
   <label>Sale<input name="rSale" type="time"></label>
   <label>Llega<input name="rLlega" type="time"></label>
   <label>Vuelo<input name="rVuelo" placeholder="LA 8160"></label>
  </div>
  <p class="hint">Si no hay aéreo, dejá vacía la ida y la lámina 2 muestra solo lo incluido y el precio.</p>
 </fieldset>

 <fieldset><legend>Qué incluye</legend>
  <label>Un servicio por renglón · «Título | detalle» (máx. 4)<textarea name="incluye" style="min-height:96px" placeholder="Traslados privados | Entrada y salida&#10;Asistencia al viajero"></textarea></label>
  <p class="hint">La estadía (noches + hotel + régimen) se agrega sola como primer ítem.</p>
 </fieldset>

 <fieldset><legend>Cierre</legend><div class="grid">
  <label class="full">Notas (una por renglón)<textarea name="notas" placeholder="La seña corresponde a la emisión de los pasajes aéreos, necesaria para congelar la tarifa."></textarea></label>
  <label>Válida hasta<input name="validez" type="date"></label>
  <label>Vendedor<input name="vendedor" placeholder="Hernan Ruiz"></label>
  <label class="full">Contacto del vendedor<input name="contacto" placeholder="hernan@almaviajeraturismo.com"></label>
 </div></fieldset>
</form>`;

/* ---------- ventana «Cotizar» dentro del sistema ---------- */
const BASE = 'cotizador/';
let ui = null, cur = null, dirty = false, assetsReady = null;
const photoFiles = { destino: null, hotel: null };   // archivo nuevo elegido (se sube al guardar)
const photoUrls = { destino: '', hotel: '' };         // dirección ya guardada
const $c = id => document.getElementById(id);
const app = () => window.__ALMA_APP;
const perfil = () => (window.almaPerfil ? window.almaPerfil() : {}) || {};
const esc2 = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function loadAssets() {
  if (assetsReady) return assetsReady;
  assetsReady = (async () => {
    const fonts = [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold']];
    await Promise.all(fonts.map(async ([w, n]) => {
      const f = new FontFace('AV Inter', 'url(' + BASE + 'inter-' + n + '.woff)', { weight: String(w) });
      await f.load(); document.fonts.add(f);
    }));
    const [logo, bgBeach, bgPlane] = await Promise.all(['logo.png', 'bg-beach.jpg', 'bg-plane.jpg'].map(f => loadImg(BASE + f)));
    Object.assign(IMG, { logo, bgBeach, bgPlane });
  })();
  assetsReady.catch(() => { assetsReady = null; });
  return assetsReady;
}
function loadRemote(url) {
  return new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = ko; i.src = url; });
}

function buildUI() {
  const d = document.createElement('dialog');
  d.id = 'almaCotDialog'; d.className = 'dialog alma-cot';
  d.innerHTML = '<div class="modalhead"><h2 id="cotTitulo">Cotización</h2><div class="actionset">'
    + '<button type="button" class="btn ghost tiny" id="cotCerrar">✕ Cerrar</button></div></div>'
    + '<div class="cot-body">' + FORM_HTML
    + '<section class="cot-prev"><div class="cot-acciones">'
    + '<button type="button" class="btn" id="cotGuardar">Guardar cotización</button>'
    + '<button type="button" class="btn ghost" id="cotCompartir" hidden>📤 Compartir imágenes</button>'
    + '<button type="button" class="btn ghost" id="cotPng">↓ Imágenes</button>'
    + '<button type="button" class="btn ghost" id="cotPdf">↓ PDF</button>'
    + '<button type="button" class="btn ghost" id="cotEnviada">✓ Marcar enviada</button>'
    + '<span id="cotEstado" class="sub"></span></div>'
    + '<canvas id="cotC0" width="2000" height="1500"></canvas><canvas id="cotC1" width="2000" height="1500"></canvas></section></div>';
  document.body.appendChild(d);
  const form = $c('cotForm');
  ui = { d, form, cv: [$c('cotC0'), $c('cotC1')] };
  let raf = 0;
  form.addEventListener('input', e => { if (e.target.type === 'file') return; dirty = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
  form.addEventListener('submit', e => e.preventDefault());
  for (const k of ['destino', 'hotel']) {
    const inp = form.elements['foto' + k[0].toUpperCase() + k.slice(1)];
    inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const blob = await shrink(f);
        photoFiles[k] = blob; photos[k] = await loadImg(URL.createObjectURL(blob)); dirty = true;
        info(k, 'Foto nueva (se guarda al tocar «Guardar cotización»)'); draw();
      } catch (e) { alert('No se pudo leer la foto: ' + e.message); }
    });
  }
  $c('cotCerrar').onclick = () => close();
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  $c('cotGuardar').onclick = () => guardar();
  $c('cotPng').onclick = () => bajarPng();
  $c('cotPdf').onclick = () => { draw(); bajar(pdfBlob(), nombre() + '.pdf'); };
  $c('cotEnviada').onclick = () => marcarEnviada();
  if (navigator.canShare) { $c('cotCompartir').hidden = false; $c('cotCompartir').onclick = () => compartir(); }
}
function info(k, t) { const el = $c(k === 'destino' ? 'cotInfoDestino' : 'cotInfoHotel'); if (el) el.textContent = t; }
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
}
function data() {
  const o = {};
  for (const el of ui.form.elements) { if (!el.name || el.type === 'file') continue; o[el.name] = el.value.trim(); }
  o.pax = Math.max(1, Number(o.pax) || 1); return o;
}
function fill(o) { for (const el of ui.form.elements) { if (el.name && el.type !== 'file' && o[el.name] !== undefined && o[el.name] !== null) el.value = o[el.name]; } }
function draw() { const d = data(); slide1(ui.cv[0].getContext('2d'), d); slide2(ui.cv[1].getContext('2d'), d); }
function order() { return app()?.getState().orders.find(x => x.id === cur); }
function nombre() {
  const d = data();
  return ('Cotizacion ' + (d.destino || '') + ' ' + (d.cliente || '')).trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/_+$/, '');
}
function estado(t) { $c('cotEstado').textContent = t || ''; }

window.almaCotizar = async id => {
  if (!ui) buildUI();
  const o = app()?.getState().orders.find(x => x.id === id);
  if (!o) return;
  cur = id; dirty = false;
  const q = o.quote || {}, p = perfil();
  ui.form.reset();
  photoFiles.destino = photoFiles.hotel = null; photos.destino = photos.hotel = null;
  photoUrls.destino = q.fotoDestino || ''; photoUrls.hotel = q.fotoHotel || '';
  info('destino', photoUrls.destino ? 'Foto guardada ✓ (elegí otra para cambiarla)' : 'Sin foto: se usa una playa genérica');
  info('hotel', photoUrls.hotel ? 'Foto guardada ✓ (elegí otra para cambiarla)' : 'Sin foto');
  fill({ cliente: o.client, pax: o.pax || 1, destino: o.destination, moneda: o.quoteCurrency || 'USD',
         precio: o.quoteAmount || '', vendedor: o.salesperson || o.owner || p.nombre || '', contacto: p.email || '' });
  fill(q);
  $c('cotTitulo').textContent = 'Cotización · ' + o.client;
  estado(q.actualizado ? 'Guardada el ' + new Date(q.actualizado).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) + (q.por ? ' por ' + q.por : '') : 'Todavía sin guardar');
  ui.d.showModal();
  try { await loadAssets(); } catch (e) { alert('No se pudieron cargar los diseños del flyer. Revisá la conexión.'); return; }
  draw();
  for (const k of ['destino', 'hotel']) if (photoUrls[k]) loadRemote(photoUrls[k]).then(img => { if (cur === id && !photoFiles[k]) { photos[k] = img; draw(); } }).catch(() => info(k, 'No se pudo cargar la foto guardada'));
};
function close() {
  if (dirty && !confirm('Hay cambios sin guardar en la cotización. ¿Cerrar igual?')) return;
  dirty = false; ui.d.close();
}
async function guardar() {
  const o = order(); if (!o) return;
  const btn = $c('cotGuardar'); btn.disabled = true; estado('Guardando…');
  try {
    const q = data();
    for (const k of ['destino', 'hotel']) {
      if (photoFiles[k]) {
        if (!window.almaSubirFotoCot) throw new Error('No se pueden subir fotos en este momento.');
        const path = o.id + '/' + k + '-' + Date.now() + '.jpg';
        photoUrls[k] = await window.almaSubirFotoCot(photoFiles[k], path);
        photoFiles[k] = null; info(k, 'Foto guardada ✓ (elegí otra para cambiarla)');
      }
    }
    q.fotoDestino = photoUrls.destino; q.fotoHotel = photoUrls.hotel;
    q.actualizado = new Date().toISOString(); q.por = perfil().nombre || '';
    o.quote = q;
    if (q.precio) { o.quoteAmount = Number(q.precio); o.quoteCurrency = q.moneda; }
    if (o.status === 'Pendiente') o.status = 'En preparación';
    window.__almaSave && window.__almaSave(); app()?.render();
    dirty = false; estado('Guardada ✓');
  } catch (e) { estado(''); alert('No se pudo guardar la cotización: ' + e.message); }
  finally { btn.disabled = false; }
}
function marcarEnviada() {
  const o = order(); if (!o) return;
  o.status = 'Cotización enviada'; window.__almaSave && window.__almaSave(); app()?.render(); estado('Pedido marcado como «Cotización enviada» ✓');
}
function bajar(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
const pngs = () => { draw(); return Promise.all(ui.cv.map(c => new Promise(r => c.toBlob(r, 'image/png')))); };
async function bajarPng() {
  try { const b = await pngs(); bajar(b[0], nombre() + '_1.png'); setTimeout(() => bajar(b[1], nombre() + '_2.png'), 600); }
  catch (e) { alert('No se pudieron generar las imágenes: ' + e.message); }
}
async function compartir() {
  try {
    const b = await pngs();
    const files = b.map((x, i) => new File([x], nombre() + '_' + (i + 1) + '.png', { type: 'image/png' }));
    if (navigator.canShare({ files })) await navigator.share({ files, title: nombre().replace(/_/g, ' ') });
    else await bajarPng();
  } catch (e) { if (e.name !== 'AbortError') alert('No se pudo compartir: ' + e.message); }
}
function pdfBlob() { draw(); return buildPdf(ui.cv.map(c => ({ w: c.width, h: c.height, b: b64bytes(c.toDataURL('image/jpeg', .9)) })), 800, 600); }

})();
