# Astrocat

Registro diario de 8 astros con radar, historial y respaldo en Excel. PWA ligera, accesible y sin nube: los datos viven solo en el teléfono (IndexedDB).

- App: https://urban-cat.github.io/Astrocat/
- Sin paso de build: HTML, CSS y módulos ES. Se publica tal cual con GitHub Pages (rama `main`, carpeta raíz).
- Pruebas: `npm test`
- Probar en local: `python3 -m http.server 5173` y abrir http://localhost:5173

Al publicar cambios, sube `VERSION` en `sw.js` para que el teléfono descargue la versión nueva.

Librerías incluidas: [fflate](https://github.com/101arrowz/fflate) (MIT) para el Excel; fuentes Nunito y Pixelify Sans (SIL OFL).
