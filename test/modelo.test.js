import test from 'node:test';
import assert from 'node:assert/strict';
import { puntaje, faltantes, promedios, cumplimientoVariables, lunesDe, sumarDias, fechaLarga, num, puntajesDia } from '../js/modelo.js';

// Día de ejemplo del diseño (domingo 25 de octubre de 2026)
const dia25 = {
  fecha: '2026-10-25',
  respuestas: {
    quiron: { movimiento: true, agua: 5, reposo: 6, sensaciones: 4 },
    jupiter: { altoImpacto: true, proposito: false, acercamiento: 7 },
    sol: { impulsividad: true, meta: true, pasividad: 7, sensaciones: 5 },
    venus: { trato: true, sensaciones: 6 },
    luna: { comunicacion: false, pertenencia: 4, sensaciones: 3 },
    pluton: { lectura: 12, escucha: true, registro: true, aprehension: false, bloqueo: true },
    urano: { desconexion: true, imagen: { si: true, horas: 2 }, hechos: false, orden: true, exaltacion: true, visualizacion: 4 },
    neptuno: { silencio: 10, sensaciones: 5 },
  },
};

test('puntajes del día de ejemplo coinciden con el diseño', () => {
  assert.deepEqual(puntajesDia(dia25), { quiron: 6.7, jupiter: 5, sol: 10, venus: 10, luna: 0, pluton: 8, urano: 8, neptuno: 10 });
});

test('umbrales: Agua desde 4, Reposo desde 7, Lectura desde 10, Silencio desde 5', () => {
  assert.equal(puntaje('quiron', { movimiento: false, agua: 4, reposo: 7 }).valor, 6.7);
  assert.equal(puntaje('quiron', { movimiento: false, agua: 3, reposo: 6 }).valor, 0);
  assert.equal(puntaje('pluton', { lectura: 9, escucha: false, registro: false, aprehension: false, bloqueo: false }).valor, 0);
  assert.equal(puntaje('neptuno', { silencio: 5 }).valor, 10);
  assert.equal(puntaje('neptuno', { silencio: 4 }).valor, 0);
});

test('Imagen: Sí con 3 h o menos cumple; más de 3 h no cumple; No no participa', () => {
  const base = { desconexion: true, hechos: true, orden: true, exaltacion: true };
  assert.equal(puntaje('urano', { ...base, imagen: { si: true, horas: 3 } }).valor, 10);
  assert.equal(puntaje('urano', { ...base, imagen: { si: true, horas: 4 } }).valor, 8);
  const sinImagen = puntaje('urano', { ...base, imagen: { si: false } });
  assert.equal(sinImagen.total, 4);
  assert.equal(sinImagen.valor, 10);
});

test('todos los campos son obligatorios, incluidas las gráficas especiales', () => {
  assert.deepEqual(faltantes('quiron', { movimiento: true, agua: 5 }), ['reposo', 'sensaciones']);
  assert.deepEqual(faltantes('urano', { ...dia25.respuestas.urano, imagen: { si: true } }), ['imagen']);
  assert.deepEqual(faltantes('urano', { ...dia25.respuestas.urano, imagen: { si: false } }), []);
  for (const [id, r] of Object.entries(dia25.respuestas)) assert.deepEqual(faltantes(id, r), [], id);
});

test('promedios ignoran los días sin registro', () => {
  const otro = structuredClone(dia25); otro.fecha = '2026-10-24'; otro.respuestas.luna.comunicacion = true;
  assert.equal(promedios([dia25, otro]).luna, 5);
  assert.equal(promedios([]).luna, null);
});

test('cumplimiento de Imagen cuenta solo los días que participó', () => {
  const no = structuredClone(dia25); no.respuestas.urano.imagen = { si: false };
  const img = cumplimientoVariables([dia25, no], 'urano').find((v) => v.id === 'imagen');
  assert.deepEqual([img.dias, img.cumplidos, img.pct], [1, 1, 100]);
});

test('fechas: semana empieza el lunes y formato en español', () => {
  assert.equal(lunesDe('2026-10-25'), '2026-10-19');
  assert.equal(lunesDe('2026-10-19'), '2026-10-19');
  assert.equal(sumarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(fechaLarga('2026-10-25'), 'Domingo 25 de octubre');
  assert.equal(num(6.666), '6,7');
  assert.equal(num(10), '10');
});
