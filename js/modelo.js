// Astrocat — definición de astros, variables, reglas y cálculo de puntajes.
// Todo el resto de la app lee de aquí: si cambia una regla, se cambia solo en este archivo.
// Se guardan siempre las respuestas crudas; los puntajes se calculan al mostrarlos.

export const VERSION_DATOS = 1;

// Escala de sensaciones (gráfica especial, no cuenta para el radar). Más alto es mejor.
export const SENSACIONES = [
  { valor: 6, texto: 'Muy bien', carita: 'muy-bien' },
  { valor: 5, texto: 'Bien', carita: 'bien' },
  { valor: 4, texto: 'Ni bien ni mal', carita: 'regular' },
  { valor: 3, texto: 'Mal', carita: 'mal' },
  { valor: 2, texto: 'Con estrés', carita: 'estres' },
  { valor: 1, texto: 'Muy mal', carita: 'muy-mal' },
];

// Visualización de Urano (gráfica especial). De 1 a 5, más alto es mejor.
export const VISUALIZACION = [
  { valor: 1, texto: 'No se pudo ver', carita: 'muy-mal' },
  { valor: 2, texto: 'Se vio muy poco', carita: 'mal' },
  { valor: 3, texto: 'Se vio a medias', carita: 'regular' },
  { valor: 4, texto: 'Se vio bien', carita: 'bien' },
  { valor: 5, texto: 'Se vio con claridad', carita: 'muy-bien' },
];

const sino = (id, nombre) => ({ id, nombre, tipo: 'sino', regla: 'Cumple si respondes Sí', cumple: (v) => v === true });
const numero = (id, nombre, { min, max, unidad = '', desde, hasta }) => ({
  id, nombre, tipo: 'numero', min, max, unidad,
  regla: desde != null ? `Cumple desde ${desde}${unidad ? ' ' + unidad : ''}` : `Cumple con ${hasta}${unidad ? ' ' + unidad : ''} o menos`,
  cumple: (v) => (desde != null ? v >= desde : v <= hasta),
});
const termometro = (id, nombre) => ({ id, nombre, tipo: 'termometro', min: 0, max: 10 });
const sensaciones = { id: 'sensaciones', nombre: 'Escala de sensaciones', tipo: 'caritas', opciones: SENSACIONES, max: 6 };

export const ASTROS = [
  {
    id: 'quiron', nombre: 'Quirón', color: '#EAF8EE',
    variables: [
      sino('movimiento', 'Movimiento'),
      numero('agua', 'Agua', { min: 0, max: 10, desde: 4 }),
      numero('reposo', 'Reposo', { min: 0, max: 24, unidad: 'horas', desde: 7 }),
    ],
    especiales: [sensaciones],
  },
  {
    id: 'jupiter', nombre: 'Júpiter', color: '#FFF3EA',
    variables: [sino('altoImpacto', 'Alto impacto'), sino('proposito', 'Propósito')],
    especiales: [termometro('acercamiento', 'Acercamiento')],
  },
  {
    id: 'sol', nombre: 'Sol', color: '#FFF6D6',
    variables: [sino('impulsividad', 'Impulsividad'), sino('meta', 'Meta')],
    especiales: [termometro('pasividad', 'Nivel de pasividad'), sensaciones],
  },
  {
    id: 'venus', nombre: 'Venus', color: '#FFEAF2',
    variables: [sino('trato', 'Trato')],
    especiales: [sensaciones],
  },
  {
    id: 'luna', nombre: 'Luna', color: '#FBF7E8',
    variables: [sino('comunicacion', 'Comunicación')],
    especiales: [termometro('pertenencia', 'Pertenencia'), sensaciones],
  },
  {
    id: 'pluton', nombre: 'Plutón', color: '#F3EDFD',
    variables: [
      numero('lectura', 'Lectura', { min: 0, max: 20, desde: 10 }),
      sino('escucha', 'Escucha'), sino('registro', 'Registro'), sino('aprehension', 'Aprehensión'), sino('bloqueo', 'Bloqueo'),
    ],
    especiales: [],
  },
  {
    id: 'urano', nombre: 'Urano', color: '#E6F8F8',
    variables: [
      sino('desconexion', 'Desconexión'),
      // Imagen: Sí + horas. Cumple con Sí y 3 horas o menos. Si es No, ese día no participa.
      { id: 'imagen', nombre: 'Imagen', tipo: 'imagen', min: 0, max: 24, unidad: 'horas', hasta: 3,
        regla: 'Cumple con Sí y 3 horas o menos', participa: (v) => v?.si === true, cumple: (v) => v?.si === true && v.horas <= 3 },
      sino('hechos', 'Hechos'), sino('orden', 'Orden'), sino('exaltacion', 'Exaltación'),
    ],
    especiales: [{ id: 'visualizacion', nombre: 'Visualización', tipo: 'caritas', opciones: VISUALIZACION, max: 5 }],
  },
  {
    id: 'neptuno', nombre: 'Neptuno', color: '#EAF1FE',
    variables: [numero('silencio', 'Silencio', { min: 0, max: 60, unidad: 'minutos', desde: 5 })],
    especiales: [sensaciones],
  },
];

