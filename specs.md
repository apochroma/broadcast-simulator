# Stream Deck / Companion Integration — Spec (v1)

Branch: `feature/integration-CompanionPi`

## Ziel

Ein Elgato **Stream Deck XL** als simuliertes Device im Signalfluss-Simulator abbilden. Die Tasten-Konfiguration (Label, Icon, Farbe, Aktionen) wird aus einem echten **Bitfocus Companion**-Export (`.companionconfig`) importiert, statt manuell nachgebaut zu werden. Ein Teil der Tasten soll in der Simulation tatsächlich funktionieren: ATEM-Bus-Wahl/Tally und PTZ-Kamera-Presets.

Explizit **kein** Ziel: Companion als Software nachbauen oder deren Source vendoren. Wir lesen nur das Export-Format und bilden eine begrenzte, aber nützliche Teilmenge der Funktionalität nach.

## Status (v1 implementiert, Stand 2026-08-01)

Alle 7 Bausteine aus "Grobe Umsetzungsschritte" sind umgesetzt und mit der echten Referenzdatei im Browser verifiziert (Import, Grid-Rendering, Seitennavigation, Mapping-UI, Live-Dispatch, Live-Feedback, Kamera-Namen-Auflösung).

**Wichtig beim Testen:** Tasten reagieren nur, solange ihre `bmd-atem`/`canon-ptz`-Instanz einem Node in der Szene zugeordnet ist. Das passiert inzwischen automatisch (siehe unten) — bleiben Tasten trotzdem inert, prüfen in `Geräte zuordnen`, ob die Instanz wirklich einen Node zugewiesen bekommen hat (z.B. weil mehr Instanzen als passende Nodes in der Szene existieren). Danach werden aus diesen Instanzen stammende Tasten live:

