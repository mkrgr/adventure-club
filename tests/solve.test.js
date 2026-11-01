// Spielt alle Szenen automatisch durch und prüft, dass sie lösbar sind.
// Aufruf: node tests/solve.test.js
'use strict';
require('../js/levels.js');
require('../js/engine.js');
const E = globalThis.AC.Engine;
const N = 0, O = 1, S = 2, W = 3;

function settle(s) {
  let g = 0;
  while (s.chars.some((c) => c.t > 0) && g++ < 500) E.update(s, 0.02);
  E.update(s, 0.02);
}
function sel(s, id) { E.switchTo(s, E.ORDER.indexOf(id)); }
function ch(s) { return E.active(s); }
function go(s, id, x, y) {
  sel(s, id);
  const c = ch(s);
  if (c.x === x && c.y === y) return;
  const p = E.findPath(s, c, x, y);
  if (!p) throw new Error(`${id}: kein Weg nach ${x},${y} (steht bei ${c.x},${c.y})`);
  for (const d of p) {
    if (!E.move(s, d)) throw new Error(`${id}: Schritt ${d} fehlgeschlagen bei ${c.x},${c.y}`);
    settle(s);
  }
}
function step(s, id, d, n = 1) {
  sel(s, id);
  for (let i = 0; i < n; i++) {
    const c = ch(s);
    if (!E.move(s, d)) throw new Error(`${id}: move ${d} fehlgeschlagen bei ${c.x},${c.y}`);
    settle(s);
  }
}
function use(s, id, d, n = 1) {
  sel(s, id);
  for (let i = 0; i < n; i++) {
    if (!E.interact(s, d)) throw new Error(`${id}: interact ${d} fehlgeschlagen bei ${ch(s).x},${ch(s).y}`);
    settle(s);
  }
}
function act(s, id, d, fn, name) {
  sel(s, id);
  E.face(s, d);
  if (!fn(s)) throw new Error(`${id}: ${name} fehlgeschlagen bei ${ch(s).x},${ch(s).y}`);
  settle(s);
}
const jump = (s, d) => act(s, 'lea', d, E.jump, 'jump');
const whip = (s, d) => act(s, 'mia', d, E.whip, 'whip');
function assert(c, msg) { if (!c) throw new Error('Assertion: ' + msg); }
function at(s, id, x, y) { const c = s.chars[E.ORDER.indexOf(id)]; assert(c.x === x && c.y === y, `${id} sollte bei ${x},${y} sein, ist bei ${c.x},${c.y}`); }
function finish(s) { settle(s); for (let i = 0; i < 5; i++) E.update(s, 0.05); assert(s.complete, 'Szene nicht abgeschlossen'); }
const door = (s, id) => s.objects.find((o) => o.id === id).open;

const solutions = [
  // 1 Dschungeltempel
  (s) => {
    go(s, 'mia', 4, 2); use(s, 'mia', S);
    assert(s.events.some((e) => e.type === 'read'), 'Inschrift gelesen');
    go(s, 'mia', 2, 5); use(s, 'mia', S, 1);
    go(s, 'mia', 3, 5); use(s, 'mia', S, 3);
    go(s, 'mia', 4, 5); use(s, 'mia', S, 2);
    assert(door(s, 'a'), 'Tor a offen');
    go(s, 'ben', 10, 5); step(s, 'ben', S);
    go(s, 'ben', 10, 3); step(s, 'ben', S, 5);
    assert(E.tileAt(s, 10, 9) === 'filled', 'Grube gefüllt');
    go(s, 'lea', 13, 3); jump(s, N); at(s, 'lea', 13, 1); jump(s, S); at(s, 'lea', 13, 3);
    assert(s.gems === 1, 'Edelstein');
    go(s, 'ben', 10, 11); go(s, 'mia', 9, 11); go(s, 'lea', 11, 11);
    finish(s);
  },
  // 2 Pyramide
  (s) => {
    go(s, 'ben', 1, 2); step(s, 'ben', O, 3);
    go(s, 'lea', 5, 5);
    assert(door(s, 'a'), 'Tor a offen (Platten)');
    go(s, 'mia', 13, 3); use(s, 'mia', O); // Inschrift
    go(s, 'mia', 13, 2); use(s, 'mia', N);
    assert(s.flags.lockA, 'Tor a dauerhaft offen');
    sel(s, 'lea'); E.toggleSprint(s);
    go(s, 'lea', 7, 13); use(s, 'lea', O);
    assert(door(s, 'br'), 'Brücke offen');
    go(s, 'lea', 12, 6);
    go(s, 'mia', 13, 11); whip(s, O);
    assert(door(s, 'x'), 'Tor x offen');
    go(s, 'mia', 12, 14); go(s, 'lea', 14, 14); go(s, 'ben', 13, 14);
    assert(s.gems === 1, 'Edelstein');
    finish(s);
  },
  // 3 Kristallhöhle
  (s) => {
    go(s, 'ben', 4, 2); step(s, 'ben', O);
    go(s, 'ben', 9, 4); step(s, 'ben', S, 4);
    go(s, 'ben', 12, 5); step(s, 'ben', W, 2);
    go(s, 'ben', 9, 4); step(s, 'ben', S, 5);
    assert(E.tileAt(s, 9, 10) === 'filled', 'zweite Grube gefüllt');
    go(s, 'ben', 7, 12);
    go(s, 'lea', 12, 3); jump(s, N); jump(s, S);
    go(s, 'mia', 8, 14); use(s, 'mia', S, 1);
    go(s, 'mia', 9, 14); use(s, 'mia', S, 3);
    go(s, 'mia', 10, 14); use(s, 'mia', S, 2);
    assert(door(s, 'h'), 'Kristalltor offen');
    go(s, 'mia', 16, 13); whip(s, S);
    assert(s.inv.key === 1, 'Schlüssel');
    sel(s, 'lea'); E.toggleSprint(s);
    go(s, 'lea', 19, 12);
    // Langsam (ohne Sprint) durchlaufen muss scheitern
    // Warten bis Stacheln gerade versunken sind
    let g = 0;
    while (!(!s.spikesUp && (s.time % 2.5) < 0.03) && g++ < 1000) E.update(s, 0.01);
    step(s, 'lea', O, 9); at(s, 'lea', 28, 12);
    step(s, 'lea', O); // Tür aufschließen
    assert(door(s, 'k'), 'Kristalltür offen');
    go(s, 'lea', 33, 11); use(s, 'lea', N);
    assert(!s.spikesEnabled, 'Stacheln aus');
    go(s, 'lea', 33, 14); go(s, 'mia', 32, 14); go(s, 'ben', 31, 14);
    assert(s.gems === 1, 'Edelstein');
    finish(s);
  },
  // 4 Schrein
  (s) => {
    go(s, 'lea', 5, 8); jump(s, W); at(s, 'lea', 3, 8); step(s, 'lea', W);
    go(s, 'mia', 15, 8); whip(s, O); at(s, 'mia', 19, 8); step(s, 'mia', O);
    go(s, 'ben', 6, 10); step(s, 'ben', W);
    go(s, 'ben', 3, 11); assert(s.inv.sandbag === 1, 'Sandsack');
    go(s, 'ben', 2, 10);
    assert(s.flags.shrine, 'Schrein offen');
    step(s, 'lea', O); jump(s, O); at(s, 'lea', 5, 8);
    step(s, 'mia', W); whip(s, W); at(s, 'mia', 15, 8);
    go(s, 'mia', 10, 3); use(s, 'mia', N);
    assert(s.flags.idol && s.timer > 0 && s.checkpoint, 'Idol + Timer + Checkpoint');
    go(s, 'mia', 9, 14); go(s, 'lea', 11, 14); go(s, 'ben', 10, 14);
    assert(!s.failed, 'nicht eingestürzt');
    finish(s);
  },
];

