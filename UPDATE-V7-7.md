# Reset-Video einbauen – Version 7.7

1. ZIP auf deinem Computer entpacken.
2. Auf GitHub das Repository h8z42vgjzy-beep/lima öffnen, Branch main.
3. Add file → Upload files wählen. Den INHALT des entpackten Ordners hochladen: die Dateien und den ganzen Ordner public. Die Ordnerstruktur public bitte erhalten.
4. Commit changes anklicken. Als Beschreibung: Reset-Film mit Originalton einbauen.
5. In Render deinen bestehenden Dienst lima öffnen. Falls kein automatischer Deploy startet: Manual Deploy → Deploy latest commit.
6. Nach erfolgreichem Deploy die Seite neu laden und als Admin die Reset-Vorschau starten. Die Vorschau löscht nichts.

Das Video heißt public/reset-film.mp4 und ist ca. 18 MB groß. Es enthält die verfremdete Anfangsszene, Originalmusik und Computerstimme sowie Feed Water Reset anstelle des Namensabspanns.

Wenn auf dem Handy zunächst kein Ton kommt, im Film auf Ton an tippen. Die Videoanzeige bleibt im Hochformat vollständig sichtbar; im Querformat ist sie größer.

Vorhandene Datenbank und hochgeladene Nutzerdateien nicht löschen oder ersetzen. Dieses Paket enthält keine Nutzerdaten. Render-Plan, Disk und Umgebungsvariablen müssen für diesen Austausch nicht geändert werden. Es wird kein neuer Dienst benötigt.

Getestet: Reset-Schwelle, Schutz gemeldeter Inhalte, Laufzeit des Ereignisses, Video-HEAD- und Byte-Range-Abrufe. Die echte Wiedergabe auf deinem iPhone muss nach dem Hochladen mit der Vorschau geprüft werden.
