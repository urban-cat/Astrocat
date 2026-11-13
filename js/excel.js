// Astrocat — exportar e importar respaldos en Excel (.xlsx), sin librerías pesadas.
// El archivo trae hojas legibles (Diario, Semanal, Mensual, Anual, Detalle) y una hoja "Respaldo"
// con las respuestas crudas de cada día, que es la que se usa para restaurar.
import { zipSync, unzipSync, strToU8, strFromU8 } from './vendor/fflate.js';
import { ASTROS, VERSION_DATOS, puntaje, puntajesDia, promedioGeneral, promedios, periodo, diasDe, redondear, faltantes, respuestaTexto } from './modelo.js';

const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const col = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

function hoja(filas) {
  const rows = filas.map((f, r) => `<row r="${r + 1}">${f.map((v, c) => {
    const ref = `${col(c)}${r + 1}`, st = r === 0 ? ' s="1"' : '';
    if (v == null || v === '') return '';
    return typeof v === 'number' ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rows}</sheetData></worksheet>`;
}

function libro(hojas) {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((h, i) => `<sheet name="${xml(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
  };
  hojas.forEach((h, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = hoja(h.filas); });
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

const ESPECIALES = ASTROS.flatMap((a) => a.especiales.map((e) => ({ a, e })));
const nombreEsp = ({ a, e }) => (e.id === 'sensaciones' ? `Sensaciones ${a.nombre}` : e.nombre);

function resumen(dias, tipo) {
  if (!dias.length) return [];
  const claves = [...new Set(dias.map((d) => periodo(tipo, d.fecha).desde))].sort();
  return claves.map((k) => {
    const per = periodo(tipo, k), ds = diasDe(dias, per.desde, per.hasta), p = promedios(ds);
    const gen = redondear(ds.reduce((s, x) => s + promedioGeneral(x), 0) / ds.length);
    return [tipo === 'semana' ? per.desde : per.titulo, ds.length, ...ASTROS.map((a) => p[a.id]), gen];
  });
}

// Devuelve un Uint8Array con el .xlsx completo (siempre todo el historial).
export function crearRespaldo(dias) {
  dias = [...dias].sort((x, y) => x.fecha.localeCompare(y.fecha));
  const encab = ASTROS.map((a) => a.nombre);
  const diario = [['Fecha', ...encab, 'Promedio', ...ESPECIALES.map(nombreEsp)],
    ...dias.map((d) => { const p = puntajesDia(d); return [d.fecha, ...ASTROS.map((a) => p[a.id]), promedioGeneral(d), ...ESPECIALES.map(({ a, e }) => d.respuestas[a.id]?.[e.id] ?? null)]; })];
  const tabla = (titulo, tipo) => [[titulo, 'Días', ...encab, 'Promedio'], ...resumen(dias, tipo)];
  const detalle = [['Fecha', 'Astro', 'Variable', 'Respuesta', 'Cumple'], ...dias.flatMap((d) => ASTROS.flatMap((a) => {
    const r = d.respuestas[a.id], p = puntaje(a.id, r);
    return [...a.variables.map((v) => { const det = p.detalle.find((x) => x.id === v.id); return [d.fecha, a.nombre, v.nombre, respuestaTexto(v, r[v.id]), det.participa ? (det.cumple ? 'Sí' : 'No') : 'No participa']; }),
      ...a.especiales.map((e) => [d.fecha, a.nombre, e.nombre, e.tipo === 'caritas' ? `${r[e.id]} · ${e.opciones.find((o) => o.valor === r[e.id])?.texto}` : r[e.id], 'Gráfica especial']) ];
  }))];
  const respaldo = [['Fecha', 'Datos', 'Versión'], ...dias.map((d) => [d.fecha, JSON.stringify(d.respuestas), d.version ?? VERSION_DATOS])];
  return libro([
    { nombre: 'Diario', filas: diario }, { nombre: 'Semanal', filas: tabla('Semana (lunes)', 'semana') }, { nombre: 'Mensual', filas: tabla('Mes', 'mes') },
    { nombre: 'Anual', filas: tabla('Año', 'anio') }, { nombre: 'Detalle', filas: detalle }, { nombre: 'Respaldo', filas: respaldo },
  ]);
}

export const nombreArchivo = (fecha) => `astrocat-respaldo-${fecha}.xlsx`;

// ---------- Lectura ----------
const desXml = (s) => s.replace(/&(lt|gt|quot|apos|amp|#(\d+)|#x([0-9a-f]+));/gi, (_, n, d, h) => (d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[n]));
const textos = (frag) => [...frag.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => desXml(m[1])).join('');

export class ErrorRespaldo extends Error {}

// Lee un .xlsx y devuelve { dias:[{fecha, version, respuestas}], descartados }. Lanza ErrorRespaldo si no es de Astrocat.
export function leerRespaldo(bytes) {
  let z;
  try { z = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)); } catch { throw new ErrorRespaldo('no-es-excel'); }
  const txt = (p) => (z[p] ? strFromU8(z[p]) : null);
  const wb = txt('xl/workbook.xml'), rels = txt('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new ErrorRespaldo('no-es-excel');
  const hoja = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => m[0]).find((t) => /name="Respaldo"/.test(t));
  if (!hoja) throw new ErrorRespaldo('sin-hoja');
  const rid = hoja.match(/r:id="([^"]+)"/)?.[1];
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((t) => t.includes(`Id="${rid}"`));
  let destino = rel?.match(/Target="([^"]+)"/)?.[1] ?? '';
  destino = destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`;
  const sheet = txt(destino);
  if (!sheet) throw new ErrorRespaldo('sin-hoja');
  const ss = txt('xl/sharedStrings.xml');
  const compartidos = ss ? [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1])) : [];
  const filas = {};
  for (const m of sheet.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1], cuerpo = m[2] ?? '';
    const ref = attrs.match(/r="([A-Z]+)(\d+)"/); if (!ref) continue;
    const t = attrs.match(/t="([^"]+)"/)?.[1];
    const v = cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
    const valor = t === 's' ? compartidos[Number(v)] : t === 'inlineStr' ? textos(cuerpo) : t === 'str' ? desXml(v ?? '') : v != null ? Number(v) : null;
    (filas[ref[2]] ??= {})[ref[1]] = valor;
  }
  const dias = []; let descartados = 0;
  for (const [n, f] of Object.entries(filas)) {
    if (n === '1') continue;
    let fecha = f.A;
    if (typeof fecha === 'number') { const d = new Date(Date.UTC(1899, 11, 30) + fecha * 864e5); fecha = d.toISOString().slice(0, 10); } // fecha convertida por Excel
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw 0;
      const respuestas = JSON.parse(f.B);
      if (ASTROS.some((a) => !respuestas[a.id] || faltantes(a.id, respuestas[a.id]).length)) throw 0;
      dias.push({ fecha, version: Number(f.C) || VERSION_DATOS, respuestas: Object.fromEntries(ASTROS.map((a) => [a.id, respuestas[a.id]])) });
    } catch { descartados++; }
  }
  if (!dias.length) throw new ErrorRespaldo(descartados ? 'filas-invalidas' : 'vacio');
  dias.sort((x, y) => x.fecha.localeCompare(y.fecha));
  return { dias, descartados };
}
