// Gráficas especiales (no cuentan para el radar): termómetros, Visualización y Escala de sensaciones.
import { ASTROS, SENSACIONES, periodo, diasDe, serieEspecial, extremos, listar, promedioEspecial, num, fechaLarga } from '../modelo.js';
import { leerDia, todosLosDias } from '../db.js';
import { ico, imgAstro, imgCarita, nav, termometroH, selectorPeriodo, barras } from '../ui.js';
import { figuraEspecial } from './astro.js';

const LISTA = ASTROS.flatMap((a) => a.especiales.map((e) => ({ a, e })));
const termos = LISTA.filter((x) => x.e.tipo === 'termometro'), visual = LISTA.filter((x) => x.e.id === 'visualizacion'), sens = LISTA.filter((x) => x.e.id === 'sensaciones');
const cercana = (e, v) => e.opciones.reduce((m, o) => (Math.abs(o.valor - v) < Math.abs(m.valor - v) ? o : m));
const textoPromedio = (e, v) => { const lo = Math.floor(v), hi = Math.ceil(v); const t = (x) => e.opciones.find((o) => o.valor === x).texto;
  return lo === hi || Math.abs(v - Math.round(v)) < 0.15 ? `“${t(Math.round(v))}”` : `entre “${t(lo)}” y “${t(hi)}”`; };
const PARTE = { semana: 'días', mes: 'semanas', anio: 'meses' };
const nombreParte = (p, tipo) => (tipo === 'semana' ? p.larga.split(' ')[0] : p.larga);

function tabs(fecha) {
  return `<div style="padding: 0 16px;"><div class="ac-seg ac-px" role="tablist" aria-label="Vista del día">
    <a href="#/hoy?d=${fecha}" role="tab" aria-selected="false">Radar</a><a href="#/especiales?d=${fecha}" role="tab" aria-selected="true">Gráficas especiales</a></div></div>`;
}
const cab = (inner, fecha) => `<header class="ac-header"><p class="ac-brand"><img class="px" src="img/logo.svg" alt="">Astrocat</p>${inner}</header>${tabs(fecha)}`;

function tarjeta({ a, e }, ds, per, tamaño = 64) {
  const v = promedioEspecial(ds, a.id, e.id);
  const serie = serieEspecial(ds, per, a.id, e.id);
  const x = extremos(serie);
  const sub = e.tipo === 'termometro' ? `${a.nombre} · más alto es mejor` : e.id === 'visualizacion' ? `${a.nombre} · escala de caritas` : '';
  const etiqueta = (o) => (e.tipo === 'caritas' ? cercana(e, o).texto : num(o));
  const ariaSerie = serie.map((p) => `${nombreParte(p, per.tipo)} ${p.valor == null ? 'sin registro' : e.tipo === 'caritas' ? cercana(e, p.valor).texto : num(p.valor)}`).join(', ');
  return `<article class="ac-px ac-card">
    <div style="display: flex; align-items: center; gap: 12px;">${imgAstro(a.id, `style="width: ${tamaño}px; height: ${tamaño}px;"`)}
      <div style="flex-grow: 1;"><h3 class="ac-h2" style="font: 500 20px/24px var(--font-pixel);">${e.id === 'sensaciones' ? a.nombre : e.nombre}</h3>${sub ? `<p class="ac-muted">${sub}</p>` : ''}</div>
      <p style="margin: 0; text-align: right;"><span style="font: 700 ${tamaño > 48 ? 34 : 30}px/1 var(--font-pixel);">${num(v)}</span><br><span class="ac-kicker">de ${e.max}</span></p></div>
    ${v == null ? '<p class="ac-muted">Sin registros en este período.</p>' : `
    ${e.tipo === 'termometro' ? termometroH(v) : `<div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--primary-soft);">${imgCarita(cercana(e, v).carita, 'style="width: 32px; height: 32px;"')}<span style="font: 700 14px/20px var(--font-sans);">En promedio: ${textoPromedio(e, v)}</span></div>`}
    ${barras(serie, { max: e.max, opciones: e.tipo === 'caritas' ? e.opciones : null, aria: `${e.nombre}${e.id === 'sensaciones' ? ` de ${a.nombre}` : ''} por ${per.tipo === 'semana' ? 'día' : per.tipo === 'mes' ? 'semana' : 'mes'}: ${ariaSerie}` })}
    ${x && x.max !== x.min ? `<p class="ac-text" style="font-size: 15px; line-height: 22px;"><strong>Mejor:</strong> ${listar(x.mejores.map((p) => nombreParte(p, per.tipo)), PARTE[per.tipo])} (${etiqueta(x.max)}) · <strong>Más bajo:</strong> ${listar(x.bajos.map((p) => nombreParte(p, per.tipo)), PARTE[per.tipo])} (${etiqueta(x.min)})</p>` : ''}`}
  </article>`;
}

