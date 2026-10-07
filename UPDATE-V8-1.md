# Moderationskorrekturen – Version 8.1

ZIP entpacken. Alle Dateien und den kompletten Ordner public auf GitHub hochladen. Nicht die ZIP selbst hochladen. Commit changes speichern und erfolgreichen Render-Deploy abwarten. Danach Website beziehungsweise installierte App neu laden.

Behoben:
- Eine gemeldete Chatnachricht lässt sich jetzt löschen. Beide Beteiligten sehen sie nach der nächsten Chataktualisierung nicht mehr.
- Ein gelöschtes Chatfoto verschwindet auch als Nachricht. Die Bilddatei und die Freigabe werden entfernt. Das gilt sowohl für Meldungen des Fotos als auch der zugehörigen Nachricht.
- Ein dabei bereits geöffnetes Chatfoto wird beim nächsten Chatabruf geschlossen. Externe Kopien auf fremden Geräten können nicht zurückgerufen werden.
- Löschen funktioniert auch bei gemeldeten Kommentaren, einschließlich Antworten, sowie zugehörigen Fotos gelöschter Beiträge.
- Warnungen werden als persönliche Moderationshinweise dauerhaft gespeichert und innerhalb etwa zehn Sekunden auf einer geöffneten Seite angezeigt. Offline Personen sehen ungelesene Hinweise bei ihrer nächsten Anmeldung.
- Der Hinweis zeigt deinen Text und einen möglichen prozentualen Guthabenabzug. Ohne Text wird eine passende Standardnachricht angezeigt.
- Mit Gelesen bestätigt die betroffene Person den Hinweis. Unten auf der Website lassen sich die letzten 100 Hinweise erneut ansehen.

Test:
1. Mit einem Testkonto Chattext und Foto senden. Vom anderen Konto melden.
2. Als Lima die Meldung öffnen und Löschen auswählen. Beide Chats prüfen; im geöffneten Chat aktualisiert sich die Liste etwa alle 2,5 Sekunden.
3. Ein Testkonto melden, Warnen wählen und einen Hinweis schreiben. Bei dem betroffenen Konto binnen etwa zehn Sekunden den Hinweis prüfen.
4. Gelesen bestätigen und unten Moderationshinweise öffnen. Ein anderes Konto darf diese Hinweise nicht sehen.

Alte, bereits abgeschlossene Warnungen wurden bisher nicht als persönliche Benachrichtigungen gespeichert; sie werden durch dieses Update nicht nachträglich versendet. Verwende für den Test eine neue Meldung und Entscheidung.

Vorhandene Datenbank nicht ersetzen. Benötigte Tabellen und Felder werden automatisch ergänzt. Die bisherigen App-, Spiele- und Resetfunktionen sind im Paket enthalten. 50 automatisierte Tests bestanden; Darstellung und Empfang bitte auch auf deinen Geräten prüfen.
