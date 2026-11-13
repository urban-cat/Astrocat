// Ajustes: datos, respaldo en Excel (exportar y restaurar), cómo se calcula y borrar todo.
import { ASTROS, num, deIso } from '../modelo.js';
import { todosLosDias, leerMeta, guardarMeta, importarDias, borrarTodo } from '../db.js';
import { esc, ico, imgAstro, nav, dialogo } from '../ui.js';
import { ir, hoyIso, refrescar } from '../app.js';

const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const corta = (f) => { const d = deIso(f); return `${d.getDate()} ${MES3[d.getMonth()]}`; };
const larga = (f) => { const d = deIso(f); return `${d.getDate()} ${MES3[d.getMonth()]} ${d.getFullYear()}`; };
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

// Estado del respaldo: { ultimo (ISO), diasDesde, sinRespaldar, debeAvisar }
export async function estadoRespaldo(dias) {
  dias ??= await todosLosDias();
  const ultimo = await leerMeta('ultimoRespaldo');
  const hoy = hoyIso();
  const sinRespaldar = ultimo ? dias.filter((d) => d.actualizado > ultimo).length : dias.length;
  const primero = dias.map((d) => d.fecha).sort()[0];
  const diasDesde = ultimo ? diasEntre(ultimo.slice(0, 10), hoy) : primero ? diasEntre(primero, hoy) : 0;
  const pospuesto = await leerMeta('avisoPospuesto');
  return { ultimo, diasDesde, sinRespaldar, debeAvisar: sinRespaldar > 0 && diasDesde >= 7 && pospuesto !== hoy };
}

