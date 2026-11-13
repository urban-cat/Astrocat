// Astrocat — arranque y enrutador (rutas con #, sin servidor).
import { pedirPersistencia, contarDias, leerMeta } from './db.js';
import { iso } from './modelo.js';
import * as hoy from './vistas/hoy.js';
import * as registro from './vistas/registro.js';
import * as varias from './vistas/varias.js';
import * as astro from './vistas/astro.js';
import * as especiales from './vistas/especiales.js';
import * as historial from './vistas/historial.js';
import * as ajustes from './vistas/ajustes.js';

const raiz = document.getElementById('app');
export const hoyIso = () => iso(new Date());

const RUTAS = [
  [/^\/bienvenida$/, varias.bienvenida],
  [/^\/hoy$/, hoy.vista],
  [/^\/registro\/(\w+)$/, registro.paso],
  [/^\/historial$/, historial.general],
  [/^\/historial\/astro\/(\w+)$/, historial.astroTendencia],
  [/^\/tabla$/, historial.tabla],
  [/^\/astro\/(\w+)$/, astro.vista],
  [/^\/especiales$/, especiales.vista],
  [/^\/ajustes$/, ajustes.vista],
  [/^\/ajustes\/calculo$/, ajustes.calculo],
];

function leerRuta() {
  const h = location.hash.replace(/^#/, '') || '/hoy';
  const [ruta, q = ''] = h.split('?');
  return { ruta, query: Object.fromEntries(new URLSearchParams(q)) };
}

let generacion = 0;
async function render() {
  const yo = ++generacion;
  const { ruta, query } = leerRuta();
  const entrada = RUTAS.find(([re]) => re.test(ruta));
  if (!entrada) { location.replace('#/hoy'); return; }
  const params = ruta.match(entrada[0]).slice(1);
  try {
    const v = await entrada[1]({ params, query, hoy: hoyIso() });
    if (yo !== generacion || !v) return; // llegó otra navegación mientras cargaba
    document.title = `${v.titulo} · Astrocat`;
    // Contenedor nuevo en cada pantalla: así los eventos de la pantalla anterior no se acumulan.
    const vistaEl = document.createElement('div');
    vistaEl.innerHTML = v.html;
    raiz.replaceChildren(vistaEl);
    v.montar?.(vistaEl);
    if (!v.conservarFoco) {
      const h1 = vistaEl.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      window.scrollTo(0, 0);
    }
  } catch (e) {
    console.error(e);
    raiz.innerHTML = `<div class="ac-screen"><main class="ac-main"><h1 class="ac-h1">Algo salió mal</h1><p class="ac-text">No pudimos abrir esta pantalla. Tus datos siguen guardados.</p><a class="ac-btn ac-btn--primary ac-px" href="#/hoy">Ir a Hoy</a></main></div>`;
  }
}

export const ir = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
export const refrescar = () => render();

addEventListener('hashchange', render);

(async () => {
  pedirPersistencia();
  if (!location.hash && (await contarDias()) === 0 && !(await leerMeta('bienvenidaVista'))) location.replace('#/bienvenida');
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
})();
