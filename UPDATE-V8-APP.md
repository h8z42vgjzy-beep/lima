# Feindschaft als installierbare Web-App – Version 8.0

## Update veröffentlichen
1. ZIP auf dem Mac entpacken.
2. Auf GitHub h8z42vgjzy-beep/lima → Add file → Upload files öffnen.
3. Den INHALT des entpackten Ordners hochladen, inklusive des gesamten Ordners public. Nicht die ZIP selbst hochladen.
4. Commit changes speichern. Beschreibung: Installierbare Feindschaft-App.
5. In Render den bestehenden Dienst lima verwenden. Falls kein automatischer Deploy startet: Manual Deploy → Deploy latest commit.
6. Nach erfolgreichem Deploy Website einmal neu laden.

## Installieren auf dem iPhone
Website in Safari öffnen. Unten auf der Website steht Als App installieren. Alternativ Safari → Teilen → Zum Home-Bildschirm. Falls angeboten, Als Web-App öffnen einschalten. Hinzufügen antippen. Die App anschließend über das neue Symbol starten und bei Bedarf anmelden.

## Installieren auf Android
Website in Chrome öffnen. Als App installieren unten auf der Website antippen. Wenn der Browser noch keinen Installationsdialog anbietet, im Browsermenü App installieren oder Zum Startbildschirm hinzufügen verwenden.

## Auf dem Computer
Chrome oder Edge: Als App installieren auf der Website beziehungsweise die Installationsfunktion im Browsermenü nutzen. Safari auf neueren Macs: Ablage → Zum Dock hinzufügen.

## Verhalten
Website und installierte App verwenden denselben bestehenden Server, Konten und Inhalte. Eine erneute Anmeldung im App-Fenster kann erforderlich sein. Chats, Feed, Uploads, Spiele und Reset-Ereignisse benötigen weiterhin Internet. Ohne Verbindung erscheint eine neutrale Offline-Seite beziehungsweise eine Verbindungsanzeige. Private Daten, API-Antworten und Medien werden vom neuen Offline-Mechanismus nicht zwischengespeichert.

Dieses Paket enthält die bisherigen Reset- und Vollbildänderungen. Die App wird über den Browser installiert; sie ist damit noch nicht im App Store oder Google Play veröffentlicht. Es gibt keine zusätzliche Storegebühr für diese Installation. Render bleibt erforderlich.

## Prüfen
Auf einem iPhone und einem Android-Gerät installieren und über das Symbol öffnen. Anmeldung, einen Chat, ein Foto und ein Spiel prüfen. Flugmodus einschalten und App erneut öffnen: Verbindungsseite statt alter Chats. Flugmodus ausschalten und Erneut verbinden antippen. Den gemeinsamen Reset-Test mit mehreren online geöffneten Geräten prüfen.

Technische Syntaxprüfungen und 46 automatisierte Tests bestanden. Eine echte Installation auf dem eigenen Handy ist noch erforderlich. Vorhandene Nutzerdaten und Datenbank nicht ersetzen oder löschen.
