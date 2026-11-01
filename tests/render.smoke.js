// Rendert alle Szenen mit einem Canvas-Stub, um Laufzeitfehler im Zeichencode zu finden.
'use strict';
const noop = () => {};
const grad = { addColorStop: noop };
function ctx2d() {
  return new Proxy({}, { get(t, k) {
    if (k in t) return t[k];
    if (k === 'measureText') return () => ({ width: 20 });
    if (/^create.*Gradient$/.test(k)) return () => grad;
    if (k === 'canvas') return {};
    return noop;
  }, set(t, k, v) { t[k] = v; return true; } });
}
const mkCanvas = () => ({ width: 0, height: 0, getContext: () => ctx2d() });
globalThis.window = { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2 };
globalThis.document = { createElement: mkCanvas };
require('../js/levels.js'); require('../js/engine.js'); require('../js/render.js');
const AC = globalThis.AC, E = AC.Engine;
const R = new AC.Renderer(mkCanvas());
let frames = 0;
for (let i = 0; i < AC.LEVELS.length; i++) {
  const s = E.loadScene(i);
  R.snapCamera();
  const dirs = [0, 1, 2, 3];
  for (let f = 0; f < 400; f++) {
    if (f % 10 === 0) { E.switchTo(s, (f / 10) % 3); E.move(s, dirs[f % 4]); }
    if (f % 37 === 0) { E.interact(s); E.whip(s); E.jump(s); }
    E.update(s, 1 / 60);
    for (const e of s.events) { if (e.type === 'fx') R.addFx(e); if (e.type === 'shake') R.addShake(e.amount); }
    s.events.length = 0;
    // alle Zustände einmal erzwingen
    if (f === 200) { s.objects.forEach((o) => { if ('open' in o) { o.open = true; o.t = 0.3; } if (o.type === 'lever') o.on = true; }); s.timer = 10; s.spikesUp = true; s.chars[2].sprint = true; }
    R.render(s, 1 / 60, { hover: { x: 3, y: 3 } });
    frames++;
  }
  ['dust', 'rocks', 'sparkle', 'hurt', 'arrows', 'whip', 'fallblock', 'label'].forEach((k) => R.addFx({ kind: k, x: 3, y: 3, tx: 5, ty: 3, text: 'x' }));
  R.render(s, 0.016, {});
}
['mia', 'ben', 'lea', 'tip'].forEach((id) => AC.drawPortrait(mkCanvas(), id));
['gem', 'key', 'sandbag', 'idol'].forEach((t) => AC.drawIcon(mkCanvas(), t));
console.log(`✔ Renderer: ${frames} Frames über ${AC.LEVELS.length} Szenen ohne Fehler`);
