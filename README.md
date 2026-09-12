# F — Feindschaft. Aber mit Blumen.

Eine responsive Website für humorvolle Sprüche und freiwillige Wortduelle. Gestaltung in gedämpftem Anthrazit, verwaschenem Rosé und grauem Salbei, mit selbst gezeichneten SVG-Blumenfiguren. Die Website enthält keine fremden Markenbilder und lädt keine externen Schriftarten oder Tracker.

## Enthalten

- Registrierung und Anmeldung mit Spitzname und Passwort
- Serverseitige Sitzungen und mit scrypt gesalzene Passwort-Hashes
- Gemeinsamer Feed, Kategorien und Sortierung nach Zeit oder Blumen
- Eigene Sprüche veröffentlichen und löschen
- Likes und Dislikes auf Sprüche und Kommentare; eine Bewertung pro Konto und Ziel
- Virtuelle Währung „Beleidigungen“: täglich einmal 300 Punkte abholen (Kalendertag Europe/Berlin)
- Pro erhaltenem Like +2, pro erhaltenem Dislike −5; Änderungen und Rücknahmen wirken auf den aktuellen Punktestand
- Noch keine Ausgaben, kein Geldwert, keine Käufe; ein negativer Punktestand erzeugt keine Geldschuld
- Freiwillige Angaben zu Geschlecht, Queer-Identität und Orientierung; privat voreingestellt und jederzeit änderbar
- Profilansichten für andere angemeldete Personen zeigen nur freigegebene Identitätsangaben
- Anklickbare Ranglisten: Beliebt (Likes minus Dislikes), Meistgelikt und Diskutiert (Antworten in den letzten 24 Stunden)
- Antworten auf Sprüche und verschachtelte Antworten auf Kommentare
- Persönliche Chats erst nach angenommener Anfrage
- Gegenseitiger Zugriffsschutz und Blockierungen
- Einzelne Beiträge ausblenden und Profile wieder entblockieren
- Feindschaft Plus: sieben kostenlose Tage, Profilabzeichen und Spruchsammlung
- Automatisches Ende der Probephase, keine Zahlungsanbindung oder Abbuchungen

Die fünf Beispielprofile und ihre Beispiel-Likes sind in der Oberfläche markiert. Diese Profile sind keine echten Nutzer, können sich nicht anmelden und können keine Chat-Anfragen annehmen. Neue Konten, Beiträge und Interaktionen werden in der Serverversion gemeinsam auf dem Server gespeichert. Die HTML-Vorschau simuliert die Funktionen ausschließlich lokal.

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

Die Tests verwenden eine eigene temporäre Datenbank und getrennte Sitzungen. Sie prüfen Anmeldung, fehlende Zustimmung, doppelte Namen, falsche Passwörter, Rechte für Beiträge, Blumen, Antworten, Plus, private Nachrichten, fehlendes Einverständnis, fremden Zugriff, Blockierungen, Ausblenden und Abmelden.

Die JavaScript-Dateien wurden syntaktisch geprüft und die Funktionstests sind bestanden. Eine visuelle Browserprüfung konnte in der Erstellungsumgebung nicht durchgeführt werden, da kein verfügbarer Browser vorhanden war. Die responsive Darstellung sollte vor einer Veröffentlichung auf echten Mobilgeräten geprüft werden.

## Aktueller Betriebsstand

Diese Lieferung ist eine private Testversion mit funktionierendem Backend. Die verwaltete Vorschau wurde gestartet; eine dauerhafte externe Veröffentlichung oder eigene Domain wurde nicht eingerichtet. Die private Vorschau ist kein dauerhaftes Hosting und keine garantierte Datensicherung.

Die App besitzt selbst noch kein Einladungs- oder Betreiber-Administrationssystem. Die Zugriffsbeschränkung der privaten Vorschau liegt bei der Vorschauumgebung. Bevor dieselbe App auf einem Server betrieben wird, muss ein privater Zugang vorgeschaltet werden, wenn sie weiterhin nur für eine geschlossene Testrunde bestimmt ist.

Für einen öffentlichen Start sind insbesondere ein dauerhaftes HTTPS-Hosting mit persistentem Datenverzeichnis und Backups, eine Kontowiederherstellung und Kontolöschung, betreute Moderation und eine zum tatsächlichen Betreiber passende Datenschutz- und Anbieterinformation zu ergänzen. Bezahlte Abonnements sind bewusst noch nicht implementiert, da keine Preise oder Zahlungsanbieter festgelegt wurden.

Nachrichten sind durch serverseitige Zugriffsrechte geschützt, aber nicht Ende-zu-Ende-verschlüsselt. Nutze für die Testversion Spitznamen, ein separates Testpasswort und keine vertraulichen Inhalte. Im Archiv befinden sich keine Nutzerdaten, Sitzungen oder Passwörter.


## Offline-Vorschau erzeugen

```sh
node scripts/build-preview.mjs
```

Die erzeugte `feindschaft-v2.html` enthält alle Grafiken, Styles und Skripte und lässt sich direkt in Safari öffnen. Sie stellt keine Netzwerkverbindungen her. Die Vorschau bietet keine echten Benutzerkonten, Nachrichten oder Zahlungen. Freiwillige Identitätsangaben können zum Testen frei erfunden werden.

Im Punktekasten gibt es einen ausdrücklich beschrifteten Demo-Bereich für eingehende Bewertungen. Nach einem eigenen Testspruch kann eine erfundene Person simuliert werden, deren Bewertung zwischen Like, Dislike und keiner Bewertung wechselt. Es wird keine echte Nutzeraktivität vorgetäuscht.

Die erweiterten Tests prüfen auch gleichzeitige Tagesabholungen, ersetzte und zurückgenommene Bewertungen, Minuspunkte, Kommentare mit Elternkommentar, falsche Kommentarzuordnungen sowie die Sichtbarkeit freiwilliger Identitätsangaben. Die Ranglisten berücksichtigen in der aktuellen Testversion die letzten 200 für die betrachtende Person sichtbaren Sprüche und bis zu 300 sichtbare Kommentare je Spruch. Beim Löschen eines Spruchs fallen auch dessen Bewertungen und die Punkte aus den zugehörigen Kommentaren weg. Bestehende Konten und Beiträge werden durch additive Datenbankänderungen erhalten.
