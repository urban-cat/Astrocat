# Astrocat

PWA personal (Android 2018, Chrome) para registrar a diario 8 astros. Sin nube: todo vive en IndexedDB del teléfono. Se publica con GitHub Pages.

- Sin paso de build: HTML + CSS + módulos ES nativos. Nada de frameworks; el teléfono es lento.
- `js/modelo.js` es la única fuente de verdad de astros, variables, reglas y cálculos. Se guardan respuestas crudas, nunca puntajes.
- `js/db.js` maneja IndexedDB con migraciones versionadas (`VERSION_DB`).
- Estilos con prefijo `ac-` en `css/app.css`, tomados del diseño final ("Astrocat — Pantallas").
- Accesibilidad WCAG 2.2 AA: objetivos táctiles ≥ 48 px, íconos con `alt=""` junto a texto, `aria-label` en botones de solo ícono, nunca solo color, orden del DOM = orden visual.
- Todo el texto de la interfaz va en español (Colombia).
- Pruebas: `npm test` (node:test). Probar el cálculo antes de cambiar reglas.