| Kategorie | Läuft live (mit Mapping) | Bleibt rein visuell |
|---|---|---|
| ATEM | `program`, `preview`, `cut`, `auto`, `program_bg`/`preview_bg`-Tally | `aux`/`aux_bg` (kein AUX-Bus im Simulator), SuperSource, USK/DSK, Fairlight, Macros |
| PTZ | `recallPset`/`savePset` (nutzt bestehendes Preset-System — **speichert/lädt seit Kurzem auch AE-Level (`exposureEV`), Weissabgleich (`whitebalanceMode`+`kelvinStepIndex`) und Gain/Iris/Shutter (`gainDb`/`irisStepIndex`/`shutterStepIndex`) pro Preset**, nicht nur Pan/Tilt/Zoom, sodass z.B. Preset 1 mit +1.5EV/3200K/24dB Gain und Preset 2 mit -1.5EV/8000K/F11 unabhängig voneinander koexistieren können; beim Recall springen Belichtung/Weissabgleich/Gain/Iris/Shutter sofort, während Pan/Tilt/Zoom weiterhin sanft animiert nachfahren. **Wichtig:** `saveCameraPreset` normalisiert dabei jeden dieser fünf Werte auf einen konkreten (ggf. neutralen Default-)Wert statt ihn roh zu übernehmen — eine frisch hinzugefügte, nie angefasste Kamera hat z.B. `camera.gainDb === undefined`; würde das ungeprüft gespeichert, hätte ein späterer Recall (der `undefined`-Felder bewusst überspringt, für Abwärtskompatibilität mit älteren Presets) den zu diesem Zeitpunkt zufällig *live* anliegenden Wert stehen lassen, statt deterministisch auf den Preset-Zustand zurückzufallen — genau dieses Verhalten wurde live nachgestellt und gefixt: Preset 1 einer unberührten Kamera liefert jetzt zuverlässig 0dB/F5.6/1-60/4760K/auto/0EV, unabhängig davon, was zuvor live eingestellt war), `tallyPreview`/`tallyProgram`, Richtungstasten `up`/`down`/`left`/`right`/Diagonalen (kontinuierliche Bewegung solange gehalten), `home` (sanft animiert), `stop`/`stopPan`/`stopTilt`, `aeBrightness` (±1.5EV in 0.5-Schritten, simuliert als CSS-`brightness()`-Filter auf dem Equirectangular-Bild — läuft überall mit, wo die Kamera angezeigt wird, da alle Anzeigen denselben Rendering-Pfad teilen), `exposureShootingMode`/`aePhotometry` (AE-Modus/Messmethode, inkl. Companions "Step Progression"), `gainU`/`gainD`/`gainToggle` (±1dB, 0–36dB laut Canon XC Control Protocol Specs, Auto/Manual), `irisU`/`irisD`/`irisM` (1/3-Stop-Tabelle F1.8–F11 laut Canon XC Control Protocol Specs — der reale Protokollbereich ist zoomabhängig, hier vereinfacht als fixe Tabelle, Auto/Manual), `shutterUp`/`shutterDown`/`shutterToggle` (Shutter-Tabelle 1/60–1/2000 aus der Kamera-eigenen Shutter-Liste, Auto/Manual) — bei allen drei bedeutet "Up" Richtung heller (weitere Blende/langsamerer Shutter/mehr Gain), konsistent zueinander; **Gain/Iris/Shutter wirken sich jetzt zusätzlich tatsächlich auf die Bildhelligkeit aus**, nicht nur auf den angezeigten Wert: `getStreamDeckExposureContributionEV` rechnet jede der drei Grössen relativ zu ihrem neutralen Default (0dB, F5.6, 1/60) in EV um (Gain: dB/6.02, Iris/Shutter: `2·log2(f_neutral/f)` bzw. `log2(t_neutral/t)`) und addiert sie zur AE-Level-Kompensation (`aeBrightness`) auf — `getStreamDeckEffectiveExposureEV` liefert diese Summe (geclamped auf ±8EV statt der bisherigen ±1.5EV, damit extreme Kombinationen das Bild auch wirklich über-/unterbelichten können) und ersetzt das bisherige alleinige `source.exposureEV` an allen Stellen, die die Helligkeit rendern (SDR-CSS-`brightness()`-Filter und der lineare HDR-Belichtungsfaktor in `drawEquirectangularProjectionHDR`); `focusToggle` (Auto/Manual Focus); `kelvinUp`/`kelvinDown` (Farbtemperatur, 88-Werte-Liste 2000K–15000K laut Canon XC Control Protocol Specs, Default 4760K); `whitebalanceModeToggle` (zyklisch durch `auto, manual, kelvin, daylight, tungsten, wb_a, wb_b` — **die Kelvin-Anzeige (`:kelvinValue`) folgt jetzt dem Moduswechsel**: `getStreamDeckKelvinLabel` liest über `getStreamDeckEffectiveKelvin` den tatsächlich wirksamen Wert, also bei `daylight`/`tungsten` den festen Referenzwert (5600K/3200K) statt weiterhin den zuletzt per Kelvin Up/Down gesetzten Rohwert anzuzeigen; bei `auto`/`manual`/`kelvin`/`wb_a`/`wb_b` bleibt der gespeicherte Schritt massgeblich); `aeFlickerReduct` (Auto/Off, Step Progression) — **visuell simuliert**: CSS `sepia()` + `hue-rotate(180deg)` relativ zu 5600K neutral (höherer K-Wert = wärmer/orange, tieferer = kühler/blau), aber **nur wenn WB-Modus `kelvin` ist** (matcht reales Kamera-Verhalten); `tungsten` nutzt einen Referenzwert (3200K), `daylight` bleibt neutral (5600K), `auto`/`manual`/`wb_a`/`wb_b` zeigen keine Tönung (Gain/Shift nicht simuliert); `ptSpeedU`/`ptSpeedD` (Pan/Tilt-Geschwindigkeit, vereinfacht als Level 1–24 statt der realen kontinuierlichen zoomabhängigen Ratio laut Canon XC Specs — hier bewusst simplifiziert, da zu granular für einen Stream-Deck-Stepper); `digitalZoom` (ON/OFF-Toggle — **wird als reiner Zustands-Flip behandelt, ignoriert den `bol`-Wert der Aktion**: alle 6 Pro-Kamera-DZOOM-Buttons in dieser Referenzdatei senden `bol:0` in *beiden* Step-Progression-Stufen, ein durchgängiger Copy-Paste-Fehler beim Duplizieren des Templates über alle Kameras — striktes Auslesen von `bol` hätte den Button dauerhaft auf OFF hängen lassen, deshalb toggelt die Simulation stattdessen einfach den aktuellen Zustand, robust gegen diese Art Datenfehler); `zSpeedS` (Zoom-Geschwindigkeit LOW/MEDIUM/HIGH, `speed`-Option 0/64/127); `zoomI`/`zoomO`/`zoomS` (Zoom In/Out, kontinuierlich solange gehalten, `zoomS` = Stop) — **PT Speed und Zoom Speed wirken sich tatsächlich auf die Bewegungsgeschwindigkeit aus**: `movePtzCameraByVector` (die gemeinsame Bewegungsfunktion von SKAARHOJ-Joystick UND Stream-Deck-Richtungs-/Zoom-Tasten) skaliert Pan/Tilt-Velocity mit `Level/12` und Zoom-Velocity mit `speed/64` (Floor bei 8, damit LOW nicht komplett einfriert) — ein Geschwindigkeits-Update wirkt dadurch automatisch auf beide Bedienwege, ohne separate Verdrahtung pro Controller. **Digital Zoom erweitert jetzt den tatsächlichen Zoom-Bereich**: normal max 3.2x (rein optisch), mit aktiviertem `digitalZoomEnabled` max 6.0x — durchgezogen durch `normalizePtzState` (neuer optionaler `maxZoom`-Parameter, Default 3.2 bleibt für alle anderen Aufrufer unverändert), `movePtzCameraByVector` und die Canvas-Projektion (`drawEquirectangularProjection`), sodass der erweiterte Zoom auch tatsächlich im gerenderten Bild sichtbar wird, nicht nur im gespeicherten Wert | Bildstabilisierung, ... |
| Sonstiges | Seitennavigation (`pageup`/`pagedown`/`set_page`, inkl. der `custom_variable_set_value`-Kette darunter, siehe unten), `$(...):cameraName)`/`:exposureShootingMode`/`:aePhotometry`/`:gainValue`/`:gainMode`/`:irisValue`/`:irisMode`/`:shutterValue`/`:shutterMode`-Auflösung (Namen aus dem Mapping-Panel bzw. simulierter Kamerazustand) | alle anderen Module (h2r, playoutbee, soundcraft, kiloview, generic-http), Companion-Variablen/Expressions allgemein |

