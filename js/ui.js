// Astrocat — utilidades de interfaz compartidas por todas las vistas.
import { ASTROS, num } from './modelo.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ico = (nombre, extra = '') => `<img src="img/ui/${nombre}.svg" alt=""${extra ? ' ' + extra : ''}>`;
export const imgAstro = (id, extra = '') => `<img class="px" src="img/astros/${id}.svg" alt=""${extra ? ' ' + extra : ''}>`;
export const imgCarita = (c, extra = '') => `<img class="px" src="img/caritas/${c}.svg" alt=""${extra ? ' ' + extra : ''}>`;

export function nav(actual) {
  const items = [['#/hoy', 'hoy', 'Hoy'], ['#/historial', 'historial', 'Historial'], ['#/ajustes', 'ajustes', 'Ajustes']];
  return `<nav class="ac-nav" aria-label="Principal">${items.map(([h, i, t]) => `<a href="${h}"${t === actual ? ' aria-current="page"' : ''}>${ico(i)}${t}</a>`).join('')}</nav>`;
}

export function termometroH(valor, max = 10) {
  const on = Math.round((valor / max) * 10);
  return `<div class="ac-thermo-h" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<span${i < on ? ' class="on"' : ''}></span>`).join('')}</div>`;
}

// Radar de 8 ejes (0 a 10). valores: { quiron: 6.7, ... }; previo opcional (línea punteada).
export function radar(valores, { previo, aria = 'Radar de 0 a 10 por astro. Los valores están en las tarjetas de astros.' } = {}) {
  const cx = 170, cy = 150, R = 100;
  const pt = (i, v) => { const a = (-90 + 45 * i) * Math.PI / 180; const r = (R * (v ?? 0)) / 10; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const anillo = (f) => ASTROS.map((_, i) => pt(i, 10 * f).map((n) => n.toFixed(0)).join(',')).join(' ');
  const poligono = (vals) => ASTROS.map((a, i) => pt(i, vals[a.id]).map((n) => n.toFixed(0)).join(',')).join(' ');
  const ejes = ASTROS.map((_, i) => { const [x, y] = pt(i, 10); return `<line class="axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(0)}" y2="${y.toFixed(0)}"></line>`; }).join('');
  const L = [[170, 22, 38, 'middle'], [252, 58, 74, 'start'], [282, 146, 162, 'start'], [252, 240, 256, 'start'], [170, 276, 292, 'middle'], [88, 240, 256, 'end'], [58, 146, 162, 'end'], [88, 58, 74, 'end']];
  const etiquetas = ASTROS.map((a, i) => { const [x, y1, y2, an] = L[i]; return `<text class="lbl" x="${x}" y="${y1}" text-anchor="${an}">${a.nombre}</text><text class="val" x="${x}" y="${y2}" text-anchor="${an}">${num(valores[a.id])}</text>`; }).join('');
  const puntos = ASTROS.map((a, i) => { const [x, y] = pt(i, valores[a.id]); return `<rect x="${(x - 5).toFixed(0)}" y="${(y - 5).toFixed(0)}" width="10" height="10"></rect>`; }).join('');
  return `<svg width="340" height="300" viewBox="0 0 340 300" role="img" aria-label="${esc(aria)}" style="max-width: 100%; height: auto;">
    <polygon class="ring" points="${anillo(1)}"></polygon><polygon class="ring" points="${anillo(0.5)}"></polygon>${ejes}
    ${previo ? `<polygon class="prev" points="${poligono(previo)}"></polygon>` : ''}
    <polygon class="area" points="${poligono(valores)}"></polygon><g class="dot">${puntos}</g>
    <g aria-hidden="true">${etiquetas}</g></svg>`;
}

// Diálogo modal nativo. Devuelve el elemento; se elimina al cerrarse.
export function dialogo(html, { clase = 'ac-dialog ac-px', rol = 'dialog', etiqueta, descripcion } = {}) {
  const d = document.createElement('dialog');
  d.className = clase;
  if (rol === 'alertdialog') d.setAttribute('role', 'alertdialog');
  if (etiqueta) d.setAttribute('aria-labelledby', etiqueta);
  if (descripcion) d.setAttribute('aria-describedby', descripcion);
  d.innerHTML = html;
  const origen = document.activeElement;
  d.addEventListener('close', () => { d.remove(); if (origen?.isConnected) origen.focus(); });
  d.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]')) d.close(); });
  document.body.append(d);
  d.showModal();
  return d;
}

let toastTimer;
export function aviso(texto, { accion, href } = {}) {
  document.querySelector('.ac-toast')?.remove();
  const p = document.createElement('p');
  p.className = 'ac-toast'; p.setAttribute('role', 'status');
  p.innerHTML = `${ico('cumple')}<span>${esc(texto)}</span>${accion ? `<a href="${href}">${esc(accion)}</a>` : ''}`;
  document.body.append(p);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => p.remove(), 6000);
}

export function error(titulo, texto, botones = '') {
  return dialogo(`<img class="px" src="img/ui/error.svg" alt="" style="width: 48px; height: 48px;">
    <h1 id="err-t" class="ac-h1" style="font-size: 26px; line-height: 30px;">${esc(titulo)}</h1>
    <p id="err-d" class="ac-text">${texto}</p>
    ${botones || '<button type="button" class="ac-btn ac-btn--primary ac-px" data-cerrar>Entendido</button>'}`, { rol: 'alertdialog', etiqueta: 'err-t', descripcion: 'err-d' });
}

// Encabezado de período: selector Semana/Mes/Año + flechas. base: ruta sin query; extra: query adicional.
export function selectorPeriodo(per, base, { hoy, extra = '', conDia = false, actual } = {}) {
  const tipos = [...(conDia ? [['dia', 'Día']] : []), ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']];
  const ref = actual ?? per.desde;
  const seg = `<nav class="ac-seg ac-px" aria-label="Período">${tipos.map(([t, n]) => `<a href="${base}?per=${t}&f=${ref}${extra}"${(per?.tipo ?? 'dia') === t ? ' aria-current="true"' : ''}>${n}</a>`).join('')}</nav>`;
  if (!per) return seg;
  const nombres = { semana: ['Semana anterior', 'Semana siguiente'], mes: ['Mes anterior', 'Mes siguiente'], anio: ['Año anterior', 'Año siguiente'] }[per.tipo];
  const futuro = per.siguiente > hoy;
  return `${seg}<div class="ac-row">
    <a class="ac-iconbtn ac-px" href="${base}?per=${per.tipo}&f=${per.anterior}${extra}" aria-label="${nombres[0]}">${ico('anterior')}</a>
    <div class="ac-datenav__label"><span class="ac-datenav__date">${per.titulo}</span><span class="ac-kicker" data-kicker></span></div>
    ${futuro ? `<a class="ac-iconbtn ac-px" role="link" aria-disabled="true" aria-label="${nombres[1]}">${ico('siguiente')}</a>` : `<a class="ac-iconbtn ac-px" href="${base}?per=${per.tipo}&f=${per.siguiente}${extra}" aria-label="${nombres[1]}">${ico('siguiente')}</a>`}
  </div>`;
}

export function tendencia(actual, previo) {
  if (actual == null || previo == null) return '';
  const d = Math.round((actual - previo) * 10) / 10;
  const [i, t] = d > 0 ? ['sube', 'Sube'] : d < 0 ? ['baja', 'Baja'] : ['igual', 'Igual'];
  return `<span class="ac-trend"><img src="img/ui/${i}.svg" alt="${t}">${d > 0 ? '+' : d < 0 ? '−' : ''}${num(Math.abs(d))}</span>`;
}

// Gráfica de línea pixel para una serie [{corta, larga, valor}] de 0 a max. enCurso: índice de la parte actual (punteada).
export function linea(serie, { max = 10, enCurso = -1, aria }) {
  const W = 326, x0 = 44, x1 = 296, y0 = 170, y1 = 20;
  const n = serie.length, paso = n > 1 ? (x1 - x0) / (n - 1) : 0;
  const X = (i) => (n > 1 ? x0 + paso * i : (x0 + x1) / 2), Y = (v) => y0 - ((y0 - y1) * v) / max;
  let tramos = '', puntos = '', vals = '', etiq = '';
  let prev = null;
  serie.forEach((p, i) => {
    if (p.valor != null) {
      const x = X(i), y = Y(p.valor);
      if (prev) tramos += `<line x1="${prev[0].toFixed(1)}" y1="${prev[1].toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#6A44B0" stroke-width="4"${i === enCurso ? ' stroke-dasharray="7 5"' : ''}></line>`;
      puntos += `<rect x="${(x - 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="12" height="12" fill="${i === enCurso ? '#FFFFFF' : '#6A44B0'}" stroke="#3B2650" stroke-width="2"></rect>`;
      if (n <= 12) vals += `<text x="${x.toFixed(1)}" y="${(y - 12).toFixed(1)}">${num(p.valor)}</text>`;
      prev = [x, y];
    } else prev = null;
    if (n <= 7 || i % 2 === 0 || n <= 12) etiq += `<text x="${X(i).toFixed(1)}" y="192">${p.corta}</text>`;
  });
  if (enCurso >= 0 && serie[enCurso]?.valor != null) etiq += `<text x="${X(enCurso).toFixed(1)}" y="208">en curso</text>`;
  return `<svg width="${W}" height="214" viewBox="0 0 ${W} 214" role="img" aria-label="${esc(aria)}" style="max-width: 100%; height: auto;">
    <g stroke="#C9B3E8" stroke-width="2"><line x1="30" y1="20" x2="320" y2="20"></line><line x1="30" y1="95" x2="320" y2="95"></line><line x1="30" y1="170" x2="320" y2="170"></line></g>
    <g font-family="Nunito, sans-serif" font-size="12" font-weight="700" fill="#6B5480" aria-hidden="true"><text x="22" y="24" text-anchor="end">${max}</text><text x="22" y="99" text-anchor="end">${num(max / 2)}</text><text x="22" y="174" text-anchor="end">0</text></g>
    ${tramos}<g>${puntos}</g>
    <g font-family="Pixelify Sans, monospace" font-size="15" font-weight="700" fill="#3B2650" text-anchor="middle" aria-hidden="true">${vals}</g>
    <g font-family="Nunito, sans-serif" font-size="${n > 7 ? 11 : 12}" font-weight="700" fill="#6B5480" text-anchor="middle" aria-hidden="true">${etiq}</g></svg>`;
}

