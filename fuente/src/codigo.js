/* Acceso al sistema aparte («código»): tocar la versión al pie del menú abre codigo.html,
   que tiene su propio ingreso y no comparte pantallas ni datos con el sistema de la agencia. */
(() => {
'use strict';
function enganchar() {
  const pie = document.querySelector('.side-foot'); if (!pie || pie.querySelector('#almaVer')) return;
  pie.innerHTML = pie.innerHTML.replace(/(versión [0-9/: ]+)/, '<span id="almaVer">$1</span>');
  pie.querySelector('#almaVer')?.addEventListener('click', () => { location.href = 'codigo.html'; });
}
enganchar(); document.addEventListener('DOMContentLoaded', enganchar); setTimeout(enganchar, 1500);
})();
