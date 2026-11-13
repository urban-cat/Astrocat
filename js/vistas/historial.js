// Historial: semana, mes y año de todos los astros; tendencia de un astro; tablas de valores.
import { ASTROS, astro, periodo, diasDe, promedios, serieAstro, serieGeneral, extremos, listar, cumplimientoVariables, promedioEspecial, num, redondear } from '../modelo.js';
import { todosLosDias } from '../db.js';
import { esc, ico, imgAstro, nav, radar, selectorPeriodo, tendencia, linea } from '../ui.js';

const TIPOS = ['semana', 'mes', 'anio'];
const PARTE = { semana: ['día', 'días', 'Mejor día', 'Día más bajo'], mes: ['semana', 'semanas', 'Mejor semana', 'Semana más baja'], anio: ['mes', 'meses', 'Mejor mes', 'Mes más bajo'] };
const nombrePer = { semana: 'semana', mes: 'mes', anio: 'año' };
const etiquetaParte = (p, tipo) => (tipo === 'semana' ? p.larga.split(' ')[0].slice(0, 3) : p.larga);
const enCursoIdx = (per, hoy) => per.partes.findIndex((p) => p.desde <= hoy && hoy <= p.hasta);

function vacio() {
  return { titulo: 'Historial', html: `<div class="ac-screen"><header class="ac-header"><h1 class="ac-h1">Historial</h1></header>
    <main class="ac-main" style="justify-content: center; align-items: center; text-align: center; gap: 18px;">
      <img class="px" src="img/gato.svg" alt="" style="width: 128px; height: 128px;">
      <h2 class="ac-h1" style="font-size: 26px; line-height: 30px;">Tu historial empieza con tu primer día</h2>
      <p class="ac-text" style="max-width: 300px;">Cuando registres, aquí verás tus promedios por semana, mes y año.</p>
      <a class="ac-btn ac-btn--primary ac-px" href="#/registro/quiron?nuevo=1" style="width: 300px; max-width: 100%;">Registrar hoy</a>
    </main>${nav('Historial')}</div>` };
}

function leerPeriodo(query, hoy) {
  const tipo = TIPOS.includes(query.per) ? query.per : 'semana';
  const f = /^\d{4}-\d{2}-\d{2}$/.test(query.f || '') ? (query.f > hoy ? hoy : query.f) : hoy;
  return periodo(tipo, f);
}

