# F — Feindschaft. Aber mit Blumen.

Aktueller Stand: **Update 5 / Version 1.2.0**. Die Änderungsübersicht, Prüfungen und Upload-Anleitung stehen in [UPDATE-V5.md](UPDATE-V5.md). Die vorherigen Änderungen sind in [UPDATE-V4.md](UPDATE-V4.md) dokumentiert. Dieses Paket ist noch nicht auf Render veröffentlicht.

Eine responsive Website für humorvolle Sprüche und freiwillige Wortduelle. Dunkle Gestaltung mit violetten und grünen Akzenten, animierten SVG-Blumen und einem Live-Dino-Duell im Chat. Die Website lädt keine externen Schriftarten oder Tracker.

## Enthalten

- Registrierung und Anmeldung mit Spitzname und Passwort
- Serverseitige Sitzungen und mit scrypt gesalzene Passwort-Hashes
- Gemeinsamer Feed, Kategorien und Sortierung nach Zeit oder Blumen
- Eigene Sprüche veröffentlichen und löschen
- Likes und Dislikes auf Sprüche und Kommentare; eine Bewertung pro Konto und Ziel
- Virtuelle Währung „Beleidigungen“: täglich einmal 300 Punkte abholen (Kalendertag Europe/Berlin)
- Pro erhaltenem Like +2, pro erhaltenem Dislike −5; Änderungen und Rücknahmen wirken auf den aktuellen Punktestand
- Foto-Uploads und Foto-Freischaltungen mit virtuellen Punkten, 50-%-Anteil für die hochladende Person und nachvollziehbaren Buchungen; keine echten Geldzahlungen
- Kategorien sind verpflichtend auszuwählen und kostenlos anzulegen
- Chat-Fotos sind kostenlos; einmaliger Zugriff der empfangenden Person für 20 Sekunden
- Vier kostenlose Einzelchatspiele: ein neuer Live-Dino-Lauf, Tic-Tac-Toe, Vier gewinnt und Zahlenduell, jeweils mit Einladung und serverseitigen Regeln
- Fester Musikplayer außerhalb des Feeds, Abspielposition, Pause und Wiederherstellung nach Netzwerkfehlern
- Extras für eigene Texte, Lernmaterialien und Code-Dateien; separate Clips- und Musikfilter
- Meldungen und Moderation mit Zugriff auf den jeweils gemeldeten Inhalt bzw. den Chat der betroffenen beiden Personen
- Freiwillige Angaben zu Geschlecht, Queer-Identität und Orientierung; privat voreingestellt und jederzeit änderbar
- Profilansichten für andere angemeldete Personen zeigen nur freigegebene Identitätsangaben
- Anklickbare Ranglisten: Beliebt (Likes minus Dislikes), Meistgelikt und Diskutiert (Antworten in den letzten 24 Stunden)
- Antworten auf Sprüche und verschachtelte Antworten auf Kommentare
- Persönliche Chats erst nach angenommener Anfrage
- Gegenseitiger Zugriffsschutz und Blockierungen
- Einzelne Beiträge ausblenden und Profile wieder entblockieren
- Feindschaft Plus: sieben kostenlose Tage, Profilabzeichen und Spruchsammlung
- Automatisches Ende der Plus-Probephase; keine Echtgeld-Zahlungsanbindung

Die fünf Beispielprofile und ihre Beispiel-Likes sind in der Oberfläche markiert. Diese Profile sind keine echten Nutzer, können sich nicht anmelden und können keine Chat-Anfragen annehmen. Neue Konten, Beiträge und Interaktionen werden in der Serverversion gemeinsam auf dem Server gespeichert. Diese Version benötigt den Node-Server, nicht nur eine lokal geöffnete HTML-Datei.

## Lokal starten

Voraussetzung: Node.js 24 oder neuer. Es sind keine zusätzlichen Pakete nötig.

```sh
npm start
```

Danach `http://localhost:3000` im Browser öffnen. Ein anderer Port kann mit `PORT=4000 npm start` gewählt werden. Die Datenbank wird beim ersten Start im Verzeichnis `data` angelegt. Dieses Verzeichnis darf für eine dauerhafte Installation nicht flüchtig sein. Mit `F_DATA_DIR` lässt sich ein anderes Datenverzeichnis festlegen.

## Prüfen

```sh
npm test
```

Die Tests verwenden temporäre Datenbanken und getrennte Sitzungen. Sie prüfen Anmeldung, Profile, Kategorien, Foto-Upload, tatsächliche Bildantworten, Kosten, Einnahmen, doppelte Käufe, Fristen, Rechte, Chatspiele, Extras, Moderationszugriffe und UI-Logik. Die Tests verändern keine Nutzerdaten auf deinem laufenden Server.

Die JavaScript-Dateien wurden syntaktisch geprüft und die Funktionstests sind bestanden. Eine visuelle Browserprüfung konnte in der Erstellungsumgebung nicht durchgeführt werden, da kein verfügbarer Browser vorhanden war. Die responsive Darstellung sollte vor einer Veröffentlichung auf echten Mobilgeräten geprüft werden.

## Aktueller Betriebsstand

Diese Lieferung ist ein Update für die bestehende Serverversion mit SQLite. Eine Veröffentlichung des Updates in deinem Render-Konto ist noch nicht erfolgt. Der bisherige dauerhafte Datenpfad muss unverändert bleiben, damit vorhandene Konten und Inhalte weiterverwendet werden.

Das ausgewählte Konto Lima erhält beim Serverstart den Moderationszugriff. Ein technisches Einladungs- oder Zutrittssystem für die gesamte Website ist nicht enthalten. „Testversion“ in der Oberfläche allein schützt eine öffentliche URL nicht vor Zugriffen.

Vor einem breiten öffentlichen Einsatz sind insbesondere Sicherungs- und Löschkonzept, Kontowiederherstellung und Kontolöschung, eine tatsächlich betreute Moderation und passende Betreiber-/Datenschutzinformationen zu vervollständigen. Echte bezahlte Abonnements sind nicht implementiert.

Nachrichten sind durch serverseitige Zugriffsrechte geschützt, aber nicht Ende-zu-Ende-verschlüsselt. Nutze für die Testversion Spitznamen, ein separates Testpasswort und keine vertraulichen Inhalte. Im Archiv befinden sich keine Nutzerdaten, Sitzungen oder Passwörter.


## Hinweise zu vorhandenen Daten

Bestehende Konten und Beiträge werden durch additive Datenbankänderungen erhalten. Vorhandene Foto-Freischaltungen bleiben gültig; alte Uploads werden nicht nachträglich belastet. Bereits gelöschte Bilddateien kann dieses Paket nicht wiederherstellen.

Die Ranglisten berücksichtigen bis zu 200 sichtbare Feed-Beiträge und bis zu 300 sichtbare Kommentare je Beitrag. Beim Löschen eines eigenen Spruchs fallen dessen Bewertungen und die daraus abgeleiteten Punkte weg. Historische Foto-Buchungen bleiben nachvollziehbar.

Die alten Offline-Vorschau-Skripte sind nicht Bestandteil dieses Update-Pakets. Neue Fotos, Buchungen und Spiele sollen mit dem echten lokalen Node-Server getestet werden.
