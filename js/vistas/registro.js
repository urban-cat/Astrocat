// Registro paso a paso (8 astros) + revisión. Guarda un borrador en cada cambio.
import { ASTROS, astro, faltantes, puntaje, fechaLarga, num, deIso } from '../modelo.js';
import { leerBorrador, guardarBorrador, borrarBorrador, leerDia, guardarDia } from '../db.js';
import { esc, ico, imgAstro, imgCarita, dialogo, aviso, error } from '../ui.js';
import { ir } from '../app.js';

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA3 = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const fechaBoton = (f) => { const d = deIso(f); return `${DIA3[d.getDay()]} ${d.getDate()} ${MES_CORTO[d.getMonth()]}`; };
const pesoTexto = (a) => (a.variables.length === 1 ? '1 variable · vale 100%' : `${a.variables.length} variables · ${num(100 / a.variables.length)}% cada una`);

// Carga o crea el borrador correcto para esta fecha y modo.
async function prepararBorrador(fecha, { nuevo }) {
  const b = await leerBorrador();
  if (b && b.fecha === fecha && !nuevo) return b;
  const dia = await leerDia(fecha);
  const nb = dia
    ? { fecha, modo: 'editar', paso: 8, respuestas: structuredClone(dia.respuestas), original: structuredClone(dia.respuestas) }
    : { fecha, modo: 'nuevo', paso: 0, respuestas: Object.fromEntries(ASTROS.map((a) => [a.id, {}])) };
  await guardarBorrador(nb);
  return nb;
}

export async function paso({ params: [id], query, hoy }) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(query.d || '') ? query.d : hoy;
  const b = await prepararBorrador(fecha, { nuevo: query.nuevo === '1' });
  if (id === 'revision') return revision(b);
  const i = ASTROS.findIndex((a) => a.id === id);
  if (i < 0) { ir(`#/registro/quiron?d=${fecha}`); return null; }
  return pasoAstro(b, i);
}

// ---------- Campos ----------
function stepper(fid, nombre, valor, { min, max, unidad, error: err }) {
  return `<div class="ac-stepper${err ? ' ac-stepper--error' : ''}">
      <button type="button" class="ac-iconbtn ac-px" data-mas="-1" data-campo="${fid}" aria-label="Restar 1 a ${esc(nombre)}"><span aria-hidden="true">−</span></button>
      <div class="ac-stepper__box ac-px"><input id="${fid}" class="ac-stepper__input" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${Number.isFinite(valor) ? valor : ''}" placeholder="—" aria-describedby="${fid}-h${err ? ` ${fid}-e` : ''}"${err ? ' aria-invalid="true"' : ''}>${unidad ? `<span class="ac-stepper__unit" aria-hidden="true">${unidad === 'minutos' ? 'min' : unidad}</span>` : ''}</div>
      <button type="button" class="ac-iconbtn ac-px" data-mas="1" data-campo="${fid}" aria-label="Sumar 1 a ${esc(nombre)}"><span aria-hidden="true">+</span></button>
    </div>`;
}
const msgError = (fid, t) => `<p id="${fid}-e" class="ac-error-msg">${ico('error')}${esc(t)}</p>`;
const sinoHtml = (name, valor) => `<div class="ac-sino">
      <label class="ac-opt ac-px${valor === true ? ' is-on' : ''}"><input type="radio" name="${name}" value="si"${valor === true ? ' checked' : ''}>Sí</label>
      <label class="ac-opt ac-px${valor === false ? ' is-on' : ''}"><input type="radio" name="${name}" value="no"${valor === false ? ' checked' : ''}>No</label>
    </div>`;

