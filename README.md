# Feindschaft V11

Diese Version setzt den Abschnitt **„Was wir wirklich umsetzen“** aus `Feindschaft_Design_und_Entwicklungsplan(2).docx` um. Das bestehende Projekt läuft weiter mit Node.js 24, SQLite und deinem vorhandenen persistenten Render-Speicher.

Enthalten sind vier vollständig abgestimmte Farbwelten, eine mobile Navigation, neue Chat- und Spielansichten, Animationen, Auszeichnungen, Ranglisten, Rekordkarten, eine Einführung, Feedback und ein persönlicher Überblick. Die genaue Zuordnung steht in `UMSETZUNG.md`. `TESTBERICHT.md` nennt ausgeführte Prüfungen und ihre Grenzen.

## Auf deiner vorhandenen Website installieren

1. ZIP entpacken. **Den Inhalt** in dein bestehendes GitHub-Repository hochladen und gleichnamige Dateien ersetzen. Die ZIP selbst ist kein ausführbares Update.
2. Die Ordnerstruktur beibehalten: `server.mjs` und `package.json` liegen im Hauptordner; die Oberfläche liegt in `public`, die neuen Bilder in `public/art`. Vorhandene Nutzerdaten auf Render werden nicht hochgeladen oder ersetzt. Die ZIP enthält keine Datenbank und keine Konten.
3. In deinem **bestehenden** Render-Service den Build Command auf `yarn install --production=true && yarn check && yarn test` und den Start Command auf `yarn start` setzen. Ein alter Befehl mit `apply-chat-repair.mjs` wird dadurch ersetzt. Eine neue Render-Instanz ist nicht erforderlich.
4. `F_DATA_DIR`, den eingebundenen persistenten Datenträger und deine übrigen bestehenden Umgebungsvariablen beibehalten. **`F_DATA_DIR` nicht auf einen neuen Ordner ändern.**
5. Den neuesten Commit deployen. Nach erfolgreichem Start diese Adresse öffnen: `https://lima-te6q.onrender.com/api/design-status`.

Erwartet wird unter anderem:

```json
{
  "active": true,
  "version": "feindschaft-11",
  "schema": 11,
  "location": false
}
```

Die vier Themes erscheinen unter **Profil → Einstellungen**. Im Desktop-Menü gibt es zusätzlich einen direkten Zugang. Bei einer bereits geöffneten installierten App kann ein Hinweis auf ein verfügbares Update erscheinen; dort „Neu laden“ wählen. Danach gegebenenfalls die App vollständig schließen und wieder öffnen.

Die Datei `.github/workflows/test.yml` enthält die Prüfungen für zukünftige Änderungen. Beim Hochladen muss auch dieser Ordner mitkommen, damit GitHub die Prüfungen startet. Der Finder zeigt ihn nach `⌘ ⇧ .` an. Alternativ die Datei im GitHub-Webeditor unter genau diesem Pfad anlegen. Die Prüfungen werden erst in deinem Repository ausgeführt; dieses Paket hat keinen Zugriff auf dein GitHub-Konto.

## Bestehende Daten und Regeln

Die Datenbank wird beim Start ergänzend erweitert. Bestehende IDs, Passwörter, Sitzungen, Guthaben, Beiträge, Chats und Spielstände werden übernommen. Bereits als gelöscht markierte Inhalte werden nicht wiederhergestellt. Noch aktive Beiträge mit der alten siebentägigen Frist werden auf 28 Tage ab ihrer Erstellung angepasst. Dauerhafte Fotos behalten ihre Ausnahme.

Die zuletzt eingeführten V10-Preise bleiben erhalten: Text senden 5, Chat-Foto senden 20, Text und Foto zusammen 25 Beleidigungen. Lesen ist kostenlos. Die Schaltfläche zeigt vor dem Senden den Gesamtpreis an. Spiel erstellen und Spiel annehmen kosten jeweils 5; Spielzüge sind kostenlos. Neue Chat-Anfragen kosten 200. Wiederholungen einer vorhandenen angenommenen oder wartenden Anfrage buchen nichts ab. Die vorhandene Chat-Reparatur und das Löschen von Textnachrichten sind direkt integriert.