// ---------- Exportar ----------
export async function exportar() {
  try {
    const dias = await todosLosDias();
    if (!dias.length) { dialogo(`<h1 id="x-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">Aún no hay nada que respaldar</h1><p class="ac-text">Cuando registres tu primer día podrás exportarlo a Excel.</p><button type="button" class="ac-btn ac-btn--primary ac-px" data-cerrar>Entendido</button>`, { etiqueta: 'x-t' }); return; }
    const { crearRespaldo, nombreArchivo } = await import('../excel.js');
    const nombre = nombreArchivo(hoyIso());
    const blob = new Blob([crearRespaldo(dias)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    await guardarMeta('ultimoRespaldo', new Date().toISOString());
    await guardarMeta('avisoPospuesto', null);
    const fechas = dias.map((d) => d.fecha).sort();
    const archivo = new File([blob], nombre, { type: blob.type });
    const puedeCompartir = navigator.canShare?.({ files: [archivo] });
    const d = dialogo(`<div class="ac-row"><h1 id="exp-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">Respaldo listo</h1><button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
      <div class="ac-px" style="display: flex; gap: 10px; align-items: center; padding: 10px 12px; background: var(--surface-lilac);"><img class="px" src="img/ui/excel.svg" alt="" style="width: 48px; height: 48px;">
        <span style="display: flex; flex-direction: column; min-width: 0;"><strong style="font-size: 15px; overflow-wrap: anywhere;">${nombre}</strong><span class="ac-muted">${plural(dias.length, 'día', 'días')} · del ${corta(fechas[0])} al ${larga(fechas.at(-1))}</span></span></div>
      <p class="ac-text" style="font-size: 15px; line-height: 22px;">Se guardó en <strong>Descargas</strong>. Si pierdes el teléfono, se pierde con él: envíatelo por correo o súbelo a tu Drive.</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${puedeCompartir ? '<button type="button" class="ac-btn ac-btn--primary ac-px" data-compartir>Compartir archivo</button>' : ''}
        <button type="button" class="ac-btn ac-btn--tertiary" data-cerrar style="align-self: center;">Listo</button></div>`, { clase: 'ac-sheet', etiqueta: 'exp-t' });
    d.addEventListener('close', () => refrescar());
    d.querySelector('[data-compartir]')?.addEventListener('click', () => navigator.share({ files: [archivo], title: 'Respaldo de Astrocat' }).catch(() => {}));
  } catch (e) {
    console.error(e);
    const lleno = e?.name === 'QuotaExceededError';
    const d = dialogo(`<div class="ac-row"><h1 id="ee-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">No se pudo crear el respaldo</h1><button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
      <div role="alert" class="ac-px ac-alert ac-alert--error">${ico('error')}<div><strong style="font: 800 16px/22px var(--font-sans);">${lleno ? 'No hay espacio en Descargas' : 'Hubo un problema al crear el archivo'}</strong><span style="font: 600 15px/22px var(--font-sans);">Tus días siguen guardados en el teléfono. ${lleno ? 'Libera espacio y vuelve a intentarlo.' : 'Vuelve a intentarlo.'}</span></div></div>
      <div style="display: flex; flex-direction: column; gap: 8px;"><button type="button" class="ac-btn ac-btn--primary ac-px" data-otra>${ico('exportar')}Intentar de nuevo</button><button type="button" class="ac-btn ac-btn--tertiary" data-cerrar style="align-self: center;">Cancelar</button></div>`, { clase: 'ac-sheet', rol: 'alertdialog', etiqueta: 'ee-t' });
    d.querySelector('[data-otra]').addEventListener('click', () => { d.close(); exportar(); });
  }
}

// ---------- Restaurar ----------
export function restaurar() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  input.addEventListener('change', async () => {
    const f = input.files?.[0]; if (!f) return;
    const { leerRespaldo } = await import('../excel.js');
    let leido;
    try { leido = leerRespaldo(new Uint8Array(await f.arrayBuffer())); }
    catch (e) {
      const motivo = { 'no-es-excel': 'No es un archivo de Excel.', 'sin-hoja': 'No es un respaldo de Astrocat.', vacio: 'El respaldo no tiene días.', 'filas-invalidas': 'Los días del archivo están incompletos o dañados.' }[e.message] ?? 'No pudimos leerlo.';
      const d = dialogo(`<div class="ac-row"><h1 id="re-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">Restaurar desde Excel</h1><button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
        <div class="ac-px" style="display: flex; gap: 10px; align-items: center; padding: 10px 12px; background: var(--surface-lilac);"><img class="px" src="img/ui/excel.svg" alt="" style="width: 48px; height: 48px;"><span style="display: flex; flex-direction: column; min-width: 0;"><strong style="font-size: 15px; overflow-wrap: anywhere;">${esc(f.name)}</strong><span class="ac-muted">${motivo}</span></span></div>
        <div role="alert" class="ac-px ac-alert ac-alert--error">${ico('error')}<div><strong style="font: 800 16px/22px var(--font-sans);">No pudimos leer este archivo</strong><span style="font: 600 15px/22px var(--font-sans);">Elige un Excel exportado por Astrocat: tiene una hoja llamada Respaldo. Tus datos no cambiaron.</span></div></div>
        <div style="display: flex; flex-direction: column; gap: 8px;"><button type="button" class="ac-btn ac-btn--primary ac-px" data-otro>${ico('restaurar')}Elegir otro archivo</button><button type="button" class="ac-btn ac-btn--tertiary" data-cerrar style="align-self: center;">Cancelar</button></div>`, { clase: 'ac-sheet', rol: 'alertdialog', etiqueta: 're-t' });
      d.querySelector('[data-otro]').addEventListener('click', () => { d.close(); restaurar(); });
      return;
    }
    const actuales = await todosLosDias();
    const set = new Set(actuales.map((d) => d.fecha));
    const enAmbos = leido.dias.filter((d) => set.has(d.fecha)).length;
    const soloTel = actuales.filter((d) => !leido.dias.some((x) => x.fecha === d.fecha));
    const fs = leido.dias.map((d) => d.fecha);
    const opciones = actuales.length ? `<fieldset style="border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; min-width: 0;">
        <legend class="ac-h2" style="font-size: 16px; padding: 0; margin-bottom: 10px;">¿Qué hacer con los datos?</legend>
        <label class="ac-choice ac-px is-on"><input type="radio" name="modo" value="combinar" checked><span style="display: flex; flex-direction: column; gap: 2px;"><strong style="font-size: 16px;">Combinar</strong><span class="ac-muted" style="color: var(--ink);">Agrega los días que faltan. Si un día está en los dos, se queda el del teléfono.</span></span></label>
        <label class="ac-choice ac-px"><input type="radio" name="modo" value="reemplazar"><span style="display: flex; flex-direction: column; gap: 2px;"><strong style="font-size: 16px;">Reemplazar todo</strong><span class="ac-muted">Borra lo del teléfono y deja solo el archivo.${soloTel.length ? ` Perderías ${plural(soloTel.length, 'día', 'días')}.` : ''}</span></span></label></fieldset>` : '';
    const d = dialogo(`<div class="ac-row"><h1 id="rs-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">Restaurar desde Excel</h1><button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
      <div class="ac-px" style="display: flex; gap: 10px; align-items: center; padding: 10px 12px; background: var(--surface-lilac);"><img class="px" src="img/ui/excel.svg" alt="" style="width: 48px; height: 48px;"><span style="display: flex; flex-direction: column; min-width: 0;"><strong style="font-size: 15px; overflow-wrap: anywhere;">${esc(f.name)}</strong><span class="ac-muted">${plural(fs.length, 'día', 'días')} · del ${corta(fs[0])} al ${larga(fs.at(-1))}</span></span></div>
      <p class="ac-text" style="font-size: 15px; line-height: 22px;">${actuales.length ? `Tu teléfono ya tiene ${plural(actuales.length, 'día', 'días')}. ${enAmbos} de ellos también ${enAmbos === 1 ? 'está' : 'están'} en el archivo.` : 'Tu teléfono no tiene días guardados. Se van a cargar todos los del archivo.'}${leido.descartados ? ` ${plural(leido.descartados, 'fila venía dañada y se omite', 'filas venían dañadas y se omiten')}.` : ''}</p>
      ${opciones}
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;"><button type="button" class="ac-btn ac-btn--primary ac-px" data-ok>${ico('restaurar')}Restaurar</button><button type="button" class="ac-btn ac-btn--tertiary" data-cerrar style="align-self: center;">Cancelar</button></div>`, { clase: 'ac-sheet', etiqueta: 'rs-t' });
    d.addEventListener('change', (e) => { if (e.target.name === 'modo') d.querySelectorAll('.ac-choice').forEach((l) => l.classList.toggle('is-on', l.contains(e.target))); });
    d.querySelector('[data-ok]').addEventListener('click', async () => {
      const modo = d.querySelector('input[name="modo"]:checked')?.value ?? 'combinar';
      try {
        const res = await importarDias(leido.dias, modo);
        await guardarMeta('bienvenidaVista', true);
        const total = (await todosLosDias()).length;
        d.close();
        const r = dialogo(`<div class="ac-row"><h1 id="rl-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">Restauración lista</h1><button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
          <div role="status" class="ac-px ac-alert ac-alert--ok">${ico('cumple')}<div><strong style="font: 800 16px/22px var(--font-sans);">${modo === 'reemplazar' ? 'Reemplazaste tus datos' : actuales.length ? 'Combinaste tu respaldo' : 'Cargaste tu respaldo'}</strong><span style="font: 600 15px/22px var(--font-sans);">Ahora tienes ${plural(total, 'día', 'días')}.</span></div></div>
          <dl class="ac-px ac-card" style="margin: 4px; display: grid; grid-template-columns: 1fr auto; gap: 8px 12px;">
            <dt>Días agregados del archivo</dt><dd style="margin: 0; font: 700 20px/24px var(--font-pixel);">${res.agregados}</dd>
            ${modo === 'combinar' && actuales.length ? `<dt>Días que ya tenías y se quedaron igual</dt><dd style="margin: 0; font: 700 20px/24px var(--font-pixel);">${res.iguales}</dd><dt>Días solo del teléfono</dt><dd style="margin: 0; font: 700 20px/24px var(--font-pixel);">${soloTel.length}</dd>` : ''}
          </dl>
          <div style="display: flex; flex-direction: column; gap: 8px;"><a class="ac-btn ac-btn--primary ac-px" href="#/hoy" data-cerrar>Ir a Hoy</a><button type="button" class="ac-btn ac-btn--tertiary" data-cerrar style="align-self: center;">Listo</button></div>`, { clase: 'ac-sheet', etiqueta: 'rl-t' });
        r.addEventListener('close', () => refrescar());
      } catch (e) {
        console.error(e); d.close();
        dialogo(`<h1 id="rx-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">No se pudo restaurar</h1><p class="ac-text">Hubo un problema al guardar en el teléfono. Tus datos no cambiaron. Vuelve a intentarlo.</p><button type="button" class="ac-btn ac-btn--primary ac-px" data-cerrar>Entendido</button>`, { rol: 'alertdialog', etiqueta: 'rx-t' });
      }
    });
  });
  input.click();
}

// ---------- Borrar todo (2 pasos) ----------
async function borrar() {
  const dias = await todosLosDias();
  const est = await estadoRespaldo(dias);
  const paso2 = (exportado) => {
    const d = dialogo(`<div class="ac-row"><span class="ac-kicker">Paso 2 de 2</span><button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
      ${exportado ? `<div role="status" class="ac-alert ac-alert--ok">${ico('cumple')}<strong style="font: 800 15px/20px var(--font-sans); color: var(--success);">Respaldo guardado en Descargas</strong></div>` : ''}
      <h1 id="b2-t" class="ac-h1" style="font-size: 26px; line-height: 30px;">¿Borrar todo definitivamente?</h1>
      <p id="b2-d" class="ac-text">Se borran los ${plural(dias.length, 'día', 'días')}, sus puntajes y las gráficas especiales. La app queda como recién instalada. <strong>No se puede deshacer.</strong></p>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px;">
        <button type="button" class="ac-btn ac-btn--secondary ac-px" data-cerrar>Cancelar</button>
        <button type="button" class="ac-btn ac-btn--primary ac-px" data-si style="padding: 12px 10px;"><img src="img/ui/borrar.svg" alt="">Sí, borrar</button></div>`, { rol: 'alertdialog', etiqueta: 'b2-t', descripcion: 'b2-d' });
    d.querySelector('[data-si]').addEventListener('click', async () => { await borrarTodo(); d.close(); ir('#/hoy'); });
  };
  const sin = est.ultimo ? `Tu último respaldo es del ${corta(est.ultimo.slice(0, 10))}, así que perderías ${plural(est.sinRespaldar, 'día que no está', 'días que no están')} en ningún Excel.` : 'Nunca has exportado un respaldo, así que no quedaría ninguna copia.';
  const d = dialogo(`<div class="ac-row"><span class="ac-kicker">Paso 1 de 2</span><button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
    <img class="px" src="img/ui/borrar.svg" alt="" style="width: 64px; height: 64px;">
    <h1 id="b1-t" class="ac-h1" style="font-size: 26px; line-height: 30px;">¿Exportar antes de borrar?</h1>
    <p id="b1-d" class="ac-text">Vas a borrar <strong>${plural(dias.length, 'día', 'días')}</strong> de registro. ${est.sinRespaldar ? sin : 'Todos tus días ya están en tu último respaldo.'}</p>
    <button type="button" class="ac-btn ac-btn--primary ac-px" data-exp>${ico('exportar')}Exportar y continuar</button>
    <button type="button" class="ac-btn ac-btn--secondary ac-px" data-sigue>Continuar sin exportar</button>
    <button type="button" class="ac-btn ac-btn--tertiary" data-cerrar style="align-self: center;">Cancelar</button>`, { rol: 'alertdialog', etiqueta: 'b1-t', descripcion: 'b1-d' });
  d.querySelector('[data-sigue]').addEventListener('click', () => { d.close(); paso2(false); });
  d.querySelector('[data-exp]').addEventListener('click', async () => {
    d.close();
    const { crearRespaldo, nombreArchivo } = await import('../excel.js');
    const blob = new Blob([crearRespaldo(dias)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombreArchivo(hoyIso()) });
    document.body.append(a); a.click(); a.remove();
    await guardarMeta('ultimoRespaldo', new Date().toISOString());
    paso2(true);
  });
}

// ---------- Pantalla principal ----------
export async function vista() {
  const dias = await todosLosDias();
  const est = await estadoRespaldo(dias);
  const desde = dias.map((d) => d.fecha).sort()[0];
  const alerta = !dias.length ? '' : !est.ultimo
    ? `<div role="status" class="ac-px ac-alert ac-alert--warn">${ico('aviso')}<span style="font: 600 15px/22px var(--font-sans);"><strong>Aún no tienes respaldo.</strong> ${plural(dias.length, 'día está', 'días están')} solo en este teléfono.</span></div>`
    : est.sinRespaldar ? `<div role="status" class="ac-px ac-alert${est.diasDesde >= 7 ? ' ac-alert--warn' : ''}"${est.diasDesde >= 7 ? '' : ' style="background: var(--primary-soft);"'}>${ico(est.diasDesde >= 7 ? 'aviso' : 'info')}<span style="font: 600 15px/22px var(--font-sans);"><strong>Último respaldo: ${est.diasDesde === 0 ? 'hoy' : est.diasDesde === 1 ? 'ayer' : `hace ${est.diasDesde} días`}</strong> (${corta(est.ultimo.slice(0, 10))}). ${plural(est.sinRespaldar, 'día sin respaldar', 'días sin respaldar')}.</span></div>`
    : `<div role="status" class="ac-px ac-alert ac-alert--ok">${ico('cumple')}<span style="font: 600 15px/22px var(--font-sans);"><strong>Todo respaldado.</strong> Último respaldo: ${corta(est.ultimo.slice(0, 10))}.</span></div>`;
  const html = `<div class="ac-screen"><header class="ac-header"><h1 class="ac-h1">Ajustes</h1></header>
    <main class="ac-main" style="gap: 24px;">
      <section aria-labelledby="datos" style="display: flex; flex-direction: column; gap: 12px;"><h2 id="datos" class="ac-h2">Tus datos</h2>
        <div class="ac-px ac-card" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
          <div style="display: flex; flex-direction: column;"><span class="ac-kicker">Días registrados</span><strong style="font: 700 30px/32px var(--font-pixel);">${dias.length}</strong></div>
          <div style="display: flex; flex-direction: column;"><span class="ac-kicker">Desde</span><strong style="font: 700 22px/32px var(--font-pixel);">${desde ? larga(desde) : '—'}</strong></div>
          <p class="ac-text" style="grid-column: 1 / -1; font-size: 15px; line-height: 22px;">Se guardan solo en este teléfono. Si borras los datos del navegador o desinstalas la app, se pierden.</p></div></section>
      <section aria-labelledby="respaldo" style="display: flex; flex-direction: column; gap: 14px;"><h2 id="respaldo" class="ac-h2">Respaldo en Excel</h2>
        ${alerta}
        <button type="button" class="ac-btn ac-btn--primary ac-px" data-exportar>${ico('exportar')}Exportar a Excel</button>
        <p class="ac-muted">Crea un archivo con todo tu historial: hojas Diario, Semanal, Mensual, Anual, Detalle y Respaldo. Se guarda en Descargas.</p>
        <button type="button" class="ac-btn ac-btn--secondary ac-px" data-restaurar>${ico('restaurar')}Restaurar desde Excel</button>
        <p class="ac-muted">Usa un archivo exportado por Astrocat, por ejemplo al cambiar de teléfono.</p></section>
      <section aria-labelledby="sobre" style="display: flex; flex-direction: column; gap: 10px;"><h2 id="sobre" class="ac-h2">Sobre Astrocat</h2>
        <div style="display: flex; align-items: center; gap: 12px;"><img class="px" src="img/logo.svg" alt="" style="width: 64px; height: 64px; border-radius: 50%; flex: none;">
          <span style="display: flex; flex-direction: column;"><strong style="font: 500 20px/24px var(--font-pixel);">Versión 1.0</strong><span class="ac-muted">Se actualiza sola · datos versión 1</span></span></div>
        <a class="ac-link" href="#/ajustes/calculo">${ico('info')}Cómo se calcula cada astro</a></section>
      <section aria-labelledby="cuidado" style="display: flex; flex-direction: column; gap: 12px; padding-top: 18px; box-shadow: 0 -3px 0 0 var(--shadow-soft);"><h2 id="cuidado" class="ac-h2">Zona de cuidado</h2>
        <button type="button" class="ac-btn ac-btn--secondary ac-px" data-borrar style="color: var(--danger);"${dias.length ? '' : ' aria-disabled="true"'}>${ico('borrar')}Borrar todos los datos</button>
        <p class="ac-muted">Primero te ofrece exportar y luego pide confirmar. No se puede deshacer.</p></section>
    </main>${nav('Ajustes')}</div>`;
  return { titulo: 'Ajustes', html, montar: (el) => {
    el.querySelector('[data-exportar]').addEventListener('click', exportar);
    el.querySelector('[data-restaurar]').addEventListener('click', restaurar);
    el.querySelector('[data-borrar]').addEventListener('click', (e) => { if (e.currentTarget.getAttribute('aria-disabled') !== 'true') borrar(); });
  } };
}

// ---------- Cómo se calcula ----------
export async function calculo() {
  const tipoTexto = (v) => (v.tipo === 'sino' ? 'Sí / No' : v.tipo === 'imagen' ? 'Sí / No + tiempo' : `${v.min} a ${v.max}${v.unidad ? ' ' + v.unidad : ''}`);
  const espTexto = (e) => (e.tipo === 'termometro' ? 'Termómetro de 0 a 10 · más alto es mejor'
    : e.id === 'visualizacion' ? 'Escala de 5 caritas · de “No se pudo ver” a “Se vio con claridad”' : 'Escala de 6 caritas · de 1 “Muy mal” a 6 “Muy bien”, con “Con estrés” en 2');
  const tarjetas = ASTROS.map((a) => `<article class="ac-px ac-card" aria-labelledby="r-${a.id}">
      <div style="display: flex; align-items: center; gap: 14px;">${imgAstro(a.id, 'style="width: 64px; height: 64px; flex: none;"')}
        <div><h2 id="r-${a.id}" class="ac-h1" style="font-size: 24px; line-height: 28px;">${a.nombre}</h2><p class="ac-muted">${a.variables.length === 1 ? '1 variable · vale 100%' : `${a.variables.length} variables · ${num(100 / a.variables.length)}% cada una`}</p></div></div>
      <ul class="ac-rules">${a.variables.map((v) => `<li class="ac-rule"><span class="ac-rule__name">${v.nombre}</span><span class="ac-rule__type">${tipoTexto(v)}</span><span class="ac-rule__ok">${ico('cumple')}${v.regla}</span></li>`).join('')}</ul>
      ${a.especiales.map((e) => `<div class="ac-rule-esp"><span class="ac-kicker">Gráfica especial · no cuenta para el radar</span><strong>${e.nombre}</strong><span class="ac-muted">${espTexto(e)}</span></div>`).join('')}
      ${a.id === 'urano' ? `<div class="ac-rule-note">${ico('info')}<span>Si respondes No en Imagen, ese día Imagen no participa: Urano se calcula con las otras 4 variables, 25% cada una.</span></div>` : ''}
    </article>`).join('');
  return { titulo: 'Cómo se calcula cada astro', html: `<div class="ac-screen"><header class="ac-header">
    <div class="ac-row" style="justify-content: flex-start; gap: 12px;"><a class="ac-iconbtn ac-px" href="#/ajustes" aria-label="Volver a Ajustes">${ico('volver')}</a><span class="ac-kicker" style="font-size: 15px;">Ajustes</span></div>
    <h1 class="ac-h1">Cómo se calcula cada astro</h1></header>
    <main class="ac-main">
      <section class="ac-px ac-card" aria-labelledby="regla" style="background: var(--primary-soft);"><h2 id="regla" class="ac-h2">La regla general</h2>
        <p class="ac-text" style="font-size: 15px; line-height: 22px;">Cada astro tiene un puntaje de 0 a 10. Es el porcentaje de variables que cumpliste ese día, multiplicado por 10. Todas las variables de un astro pesan lo mismo.</p>
        <p class="ac-text" style="font-size: 15px; line-height: 22px;"><strong>Ejemplo:</strong> si en Quirón cumples 2 de 3 variables, Quirón queda en 6,7.</p>
        <p class="ac-muted" style="color: var(--ink);">Las gráficas especiales (termómetros, Visualización y Escala de sensaciones) se registran, pero no suman al radar. Los días sin registro quedan vacíos y no cuentan en los promedios.</p></section>
      ${tarjetas}
    </main></div>` };
}