function campo(a, v, r, errores) {
  const fid = `f-${v.id}`, err = errores.includes(v.id), x = r[v.id];
  const cls = `ac-field ac-px${err ? ' is-error' : ''}`;
  if (v.tipo === 'sino') return `<fieldset class="${cls}" id="${fid}" data-var="${v.id}"${err ? ` aria-describedby="${fid}-e"` : ''}><legend>${v.nombre}</legend>${sinoHtml(v.id, x)}${err ? msgError(fid, `Elige Sí o No en ${v.nombre}.`) : ''}</fieldset>`;
  if (v.tipo === 'numero') return `<div class="${cls}" data-var="${v.id}">
      <label class="ac-field__label" for="${fid}">${v.nombre}</label>
      ${stepper(fid, v.nombre, x, { ...v, error: err })}
      <span id="${fid}-h" class="ac-kicker">De ${v.min} a ${v.max}${v.unidad ? ' ' + v.unidad : ''} · ${v.regla.replace('Cumple', 'cumple')}</span>
      ${err ? msgError(fid, `Escribe o elige ${v.unidad === 'horas' ? 'las horas de' : v.unidad === 'minutos' ? 'los minutos de' : 'el valor de'} ${v.nombre}.`) : ''}</div>`;
  if (v.tipo === 'imagen') {
    const faltaHoras = err && x?.si === true;
    return `<fieldset class="${cls}" id="${fid}" data-var="${v.id}"><legend>${v.nombre}</legend>${sinoHtml(v.id, x?.si)}
      ${x?.si ? `<div class="ac-sub"><label class="ac-field__label" for="${fid}-horas">Tiempo</label>${stepper(`${fid}-horas`, 'Tiempo de Imagen', x.horas, { min: 0, max: 24, unidad: 'horas', error: faltaHoras })}
        <span id="${fid}-horas-h" class="ac-kicker">Cumple con 3 h o menos. Aparece solo si respondes Sí.</span>${faltaHoras ? msgError(`${fid}-horas`, 'Escribe o elige las horas de Imagen.') : ''}</div>` : ''}
      ${!faltaHoras && err ? msgError(fid, 'Elige Sí o No en Imagen.') : ''}
      ${x?.si === false ? '<p class="ac-muted">Con No, Imagen no participa hoy: Urano se calcula con las otras 4 variables.</p>' : ''}</fieldset>`;
  }
  return '';
}

function especial(a, e, r, errores) {
  const fid = `f-${e.id}`, err = errores.includes(e.id), x = r[e.id];
  const head = `<span class="ac-kicker" style="clear: both;">Gráfica especial de ${a.nombre} · no cuenta para el radar</span>`;
  if (e.tipo === 'termometro') return `<div class="ac-field ac-especial${err ? ' is-error' : ''}" data-var="${e.id}">
      ${head}<label class="ac-field__label" for="${fid}">${e.nombre}</label>
      ${stepper(fid, e.nombre, x, { min: 0, max: 10, error: err })}
      <span id="${fid}-h" class="ac-kicker">De 0 a 10 · más alto es mejor</span>${err ? msgError(fid, `Escribe o elige el valor de ${e.nombre}.`) : ''}</div>`;
  return `<fieldset class="ac-field ac-especial${err ? ' is-error' : ''}" id="${fid}" data-var="${e.id}"><legend class="ac-field__label">${e.nombre}</legend>${head}
      <div class="ac-likert">${e.opciones.map((o) => `<label class="ac-face ac-px${x === o.valor ? ' is-on' : ''}"><input type="radio" name="${e.id}" value="${o.valor}"${x === o.valor ? ' checked' : ''}>${imgCarita(o.carita)}${o.texto}</label>`).join('')}</div>
      ${err ? msgError(fid, `Elige una opción en ${e.nombre}.`) : ''}</fieldset>`;
}

const estadoVivo = (a, r) => {
  const f = faltantes(a.id, r);
  const conteoVars = f.filter((id) => a.variables.some((v) => v.id === id)).length;
  if (conteoVars) return `${a.nombre} hoy: faltan ${conteoVars} ${conteoVars === 1 ? 'respuesta' : 'respuestas'}`;
  const p = puntaje(a.id, r);
  return `${a.nombre} hoy: <strong>${num(p.valor)}</strong> de 10 · cumple ${p.cumplidas} de ${p.total}`;
};

