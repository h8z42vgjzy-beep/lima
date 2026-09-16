# Update 7.1 – vollständiges Schachbrett auf Mac und Smartphone

Diese Version behebt einen Darstellungsfehler aus Update 7. Safari hatte den 64 Schachfeldern eine eigene Mindestgröße gegeben. Dadurch war das Brett größer als sein sichtbarer Rahmen: auf dem Smartphone fehlten rechts und unten jeweils zwei Reihen beziehungsweise Spalten; auf dem Mac wurden die unteren Reihen abgeschnitten.

## Korrektur

- Das Brett verwendet nun immer exakt acht gleich breite Spalten und acht gleich hohe Reihen.
- Jedes Feld darf auf kleinen Bildschirmen korrekt schrumpfen.
- Innenabstände und Mindestgrößen der Schaltflächen wurden entfernt.
- Figuren und Koordinaten passen sich an die Bildschirmbreite an.
- Das vollständige Brett bleibt quadratisch und innerhalb seines Rahmens.
- Die Schachlogik und bereits gespeicherte Partien werden nicht verändert.

## Hochladen

1. `feindschaft-update-v7-1.zip` herunterladen und entpacken.
2. Im GitHub-Repository `lima` **Add file → Upload files** öffnen.
3. Alle entpackten Dateien einschließlich des Ordners `public` hochladen und vorhandene Dateien ersetzen.
4. Als Commit-Nachricht `Schachbrett auf Mac und Smartphone korrigieren` verwenden.
5. Direkt in `main` speichern.
6. Render automatisch deployen lassen oder **Manual Deploy → Deploy latest commit** auswählen.

Die Render-Disk und `F_DATA_DIR=/var/data` bleiben unverändert. Vorhandene Nutzer, Beiträge und laufende Schachpartien werden dadurch nicht gelöscht.

Nach dem Deployment die Seite einmal vollständig neu laden. Auf Safari bei Bedarf den Tab schließen und neu öffnen, damit nicht die ältere CSS-Datei aus dem Cache angezeigt wird.
