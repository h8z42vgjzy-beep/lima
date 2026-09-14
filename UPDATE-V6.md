# Update 6 – Dino-Spezialeffekte und Seitengeheimnisse

Dieses Paket ergänzt die bereits hochgeladene Version 5. Es wurde noch nicht in dein GitHub- oder Render-Konto hochgeladen.

## Neue Dino-Effekte

- Impulse und Partikel beim gemeinsamen Countdown
- Staub und Tasteneffekt bei jedem gültigen Sprung
- Geschwindigkeitslinien während des Laufs
- gelber „KNAPP!“-Effekt, wenn der eigene Dino dicht über einem Kaktus landet
- steigende „KNAPP ×2“, „×3“ usw. für mehrere knappe Sprünge in Folge
- Pixel, Farbe und kurze Erschütterung bei einem Zusammenstoß
- Konfetti bei Sieg oder Gleichstand
- sichtbare Live-Anzeige und ein kräftigeres Spielfeld

Die Effekte verändern die Spielregeln nicht. Sprünge, Zusammenstöße und Gewinner werden weiterhin vom Server bestimmt. Bei aktivierter Systemeinstellung „Bewegung reduzieren“ werden starke dekorative Bewegungen abgeschaltet.

## Vier Seiteneffekte zum Entdecken

Auf der Startseite verstecken sich vier kleine Effekte. Nach dem ersten Fund erscheint unten ein unauffälliger Zähler `✦ 1/4`. Dort kann man die bereits gefundenen Namen ansehen. Der Fortschritt wird ausschließlich im jeweiligen Browser gespeichert, hat keinen Geld- oder Guthabenwert und wird nicht an den Server geschickt.

Außerdem gibt es jetzt eine schmale Scrollanzeige am oberen Fensterrand und eine kurze Lichtwelle beim Antippen von Schaltflächen. Diese beiden Effekte zählen nicht zu den vier Geheimnissen.

## Hochladen

1. Das Update-Archiv aus dieser Chat-Unterhaltung herunterladen und entpacken.
2. Im bestehenden GitHub-Projekt `lima` **Add file → Upload files** öffnen.
3. Den kompletten Inhalt des entpackten Ordners hochladen. Den Ordner `public` vollständig mitnehmen und vorhandene Dateien ersetzen.
4. Als Commit-Nachricht beispielsweise `Dino-Effekte und Seitengeheimnisse` eintragen und direkt auf `main` speichern.
5. Im Render-Service `lima` das automatische Deployment abwarten. Falls keines beginnt: **Manual Deploy → Deploy latest commit**.
6. Nach einem erfolgreichen Deployment die Seite mit **⌘ + Umschalt + R** neu laden.

Neu hinzugekommen sind insbesondere `public/discovery-effects.js`, `effects.test.mjs` und diese Anleitung. Der Dateiname `server.mjs`, der bestehende Wert von `F_DATA_DIR` und die Render-Disk dürfen nicht geändert werden. Das Paket enthält keine Datenbank, Konten, Sitzungen oder Nutzeruploads.

## Prüfung

Die bestehende Mehrnutzer-, Foto-, Musik- und Dino-Testreihe bleibt erhalten. Neue Prüfungen kontrollieren, dass alle Effektdateien ausgeliefert werden, der Modus „Bewegung reduzieren“ berücksichtigt wird, die vier Entdeckungen keine API-/Guthabenbuchung auslösen und der Browser keinen Gewinner festlegt.

Eine echte visuelle Prüfung in Safari ist in der Erstellungsumgebung weiterhin nicht möglich. Deshalb sollten nach dem Deployment besonders ein Dino-Sprung, ein knapper Sprung, ein Spielende sowie die Darstellung auf dem Smartphone ausprobiert werden.
