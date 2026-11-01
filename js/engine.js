// Adventure Club – Spiellogik (ohne DOM, auch in Node lauffähig)
var AC = globalThis.AC = globalThis.AC || {};
(function () {
  'use strict';

  // Gitterrichtungen. Auf dem Bildschirm (isometrisch):
  // 0 = Nord (oben rechts), 1 = Ost (unten rechts), 2 = Süd (unten links), 3 = West (oben links)
  const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const ORDER = ['mia', 'ben', 'lea'];
  const NAMES = { mia: 'Mia', ben: 'Ben', lea: 'Lea', tip: 'Tipp' };

  const CHAR_DEFS = {
    mia: { name: 'Mia', role: 'Die Gelehrte', skills: [{ name: 'Inschriften lesen', key: 'E' }, { name: 'Peitsche', key: 'Q' }] },
    ben: { name: 'Ben', role: 'Der Starke', skills: [{ name: 'Blöcke schieben', key: 'laufen' }, { name: 'Geröll zertrümmern', key: 'laufen' }] },
    lea: { name: 'Lea', role: 'Die Akrobatin', skills: [{ name: 'Springen', key: 'Leertaste' }, { name: 'Sprinten', key: 'Shift' }] },
  };

  const SOLID = { block: 1, rubble: 1, lever: 1, inscr: 1, dial: 1, pedestal: 1 };
  const ITEMS = { gem: 1, key: 1, sandbag: 1 };
  const INTERACTIVE = { inscr: 1, dial: 1, lever: 1, pedestal: 1, rubble: 1, block: 1 };
  const SPEED = { walk: 0.2, sprint: 0.1, ben: 0.24, jump: 0.45, swing: 0.8, push: 0.32 };

  const BASE = {
    '#': { t: 'wall' }, '.': { t: 'floor' }, ' ': { t: 'void' }, '_': { t: 'pit' },
    '%': { t: 'cracked' }, '^': { t: 'spikes' }, 'E': { t: 'exit' },
    'B': { t: 'floor', o: { type: 'block' } },
    'r': { t: 'floor', o: { type: 'rubble' } },
    'G': { t: 'floor', o: { type: 'gem' } },
    'K': { t: 'floor', o: { type: 'key' } },
    'S': { t: 'floor', o: { type: 'sandbag' } },
    'H': { t: 'pit', o: { type: 'hook' } },
    'm': { t: 'floor', start: 'mia' }, 'b': { t: 'floor', start: 'ben' }, 'l': { t: 'floor', start: 'lea' },
  };

  const GEM_LINES = [
    'Ein Edelstein! Der kommt in die Schatzkiste des Adventure Clubs.',
    'Noch ein funkelnder Edelstein!',
    'Wow, der glitzert ja wie verrückt!',
    'Ein Edelstein – den stecke ich ein!',
  ];

  // ---------------------------------------------------------------- Helfer
  const level = (s) => AC.LEVELS[s.idx];
  const active = (s) => s.chars[s.active];
  function tileAt(s, x, y) {
    if (y < 0 || y >= s.h || x < 0 || x >= s.w) return 'void';
    return s.tiles[y][x];
  }
  const objsAt = (s, x, y) => s.objects.filter((o) => o.x === x && o.y === y);
  const objAt = (s, x, y, type) => s.objects.find((o) => o.x === x && o.y === y && o.type === type);
  const byId = (s, id) => s.objects.find((o) => o.id === id);
  const allById = (s, id) => s.objects.filter((o) => o.id === id);
  const charAt = (s, x, y, except) => s.chars.find((c) => c.x === x && c.y === y && c !== except);
  const removeObj = (s, o) => { const i = s.objects.indexOf(o); if (i >= 0) s.objects.splice(i, 1); };

  function emit(s, e) { s.events.push(e); }
  function say(s, who, text) {
    const k = who + '|' + text;
    if (s.lastMsg[k] !== undefined && s.time - s.lastMsg[k] < 2.5) return;
    s.lastMsg[k] = s.time;
    emit(s, { type: 'say', who, text });
  }
  const sfx = (s, name) => emit(s, { type: 'sfx', name });
  const fx = (s, kind, x, y, extra) => emit(s, Object.assign({ type: 'fx', kind, x, y }, extra || {}));
  const shake = (s, amount) => emit(s, { type: 'shake', amount });

  function bridgeOpen(s, x, y) { const b = objAt(s, x, y, 'bridge'); return !!(b && b.open); }
  function blockedByObj(s, x, y) {
    return s.objects.some((o) => o.x === x && o.y === y && (SOLID[o.type] || (o.type === 'door' && !o.open)));
  }
  function canEnter(s, x, y, ch) {
    const t = tileAt(s, x, y);
    if (t === 'wall' || t === 'void') return false;
    if (t === 'pit' && !bridgeOpen(s, x, y)) return false;
    if (t === 'cracked' && !(ch && ch.id === 'lea' && ch.sprint)) return false;
    if (blockedByObj(s, x, y)) return false;
    if (charAt(s, x, y, ch)) return false;
    return true;
  }
  function plateDown(s, p) {
    if (!p) return false;
    if (objAt(s, p.x, p.y, 'block')) return true;
    const c = charAt(s, p.x, p.y);
    if (!c) return false;
    return !p.heavy || c.id === 'ben';
  }
  const ready = (s, ch) => ch.t <= 0 && !s.complete && !s.failed;

  // ---------------------------------------------------------------- Laden
  function initObj(o) {
    o.t = 0;
    if (o.type === 'dial' && o.val === undefined) o.val = 0;
    if (o.type === 'lever') o.on = !!o.on;
    if (o.type === 'door' || o.type === 'bridge') o.open = !!o.open;
    if (o.type === 'pedestal') { o.hasIdol = true; o.hasBag = false; }
    if (o.type === 'plate') o.down = false;
  }

  function loadScene(idx) {
    const L = AC.LEVELS[idx];
    const s = {
      idx, w: 0, h: L.map.length, tiles: [], objects: [], chars: [], active: 0,
      inv: { key: 0, sandbag: 0, idol: 0 }, gems: 0, gemsTotal: 0, flags: {}, time: 0,
      timer: null, timerMax: 0, spikesEnabled: true, spikesUp: false, spikeList: [],
      complete: false, failed: false, events: [], lastMsg: {}, uid: 1, init: true, checkpoint: null,
    };
    s.w = Math.max(...L.map.map((r) => r.length));
    const starts = {};
    for (let y = 0; y < s.h; y++) {
      const row = [];
      for (let x = 0; x < s.w; x++) {
        const c = L.map[y][x] || ' ';
        const def = (L.legend && L.legend[c]) || BASE[c];
        if (!def) throw new Error(`Unbekanntes Kartenzeichen '${c}' in Szene ${idx} bei ${x},${y}`);
        row.push(def.t);
        if (def.t === 'spikes') s.spikeList.push([x, y]);
        if (def.o) {
          const o = Object.assign({ uid: s.uid++, x, y }, JSON.parse(JSON.stringify(def.o)));
          initObj(o);
          s.objects.push(o);
          if (o.type === 'gem') s.gemsTotal++;
        }
        if (def.start) starts[def.start] = { x, y };
      }
      s.tiles.push(row);
    }
    s.chars = ORDER.map((id) => {
      const p = starts[id];
      if (!p) throw new Error(`Startpunkt für ${id} fehlt in Szene ${idx}`);
      return { id, x: p.x, y: p.y, px: p.x, py: p.y, dir: 2, t: 0, dur: 0, kind: 'idle',
        sprint: false, safeX: p.x, safeY: p.y, hurtT: 0, hookX: 0, hookY: 0 };
    });
    runLogic(s);
    for (const o of s.objects) if (o.type === 'plate') o.down = plateDown(s, o);
    s.init = false;
    s.events.length = 0;
    return s;
  }

  function snapshot(s) {
    const { events, checkpoint, ...rest } = s; // eslint-disable-line no-unused-vars
    return JSON.stringify(rest);
  }
  function restore(str, checkpoint) {
    const s = JSON.parse(str);
    s.events = [];
    s.checkpoint = checkpoint || null;
    return s;
  }

  // ---------------------------------------------------------------- Szenen-API
  function setGate(s, d, cond, latch) {
    if (!d) return;
    const key = 'latch_' + d.id;
    if (latch && cond) s.flags[key] = true;
    let open = !!cond || !!s.flags[key];
    if (!open && d.open && (charAt(s, d.x, d.y) || objAt(s, d.x, d.y, 'block'))) open = true; // nicht auf jemandem schließen
    if (open !== d.open) {
      d.open = open;
      d.t = 0.5;
      if (!s.init) {
        sfx(s, d.type === 'bridge' ? 'bridge' : 'door');
        if (d.type === 'door') shake(s, 3);
        if (open && d.msg && !d.msgShown) { d.msgShown = true; say(s, d.msg[0], d.msg[1]); }
      }
    }
  }

  function api(s) {
    return {
      s, flags: s.flags, inv: s.inv,
      pressed: (id) => plateDown(s, byId(s, id)),
      lever: (id) => !!(byId(s, id) || {}).on,
      dial: (id) => (byId(s, id) || {}).val,
      door: (id, cond, latch) => allById(s, id).forEach((d) => setGate(s, d, cond, latch)),
      bridge: (id, cond) => allById(s, id).forEach((d) => setGate(s, d, cond, false)),
      say: (who, text) => say(s, who, text),
      sfx: (n) => sfx(s, n),
      shake: (a) => shake(s, a),
      fx: (k, x, y, e) => fx(s, k, x, y, e),
      startTimer: (sec) => { s.timer = sec; s.timerMax = sec; },
      checkpoint: () => { s.checkpoint = snapshot(s); },
      setSpikes: (on) => { s.spikesEnabled = on; },
    };
  }
  function runLogic(s) { const L = level(s); if (L.logic) L.logic(api(s)); }

  // ---------------------------------------------------------------- Bewegung
  function stepTo(s, ch, x, y, dur, kind) {
    ch.px = ch.x; ch.py = ch.y;
    ch.x = x; ch.y = y;
    ch.t = dur; ch.dur = dur; ch.kind = kind;
    arrive(s, ch);
  }
  function busy(ch, d, kind) { ch.px = ch.x; ch.py = ch.y; ch.t = d; ch.dur = d; ch.kind = kind; }

  function arrive(s, ch) {
    for (const o of objsAt(s, ch.x, ch.y)) if (ITEMS[o.type]) collect(s, o, ch);
    if (tileAt(s, ch.x, ch.y) !== 'spikes') { ch.safeX = ch.x; ch.safeY = ch.y; }
  }

  function collect(s, o, ch) {
    removeObj(s, o);
    fx(s, 'sparkle', o.x, o.y);
    if (o.type === 'gem') {
      s.gems++;
      sfx(s, 'gem');
      say(s, ch.id, GEM_LINES[(s.gems - 1) % GEM_LINES.length]);
    } else if (o.type === 'key') {
      s.inv.key++;
      sfx(s, 'item');
      say(s, ch.id, 'Ein Schlüssel aus purem Kristall! Der passt bestimmt irgendwo.');
    } else if (o.type === 'sandbag') {
      s.inv.sandbag++;
      sfx(s, 'item');
      say(s, ch.id, 'Ein schwerer Sandsack. Ungefähr so schwer wie … ein goldenes Idol?');
    }
  }

  function move(s, dir) {
    const ch = active(s);
    if (!ready(s, ch)) return false;
    ch.dir = dir;
    const [dx, dy] = DIRV[dir];
    const x = ch.x + dx, y = ch.y + dy, t = tileAt(s, x, y);
    if (t === 'wall' || t === 'void') return false;
    const objs = objsAt(s, x, y);

    const block = objs.find((o) => o.type === 'block');
    if (block) {
      if (ch.id === 'ben') return push(s, ch, block, dx, dy);
      say(s, ch.id, ch.id === 'mia' ? 'Der Block rührt sich keinen Millimeter. Ben ist der Starke von uns!' : 'Uff! Viel zu schwer. Ben, kannst du mal?');
      return false;
    }
    const rubble = objs.find((o) => o.type === 'rubble');
    if (rubble) {
      if (ch.id === 'ben') { smash(s, ch, rubble); return true; }
      say(s, ch.id, 'Geröll versperrt den Weg. Ben könnte es mit seinen Muskeln zertrümmern!');
      return false;
    }
    const door = objs.find((o) => o.type === 'door' && !o.open);
    if (door) {
      if (door.lock === 'key') {
        if (s.inv.key > 0) { unlock(s, ch, door); return true; }
        say(s, ch.id, 'Eine Tür aus Kristall – mit einem Schlüsselloch. Wir brauchen einen Schlüssel.');
      } else {
        say(s, ch.id, door.hint || 'Das Tor ist verschlossen. Irgendwo muss es einen Mechanismus geben.');
      }
      return false;
    }
    if (objs.some((o) => SOLID[o.type])) return false;
    const other = charAt(s, x, y, ch);
    if (other) { say(s, ch.id, NAMES[other.id] + ' steht mir im Weg.'); return false; }
    if (t === 'pit' && !bridgeOpen(s, x, y)) {
      say(s, ch.id, ch.id === 'lea'
        ? 'Ein Abgrund! Über schmale Gruben kann ich mit der Leertaste springen.'
        : ch.id === 'mia'
          ? 'Ein tiefer Abgrund! Vielleicht gibt es etwas, woran sich meine Peitsche festhalten kann …'
          : 'Da geht es tief runter! Vielleicht kann ich die Grube mit einem Steinblock füllen.');
      return false;
    }
    if (t === 'cracked' && !(ch.id === 'lea' && ch.sprint)) {
      say(s, ch.id, ch.id === 'ben'
        ? 'Der Boden ist total morsch! Für mich viel zu gefährlich – ich bin zu schwer.'
        : ch.id === 'mia'
          ? 'Der Boden knackt bedrohlich … Ich bin zu langsam. Lea könnte drüber sprinten!'
          : 'Brüchiger Boden! Wenn ich sprinte (Shift), bin ich drüber, bevor er einbricht.');
      return false;
    }
    const dur = ch.id === 'lea' && ch.sprint ? SPEED.sprint : ch.id === 'ben' ? SPEED.ben : SPEED.walk;
    stepTo(s, ch, x, y, dur, 'walk');
    sfx(s, t === 'cracked' ? 'crack' : 'step');
    return true;
  }

  function push(s, ch, block, dx, dy) {
    const bx = block.x + dx, by = block.y + dy, t = tileAt(s, bx, by);
    const blocked = t === 'wall' || t === 'void' || t === 'cracked' || t === 'spikes' ||
      s.objects.some((o) => o.x === bx && o.y === by && o !== block &&
        (SOLID[o.type] || ITEMS[o.type] || o.type === 'hook' || (o.type === 'door' && !o.open))) ||
      charAt(s, bx, by);
    if (blocked) { say(s, 'ben', 'Hnngh! Der Block bewegt sich nicht – da ist etwas im Weg.'); return false; }
    const ox = block.x, oy = block.y;
    if (t === 'pit' && !bridgeOpen(s, bx, by)) {
      removeObj(s, block);
      s.tiles[by][bx] = 'filled';
      fx(s, 'fallblock', bx, by);
      fx(s, 'dust', bx, by);
      sfx(s, 'thud');
      shake(s, 7);
      say(s, 'ben', 'RUMMS! Der Block steckt in der Grube. Jetzt kommen alle rüber!');
    } else {
      block.fromX = ox; block.fromY = oy;
      block.x = bx; block.y = by;
      block.t = SPEED.push; block.dur = SPEED.push;
      sfx(s, 'push');
    }
    stepTo(s, ch, ox, oy, SPEED.push, 'push');
    return true;
  }

  function smash(s, ch, rub) {
    removeObj(s, rub);
    busy(ch, 0.35, 'smash');
    fx(s, 'dust', rub.x, rub.y);
    fx(s, 'rocks', rub.x, rub.y);
    sfx(s, 'smash');
    shake(s, 6);
    say(s, 'ben', 'HAU-RUCK! Weg mit dem Geröll!');
  }

  function unlock(s, ch, door) {
    s.inv.key--;
    door.open = true;
    door.unlocked = true;
    door.t = 0.5;
    busy(ch, 0.3, 'use');
    fx(s, 'sparkle', door.x, door.y);
    sfx(s, 'door');
    say(s, ch.id, 'Der Kristallschlüssel passt! Klick – die Tür ist offen.');
  }

  function hurt(s, c) {
    let x = c.safeX, y = c.safeY;
    if (charAt(s, x, y, c)) {
      for (const [dx, dy] of DIRV) {
        const nx = x + dx, ny = y + dy;
        if (canEnter(s, nx, ny, c) && tileAt(s, nx, ny) !== 'spikes') { x = nx; y = ny; break; }
      }
    }
    fx(s, 'hurt', c.x, c.y);
    c.px = c.x; c.py = c.y; c.x = x; c.y = y;
    c.t = 0.3; c.dur = 0.3; c.kind = 'hurt'; c.hurtT = 1.2;
    sfx(s, 'hurt');
    shake(s, 5);
    say(s, c.id, c.id === 'lea'
      ? 'Autsch! Ich muss warten, bis die Stacheln unten sind – und dann im Sprint durch!'
      : 'Autsch! Ich bin zu langsam für die Stacheln. Das schafft nur Lea im Sprint.');
  }

  // ---------------------------------------------------------------- Fähigkeiten
  function jump(s) {
    const ch = active(s);
    if (!ready(s, ch)) return false;
    if (ch.id !== 'lea') {
      say(s, ch.id, ch.id === 'ben'
        ? 'Springen? Ich bin doch kein Gummiball! Das kann Lea viel besser.'
        : 'Da rüberspringen? Nee – das ist Leas Spezialität.');
      return false;
    }
    const [dx, dy] = DIRV[ch.dir];
    const x1 = ch.x + dx, y1 = ch.y + dy, x2 = ch.x + 2 * dx, y2 = ch.y + 2 * dy;
    const t1 = tileAt(s, x1, y1);
    if (t1 === 'wall' || t1 === 'void' || blockedByObj(s, x1, y1) || charAt(s, x1, y1, ch)) {
      say(s, 'lea', 'Da ist etwas im Weg – darüber komme ich nicht.');
      return false;
    }
    if (canEnter(s, x2, y2, ch)) { stepTo(s, ch, x2, y2, SPEED.jump, 'jump'); sfx(s, 'jump'); return true; }
    if (canEnter(s, x1, y1, ch)) { stepTo(s, ch, x1, y1, SPEED.jump * 0.75, 'jump'); sfx(s, 'jump'); return true; }
    say(s, 'lea', 'Zu weit! Dort drüben kann ich nicht landen.');
    return false;
  }

  function toggleSprint(s) {
    const ch = active(s);
    if (ch.id !== 'lea') {
      say(s, ch.id, ch.id === 'ben' ? 'Sprinten? Ich bin eher der gemütliche Typ. Frag Lea!' : 'So schnell wie Lea bin ich nicht.');
      return false;
    }
    ch.sprint = !ch.sprint;
    sfx(s, ch.sprint ? 'sprint' : 'click');
    say(s, 'lea', ch.sprint ? 'Sprint an! Jetzt bin ich superschnell.' : 'Sprint aus – ganz gemütlich.');
    return true;
  }

  function whip(s) {
    const ch = active(s);
    if (!ready(s, ch)) return false;
    if (ch.id !== 'mia') {
      say(s, ch.id, ch.id === 'ben' ? 'Die Peitsche? Die hat Mia immer dabei.' : 'Mit der Peitsche kann nur Mia umgehen.');
      return false;
    }
    const [dx, dy] = DIRV[ch.dir];
    sfx(s, 'whip');
    const stopAt = (i, msg) => {
      fx(s, 'whip', ch.x, ch.y, { tx: ch.x + dx * i, ty: ch.y + dy * i });
      busy(ch, 0.3, 'whip');
      if (msg) say(s, 'mia', msg);
    };
    for (let i = 1; i <= 4; i++) {
      const x = ch.x + dx * i, y = ch.y + dy * i, t = tileAt(s, x, y);
      const objs = objsAt(s, x, y);
      if (t === 'wall' || t === 'void' || objs.some((o) => o.type === 'door' && !o.open)) {
        stopAt(i - 0.5, 'Die Peitsche knallt gegen die Wand.');
        return false;
      }
      const hook = objs.find((o) => o.type === 'hook');
      if (hook) {
        fx(s, 'whip', ch.x, ch.y, { tx: x, ty: y, hook: true });
        return swing(s, ch, i, dx, dy, hook);
      }
      const lever = objs.find((o) => o.type === 'lever');
      if (lever) { stopAt(i); pullLever(s, lever, ch); return true; }
      const item = objs.find((o) => ITEMS[o.type]);
      if (item) { stopAt(i); collect(s, item, ch); return true; }
      if (objs.some((o) => SOLID[o.type]) || charAt(s, x, y, ch)) {
        stopAt(i, 'Knall! Da bewegt sich nichts.');
        return false;
      }
    }
    stopAt(4, 'Die Peitsche knallt ins Leere. Ich brauche etwas zum Festhalten – oder einen Hebel.');
    return false;
  }

  function swing(s, ch, i, dx, dy, hook) {
    for (let j = i + 1; j <= i + 3; j++) {
      const x = ch.x + dx * j, y = ch.y + dy * j, t = tileAt(s, x, y);
      if (t === 'wall' || t === 'void') break;
      if (canEnter(s, x, y, ch)) {
        ch.hookX = hook.x; ch.hookY = hook.y;
        stepTo(s, ch, x, y, SPEED.swing, 'swing');
        sfx(s, 'swing');
        if (!s.flags.swung) { s.flags.swung = true; say(s, 'mia', 'Juhuuu! Wie im Film!'); }
        return true;
      }
    }
    busy(ch, 0.3, 'whip');
    say(s, 'mia', 'Die Peitsche hält – aber drüben ist kein Platz zum Landen.');
    return false;
  }

  function pullLever(s, lv, ch) {
    lv.on = !lv.on;
    lv.t = 0.25;
    sfx(s, 'lever');
    const L = level(s);
    if (L.onLever) L.onLever(api(s), lv, ch);
  }

  // ---------------------------------------------------------------- Benutzen
  function interactTarget(s, x, y) {
    return s.objects.find((o) => o.x === x && o.y === y &&
      (INTERACTIVE[o.type] || (o.type === 'door' && !o.open && o.lock)));
  }
  function findInteract(s, dirOpt) {
    const ch = active(s);
    const dirs = dirOpt !== undefined ? [dirOpt] : [ch.dir, (ch.dir + 1) % 4, (ch.dir + 3) % 4, (ch.dir + 2) % 4];
    for (const d of dirs) {
      const [dx, dy] = DIRV[d];
      const o = interactTarget(s, ch.x + dx, ch.y + dy);
      if (o) return { o, dir: d };
    }
    return null;
  }

  function interact(s, dirOpt) {
    const ch = active(s);
    if (!ready(s, ch)) return false;
    const f = findInteract(s, dirOpt);
    if (!f) {
      if (dirOpt !== undefined) ch.dir = dirOpt;
      say(s, ch.id, 'Hier gibt es nichts zu benutzen.');
      return false;
    }
    ch.dir = f.dir;
    useObj(s, ch, f.o);
    return true;
  }

  function useObj(s, ch, o) {
    const L = level(s);
    if (L.onInteract && L.onInteract(api(s), o, ch)) { busy(ch, 0.25, 'use'); return; }
    switch (o.type) {
      case 'inscr':
        if (ch.id === 'mia') {
          emit(s, { type: 'read', title: o.title, text: o.text });
          sfx(s, 'read');
          s.flags['read_' + o.uid] = true;
        } else {
          say(s, ch.id, ch.id === 'ben'
            ? 'Krakel, Kringel, Schlangenlinien … Das kann nur Mia lesen.'
            : 'Uralte Schriftzeichen! Mia kann die bestimmt entziffern.');
        }
        break;
      case 'dial':
        o.val = (o.val + 1) % 4;
        o.t = 0.3;
        busy(ch, 0.2, 'use');
        sfx(s, 'dial');
        fx(s, 'label', o.x, o.y, { text: AC.DIAL_SETS[o.set][o.val] });
        break;
      case 'lever':
        busy(ch, 0.25, 'use');
        pullLever(s, o, ch);
        break;
      case 'rubble':
        if (ch.id === 'ben') smash(s, ch, o);
        else say(s, ch.id, 'Geröll versperrt den Weg. Ben könnte es mit seinen Muskeln zertrümmern!');
        break;
      case 'block':
        say(s, ch.id, ch.id === 'ben'
          ? 'Ich muss nur dagegen laufen, dann schiebe ich ihn.'
          : 'Viel zu schwer für mich. Das ist ein Job für Ben!');
        break;
      case 'door':
        if (s.inv.key > 0) unlock(s, ch, o);
        else say(s, ch.id, 'Eine Tür aus Kristall – mit einem Schlüsselloch. Wir brauchen einen Schlüssel.');
        break;
      case 'pedestal':
        say(s, ch.id, 'Ein steinerner Sockel.');
        break;
      default:
        break;
    }
  }

  function face(s, dir) { const ch = active(s); if (ready(s, ch)) ch.dir = dir; }

  function switchTo(s, i) {
    if (i < 0 || i > 2 || i === s.active) return false;
    s.active = i;
    sfx(s, 'switch');
    return true;
  }

  // ---------------------------------------------------------------- Update
  function update(s, dt) {
    if (s.failed) return;
    s.time += dt;
    for (const c of s.chars) {
      if (c.t > 0) { c.t = Math.max(0, c.t - dt); if (c.t === 0) c.kind = 'idle'; }
      if (c.hurtT > 0) c.hurtT = Math.max(0, c.hurtT - dt);
    }
    for (const o of s.objects) if (o.t > 0) o.t = Math.max(0, o.t - dt);

    const L = level(s);
    if (L.spikes) {
      const per = L.spikes.down + L.spikes.up;
      const up = s.spikesEnabled && (s.time % per) >= L.spikes.down;
      if (up !== s.spikesUp) {
        s.spikesUp = up;
        if (nearSpikes(s)) sfx(s, up ? 'spikesUp' : 'spikesDown');
      }
    }
    if (s.spikesUp) {
      for (const c of s.chars) {
        if (tileAt(s, c.x, c.y) === 'spikes' && !(c.kind === 'jump' && c.t > 0)) hurt(s, c);
      }
    }
    for (const o of s.objects) {
      if (o.type !== 'plate') continue;
      const d = plateDown(s, o);
      if (d !== o.down) { o.down = d; sfx(s, 'plate'); }
    }
    runLogic(s);

    if (s.timer !== null && !s.complete) {
      s.timer -= dt;
      if (s.timer <= 0) {
        s.timer = 0;
        s.failed = true;
        sfx(s, 'fail');
        emit(s, { type: 'fail' });
        return;
      }
    }
    if (!s.complete && s.chars.every((c) => tileAt(s, c.x, c.y) === 'exit' && c.t === 0)) {
      s.complete = true;
      sfx(s, 'win');
      emit(s, { type: 'complete' });
    }
  }

  function nearSpikes(s) {
    const ch = active(s);
    return s.spikeList.some(([x, y]) => Math.abs(x - ch.x) + Math.abs(y - ch.y) <= 10);
  }

  // ---------------------------------------------------------------- Wegsuche
  function bfs(s, ch, goal, allowSpikes) {
    const key = (x, y) => y * s.w + x;
    const prev = new Map();
    prev.set(key(ch.x, ch.y), null);
    const q = [[ch.x, ch.y]];
    if (goal(ch.x, ch.y)) return { path: [], x: ch.x, y: ch.y };
    while (q.length) {
      const [x, y] = q.shift();
      for (let d = 0; d < 4; d++) {
        const nx = x + DIRV[d][0], ny = y + DIRV[d][1], k = key(nx, ny);
        if (prev.has(k)) continue;
        if (!canEnter(s, nx, ny, ch)) continue;
        if (!allowSpikes && tileAt(s, nx, ny) === 'spikes') continue;
        prev.set(k, [x, y, d]);
        if (goal(nx, ny)) {
          const path = [];
          let cur = [nx, ny];
          let p = prev.get(key(cur[0], cur[1]));
          while (p) { path.unshift(p[2]); cur = [p[0], p[1]]; p = prev.get(key(cur[0], cur[1])); }
          return { path, x: nx, y: ny };
        }
        q.push([nx, ny]);
      }
    }
    return null;
  }

  function findPath(s, ch, tx, ty) {
    const goal = (x, y) => x === tx && y === ty;
    const r = bfs(s, ch, goal, false) || bfs(s, ch, goal, true);
    return r ? r.path : null;
  }

  function findPathAdjacent(s, ch, tx, ty) {
    const goal = (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1;
    const r = bfs(s, ch, goal, false) || bfs(s, ch, goal, true);
    if (!r) return null;
    const dir = DIRV.findIndex(([dx, dy]) => r.x + dx === tx && r.y + dy === ty);
    return { path: r.path, dir };
  }

  AC.CHAR_DEFS = CHAR_DEFS;
  AC.NAMES = NAMES;
  AC.Engine = {
    DIRV, ORDER, SPEED,
    loadScene, update, snapshot, restore,
    move, interact, jump, whip, toggleSprint, face, switchTo,
    findPath, findPathAdjacent, findInteract, interactTarget,
    tileAt, objsAt, objAt, charAt, canEnter, plateDown, active,
    say: (s, text) => say(s, active(s).id, text),
  };
})();
