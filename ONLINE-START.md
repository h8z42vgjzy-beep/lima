# F im Internet starten

Dieses Paket enthält die Serverversion mit gemeinsamer Datenbank sowie eine vorbereitete Render-Konfiguration. Es wurde noch nichts veröffentlicht, kein Hostingkonto verbunden und kein kostenpflichtiger Dienst bestellt.

## Was du dafür brauchst

Ein GitHub-Konto für die Projektdateien und ein Render-Konto für den laufenden Server. Das GitHub-Projekt kann privat bleiben, während die Website über ihre Internetadresse öffentlich erreichbar ist.

Die vorbereitete Konfiguration verwendet einen Server mit 0,5 CPU / 512 MB in Frankfurt und 1 GB dauerhaften Speicher. Die Grundkosten betragen nach den am 12.09.2026 abgerufenen Preisen 7 US-Dollar für den Server plus 0,25 US-Dollar für den Speicher pro Monat. Zusätzlicher Verbrauch und mögliche Steuern können hinzukommen. Ein kostenpflichtiger Pro-Workspace ist für diese Konfiguration nicht vorgesehen; der Hobby-Workspace reicht. Prüfe vor der Buchung die tatsächliche Kostenanzeige. [Render-Preise](https://render.com/pricing)

## Dateien zu GitHub bringen

1. Entpacke `feindschaft-online.zip` auf deinem Mac.
2. Öffne [GitHub](https://github.com/new) und lege ein neues Repository namens `feindschaft` an. Ein Repository ist der Projektordner bei GitHub. Wähle „Private“.
3. Lade die entpackten Dateien und Unterordner über „Add file → Upload files“ hoch. Bei einem ganz leeren Repository gibt es dafür einen Link zum Hochladen vorhandener Dateien.
4. Lade den Inhalt des entpackten Ordners hoch. `render.yaml`, `package.json` und `server.mjs` müssen direkt auf der obersten Ebene des Repositorys liegen, zusammen mit dem Ordner `public`. Lade weder die ZIP-Datei selbst noch nur die HTML-Vorschau hoch.
5. Speichere den Upload als Commit.

Das Paket enthält keine Nutzerdatenbank, Passwörter oder Sitzungen. Spätere Datenverzeichnisse gehören nicht ins Repository. [GitHub-Anleitung zum Hochladen](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## Server bei Render einrichten

1. Öffne das [Render-Dashboard](https://dashboard.render.com/).
2. Wähle „New → Blueprint“.
3. Verbinde GitHub mit Render und erlaube den Zugriff auf das Repository `feindschaft`.
4. Wähle dieses Repository. Der Blueprint-Pfad ist `render.yaml`.
5. Prüfe die angezeigten Ressourcen: ein Web Service, Region Frankfurt und 1 GB Persistent Disk. Wenn der Plan unter einem anderen Namen angezeigt wird, vergleiche CPU, RAM und die tatsächlichen Kosten.
6. Wenn du diese kostenpflichtige Konfiguration bestellen möchtest, wähle „Deploy Blueprint“.

Render liest Startbefehl und Speicherpfad aus der vorbereiteten Datei. Beim Build werden die Funktionstests ausgeführt. [Render-Anleitung zu Blueprints](https://render.com/docs/infrastructure-as-code)

## Deine Internetadresse

Nach einem erfolgreichen Deployment steht beim Web Service eine individuelle Adresse unter `onrender.com`. Das ist die teilbare Website-Adresse. Der Anbieter richtet HTTPS ein. Eine eigene gekaufte Domain ist für den ersten Start nicht nötig. [Render-Web-Services](https://render.com/docs/web-services)

Teste zuerst mit zwei eigenen Testkonten in getrennten Browsern: Registrierung, gemeinsamer Feed, eine Chat-Anfrage, deren Annahme und eine Nachricht. Auf dem Internetserver startet eine neue Datenbank. Die Daten aus der lokalen HTML-Vorschau werden nicht automatisch übertragen.

Wähle bei der bestehenden SQLite-Version keinen Server ohne dauerhaften Speicher. Ohne Persistent Disk würden Daten bei Neustarts und Deployments verloren gehen. Der Pfad `/var/data/feindschaft` ist bereits passend eingestellt. [Render-Speicher](https://render.com/docs/disks)

## Stand vor einem offenen Community-Start

Die App ist weiterhin ein Prototyp. Das Hostingpaket ergänzt die technischen Veröffentlichungseinstellungen; es ist keine abschließende Prüfung für einen öffentlichen Social-Media-Dienst. Der aktuelle Stand enthält noch kein betreutes Meldesystem mit Moderationsoberfläche, keine Kontolöschung und keine Passwortwiederherstellung. Die Betreiber- und Datenschutzinformationen in der Oberfläche sind noch Texte für den Testbetrieb. Diese Teile sollten vor der Einladung eines offenen Publikums mit echten Profilangaben fertiggestellt werden.

Für die erste Bereitstellung verwende ausschließlich Testkonten und erfundene Inhalte. Die Website wäre über ihre URL bereits öffentlich erreichbar; das Teilen nur mit wenigen Personen ist keine technische Zugangsbeschränkung. Die Angaben zu Geschlecht, Queer-Identität und Orientierung bleiben standardmäßig vor anderen Konten verborgen.

## Spätere Updates

Automatische Code-Deployments sind in der Konfiguration ausgeschaltet. Neue geprüfte Versionen kannst du in Render über einen manuellen Deploy veröffentlichen. Blueprint-Änderungen können trotzdem automatisch synchronisiert werden; diese Einstellung lässt sich getrennt im Blueprint unter „Auto Sync“ verwalten. Der Datenordner bleibt auf der Persistent Disk erhalten. Eine eigene geprüfte Datenbanksicherung und Wiederherstellung sind vor dem Regelbetrieb noch einzurichten.

Dieses Paket wurde lokal geprüft. Ein Deployment in einem Render-Konto wurde noch nicht ausgeführt.
