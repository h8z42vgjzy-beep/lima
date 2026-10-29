# Prüfung von Feindschaft V11

Stand: 29. Oktober 2026. Lokale Laufzeit: Node.js 24.22.1. Alle Daten in automatisierten Tests stammen aus eigens angelegten Testkonten und werden nach dem Test entfernt.

## Tatsächlich ausgeführt

Die Syntaxprüfung umfasst die JavaScript-Dateien des Pakets. Die vollständige Testsuite besteht aus **84 bestandenen Tests**, ohne übersprungene oder fehlgeschlagene Tests.

Geprüft sind insbesondere:

- Registrierung, Anmeldung, Sitzung, Sprach- und Farbwahl, Abmeldung und private Profilangaben.
- Chat-Annahme, wiederholte Anfragen ohne erneute Abbuchung, Blockieren und Entblockieren mit erhaltenem Verlauf.
- Explizite Preise, unveränderte Guthaben beim Lesen, wiederholte Sendeversuche, keine doppelten Abbuchungen und die 50-Prozent-Beteiligung an Fotos.
- Pflichtkategorien, Rechte für Kategorienänderungen, Verfügbarkeit von Bilddateien vor einer Abbuchung und unveränderte Preise bereits veröffentlichter Fotos.
- Getrennte Foto-Zeitfenster, serverseitige 20-Sekunden-Grenzen, dauerhafte Fotos und 28-Tage-Fristen.
- Nachrichten nur für das eigene Konto oder durch die sendende Person für beide löschen; bereits gemeldete Texte nur für berechtigte Moderation aufbewahren.
- Musikoptimierung und exakte Byte-Bereiche für unterbrechungsfreie Wiedergabe und Springen in der Datei.
- Schachregeln, Ausgangsstellung, Zugrechte, Rochade, en passant, Umwandlung, Schachmatt und Patt.
- Zwei echte Dino-Ereignisverbindungen mit gemeinsamem Start, serverseitiger Bewegung, wiederholten Sprüngen und sofortigem Abbruch bei einer Blockierung.
- Moderationszugriff nur auf den gemeldeten Inhalt beziehungsweise den betreffenden Chat; keine Einsicht durch normale fremde Konten.
- Speicher-Reset, Schutz dauerhafter Medien und gemeldeter Belege, synchroner Ablauf und kein nachträgliches Abspielen alter Ereignisse.
- Auszeichnungen, echte Spielstatistik, freiwillige Ranglisten, Gleichstände und das Ausblenden blockierter oder gesperrter Konten.
- Feedbackvalidierung, Kontoabgrenzung, doppelte Übermittlung und Adminverwaltung.
- Übernahme einer tatsächlich angelegten alten Datenbank mit den Konto-IDs 6 und 13, bestehender Sitzung, Guthaben, wartender Anfrage und Nachrichtenverlauf.
- Tatsächliche WebP-, MP3- und MP4-Verarbeitung; Metadatenentfernung und Video-Längenprüfung auf dem Server.
- Vollständige neue Übersetzungseinträge für Englisch, Russisch und Ukrainisch; Schutz von benutzergeschriebenen Texten.
- Auslieferung neuer Dateien mit passenden Dateitypen, Content Security Policy, ETags und Textkompression.

Die ursprünglich vorhandene Testsuite enthielt noch Annahmen aus früheren Versionen, etwa kostenlose Chat-Anfragen und den alten Kategoriepreis. Diese Tests wurden an die tatsächlich eingeführten V10-Regeln angepasst. Neue Tests prüfen weiterhin die Abbuchungen und die Rechte; die Anforderungen wurden nicht auf kostenloses Verhalten zurückgesetzt.

## Nicht hier ausgeführt

