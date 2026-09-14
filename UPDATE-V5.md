# Update 5 – Dino-Duell, Musikplayer und mehr Bewegung

Das Update ist als fertiges Code-Paket vorbereitet. Es wurde noch nicht in dein GitHub- oder Render-Konto hochgeladen. Grundlage ist die hier vorhandene Version 4; ein aktueller Abgleich mit GitHub war nicht möglich.

## Was du bekommst

- **Dino-Duell live zu zweit:** Im angenommenen Einzelchat auf „Spiele“ tippen, „Dino-Duell · live“ auswählen und die Einladung annehmen. Beide öffnen den Chat. Sobald beide verbunden sind, startet ein gemeinsamer Countdown. Tippen, Leertaste oder Pfeil hoch lässt den eigenen Dino springen. Beide bekommen dieselbe Strecke. Die Runde dauert höchstens 60 Sekunden; wer zuerst einen Kaktus berührt, verliert. Ein gleichzeitiger Zusammenstoß ist unentschieden. Alles ist kostenlos und verändert kein Guthaben.
- **Eine neue Dino-Version:** Deine ursprüngliche Dino-Datei war in den verfügbaren Anhängen nicht enthalten. Dieser Browser-Dino wurde deshalb neu erstellt. Für die genaue Übernahme deines alten Spiels brauche ich dessen Datei erneut.
- **Musik ohne Neustart bei Feed-Aktualisierungen:** Ein fester Player unten auf der Seite hält die Wiedergabe beim Scrollen, Filtern, Liken und Öffnen von Chats aufrecht. Mit Pause, Abspielposition, erneutem Laden und Beenden. Bei kurzzeitigen Netzwerkfehlern versucht er bis zu zweimal, an derselben Stelle weiterzuspielen. Bewusstes Pausieren oder Abmelden verhindert einen automatischen Neustart.
- **Musikdateien werden vor dem Upload geprüft:** Unterstützte Dateiendungen sind MP3, M4A, OGG und WAV, maximal 25 MB. Unlesbare Dateien erhalten eine Fehlermeldung. Formatunterstützung hängt vom Browser und vom tatsächlichen Codec ab; eine automatische Konvertierung ist nicht enthalten. Bei Problemen dieselbe eigene Aufnahme als MP3 oder M4A mit AAC exportieren.
- **Foto-Preise sind direkt sichtbar:** Die Kategorie bestimmt den Preis für einen neuen Foto-Upload und die einmalige Freischaltung. Der Anteil der hochladenden Person steht im Upload-Hinweis, am Foto und im Kaufdialog. Die Buchungsliste zeigt Ausgaben und Einnahmen. Es werden keine pauschalen zehn Punkte für alle Fotos angesetzt.
- **Mehr Bewegung:** Dunkles Violett, grüne Akzente, schwebende Blumen, neue Einstiege für Dino, Musik und Clips, animierte Schallplatten und Reaktionen auf Likes. Die Einstellung „Bewegung reduzieren“ wird für dekorative Animationen berücksichtigt.

Die bisherigen Funktionen aus Update 4 sind ebenfalls dabei: verpflichtende Kategorieauswahl, kostenlose Chat-Fotos, drei weitere Einzelchatspiele, Extras, Meldungen und Blockierungen.

## Dein Beispiel mit 100 Beleidigungen

| Vorgang für ein neues Foto in einer Kategorie mit Preis 100 | Auswirkung |
| --- | --- |
| Du lädst das Foto hoch | Bei dir −100 |
| Eine andere Person schaltet es frei | Bei dieser Person −100 |
| Dein Anteil an dieser Freischaltung | Bei dir +50 |
| Dieselbe Person öffnet das Foto erneut | Keine neue Zahlung |
| Eine weitere Person schaltet es frei | Bei dieser Person −100; bei dir +50 |

Eine neue Kategorie anzulegen bleibt kostenlos. Der Kategorienpreis kann zwischen 1 und 100 liegen. Bei einem Preis von 10 erhältst du entsprechend 5; bei 100 erhältst du 50. Es ist immer die Hälfte des Öffnungspreises, der bei neuen Fotos dem Uploadpreis entspricht.

Bereits veröffentlichte Fotos behalten ihren gespeicherten Preis. Eine spätere Änderung der Kategorie verteuert alte Fotos nicht rückwirkend. Alte Freischaltungen bleiben erhalten; vergangene Uploads werden nicht nachträglich belastet. Die volle 50-%-Buchung wird bei neuen Freischaltungen verwendet, einschließlich halber Punkte.

## So lädst du das Update hoch