Ohne Mapping sehen alle Tasten exakt wie im Export aus (Text/Icon/Farbe), reagieren aber auf Klicks nicht — das ist der dokumentierte Fallback aus Punkt 7, kein Fehler.

### Automatische Geräte-Zuordnung

`autoMapStreamDeckInstances(node)` läuft automatisch (a) direkt nach dem Import und (b) jedes Mal, wenn `Geräte zuordnen` geöffnet wird. Sie füllt nur **noch nicht zugeordnete** Instanzen auf, gepaart in stabiler Reihenfolge (Instanz-Label alphanumerisch, Nodes in Erstellungsreihenfolge — `canon-ptz` → `state.nodes` vom Typ `camera`, `bmd-atem` → vom Typ `switcher`), jeweils bis Instanzen oder Nodes ausgehen. Eine bereits bestehende Zuordnung (ob manuell oder vorher automatisch gesetzt) wird nie überschrieben — manuell im Dropdown geänderte Zuordnungen bleiben also stabil, auch wenn danach erneut automatisch zugeordnet wird. Reihenfolge der Nodes in der Szene bestimmt also, welche Kamera/welcher Switcher welcher Instanz zugeordnet wird — bei "falscher" Zuordnung einfach im Mapping-Panel manuell korrigieren.

### Nachträglich entdeckt: Seiten-Navigation läuft über Custom Variables + Short-/Long-Press

Die "Kamera wählen"-Tasten auf Page 1 (und analoge Tasten auf vielen anderen Pages) springen NICHT über einen festen `set_page`-Zielwert, sondern über eine kleine interne Rechnung:
1. `custom_variable_set_value` setzt `initPage` auf eine Zahl (z.B. `3` für Kamera 1, `15` für Kamera 4 — die erste Page der jeweiligen 4-Page-Gruppe).
2. `custom_variable_set_value` setzt `GoToPage` auf `$(internal:custom_initPage)` (+0/+1/+2/+3, je nach Taste — PTZ/Belichtung/Recall/Save).
3. `set_page` springt zu `$(internal:custom_GoToPage)`.

Zusätzlich nutzt die "Recall/Save Presets"-Taste (dieselbe physische Taste!) Companions **Short-/Long-Press-Mechanik**: `action_sets.down` (sofort bei Press), `action_sets.up` (bei Release, falls vor der Schwelle losgelassen) und eine numerische Schwelle wie `action_sets["1000"]` (feuert an Stelle von `up`, sobald so lange gehalten wurde) — kurzer Druck → Recall-Presets-Page, ≥1s gehalten → Save-Presets-Page.

