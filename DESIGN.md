# Design – Anmeldeseite Infoabend Baufinanz Düren

Das Designwissen dieser Seite an einem Ort. Gilt für die Seite (`public/`), die Verwaltung (`/admin`)
und alle E-Mails (`netlify/lib/mail.mjs`). Vor Design-Änderungen lesen; Änderungen hier nachtragen.

## Grundidee in einem Satz

**Kopf und Fuß wie baufinanz-dueren.de, der obere Abschnitt wie das Infoabend-Plakat** (Logo-Blau mit
Hausfoto, Navy-Datumsfeld mit Gold-Datum), darunter ruhige weiße und hellgraue Abschnitte, Raleway überall.

## Farben

| Name (CSS-Variable) | Wert | Wofür |
|---|---|---|
| Logo-Blau `--poster-blue` | `#323D8D` | Kopfbereich (Hero) wie Plakat, Mail-Kopf, Favicon-Haus |
| Navy `--navy` | `#1C2350` | Datumsfeld, Bestätigungskarte in der Mail, Mail-Fuß |
| Gold `--gold` | `#D9B56C` | Datum, Etikett „✓ Anmeldung bestätigt“, Links im Navy-Feld |
| Navy-Beschriftung `--navy-label` | `#C9CEEA` | „MITTWOCH“, Adresse im Datumsfeld |
| Dunkelblau `--primary` | `#1A3569` | Überschriften, Hauptknöpfe (Hauptseite) |
| Blau `--secondary` | `#3C59AD` | Icons, Rahmen-Knöpfe, Akzentlinien, Häkchen |
| Gelb-Orange `--orange` | `#f0a63a` | Pill „Die Teilnahme am Infoabend ist kostenlos.“ im Kopfbereich (Navy-Schrift, seit Nov. 2026, vorher Gold) und „Persönliche Beratung buchen“ in Mails (der pulsierende Knopf „Jetzt Platz sichern“ ist entfernt); Schrift darauf dunkel (`#1a1206` bzw. Navy) |
| Text `--text` | `#191919` | Fließtext |
| Grau-Blau `--muted` | `#7C829A` | Kleingedrucktes, Hinweise, „optional“ |
| Hellgrau-Blau `--light` | `#F0F2F9` | Abschnitt „Jetzt anmelden“, Kästen, Adress-Klappfeld, Mail-Hintergrund |
| Verlauf (Abschnitt Festhalle) | `linear-gradient(118deg, #3C59AD 19.71%, #1A3569 77.03%)` | wie Hauptseite |
| Überschriften-Verlauf `.h2-alt-text` | `#1a3569 → #6c82c1` | zweiter Teil von H2, z. B. „Jetzt **anmelden**“ |

## Schrift

- **Raleway** 400/500/600/700/800, lokal in `public/assets/fonts/` (keine Google-Fonts-Verbindung → datenschutzfreundlich).
- Zahlen mit `font-variant-numeric: lining-nums` (Raleway hat sonst „hüpfende“ Ziffern).
- Hero-Titel 78 px / 800 (Handy 38 px), H2 52 px / 400 mit `.h2-alt-text` in 600, H3 24 px / 700.
- Datum im Datumsfeld 84 px / 700 Gold, Wochentag 20 px Versalien mit Sperrung `.16em`.

## Bausteine der Seite