Der Download der Chromium-/WebKit-Browser wurde durch die Netzwerkregeln dieser Umgebung mit HTTP 403 gesperrt. Damit konnten weder Screenshots der laufenden Oberfläche noch tatsächliche Browsermessungen erzeugt werden. Die bereitgestellte Browser-Suite ist ausführbar, aber hier **nicht als bestanden** ausgewiesen. Sie prüft vier Themes in 320, 390, 768 und 1440 Pixel Breite, Navigation, Chat, Nachrichtenlöschung, Onboarding, Sprachwechsel, Feedback, Rekordkarten und den Offline-Fallback.

Der GitHub-Workflow startet diese Prüfungen erst, wenn die Dateien einschließlich `.github/workflows/test.yml` in dein Repository übernommen wurden. Ein erfolgreicher lokaler Test ersetzt keinen erfolgreichen GitHub-Lauf.

Die echte Safari-App auf deinem Mac, iPhone-Tastatur, Home-Bildschirm-Installation, Apple-Push, schwache Mobilfunkverbindung und Render-Produktionsdaten wurden nicht geprüft. Auch eine externe Sicherheitsprüfung oder ein Lasttest mit vielen gleichzeitigen Konten ist nicht Bestandteil dieses Ergebnisses.

## Performance

Die vier neuen Bildwelten sind als WebP eingebunden und zusammen rund 0,76 MB groß. Bilder bekommen reservierte Darstellungsflächen; Videos werden erst nahe dem sichtbaren Bereich geladen. Private API-Antworten und Medien werden nicht im Service-Worker-Cache abgelegt. Große Medien werden mit Byte-Bereichsanfragen ausgeliefert.

Für LCP unter 2,5 Sekunden, INP unter 200 Millisekunden und CLS unter 0,1 gibt es in dieser Umgebung keine belastbaren Browsermesswerte. Die Browser-Suite erfasst LCP, Layoutverschiebungen und die längste beobachtete Interaktionsdauer; diese letzte Kennzahl ist ein Diagnosewert und kein vollständiger INP-Perzentilwert. Die Werte hängen von Gerät, Verbindung, Inhalt und Render-Service ab.

## Abnahme nach deinem Deployment

1. `/api/design-status` muss `active: true` und `version: "feindschaft-11"` melden.
2. Mit zwei Testkonten einen Chat anfragen, annehmen, schreiben, blockieren und entblockieren. Die wartende Anfrage muss auf der empfangenden Seite sichtbar sein.
3. Eine empfangene Nachricht nur für sich löschen; eine eigene nur für sich und eine weitere für beide löschen. Das jeweils andere Konto kontrollieren. Eine Meldung vor dem Löschen anlegen und als Admin prüfen.
4. Ein Foto in einer kostenpflichtigen Kategorie einstellen. Guthaben vorher und nachher sowie die 50-Prozent-Gutschrift kontrollieren. Ein 20-Sekunden-Foto jeweils mit getrennten Konten öffnen.
5. Alle Themes und Sprachen umstellen; Feed, Chat, Spiele, Formular und Rekordkarte ansehen. In Safari auch den Wechsel zwischen Hoch- und Querformat sowie die Bildschirmtastatur prüfen.
6. Eine Rückmeldung senden und als Admin auf „Geplant“ setzen. Der Status muss im ursprünglichen Konto sichtbar sein.
7. Eine freiwillige Ranglistenteilnahme ein- und ausschalten. Ein abgeschlossenes Spiel kontrollieren. Eine laufende oder abgebrochene Dino-Partie darf keinen Rekord vergeben.
8. Die installierte App aktualisieren, dann Flugmodus einschalten. Die Offline-Seite muss erscheinen; es dürfen keine vorgetäuschten erfolgreichen Sendungen oder Geldbuchungen entstehen.
9. Push nur auf Wunsch aktivieren und die vorhandene Test-Mitteilung auf dem echten Gerät prüfen.

Die neue Fassung ist erst auf deiner Website aktiv, wenn dein Deployment abgeschlossen ist. Dieses Paket hat den laufenden Dienst nicht verändert.