Umgesetzt in `companion-import.js` (`normalizeButtonActions` liefert jetzt `{press, release, holdGroups}` statt einer flachen Liste, `custom_variable_set_value` wird mitgeschnitten) und `app.js` (`evaluateStreamDeckExpression` löst `$(internal:custom_X)`(`+N`) auf, `node.customVariables` hält den Zustand, `startStreamDeckPress`/`stopStreamDeckPress` sind eine Kopie des bestehenden PTZ-Preset-Long-Press-Musters — Tasten hängen jetzt an `pointerdown`/`pointerup` statt an `click`). Live im Browser mit der Referenzdatei verifiziert: Kamera-Taste springt sofort auf Press zur richtigen Page; die Recall/Save-Taste springt bei kurzem Druck zu Page 5, bei ≥1s gehaltenem Druck zu Page 6.

### Nachträglich entdeckt: HDR-Panoramen für echte Belichtungssimulation

Die `aeBrightness`-Simulation (±1.5EV, CSS-`brightness()`-Filter) funktioniert für normale JPG/PNG-Equirectangular-Bilder gut, hat aber eine Grenze: Ein bereits auf SDR getontes Bild besitzt keine Headroom-Information — bei `+1.5EV` läuft z.B. ein heller Himmel einfach ins Weiss (Clipping), statt wie bei einer echten Kamera Wolkendetail zu verlieren, aber sichtbar zu bleiben. Auf Wunsch wurde deshalb ein zweiter, **nur für `.hdr`-Dateien aktiver** Rendering-Pfad ergänzt, der echtes Radiance/RGBE-HDR-Bildmaterial mit linearer Belichtungssimulation darstellt:

- **Erkennung**: `setDroppedFileMedia` prüft den Dateinamen auf `/\.hdr$/i` *vor* der `image/*`-MIME-Prüfung (Browser erkennen `.hdr` nie als Bild-MIME-Type) und setzt `media.isHDR = true`. Alles andere (JPG/PNG/...) läuft unverändert über den bestehenden Pfad.
- **Parser** (`parseRadianceHDR`): liest den ASCII-Header + Auflösungszeile (`-Y height +X width`) und dekodiert den Scanline-Body — sowohl klassisches RLE (New-Style-Marker `[2,2,widthHi,widthLo]`) als auch flaches 4-Byte-RGBE pro Pixel. Jedes Pixel wird über `2^(e-136)` in lineares Float-RGB skaliert (`Float32Array`, kein Clipping).
- **Sampling & Projektion** (`getHDRPanoramaData`/`hdrPanoramaCache`, `bilinearSampleFloatEquirect`, `drawEquirectangularProjectionHDR`): dieselbe Kugelprojektions-Geometrie (Yaw/Pitch/FOV → Welt-XYZ → Longitude/Latitude → Quell-UV) wie der bestehende SDR-Pfad, aber mit bilinearem Sampling direkt auf den linearen Float-Daten statt auf `Uint8ClampedArray`.
- **Belichtung & Tonemapping**: EV wird als linearer Faktor (`2^EV`) auf die Float-Werte multipliziert, danach ein ACES-Filmic-Tonemap (Narkowicz-Fit) statt hartem Clipping angewendet, zuletzt Gamma-Encoding (`^(1/2.2)`) auf den finalen `ImageData`-Canvas geschrieben. Dadurch bleiben Lichter/Schatten auch bei ±1.5EV erkennbar strukturiert statt platt weiss/schwarz zu laufen.
- **Weichen-Stellen**: `renderPtzProjectionCanvas` verzweigt auf `source.media?.isHDR` (HDR- vs. bestehender Image-Pfad, beide teilen sich den Canvas-Resize-Code); `isPtzPanoramaSource` liefert für HDR-Quellen sofort `true`; `renderPtzPanoramaPicture` **überspringt** den CSS-`brightness()`-Filter bei HDR (Belichtung ist bereits in den Pixeln verrechnet), wendet aber den Kelvin-Tönungsfilter weiterhin an (Weissabgleich-Simulation ist unabhängig vom Belichtungspfad).
- **Live verifiziert** mit beiden vom Nutzer bereitgestellten Testdateien (`00501_OpenfootageNET_mountainsnow_low.hdr`, Aussenszene; `OpenfootageNETgaragelow.hdr`, Innenraum/Tiefgarage mit hohem Kontrast): korrekter Decode/Render bei neutraler Belichtung, `+1.5EV` hellt auf ohne Himmel/Deckenlichter komplett auszubrennen, `-1.5EV` dunkelt ab ohne auf Schwarz zu clippen — bei beiden Szenen, keine Konsolenfehler. Regressionstest mit einem bestehenden SDR-Equirectangular-Bild (`output/rheinfelden_equirectangular.png`) bestätigt: unveränderter CSS-Filter-Pfad, keine Nebenwirkungen durch die neue Verzweigung.