// Barras por parte. Para escalas de caritas, opciones = lista con {valor, carita}.
export function barras(serie, { max = 10, opciones, aria }) {
  const vs = serie.filter((p) => p.valor != null).map((p) => p.valor);
  const top = vs.length ? Math.max(...vs) : null;
  const alto = 80;
  const cols = serie.map((p) => {
    if (p.valor == null) return `<div class="ac-bar" aria-hidden="true"><span class="ac-bar__v">—</span><span class="ac-bar__b none"></span><span class="ac-bar__d">${p.corta}</span></div>`;
    const h = Math.max(4, Math.round((alto * p.valor) / max));
    const cerca = opciones ? opciones.reduce((a, o) => (Math.abs(o.valor - p.valor) < Math.abs(a.valor - p.valor) ? o : a)) : null;
    const tope = opciones ? `<img class="px" src="img/caritas/${cerca.carita}.svg" alt="" style="width: 28px; height: 28px;">` : `<span class="ac-bar__v">${num(p.valor)}</span>`;
    return `<div class="ac-bar" aria-hidden="true">${tope}<span class="ac-bar__b${p.valor === top ? ' best' : ''}" style="height: ${h}px;"></span><span class="ac-bar__d">${p.corta}</span></div>`;
  }).join('');
  return `<figure class="ac-bars" role="img" aria-label="${esc(aria)}" style="grid-template-columns: repeat(${serie.length}, minmax(0, 1fr)); gap: ${serie.length > 7 ? 4 : 8}px; min-height: ${alto + 50}px;">${cols}</figure>`;
}