const leyenda = `<ul class="ac-px" style="margin: 4px; padding: 12px 14px; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font: 600 14px/20px var(--font-sans);">${SENSACIONES.map((o) => `<li style="display: flex; align-items: center; gap: 8px;">${imgCarita(o.carita, 'style="width: 24px; height: 24px;"')}<span><strong>${o.valor}</strong> · ${o.texto}</span></li>`).join('')}</ul>`;

export async function vista({ query, hoy }) {
  const tipo = ['semana', 'mes', 'anio'].includes(query.per) ? query.per : query.per === 'dia' ? 'dia' : query.d ? 'dia' : 'semana';
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(query.f || query.d || '') ? (query.f || query.d) : hoy;
  const fecha = ref > hoy ? hoy : ref;

  if (tipo === 'dia') {
    const dia = await leerDia(fecha);
    const sel = selectorPeriodo(null, '#/especiales', { hoy, conDia: true, actual: fecha });
    const cuerpo = !dia ? `<p class="ac-text">Este día no tiene registro.</p><a class="ac-btn ac-btn--primary ac-px" href="#/registro/quiron?d=${fecha}&nuevo=1">Registrar el día</a>`
      : `${[...termos, ...visual].map(({ a, e }) => `<section style="display: flex; flex-direction: column; gap: 8px;"><h2 class="ac-h2" style="display: flex; align-items: center; gap: 8px;">${imgAstro(a.id, 'style="width: 32px; height: 32px;"')}${a.nombre}</h2>${figuraEspecial(e, dia.respuestas[a.id][e.id])}</section>`).join('')}
        <section aria-labelledby="sens" style="display: flex; flex-direction: column; gap: 14px;"><h2 id="sens" class="ac-h2" style="font: 600 24px/28px var(--font-pixel);">Escala de sensaciones</h2>
        <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px;">${sens.map(({ a, e }) => { const o = e.opciones.find((x) => x.valor === dia.respuestas[a.id][e.id]);
          return `<li class="ac-px" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px;">${imgAstro(a.id, 'style="width: 40px; height: 40px;"')}<strong style="flex-grow: 1; font: 500 18px/22px var(--font-pixel);">${a.nombre}</strong>${imgCarita(o.carita, 'style="width: 40px; height: 40px;"')}<span style="font: 700 15px/20px var(--font-sans); min-width: 96px;">${o.texto}</span></li>`; }).join('')}</ul></section>`;
    return { titulo: `Gráficas especiales · ${fechaLarga(fecha)}`, html: `<div class="ac-screen">${cab(`<div class="ac-datenav__label"><span class="ac-kicker">${fecha === hoy ? 'Hoy' : 'Día pasado'}</span><span class="ac-datenav__date">${fechaLarga(fecha)}</span></div>`, fecha)}
      <main class="ac-main"><h1 class="ac-sr">Gráficas especiales</h1><div style="display: flex; flex-direction: column; gap: 6px;"><span class="ac-kicker">Ver promedio de</span>${sel}</div>${cuerpo}</main>${nav('Hoy')}</div>` };
  }

  const per = periodo(tipo, fecha);
  const ds = diasDe(await todosLosDias(), per.desde, per.hasta);
  const html = `<div class="ac-screen">${cab('', fecha)}
    <main class="ac-main"><h1 class="ac-sr">Gráficas especiales</h1>
      <div style="display: flex; flex-direction: column; gap: 10px;"><span class="ac-kicker">Ver promedio de</span>${selectorPeriodo(per, '#/especiales', { hoy, conDia: true })}
      <p class="ac-muted">Los días sin registro no cuentan en el promedio.</p></div>
      ${[...termos, ...visual].map((x) => tarjeta(x, ds, per)).join('')}
      <section aria-labelledby="sens" style="display: flex; flex-direction: column; gap: 14px;">
        <h2 id="sens" class="ac-h2" style="font: 600 24px/28px var(--font-pixel);">Escala de sensaciones</h2>
        <p class="ac-muted">Se registra en Quirón, Sol, Venus, Luna y Neptuno. Más alto es mejor.</p>${leyenda}
        ${sens.map((x) => tarjeta(x, ds, per, 48)).join('')}
      </section>
      <a class="ac-link" href="#/tabla?tipo=especiales&per=${per.tipo}&f=${per.desde}" style="align-self: center; gap: 10px;">${ico('tabla')}Ver valores en tabla</a>
    </main>${nav('Hoy')}</div>`;
  return { titulo: `Gráficas especiales · ${per.titulo}`, html, montar: (el) => { el.querySelector('[data-kicker]').textContent = `${ds.length} ${ds.length === 1 ? 'día registrado' : 'días registrados'}`; } };
}