// ---------- Historial general ----------
export async function general({ query, hoy }) {
  const todos = await todosLosDias();
  if (!todos.length) return vacio();
  const per = leerPeriodo(query, hoy);
  const ds = diasDe(todos, per.desde, per.hasta);
  const ant = periodo(per.tipo, per.anterior), dsAnt = diasDe(todos, ant.desde, ant.hasta);
  const transcurridos = Math.max(0, Math.round((Date.parse(hoy < per.hasta ? hoy : per.hasta) - Date.parse(per.desde)) / 864e5) + 1);
  const kicker = per.tipo === 'anio' ? `${ds.length} ${ds.length === 1 ? 'día registrado' : 'días registrados'}` : `${ds.length} de ${transcurridos} días registrados`;
  const base = '#/historial';
  const cab = `<header class="ac-header"><h1 class="ac-h1">Historial</h1>${selectorPeriodo(per, base, { hoy })}</header>`;
  if (!ds.length) return { titulo: 'Historial', html: `<div class="ac-screen">${cab}<main class="ac-main" style="align-items: center; text-align: center; gap: 16px; padding-top: 40px;">
      <img class="px" src="img/gato.svg" alt="" style="width: 96px; height: 96px;"><h2 class="ac-h2">No hay registros ${per.tipo === 'anio' ? 'en este año' : per.tipo === 'mes' ? 'en este mes' : 'en esta semana'}</h2>
      <p class="ac-muted">Los días sin registro no cuentan en los promedios.</p></main>${nav('Historial')}</div>`, montar: (el) => { el.querySelector('[data-kicker]').textContent = kicker; } };

  const prom = promedios(ds), promAnt = dsAnt.length && per.tipo !== 'anio' ? promedios(dsAnt) : null;
  const vals = ASTROS.map((a) => ({ a, v: prom[a.id] }));
  const max = Math.max(...vals.map((x) => x.v)), min = Math.min(...vals.map((x) => x.v));
  const nombres = (xs) => listar(xs.map((x) => x.a.nombre), 'astros');
  const sg = extremos(serieGeneral(ds, per));
  const [, , tMejor, tBajo] = PARTE[per.tipo];
  const etq = (xs) => { const t = listar(xs.map((p) => p.larga), PARTE[per.tipo][1]); return t[0].toUpperCase() + t.slice(1); };
  const filas = vals.map(({ a, v }) => {
    const e = extremos(serieAstro(ds, per, a.id));
    const det = e.max === e.min ? (per.tipo === 'semana' ? `Igual todos los días registrados (${num(e.max)})` : `Igual en todo el período (${num(e.max)})`)
      : `Mejor: ${listar(e.mejores.map((p) => etiquetaParte(p, per.tipo)), PARTE[per.tipo][1])} (${num(e.max)}) · Más ${per.tipo === 'semana' ? 'bajo' : 'baja'}: ${listar(e.bajos.map((p) => etiquetaParte(p, per.tipo)), PARTE[per.tipo][1])} (${num(e.min)})`;
    const t = promAnt ? tendencia(v, promAnt[a.id]) : '';
    return `<a class="ac-px ac-astrorow${t ? '' : ' ac-astrorow--notrend'}" href="#/historial/astro/${a.id}?per=${per.tipo === 'semana' ? 'semana' : per.tipo}&f=${per.desde}">${imgAstro(a.id)}<span class="ac-astrorow__name">${a.nombre}</span><span class="ac-astrorow__score">${num(v)}</span><span class="ac-astrorow__detail">${det}</span>${t}</a>`;
  }).join('');
  const primerMes = per.tipo === 'anio' ? per.partes.findIndex((p) => ds.some((x) => x.fecha <= p.hasta)) : 0;
  const porMes = per.tipo === 'anio' ? `<section class="ac-px ac-card" aria-labelledby="pormes"><h2 id="pormes" class="ac-h2">Promedio general por mes</h2>
      ${primerMes > 0 ? `<p class="ac-muted">${primerMes === 1 ? 'En enero' : `De enero a ${per.partes[primerMes - 1].larga}`} no hay registros.</p>` : ''}
      ${serieGeneral(ds, per).map((p, i) => i < primerMes ? '' : (p.valor != null ? `<div style="display: flex; flex-direction: column; gap: 8px;"><div class="ac-row" style="font-size: 15px;"><strong>${p.larga[0].toUpperCase() + p.larga.slice(1)}</strong><span><strong>${num(p.valor)}</strong> de 10 · ${p.n} ${p.n === 1 ? 'día' : 'días'}</span></div><div class="ac-meter" aria-hidden="true"><span style="width: ${p.valor * 10}%;"></span></div></div>`
        : per.partes[i].desde > hoy ? '' : `<div class="ac-row" style="font-size: 15px;"><strong>${p.larga[0].toUpperCase() + p.larga.slice(1)}</strong><span class="ac-muted">Sin registros</span></div>`)).join('')}</section>` : '';
  const html = `<div class="ac-screen">${cab}<main class="ac-main">
    <figure class="ac-px ac-card ac-radar" style="margin: 4px;">
      <figcaption class="ac-h1" style="font-size: 24px; line-height: 28px;">Promedio ${per.tipo === 'anio' ? 'del año' : per.tipo === 'mes' ? 'del mes' : 'de la semana'}</figcaption>
      ${radar(prom, { previo: promAnt, aria: `Radar con el promedio de cada astro ${per.tipo === 'anio' ? 'en el año' : per.tipo === 'mes' ? 'en el mes' : 'en la semana'}${promAnt ? `, comparado con ${per.tipo === 'mes' ? 'el mes anterior' : 'la semana anterior'}` : ''}. Los valores están en las tarjetas de abajo.` })}
      ${promAnt ? `<div style="display: flex; gap: 18px; font: 700 13px/18px var(--font-sans);" aria-hidden="true"><span style="display: flex; align-items: center; gap: 6px;"><span style="width: 18px; height: 12px; background: var(--radar-fill); box-shadow: 0 0 0 2px var(--primary);"></span>${per.tipo === 'mes' ? 'Este mes' : 'Esta semana'}</span><span style="display: flex; align-items: center; gap: 6px;"><span style="width: 20px; border-top: 2px dashed var(--ink-muted);"></span>${per.tipo === 'mes' ? 'Mes anterior' : 'Semana anterior'}</span></div>` : ''}
      <a class="ac-link" href="#/tabla?tipo=general&per=${per.tipo}&f=${per.desde}" style="align-self: center; gap: 10px;">${ico('tabla')}Ver valores en tabla</a>
    </figure>
    <section aria-labelledby="dest" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
      <h2 id="dest" class="ac-h2" style="grid-column: 1 / -1;">Destacados ${per.tipo === 'anio' ? 'del año' : per.tipo === 'mes' ? 'del mes' : 'de la semana'}</h2>
      <div class="ac-px ac-stat ac-stat--stack"><img class="ac-stat__icon" src="img/ui/estrella.svg" alt=""><span class="ac-stat__label">Mejor astro</span><span class="ac-stat__value">${nombres(vals.filter((x) => x.v === max))} · ${num(max)}</span></div>
      <div class="ac-px ac-stat ac-stat--stack"><img class="ac-stat__icon" src="img/ui/info.svg" alt=""><span class="ac-stat__label">Por cuidar</span><span class="ac-stat__value">${max === min ? 'Ninguno' : `${nombres(vals.filter((x) => x.v === min))} · ${num(min)}`}</span></div>
      ${sg && sg.max !== sg.min ? `<div class="ac-px ac-stat ac-stat--stack"><img class="ac-stat__icon" src="img/ui/sube.svg" alt=""><span class="ac-stat__label">${tMejor}</span><span class="ac-stat__value">${etq(sg.mejores)} · ${num(sg.max)}</span></div>
      <div class="ac-px ac-stat ac-stat--stack"><img class="ac-stat__icon" src="img/ui/baja.svg" alt=""><span class="ac-stat__label">${tBajo}</span><span class="ac-stat__value">${etq(sg.bajos)} · ${num(sg.min)}</span></div>` : ''}
    </section>
    ${porMes}
    <section aria-labelledby="porastro" style="display: flex; flex-direction: column; gap: 14px;">
      <h2 id="porastro" class="ac-h2">Por astro <small>· toca para ver su tendencia</small></h2>${filas}
      <p class="ac-muted">${promAnt ? `La flecha compara con ${per.tipo === 'mes' ? 'el mes anterior' : 'la semana anterior'}.` : per.tipo === 'anio' ? 'Toca Mes para ver el detalle de cada mes.' : `No hay registros ${per.tipo === 'mes' ? 'del mes anterior' : 'de la semana anterior'} para comparar.`} Las gráficas especiales están en Hoy.</p>
    </section></main>${nav('Historial')}</div>`;
  return { titulo: `Historial · ${per.titulo}`, html, montar: (el) => { el.querySelector('[data-kicker]').textContent = kicker; } };
}

