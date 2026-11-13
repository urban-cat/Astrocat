import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRespaldo, leerRespaldo, ErrorRespaldo } from '../js/excel.js';
import { unzipSync, zipSync, strToU8, strFromU8 } from '../js/vendor/fflate.js';

const r = {
  quiron: { movimiento: true, agua: 5, reposo: 6, sensaciones: 4 }, jupiter: { altoImpacto: true, proposito: false, acercamiento: 7 },
  sol: { impulsividad: true, meta: true, pasividad: 7, sensaciones: 5 }, venus: { trato: true, sensaciones: 6 },
  luna: { comunicacion: false, pertenencia: 4, sensaciones: 3 }, pluton: { lectura: 12, escucha: true, registro: true, aprehension: false, bloqueo: true },
  urano: { desconexion: true, imagen: { si: false }, hechos: false, orden: true, exaltacion: true, visualizacion: 4 }, neptuno: { silencio: 10, sensaciones: 5 },
};
const dias = [{ fecha: '2026-10-25', version: 1, respuestas: r }, { fecha: '2026-10-24', version: 1, respuestas: { ...r, venus: { trato: false, sensaciones: 2 } } }];

test('el respaldo se puede volver a leer igual', () => {
  const x = crearRespaldo(dias);
  const z = unzipSync(x);
  assert.ok(z['xl/worksheets/sheet6.xml']);
  assert.match(strFromU8(z['xl/workbook.xml']), /name="Diario".*name="Respaldo"/);
  const { dias: leidos, descartados } = leerRespaldo(x);
  assert.equal(descartados, 0);
  assert.deepEqual(leidos.map((d) => d.fecha), ['2026-10-24', '2026-10-25']);
  assert.deepEqual(leidos[1].respuestas, r);
});

test('también lee el archivo si Excel lo guardó con textos compartidos', () => {
  const z = unzipSync(crearRespaldo(dias));
  const s = strFromU8(z['xl/worksheets/sheet6.xml']);
  const textos = [];
  const s2 = s.replace(/<c r="([A-Z]+\d+)" t="inlineStr"( s="1")?><is><t xml:space="preserve">([\s\S]*?)<\/t><\/is><\/c>/g, (_, ref, st, t) => { textos.push(t); return `<c r="${ref}" t="s"${st || ''}><v>${textos.length - 1}</v></c>`; });
  z['xl/worksheets/sheet6.xml'] = strToU8(s2);
  z['xl/sharedStrings.xml'] = strToU8(`<sst>${textos.map((t) => `<si><t>${t}</t></si>`).join('')}</sst>`);
  assert.equal(leerRespaldo(zipSync(z)).dias.length, 2);
});

test('rechaza archivos que no son de Astrocat', () => {
  assert.throws(() => leerRespaldo(new Uint8Array([1, 2, 3])), ErrorRespaldo);
  const z = unzipSync(crearRespaldo(dias));
  z['xl/workbook.xml'] = strToU8(strFromU8(z['xl/workbook.xml']).replace('name="Respaldo"', 'name="Otra"'));
  assert.throws(() => leerRespaldo(zipSync(z)), /sin-hoja/);
});
