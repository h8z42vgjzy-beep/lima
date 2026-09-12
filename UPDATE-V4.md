# Foto-Reparatur, Chatspiele und Extras – Update 4

Dieses Paket aktualisiert das bestehende Projekt `lima`. Es ist noch nicht in dein GitHub- oder Render-Konto hochgeladen worden. Keine echten Konten, Guthaben oder Dateien auf deinem Server wurden verändert.

## Was korrigiert und ergänzt wurde

- Die Kategorie muss bewusst ausgewählt werden. Es ist keine Kategorie vorausgewählt. Nach einem Beitrag ist die Auswahl wieder leer. Der Server prüft die Kategorie zusätzlich.
- Neue öffentliche Foto-Uploads kosten den angezeigten Kategorienpreis. Der Text auf dem Absende-Knopf nennt die Kosten vor dem Upload. Chat-Fotos sind weiterhin kostenlos.
- Andere Personen bezahlen diesen Preis einmalig zum Öffnen. Exakt die Hälfte wird der hochladenden Person gutgeschrieben. Beispiel: 5 Beleidigungen → 2,5 für die Person. Das System arbeitet intern mit ganzzahligen halben Punkten.
- Käufer-Abzug, Freischaltung und Gutschrift erfolgen in einer gemeinsamen Datenbanktransaktion. Doppelte Klicks oder wiederholtes Öffnen verursachen keine weitere Abbuchung.
- Ein bereits freigeschaltetes Bild wird tatsächlich angezeigt und kann vergrößert werden. Eigene Bilder brauchen keinen Kauf. Fehlende oder abgelaufene Bilddateien werden vor dem Kauf abgefangen.
- Nach einem Übertragungsproblem bleibt eine erfolgreiche Freischaltung erhalten; erneutes Laden kostet nichts zusätzlich. Eine verlorene Internetverbindung selbst kann die App nicht verhindern.
- Die Buchungsliste unter „Foto-Buchungen ansehen“ zeigt Kosten und Foto-Einnahmen.
- Chat-Fotos sind für die richtige empfangende Person erreichbar. Öffnen ist einmal möglich; der Server gibt den Zugriff höchstens 20 Sekunden frei. Der Bilddialog ersetzt nicht mehr den Chat. Nach sieben Tagen sind Chat-Fotos auch ohne vorheriges Öffnen nicht mehr erreichbar.
- In angenommenen Einzelchats gibt es Tic-Tac-Toe, Vier gewinnt und Zahlenduell: Einladung annehmen/ablehnen, Züge, Spielende und neue Runde. Nur die beiden Chatpersonen können zugreifen. Keine Einsätze, Wetten oder Guthabenänderungen. Dies sind Browser-Spiele; die alte Java-Datei wird nicht unverändert eingebunden.
- „Extras“ enthält Lernarchiv, Wissenszone, Bastellabor und Faktencheck. Eigene Texte und Dokumente können kostenlos veröffentlicht werden. Unterstützt: PDF, TXT, MD, JAVA, JS, CSS, HTML und JSON, maximal 10 MB. Quellcode wird nicht ausgeführt. Dokumente werden als Download ausgeliefert.
- Clips und Musik lassen sich im Feed gezielt filtern. Videos besitzen einen Player und die Clips-Ansicht lässt sich vertikal durchblättern. Das ist kein vollständiger TikTok-Empfehlungsalgorithmus.
- Gemeldete Inhalte können in der Moderation geöffnet werden. Eine Nutzermeldung gibt dort nur den Chat zwischen gemeldeter und meldender Person frei, keine anderen privaten Gespräche.

## Bewusst unverändert / noch zu klären

