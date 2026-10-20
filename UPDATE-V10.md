# Feindschaft V10 – Fotos, Preise, Sprachen und Handy-Mitteilungen

Dieses Paket aktualisiert deine vorhandene Website. Es enthält keine Konten, Passwörter, Datenbank oder privaten Uploads. Die Version im HTML ist 10, die Paketversion 1.7.0.

## So lädst du das Update hoch

1. Feindschaft-V10.zip herunterladen und entpacken.
2. Dein bestehendes GitHub-Repository h8z42vgjzy-beep/lima öffnen.
3. Die entpackten Dateien aktualisieren: die .mjs-Dateien und package.json ins Hauptverzeichnis; den Ordner public mit seinem Inhalt ebenfalls übernehmen. ZIP nicht als ZIP ins Repository legen: Render entpackt sie nicht automatisch.
4. Bestehende gleichnamige Dateien ersetzen. Dateien nicht umbenennen. Die Beschreibung des Commits darf „Feindschaft V10“ heißen.
5. Bei Render deinen bestehenden Service lima verwenden, keinen neuen Service anlegen. Build Command: yarn. Start Command: yarn start. So wird auch die Abhängigkeit web-push installiert.
6. Deine bestehende Disk und F_DATA_DIR behalten. Keine Datenbank ersetzen und keine Disk löschen. Dieses Update verändert deinen gebuchten Speicherplan nicht.
7. Warten, bis Render „Your service is live“ anzeigt. Dann alle alten App-Fenster und Website-Tabs schließen und die Website neu öffnen.

Die Website unterstützt weiterhin den früheren, flachen Upload ohne public-Unterordner. Wenn beide Varianten im Repository liegen, wird die vollständige Variante mit der höheren f-release-Nummer verwendet. Lade die zusammengehörenden Dateien immer vollständig hoch, besonders translations.js und i18n.js.

## Preise in virtuellen Beleidigungen

| Aktion | Kosten |
| --- | ---: |
| Private Textnachricht lesen | 0 |
| Private Textnachricht senden | 5 |
| Foto im Chat senden | 20 |
| Chat-Foto öffnen | 0 |
| Chat-Anfrage senden | 200 |
| Spiel erstellen | 5 |
| Spieleinladung annehmen | 5 |
| Spielzüge | 0 |
| Kategorie erstellen | 0 |
| Foto im Feed hochladen | Kategorienpreis |
| Foto im Feed erstmals öffnen | Kategorienpreis |
| Musik/Video hochladen | 0 |

Text plus Foto sind zwei Sendungen und kosten zusammen 25. Der Senden-Knopf zeigt die Summe. Fehlendes Guthaben führt zur Ablehnung, Lesen bucht nie Punkte ab. Doppelte Wiederholungen derselben Text-/Foto-Sendung mit derselben Sende-ID werden nicht erneut berechnet.

Die bisherigen Kategorienpreise werden für neue Fotos verzehnfacht; neue Kategorien erlauben 10 bis 1000. Bereits gespeicherte Fotos behalten ihren bisherigen Preis und vorhandene Freischaltungen. Die Hälfte des tatsächlich bezahlten Öffnungspreises geht an die hochladende Person. Es gibt keine Echtgeldzahlung.

## Zwei Fotoarten im Feed

Beim Foto-Upload ist eine Kategorie erforderlich. Zusätzlich wird die Foto-Sichtbarkeit gewählt:

- **Einmal pro Person, 20 Sekunden:** Jeder andere Account bekommt genau ein eigenes Zeitfenster. Danach wird der erneute Abruf serverseitig abgewiesen. Das Öffnen durch eine Person nimmt anderen nicht ihre Ansicht weg. Die hochladende Person kann ihr eigenes Foto weiter sehen.
- **Dauerhaft:** Kein automatischer Ablauf nach sieben Tagen und kein Löschen beim Speicher-Reset. Nach einmaligem Bezahlen bleibt das Foto für die betreffende Person freigeschaltet, bis es manuell gelöscht wird.

Normale Feed-Beiträge und Chat-Fotos werden nach sieben Tagen unzugänglich. Temporäre Bilddateien werden spätestens nach 28 Tagen beim Wartungslauf aus dem aktiven System entfernt. Sicherungen des Hosters können länger bestehen. Die 20 Sekunden begrenzen die Anzeige und den Serverzugriff; sie bedeuten keine sofortige physische Löschung der Datei.