## Referenzdateien

Liegen jetzt in `configuration/` (umgezogen aus `assets/`):
- `configuration/streamdeck.companionconfig` — die Companion-Export-Datei (gzip-komprimiertes JSON, Companion 4.3.4, `"type": "full"`, ~4.1 MB entpackt, 99 Pages, 1044 Buttons, 5 Surfaces, 16 Modul-Instanzen). Ist auch `DEFAULT_STREAM_DECK_CONFIG_PATH` in `app.js` — neue Stream-Deck-XL-Nodes laden diese Datei automatisch beim Hinzufügen (Button "Load Configuration" erlaubt späteren manuellen Reimport/Wechsel).
- `configuration/broadcast-setup-2026-07-25.json` — ein echter Szenen-Export (Format von `serializeSetup()`/"Export JSON") mit 15 Nodes (3 Kameras, 1 ATEM, 1 SKAARHOJ PTZ-Controller, Monitore, Netzwerk-Switch, ...). Dient als realistische Testgrundlage — per `fetch(...)` + `loadSetup(...)` ins laufende Projekt geladen, dann Stream Deck hinzufügen und Auto-Mapping/Dispatch dagegen verifizieren. Kein Auto-Load beim Start (nur der Stream-Deck-Companion-Import lädt automatisch) — muss über `Menu → Import` oder programmatisch geladen werden.
- `assets/00501_OpenfootageNET_mountainsnow_low.hdr`, `assets/OpenfootageNETgaragelow.hdr`, `assets/Apochroma_Indoor_hdr.hdr` — reale Radiance/RGBE-HDR-Panoramen (Aussenszene, Tiefgarage/Innenraum mit hohem Kontrast, Innenraum mit Fenster) als Testgrundlage für die HDR-Belichtungssimulation (siehe unten). Kein Auto-Load — per Drag&Drop auf eine Kamera oder `setDroppedFileMedia(...)` zuweisen.

`streamdeck.companionconfig` ist die primäre Grundlage für die Schema-Annahmen unten. Companion ändert sein Export-Format zwischen Major-Versionen — Annahmen gelten für Format-Version `12` / Companion 4.x, nicht garantiert für ältere Exporte.

## Erkenntnisse aus der Referenzdatei

### Top-Level-Struktur
```
version, type, companionBuild,
pages: { "<pageNumber>": { id, name, gridSize, controls } },
triggers, triggerCollections,
custom_variables, customVariablesCollections,
expressionVariables, expressionVariablesCollections,
instances: { "<instanceId>": { moduleId, label, moduleVersionId, config, ... } },
surfaces: { "<surfaceKey>": { type, integrationType, gridSize, config, groupConfig, name } },
surfaceInstances, surfaceGroups, surfacesRemote, ...
```

### Relevante Surface (Stream Deck XL)
```
surfaces["streamdeck:CL11L2A01950"] = {
  type: "Elgato Stream Deck XL",
  integrationType: "elgato-streamdeck",
  gridSize: { columns: 8, rows: 4 },
  groupConfig: { startup_page: 1, last_page: 1, use_last_page: true, ... }
}
```
Eine Export-Datei kann **mehrere Surfaces** enthalten (hier: 4× Stream Deck + 1× Blackmagic-Panel). Import muss die Ziel-Surface auswählen lassen (per `type`/`integrationType` vorfiltern auf Stream-Deck-artige Surfaces).

### Page → Controls
```
pages["1"] = {
  id, name,
  gridSize: { minColumn, maxColumn, minRow, maxRow },  // kann mehrere Surfaces auf einer Page kombinieren
  controls: { "<row>": { "<col>": <Control> } }
}
```
Row/Col sind 0-indiziert. Die Stream-Deck-XL-Surface liegt (laut `xOffset`/`yOffset` in `surfaces[...].config`, hier beide 0) typischerweise bei Zeilen 0–3, Spalten 0–7 innerhalb der Page.