- Das zuletzt erwähnte „Zeichen“ ist nicht eindeutig identifiziert. Dafür wurde keine neue Gebühr erfunden. Likes/Dislikes behalten +2/−5 beim Empfänger; die gebende Person bezahlt dafür weiterhin nichts. Lesezeichen bleiben wie bisher eine Plus-Testfunktion; Chat-Anfragen bleiben wie bisher kostenlos.
- Bestehende Foto-Freischaltungen bleiben erhalten; alte Uploads werden nicht nachträglich belastet. Bereits gelöschte Dateien können mit diesem Update nicht wiederhergestellt werden.
- Neue Foto-Preise: 1–100 Beleidigungen. Eine alte Kategorie mit Preis 0 wird für neue Foto-Uploads mit 1 angezeigt; vorhandene Fotos behalten ihren gespeicherten Preis. Kategorien selbst anzulegen ist kostenlos. Keine Sammelkategorie „Sonstiges“.
- Der bestehende Reset-Effekt ist weiterhin die einfache Web-Animation. Der frühere Java-Filmabspann wurde mit diesem Foto-/Spiele-Update nicht nachgebaut.
- Videos: maximal 100 MB, drei Minuten werden vor dem Upload im Browser geprüft. Eine manipulationssichere serverseitige Laufzeitprüfung/Transkodierung ist noch nicht enthalten.
- Medien werden nach 28 Tagen aus dem aktiven Dateispeicher im regelmäßigen Wartungslauf gelöscht. Das entfernt keine eventuell bestehenden Sicherungen beim Hostinganbieter. Eine garantierte vollständige Löschung aus sämtlichen Backups ist hier nicht implementiert. Render erstellt eigene Disk-Snapshots. [Render-Dokumentation](https://render.com/docs/disks#disk-snapshots)

## So aktualisierst du die vorhandene Seite

1. Lade `feindschaft-update-v4.zip` herunter und entpacke die Datei auf deinem Mac. Lade nicht die ZIP selbst bei GitHub hoch.
2. Öffne dein vorhandenes [GitHub-Projekt lima](https://github.com/h8z42vgjzy-beep/lima). Kein neues Repository und keinen neuen Render-Service anlegen.
3. Lade den gesamten Inhalt des entpackten Pakets hoch, einschließlich des kompletten Ordners `public`. Wähle bei gleichen Projektdateien „Ersetzen“. Nicht nur `server.mjs` austauschen: Die neuen Module werden ebenfalls benötigt.

Grundlage ist der hier vorhandene Projektstand. Falls du seitdem eigenen Code auf GitHub verändert hast, vor dem Ersetzen die Änderungen vergleichen; diese konnten hier nicht live abgeglichen werden.

| Auf der obersten Ebene bei GitHub | Im Ordner `public` |
| --- | --- |
| `server.mjs` | `index.html` |
| `games.mjs` | `app.js` |
| `extras.mjs` | `features.js` |
| `media-validation.mjs` | `style.css` |
| `package.json` | `night.css` |
| `tests.mjs`, `regression.test.mjs` | `features.css` |
| `games.test.mjs`, `frontend.test.mjs` | `favicon.svg` |
| `README.md`, `UPDATE-V4.md` | |

4. Den Dateinamen `server.mjs` nicht ändern. Erst im Fenster „Commit changes“ eine Beschreibung eintragen, beispielsweise `Fotos repariert und Chatspiele ergänzt`.
5. Im [Render-Dashboard](https://dashboard.render.com) den vorhandenen Service `lima` öffnen. Falls Auto-Deploy ausgeschaltet ist: `Manual Deploy` → `Deploy latest commit`.
6. Der Startbefehl bleibt `npm start` oder `yarn start`. Als Build-Befehl kannst du `npm run check && npm test` verwenden, damit Syntax- und Funktionstests vor jedem Start laufen. Die Anwendung benötigt weiterhin Node.js 24, aber keine zusätzlichen npm-Pakete.
7. Warten, bis genau der neue Commit erfolgreich bereitgestellt ist. Danach die Seite mit `⌘ + Umschalt + R` neu laden.

Der vorhandene dauerhafte Datenpfad darf nicht geändert werden. Falls `F_DATA_DIR` derzeit auf `/var/data` zeigt, muss er dort bleiben; nicht auf `/var/data/feindschaft` wechseln, sonst startet eine andere Datenbank. Gleiches gilt umgekehrt. Niemals die Disk löschen und niemals eine lokale Datenbank über die bestehende kopieren.

Dieses Update enthält absichtlich keine neue `render.yaml`: Dein Tarif und die bestehende Disk-Größe werden damit nicht verändert. Falls die tatsächliche Disk vergrößert wurde und du `F_STORAGE_BYTES` gesetzt hast, muss diese zusätzliche App-Grenze zu deiner gewünschten Kapazität passen. Sie bestellt keinen Speicher. Die tatsächliche Disk-Größe prüfst du bei Render unter `Disk`, nicht anhand des Bandbreitenkontingents des Workspace-Abos.

Sollte das Hochladen ganzer Ordner im Browser nicht funktionieren: mit GitHub Desktop das vorhandene Repository klonen, die entpackten Dateien in dessen lokalen Ordner kopieren, die Änderungen kontrollieren, committen und pushen. Dabei bleibt `public` ein Ordner. Vorhandene flache Kopien von `index.html` oder `app.js` auf der obersten Ebene müssen nicht gelöscht werden; sobald `public` vorhanden ist, benutzt der Server dessen Dateien.

## Kurzer Abnahmetest nach dem Update

Mit zwei eigenen Testkonten in getrennten Browser-Sitzungen und einem harmlosen Testbild:

1. Auf beiden Konten die Tagespunkte abholen. Ein Foto ohne Kategorie darf nicht veröffentlicht werden.
2. Kategorie mit Preis 5 wählen und ein Foto hochladen: beim Uploader gehen 5 Punkte ab; dessen eigenes Bild erscheint.
3. Mit dem anderen Konto „Foto öffnen“ und den Kauf bestätigen: Bild ist sichtbar, beim Käufer gehen 5 ab, beim Uploader kommen 2,5 an.
4. Schließen, Seite neu laden und dasselbe Foto erneut öffnen: keine weitere Abbuchung.
5. In einem angenommenen Einzelchat ein Foto senden: kostenlos, die andere Person kann es einmal 20 Sekunden öffnen. Danach auch nach Neuladen kein erneutes Öffnen.
6. Im Chat „Spiele“ → „Tic-Tac-Toe“ wählen. Die andere Person nimmt an. Beide setzen abwechselnd; falsche Reihenfolge wird abgewiesen. Das Guthaben bleibt gleich.
7. Unter „Extras“ einen Lernzettel mit Kategorie und Textdatei veröffentlichen. Das andere Konto kann ihn sehen und die Datei herunterladen. Keine Kosten.
8. Ein Testbild melden und als Admin nur den zugehörigen gemeldeten Inhalt prüfen.

## Prüfstand und Grenzen

`npm run check` prüft alle ausgelieferten JavaScript-Module. `npm test` prüft die bisherigen Funktionen sowie die neuen Foto-, Währungs-, Spiel-, Extras-, Moderations- und UI-Logikfälle mit temporären Datenbanken und getrennten Sitzungen. Die Tests verändern nicht die Datenbank deines laufenden Servers.

Ein echter Browser-Test und eine visuelle Prüfung auf Safari/Android konnten in der Erstellungsumgebung nicht ausgeführt werden: Die Browser-Komponente fehlte und ihr Download war gesperrt. Die UI-Logiktests sind kein Ersatz für diesen Abnahmetest. Auch das Render-Deployment wurde nicht ausgeführt.

Die App bleibt ein Prototyp: keine Ende-zu-Ende-Verschlüsselung, keine Screenshot-Verhinderung, keine fertige Passwortwiederherstellung, keine vollständige Kontolöschung und noch keine automatisierte Prüfung aller hochgeladenen Inhalte. Betreibertexte und Sicherungs-/Löschkonzept müssen vor einem breiten öffentlichen Einsatz zum tatsächlichen Betrieb passen. Bereits in einem Chat geteilte echte Passwörter sollten geändert werden.
