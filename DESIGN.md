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
| Gold `--gold` | `#D9B56C` | Datum, Pill „Die Teilnahme … ist kostenlos.“, Etikett „✓ Anmeldung bestätigt“, Links im Navy-Feld |
| Navy-Beschriftung `--navy-label` | `#C9CEEA` | „MITTWOCH“, Adresse im Datumsfeld |
| Dunkelblau `--primary` | `#1A3569` | Überschriften, Hauptknöpfe (Hauptseite) |
| Blau `--secondary` | `#3C59AD` | Icons, Rahmen-Knöpfe, Akzentlinien, Häkchen |
| Gelb-Orange `--orange` | `#f0a63a` | **nur** „Jetzt Platz sichern“ (pulsiert) und „Persönliche Beratung buchen“ in Mails; Schrift darauf dunkel (`#1a1206` bzw. Navy) |
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
| **Kopf** | nur Logo (weiß) links und rechts dezent „Persönliche Beratung buchen ↗“ (Rahmen-Knopf, weiß); kein Menü |
| **Hero** | Logo-Blau, Hausfoto rechts mit Blau-Verlauf (Plakat-Stil), großer Titel, Untertitel, oranger pulsierender Knopf „Jetzt Platz sichern ↓“, darunter goldene Pill |
| **Datumsfeld** | Navy, Radius 28 px, Schatten; Wochentag, Gold-Datum, Trennlinie, Einlass + Ort (Ort klickbar → Auswahl Google Maps / Apple Karten); rechts daneben das Siegel „Kundenliebling 2026“ **genau so hoch wie das Datumsfeld**; **Handy:** Siegel klein (124 px hoch) in der rechten unteren Ecke im Datumsfeld neben der Adresse (stand vorher allein darunter) |
| **Freie Plätze** | Schild direkt neben „Jetzt Platz sichern“: Navy halbdurchsichtig, Pillen-Form, Gold-Punkt blinkt („live“), „Noch **117** Plätze frei“ (Zahl Gold, fett), **gleich hoch und gleiche Schrift wie der Knopf** (62 px, 18 px fett); **Handy:** kompakt rechts neben dem Knopf in zwei Zeilen „Noch 117“ / „Plätze frei“, Punkt oben am Rand; unter 420 px Breite Knopf und Schild etwas kleiner (60 px), damit beide in eine Zeile passen; voll: „Ausgebucht – Warteliste offen“; Anmeldung zu: ausgeblendet; **Schalter „Freie Plätze auf der Seite anzeigen“ in `/admin` aus:** Schild weg (außer „Ausgebucht – Warteliste offen“), über dem Formular nur „Max. 3 Begleitpersonen pro Anmeldung“. Grund: im Zahlen-Streifen wurde die Zahl übersehen |
| **Zahlen-Streifen** | nur noch „Personen bereits angemeldet“ (erst ab 10; vorher ausgeblendet ohne Leerfläche). Countdown „Tage bis zum Infoabend“ entfernt (Wunsch) |
| **Inhaltsblöcke** | weiß, Bild + Text zweispaltig, Eyebrow-Pill (hellgrau, blaue Schrift) über H2 |
| **Festhalle** | Blau-Verlauf, Gradient-Pill, „Route planen“ |
| **Anmeldung** | hellgrauer Abschnitt, max. 1200 px breit; Formular als weiße Karte (Radius 24 px, weicher Schatten); Felder 2-spaltig, alle gleich hoch (auch das Auswahlfeld) |
| **Formular-Reihenfolge** | Name, E-Mail, Telefon → „Adresse ergänzen“ (Klappfeld) → Anzahl Begleitpersonen mit den Namensfeldern direkt darunter → Fragen vorab → Datenschutz-Häkchen (nennt auch die Erinnerungs-Mails) + Hinweis „Erinnerung:“ + Satz „Übrigens: … Fotos und Videos“ → Knopf. Kein eigenes Häkchen für Erinnerungen (Wunsch: alles in einem). Am Computer Name/E-Mail nebeneinander, Telefon und Begleitpersonen-Auswahl je volle Breite |
| **Begleitung** | Auswahl „Anzahl Begleitpersonen“: Keine / 1 Begleitperson / … (intern Plätze = Anmelder + Begleitung, max. aus `/admin` minus 1), darunter je ein Namensfeld |
| **Aufnahmen-Hinweis** | bewusst zurückhaltend (Wunsch, Okt. 2026): Datenschutz-Häkchen ohne Aufnahmen-Zusatz, darunter eingerückt, klein (13 px, Grau-Blau) nur ein Satz „Übrigens: Am Abend entstehen Fotos und Videos – mehr dazu in Ihrer Bestätigungs-Mail und hier.“ (Link → `/datenschutz#aufnahmen`). Ausführlich steht es in der Bestätigungs-Mail als eigener Abschnitt „Fotos, Video & Ton am Abend“ nach „Gut zu wissen“ |
| **Adresse** | Klappfeld (hellgrau hinterlegt, kein gestrichelter Rahmen) mit rundem „+“, „Adresse ergänzen“ und daneben klein „optional“ (wie bei „Ihre Fragen vorab“; Erklärsatz auf Wunsch entfernt) |
| **Erfolgsmeldung** | weiße Karte wie das Formular (Radius 24 px, weicher Schatten), oben runder blauer Kreis mit weißem Häkchen (Warteliste: Gold-Kreis mit Uhr) – **keine farbige Linie links** (bog sich an der runden Ecke krumm), ein Knopf „Termin in den Kalender eintragen“ (`/kalender` erkennt das Gerät) |
| **Fuß** | 1:1 Hauptseite, ohne Menü; Impressum, Datenschutz, Cookie-Einstellungen |
| **Einwilligungs-Hinweis** | weiße Karte unten (Google Ads, ggf. Meta-Pixel), „Ablehnen“ und „Erlauben“ **gleich groß und gleich gestaltet** (rechtlich wichtig) |
| **Zugang Verwaltung** | kleines Schloss ganz unten rechts in der Fußzeile, 15 % Deckkraft (beim Darüberfahren 70 %), Tippfläche 36 px → `/admin`. **Bleibt – ausdrücklicher Wunsch von Niklas** (wurde einmal versehentlich entfernt) |

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
- Freie Plätze (Schild neben „Jetzt Platz sichern“): „Noch 120 Plätze frei“ – **ohne „von 400“**, die echte Gesamtzahl steht nie auf der Seite.
  Nach einem Nachschub steht über dem Formular „Weitere Plätze freigegeben: Noch 119 Plätze frei …“ (gleicher Stil wie der Hinweis).
