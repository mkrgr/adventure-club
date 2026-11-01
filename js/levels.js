// Adventure Club – Szenen / Level-Definitionen
// Kartenlegende (Basis):
//   #  Wand            .  Boden          _  Grube          %  brüchiger Boden
//   ^  Stachelfalle    E  Ausgang        B  Steinblock     r  Geröll
//   G  Edelstein       K  Kristallschlüssel  S  Sandsack   H  Holzpfahl über Grube
//   m/b/l  Startpunkt von Mia / Ben / Lea
// Szenenspezifische Zeichen werden in `legend` definiert.
var AC = globalThis.AC = globalThis.AC || {};
(function () {
  'use strict';
  const W = (n) => '#'.repeat(n);

  AC.DIAL_SETS = {
    glyph: ['Sonne', 'Mond', 'Schlange', 'Auge'],
    crystal: ['Rot', 'Grün', 'Blau', 'Gelb'],
  };

  AC.LEVELS = [
    // ------------------------------------------------------------------ 1
    {
      id: 'dschungel',
      title: 'Das Tor des Dschungeltempels',
      theme: 'jungle',
      story: 'Tief im Regenwald hat der Adventure Club den verschollenen Tempel von Xal-Tun entdeckt. ' +
        'Seit tausend Jahren hat ihn niemand betreten. Mia, Ben und Lea stehen vor einem gewaltigen Steintor …',
      dialog: [
        ['mia', 'Da ist er! Der verschollene Tempel von Xal-Tun – genau wie auf Opas alter Karte!'],
        ['ben', 'Und das Tor ist zu. Typisch.'],
        ['lea', 'Dann finden wir eben heraus, wie man es aufkriegt!'],
        ['tip', 'Laufen: WASD / Pfeiltasten oder Mausklick · Benutzen: E · Figur wechseln: TAB oder 1/2/3 · Hinweis: H'],
      ],
      outro: 'Hinter dem Tor führt eine endlose Treppe in die Tiefe. Ganz unten liegt eine Karte aus Leder – ' +
        'sie zeigt eine Pyramide weit im Osten, mitten in der Wüste …',
      map: [
        '###############',
        '#.....#.....#G#',
        '#.m...#......_#',
        '#.b.I.a.......#',
        '#.l...#...B...#',
        '#.....#.......#',
        '#.123.####r####',
        '#######.......#',
        '#######.......#',
        '#######_______#',
        '#######.......#',
        '#######..EEE..#',
        '###############',
      ],
      legend: {
        a: { t: 'floor', o: { type: 'door', id: 'a', msg: ['mia', 'Schlange, Sonne, Auge – das Tor öffnet sich! Los, hinein!'] } },
        I: { t: 'floor', o: { type: 'inscr', title: 'Die Inschrift am Tempeltor',
          text: '„Nur wer die Zeichen ehrt, darf eintreten.\n\nDie erste Scheibe trägt die Schlange, die im Schatten wacht.\n' +
            'Die zweite trägt die Sonne, die den Tag gebiert.\nDie dritte trägt das Auge, das alles sieht.“' } },
        1: { t: 'floor', o: { type: 'dial', id: 'd1', set: 'glyph', label: 'I', val: 1 } },
        2: { t: 'floor', o: { type: 'dial', id: 'd2', set: 'glyph', label: 'II', val: 1 } },
        3: { t: 'floor', o: { type: 'dial', id: 'd3', set: 'glyph', label: 'III', val: 1 } },
      },
      lights: [[3, 0, 'torch'], [9, 0, 'torch'], [6, 5, 'torch'], [14, 8, 'torch'], [6, 10, 'torch']],
      hints: [
        'Mia kann die Inschrift auf der Steinsäule lesen. Geh mit Mia hin und drücke E.',
        'Dreh die drei Steinscheiben mit E, bis sie zur Inschrift passen: I = Schlange, II = Sonne, III = Auge.',
        'Hinter dem Tor versperrt Geröll den Weg nach Süden. Ben kann es zertrümmern – lauf mit ihm einfach dagegen.',
        'Ben kann den Steinblock nach Süden bis in die Grube schieben. Dann können alle hinüber.',
        'Lea kann über schmale Gruben springen (Leertaste). In der Ecke oben rechts funkelt ein Edelstein!',
        'Alle drei Kinder müssen auf den goldenen Ausgangsfeldern stehen.',
      ],
      logic(api) {
        api.door('a', api.dial('d1') === 2 && api.dial('d2') === 0 && api.dial('d3') === 3, true);
      },
    },

    // ------------------------------------------------------------------ 2
    {
      id: 'pyramide',
      title: 'Die Pyramide des Sonnenkönigs',
      theme: 'pyramid',
      story: 'Die Lederkarte führte den Adventure Club mitten in die Wüste – zur Pyramide des Sonnenkönigs. ' +
        'Ihre heißen Gänge sind voller Druckplatten, Hebel und uralter Fallen.',
      dialog: [
        ['ben', 'Puh, ist das heiß hier drin.'],
        ['lea', 'Seht mal – Druckplatten im Boden!'],
        ['mia', 'Und ein Steinblock. Ben, das ist dein Job!'],
      ],
      outro: 'In der Grabkammer des Sonnenkönigs finden die drei eine Steintafel. Sie beschreibt eine Höhle voller ' +
        'leuchtender Kristalle – den geheimen Weg zum goldenen Idol!',
      map: [
        '###################',
        '#......#.4.5.6.####',
        '#.B..1.#.......####',
        '#.m....#......I####',
        '#.b....a.......####',
        '#.l..2.#.......####',
        '#......#.......####',
        '#########.###.#####',
        '#########%###.#####',
        '#########%###=#####',
        '#########%###=#####',
        '#########%###.___z#',
        '#######...###x#####',
        '#######Gk.##...####',
        '###########.EEE.###',
        '###################',
      ],
      legend: {
        a: { t: 'floor', o: { type: 'door', id: 'a', msg: ['lea', 'Das Tor ist offen! Schnell durch – solange beide Platten gedrückt sind!'],
          hint: 'Das Tor bewegt sich nicht. Vielleicht haben die Druckplatten etwas damit zu tun?' } },
        1: { t: 'floor', o: { type: 'plate', id: 'p1' } },
        2: { t: 'floor', o: { type: 'plate', id: 'p2' } },
        4: { t: 'floor', o: { type: 'lever', id: 'l1', label: 'I' } },
        5: { t: 'floor', o: { type: 'lever', id: 'l2', label: 'II' } },
        6: { t: 'floor', o: { type: 'lever', id: 'l3', label: 'III' } },
        I: { t: 'floor', o: { type: 'inscr', title: 'Die Hebel des Sonnenkönigs',
          text: '„Drei Hebel bewachen das Tor des Sonnenkönigs.\nDer erste bringt Pfeile, der zweite bringt Staub.\n' +
            'Nur der dritte – der aufgehenden Sonne am nächsten – hält das Tor für immer offen.“\n\n' +
            'Darunter, kleiner eingeritzt:\n„Über den morschen Boden kommt nur, wer schneller ist als der Fall.\n' +
            'Und das letzte Tor öffnet sich nur dem, der über den Abgrund hinweg greift.“' } },
        '=': { t: 'pit', o: { type: 'bridge', id: 'br' } },
        k: { t: 'floor', o: { type: 'lever', id: 'k' } },
        x: { t: 'floor', o: { type: 'door', id: 'x', hint: 'Ein schweres Tor. Der Hebel dafür muss hier irgendwo sein …' } },
        z: { t: 'floor', o: { type: 'lever', id: 'z' } },
      },
      lights: [[4, 0, 'torch'], [11, 0, 'torch'], [7, 2, 'torch'], [15, 3, 'torch'], [10, 12, 'torch'], [16, 14, 'torch'], [18, 10, 'torch']],
      hints: [
        'Ben kann den Steinblock auf eine Druckplatte schieben. Auf die zweite Platte stellt sich ein anderes Kind.',
        'Solange beide Platten gedrückt sind, bleibt das Tor offen. Dahinter gibt es einen Hebel, der es dauerhaft offen hält – Mias Inschrift verrät welchen.',
        'Der dritte Hebel (III, ganz rechts) ist der richtige.',
        'Über den brüchigen Boden im Süden schafft es nur Lea – im Sprint (Shift). Dahinter wartet ein Hebel für eine Brücke.',
        'Mias Peitsche (Q) reicht 4 Felder weit – auch über Abgründe. Stell dich vor die Grube und schau zum Hebel.',
        'Alle drei Kinder müssen auf den goldenen Ausgangsfeldern stehen.',
      ],
      logic(api) {
        if (api.lever('l3')) api.flags.lockA = true;
        api.door('a', (api.pressed('p1') && api.pressed('p2')) || !!api.flags.lockA);
        api.bridge('br', api.lever('k'));
        api.door('x', api.lever('z'), true);
      },
      onLever(api, lv, ch) {
        if (lv.id === 'l1' || lv.id === 'l2') {
          if (lv.on) {
            lv.on = false;
            if (lv.id === 'l1') {
              api.say(ch.id, 'ZISCH! Pfeile sausen aus der Wand – haarscharf vorbei! Das war der falsche Hebel.');
              api.fx('arrows', ch.x, ch.y);
              api.sfx('arrow');
            } else {
              api.say(ch.id, 'Hust, hust! Staub rieselt von der Decke. Der war es wohl auch nicht …');
              api.fx('dust', ch.x, ch.y);
              api.sfx('rumble');
            }
            api.shake(5);
          }
        } else if (lv.id === 'l3') {
          if (!lv.on) { lv.on = true; api.say(ch.id, 'Der Hebel ist fest eingerastet.'); return; }
          api.say(ch.id, 'KLACK! Irgendwo rastet ein Mechanismus ein. Das Tor bleibt jetzt für immer offen!');
        } else if (lv.id === 'k') {
          api.say(ch.id, lv.on ? 'Rrrratter! Irgendwo schiebt sich eine Holzbrücke über eine Grube!' : 'Die Brücke zieht sich wieder zurück.');
        } else if (lv.id === 'z' && lv.on) {
          api.say(ch.id, 'Treffer! Das große Tor zum Ausgang öffnet sich!');
        }
      },
    },

    // ------------------------------------------------------------------ 3
    {
      id: 'hoehle',
      title: 'Die Kristallhöhle',
      theme: 'cave',
      story: 'Tief unter der Erde leuchten Kristalle in allen Farben. Hier unten ist es stockdunkel – ' +
        'nur die Laternen der Kinder und das Glimmen der Steine weisen den Weg. Bleibt zusammen!',
      dialog: [
        ['lea', 'Wow … die Kristalle leuchten ja richtig!'],
        ['ben', 'Ich seh trotzdem kaum was. Bleibt dicht bei mir.'],
        ['mia', 'Da vorne versperrt Geröll den Weg. Ben?'],
      ],
      outro: 'Hinter der Kristallhöhle öffnet sich ein gewaltiger Schacht. Ganz unten glimmt goldenes Licht: ' +
        'der Schrein des goldenen Idols!',
      spikes: { down: 1.5, up: 1.0 },
      map: [
        W(35),
        '#....#.....#G' + W(22),
        '#.m..r......_' + W(22),
        '#.b..#.......' + W(22),
        '#.l..#.......' + W(22),
        '######...B.B.' + W(22),
        '######.......' + W(22),
        '######.......' + W(22),
        '#########.###' + W(22),
        '#########_###' + W(22),
        '#########_###' + W(17) + '...s#',
        '######.......#.....' + W(11) + '....#',
        '######.......h......' + '^'.repeat(8) + '.k....#',
        '######I......#.....' + W(11) + '....#',
        '######.......#_____' + W(11) + '.EEE#',
        '######..123..#_____' + W(16),
        W(14) + '__K__' + W(16),
        W(35),
      ],
      legend: {
        h: { t: 'floor', o: { type: 'door', id: 'h', msg: ['mia', 'Die Kristalle glühen auf – das Tor gleitet zur Seite!'],
          hint: 'Ein Tor aus Kristall. Es reagiert bestimmt auf die drei Kristallscheiben.' } },
        k: { t: 'floor', o: { type: 'door', id: 'k', lock: 'key' } },
        s: { t: 'floor', o: { type: 'lever', id: 's' } },
        I: { t: 'floor', o: { type: 'inscr', title: 'Die Kristallworte',
          text: '„Im Herzen des Berges schlafen drei Kristalle.\nWecke zuerst das Blut der Erde,\ndann das Wasser des Himmels\n' +
            'und zuletzt das Gras der Täler.“\n\nDarunter, kleiner eingeritzt:\n„Die Stacheln des Ostens ruhen nie lange. ' +
            'Nur die Schnellsten kommen hindurch – und wer den Schlüssel trägt, kann sie für immer schlafen legen.“' } },
        1: { t: 'floor', o: { type: 'dial', id: 'd1', set: 'crystal', label: 'I', val: 3 } },
        2: { t: 'floor', o: { type: 'dial', id: 'd2', set: 'crystal', label: 'II', val: 3 } },
        3: { t: 'floor', o: { type: 'dial', id: 'd3', set: 'crystal', label: 'III', val: 3 } },
      },
      lights: [[5, 6, 'crystal', '#66ccff'], [7, 0, 'crystal', '#cc66ff'], [13, 14, 'crystal', '#66ffcc'],
        [5, 13, 'crystal', '#ff66cc'], [19, 14, 'crystal', '#66ccff'], [19, 10, 'crystal', '#ffcc66'],
        [34, 12, 'crystal', '#66ffcc'], [24, 11, 'crystal', '#cc66ff'], [10, 8, 'crystal', '#66ccff'], [3, 0, 'crystal', '#ffcc66']],
      hints: [
        'Ben kann das Geröll zertrümmern – einfach dagegen laufen.',
        'Schiebe beide Blöcke nacheinander in die Gruben im Gang nach Süden. Zuerst den linken Block!',
        'Den rechten Block musst du erst nach links in die Reihe des Gangs schieben – dann nach Süden.',
        'Mia kann die Inschrift lesen: Rot – Blau – Grün.',
        'Den Kristallschlüssel hinter dem Abgrund holt Mia mit der Peitsche (Q). Stell dich genau davor und schau hin.',
        'Die Stacheln im Gang sind nur kurz unten. Lea schafft es im Sprint (Shift) – warte, bis sie versinken!',
        'Hinter der Kristalltür schaltet ein Hebel die Stacheln ab. Dann können alle zum Ausgang.',
      ],
      logic(api) {
        api.door('h', api.dial('d1') === 0 && api.dial('d2') === 2 && api.dial('d3') === 1, true);
        api.setSpikes(!api.lever('s'));
      },
      onLever(api, lv, ch) {
        if (lv.id === 's') {
          if (!lv.on) { lv.on = true; return; }
          api.say(ch.id, 'Die Stacheln versinken mit einem Knirschen im Boden. Jetzt können alle durch!');
        }
      },
    },

    // ------------------------------------------------------------------ 4
    {
      id: 'schrein',
      title: 'Der Schrein des goldenen Idols',
      theme: 'shrine',
      story: 'Der Schrein des goldenen Idols! Drei Wächterplatten, ein uralter Fluch – und der größte Schatz des Dschungels. ' +
        'Nur wenn alle drei Kinder zusammenarbeiten, öffnet sich das Heiligtum.',
      dialog: [
        ['mia', 'Das ist er … der Schrein des goldenen Idols!'],
        ['ben', 'Drei Platten – und eine Inschrift. Mia?'],
        ['lea', 'Holen wir uns das Idol, bevor es jemand anders tut!'],
      ],
      outro: '',
      timerSeconds: 45,
      map: [
        W(22),
        '#######G......########',
        '#######...P...########',
        '#######.......########',
        '#######.......########',
        '##########s###########',
        '######.I.......#######',
        '######.........#######',
        '##1._..........._H_.2#',
        '######..m.b.l..#######',
        '##3..r.........#######',
        '##.S.#.........#######',
        '##########x###########',
        '##########.###########',
        '#########EEE##########',
        W(22),
      ],
      legend: {
        1: { t: 'floor', o: { type: 'plate', id: 'p1' } },
        2: { t: 'floor', o: { type: 'plate', id: 'p2' } },
        3: { t: 'floor', o: { type: 'plate', id: 'p3', heavy: true } },
        P: { t: 'floor', o: { type: 'pedestal' } },
        s: { t: 'floor', o: { type: 'door', id: 's', hint: 'Das Schreintor. Es öffnet sich nur, wenn alle drei Wächterplatten gleichzeitig gedrückt sind.' } },
        x: { t: 'floor', o: { type: 'door', id: 'x', hint: 'Der Ausgang ist versiegelt. Erst müssen wir das Idol holen.' } },
        I: { t: 'floor', o: { type: 'inscr', title: 'Das Gesetz des Sonnengottes',
          text: '„Hier ruht das goldene Herz des Sonnengottes.\n\nDrei Wächter müssen gleichzeitig ruhen:\n' +
            'der Springer im Westen,\nder Schwingende im Osten\nund der Schwere im Süden.\n\n' +
            'Wer das Herz nimmt, gebe dem Gott Gleiches an Gewicht –\nsonst stürzt der Himmel ein.“' } },
      },
      lights: [[8, 0, 'torch'], [12, 0, 'torch'], [6, 3, 'torch'], [14, 3, 'torch'], [5, 6, 'torch'], [15, 6, 'torch'],
        [9, 12, 'torch'], [11, 12, 'torch'], [1, 10, 'torch'], [21, 8, 'torch'], [0, 8, 'torch']],
      hints: [
        'Drei Druckplatten müssen gleichzeitig gedrückt werden – jedes Kind braucht dafür seine Spezialfähigkeit.',
        'Westen: Lea springt über die Grube (Leertaste). Osten: Mia schwingt sich am Holzpfahl hinüber (Q, Blick zum Pfahl).',
        'Süden: Die schwere Platte kann nur Ben herunterdrücken – vorher das Geröll zertrümmern.',
        'Für das Idol brauchst du ein Gegengewicht. In Bens Kammer liegt ein Sandsack.',
        'Nach dem Tausch bleibt nur wenig Zeit: Alle drei schnell zum Ausgang im Süden!',
      ],
      logic(api) {
        if (!api.flags.shrine && api.pressed('p1') && api.pressed('p2') && api.pressed('p3')) {
          api.flags.shrine = true;
          api.say('mia', 'Alle drei Platten gleichzeitig! Hört ihr das Grollen? Das Schreintor geht auf!');
          api.shake(8);
        }
        api.door('s', !!api.flags.shrine);
        api.door('x', !!api.flags.idol);
      },
      onInteract(api, obj, ch) {
        if (obj.type !== 'pedestal') return false;
        if (!obj.hasIdol) {
          api.say(ch.id, 'Der Sandsack liegt auf dem Sockel. Nichts wie raus hier!');
          return true;
        }
        if (api.inv.sandbag > 0) {
          api.checkpoint();
          obj.hasIdol = false;
          obj.hasBag = true;
          api.inv.sandbag--;
          api.inv.idol = 1;
          api.flags.idol = true;
          api.startTimer(AC.LEVELS[3].timerSeconds);
          api.sfx('rumble');
          api.shake(12);
          api.fx('sparkle', obj.x, obj.y);
          api.say(ch.id, 'Geschafft – das goldene Idol! … Oh nein, der Tempel bebt! ALLE RAUS HIER!');
        } else {
          api.say(ch.id, 'Halt! Der Sockel klickt gefährlich, sobald ich das Idol anhebe. Wir brauchen ein Gegengewicht – genauso schwer wie das Idol.');
        }
        return true;
      },
    },
  ];
})();
