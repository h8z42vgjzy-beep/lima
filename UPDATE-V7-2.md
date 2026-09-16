# Update 7.2 – richtige Schachfiguren und eindeutige Zugauswahl

Dieses vollständige Paket enthält den Größenfehler-Fix aus Update 7.1 und behebt zusätzlich die Figurendarstellung und Bedienung.

## Behoben

- Weiße und schwarze Figuren behalten jetzt unabhängig von der Feldfarbe ihre eindeutige Farbe.
- Die Anfangsstellung entspricht der normalen Schachaufstellung: Damen auf d1/d8, Könige auf e1/e8 und alle übrigen Figuren auf ihren richtigen Feldern.
- Beim eigenen Zug liefert der Server nur die tatsächlich erlaubten Zugziele.
- Nach Auswahl einer eigenen beweglichen Figur werden gültige leere Zielfelder mit einem grünen Punkt markiert.
- Mögliche Schlagfelder erhalten einen grünen Ring.
- Figuren ohne möglichen Zug können nicht scheinbar ausgewählt werden.
- Wird eine andere eigene Figur angetippt, wechselt die Auswahl direkt zu dieser Figur.
- Ungültige Zielfelder werden nicht an den Server geschickt.
- Der Server prüft weiterhin jeden ausgeführten Zug und entscheidet über Schach, Schachmatt und Patt.

## Bestehende Partien

Die Datenbankstruktur und gespeicherten Brettpositionen werden nicht gelöscht. Eine bereits laufende Partie kann nach dem Deployment weitergespielt werden.

## Hochladen

1. `feindschaft-update-v7-2.zip` herunterladen und entpacken.
2. Bei GitHub im Repository `lima` **Add file → Upload files** wählen.
3. Alle entpackten Dateien und den Ordner `public` hochladen und bestehende Dateien ersetzen.
4. Commit-Nachricht: `Schachfiguren und Zugauswahl korrigieren`.
5. Direkt auf `main` speichern.
6. Render automatisch bereitstellen lassen oder **Manual Deploy → Deploy latest commit** anklicken.
7. Danach den Safari-Tab schließen und neu öffnen, damit die neue CSS- und JavaScript-Version geladen wird.