### Control-Typen
- `{ "type": "pageup" }` / `{ "type": "pagedown" }` / `{ "type": "pagenum" }` — eingebaute Seitennavigations-Tasten (kein `style`/`steps`).
- `{ "type": "button", style, options, feedbacks, steps, localVariables }` — normale Taste.

### Button `style`
```
style: {
  text, textExpression, size,
  png64,              // base64 PNG, das vom Nutzer im Companion-GUI gewählte Icon
  alignment, pngalignment,
  color, bgcolor,     // Zahl, RGB als 24-bit int (0xRRGGBB)
  show_topbar, latch
}
```

### Button `steps` → Aktionen
```
steps: { "0": { action_sets: { down: [Action, ...], up: [...] }, options } }
```
```
Action = {
  type: "action", id, definitionId, connectionId, headline, options, children
}
```
`connectionId` verweist auf einen Key in `instances` (Modul-Instanz) oder ist das Literal `"internal"` (Companions eigene Bedienlogik: Variablen setzen, Seite wechseln, Bedingungen, Wait, Exec, ...).

### Button `feedbacks`
```
feedbacks: [{ type: "feedback", id, definitionId, connectionId, options, style, isInverted }]
```
`style` in einem Feedback überschreibt bei Aktivierung den Button-Style (typischerweise `bgcolor`/`png64`) — das ist der Mechanismus für Tally-Farben etc.

### Instanzen in der Referenzdatei (Modul-Typ-Häufigkeit der genutzten Actions/Feedbacks)
| moduleId | Instanzen | Genutzte Actions (Top) | Genutzte Feedbacks (Top) |
|---|---|---|---|
| `canon-ptz` | PTZ_101…106 | `recallPset` (126), `savePset` (126), PTZ-Bewegung/Zoom/Exposure | `lastUsedPset` (126), `tallyPreview`/`tallyProgram`, `digitalZoom` |
| `bmd-atem` | atem, atem_2 | `program` (83), `setSsrcBoxProperties`/`Source` (SuperSource), `preview`, `aux`, `usk`, `auto`, `macrorun`, `fairlightAudio*` | `macro` (180), `program_bg` (48), `preview_bg` (39), `aux_bg`, `usk_bg` |
| `internal` | — | `set_page` (170), `custom_variable_set_value` (167), `logic_if`, `variable_value`, `wait`, `exec` | `variable_value`, `logic_conditionalise_advanced`, `bank_current_step` |
| `h2r-graphics`, `bytehive-playoutbee`, `soundcraft-ui`, `generic-http`, `kiloview-ndi`, `h2r-layouts` | je 1 | vereinzelt | vereinzelt |

## Scope v1

### In Scope
1. **Neues Device**: `streamDeckXL` in `device-catalog.js` — Node mit 8×4-Button-Grid statt klassischen In/Out-Ports (eigener Renderer, kein Signal-Kabel-Anschluss).
2. **Importer** (`companion-import.js`, neues Modul): liest `.companionconfig`, entpackt via `DecompressionStream('gzip')` (nativ im Browser, keine Library), parsed JSON.
   - Falls mehrere Surfaces vorhanden: Auswahl-Dialog (Liste nach `type`/`name`), gefiltert auf `integrationType === "elgato-streamdeck"`.
   - Übernimmt alle Pages, die dieser Surface zugeordnet sind (`groupConfig.startup_page` als Startseite).
3. **Rendering**: pro Button `style.text`, `style.png64` (als `<img>`/`background-image`), `style.bgcolor`/`color` (int → CSS-Farbe). `pageup`/`pagedown`/`pagenum`-Controls als eigener Button-Look (Pfeil-Icons statt Bild).
4. **Seitennavigation**: Klick auf `pageup`/`pagedown` bzw. eine Taste mit `internal`-Action `set_page` wechselt die im Device angezeigte Page (rein clientseitiger Zustand am Node, kein Bezug zu Companions Variablen-Engine).
5. **Node-Mapping**: beim Import (oder danach editierbar) wird jede `canon-ptz`- und `bmd-atem`-Instanz optional einem existierenden Node in der aktuellen Szene zugeordnet (Dropdown: "PTZ_101 → Kamera XY"). Nicht zugeordnete Instanzen ⇒ zugehörige Tasten bleiben inert (Punkt 7).
6. **Live-Funktionalität** (nur bei vorhandenem Mapping):
   - `bmd-atem` Actions `program`, `preview`, `cut`, `auto` → ändern Bus-Zustand des gemappten ATEM-Node.
   - `bmd-atem` Feedbacks `program_bg`, `preview_bg` → Button-Hintergrund folgt live dem Bus-/Tally-Zustand.
   - `canon-ptz` Actions `recallPset`, `savePset` → nutzen das bestehende Preset-System der PTZ-Kamera-Nodes.
   - `canon-ptz` Feedbacks `tallyPreview`, `tallyProgram` → Tally-Farbe am Button (aktiv, wenn die gemappte Kamera bei irgendeinem Switcher in der Szene aktuell Program/Preview ist).