1. `feindschaft-update-v5.zip` herunterladen und auf deinem Mac entpacken. Die ZIP selbst wird nicht bei GitHub hochgeladen.
2. Dein vorhandenes [GitHub-Projekt lima](https://github.com/h8z42vgjzy-beep/lima) öffnen. Auf **Add file → Upload files** gehen.
3. Den gesamten Inhalt des entpackten Ordners in das Upload-Feld ziehen, einschließlich des vollständigen Ordners **public**. Die neuen Servermodule müssen mit hochgeladen werden. Falls du selbst weiteren Code geändert hast, diese Änderungen vor dem Ersetzen mit dem Paket vergleichen.
4. Vor dem Speichern prüfen, dass **server.mjs** weiterhin genau diesen Dateinamen trägt. Als Beschreibung im Feld **Commit message** beispielsweise `Dino live, Musikplayer und Design aktualisiert` eintragen. Die Änderung auf dem verwendeten Branch `main` speichern.
5. Im [Render-Dashboard](https://dashboard.render.com) deinen vorhandenen Service **lima** öffnen. Das automatische Deployment abwarten. Falls keines startet: **Manual Deploy → Deploy latest commit**.
6. Build-Befehl `yarn` und Start-Befehl `yarn start` können so bleiben. Es werden keine neuen npm-Pakete benötigt. Node.js 24 bleibt erforderlich. Wenn du bereits einen Build mit Tests verwendest, muss der Ordner `public` mit hochgeladen werden.
7. Sobald der neue Commit erfolgreich läuft, die Website neu laden; am Mac gegebenenfalls **⌘ + Umschalt + R**.

Die Aufteilung im entpackten Paket:

| Oberste Ebene | Ordner public |
| --- | --- |
| server.mjs | index.html |
| games.mjs | app.js |
| dino.mjs | features.js |
| extras.mjs | music-player.js |
| media-validation.mjs | dino-client.js |
| package.json | action.css |
| README.md, UPDATE-V4.md, UPDATE-V5.md | style.css, night.css, features.css |
| tests.mjs, regression.test.mjs, games.test.mjs | favicon.svg |
| frontend.test.mjs, music.test.mjs, dino.test.mjs | |

Den bereits verwendeten Wert von **F_DATA_DIR** und die vorhandene Render-Disk beibehalten. Sonst könnte die App eine neue, leere Datenbank anlegen. Das Paket enthält keine Datenbank, Benutzerpasswörter, Sitzungen oder hochgeladenen Nutzerdateien. Es ändert weder dein gebuchtes Speicherpaket noch die Größe der Disk.

## Nach dem Hochladen ausprobieren

Mit zwei getrennten Konten einen freigegebenen Chat öffnen, zum Dino-Duell einladen und gemeinsam starten. Für Musik eine eigene Aufnahme abspielen und währenddessen einen Like vergeben sowie zwischen „Für dich“ und „Musik“ wechseln. Für Fotos eine Kategorie mit Preis 100 verwenden: Nach Upload, Freischaltung und erneutem Öffnen die Buchungen beider Konten prüfen.

## Was geprüft wurde und welche Grenzen bleiben

Die automatisierten Tests prüfen die API mit getrennten Sitzungen und temporären Datenbanken, echte Musik-/Bilddatei-Antworten, Byte-Bereiche beim Vorspulen, die 100/50-Abrechnung, doppelte Käufe, Kategorien, Chats und Blockierungen. Zwei gleichzeitig geöffnete Live-Verbindungen prüfen den Dino-Countdown, gleichzeitige Sprünge und Zugriffsentzug nach dem Blockieren. Zusätzliche Tests prüfen Musik-Neustarts, Abspielposition, manuelles Pausieren und begrenzte Wiederholungen nach Fehlern.

Eine echte Browser- und Hörprüfung in Safari konnte in der Erstellungsumgebung nicht durchgeführt werden. Automatisierte Player-Tests verwenden ein simuliertes Audioelement. Unterbrechungen durch das Betriebssystem, einen gesperrten Bildschirm, sehr langsame Verbindungen oder nicht unterstützte Codecs lassen sich damit nicht ausschließen. Eine Lastprüfung mit vielen gleichzeitigen Nutzerinnen und Nutzern wurde nicht durchgeführt.

Der Live-Dino benötigt eine offene Verbindung beider Chatpersonen zu diesem einen Node-Server. Bei Verbindungsverlust gibt es kurz Gelegenheit zur Wiederverbindung; die Runde kann ansonsten abbrechen. Nach einem Serverneustart wird eine laufende Dino-Runde beendet und muss neu gestartet werden. Die Spielregeln und Ergebnisse werden vom Server bestimmt; es gibt keinen Punkte-Einsatz.

Bei gleichzeitigen Datei-Uploads verarbeitet der Server zunächst einen Upload. Weitere Uploads erhalten eine verständliche Wiederholungsaufforderung, damit große Dateien den kleinen Server nicht gemeinsam überlasten. Laufende Chats und Musikabrufe nutzen diese Upload-Begrenzung nicht.

Unverändert bleiben die in [UPDATE-V4.md](UPDATE-V4.md) beschriebenen Grenzen, insbesondere die noch fehlende vollständige Übernahme der früheren Java-Reset-Animation, die fehlende automatische Medienkonvertierung und die nicht garantierte Löschung aus sämtlichen Hosting-Sicherungen. Das Update behauptet nicht, diese Funktionen fertigzustellen.

Technischer Hintergrund zum Player: Das erneute Laden eines HTML-Medienelements setzt dessen Zustand zurück. Deshalb bleibt das Audioelement beim Aktualisieren des Feeds bestehen; `load()` wird nur beim bewussten Wechsel/Beenden bzw. bei einer Wiederherstellung genutzt. [MDN: HTMLMediaElement.load()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load)
