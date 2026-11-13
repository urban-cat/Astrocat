// Vista de un astro en un día: puntaje, variables y gráficas especiales.
import { astro, puntaje, fechaLarga, num, respuestaTexto } from '../modelo.js';
import { leerDia } from '../db.js';
import { esc, ico, imgAstro, imgCarita, termometroH } from '../ui.js';
import { ir } from '../app.js';

export function termometroV(valor) {
  const on = Math.round(valor);
  return `<div class="ac-thermo-v" aria-hidden="true"><div class="ac-thermo-v__tube">${Array.from({ length: 10 }, (_, i) => `<span${i >= 10 - on ? ' class="on"' : ''}></span>`).join('')}</div><div class="ac-thermo-v__bulb"></div></div>`;
}

export function figuraEspecial(e, x) {
  if (e.tipo === 'termometro') return `<figure class="ac-px ac-card" role="img" aria-label="${e.nombre}: ${num(x)} de 10" style="margin: 4px; flex-direction: row; align-items: flex-end; gap: 22px;">
      ${termometroV(x)}
      <div style="display: flex; flex-direction: column; gap: 2px;" aria-hidden="true"><span style="font: 500 22px/26px var(--font-pixel);">${e.nombre}</span>
      <span><span style="font: 700 48px/48px var(--font-pixel);">${num(x)}</span> <span class="ac-kicker" style="font-size: 15px;">de 10</span></span><span class="ac-muted">Más alto es mejor</span></div></figure>`;
  const o = e.opciones.find((o) => o.valor === x);
  return `<figure class="ac-px ac-card" role="img" aria-label="${e.nombre}: ${o.texto}, ${x} de ${e.max}" style="margin: 4px; flex-direction: row; align-items: center; gap: 18px;">
      ${imgCarita(o.carita, 'style="width: 96px; height: 96px; flex: none;"')}
      <div style="display: flex; flex-direction: column; gap: 4px;" aria-hidden="true"><span style="font: 500 22px/26px var(--font-pixel);">${e.nombre}</span>
      <span><span style="font: 700 40px/40px var(--font-pixel);">${x}</span> <span class="ac-kicker" style="font-size: 15px;">de ${e.max}</span></span><strong style="font: 800 16px/22px var(--font-sans);">${o.texto}</strong></div></figure>`;
}

export async function vista({ params: [id], query, hoy }) {
  const a = astro(id);
  if (!a) { ir('#/hoy'); return null; }
  const fecha = query.d || hoy;
  const dia = await leerDia(fecha);
  if (!dia) { ir(`#/hoy?d=${fecha}`); return null; }
  const r = dia.respuestas[id];
  const p = puntaje(id, r);
  const peso = a.variables.length === 1 ? 'vale 100%' : `${num(100 / a.variables.length)}% cada una`;
  const filas = a.variables.map((v) => {
    const det = p.detalle.find((d) => d.id === v.id);
    const tag = !det.participa ? '<span class="ac-tag" style="color: var(--ink-muted);">No participa</span>'
      : det.cumple ? `<span class="ac-tag ac-tag--ok">${ico('cumple')}Cumple</span>` : `<span class="ac-tag ac-tag--no">${ico('no-cumple')}No cumple</span>`;
    return `<li class="ac-px" style="min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px;">
      <span style="display: flex; flex-direction: column; min-width: 0;"><strong style="font-size: 17px;">${v.nombre}</strong><span class="ac-muted">Respuesta: ${esc(respuestaTexto(v, r[v.id]))}</span></span>${tag}</li>`;
  }).join('');
  const esp = a.especiales.length ? `<section aria-labelledby="propia" style="display: flex; flex-direction: column; gap: 12px;">
      <h2 id="propia" class="ac-h2">${a.especiales.length > 1 ? 'Gráficas especiales' : 'Gráfica especial'} <small>· no cuenta para el radar</small></h2>
      ${a.especiales.map((e) => figuraEspecial(e, r[e.id])).join('')}</section>` : '';
  return { titulo: `${a.nombre}, ${fechaLarga(fecha)}`, html: `<div class="ac-screen">
    <header class="ac-header"><div class="ac-row">
      <a class="ac-iconbtn ac-px" href="#/hoy?d=${fecha}" aria-label="Volver a ${fecha === hoy ? 'Hoy' : 'ese día'}">${ico('volver')}</a>
      <span class="ac-datenav__date">${fechaLarga(fecha)}</span>
      <a class="ac-btn ac-btn--secondary ac-px" href="#/registro/${id}?d=${fecha}" style="min-height: 48px; padding: 8px 16px 8px 14px;"><img class="ac-ico-sm" src="img/ui/editar.svg" alt="">Editar</a>
    </div></header>
    <main class="ac-main">
      <section class="ac-px ac-card" style="flex-direction: row; align-items: center; gap: 16px; background: ${a.color};">
        ${imgAstro(id, 'style="width: 128px; height: 128px; flex: none;"')}
        <div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1; min-width: 0;">
          <h1 class="ac-h1" style="font-size: 32px; line-height: 36px;">${a.nombre}</h1>
          <p style="margin: 0;"><span style="font: 700 48px/48px var(--font-pixel);">${num(p.valor)}</span> <span class="ac-kicker" style="font-size: 15px;">de 10</span></p>
          ${termometroH(p.valor).replace('class="ac-thermo-h"', 'class="ac-thermo-h" style="height: 16px;"')}
          <span class="ac-kicker">Cumple ${p.cumplidas} de ${p.total}</span>
        </div>
      </section>
      <section aria-labelledby="vars" style="display: flex; flex-direction: column; gap: 12px;">
        <h2 id="vars" class="ac-h2">Variables del radar <small>· ${peso}</small></h2>
        <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px;">${filas}</ul>
        ${p.total < a.variables.length ? '<p class="ac-muted">Imagen no participa este día: Urano se calcula con las otras 4 variables.</p>' : ''}
      </section>
      ${esp}
      <a class="ac-btn ac-btn--secondary ac-px" href="#/historial/astro/${id}?f=${fecha}" style="justify-content: space-between;"><span style="display: flex; align-items: center; gap: 8px;">${ico('historial')}Ver tendencia de ${a.nombre}</span>${ico('siguiente')}</a>
    </main></div>` };
}
