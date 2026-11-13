// Hoy: radar del día, destacados y astros. También sirve para ver días pasados.
import { ASTROS, puntajesDia, fechaLarga, sumarDias, num, deIso } from '../modelo.js';
import { leerDia, leerBorrador, guardarMeta } from '../db.js';
import { estadoRespaldo, exportar } from './ajustes.js';
import { esc, ico, imgAstro, nav, radar } from '../ui.js';

const DIA_CORTO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const diaCorto = (f) => `${DIA_CORTO[deIso(f).getDay()]} ${deIso(f).getDate()}`;

function cabecera(fecha, hoy, { editar } = {}) {
  const esHoy = fecha === hoy;
  const ant = sumarDias(fecha, -1), sig = sumarDias(fecha, 1);
  return `<header class="ac-header">
    <div class="ac-row">
      <p class="ac-brand"><img class="px" src="img/logo.svg" alt="">Astrocat</p>
      ${editar ? `<a class="ac-btn ac-btn--secondary ac-px" href="#/registro/revision?d=${fecha}&editar=1" style="min-height: 48px; padding: 8px 16px 8px 14px;"><img class="ac-ico-sm" src="img/ui/editar.svg" alt="">Editar</a>` : ''}
    </div>
    <div class="ac-row">
      <a class="ac-iconbtn ac-px" href="#/hoy?d=${ant}" aria-label="Día anterior">${ico('anterior')}</a>
      <div class="ac-datenav__label"><span class="ac-kicker">${esHoy ? 'Hoy' : 'Día pasado'}</span><span class="ac-datenav__date">${fechaLarga(fecha)}</span></div>
      ${esHoy ? `<a class="ac-iconbtn ac-px" aria-label="Día siguiente" aria-disabled="true" role="link">${ico('siguiente')}</a>`
              : `<a class="ac-iconbtn ac-px" href="#/hoy?d=${sig}" aria-label="Día siguiente">${ico('siguiente')}</a>`}
    </div>
    ${esHoy ? '' : `<a class="ac-btn ac-btn--tertiary" href="#/hoy" style="align-self: center; min-height: 44px; padding: 8px 16px;">Volver a hoy</a>`}
  </header>`;
}