Beim 85-Prozent-Reset bleiben dauerhafte Fotos und geschützte gemeldete Medien erhalten. Wenn diese geschützten Inhalte den verfügbaren Platz belegen, werden neue Uploads abgewiesen. Sie werden nicht heimlich gelöscht, um Platz zu schaffen.

## Screenshots: was tatsächlich möglich ist

Eine Website bzw. installierte Web-App kann Betriebssystem-Screenshots und Bildschirmaufnahmen nicht zuverlässig sperren oder erkennen. Deshalb gibt es keine erfundenen Screenshot-Meldungen. Beim geöffneten Foto erscheint ein Wasserzeichen mit dem Namen der betrachtenden Person und der Uhrzeit; Ziehen und das normale Kontextmenü werden erschwert. Externe Aufnahmen oder technisch versierte Kopien bleiben möglich. Normales Melden und Blockieren bleibt verfügbar.

## Push auf dem Handy testen

1. Auf dem iPhone/iPad mindestens iOS/iPadOS 16.4 verwenden. Feindschaft in Safari öffnen, Teilen → Zum Home-Bildschirm hinzufügen. Anschließend über dieses App-Symbol starten. Ein normaler Safari-Tab reicht auf diesen Geräten für Web-Push nicht.
2. Anmelden, unter der Hauptnavigation **Einstellungen** öffnen. Die gewünschten Benachrichtigungsarten aktivieren.
3. **Push auf diesem Gerät aktivieren** antippen und die Systemfrage erlauben. Falls früher etwas nicht funktionierte, lässt sich mit diesem Knopf die Geräteanmeldung erneuern.
4. Den Gerätestatus prüfen. **Test-Mitteilung senden** antippen. Eine Annahme durch den Versanddienst ist noch keine Garantie dafür, dass das Betriebssystem ein Banner gezeigt hat.
5. In den iPhone-Einstellungen unter Mitteilungen die Feindschaft-App kontrollieren: Mitteilungen erlauben, Sperrbildschirm und Banner aktivieren. Auch Fokus/Nicht stören und eine geplante Mitteilungsübersicht prüfen.
6. Für den entscheidenden Test die App schließen bzw. das Handy sperren. Mit einem zweiten Konto eine Nachricht, eine Antwort, eine Spieleinladung oder einen Schachzug auslösen. Die passende Mitteilungsart muss im empfangenden Konto eingeschaltet sein.

Auf Android die installierte App bzw. den unterstützten Browser ebenfalls für Benachrichtigungen freigeben und die Systemeinstellungen kontrollieren.

Wenn nur die Hinweise innerhalb der App funktionieren: Screenshot des neuen Gerätestatus senden, dazu Handy-Modell, Betriebssystemversion und ob die App über das Home-Bildschirm-Symbol gestartet wurde. Keine privaten Schlüssel oder Passwörter senden.

Quelle zu iPhone-Web-Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

## Sprache, Farben und Entdeckungen

Die Sprache wird pro Konto gespeichert: Deutsch, Englisch, Russisch oder Ukrainisch. Die Übersetzung wurde auf ältere Menüs, Dialoge, Formulare, Spielbedienung und Fehlermeldungen erweitert. Eigene Beiträge, Namen, Nachrichten und hochgeladene Medien werden nicht maschinell übersetzt. Die Markennamen Feindschaft und Beleidigungen bleiben bestehen.

Vier Farbvarianten stehen in Einstellungen zur Verfügung: Nachtblüte, Pride, Waldgrün und Eisblau. Bewegungseffekte lassen sich dort abschalten.

Es gibt jetzt acht aufeinanderfolgende Kapitel mit je drei Entdeckungen. Je abgeschlossenem Kapitel gibt es einmalig 20 Beleidigungen, insgesamt maximal 160. Bestehender Fortschritt bleibt erhalten; frühere Kapitel werden nicht erneut ausgezahlt.

## Prüfung dieses Pakets

- Syntaxprüfung bestanden.
- 59 automatisierte Tests bestanden: einschließlich Zugriffsschutz, serverseitiger Fotoablauf, Preisaufteilung, Gebühren, Wiederholungen, dauerhafte Fotos beim Reset, Moderation, Schach, Dino, Musik und Sprachwechsel.
- Push-Versand, Fehlerstatus und Gerätezuordnung wurden mit einem kontrollierten Test-Versanddienst geprüft. Der echte iPhone-Sperrbildschirm konnte hier nicht getestet werden.
- Eine echte Safari-/iPhone-Sichtprüfung bleibt nach dem Deployment erforderlich. Ein angenommener Test-Push bestätigt den Versand, nicht seine sichtbare Zustellung.
