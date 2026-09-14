# Update 7 – Langzeit-Schach im Einzelchat

Dieses vollständige Paket baut auf Update 6 auf. Es enthält weiterhin alle Foto-, Musik-, Video-, Dino-, Moderations- und Entdeckungseffekte. Neu ist eine gespeicherte Schachpartie für jeden freigegebenen Einzelchat.

## So funktioniert das Schachspiel

- Im Einzelchat auf **Spiele · kostenlos** und anschließend auf **Schach · Langzeitpartie** tippen.
- Die andere Person nimmt die Einladung an.
- Die einladende Person spielt Weiß und beginnt; die eingeladene Person spielt Schwarz.
- Für einen Zug zuerst die eigene Figur und danach das Zielfeld auswählen.
- Es gibt kein Zeitlimit. Die Stellung wird nach jedem gültigen Zug in derselben SQLite-Datenbank wie die restliche Website gespeichert.
- Der Chat und der Browser dürfen geschlossen werden. Beim späteren Öffnen wird die aktuelle Stellung wieder geladen.
- Zusätzlich zur offenen Schachpartie darf im selben Chat ein kurzes Spiel wie Dino-Duell, Tic-Tac-Toe, Vier gewinnt oder Zahlenduell laufen.
- Die Partie ist kostenlos und verändert das Guthaben nicht.

## Enthaltene Regeln

Der Server entscheidet, ob ein Zug gültig ist. Er kontrolliert normale Figurenbewegungen, das Schlagen, Schach, Schachmatt, Patt, beide Rochaden und en passant. Erreicht ein Bauer die letzte Reihe, wird er automatisch zur Dame. Eine laufende Partie kann über **Aufgeben** beendet werden.

## Bei GitHub hochladen

1. `feindschaft-update-v7.zip` herunterladen und entpacken.
2. Das Repository `lima` bei GitHub öffnen.
3. **Add file → Upload files** wählen.
4. Den vollständigen entpackten Inhalt hochladen. Wichtig: Auch `chess.mjs` muss im Hauptverzeichnis liegen.
5. Vorhandene Dateien ersetzen und als Commit-Nachricht `Langzeit-Schach ergänzen` eintragen.
6. Direkt in den Branch `main` speichern.
7. Render sollte automatisch deployen. Falls nicht: **Manual Deploy → Deploy latest commit**.

Der Render-Datenpfad muss weiterhin `F_DATA_DIR=/var/data` sein. Die bestehende Disk darf nicht gelöscht oder neu angelegt werden, sonst gehen vorhandene Nutzer- und Spielstände verloren.

## Nach dem Deployment prüfen

1. Mit zwei verschiedenen Konten einen freigegebenen Einzelchat öffnen.
2. Eine Schachpartie einladen und mit dem zweiten Konto annehmen.
3. Als Weiß einen Zug ausführen.
4. Beide Browser schließen und den Chat später erneut öffnen. Die Stellung muss unverändert erscheinen und Schwarz muss am Zug sein.
5. Während Schach offen ist, zusätzlich ein kurzes Spiel starten.

Die automatischen Prüfungen testen die Schachregeln, Speicherung, Parallelspiele, Berechtigungen und alle bisherigen Funktionen. Eine echte visuelle Prüfung in Safari ist in der Erstellungsumgebung nicht möglich; das Brett sollte deshalb nach dem Deployment einmal auf dem Mac und Smartphone geöffnet werden.
