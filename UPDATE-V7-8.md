# Gemeinsamer Reset-Test – Version 7.8

ZIP entpacken. Alle enthaltenen Dateien und den ganzen Ordner public in GitHub hochladen, nicht die ZIP. Mit Commit changes speichern. Nach dem erfolgreichen Render-Deploy alle geöffneten Geräte einmal neu laden.

Test auf zwei Geräten:
1. Website auf beiden Geräten öffnen. Auf einem Gerät als Lima anmelden.
2. Moderation öffnen → Reset auf allen Geräten testen · ohne Löschen.
3. Der Film startet auf beiden Geräten nach etwa drei Sekunden.
4. Während der Film läuft, Website auf einem dritten Gerät öffnen oder ein zweites neu laden: es steigt an der aktuellen Filmstelle ein.
5. Nach dem Ende neu öffnen: kein nachträgliches Abspielen.

Der gemeinsame Test löscht nichts. Er ist nur durch ein Admin-Konto startbar. Er wird auch Gästen auf der geöffneten Website angezeigt. Wenn schon ein Ereignis läuft, wird dieses weiter angezeigt.

Das echte Reset-Ereignis nutzt denselben Ablauf. Gemeldete Inhalte bleiben durch die bisherige Schutzlogik erhalten. Ein inaktiver oder offline Browser erhält das Ereignis beim Wiederverbinden, solange es noch läuft. Ton kann auf Smartphones ein Antippen von Ton an erfordern. Ladezeit und Verbindungsqualität können kleine zeitliche Abweichungen verursachen.

Bestehende Datenbank nicht löschen. Die neue Kennzeichnung von Testereignissen wird automatisch ergänzt. Keine Änderung am Render-Plan nötig.
