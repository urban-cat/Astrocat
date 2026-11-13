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
