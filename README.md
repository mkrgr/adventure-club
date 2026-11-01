# Adventure Club – Das Geheimnis des goldenen Idols

Isometrisches Browser-Rätselspiel: Mia, Ben und Lea vom „Adventure Club“ erkunden Tempel, Pyramiden und Höhlen.
Jede Szene enthält Rätsel, die nur gemeinsam lösbar sind; man steuert immer eines der drei Kinder und kann jederzeit wechseln.

## Starten

`index.html` direkt im Browser öffnen – kein Build, keine Abhängigkeiten (Schriften kommen optional von Google Fonts).

## Figuren

| Kind | Fähigkeiten |
|------|-------------|
| **Mia** – Die Gelehrte | Inschriften lesen (`E`), Peitsche (`Q`, 4 Felder): Hebel/Gegenstände über Abgründe ziehen, an Holzpfählen hinüberschwingen |
| **Ben** – Der Starke | Steinblöcke schieben (auch in Gruben), Geröll zertrümmern, schwere Metallplatten drücken |
| **Lea** – Die Akrobatin | Springen (`Leertaste`) über 1 Feld breite Gruben, Sprint (`Shift`) über brüchigen Boden und durch Stachelfallen |

## Steuerung

`WASD`/Pfeile oder Mausklick laufen · `E` benutzen · `TAB`/`1-3` Figur wechseln · `H` Hinweis · `R` Szene neu · `M` Ton · Mausrad Zoom · `Esc` Hilfe

## Kapitel

1. Das Tor des Dschungeltempels – Symbolscheiben, Geröll, Block in die Grube
2. Die Pyramide des Sonnenkönigs – Druckplatten, Hebelrätsel, Sprint über morschen Boden, Peitsche über den Abgrund
3. Die Kristallhöhle – dunkle Höhle, Sokoban-Gruben, Kristallscheiben, Schlüssel per Peitsche, Stachelgang
4. Der Schrein des goldenen Idols – drei Wächterplatten gleichzeitig, Sandsack-Tausch, Flucht vor dem Einsturz

## Aufbau

- `js/levels.js` – Szenen als ASCII-Karten + Logik (leicht erweiterbar)
- `js/engine.js` – reine Spiellogik ohne DOM
- `js/render.js` – isometrischer Canvas-Renderer, alle Grafiken prozedural
- `js/audio.js` – synthetische Soundeffekte (Web Audio)
- `js/main.js` – Eingabe, Oberfläche, Spielstand (localStorage)

## Tests

```
node tests/solve.test.js     # spielt alle Szenen automatisch durch (Lösbarkeit)
node tests/render.smoke.js   # Renderer ohne Laufzeitfehler
node tests/ui.smoke.js       # Titel → Kapitel → Eingaben
```
