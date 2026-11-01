// Startet main.js mit einem minimalen DOM-Stub: Titel, Kapitelstart, Tastatur, Spielschleife.
'use strict';
const noop = () => {};
const grad = { addColorStop: noop };
const ctx2d = () => new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 20 }); if (/Gradient$/.test(k)) return () => grad; return noop; }, set(t, k, v) { t[k] = v; return true; } });
const listeners = {};
function el(id) {
  const e = { id, width: 100, height: 100, style: {}, dataset: {}, children: [], innerHTML: '', textContent: '', className: '', offsetWidth: 1,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, v) { (v ?? !this._s.has(c)) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    getContext: ctx2d, appendChild(c) { this.children.push(c); }, addEventListener(t, f) { (listeners[id + ':' + t] = listeners[id + ':' + t] || []).push(f); },
    querySelector: () => el('q'), querySelectorAll: () => [], focus: noop };
  return e;
}
const els = {};
globalThis.window = { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1, addEventListener(t, f) { (listeners['win:' + t] = listeners['win:' + t] || []).push(f); } };
globalThis.document = { getElementById: (id) => (els[id] = els[id] || el(id)), createElement: () => el('new'), querySelector: () => el('q'), querySelectorAll: () => [] };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
let rafCb = null; globalThis.requestAnimationFrame = (f) => { rafCb = f; };
globalThis.performance = { now: () => Date.now() };
globalThis.setTimeout = (f) => f();
for (const f of ['levels', 'engine', 'audio', 'render', 'main']) require('../js/' + f + '.js');
const AC = globalThis.AC, G = AC.game;
const key = (code, type = 'keydown') => (listeners['win:' + type] || []).forEach((f) => f({ code, repeat: false, preventDefault: noop }));
let t = 0; const tick = (n) => { for (let i = 0; i < n; i++) { t += 16; rafCb(t); } };
tick(5);
if (G.mode !== 'title') throw new Error('Titelbild erwartet');
// "Neues Abenteuer" klicken: letzter Overlay-Button-Callback -> wir rufen startScene über Engine-State nach
const lastRow = () => els.overlayBox.children[els.overlayBox.children.length - 1].children;
lastRow().find((b) => /Neues/.test(b.innerHTML)).onclick();
tick(5);
if (G.mode !== 'play') throw new Error('Spielmodus erwartet');
lastRow()[0].onclick(); // "Los geht's"
if (G.overlayOpen) throw new Error('Overlay sollte zu sein');
tick(30);
key('KeyD'); tick(40); key('KeyD', 'keyup');
const m = G.s.chars[0]; if (m.x === 2) throw new Error('Mia hat sich nicht bewegt');
console.log('  Mia lief nach', m.x + ',' + m.y);
key('Tab'); key('KeyE'); key('Space'); key('KeyQ'); key('ShiftLeft'); key('KeyH'); tick(60);
(listeners['game:click'] || []).forEach((f) => f({ clientX: 700, clientY: 500 })); tick(120);
console.log('✔ UI: Titel → Kapitel 1 → Eingaben ohne Fehler; aktive Figur', G.s.chars[G.s.active].id, 'bei', G.s.chars[G.s.active].x + ',' + G.s.chars[G.s.active].y);