| Baustein | So sieht er aus |
|---|---|
| **Kopf** | nur Logo (weiß) links; kein Menü, **kein Knopf „Persönliche Beratung buchen“ mehr** (Wunsch Nov. 2026, auch nicht auf `/datenschutz`). In den Mails und auf `/absagen` bleibt der Knopf |
| **Hero** | Logo-Blau, Hausfoto rechts mit Blau-Verlauf (Plakat-Stil), großer Titel, Untertitel, (Schild „Noch … Plätze frei“, falls eingeschaltet), **orange** Pill „kostenlos“. **Eng gesetzt** (Wunsch Nov. 2026): Titel → Untertitel 16 px, → Pill 20 px, Pill → Datumsfeld ca. 30 px, Datumsfeld → „Jetzt anmelden“ ca. 45 px. **Kein Knopf „Jetzt Platz sichern“ mehr** (Wunsch Nov. 2026 – Formular steht direkt unter dem Datumsfeld) |
| **Datumsfeld** | Navy, Radius 28 px, Schatten; Wochentag, Gold-Datum, Trennlinie, Einlass + Ort (Ort klickbar → Auswahl Google Maps / Apple Karten); rechts daneben das Siegel „Kundenliebling 2026“ **genau so hoch wie das Datumsfeld**; **Handy:** Siegel klein (124 px hoch) in der rechten unteren Ecke im Datumsfeld neben der Adresse (stand vorher allein darunter) |
| **Freie Plätze** | Schild unter dem Untertitel (früher neben „Jetzt Platz sichern“): Navy halbdurchsichtig, Pillen-Form, Gold-Punkt blinkt („live“), „Noch **117** Plätze frei“ (Zahl Gold, fett) **in einer Zeile**, auch am Handy; voll: „Ausgebucht – Warteliste offen“; Anmeldung zu: ausgeblendet; **Schalter „Freie Plätze auf der Seite anzeigen“ in `/admin` aus:** Schild weg (außer „Ausgebucht – Warteliste offen“), über dem Formular keine Zeile. Grund: im Zahlen-Streifen wurde die Zahl übersehen |
| **Zahlen-Streifen** | **entfernt** (Wunsch Niklas, 25.10.): weder „Personen bereits angemeldet“ noch Countdown „Tage bis zum Infoabend“. Unter dem Datumsfeld folgt direkt der nächste Abschnitt. Die echte Zahl steht nur im kleinen Zähler neben dem Schloss unten rechts |
| **Inhaltsblöcke** | weiß, Bild + Text zweispaltig, Eyebrow-Pill (hellgrau, blaue Schrift) über H2 |
| **Festhalle** | Blau-Verlauf, Gradient-Pill, „Route planen“ |
| **Anmeldung** | hellgrauer Abschnitt, **genau so breit wie Datumsfeld + Siegel darüber** (normaler `.container`, linke und rechte Kante bündig – Wunsch Nov. 2026, vorher max. 1200 px und dadurch eingerückt); Formular als weiße Karte (Radius 24 px, weicher Schatten); Felder 2-spaltig, alle gleich hoch (auch das Auswahlfeld) |
| **Seitenaufbau** | Hero → Datumsfeld → **direkt darunter „Jetzt anmelden“ mit Formular** (gleicher hellgrauer Grund, nur 24 px Abstand) → Baufinanzierer (Foto) → Notar → Festhalle (Wunsch Nov. 2026: Formular nicht mehr ganz unten) |
| **Formular-Reihenfolge** | Name, E-Mail, Telefon → „Adresse ergänzen“ (Klappfeld) → Anzahl Begleitpersonen mit den Namensfeldern direkt darunter → Fragen vorab → Datenschutz-Häkchen (nennt auch die Erinnerungs-Mails) → Knopf. **Keine Hinweise „Erinnerung:“ und „Fotos/Videos“ mehr unter dem Häkchen** (Wunsch Nov. 2026: Formular schmal halten; beides steht in `/datenschutz` und in der Bestätigungs-Mail). Kein eigenes Häkchen für Erinnerungen (Wunsch: alles in einem). Am Computer Name/E-Mail nebeneinander, Telefon und Begleitpersonen-Auswahl je volle Breite |
| **Abgeschaltet (Nov. 2026)** | „Adresse ergänzen“ und „Ihre Fragen vorab“ sind ausgeblendet (`<fieldset class="form-off" hidden disabled>` in `index.html`) – Formular jetzt nur Name, E-Mail, Telefon, Begleitpersonen, Datenschutz-Häkchen, Knopf. Felder bleiben im Code (app.js/Server brauchen sie, bleiben leer); wieder einschalten = `hidden disabled` entfernen |
| **Kein Satz „Die Plätze sind begrenzt …“** | unter „Jetzt anmelden“ entfernt (Wunsch Nov. 2026) – direkt darunter nur noch die blaue Zeile `#seat-hint` „Noch … Plätze frei“ – **nur wenn freie Plätze in `/admin` eingeschaltet**, sonst ganz weg. **Kein „max. … Begleitpersonen“ mehr** (Wunsch Nov. 2026; die Auswahl „Anzahl Begleitpersonen“ zeigt die Grenze). Ausgebucht/geschlossen: Hinweistext wie bisher |
| **Begleitung** | Auswahl „Anzahl Begleitpersonen“: Keine / 1 Begleitperson / … (intern Plätze = Anmelder + Begleitung, max. aus `/admin` minus 1), darunter je ein Namensfeld |
| **Aufnahmen-Hinweis** | **nicht mehr im Formular** (Wunsch Nov. 2026). Ausführlich in der Bestätigungs-Mail (Abschnitt „Fotos, Video & Ton am Abend“ nach „Gut zu wissen“) und in `/datenschutz#aufnahmen` |
| **Adresse** | Klappfeld (hellgrau hinterlegt, kein gestrichelter Rahmen) mit rundem „+“, „Adresse ergänzen“ und daneben klein „optional“ (wie bei „Ihre Fragen vorab“; Erklärsatz auf Wunsch entfernt) |
| **Erfolgsmeldung** | weiße Karte wie das Formular (Radius 24 px, weicher Schatten), oben runder blauer Kreis mit weißem Häkchen (Warteliste: Gold-Kreis mit Uhr) – **keine farbige Linie links** (bog sich an der runden Ecke krumm), ein Knopf „Termin in den Kalender eintragen“ (`/kalender` erkennt das Gerät) |
| **Fuß** | 1:1 Hauptseite, ohne Menü; Impressum, Datenschutz, Cookie-Einstellungen |
| **Einwilligungs-Hinweis** | weiße Karte unten (Google Ads, ggf. Meta-Pixel), „Ablehnen“ und „Erlauben“ **gleich groß und gleich gestaltet** (rechtlich wichtig) |
| **Zugang Verwaltung** | kleines Schloss ganz unten rechts in der Fußzeile, 15 % Deckkraft (beim Darüberfahren 70 %), Tippfläche 36 px → `/admin`. **Bleibt – ausdrücklicher Wunsch von Niklas** (wurde einmal versehentlich entfernt) |
| **Geheimer Zähler** | kleine Zahl (13 px halbfett, volles Grau `--muted` wie die Fußzeilen-Links – deutlicher als das Schloss) direkt links neben dem Schloss: echte gebuchte Plätze, ohne Beschriftung – nur für Eingeweihte |