Einige ältere Beschreibungen im ersten Teil der Word-Datei nennen noch kostenlose Textnachrichten. Für dieses Update gelten die später tatsächlich eingeführten Preisregeln. Die Auswahl „Was wir wirklich umsetzen“ verlangt keine neue Änderung dieser Preise.

## Vor dem Upload und bei einem Rückwechsel

Erstelle vor einem großen Update eine Sicherung des persistenten Datenordners einschließlich Datenbank und Medien. Eine konsistente SQLite-Kopie lässt sich in der Render-Shell bei laufendem Dienst mit diesem Befehl anlegen:

```bash
node --input-type=module <<'NODE'
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
const directory=process.env.F_DATA_DIR||'./data';
const target=path.join(directory,'feindschaft-vor-v11-'+Date.now()+'.sqlite');
const db=new DatabaseSync(path.join(directory,'feindschaft.sqlite'),{readOnly:true});
try{db.prepare('VACUUM INTO ?').run(target);console.log('Datenbankkopie erstellt: '+target);}finally{db.close();}
NODE
```

Die Datenbankkopie enthält keine Medien-Dateien; diese gehören zusätzlich zur Sicherung. Alte Programmdateien und die Sicherung aufbewahren. Ein Rückwechsel auf einen früheren Commit benötigt grundsätzlich keine Löschung der neuen Tabellen. Eine Wiederherstellung der Datenbank würde dagegen Änderungen seit der Sicherung verwerfen und sollte nur gezielt erfolgen.

## Lokal starten

```bash
npm install
npm run check
npm test
npm start
```

Dann `http://localhost:3000` öffnen. Der lokale Datenordner ist `data`; auf Render wird dein bestehendes `F_DATA_DIR` verwendet. Produktionsdaten nicht in Git einchecken.

Für Oberflächentests zusätzlich:

```bash
npx playwright install --with-deps chromium webkit
npm run test:browser
```

Diese Tests verwenden ausschließlich kurzlebige Testkonten. Chromium und WebKit werden in 320, 390, 768 und 1440 Pixel Breite sowie in allen vier Themes geprüft. Die Aufnahmen bleiben unter `qa-results`. Sie gehören nicht in den Produktions-Upload. Der Browser-Download war in der Entwicklungsumgebung gesperrt; diese Prüfung ist hier nicht als bestanden ausgewiesen.

## Neue Bereiche

- **Dein Überblick:** Nachrichten, angenommene Chats, offene Anfragen, Spiele, Beiträge, Guthaben und Erfolge.
- **Auszeichnungen:** sieben dokumentierte Abzeichen mit sichtbaren Voraussetzungen. Im Profil erscheinen freigeschaltete Abzeichen.
- **Ranglisten:** Duellsiege, Dino-Meter, Schachsiege und positive Reaktionen. Die Teilnahme mit dem eigenen Namen ist freiwillig und abschaltbar.
- **Rekord teilen:** echte gespeicherte Ergebnisse als PNG-Karte teilen, kopieren oder herunterladen. Ohne Bildfreigabe-Unterstützung gibt es einen Download.
- **Feedback:** Fehler, Ideen, Spiel- und Musikwünsche senden; den Bearbeitungsstatus sehen. Als Admin ist die Verwaltungsansicht über das Feedback-Fenster oder die Moderation erreichbar.
- **Einführung:** vier kurze interaktive Schritte; später über das Profil erneut aufrufbar.
- **Nähe/Standort:** bleibt entsprechend deiner früheren Entscheidung aus diesem Update heraus.

Die Website wurde hier nicht auf deinen laufenden Render-Service hochgeladen. Ob die neue Fassung dort aktiv ist, lässt sich erst nach dem Deployment an der Statusadresse und mit zwei echten Testkonten prüfen.