export async function vista({ query, hoy }) {
  let fecha = query.d && /^\d{4}-\d{2}-\d{2}$/.test(query.d) ? query.d : hoy;
  if (fecha > hoy) fecha = hoy;
  const esHoy = fecha === hoy;
  const [dia, borrador, resp] = await Promise.all([leerDia(fecha), leerBorrador(), estadoRespaldo()]);
  const aviso = resp.debeAvisar && esHoy ? `<section role="status" class="ac-px ac-alert ac-alert--warn" aria-labelledby="resp-t" data-aviso>
      ${ico('aviso')}<div><strong id="resp-t" style="font: 800 16px/22px var(--font-sans);">${resp.ultimo ? `Hace ${resp.diasDesde} días que no respaldas` : 'Aún no tienes respaldo'}</strong><span style="font: 600 15px/22px var(--font-sans);">Tienes ${resp.sinRespaldar} ${resp.sinRespaldar === 1 ? 'día que solo está' : 'días que solo están'} en este teléfono.</span></div>
      <div style="display: flex; flex-direction: row; gap: 8px; align-self: stretch; flex-wrap: wrap;"><button type="button" class="ac-btn ac-btn--primary ac-px" data-exportar style="flex-grow: 1;">${ico('exportar')}Exportar ahora</button><button type="button" class="ac-btn ac-btn--tertiary" data-posponer>Ahora no</button></div></section>` : '';
  const montarAviso = (el) => {
    el.querySelector('[data-exportar]')?.addEventListener('click', exportar);
    el.querySelector('[data-posponer]')?.addEventListener('click', async () => { await guardarMeta('avisoPospuesto', hoy); el.querySelector('[data-aviso]').remove(); });
  };
  const titulo = esHoy ? 'Hoy' : fechaLarga(fecha);

  if (!dia) {
    const b = borrador?.fecha === fecha && borrador.modo === 'nuevo' ? borrador : null;
    if (b) {
      const hechos = Math.min(b.paso, 8), siguiente = ASTROS[Math.min(b.paso, 7)];
      return { titulo, html: `<div class="ac-screen">${cabecera(fecha, hoy)}
        <main class="ac-main" style="justify-content: center; gap: 18px;">
          <img class="px" src="img/gato.svg" alt="" style="width: 128px; height: 128px; align-self: center;">
          <h1 class="ac-h1" style="text-align: center;">Dejaste el día a medias</h1>
          <section class="ac-px ac-card" aria-labelledby="borr-t">
            <h2 id="borr-t" class="ac-h2">Borrador ${esHoy ? 'de hoy' : 'de este día'}</h2>
            <span class="ac-kicker">${hechos} de 8 astros · sigue en ${siguiente.nombre}</span>
            <div class="ac-progress" aria-hidden="true">${ASTROS.map((_, i) => `<span${i < hechos ? ' class="done"' : ''}></span>`).join('')}</div>
          </section>
          <a class="ac-btn ac-btn--primary ac-px" href="#/registro/${b.paso >= 8 ? 'revision' : siguiente.id}?d=${fecha}">Seguir con ${b.paso >= 8 ? 'la revisión' : siguiente.nombre}</a>
          <a class="ac-btn ac-btn--tertiary" href="#/elegir-dia" data-elegir style="align-self: center;">${ico('calendario')}Registrar otro día</a>
        </main>${nav('Hoy')}</div>`, montar: montarElegir };
    }
    return { titulo, html: `<div class="ac-screen">${cabecera(fecha, hoy)}
      <main class="ac-main" style="justify-content: center; align-items: center; text-align: center; gap: 18px;">${aviso ? `<div style="text-align: left; align-self: stretch;">${aviso}</div>` : ''}
        <div style="position: relative; width: 240px; height: 200px;" aria-hidden="true">
          <img class="px" src="img/gato.svg" alt="" style="position: absolute; left: 56px; top: 24px; width: 128px; height: 128px;">
          <img class="px" src="img/astros/quiron.svg" alt="" style="position: absolute; left: 0; top: 120px; width: 64px; height: 64px;">
          <img class="px" src="img/astros/venus.svg" alt="" style="position: absolute; right: 0; top: 0; width: 64px; height: 64px;">
          <img class="px" src="img/astros/luna.svg" alt="" style="position: absolute; right: 8px; top: 136px; width: 64px; height: 64px;">
        </div>
        <h1 class="ac-h1">${esHoy ? 'Aún no registras hoy' : 'Este día no tiene registro'}</h1>
        <p class="ac-text" style="max-width: 300px;">${esHoy ? 'Son 8 astros, uno por paso. Te toma unos minutos.' : 'Puedes registrarlo ahora. Mientras tanto, no cuenta en los promedios de la semana ni del mes.'}</p>
        <a class="ac-btn ac-btn--primary ac-px" href="#/registro/quiron?d=${fecha}&nuevo=1" style="width: 300px; max-width: 100%;">${esHoy ? 'Registrar el día' : `Registrar el ${diaCorto(fecha)}`}</a>
        ${esHoy ? `<button type="button" class="ac-btn ac-btn--tertiary" data-elegir>${ico('calendario')}Registrar otro día</button>`
                : `<a class="ac-btn ac-btn--tertiary" href="#/hoy">Volver a hoy</a>`}
      </main>${nav('Hoy')}</div>`, montar: (el) => { montarElegir(el); montarAviso(el); } };
  }

  const p = puntajesDia(dia);
  const vals = ASTROS.map((a) => ({ a, v: p[a.id] }));
  const max = Math.max(...vals.map((x) => x.v)), min = Math.min(...vals.map((x) => x.v));
  const nombres = (xs) => { const n = xs.map((x) => x.a.nombre); return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n.at(-1)}` : n[0]; };
  return { titulo, html: `<div class="ac-screen">${cabecera(fecha, hoy, { editar: true })}
    <div style="padding: 0 16px;"><div class="ac-seg ac-px" role="tablist" aria-label="Vista del día">
      <a href="#/hoy?d=${fecha}" role="tab" aria-selected="true">Radar</a>
      <a href="#/especiales?d=${fecha}" role="tab" aria-selected="false">Gráficas especiales</a>
    </div></div>
    <main class="ac-main">
      <h1 class="ac-sr">${esc(titulo)}</h1>${aviso}
      <figure class="ac-px ac-card ac-radar" style="margin: 4px;">
        <figcaption class="ac-h1" style="font-size: 24px; line-height: 28px;">${esHoy ? 'Tu radar de hoy' : `Radar del ${diaCorto(fecha)}`}</figcaption>
        ${radar(p)}
      </figure>
      <section aria-labelledby="dest" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: stretch;">
        <h2 id="dest" class="ac-h2" style="grid-column: 1 / -1;">Destacados del día</h2>
        <div class="ac-px ac-stat ac-stat--stack"><img class="ac-stat__icon" src="img/ui/estrella.svg" alt=""><span class="ac-stat__label">Mejor astro</span><span class="ac-stat__value">${nombres(vals.filter((x) => x.v === max))} · ${num(max)}</span></div>
        <div class="ac-px ac-stat ac-stat--stack"><img class="ac-stat__icon" src="img/ui/info.svg" alt=""><span class="ac-stat__label">Por cuidar</span><span class="ac-stat__value">${max === min ? 'Ninguno' : `${nombres(vals.filter((x) => x.v === min))} · ${num(min)}`}</span></div>
      </section>
      <section aria-labelledby="astros" style="display: flex; flex-direction: column; gap: 14px;">
        <h2 id="astros" class="ac-h2">Astros <small>· toca uno para ver su detalle</small></h2>
        <ul class="ac-grid2">${vals.map(({ a, v }) => `<li><a class="ac-px ac-astro" href="#/astro/${a.id}?d=${fecha}">${imgAstro(a.id)}<span class="ac-astro__name">${a.nombre}</span><span class="ac-astro__score">${num(v)} <small>de 10</small></span></a></li>`).join('')}</ul>
      </section>
    </main>${nav('Hoy')}</div>`, montar: montarAviso };
}

function montarElegir(el) {
  el.querySelectorAll('[data-elegir]').forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault();
    const { elegirDia } = await import('./elegir-dia.js');
    elegirDia();
  }));
}
