# Bilddateien und Gestaltung

Die vier Landschaften wurden mit dem eingebauten Imagegen-Werkzeug für dieses Projekt neu erstellt. Sie orientieren sich an den Bildwelten in der Word-Datei und enthalten keine eingebackenen Oberflächentexte. Die ausgelieferten Fassungen wurden für die Website als WebP optimiert; ihre Pixelbreite beträgt 1440.

| Datei | Bildwelt | Größe |
|---|---|---|
| `public/art/night.webp` | Nachtblüte, violetter Mond und See | 166.098 Bytes |
| `public/art/pride.webp` | Pride, warmer Sonnenuntergang und Stadt am Wasser | 170.832 Bytes |
| `public/art/forest.webp` | Waldgrün, Nachtwald und beleuchtetes Haus | 230.024 Bytes |
| `public/art/ice.webp` | Eisblau, Mond und arktische Berglandschaft | 191.694 Bytes |

Die SVG-Dateien für Dino, Schach und Arcade sind eigenständige Vektorillustrationen. Navigation, Symbole, Schachfiguren und die bestehende Blumenfigur bleiben codebasierte Elemente. Die zusätzlichen SVG-Landschaften sind leichte Vektorvarianten; die tatsächlichen Hauptflächen und Rekordkarten verwenden die WebP-Landschaften.

## Verwendete Prompts

Alle vier Bildaufrufe verwendeten diesen gemeinsamen Teil, anschließend jeweils den unten angegebenen Themenzusatz. Die Ausführung erfolgte über das eingebaute Werkzeug, nicht über eine externe API mit eigenem Schlüssel.

```text
Use case: stylized-concept. Asset type: production background artwork for the Feindschaft social/gaming web app; NO UI mockup. Wide 1536x1024 landscape illustration, extraordinary polished cinematic digital concept art. Rich environmental details, beautifully composed glowing reflections and restrained neon accents, atmospheric depth, organic silhouettes. Dark low-contrast negative space in left third for HTML heading overlay, main luminous scenery concentrated toward right two thirds. Scene fills canvas edge to edge. No people, no animals, no writing, NO TEXT, no logo, no interface, no panels, no device, no frames, no borders, no watermark.
```

Nachtblüte:

```text
Nachtblüte theme: a violet full moon above jagged distant mountains, a quiet midnight lake, tiny luminous purple flowers and silhouetted trees in foreground, electric violet and magenta reflected moonlight, near-black midnight-purple shadows. Refined enchanting mysterious mood, soft star dust, sharp readable silhouettes.
```

Pride:

```text
Pride theme: spectacular vibrant late sunset over a futuristic but elegant city across a lake, framed by silhouettes of palm trees and lush plants; rainbow aurora wisps and restrained gradients, magenta pink violet sky blending into a warm golden orange horizon and cyan reflections in water. Welcoming, confident, joyful mood; near-black foreground. Beautiful without visual clutter.
```

Waldgrün:

```text
Waldgrün theme: a deep evergreen midnight forest surrounding a still creek; warm small cabin tucked in right midground, emerald green bioluminescent leaves and moss, intricate trees, soft fireflies, jade mist, subtle emerald reflections in clear water. Organic elegant natural mystery, no computer motifs, not a terminal, deep near-black green shadows.
```

Eisblau:

```text
Eisblau theme: crystal-clear arctic mountain lake in moonlight, snowy alpine peaks, full icy white moon in indigo sky, graceful silver-cyan aurora, snow-dusted fir silhouettes, icy rocks and detailed luminous reflections. Clean tranquil sophisticated futuristic atmosphere, ice-blue cyan white highlights against midnight navy shadows.
```

## Medienverarbeitung

Fotos werden vor dem Upload bei Bedarf im Browser verkleinert und zusätzlich auf dem Server geprüft und optimiert. Der Server verwendet Sharp für die Pixelverarbeitung; die Metadaten werden beim erneuten Encodieren nicht übernommen. Siehe die [offizielle Sharp-Dokumentation](https://sharp.pixelplumbing.com/api-output/).

Video und Audio werden mit FFmpeg verarbeitet. Die ausführbare Datei kommt aus dem Paket `ffmpeg-static` oder aus einer vorhandenen FFmpeg-Installation; siehe das [Projekt-README von ffmpeg-static](https://github.com/eugeneware/ffmpeg-static/blob/master/README.md). Der Dienst begrenzt die parallele Bearbeitung und erstellt keine vom Browser kontrollierten Shell-Befehle.

Der Reset-Film wurde von 18.161.567 auf 12.665.567 Bytes verkleinert. Die eingebettete Tonspur bleibt enthalten, ebenso die Laufzeit von ungefähr 135,57 Sekunden. Die separat vorhandene ältere MP3-Fassung wurde von 2.161.486 auf 1.080.731 Bytes verkleinert. Die Animation wird weiterhin nur während eines aktiven Ereignisses abgespielt.
