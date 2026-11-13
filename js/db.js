// Astrocat — almacenamiento local en IndexedDB. Nada sale del teléfono.
// Almacenes:
//   dias      → un registro por día { fecha:'AAAA-MM-DD', version, respuestas, creado, actualizado }
//   borrador  → registro a medias { id:'actual', fecha, paso, respuestas, modo:'nuevo'|'editar' }
//   meta      → pares clave/valor, p. ej. { clave:'ultimoRespaldo', valor:'2026-10-17T…' }
import { VERSION_DATOS } from './modelo.js';

const NOMBRE = 'astrocat';
const VERSION_DB = 1;
let conexion;

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((ok, mal) => {
    const req = indexedDB.open(NOMBRE, VERSION_DB);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      // Migraciones por versión: cada bloque solo se ejecuta al subir desde una versión menor.
      if (e.oldVersion < 1) {
        db.createObjectStore('dias', { keyPath: 'fecha' });
        db.createObjectStore('borrador', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'clave' });
      }
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
  return conexion;
}

async function tx(almacen, modo, fn) {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const t = db.transaction(almacen, modo);
    const s = t.objectStore(almacen);
    let resultado;
    Promise.resolve(fn(s)).then((r) => { resultado = r; });
    t.oncomplete = () => ok(resultado);
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error || new Error('Transacción cancelada'));
  });
}
const pedir = (req) => new Promise((ok, mal) => { req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error); });

// ---------- Días ----------
export const leerDia = (fecha) => tx('dias', 'readonly', (s) => pedir(s.get(fecha)));
export const todosLosDias = () => tx('dias', 'readonly', (s) => pedir(s.getAll()));
export const diasEntre = (desde, hasta) => tx('dias', 'readonly', (s) => pedir(s.getAll(IDBKeyRange.bound(desde, hasta))));
export async function guardarDia(fecha, respuestas) {
  const previo = await leerDia(fecha);
  const ahora = new Date().toISOString();
  const dia = { fecha, version: VERSION_DATOS, respuestas, creado: previo?.creado ?? ahora, actualizado: ahora };
  await tx('dias', 'readwrite', (s) => pedir(s.put(dia)));
  return dia;
}
export const contarDias = () => tx('dias', 'readonly', (s) => pedir(s.count()));

// ---------- Borrador ----------
export const leerBorrador = () => tx('borrador', 'readonly', (s) => pedir(s.get('actual')));
export const guardarBorrador = (b) => tx('borrador', 'readwrite', (s) => pedir(s.put({ ...b, id: 'actual' })));
export const borrarBorrador = () => tx('borrador', 'readwrite', (s) => pedir(s.delete('actual')));

// ---------- Meta ----------
export const leerMeta = async (clave) => (await tx('meta', 'readonly', (s) => pedir(s.get(clave))))?.valor;
export const guardarMeta = (clave, valor) => tx('meta', 'readwrite', (s) => pedir(s.put({ clave, valor })));

// ---------- Restaurar y borrar ----------
// modo 'combinar': agrega los días que faltan; si un día está en los dos, se queda el del teléfono.
// modo 'reemplazar': borra todo y deja solo el archivo.
export async function importarDias(dias, modo) {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const t = db.transaction('dias', 'readwrite');
    const s = t.objectStore('dias');
    let agregados = 0, iguales = 0;
    const seguir = () => {
      for (const d of dias) {
        const r = s.get(d.fecha);
        r.onsuccess = () => {
          if (r.result && modo === 'combinar') { iguales++; return; }
          s.put({ ...d, version: VERSION_DATOS }); agregados++;
        };
      }
    };
    if (modo === 'reemplazar') { const c = s.clear(); c.onsuccess = seguir; } else seguir();
    t.oncomplete = () => ok({ agregados, iguales });
    t.onerror = () => mal(t.error);
  });
}

export async function borrarTodo() {
  const db = await abrir();
  await new Promise((ok, mal) => {
    const t = db.transaction(['dias', 'borrador', 'meta'], 'readwrite');
    for (const n of ['dias', 'borrador', 'meta']) t.objectStore(n).clear();
    t.oncomplete = ok; t.onerror = () => mal(t.error);
  });
}

// Pide al navegador que no borre los datos por falta de espacio (Android lo concede a las apps instaladas).
export async function pedirPersistencia() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}