export const astro = (id) => ASTROS.find((a) => a.id === id);

// ¿Falta alguna respuesta de este astro? Devuelve los ids que faltan (todos los campos son obligatorios).
export function faltantes(astroId, r = {}) {
  const a = astro(astroId);
  const falta = [];
  for (const v of a.variables) {
    const x = r[v.id];
    if (v.tipo === 'sino' && typeof x !== 'boolean') falta.push(v.id);
    else if (v.tipo === 'numero' && !Number.isFinite(x)) falta.push(v.id);
    else if (v.tipo === 'imagen' && (typeof x?.si !== 'boolean' || (x.si && !Number.isFinite(x.horas)))) falta.push(v.id);
  }
  for (const e of a.especiales) if (!Number.isFinite(r[e.id])) falta.push(e.id);
  return falta;
}

// Puntaje de un astro en un día: % de variables cumplidas × 10. Todas pesan igual.
export function puntaje(astroId, r = {}) {
  const a = astro(astroId);
  const detalle = a.variables.map((v) => {
    const participa = v.participa ? v.participa(r[v.id]) : true;
    return { id: v.id, nombre: v.nombre, participa, cumple: participa ? v.cumple(r[v.id]) : null };
  });
  const cuentan = detalle.filter((d) => d.participa);
  const cumplidas = cuentan.filter((d) => d.cumple).length;
  const valor = cuentan.length ? redondear((cumplidas / cuentan.length) * 10) : 0;
  return { valor, cumplidas, total: cuentan.length, detalle };
}

export const redondear = (n) => Math.round(n * 10) / 10;

// Puntajes de los 8 astros para un registro de día.
export function puntajesDia(dia) {
  const out = {};
  for (const a of ASTROS) out[a.id] = puntaje(a.id, dia.respuestas[a.id]).valor;
  return out;
}

// ---------- Fechas (siempre en hora local, formato AAAA-MM-DD) ----------
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const sumarDias = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); };
// Semana de lunes a domingo
export const lunesDe = (s) => { const d = deIso(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return iso(d); };

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const fechaLarga = (s) => { const d = deIso(s); const t = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; return t[0].toUpperCase() + t.slice(1); };

// Número con coma decimal y sin ",0": 6,7 · 10 · 0
export const num = (n) => (n == null ? '—' : String(redondear(n)).replace('.', ','));

// ---------- Promedios ----------
// dias: arreglo de registros { fecha, respuestas }. Los días sin registro no cuentan.
export function promedios(dias) {
  const res = {};
  for (const a of ASTROS) {
    const vals = dias.map((d) => puntaje(a.id, d.respuestas[a.id]).valor);
    res[a.id] = vals.length ? redondear(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }
  return res;
}

export function promedioEspecial(dias, astroId, espId) {
  const vals = dias.map((d) => d.respuestas[astroId]?.[espId]).filter(Number.isFinite);
  return vals.length ? redondear(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
}

// % de días en que se cumplió cada variable de un astro (Imagen cuenta solo los días que participó)
export function cumplimientoVariables(dias, astroId) {
  return astro(astroId).variables.map((v) => {
    let dDias = 0, ok = 0;
    for (const d of dias) {
      const det = puntaje(astroId, d.respuestas[astroId]).detalle.find((x) => x.id === v.id);
      if (!det.participa) continue;
      dDias++; if (det.cumple) ok++;
    }
    return { id: v.id, nombre: v.nombre, dias: dDias, cumplidos: ok, pct: dDias ? Math.round((ok / dDias) * 100) : null };
  });
}