7. **Fallback für alles andere**: Buttons mit nicht unterstützten `definitionId`s/Modulen rendern normal (Text/Icon/Farbe aus dem Export), Klick hat keine Wirkung. Keine Fehler, keine Abstürze.

### Explizit Out of Scope (v1)
- Companions Custom-Variablen/Expression-Engine (`$(...)`-Auswertung in `text`/`textExpression`) — Button-Text wird 1:1 aus dem Export übernommen, auch wenn er eine unaufgelöste Variable enthält.
- **`aux`/`aux_bg` (bmd-atem)**: bei der Umsetzung festgestellt, dass der Simulator gar keinen AUX-Bus modelliert (nur Program/Preview + Multiview) — dafür müsste das Switcher-Datenmodell erweitert werden, was hier bewusst nicht mitgemacht wurde. Buttons mit `aux`/`aux_bg` fallen unter Punkt 7 (nur visuell).
- SuperSource-Box-Steuerung, USK/DSK, Fairlight-Audio-Mixing, Macros (`bmd-atem`).
- Alle Module ohne Entsprechung im Simulator: `h2r-graphics`, `h2r-layouts`, `bytehive-playoutbee`, `soundcraft-ui`, `generic-http`, `kiloview-ndi`.
- Companion Triggers, `logic_if`/`logic_conditionalise_advanced`, `wait`, `exec`.
- Encoder/Touchstrip (Stream Deck +) — nur XL-Grid in v1.
- Re-Export (Simulator → Companion-JSON) — nur Import.

## Bekannte Einschränkung: Undo/Export

`node.companionImport` (inkl. aller Base64-Icons über bis zu 99 Pages, real getestet ~0.9 MB) wird **bewusst nicht** in `serializeSetup()` mitgeschrieben — sonst würde jeder Undo-Snapshot und jeder Projekt-Export/Share-Link diese Datenmenge erneut einbetten (bei `UNDO_HISTORY_LIMIT = 80` potenziell zweistellige MB im Speicher). Konsequenz: Undo über eine Stream-Deck-Import-Aktion hinweg, oder das Laden eines exportierten/geteilten Projekts, setzt den Stream-Deck-Node auf den leeren Zustand zurück — die `.companionconfig` muss dann erneut importiert werden. Das Instance-Mapping geht dabei ebenfalls verloren (lebt nur zusammen mit `companionImport`).

## Offene Fragen
- Sollen mehrere Stream-Deck-Nodes gleichzeitig in einer Szene unterstützt werden (z.B. XL + Plus), oder reicht v1 mit genau einem? (Aktuell technisch kein Problem, da alles am jeweiligen Node hängt — nur nicht gezielt getestet.)
- Soll `companionImport` doch persistiert werden (z.B. komprimiert, oder nur Text+Farbe ohne Icons), um das Undo/Export-Verhalten zu verbessern?

## Grobe Umsetzungsschritte
1. Importer-Modul: Gzip-Decompression + JSON-Parse + Surface-Auswahl.
2. Device-Catalog-Eintrag `streamDeckXL` (Platzhalter-Grid ohne Import, damit das Device grundsätzlich platzierbar ist).
3. Renderer für das 8×4-Grid inkl. Button-Style aus importierten Daten.
4. Page-Navigation (lokaler State am Node).
5. Node-Mapping-UI + Persistenz im Node-State.
6. Action-Dispatch für `bmd-atem`/`canon-ptz` (Klick-Handler).
7. Feedback-Dispatch (Tally/Bus-Status → Button-Style, reaktiv bei State-Änderungen wie bei bestehenden Audio-Markern/Tally-Logik).
8. Fallback-Rendering für unbekannte Module/Actions.
