# V12 – Nachtrag

Die aktuellen Korrekturen und die geänderte Feed-Speicherregel stehen in README.md. Frühere Aussagen zur 28-Tage-Frist gelten ab V12 nur noch für Chat-Fotos, nicht für den Feed.

# Umsetzung der Word-Vorlage

Maßgeblich ist der Abschnitt **„Feindschaft (F) – Was wir wirklich umsetzen“** in der hochgeladenen Word-Datei vom 29. Oktober 2026. Die 13 eingebetteten Bilder wurden als Gestaltungsreferenzen geprüft. Ihre erfundenen Inhalte, Konten und zusätzlichen Schaltflächen werden nicht als bereits vorhandene Produktfunktionen ausgegeben.

## Verbindliche Auswahl

| Vorgabe | Umsetzung | Wesentliche Dateien |
|---|---|---|
| Flüssige Button-Animationen | Kurzes Eindrücken, sanftes Anheben, Fokusmarkierung; keine verzögerte Ausführung | `public/design-system.css` |
| Eigene Animationen für vier Themes | Nachtblüte: violette Lichtimpulse; Pride: farbiges Erfolgskonfetti; Waldgrün: Scanline bei Erfolgen; Eisblau: Ripple | `public/studio.js`, `public/design-system.css` |
| Sanfte Theme-Wechsel | Farbwechsel über ausgewählte CSS-Eigenschaften; Hintergrundbild mit Überblendung; Auswahl ohne Neuladen | `public/theme-boot.js`, `public/studio.js` |
| Dezente Hintergrundpartikel | Acht kleine Partikel; bei reduzierter Bewegung, Sparmodus oder kleinen Gerätespeichern reduziert | `public/design-system.css`, `public/studio.js` |
| Skeleton-Loader | Kartenförmige Platzhalter beim ersten Laden; Inhalt ohne wiederholtes Aufblinken nachladen | `public/index.html`, `public/design-system.css` |
| Glow und Neon-Akzente | Gemeinsame Tokens für Karten, Schaltflächen, Navigation, Chat, Spiele, Formulare und Dialoge | `public/design-system.css` |
| Animierte Währung | Zählanimation, sichtbare Änderung und dezente Münzbewegung; Gesamtpreis beim Chat-Senden; Buchungsübersicht | `public/studio.js`, `public/features.js`, `server.mjs` |
| Achievements und Badges | Sieben Abzeichen; pro Konto gespeichert, nicht mehrfach freigeschaltet; im Profil sichtbar | `studio.mjs`, `public/studio.js` |
| Globale Ranglisten | Serverergebnisse, freiwillige Teilnahme, gemeinsame Plätze bei Gleichstand; Blockierungen und Sperren berücksichtigt | `studio.mjs` |
| Highscores teilen | Themenbezogene PNG-Karte aus echten Ergebnissen; Teilen, Kopieren, Herunterladen und Linkkopie | `public/studio.js` |
| Interaktives Onboarding | Farbwahl, Tagespunkte, kurze Frage zu Grenzen und Erklärung der Chat-Zustimmung; Fortschritt pro Konto | `public/studio.js`, `studio.mjs` |
| Mehrsprachigkeit | Deutsch, Englisch, Russisch und Ukrainisch; Sprachwahl ohne Neuladen; fremde Beiträge und Nachrichten bleiben unverändert | `public/i18n.js`, `public/studio-translations.js`, `activity.mjs` |
| PWA-Verbesserungen | Mobile Navigation, Installationshilfe, Startmenü-Kurzbefehle, statischer Cache, Updatehinweis und gestaltete Offline-Seite | `public/sw.js`, `public/pwa.js`, `public/manifest.webmanifest`, `public/offline.html` |
| Medienkomprimierung | WebP-Fotos mit Größenlimit, Metadatenentfernung; Video- und Audiooptimierung mit FFmpeg; optimierte Hintergrundbilder und Reset-Medien | `media-optimize.mjs`, `public/media-client.js` |
| Lazy Loading | Bilder laden bei Bedarf; Videoquellen erst nahe dem sichtbaren Bereich; kein privates Medien-Prefetching | `public/features.js`, `public/media-client.js` |
| Automatisierte Tests | API, Rechte, Geldfluss, Medien, Spiele, Moderation und Übernahme alter Daten; zusätzlich Browser-Suite und GitHub-Workflow | Testdateien, `scripts/browser-qa.mjs`, `.github/workflows/test.yml` |
| Feedback-System | Gespeicherte Rückmeldungen mit Typ und Status; Adminverwaltung; Tageslimit und Erkennung unmittelbarer Wiederholungen | `studio.mjs`, `public/studio.js` |
| Easter Eggs | 24 Entdeckungen in acht serverseitig gespeicherten Kapiteln; einmalige Kapitelbelohnung; Bild- und Logointeraktionen | `activity.mjs`, `public/activity-ui.js`, `public/discovery-effects.js` |

## Vier Farbwelten

**Nachtblüte:** nahezu schwarzer violetter Hintergrund, Violett und Pink, zurückhaltende Lichtkanten, Mondlandschaft mit violetten Blüten. Die Blume aus der bestehenden Feindschaft-Identität bleibt Teil des Einstiegs.

