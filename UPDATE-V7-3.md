# Update 7.3 – lesbare Schachfiguren und mobile Bedienung

Eigene SVG-Figuren ersetzen die systemabhängigen Schach-Schriftzeichen. Die Farben sind fest: cremeweiß mit dunkler Kontur und dunkel mit heller Kontur. Alle sechs Figurentypen haben eigene Silhouetten.

Die zuletzt beendete Schachpartie bleibt mit Endbrett und Ergebnis sichtbar, auch wenn daneben ein Kurzspiel läuft. Eine neue Schacheinladung ersetzt diese Ergebnisansicht. Die Zugregeln bleiben unverändert.

Auf kleinen Bildschirmen füllt der Chat das Fenster. Kleinere Rahmen geben dem Brett mehr Platz. Navigation, Chat- und Feed-Schaltflächen haben größere Tippflächen; Formularschrift ist auf dem Handy mindestens 16 Pixel groß.

## Installation
1. ZIP entpacken.
2. Den gesamten Inhalt mit public-Ordner in das GitHub-Repository lima hochladen und vorhandene Dateien ersetzen.
3. Commit-Nachricht: Schachfiguren, Ergebnisanzeige und mobile Bedienung.
4. Den erfolgreichen Render-Deploy abwarten.
5. Die Seite neu laden. public/index.html enthält jetzt f-release 7.3.

Bestehende Render-Disk und F_DATA_DIR unverändert lassen. Im Paket sind keine Konten oder Datenbanken enthalten.

Automatische Tests prüfen Spielregeln, Figurenfarben und das erhaltene Endbrett. Eine echte Safari-Darstellungsprüfung war hier nicht möglich. Bitte nach dem Deployment das Brett auf dem Handy öffnen und eine beendete Partie ansehen.