// ---------- Tendencia de un astro ----------
export async function astroTendencia({ params: [id], query, hoy }) {
  const a = astro(id);
  const todos = await todosLosDias();
  if (!a) return null;
  if (!todos.length) return vacio();
  const tipo = TIPOS.includes(query.per) ? query.per : 'mes';
  const per = leerPeriodo({ ...query, per: tipo }, hoy);
  const ds = diasDe(todos, per.desde, per.hasta);
  const ant = periodo(per.tipo, per.anterior), dsAnt = diasDe(todos, ant.desde, ant.hasta);
  const prom = ds.length ? promedios(ds)[id] : null, promAnt = dsAnt.length ? promedios(dsAnt)[id] : null;
  const serie = serieAstro(ds, per, id), e = extremos(serie);
  const [sing, plur, tMejor, tBajo] = PARTE[per.tipo];
  const primero = !todos.some((x) => x.fecha < per.desde);
  const comp = promAnt != null ? `<span class="ac-trend" style="justify-content: flex-start;">${tendencia(prom, promAnt).replace('<span class="ac-trend">', '').replace('</span>', '')} vs ${per.tipo === 'semana' ? 'la semana anterior' : per.tipo === 'mes' ? 'el mes anterior' : 'el año anterior'}</span>`
    : `<span class="ac-kicker">${primero ? `Tu primer${per.tipo === 'semana' ? 'a semana' : per.tipo === 'mes' ? ' mes' : ' año'} con registros` : 'Sin datos del período anterior'}</span>`;
  const cumpl = cumplimientoVariables(ds, id);
  const imagenParcial = cumpl.some((v) => v.id === 'imagen' && v.dias !== ds.length);
  const esp = a.especiales.map((x) => { const v = promedioEspecial(ds, id, x.id); return v == null ? '' : `<a class="ac-btn ac-btn--secondary ac-px" href="#/especiales?per=${per.tipo}&f=${per.desde}" style="justify-content: space-between; text-align: left;"><span style="display: flex; flex-direction: column;"><span>${x.nombre} · promedio ${num(v)}${x.tipo === 'caritas' ? ` de ${x.max}` : ''}</span><span style="font-weight: 600; font-size: 14px; color: var(--ink-muted);">Ver en Gráficas especiales</span></span>${ico('siguiente')}</a>`; }).join('');
  const base = `#/historial/astro/${id}`;
  const html = `<div class="ac-screen"><header class="ac-header">
    <div class="ac-row" style="justify-content: flex-start; gap: 12px;"><a class="ac-iconbtn ac-px" href="#/historial?per=${per.tipo}&f=${per.desde}" aria-label="Volver a Historial">${ico('volver')}</a><span class="ac-kicker" style="font-size: 15px;">Historial</span></div>
    ${selectorPeriodo(per, base, { hoy })}</header>
    <main class="ac-main">
      <section class="ac-px ac-card" style="flex-direction: row; align-items: center; gap: 16px; background: ${a.color};">
        ${imgAstro(id, 'style="width: 96px; height: 96px; flex: none;"')}
        <div style="display: flex; flex-direction: column; gap: 2px;"><h1 class="ac-h1" style="font-size: 30px; line-height: 34px;">${a.nombre}</h1>
        <p style="margin: 0;"><span style="font: 700 44px/44px var(--font-pixel);">${num(prom)}</span> <span class="ac-kicker" style="font-size: 14px;">promedio ${per.tipo === 'anio' ? 'del año' : per.tipo === 'mes' ? 'del mes' : 'de la semana'}</span></p>${prom != null ? comp : ''}</div>
      </section>
      ${ds.length ? `<figure class="ac-px ac-card" style="margin: 4px;"><figcaption class="ac-h2">Promedio por ${sing}</figcaption>
        ${linea(serie, { enCurso: enCursoIdx(per, hoy), aria: `${a.nombre} por ${sing}: ${serie.map((p) => `${p.larga} ${p.valor == null ? 'sin registro' : num(p.valor)}`).join(', ')}.` })}
        <a class="ac-link" href="#/tabla?tipo=astro&id=${id}&per=${per.tipo}&f=${per.desde}" style="align-self: center; gap: 10px;">${ico('tabla')}Ver valores en tabla</a></figure>
      ${e && e.max !== e.min ? `<section style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
        <div class="ac-px ac-stat ac-stat--sm"><span class="ac-stat__label">${ico('sube')}${tMejor}</span><span class="ac-stat__value">${listar(e.mejores.map((p) => p.larga), plur)} · ${num(e.max)}</span></div>
        <div class="ac-px ac-stat ac-stat--sm"><span class="ac-stat__label">${ico('baja')}${tBajo}</span><span class="ac-stat__value">${listar(e.bajos.map((p) => p.larga), plur)} · ${num(e.min)}</span></div></section>` : ''}
      <section class="ac-px ac-card" aria-labelledby="cumpl"><h2 id="cumpl" class="ac-h2">¿Qué tanto se cumplió cada variable?</h2>
        ${cumpl.map((v) => `<div style="display: flex; flex-direction: column; gap: 8px;"><div class="ac-row" style="font-size: 15px;"><strong>${v.nombre}</strong><span>${v.dias ? `<strong>${v.cumplidos}</strong> de ${v.dias} días${v.id === 'imagen' && v.dias !== ds.length ? ' que participó' : ''} · ${v.pct}%` : 'No participó'}</span></div><div class="ac-meter" aria-hidden="true"><span style="width: ${v.pct ?? 0}%;"></span></div></div>`).join('')}
        ${imagenParcial ? '<p class="ac-muted">Imagen solo cuenta los días en que participó. Los otros días, Urano se calcula con 4 variables.</p>' : ''}</section>
      ${esp}` : `<p class="ac-text">No hay registros de ${a.nombre} en este período.</p>`}
    </main>${nav('Historial')}</div>`;
  return { titulo: `Tendencia de ${a.nombre}`, html, montar: (el) => { el.querySelector('[data-kicker]').textContent = `${ds.length} ${ds.length === 1 ? 'día registrado' : 'días registrados'}`; } };
}

