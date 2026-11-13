// Bienvenida (primer uso).
import { guardarMeta } from '../db.js';
import { ico } from '../ui.js';
import { ir } from '../app.js';
import { restaurar } from './ajustes.js';

export async function bienvenida() {
  return { titulo: 'Te damos la bienvenida', html: `<div class="ac-screen"><main class="ac-main" style="justify-content: center; gap: 20px; padding-top: 40px;">
    <img class="px" src="img/logo.svg" alt="" style="width: 128px; height: 128px; border-radius: 50%; align-self: center;">
    <h1 class="ac-h1" style="text-align: center;">Hola, soy Astrocat</h1>
    <p class="ac-text" style="text-align: center;">Cada día registras tus 8 astros y yo te muestro cómo vas: por día, semana, mes y año.</p>
    <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px;">
      <li class="ac-px" style="display: flex; gap: 12px; align-items: center; padding: 12px 14px;"><img class="px" src="img/ui/info.svg" alt="" style="width: 32px; height: 32px; flex: none;"><span><strong>Tus datos se quedan en este teléfono.</strong> No hay cuenta ni nube.</span></li>
      <li class="ac-px" style="display: flex; gap: 12px; align-items: center; padding: 12px 14px;"><img class="px" src="img/ui/exportar.svg" alt="" style="width: 32px; height: 32px; flex: none;"><span><strong>Respáldalos en Excel.</strong> Te recuerdo cada 7 días.</span></li>
      <li class="ac-px" style="display: flex; gap: 12px; align-items: center; padding: 12px 14px;"><img class="px" src="img/ui/editar.svg" alt="" style="width: 32px; height: 32px; flex: none;"><span><strong>Puedes editar</strong> cualquier día, también los pasados.</span></li>
    </ul>
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
      <button type="button" class="ac-btn ac-btn--primary ac-px" data-empezar>Empezar</button>
      <button type="button" class="ac-btn ac-btn--secondary ac-px" data-restaurar>${ico('restaurar')}Ya tengo un respaldo</button>
    </div></main></div>`,
  montar: (el) => {
    el.querySelector('[data-empezar]').addEventListener('click', async () => { await guardarMeta('bienvenidaVista', true); ir('#/hoy'); });
    el.querySelector('[data-restaurar]').addEventListener('click', restaurar);
  } };
}
