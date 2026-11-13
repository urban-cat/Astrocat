// Hoja para elegir otro día (calendario mensual que empieza el lunes).
import { iso, deIso, MESES, fechaLarga } from '../modelo.js';
import { diasEntre } from '../db.js';
import { dialogo, ico } from '../ui.js';
import { ir, hoyIso } from '../app.js';
import { diaCorto } from './hoy.js';

export function elegirDia({ modo = 'ir', fecha, alElegir } = {}) {
  const hoy = hoyIso();
  let mes = deIso(fecha || hoy); mes.setDate(1);
  let sel = null;
  const d = dialogo('<div data-cal></div>', { clase: 'ac-sheet', etiqueta: 'cal-t' });
  const cont = d.querySelector('[data-cal]');

  async function pintar(foco) {
    const y = mes.getFullYear(), m = mes.getMonth();
    const desde = iso(new Date(y, m, 1)), hasta = iso(new Date(y, m + 1, 0));
    const registrados = new Set((await diasEntre(desde, hasta)).map((x) => x.fecha));
    const total = new Date(y, m + 1, 0).getDate();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const proximo = iso(new Date(y, m + 1, 1));
    const celdas = Array.from({ length: total }, (_, k) => {
      const f = iso(new Date(y, m, k + 1));
      const rec = registrados.has(f), futuro = f > hoy, bloqueado = futuro || (modo === 'mover' && rec && f !== fecha);
      const cls = ['ac-cal__day', rec && 'is-rec', f === hoy && 'is-today', f === sel && 'is-sel'].filter(Boolean).join(' ');
      const lab = `${k + 1} de ${MESES[m]}${f === hoy ? ', hoy' : ''}${rec ? ', con registro' : futuro ? ', día futuro' : ', sin registro'}`;
      return `<li${k === 0 && offset ? ` style="grid-column-start: ${offset + 1};"` : ''}><button type="button" class="${cls}" data-f="${f}" aria-label="${lab}"${bloqueado ? ' aria-disabled="true"' : ''}${f === sel ? ' aria-pressed="true"' : ''}>${k + 1}</button></li>`;
    }).join('');
    const titulo = modo === 'mover' ? '¿Para qué día es este registro?' : '¿Qué día quieres registrar?';
    cont.innerHTML = `<div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="ac-row"><h1 id="cal-t" class="ac-h1" style="font-size: 24px; line-height: 28px;">${titulo}</h1>
        <button type="button" class="ac-iconbtn ac-px" data-cerrar aria-label="Cerrar">${ico('cerrar')}</button></div>
      <div class="ac-row">
        <button type="button" class="ac-iconbtn ac-px" data-mes="-1" aria-label="${MESES[(m + 11) % 12]}">${ico('anterior')}</button>
        <span class="ac-datenav__date">${MESES[m][0].toUpperCase() + MESES[m].slice(1)} ${y}</span>
        <button type="button" class="ac-iconbtn ac-px" data-mes="1" aria-label="${MESES[(m + 1) % 12]}"${proximo > hoy ? ' aria-disabled="true"' : ''}>${ico('siguiente')}</button>
      </div>
      <ul class="ac-cal"><li class="ac-cal__dow" aria-hidden="true">L</li><li class="ac-cal__dow" aria-hidden="true">M</li><li class="ac-cal__dow" aria-hidden="true">X</li><li class="ac-cal__dow" aria-hidden="true">J</li><li class="ac-cal__dow" aria-hidden="true">V</li><li class="ac-cal__dow" aria-hidden="true">S</li><li class="ac-cal__dow" aria-hidden="true">D</li>${celdas}</ul>
      <div style="display: flex; gap: 18px; font: 700 13px/18px var(--font-sans);" aria-hidden="true">
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; background: var(--primary);"></span>Con registro</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 14px; height: 14px; box-shadow: inset 0 0 0 3px var(--outline);"></span>Hoy</span>
      </div>
      <p class="ac-live" role="status">${sel ? `${fechaLarga(sel)} · sin registro` : modo === 'mover' ? 'Elige un día sin registro.' : 'Elige un día. Si ya tiene registro, se abre para verlo.'}</p>
      ${sel ? `<button type="button" class="ac-btn ac-btn--primary ac-px" data-ok>${modo === 'mover' ? `Pasar al ${diaCorto(sel)}` : `Registrar el ${diaCorto(sel)}`}</button>` : ''}
      ${modo === 'ir' ? '<p class="ac-muted">Si eliges un día con registro, se abre para verlo o editarlo.</p>' : ''}
    </div>`;
    if (foco) cont.querySelector(foco)?.focus();
  }

  cont.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    if (b.dataset.mes) { mes.setMonth(mes.getMonth() + Number(b.dataset.mes)); sel = null; await pintar(`[data-mes="${b.dataset.mes}"]`); return; }
    if (b.dataset.f) {
      const f = b.dataset.f;
      if (b.classList.contains('is-rec') && modo === 'ir') { d.close(); ir(`#/hoy?d=${f}`); return; }
      sel = f; await pintar(`[data-f="${f}"]`); return;
    }
    if (b.hasAttribute('data-ok')) {
      d.close();
      if (modo === 'mover') alElegir?.(sel); else ir(`#/registro/quiron?d=${sel}&nuevo=1`);
    }
  });
  pintar();
}