Knöpfe: Pillen-Form (Radius 120 px), fett. Hauptknopf Dunkelblau mit rundem Icon-Kreis; Rahmen-Knopf
blau umrandet. Orange nur für die eine wichtigste Handlung.

## E-Mails (`netlify/lib/mail.mjs`)

- **Eine Mail, kein Anhang.** Tabellen-Layout + Inline-Styles (hält in Outlook/Gmail), max. 600 px, Radius 18 px.
- Aufbau Bestätigung: Logo-Blau-Kopf mit Logo (170 px) → Gold-Etikett „✓ Anmeldung bestätigt“ →
  **„Herzlich willkommen, Vorname!“** → Zeile „Wir freuen uns, Sie beim Infoabend … begrüßen zu dürfen.“ →
  **Navy-Bestätigungskarte** (Reserviert für · Plätze · Begleitung, gestrichelte Trennlinie, Gold-Datum,
  Einlass/Beginn, Ort, Route-Links in Gold) → weißer Teil: kurzer Dank, ein Knopf „Termin in den Kalender
  eintragen“, „Gut zu wissen“ mit goldenen Punkten, Abschnitt „Fotos, Video & Ton am Abend“ (was, wofür, Widerspruch beim Einlass oder per Antwort, Link Datenschutz), hellgrauer Kasten mit orangem „Persönliche Beratung buchen“
  → Navy-Fuß mit Adresse, Telefon, Impressum, Datenschutz.
- **Keine Kopie der Seite** – die Mail ist eine Bestätigung im Design, keine Wiederholung der Seitentexte.
- Betreff: „Ihr Sitzplatz ist gesichert!“ · keine Ticketnummer.
- Von der Warteliste nachgerückt: gleiche Mail, Etikett „✓ Platz frei geworden“, erster Satz „gute Nachricht: Für Sie
  ist ein Platz frei geworden!“, Betreff „Gute Nachricht: Ihr Sitzplatz ist gesichert!“.
- Freie Plätze (Schild im Kopfbereich): „Noch 120 Plätze frei“ – **ohne „von 400“**, die echte Gesamtzahl steht nie auf der Seite.
  Nach einem Nachschub steht über dem Formular „Weitere Plätze freigegeben: Noch 119 Plätze frei …“ (gleicher Stil wie der Hinweis).
- Anrede: Vorname; bei „Herr/Frau/Dr./Familie“ oder Initiale („S. Salentin“) der volle Name.
- **Platz hinzugefügt** (nach „Plätze ändern“ in `/admin`, Häkchen „Gast per E-Mail informieren“): **nur die Änderung, nichts
  wiederholen** (Wunsch Niklas, 30.10.) – Logo-Blau-Kopf mit Gold-Etikett „✓ Platz hinzugefügt“, Überschrift „Ein weiterer Platz für Sie,
  Vorname!“, Zeile „Infoabend am Mittwoch, 9. Dezember 2026 · Festhalle Birkesdorf“, dann zwei Sätze („wir haben Ihrer Anmeldung einen
  weiteren Platz hinzugefügt. Reserviert sind jetzt **3 Plätze** – für Sie mit Peter Muster und Lena Muster.“) und der Gruß.
  **Keine** Navy-Karte, kein Kalender-Knopf, kein „Gut zu wissen“. Betreff „Ein weiterer Platz für Sie – Infoabend Baufinanz Düren“
  (2 Plätze mehr: „2 weitere Plätze für Sie“, weniger: „Ihre Anmeldung ist aktualisiert“). Funktion `seatChangeHtml`; von Niklas freigegeben
  am 30.10. (`mailStatus.aenderung`).