**Pride:** dunkler warmer Grund, pinke Akzente, gezielte Farbverläufe und buntes Konfetti bei Erfolgen. Die Bildwelt zeigt einen warmen Sonnenuntergang mit Regenbogenlicht. Fließtext liegt auf ruhigen, gut lesbaren Flächen.

**Waldgrün:** dunkle grüne Flächen, Smaragd und sanfte helle Akzente. Die Bildwelt zeigt Wald, Wasser und ein warm beleuchtetes Haus. Scanlines erscheinen bei besonderen Reaktionen statt dauerhaft über der gesamten Oberfläche.

**Eisblau:** dunkles Mitternachtsblau, Cyan, eisige Highlights und transparente Flächen. Die Berg- und Seenlandschaft ist bewusst ruhig. Kreisförmige Klickimpulse ergänzen den reduzierten Look.

Alle vier Varianten verwenden dieselben Bedienabläufe. Es gibt auf Smartphones eine feste untere Navigation für Feed, Spiele, Erstellen, Nachrichten und Profil; auf großen Bildschirmen eine seitliche Navigation. Der Chat nutzt auf kleinen Bildschirmen die ganze Höhe und berücksichtigt Änderungen der sichtbaren Höhe beim Öffnen der Bildschirmtastatur. Seine Sendegebühr zeigt Text, Foto oder beides entsprechend an.

Die Illustrationen sind eigenständige Bilddateien; sie sind nicht als flache Screenshots anstelle von Bedienoberflächen eingesetzt. Formen, Texte, Karten, Dialoge, Schachbrett und Navigation werden tatsächlich vom Browser aufgebaut.

## Präzisierte Voraussetzungen für Auszeichnungen

Wo die Vorlage keinen konkreten Zahlenwert nennt, ist eine klare Regel ergänzt:

| Abzeichen | Regel |
|---|---|
| Frisch verfeindet | Ersten eigenen Beitrag veröffentlichen |
| Der erste Treffer | Mindestens ein positiver Like auf einen eigenen Kommentar von einem anderen echten Konto |
| Charmante Katastrophe | 100 gegenwärtig gespeicherte positive Reaktionen von anderen echten Konten erhalten |
| Unaufhaltsam | Zehn serverseitig abgeschlossene Spiele gewinnen |
| Spielverderber | 25 serverseitig abgeschlossene Spiele gewinnen |
| Dino-Dominator | In einem abgeschlossenen Dino-Duell mindestens 1.000 Meter erreichen |
| Legende der Feindschaft | Die sechs übrigen Abzeichen freischalten |

Eine erreichte Auszeichnung bleibt gespeichert. Die Auswahl enthält keine Belohnung für das wiederholte Angreifen bestimmter Personen. Ranglisten übernehmen keine vom Browser behaupteten Punktestände.

## Ergänzungen aus dem Schlussabschnitt

Das persönliche Dashboard und die Benachrichtigungszentrale sind umgesetzt. Reaktionen im Feed, Kommentarantworten, private Nachrichten und Spieleinladungen führen zum jeweils passenden Inhalt. Neue Nachrichten werden beim tatsächlichen Abrufen des geöffneten Chats als gelesen markiert. Verborgene Tabs laden den Chat nicht als vermeintlich gelesen nach.

Die Darstellung nutzt wiederverwendbare Komponenten: Schaltflächen, Dialoge, Formulare, Karten, Abzeichen, Ranglistenzeilen und Theme-Variablen. Für optionale Töne und Vibration gibt es getrennte Schalter; beide starten ausgeschaltet.

## Bewusst zurückgestellt

Der öffentliche Live-Aktivitäts-Ticker, vollständige Offline-Chats oder Offline-Multiplayer sowie das Starten von TikTok-/Instagram-Marketing bleiben entsprechend der Auswahl zurückgestellt. Die bereits vorhandenen freiwilligen Push-Funktionen bleiben erhalten; tatsächlicher Sperrbildschirm-Empfang kann hier nicht geprüft werden. Die früher verworfene Standortversion ist nicht enthalten.

Die zusätzlichen Spiele und Funktionen aus manchen Bildbeschriftungen sind keine neuen Zusagen: Es gibt weiterhin Dino-Duell, Schach, Tic-Tac-Toe mit 3 × 3 Feldern, Vier gewinnt und Zahlenduell. Die separat besprochene 5 × 5-Variante ist im verbindlichen Abschnitt nicht als neues umzuset­zendes Spiel spezifiziert. Ihre Regeln wurden deshalb nicht stillschweigend durch eine frei erfundene Fassung ersetzt.

## Grenzen der Prüfung

Die Implementierung ist als vollständiges Quellcodepaket vorhanden. Die Server- und Fachlogik wurde tatsächlich ausgeführt. Browser, reale Endgeräte, deine Live-Datenbank und das Deployment auf Render stehen in dieser Umgebung nicht zur Verfügung. Daher wird weder Fehlerfreiheit auf allen Geräten noch das Erreichen der Core-Web-Vitals-Ziele behauptet. Die vorgesehenen Messungen und der Abnahmetest stehen in `TESTBERICHT.md`.
