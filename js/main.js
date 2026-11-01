// Adventure Club – Spielablauf, Eingabe & Oberfläche
(function () {
  'use strict';
  const AC = globalThis.AC;
  const E = AC.Engine, SND = AC.Audio;
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const R = new AC.Renderer(canvas);
  const SAVE_KEY = 'adventureClub.save.v1';

  const G = {
    s: null, bank: 0, mode: 'title', overlayOpen: false, overlayEsc: null,
    held: [], buffer: null, queue: [], hover: null, endT: -1, hintIdx: 0,
    dlg: { cur: null, q: [], t: 0 }, hud: {},
  };

  // Steuerung: W = oben rechts, D = unten rechts, S = unten links, A = oben links
  const KEY_DIR = { KeyW: 0, ArrowUp: 0, KeyD: 1, ArrowRight: 1, KeyS: 2, ArrowDown: 2, KeyA: 3, ArrowLeft: 3 };

  const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } };
  const save = (d) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } };
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>');

  // ------------------------------------------------------------ Overlays
  function overlay({ cls = '', html, buttons = [], onEsc = null }) {
    const ov = $('overlay'), box = $('overlayBox');
    box.className = cls;
    box.innerHTML = html;
    const bar = document.createElement('div');
    bar.className = 'btnrow';
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn' + (b.primary ? ' primary' : '');
      el.innerHTML = b.label;
      el.onclick = () => { SND.init(); SND.play('click'); closeOverlay(); if (b.action) b.action(); };
      bar.appendChild(el);
    });
    box.appendChild(bar);
    ov.classList.remove('hidden');
    G.overlayOpen = true;
    G.overlayEsc = onEsc;
    G.held.length = 0; G.buffer = null;
    setTimeout(() => { const p = bar.querySelector('.primary') || bar.querySelector('button'); if (p) p.focus(); }, 40);
  }
  function closeOverlay() { $('overlay').classList.add('hidden'); G.overlayOpen = false; G.overlayEsc = null; }

  function portraitsHtml() {
    return '<div class="trio">' + E.ORDER.map((id) => `<div class="trio-kid"><canvas data-portrait="${id}" width="120" height="120"></canvas>` +
      `<b>${AC.CHAR_DEFS[id].name}</b><span>${AC.CHAR_DEFS[id].role}</span></div>`).join('') + '</div>';
  }
  function paintPortraits(root) { root.querySelectorAll('canvas[data-portrait]').forEach((c) => AC.drawPortrait(c, c.dataset.portrait)); }

  function titleScreen() {
    G.mode = 'title';
    hideDialog();
    $('hud').classList.add('hidden');
    if (!G.s) { G.s = E.loadScene(0); R.snapCamera(); }
    const sv = loadSave();
    const buttons = [];
    if (sv && sv.scene > 0 && sv.scene < AC.LEVELS.length) {
      buttons.push({ label: `▶ Weiterspielen – Kapitel ${sv.scene + 1}`, primary: true, action: () => { G.bank = sv.gems || 0; startScene(sv.scene); } });
    }
    buttons.push({ label: '✦ Neues Abenteuer', primary: !buttons.length, action: () => { G.bank = 0; save({ scene: 0, gems: 0 }); startScene(0); } });
    buttons.push({ label: 'Steuerung & Fähigkeiten', action: () => helpScreen(titleScreen) });
    overlay({
      cls: 'title',
      html: `<div class="logo-small">Der</div><h1 class="logo">Adventure Club</h1>
        <div class="subtitle">und das Geheimnis des goldenen Idols</div>${portraitsHtml()}
        <p class="lead">Erkunde mit Mia, Ben und Lea uralte Tempel, Pyramiden und Höhlen. Jedes Kind hat besondere Fähigkeiten –
        nur gemeinsam löst ihr die Rätsel und findet den Weg in die nächste Kammer.</p>`,
      buttons,
    });
    paintPortraits($('overlayBox'));
  }

  function helpScreen(back) {
    const wasOpen = G.mode === 'play';
    overlay({
      cls: 'help',
      html: `<h2>Steuerung</h2>
      <div class="help-grid">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / Pfeiltasten</div><div>Laufen (W = schräg oben rechts, A = oben links …) – oder einfach auf ein Feld klicken</div>
        <div><kbd>E</kbd> / <kbd>Enter</kbd></div><div>Benutzen: Inschrift lesen, Hebel ziehen, Scheibe drehen, Sockel …</div>
        <div><kbd>TAB</kbd> / <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd></div><div>Figur wechseln (oder auf ein Kind bzw. seine Karte klicken)</div>
        <div><kbd>H</kbd></div><div>Hinweis anzeigen</div>
        <div><kbd>R</kbd></div><div>Szene neu starten (falls ein Block festhängt)</div>
        <div><kbd>M</kbd> · Mausrad</div><div>Ton an/aus · Zoom</div>
      </div>
      <h2>Fähigkeiten</h2>
      <div class="skills">
        <div class="sk mia"><canvas data-portrait="mia" width="80" height="80"></canvas><div><b>Mia – Die Gelehrte</b>
          <p><kbd>E</kbd> liest alte Inschriften – nur sie versteht die Hinweise.<br><kbd>Q</kbd> Peitsche (4 Felder weit): zieht Hebel und Gegenstände über Abgründe heran und schwingt sich an Holzpfählen hinüber.</p></div></div>
        <div class="sk ben"><canvas data-portrait="ben" width="80" height="80"></canvas><div><b>Ben – Der Starke</b>
          <p>Schiebt schwere Steinblöcke (einfach dagegen laufen) – auch in Gruben, um sie zu füllen.<br>Zertrümmert Geröll und drückt schwere Metallplatten herunter.</p></div></div>
        <div class="sk lea"><canvas data-portrait="lea" width="80" height="80"></canvas><div><b>Lea – Die Akrobatin</b>
          <p><kbd>Leertaste</kbd> springt über ein Feld breite Gruben.<br><kbd>Shift</kbd> Sprint an/aus: rennt über brüchigen Boden und flitzt durch Stachelfallen.</p></div></div>
      </div>
      <p class="small">Eine Szene ist geschafft, wenn alle drei Kinder auf den goldenen Ausgangsfeldern stehen.</p>`,
      buttons: [{ label: wasOpen ? 'Weiterspielen' : 'Zurück', primary: true, action: () => { if (back) back(); } }],
      onEsc: () => { closeOverlay(); if (back) back(); },
    });
    paintPortraits($('overlayBox'));
  }

  // ------------------------------------------------------------ Szenen
  function startScene(i, quiet) {
    G.s = E.loadScene(i);
    G.queue = []; G.held = []; G.buffer = null; G.endT = -1; G.hintIdx = 0;
    G.dlg = { cur: null, q: [], t: 0 };
    hideDialog();
    R.snapCamera();
    G.mode = 'play';
    $('hud').classList.remove('hidden');
    buildParty();
    G.hud = {};
    updateHud();
    if (quiet) return;
    const L = AC.LEVELS[i];
    SND.play('chapter');
    overlay({
      cls: 'chapter',
      html: `<div class="chapnum">Kapitel ${i + 1} von ${AC.LEVELS.length}</div><h1>${esc(L.title)}</h1><p>${esc(L.story)}</p>`,
      buttons: [{ label: 'Los geht\'s!', primary: true, action: () => (L.dialog || []).forEach(([w, t]) => pushSay(w, t, true)) }],
    });
  }

  function chapterComplete() {
    const s = G.s, L = AC.LEVELS[s.idx];
    G.bank += s.gems;
    const next = s.idx + 1;
    if (next >= AC.LEVELS.length) { save({ scene: 0, gems: 0 }); return winScreen(s); }
    save({ scene: next, gems: G.bank });
    overlay({
      cls: 'chapter done',
      html: `<div class="chapnum">Kapitel ${s.idx + 1} geschafft!</div><h1>${esc(L.title)}</h1><p>${esc(L.outro)}</p>
        <div class="gemline">💎 Edelsteine in diesem Kapitel: <b>${s.gems} / ${s.gemsTotal}</b></div>`,
      buttons: [{ label: 'Weiter zum nächsten Kapitel ➜', primary: true, action: () => startScene(next) }],
    });
  }

  function winScreen(s) {
    const total = AC.LEVELS.reduce((n, L, i) => n + E.loadScene(i).gemsTotal, 0);
    overlay({
      cls: 'chapter win',
      html: `<div class="chapnum">Das Abenteuer ist geschafft!</div><h1>Das goldene Idol ist gerettet!</h1>${portraitsHtml()}
        <p>In letzter Sekunde stolpern Mia, Ben und Lea ins Freie, als hinter ihnen der Schrein in sich zusammenstürzt.
        Das goldene Idol funkelt in der Abendsonne. Es kommt ins Museum – und der Adventure Club in alle Zeitungen!</p>
        <div class="gemline">💎 Gesammelte Edelsteine: <b>${G.bank} / ${total}</b></div>`,
      buttons: [{ label: 'Nochmal spielen', primary: true, action: () => { G.s = null; titleScreen(); } }],
    });
    paintPortraits($('overlayBox'));
  }

  function failScreen() {
    const s = G.s;
    overlay({
      cls: 'chapter fail',
      html: `<div class="chapnum">Oh nein!</div><h1>Der Schrein stürzt ein!</h1>
        <p>Die Decke kracht herunter – doch im letzten Moment zieht euch ein geheimer Gang zurück vor den Sockel.
        Versucht es nochmal: Alle drei müssen schneller zum Ausgang!</p>`,
      buttons: [{ label: 'Nochmal versuchen', primary: true, action: () => {
        const cp = s.checkpoint;
        G.s = cp ? E.restore(cp, cp) : E.loadScene(s.idx);
        G.queue = []; G.endT = -1;
        R.snapCamera();
        buildParty();
      } }],
    });
  }

  function confirmReset() {
    overlay({
      cls: 'small-box',
      html: '<h2>Szene neu starten?</h2><p>Alle Fortschritte in diesem Kapitel gehen verloren.</p>',
      buttons: [{ label: 'Ja, neu starten', primary: true, action: () => startScene(G.s.idx, true) }, { label: 'Abbrechen' }],
      onEsc: closeOverlay,
    });
  }

  function showReading(e) {
    overlay({
      cls: 'parchment',
      html: `<div class="reader"><canvas data-portrait="mia" width="64" height="64"></canvas><span>Mia liest vor:</span></div>
        <h2>${esc(e.title || 'Inschrift')}</h2><p class="inscription">${esc(e.text)}</p>`,
      buttons: [{ label: 'Verstanden', primary: true }],
      onEsc: closeOverlay,
    });
    paintPortraits($('overlayBox'));
  }

  // ------------------------------------------------------------ Dialog
  function pushSay(who, text, story) {
    const m = { who, text, story: !!story };
    if (story) { G.dlg.q.push(m); if (!G.dlg.cur) nextDialog(); return; }
    if (G.dlg.cur && G.dlg.cur.story) G.dlg.q.unshift(G.dlg.cur);
    showDialog(m);
  }
  function nextDialog() { const m = G.dlg.q.shift(); if (m) showDialog(m); else hideDialog(); }
  function showDialog(m) {
    G.dlg.cur = m;
    G.dlg.t = (m.story ? 3.2 : 2.4) + m.text.length * 0.045;
    const box = $('dialog');
    box.className = 'who-' + m.who;
    $('dlgName').textContent = AC.NAMES[m.who] || m.who;
    $('dlgText').textContent = m.text;
    AC.drawPortrait($('dlgPortrait'), m.who);
    box.classList.remove('hidden');
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  }
  function hideDialog() { G.dlg.cur = null; $('dialog').classList.add('hidden'); }
  function updateDialog(dt) { if (G.dlg.cur) { G.dlg.t -= dt; if (G.dlg.t <= 0) nextDialog(); } }
  $('dialog').addEventListener('click', () => nextDialog());

  function showHint() {
    const L = AC.LEVELS[G.s.idx];
    if (!L.hints || !L.hints.length) return;
    pushSay('tip', `(${(G.hintIdx % L.hints.length) + 1}/${L.hints.length}) ` + L.hints[G.hintIdx % L.hints.length]);
    G.hintIdx++;
  }

  // ------------------------------------------------------------ HUD
  function buildParty() {
    const p = $('party');
    p.innerHTML = '';
    E.ORDER.forEach((id, i) => {
      const d = AC.CHAR_DEFS[id];
      const card = document.createElement('div');
      card.className = 'card ' + id;
      card.innerHTML = `<canvas width="112" height="112"></canvas><div class="info"><div class="nm"><span class="num">${i + 1}</span>${d.name}</div>` +
        `<div class="role">${d.role}</div><ul>${d.skills.map((k) => `<li>${k.name} <kbd>${k.key}</kbd></li>`).join('')}</ul></div>`;
      card.onclick = () => { SND.init(); switchChar(i); };
      p.appendChild(card);
      AC.drawPortrait(card.querySelector('canvas'), id);
    });
    G.hud.active = -1;
  }

  function buildActions(id) {
    const a = $('actions');
    const btn = (label, key, fn, extra) => `<button class="act ${extra || ''}" data-fn="${fn}"><kbd>${key}</kbd>${label}</button>`;
    let h = btn('Benutzen', 'E', 'use');
    if (id === 'mia') h += btn('Peitsche', 'Q', 'whip');
    if (id === 'lea') h += btn('Springen', '␣', 'jump') + btn('Sprint', '⇧', 'sprint', 'sprint');
    if (id === 'ben') h += '<div class="act-note">Lauf gegen Blöcke &amp; Geröll</div>';
    a.innerHTML = h;
    a.querySelectorAll('button').forEach((b) => {
      b.onclick = (ev) => {
        ev.stopPropagation(); SND.init();
        const fn = b.dataset.fn;
        if (fn === 'use') act(() => E.interact(G.s));
        if (fn === 'whip') act(() => E.whip(G.s));
        if (fn === 'jump') act(() => E.jump(G.s));
        if (fn === 'sprint') E.toggleSprint(G.s);
      };
    });
  }

  function iconChip(type, label, count) {
    return `<div class="chip" title="${label}"><canvas data-icon="${type}" width="40" height="40"></canvas>${count > 1 ? '×' + count : ''}<span>${label}</span></div>`;
  }

  function updateHud() {
    const s = G.s;
    if (!s || G.mode !== 'play') return;
    const L = AC.LEVELS[s.idx];
    const h = G.hud;
    const title = `Kapitel ${s.idx + 1}: ${L.title}`;
    if (h.title !== title) { $('sceneTitle').textContent = title; h.title = title; }
    const gems = `${G.bank + s.gems}`;
    if (h.gems !== gems) {
      $('gems').innerHTML = `<canvas data-icon="gem" width="40" height="40"></canvas><b>${gems}</b>`;
      AC.drawIcon($('gems').querySelector('canvas'), 'gem');
      h.gems = gems;
    }
    const inv = `${s.inv.key}|${s.inv.sandbag}|${s.inv.idol}`;
    if (h.inv !== inv) {
      let html = '';
      if (s.inv.key) html += iconChip('key', 'Kristallschlüssel', s.inv.key);
      if (s.inv.sandbag) html += iconChip('sandbag', 'Sandsack', s.inv.sandbag);
      if (s.inv.idol) html += iconChip('idol', 'Goldenes Idol', 1);
      $('inventory').innerHTML = html;
      $('inventory').querySelectorAll('canvas[data-icon]').forEach((c) => AC.drawIcon(c, c.dataset.icon));
      h.inv = inv;
    }
    if (h.active !== s.active) {
      document.querySelectorAll('#party .card').forEach((c, i) => c.classList.toggle('active', i === s.active));
      buildActions(s.chars[s.active].id);
      h.active = s.active;
      h.sprint = null;
    }
    const lea = s.chars[2];
    if (h.sprint !== lea.sprint) {
      const b = document.querySelector('#actions .sprint');
      if (b) b.classList.toggle('on', lea.sprint);
      document.querySelector('#party .card.lea').classList.toggle('sprinting', lea.sprint);
      h.sprint = lea.sprint;
    }
    const tm = $('timer');
    if (s.timer !== null && !s.complete) {
      tm.classList.remove('hidden');
      const t = Math.ceil(s.timer);
      if (h.timer !== t) { tm.textContent = `⚠ Einsturz in ${t} s`; tm.classList.toggle('urgent', t <= 10); h.timer = t; }
    } else if (!tm.classList.contains('hidden')) tm.classList.add('hidden');
    const snd = SND.muted ? '🔇' : '🔊';
    if (h.snd !== snd) { $('btnSound').textContent = snd; h.snd = snd; }
  }

  // ------------------------------------------------------------ Eingabe
  function act(fn) {
    const s = G.s;
    if (!s) return;
    G.queue.length = 0;
    if (s.chars[s.active].t > 0) G.buffer = { kind: 'fn', fn };
    else fn();
  }
  function switchChar(i) {
    if (!G.s) return;
    E.switchTo(G.s, i);
    G.queue = []; G.buffer = null;
  }

  function handleInput(s) {
    const ch = s.chars[s.active];
    if (ch.t > 0) return;
    if (G.buffer) {
      const b = G.buffer; G.buffer = null;
      if (b.kind === 'move') E.move(s, b.dir); else b.fn();
      return;
    }
    if (G.held.length) { E.move(s, G.held[G.held.length - 1]); return; }
    if (G.queue.length) {
      const step = G.queue.shift();
      const ok = step.kind === 'act' ? E.interact(s, step.dir) : E.move(s, step.dir);
      if (!ok) G.queue.length = 0;
    }
  }

  window.addEventListener('keydown', (e) => {
    SND.init();
    if (G.overlayOpen) {
      if (e.code === 'Escape' && G.overlayEsc) { e.preventDefault(); G.overlayEsc(); }
      return;
    }
    if (G.mode !== 'play' || !G.s) return;
    const s = G.s;
    if (e.code in KEY_DIR) {
      e.preventDefault();
      const d = KEY_DIR[e.code];
      if (!e.repeat) {
        G.held = G.held.filter((x) => x !== d);
        G.held.push(d);
        G.buffer = { kind: 'move', dir: d };
        G.queue.length = 0;
      }
      return;
    }
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyE': case 'Enter': case 'NumpadEnter': e.preventDefault(); act(() => E.interact(s)); break;
      case 'Space': e.preventDefault(); act(() => E.jump(s)); break;
      case 'KeyQ': act(() => E.whip(s)); break;
      case 'ShiftLeft': case 'ShiftRight': E.toggleSprint(s); break;
      case 'Tab': e.preventDefault(); switchChar((s.active + 1) % 3); break;
      case 'Digit1': case 'Numpad1': switchChar(0); break;
      case 'Digit2': case 'Numpad2': switchChar(1); break;
      case 'Digit3': case 'Numpad3': switchChar(2); break;
      case 'KeyH': showHint(); break;
      case 'KeyR': confirmReset(); break;
      case 'KeyM': SND.toggle(); break;
      case 'Escape': case 'F1': e.preventDefault(); helpScreen(null); break;
      default: break;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code in KEY_DIR) G.held = G.held.filter((x) => x !== KEY_DIR[e.code]);
  });
  window.addEventListener('blur', () => { G.held = []; });

  canvas.addEventListener('mousemove', (e) => { G.hover = G.mode === 'play' ? R.screenToGrid(e.clientX, e.clientY) : null; });
  canvas.addEventListener('mouseleave', () => { G.hover = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    R.userZoom = Math.max(0.55, Math.min(1.8, R.userZoom * (e.deltaY > 0 ? 0.9 : 1.1)));
  }, { passive: false });
  canvas.addEventListener('click', (e) => {
    SND.init();
    if (G.overlayOpen || G.mode !== 'play' || !G.s) return;
    const g = R.screenToGrid(e.clientX, e.clientY);
    clickTile(g.x, g.y);
  });

  const BUMP = { block: 1, rubble: 1, door: 1 };
  function clickTile(x, y) {
    const s = G.s, ch = s.chars[s.active];
    // Klick auf ein anderes Kind (auch auf den Kopf, der ins Feld dahinter ragt)
    for (const [ox, oy] of [[0, 0], [1, 1]]) {
      const c = E.charAt(s, x + ox, y + oy);
      if (c && c !== ch) { switchChar(s.chars.indexOf(c)); return; }
    }
    if (x === ch.x && y === ch.y) return;
    G.queue = []; G.held = []; G.buffer = null;
    const target = E.interactTarget(s, x, y);
    const dist = Math.abs(x - ch.x) + Math.abs(y - ch.y);
    if (dist === 1) {
      const d = E.DIRV.findIndex(([dx, dy]) => ch.x + dx === x && ch.y + dy === y);
      G.queue.push({ kind: target && !BUMP[target.type] ? 'act' : 'move', dir: d });
      return;
    }
    const p = E.findPath(s, ch, x, y);
    if (p) { G.queue = p.map((d) => ({ kind: 'move', dir: d })); return; }
    if (target || E.objsAt(s, x, y).some((o) => o.type === 'door')) {
      const r = E.findPathAdjacent(s, ch, x, y);
      if (r) {
        G.queue = r.path.map((d) => ({ kind: 'move', dir: d }));
        G.queue.push({ kind: target && !BUMP[target.type] ? 'act' : 'move', dir: r.dir });
        return;
      }
    }
    const t = E.tileAt(s, x, y);
    if (t !== 'wall' && t !== 'void') E.say(s, 'Da komme ich so nicht hin.');
  }

  $('btnHint').onclick = () => { SND.init(); if (G.mode === 'play') showHint(); };
  $('btnReset').onclick = () => { SND.init(); if (G.mode === 'play') confirmReset(); };
  $('btnSound').onclick = () => { SND.init(); SND.toggle(); };
  $('btnHelp').onclick = () => { SND.init(); helpScreen(null); };
  $('btnMenu').onclick = () => { SND.init(); titleScreen(); };
  window.addEventListener('resize', () => R.resize());

  // ------------------------------------------------------------ Ereignisse & Schleife
  function processEvents(s) {
    for (const e of s.events) {
      switch (e.type) {
        case 'say': pushSay(e.who, e.text); break;
        case 'sfx': SND.play(e.name); break;
        case 'fx': R.addFx(e); break;
        case 'shake': R.addShake(e.amount); break;
        case 'read': showReading(e); break;
        case 'fail': setTimeout(failScreen, 600); break;
        default: break;
      }
    }
    s.events.length = 0;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const s = G.s;
    if (s && G.mode === 'play' && !G.overlayOpen) {
      handleInput(s);
      E.update(s, dt);
      processEvents(s);
      updateDialog(dt);
      if (s.complete && G.endT < 0) G.endT = 1.2;
      if (G.endT > 0) { G.endT -= dt; if (G.endT <= 0) chapterComplete(); }
    }
    if (G.s) {
      try { R.render(G.s, dt, { hover: G.hover }); } catch (err) { console.error(err); }
      updateHud();
    }
    requestAnimationFrame(frame);
  }

  titleScreen();
  requestAnimationFrame(frame);
  AC.game = G; // zum Debuggen
})();