// ---------- Tablas de valores ----------
function tablaHtml(caption, columnas, filas, pie) {
  const celda = (v) => (v == null ? '<td><span aria-hidden="true">—</span><span class="ac-sr">sin registro</span></td>' : `<td>${num(v)}</td>`);
  return `<div class="ac-px" style="padding: 12px 10px; overflow-x: auto;"><table class="ac-table">
    <caption>${caption}</caption>
    <thead><tr><th scope="col"><span class="ac-sr">Fila</span></th>${columnas.map((c) => `<th scope="col"${c.avg ? ' class="is-avg"' : ''}>${c.abbr ? `<abbr title="${esc(c.titulo)}" style="text-decoration: none;">${c.abbr}</abbr>` : c.titulo}${c.sub ? `<br>${c.sub}` : ''}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((f) => `<tr><th scope="row">${f.nombre}</th>${f.valores.map((v, i) => (columnas[i]?.avg ? celda(v).replace('<td>', '<td class="is-avg">') : celda(v))).join('')}</tr>`).join('')}</tbody>
    ${pie ? `<tfoot><tr><th scope="row">${pie.nombre}</th>${pie.valores.map((v, i) => (columnas[i]?.avg ? celda(v).replace('<td>', '<td class="is-avg">') : celda(v))).join('')}</tr></tfoot>` : ''}
  </table></div>`;
}
const prom = (xs) => { const v = xs.filter((x) => x != null); return v.length ? redondear(v.reduce((s, x) => s + x, 0) / v.length) : null; };

export async function tabla({ query, hoy }) {
  const todos = await todosLosDias();
  const per = leerPeriodo(query, hoy);
  const ds = diasDe(todos, per.desde, per.hasta);
  const tipo = query.tipo || 'general';
  const primero = todos.map((x) => x.fecha).sort()[0] ?? per.desde;
  const partes = per.partes.filter((p) => p.desde <= hoy && p.hasta >= primero);
  const colPartes = partes.map((p) => (per.tipo === 'semana' ? { titulo: p.larga, abbr: p.corta, sub: p.desde.slice(8).replace(/^0/, '') } : { titulo: p.larga, abbr: per.tipo === 'anio' ? p.corta : p.larga.split(' – ')[0] + '–', sub: per.tipo === 'mes' ? p.larga.split(' – ')[1] : '' }));
  let cuerpo = '', titulo = 'Valores en tabla', volver = `#/historial?per=${per.tipo}&f=${per.desde}`, nota = '';
  if (tipo === 'general') {
    const transponer = partes.length > 7;
    const series = ASTROS.map((a) => serieAstro(ds, { partes }, a.id).map((x) => x.valor));
    const generales = serieGeneral(ds, { partes }).map((x) => x.valor);
    if (!transponer) {
      cuerpo = tablaHtml(`Puntaje de cada astro por ${PARTE[per.tipo][0]}, de 0 a 10`, [...colPartes, { titulo: 'Promedio', abbr: 'Prom.', avg: true }],
        ASTROS.map((a, i) => ({ nombre: a.nombre, valores: [...series[i], prom(series[i])] })), { nombre: per.tipo === 'semana' ? 'Día' : 'General', valores: [...generales, prom(generales)] });
    } else {
      cuerpo = tablaHtml('Puntaje de cada astro por mes, de 0 a 10', [...ASTROS.map((a) => ({ titulo: a.nombre, abbr: a.nombre.slice(0, 3) })), { titulo: 'General', abbr: 'Gen.', avg: true }],
        partes.map((p, k) => ({ nombre: p.corta, valores: [...series.map((s) => s[k]), generales[k]] })));
    }
    nota = `— sin registro: no cuenta en el promedio.${per.tipo === 'semana' ? ' «Día» es el promedio de los 8 astros.' : ''}`;
  } else if (tipo === 'astro') {
    const a = astro(query.id);
    volver = `#/historial/astro/${a.id}?per=${per.tipo}&f=${per.desde}`;
    const cols = [{ titulo: 'Puntaje', abbr: 'Punt.' }, ...a.especiales.map((e) => ({ titulo: e.nombre, abbr: e.nombre.slice(0, 5) + '.' }))];
    cuerpo = tablaHtml(`${a.nombre} por ${PARTE[per.tipo][0]}`, cols, partes.map((p) => {
      const sub = diasDe(ds, p.desde, p.hasta);
      return { nombre: per.tipo === 'semana' ? `${p.corta} ${p.desde.slice(8).replace(/^0/, '')}` : p.larga, valores: [sub.length ? promedios(sub)[a.id] : null, ...a.especiales.map((e) => promedioEspecial(sub, a.id, e.id))] };
    }));
    nota = `Puntaje de 0 a 10. ${a.especiales.map((e) => `${e.nombre}: de ${e.tipo === 'caritas' ? 1 : 0} a ${e.max}`).join(' · ')}.`;
  } else {
    volver = `#/especiales?per=${per.tipo}&f=${per.desde}`;
    const termos = ASTROS.flatMap((a) => a.especiales.filter((e) => e.tipo === 'termometro').map((e) => ({ a, e })));
    const caritas = ASTROS.flatMap((a) => a.especiales.filter((e) => e.tipo === 'caritas').map((e) => ({ a, e })));
    const fila = (lista) => partes.map((p) => { const sub = diasDe(ds, p.desde, p.hasta); return { nombre: per.tipo === 'semana' ? `${p.corta} ${p.desde.slice(8).replace(/^0/, '')}` : p.larga, valores: lista.map(({ a, e }) => promedioEspecial(sub, a.id, e.id)) }; });
    cuerpo = tablaHtml('Termómetros, de 0 a 10', termos.map(({ e }) => ({ titulo: e.nombre, abbr: { acercamiento: 'Acerc.', pasividad: 'Pasiv.', pertenencia: 'Perten.' }[e.id] })), fila(termos))
      + tablaHtml('Caritas: Visualización de 1 a 5 y sensaciones de 1 a 6', caritas.map(({ a, e }) => ({ titulo: `${e.nombre} de ${a.nombre}`, abbr: e.id === 'visualizacion' ? 'Visual.' : a.nombre.slice(0, 3) })), fila(caritas));
    nota = 'Sensaciones: 6 Muy bien, 5 Bien, 4 Ni bien ni mal, 3 Mal, 2 Con estrés, 1 Muy mal.';
  }
  return { titulo, html: `<div class="ac-screen"><header class="ac-header">
    <div class="ac-row" style="justify-content: flex-start; gap: 12px;"><a class="ac-iconbtn ac-px" href="${volver}" aria-label="Volver">${ico('volver')}</a><span class="ac-kicker" style="font-size: 15px;">Valores en tabla</span></div>
    <h1 class="ac-h1" style="font-size: 26px; line-height: 30px;">${per.titulo}</h1></header>
    <main class="ac-main">${cuerpo}<p class="ac-muted">${nota}</p></main></div>` };
}