function pasoAstro(b, i, errores = []) {
  const a = ASTROS[i], r = b.respuestas[a.id] ?? {};
  const q = `?d=${b.fecha}`;
  const sig = i < 7 ? ASTROS[i + 1] : null;
  const nombreFalta = (id) => [...a.variables, ...a.especiales].find((x) => x.id === id).nombre;
  const alerta = errores.length ? `<div role="alert" class="ac-alert ac-alert--error ac-px" id="alerta" tabindex="-1">
      ${ico('aviso')}<div style="display: flex; flex-direction: column; gap: 2px;"><strong style="font: 800 16px/22px var(--font-sans);">Falta responder ${errores.length} ${errores.length === 1 ? 'variable' : 'variables'}</strong>
      <a class="ac-link" href="#f-${errores[0]}" data-ir="${errores[0]}" style="min-height: 36px;">Ir a ${nombreFalta(errores[0])}</a></div></div>` : '';
  const html = `<div class="ac-screen">
    <header class="ac-header">
      <div class="ac-row">
        <button type="button" class="ac-iconbtn ac-px" data-salir aria-label="Salir del registro">${ico('cerrar')}</button>
        ${b.modo === 'nuevo' ? `<button type="button" class="ac-btn ac-btn--secondary ac-px" data-cambiar style="min-height: 48px; padding: 8px 14px 8px 8px;" aria-label="${fechaLarga(b.fecha)}. Cambiar día">${ico('calendario')}${fechaBoton(b.fecha)} · Cambiar</button>`
                             : `<span class="ac-kicker">Editando · ${fechaBoton(b.fecha)}</span>`}
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span class="ac-kicker">Paso ${i + 1} de 8</span>
        <div class="ac-progress" aria-hidden="true">${ASTROS.map((_, k) => `<span${k < i ? ' class="done"' : k === i ? ' class="now"' : ''}></span>`).join('')}</div>
      </div>
    </header>
    <main class="ac-main" style="gap: 16px;">
      ${alerta}
      <div class="ac-stephead">${imgAstro(a.id)}<div><h1 class="ac-h1" style="font-size: 32px; line-height: 36px;">${a.nombre}</h1><p class="ac-muted">${pesoTexto(a)}</p></div></div>
      ${a.variables.map((v) => campo(a, v, r, errores)).join('')}
      ${a.especiales.map((e) => especial(a, e, r, errores)).join('')}
      <p class="ac-live" role="status" id="vivo">${estadoVivo(a, r)}</p>
    </main>
    <footer class="ac-footer">
      <button type="button" class="ac-btn ac-btn--secondary ac-px" data-siguiente>${b.paso >= 8 ? 'Volver a la revisión' : sig ? `Siguiente: ${sig.nombre}` : 'Revisar el día'}${ico('siguiente')}</button>
      ${b.paso >= 8 ? '' : i === 0 ? `<div class="ac-footer__prev"><button type="button" class="ac-btn ac-btn--tertiary" aria-disabled="true" aria-describedby="primer">${ico('anterior')}Anterior</button><span id="primer" class="ac-kicker">Es el primer paso</span></div>`
                : `<a class="ac-btn ac-btn--tertiary" href="#/registro/${ASTROS[i - 1].id}${q}">${ico('anterior')}Anterior</a>`}
    </footer></div>`;
  return { titulo: `Registro, paso ${i + 1}: ${a.nombre}`, html, conservarFoco: false, montar: (el) => montarPaso(el, b, i, errores) };
}