- **Erinnerungs-Mails** (zwei Wochen, eine Woche vorher, Vortag – an alle bestätigten Gäste, abbestellbar): gleicher Rahmen und gleiche Navy-Karte wie die
  Bestätigung, Gold-Etikett „Erinnerung“, Überschrift „Noch zwei Wochen, …“ / „Nur noch eine Woche, Vorname!“ / „Morgen ist es so weit, Vorname!“,
  Kalender-Knopf nicht in der Vortags-Mail, optional **Zusatzinfo-Kasten** (Navy, Gold-Pill mit Titel, weißer Text) vor „Gut zu wissen“, „Gut zu wissen“, hellgrauer Kasten „Sie können doch nicht kommen?“ mit weißem
  Knopf „Termin absagen“ (bewusst nicht Orange – Absagen ist nicht die Haupthandlung), ganz unten klein „Hier abbestellen“.
  **Kein Newsletter, keine Werbung** (kein „Beratung buchen“) – nur die Erinnerung an den Abend.
- Seiten `/absagen` und `/erinnerung-abbestellen`: wie `/datenschutz` (blauer Kopf mit Logo, weiß), Buchung im hellgrauen
  Kasten, Knöpfe ohne Karte; der Link allein ändert nichts, erst der Knopf (Mailprogramme öffnen Links vorab zur Prüfung).
- Interne Update-Mail zu den Anmeldungen (Empfänger/Häufigkeit/Uhrzeit in `/admin`): gleiche Farben, schlicht, Kacheln „gebuchte Plätze“, „neu gebuchte Plätze“, „Plätze auf der Warteliste“ (alles in Plätzen, auch Überschrift und Betreff, z. B. „1 Platz nachgebucht“) + Tabellen „Neue Anmeldungen“, „Absagen“, „Von der Warteliste nachgerückt“, „Plätze nachgebucht / geändert“ (vorher → jetzt).

## Verwaltung `/admin`

- **Fenster „Plätze ändern“** (Knopf in jeder Zeile der Anmeldeliste): weißes Fenster (Radius wie die Kästen, Navy-Schleier dahinter),
  Platzzahl mit runden **−**/**+**-Knöpfen, darunter je Begleitperson ein Namensfeld, darunter ein Kasten, der live vorrechnet
  (hellgrau = in Ordnung, Orange-Ton = über dem Maximum pro Person, Rot-Ton = nicht genug frei → Speichern gesperrt).
  Unter der Platzzahl in der Liste klein in Blau „geändert: 2 → 3 (30.10.)“.

## Handy & Browser – gelernte Fallstricke

- **Leiste oben (Safari/iPhone):** nur blau, solange der blaue Kopfbereich oben ist, sonst weiß; am Computer
  nie blau (`public/topbar.js` + zwei `theme-color`-Metas). Grund: sonst weißer Streifen über dem Hero bzw.
  blauer Schatten über weißen Abschnitten.
- `viewport-fit=cover` und `env(safe-area-inset-*)` für die iPhone-Kerbe.
- **Favicon:** volle Fläche, keine durchsichtigen Ecken (wurden als weiße Ecken angezeigt) – weiß mit
  blauem Haus, im Browser leicht abgerundet; Datei-Version `?v=2` anhängen, sonst bleibt das alte im Cache.
- Bewegung (Puls) aus, wenn das Gerät „Bewegung reduzieren“ eingestellt hat.
- **Bilder immer mit `width`/`height`** im HTML (echte Pixelmaße der Datei): Ohne sie haben nachgeladene Bilder
  (`loading="lazy"`) erst keine Höhe, die Seite wächst beim Laden um ~1000 px und springt nach dem Neuladen an eine
  falsche Stelle (z. B. zum Notar-Abschnitt).
- **Keine `#anmeldung` in der Adresse:** Das Siegel (und jeder Link auf `#anmeldung`) scrollt per JavaScript weich zur
  Anmeldung (`public/app.js`), sonst springt die Seite nach jedem Neuladen dorthin.

## Arbeitsweise bei Design-Wünschen

- Vorher/Nachher als Screenshot zeigen (Handy 390 px und Computer 1440 px), dann veröffentlichen.
- Texte aus der Inhalts-Checkliste nur auf Wunsch ändern; Ansprache „Sie“; einfache Worte.
- Weniger ist mehr: Wünsche bisher waren fast immer „das kann weg“ (Menü, doppelte Knöpfe, Infomaterial,
  Begleitungs-Häkchen, „Route starten“) und „ein Knopf für alles“.
