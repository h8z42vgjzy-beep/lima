# Feindschaft 9 – Benachrichtigungen und Entdeckungen

## Enthalten
- Konto-Einstellungen und Übersicht für ungelesene Benachrichtigungen.
- Hinweise bei Antworten auf eigene Kommentare, privaten Texten/Fotos, Spieleinladungen und Schach-Aktionen (Zug, Annahme, Aufgabe/Spielende).
- Standard-Web-Push für geschlossene Apps, nach ausdrücklicher Gerätefreigabe.
- Jede Hinweisart sowie alle Hinweise gemeinsam abschaltbar; Push zusätzlich pro Gerät abschaltbar. Kein privater Nachrichtentext in Push-Vorschauen.
- Vier aufeinanderfolgende Entdeckungskapitel mit jeweils drei Funden, 20 Beleidigungen und einem Kapitelabzeichen. Insgesamt 12 Funde und maximal 80 Beleidigungen pro Konto. Kein täglicher Reset, keine Serienpflicht. Weitere Kapitel sind noch nicht enthalten.
- Fortschritt und Auszahlung serverseitig, kontogebunden und einmalig. Wiederholtes Tippen vergibt keine zusätzlichen Punkte.
- Neue Chatblasen, farbige Akzente, gut erreichbare Bedienelemente und ausschaltbare Bewegungseffekte.
- Neue Einstellungen, Benachrichtigungsübersicht und Entdeckungen auf Deutsch, Englisch, Russisch und Ukrainisch. Die vollständige Übersetzung der bisherigen Website ist noch offen; bisherige Formulare, Spieltexte und Fehlermeldungen bleiben teilweise Deutsch. Beiträge werden nicht automatisch übersetzt.

## Hochladen
1. ZIP herunterladen und entpacken. Die ZIP-Datei selbst NICHT bei GitHub hochladen.
2. In deinem bestehenden Repository `h8z42vgjzy-beep/lima` die enthaltenen Dateien aktualisieren. `server.mjs`, `activity.mjs`, `package.json` und die anderen .mjs-Dateien liegen im Hauptordner. Der Ordner `public` mit seinen Dateien bleibt `public`.
3. Änderungen speichern/committen. Render startet das Deployment. Build Command bleibt `yarn`, Start Command bleibt `yarn start`. Die neue Abhängigkeit web-push wird dabei installiert.
4. Bestehende Render-Umgebungsvariablen und die Disk /var/data beibehalten. Keine Datenbank hochladen, löschen oder ersetzen. Dieses Paket enthält keine Nutzerdaten.
5. Auf „Your service is live“ warten. Alle offenen Feindschaft-Tabs und App-Fenster schließen und neu öffnen, damit der neue Service Worker übernehmen kann.
6. Anmelden. Unterhalb der Hauptnavigation erscheinen „Benachrichtigungen“, „Einstellungen“ und „Entdeckungen“.

## Push aktivieren
- iPhone/iPad: ab iOS/iPadOS 16.4, Feindschaft zuerst zum Home-Bildschirm hinzufügen und über dieses Symbol öffnen. In Einstellungen „Push auf diesem Gerät aktivieren“ antippen und die Systemfrage erlauben.
- Auf jedem Gerät einmal aktivieren. Ein Konto kann bis zu zehn Geräte registrieren.
- Android/Desktop: Push-fähigen Browser verwenden und die Erlaubnis erteilen.
- Die App muss Internetzugang haben. Betriebssystem-Fokus, deaktivierte Systemmitteilungen und Energiesparregeln können Hinweise verzögern oder unterdrücken.
- Bei Abmeldung werden die Push-Geräte dieser Sitzung entfernt. Bei erneuter Anmeldung Push wieder aktivieren. Abgelaufene Sitzungen erhalten keine weiteren Pushs.
- Kein neuer bezahlter Dienst nötig. Die VAPID-Schlüssel werden beim ersten Serverstart mit installierter Bibliothek einmal erzeugt und im bestehenden Datenverzeichnis als push-vapid.json gespeichert. Diese Datei nicht öffentlich hochladen und beim Umzug beibehalten. Optional kann F_PUSH_SUBJECT auf eine eigene öffentliche Kontakt-URL oder mailto-Adresse gesetzt werden.
- Wenn die Oberfläche „Push ... noch nicht bereit“ zeigt: Render-Build auf Installation von web-push prüfen; package.json aus dem Paket muss hochgeladen sein.

## Test zu zweit
1. Beide Personen melden sich auf getrennten Geräten an. Beide aktivieren Push und erlauben Benachrichtigungen.
2. Person A schließt die App. Person B schreibt eine private Nachricht. A soll eine Systemmitteilung erhalten. Antippen öffnet nach Anmeldung den passenden Chat.
3. Mit Antwort auf A's Feed-Kommentar, Spieleinladung und Schachzug wiederholen. Antworten auf eigene Kommentare erzeugen keine Selbstbenachrichtigung.
4. A schaltet private Nachrichten in Einstellungen aus. Eine neue Nachricht von B darf keinen neuen Hinweis erzeugen. Bereits empfangene Systemmeldungen können weiterhin in der Mitteilungszentrale stehen.
5. Bei Blockierung werden keine neuen Hinweise zwischen den betroffenen Konten erzeugt.
6. Entdeckungen öffnen. Nach den ersten drei Funden gibt es +20 Beleidigungen, ein Abzeichen und Kapitel 2. Wiederholte Funde zahlen nichts aus. Fortschritt bleibt nach erneutem Anmelden bestehen.

## Prüfstand
53 automatisierte Tests bestanden, darunter Empfängertrennung, Leseberechtigungen, Abschalten, Blockierung, Entdeckungskapitel und doppelte Auszahlung. Push-Warteschlange mit Test-Versender auf Wiederholungen, Fehler und ungültige Abonnements geprüft. Syntaxprüfungen bestanden.
Echter Push-Versand über Apple/Google/Mozilla konnte hier nicht geprüft werden: der Download der Bibliothek ist in der Arbeitsumgebung gesperrt. Kein echter iPhone-/Safari- oder visueller Browsertest in dieser Umgebung. Deshalb zuerst den obigen Test zu zweit durchführen. Bei Push-Fehlern bleibt die Benachrichtigungsübersicht verfügbar.

Quellen für Web-Push:
https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
https://github.com/web-push-libs/web-push