function montarPaso(el, b, i, errores) {
  const a = ASTROS[i];
  const r = (b.respuestas[a.id] ??= {});
  let pend;
  const guardar = () => { clearTimeout(pend); pend = setTimeout(() => guardarBorrador(b), 250); };
  const redibujar = (focoSel) => {
    const pend2 = errores.filter((id) => faltantes(a.id, r).includes(id));
    const v = pasoAstro(b, i, pend2);
    const nuevo = document.createElement('div');
    nuevo.innerHTML = v.html;
    el.replaceWith(nuevo);
    montarPaso(nuevo, b, i, pend2);
    if (focoSel) nuevo.querySelector(focoSel)?.focus();
  };
  const actualizarVivo = () => { el.querySelector('#vivo').innerHTML = estadoVivo(a, r); };

  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'radio') {
      const id = t.name;
      if (id === 'imagen') { r.imagen = t.value === 'si' ? { si: true, horas: r.imagen?.horas } : { si: false }; guardar(); redibujar(`input[name="imagen"][value="${t.value}"]`); return; }
      const esp = a.especiales.find((x) => x.id === id);
      r[id] = esp ? Number(t.value) : t.value === 'si';
      t.closest('.ac-sino, .ac-likert').querySelectorAll('label').forEach((l) => l.classList.toggle('is-on', l.contains(t)));
      if (errores.includes(id)) { guardar(); redibujar(`input[name="${id}"][value="${t.value}"]`); return; }
      guardar(); actualizarVivo();
    }
  });
  const fijarNumero = (input, valor) => {
    const fid = input.id;
    const min = Number(input.min), max = Number(input.max);
    const n = valor === '' || valor == null || Number.isNaN(Number(valor)) ? undefined : Math.max(min, Math.min(max, Math.round(Number(valor))));
    if (fid === 'f-imagen-horas') r.imagen = { si: true, horas: n };
    else r[fid.slice(2)] = n;
    guardar(); actualizarVivo();
    return n;
  };
  el.addEventListener('input', (e) => { if (e.target.classList.contains('ac-stepper__input')) fijarNumero(e.target, e.target.value); });
  el.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t.classList?.contains('ac-stepper__input')) { const n = fijarNumero(t, t.value); t.value = Number.isFinite(n) ? n : ''; }
  });
  el.addEventListener('click', async (e) => {
    const mas = e.target.closest('[data-mas]');
    if (mas) {
      const input = el.querySelector(`#${mas.dataset.campo}`);
      const actual = input.value === '' ? (Number(mas.dataset.mas) > 0 ? Number(input.min) - 1 : Number(input.min) + 1) : Number(input.value);
      const n = fijarNumero(input, actual + Number(mas.dataset.mas));
      input.value = n;
      const fid = input.id.replace(/^f-/, '').replace(/-horas$/, '');
      if (errores.includes(fid)) redibujar(`[data-campo="${mas.dataset.campo}"][data-mas="${mas.dataset.mas}"]`);
      return;
    }
    const irA = e.target.closest('[data-ir]');
    if (irA) { e.preventDefault(); const c = el.querySelector(`[data-var="${irA.dataset.ir}"]`); c.scrollIntoView({ block: 'center' }); c.querySelector('input')?.focus(); return; }
    if (e.target.closest('[data-siguiente]')) {
      const f = faltantes(a.id, r);
      if (f.length) { errores = f; redibujar('#alerta'); return; }
      const yaRevisado = b.paso >= 8;
      b.paso = Math.max(b.paso, i + 1);
      await guardarBorrador(b);
      ir(i < 7 && !yaRevisado ? `#/registro/${ASTROS[i + 1].id}?d=${b.fecha}` : `#/registro/revision?d=${b.fecha}`);
      return;
    }
    if (e.target.closest('[data-salir]')) { await guardarBorrador(b); salir(b); return; }
    if (e.target.closest('[data-cambiar]')) {
      await guardarBorrador(b);
      const { elegirDia } = await import('./elegir-dia.js');
      elegirDia({ modo: 'mover', fecha: b.fecha, alElegir: async (f) => { b.fecha = f; await guardarBorrador(b); ir(`#/registro/${a.id}?d=${f}`); } });
    }
  });
}

function salir(b) {
  const hechos = Math.min(b.paso, 8);
  const editar = b.modo === 'editar';
  const d = dialogo(`<h1 id="sal-t" class="ac-h1" style="font-size: 26px; line-height: 30px;">${editar ? '¿Salir sin guardar los cambios?' : '¿Salir del registro?'}</h1>
    <p id="sal-d" class="ac-text">${editar ? 'Tus cambios quedan como borrador y puedes seguir después. El día guardado no cambia hasta que toques Guardar cambios.'
      : `Llevas <strong>${hechos} de 8 astros</strong>. Tus respuestas se guardan como borrador en este teléfono y sigues donde quedaste.`}</p>
    <button type="button" class="ac-btn ac-btn--primary ac-px" data-cerrar>Seguir ${editar ? 'editando' : 'registrando'}</button>
    <a class="ac-btn ac-btn--secondary ac-px" href="#/hoy?d=${b.fecha}" data-cerrar>Salir y seguir después</a>
    <button type="button" class="ac-btn ac-btn--tertiary" data-descartar style="align-self: center; color: var(--danger);"><img class="ac-ico-sm" src="img/ui/borrar.svg" alt="">${editar ? 'Descartar cambios' : 'Descartar respuestas'}</button>`,
  { rol: 'alertdialog', etiqueta: 'sal-t', descripcion: 'sal-d' });
  d.querySelector('[data-descartar]').addEventListener('click', async () => { await borrarBorrador(); d.close(); ir(`#/hoy?d=${b.fecha}`); });
}