- Anrede: Vorname; bei „Herr/Frau/Dr./Familie“ oder Initiale („S. Salentin“) der volle Name.
- **Erinnerungs-Mails** (zwei Wochen, eine Woche vorher, Vortag – an alle bestätigten Gäste, abbestellbar): gleicher Rahmen und gleiche Navy-Karte wie die
  Bestätigung, Gold-Etikett „Erinnerung“, Überschrift „Noch zwei Wochen, …“ / „Nur noch eine Woche, Vorname!“ / „Morgen ist es so weit, Vorname!“,
  Kalender-Knopf nicht in der Vortags-Mail, optional **Zusatzinfo-Kasten** (Navy, Gold-Pill mit Titel, weißer Text) vor „Gut zu wissen“, „Gut zu wissen“, hellgrauer Kasten „Sie können doch nicht kommen?“ mit weißem
  Knopf „Termin absagen“ (bewusst nicht Orange – Absagen ist nicht die Haupthandlung), ganz unten klein „Hier abbestellen“.
  **Kein Newsletter, keine Werbung** (kein „Beratung buchen“) – nur die Erinnerung an den Abend.
- Seiten `/absagen` und `/erinnerung-abbestellen`: wie `/datenschutz` (blauer Kopf mit Logo, weiß), Buchung im hellgrauen
  Kasten, Knöpfe ohne Karte; der Link allein ändert nichts, erst der Knopf (Mailprogramme öffnen Links vorab zur Prüfung).
- Interne Abend-Zusammenfassung (20 Uhr an info@): gleiche Farben, schlicht, Kennzahl-Kästen + Tabelle.

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
- **Keine `#anmeldung` in der Adresse:** „Jetzt Platz sichern“ und das Siegel scrollen per JavaScript weich zur
  Anmeldung (`public/app.js`), sonst springt die Seite nach jedem Neuladen dorthin.

## Arbeitsweise bei Design-Wünschen

- Vorher/Nachher als Screenshot zeigen (Handy 390 px und Computer 1440 px), dann veröffentlichen.
- Texte aus der Inhalts-Checkliste nur auf Wunsch ändern; Ansprache „Sie“; einfache Worte.
- Weniger ist mehr: Wünsche bisher waren fast immer „das kann weg“ (Menü, doppelte Knöpfe, Infomaterial,
  Begleitungs-Häkchen, „Route starten“) und „ein Knopf für alles“.