// Negative Tests: Fähigkeiten-Beschränkungen
function negatives() {
  let s = E.loadScene(1);
  // Mia darf nicht über brüchigen Boden
  sel(s, 'ben'); go(s, 'ben', 1, 2); step(s, 'ben', O, 3); go(s, 'lea', 5, 5);
  go(s, 'mia', 9, 6); sel(s, 'mia');
  assert(!E.move(s, S) || E.tileAt(s, ch(s).x, ch(s).y) !== 'cracked', 'Mia sollte nicht auf brüchigen Boden');
  // Ben kann nicht springen, Lea nicht peitschen
  assert(!E.jump(s), 'Mia springt nicht');
  sel(s, 'lea'); assert(!E.whip(s), 'Lea peitscht nicht');

  // Szene 4: Idol ohne Sandsack nicht nehmbar; Timer-Ablauf -> failed + restore
  s = E.loadScene(3);
  s.flags.shrine = true; E.update(s, 0.02);
  go(s, 'mia', 10, 3); use(s, 'mia', N);
  assert(!s.flags.idol, 'Idol ohne Sandsack nicht genommen');
  s.inv.sandbag = 1; use(s, 'mia', N);
  assert(s.flags.idol, 'Idol genommen');
  const cp = s.checkpoint;
  for (let i = 0; i < 2000 && !s.failed; i++) E.update(s, 0.05);
  assert(s.failed, 'Timer läuft ab');
  const r = E.restore(cp, cp);
  assert(r.inv.sandbag === 1 && !r.flags.idol && r.timer === null, 'Checkpoint wiederhergestellt');

  // Szene 3: Stacheln verletzen Mia (zu langsam)
  s = E.loadScene(2);
  s.inv.key = 0;
  // Teleport für den Test
  const m = s.chars[0]; m.x = 19; m.y = 12; m.safeX = 19; m.safeY = 12;
  sel(s, 'mia');
  let hurt = false;
  for (let i = 0; i < 12; i++) { E.move(s, O); settle(s); if (s.events.some((e) => e.type === 'sfx' && e.name === 'hurt')) { hurt = true; break; } }
  assert(hurt, 'Mia wird von Stacheln getroffen');
}

let ok = true;
solutions.forEach((sol, i) => {
  const s = E.loadScene(i);
  try {
    sol(s);
    console.log(`✔ Szene ${i + 1}: ${globalThis.AC.LEVELS[i].title} – gelöst (Spielzeit ${s.time.toFixed(1)} s, Edelsteine ${s.gems}/${s.gemsTotal})`);
  } catch (e) {
    ok = false;
    console.error(`✘ Szene ${i + 1}: ${e.message}`);
  }
});
try { negatives(); console.log('✔ Fähigkeiten-Beschränkungen, Einsturz-Timer & Checkpoint'); } catch (e) { ok = false; console.error('✘ Negativtests: ' + e.message); }
process.exit(ok ? 0 : 1);