// ---------- Revisión ----------
function revision(b) {
  // Si falta algo, vuelve al primer astro incompleto
  const incompleto = ASTROS.find((a) => faltantes(a.id, b.respuestas[a.id]).length);
  if (incompleto) { ir(`#/registro/${incompleto.id}?d=${b.fecha}`); return null; }
  const editar = b.modo === 'editar';
  const cambiados = editar ? ASTROS.filter((a) => JSON.stringify(b.respuestas[a.id]) !== JSON.stringify(b.original?.[a.id])) : [];
  const tarjetas = ASTROS.map((a) => {
    const v = puntaje(a.id, b.respuestas[a.id]).valor;
    const cambio = cambiados.includes(a);
    const antes = cambio ? puntaje(a.id, b.original[a.id]).valor : null;
    return `<li><a class="ac-px ac-astro" href="#/registro/${a.id}?d=${b.fecha}" aria-label="${a.nombre}${cambio ? `, cambiado: ${num(v)} de 10, antes ${num(antes)}` : `, ${num(v)} de 10`}. Editar"${cambio ? ' style="background: var(--primary-soft);"' : ''}>
      ${imgAstro(a.id)}<span class="ac-astro__name" aria-hidden="true">${a.nombre}</span><span class="ac-astro__score" aria-hidden="true">${num(v)} <small>de 10</small></span>
      ${cambio ? `<span class="ac-kicker" aria-hidden="true" style="color: var(--ink);">Cambiado · antes ${num(antes)}</span>` : ''}
      <span class="ac-astro__edit" aria-hidden="true">${ico('editar')}Editar</span></a></li>`;
  }).join('');
  const html = `<div class="ac-screen">
    <header class="ac-header"><div class="ac-row">
      <a class="ac-iconbtn ac-px" href="#/registro/neptuno?d=${b.fecha}" aria-label="Volver a Neptuno">${ico('volver')}</a>
      <span class="ac-datenav__date">${fechaLarga(b.fecha)}</span><span style="width: 56px;" aria-hidden="true"></span>
    </div></header>
    <main class="ac-main" style="gap: 16px;">
      ${editar ? `<div class="ac-px ac-alert" style="background: var(--primary-soft);">${ico('editar')}<div><strong style="font: 800 16px/22px var(--font-sans);">Estás editando un día guardado</strong><span style="font: 600 15px/22px var(--font-sans);">${fechaLarga(b.fecha)}. Los cambios se guardan solo cuando tocas Guardar cambios.</span></div></div>` : ''}
      <div><h1 class="ac-h1">${editar ? 'Revisa los cambios' : 'Revisa tu día'}</h1>
      <p class="ac-text" style="color: var(--ink-muted); margin-top: 4px;">${editar ? (cambiados.length ? `Cambiaste ${cambiados.length} ${cambiados.length === 1 ? 'astro' : 'astros'}. Toca cualquiera para seguir editando.` : 'Aún no cambias nada. Toca un astro para editarlo.') : 'Todo está respondido. Toca un astro para cambiarlo antes de guardar.'}</p></div>
      <ul class="ac-grid2">${tarjetas}</ul>
      <p class="ac-muted">Puntajes de 0 a 10. Las gráficas especiales se ven en Hoy.</p>
    </main>
    <footer class="ac-footer">
      <button type="button" class="ac-btn ac-btn--primary ac-px" data-guardar>${editar ? 'Guardar cambios' : 'Guardar el día'}</button>
      ${editar ? '<button type="button" class="ac-btn ac-btn--tertiary" data-descartar>Descartar cambios</button>' : ''}
    </footer></div>`;
  return { titulo: editar ? 'Revisa los cambios' : 'Revisa tu día', html, montar: (el) => {
    el.querySelector('[data-guardar]').addEventListener('click', () => guardar(b));
    el.querySelector('[data-descartar]')?.addEventListener('click', async () => { await borrarBorrador(); ir(`#/hoy?d=${b.fecha}`); });
  } };
}

async function guardar(b) {
  try {
    await guardarDia(b.fecha, b.respuestas);
    await borrarBorrador();
    ir(`#/hoy?d=${b.fecha}`);
    setTimeout(() => aviso(b.modo === 'editar' ? 'Cambios guardados' : 'Día guardado', { accion: 'Editar', href: `#/registro/revision?d=${b.fecha}&editar=1` }), 300);
  } catch (e) {
    console.error(e);
    const lleno = e?.name === 'QuotaExceededError';
    const d = error('No se pudo guardar el día',
      `${lleno ? 'El teléfono no tiene espacio suficiente.' : 'Hubo un problema al guardar en el teléfono.'} <strong>Tus respuestas siguen aquí</strong>, no se perdió nada. ${lleno ? 'Libera espacio (fotos o apps que no uses) y vuelve a intentarlo.' : 'Vuelve a intentarlo.'}`,
      '<button type="button" class="ac-btn ac-btn--primary ac-px" data-reintentar>Intentar de nuevo</button><button type="button" class="ac-btn ac-btn--tertiary" data-cerrar style="align-self: center;">Volver a revisar</button>');
    d.querySelector('[data-reintentar]').addEventListener('click', () => { d.close(); guardar(b); });
  }
}
