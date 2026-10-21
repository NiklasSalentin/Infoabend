# Anmeldung Infoabend – anmeldung.baufinanz-dueren.de

Anmeldeseite für den Infoabend **„Wie können wir uns heute noch ein Eigenheim leisten?“** am
**Mittwoch, 9. Dezember 2026** in der Festhalle Birkesdorf.

**So läuft eine Anmeldung ab – ein Beispiel:**

1. Frau Müller scannt den QR-Code auf dem **Flyer** → `anmeldung.baufinanz-dueren.de/flyer`
2. Sie landet auf der Anmeldeseite (im Hintergrund wird „Quelle: flyer“ gemerkt).
3. Sie bucht **2 Plätze** (sich + Begleitung „Herr Müller“).
4. Sofort danach bekommt sie eine **Bestätigungs-Mail** im Plakat-Design mit allen Infos und Kalendereintrag.
5. In der Verwaltung (`/admin`) steht sie mit 2 Plätzen und der Quelle „flyer“. Abends um 20 Uhr
   bekommt info@ eine **Zusammenfassung** aller neuen Anmeldungen des Tages (nur an Tagen mit neuen Anmeldungen).
6. Will sie sich mit derselben E-Mail-Adresse noch einmal anmelden, kommt:
   *„Mit dieser E-Mail-Adresse wurde bereits eine Anmeldung vorgenommen.“*

## Die Seiten

| Adresse | Für wen | Was passiert dort |
|---|---|---|
| `anmeldung.baufinanz-dueren.de/` | Besucher | Infos zum Abend, Countdown, „Noch 37 Plätze frei“ (Kontingent, siehe unten), Anmeldeformular, Knopf **Termin vereinbaren** (→ baufinanz-dueren.de/kontakt) |
| `…/zeitung`, `…/flyer`, `…/plakat` | QR-Codes | Kurzlinks: leiten auf die Anmeldeseite weiter und merken sich den Werbekanal |
| `…/admin` | Team (Passwort) | Plätze einstellen, Anmeldeliste, Warteliste, Nachrücken, Stornieren, CSV-Export |

## Einrichtung in 7 Schritten

### 1. Datenspeicher – nichts zu tun

Anmeldungen, Einstellungen und Besucherzahlen liegen im **Netlify-eigenen Speicher**
(„Netlify Blobs“) des Projekts `baufiabend`. Kein extra Konto, keine Zugangsdaten – der Speicher
entsteht automatisch bei der ersten Anmeldung bzw. beim ersten Speichern in `/admin`.

- **Daten ansehen/sichern:** in `/admin` (Tabellen + **CSV exportieren**). Zusätzlich im Netlify-
  Dashboard unter *Blobs* → Speicher **infoabend**.
- **Was dort liegt – Beispiel:**

  | Eintrag | Inhalt |
  |---|---|
  | `event` | Einstellungen (Plätze, Max. pro Person, offen/zu) und alle Anmeldungen |
  | `stats` | Summen des Besucherzählers (gesamt und je Tag) |
  | `visitors/3f9a…` | ein Eintrag je IP-Adresse – nur ein unumkehrbarer Code, keine IP |
  | `salt` | zufälliger Geheimwert für diesen Code |

- **Keine Überbuchung:** Gespeichert wird nur, wenn sich der Eintrag seit dem Lesen nicht
  verändert hat; sonst wird automatisch neu gelesen und noch einmal versucht. Melden sich zwei
  Personen in derselben Sekunde für den letzten Platz an, bekommt ihn genau eine – die andere
  landet auf der Warteliste.
- ⚠️ Den Speicher **nicht** im Netlify-Dashboard löschen – sonst sind alle Anmeldungen weg.
  Vor dem Abend sicherheitshalber die CSV exportieren.

### 2. E-Mail-Postfach (Strato)

Die Mails gehen über das Strato-Postfach **`info@baufinanz-dueren.de`** raus
(Server `smtp.strato.de`, Port `465` – im Code als Standard hinterlegt). In Netlify muss dafür nur
das **Passwort dieses Postfachs** als `SMTP_PASS` stehen. Strato signiert die Mails (DKIM), die Domain
weist gefälschte Absender ab (DMARC) – so landen die Mails nicht im Spam.

Anderes Postfach/anderer Anbieter? Dann zusätzlich `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` und `MAIL_FROM`
setzen (z. B. IONOS: `smtp.ionos.de` / `587`).

### 3. Umgebungsvariablen in Netlify setzen

Das Netlify-Projekt ist **`baufiabend`** (live unter https://anmeldung.baufinanz-dueren.de) →
https://app.netlify.com/projects/baufiabend

Dort unter **Project configuration → Environment variables**:

| Variable | Beispiel | Pflicht? |
|---|---|---|
| `SMTP_PASS` | Passwort des Postfachs `info@baufinanz-dueren.de` | ja – **Secret** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `MAIL_FROM` | `smtp.strato.de`, `465`, `info@…` | optional – nur bei anderem Postfach |
| `ADMIN_PASSWORD` | mind. 12 Zeichen, z. B. drei zufällige Wörter: `Kompass-Laterne-Rübe-47` | ja – **Secret** |
| `SITE_URL` | `https://anmeldung.baufinanz-dueren.de` | optional – sonst gilt automatisch die Hauptadresse des Netlify-Projekts |

Geheime Werte mit **„Contains secret values“** und den Bereichen *Builds, Functions, Runtime* anlegen
(nur „Functions“ reicht bei geheimen Werten nicht – die Variable kommt dann nicht an).
Eine Vorlage aller Variablen steht in [`.env.example`](.env.example). Nach jeder Änderung einmal
**Deploys → Trigger deploy**, damit die Werte greifen.

### 4. Mit GitHub verbinden (= veröffentlichen)

Einmalig in Netlify: **Project configuration → Build & deploy → Continuous deployment →
Link repository** → GitHub → **`NiklasSalentin/Infoabend`**

- Branch: **`claude/relaxed-cannon-2kqiie`** (bzw. `main`, sobald dorthin übernommen)
- Build command: **leer lassen**, Publish directory: `public` (steht schon in `netlify.toml`)

Danach veröffentlicht **jeder Push automatisch**. Alternativ von Hand mit der Netlify-CLI:

```bash
npx netlify-cli login
npx netlify-cli link --id 9e41c7d7-8946-4af6-a64a-9931cea7c24d
npx netlify-cli deploy --prod
```

### 5. Eigene Adresse anmeldung.baufinanz-dueren.de

1. **Bei Netlify:** *Domain management → Add a domain* → `anmeldung.baufinanz-dueren.de` eintragen.
2. **Beim DNS-Anbieter von `baufinanz-dueren.de`** einen CNAME-Eintrag anlegen:

   | Typ | Name / Host | Ziel / Wert |
   |---|---|---|
   | `CNAME` | `anmeldung` | `baufiabend.netlify.app` |

3. Warten (meist Minuten, selten bis 24 Stunden). Das HTTPS-Zertifikat richtet Netlify
   automatisch ein.

### 6. Besucherzähler (eingebaut, ohne Cookies)

Nichts einzurichten. In `/admin` im Kasten **Besucher** stehen:

- **Besucher gesamt** – jede IP-Adresse zählt genau einmal (Beispiel: Frau Müller öffnet die Seite 5× mit
  derselben IP → 1 Besucherin).
- **Neue Besucher heute** und eine Liste **nach Tag**.

Gespeichert wird nur ein unumkehrbarer Code der IP-Adresse (keine IP, kein Cookie). Suchmaschinen-Roboter
zählen nicht. **Zahlen zurücksetzen** setzt alles auf null (z. B. nach eigenen Tests vor dem Start).

### 7a. Google Ads – Conversion „Anmeldung Infoabend“ (eingebaut)

Bereits eingerichtet für das Google-Ads-Konto **AW-17036255610**, Conversion-Aktion „Anmeldung Infoabend“
(Label `1lhoCPqMrqEdEPrCwrs_`, steht in `netlify/functions/config.mjs`; per Netlify `GOOGLE_ADS_ID` /
`GOOGLE_ADS_LABEL` änderbar, `GOOGLE_ADS_ID=off` schaltet ab).

- Der Google-Tag lädt **erst nach „Erlauben“** im Hinweis unten (Consent Mode v2, Einwilligung „granted“).
- Die Conversion wird **nur nach einer bestätigten Anmeldung** gemeldet (Erfolgsmeldung auf derselben Seite,
  „Variante B“) – nicht beim Öffnen und nicht bei Warteliste.
- Datenschutzhinweise Abschnitt 8 sind ergänzt.

**Testen:** Seite mit `?gclid=test` öffnen → „Erlauben“ → Testanmeldung absenden → mit der Chrome-Erweiterung
„Google Tag Assistant“ prüfen, ob `AW-17036255610` und das Conversion-Ereignis feuern → Testanmeldung in
`/admin` stornieren und löschen. Nach 24–48 Stunden zeigt Google Ads unter **Ziele → Conversions** „Aktiv“.

Wichtig: Google zählt nur Besucher, die „Erlauben“ geklickt haben – die echte Zahl steht in `/admin`.

### 7. Meta-Pixel (Facebook-/Instagram-Werbung) einrichten

Mit dem Pixel sieht Meta, wer nach einer Anzeige auf die Seite kommt und sich anmeldet – damit lassen sich
Anzeigen auf Anmeldungen optimieren und erneut an Seitenbesucher ausspielen. **Eingebaut ist alles**, es fehlt
nur die Pixel-Nummer.

Rechtlich läuft der Pixel nur mit Einwilligung: Besucher sehen unten einen Hinweis mit **„Erlauben“ /
„Ablehnen“**; erst nach „Erlauben“ wird der Pixel geladen. Widerruf jederzeit über **Cookie-Einstellungen** im
Fuß der Seite. Die Datenschutzhinweise (Abschnitt 8) sind schon angepasst.

**Stand 14.10.2026: eingerichtet** mit dem Pixel von baufinanz-dueren.de (ID `1759216724481642`, steht in Netlify
unter `META_PIXEL_ID`). Die Schritte unten sind zum Nachschlagen, z. B. bei einem Pixel-Wechsel.

**Schritt 1 – Pixel-ID des bestehenden Pixels holen (2 Min.)**
**Keinen neuen Pixel anlegen** – wir nutzen denselben Pixel wie baufinanz-dueren.de. So laufen alle Daten und
Zielgruppen (z. B. „hat die Hauptseite besucht“) zusammen.
1. https://business.facebook.com/events_manager2 öffnen und das Unternehmensportfolio **Baufinanz Düren** wählen.
2. Links den Pixel von baufinanz-dueren.de anklicken. Darunter bzw. in den Einstellungen steht die **Pixel-ID**
   (heißt teils „Datensatz-ID“), eine 15–16-stellige Zahl, z. B. `123456789012345`. Kopieren.
3. Hat man nur den Basiscode („Code manuell installieren“): die Zahl steht darin bei `fbq('init', '…')`.
   Den Code selbst **nicht** in die Seite kopieren – er würde ohne Einwilligung laden. `consent.js` enthält
   denselben Code und startet ihn erst nach „Erlauben“.

**Schritt 2 – Nummer in Netlify eintragen (2 Min.)**
1. https://app.netlify.com/projects/baufiabend/configuration/env → **Add a variable**.
2. Key: `META_PIXEL_ID` · Value: die Pixel-ID (kein Geheimnis, Häkchen „secret“ nicht nötig).
3. **Deploys → Trigger deploy → Deploy project**. Nach 1–2 Minuten erscheint der Hinweis auf der Seite.
   (Alternativ: die ID an Claude schicken – Claude trägt sie ein.)

**Schritt 3 – Domain prüfen**
baufinanz-dueren.de ist bei Meta bereits bestätigt (im DNS steht ein `facebook-domain-verification`-Eintrag),
das gilt auch für `anmeldung.`. Kontrolle: Unternehmenseinstellungen → **Markensicherheit → Domains** –
dort sollte `baufinanz-dueren.de` mit grünem Haken stehen. Falls nicht: dort „Hinzufügen“ und der Anleitung folgen.

**Schritt 4 – Testen (5 Min.)**
1. Events Manager → Pixel wählen → Reiter **„Ereignisse testen“** → Adresse
   `https://anmeldung.baufinanz-dueren.de` eingeben → **„Website öffnen“**.
2. Auf der Seite **„Erlauben“** klicken → im Events Manager erscheint **„PageView“**.
3. Testanmeldung machen („Platz verbindlich reservieren“) → es erscheint **„Lead“** mit
   `content_name: Infoabend 09.12.2026` und `content_category: Anmeldung`.
   Wartelisten-Anmeldungen melden ebenfalls **„Lead“**, aber mit `content_category: Warteliste`.
4. Testanmeldung in `/admin` stornieren und löschen.

**Schritt 5 – Anzeige schalten (Beispiel)**
1. Werbeanzeigenmanager → **Erstellen** → Ziel **„Leads“** → Conversion-Ort **„Website“**.
2. Den Pixel von baufinanz-dueren.de und das Conversion-Ereignis **„Lead“** wählen.
3. Zielgruppe z. B. Standort **Düren + 25 km**, Alter 25–55, Budget z. B. **10 € pro Tag**, Laufzeit bis 8.12.2026.
4. Link der Anzeige: `https://anmeldung.baufinanz-dueren.de/?utm_source=facebook` – dann steht bei diesen
   Anmeldungen in `/admin` in der Spalte **Quelle** „facebook“.
5. Zusätzlich möglich: **Retargeting** – eine Zielgruppe „Besucher von anmeldung.baufinanz-dueren.de, aber kein
   Lead“ anlegen und diesen Personen eine Erinnerungs-Anzeige zeigen.

**Gut zu wissen:** Meta sieht nur Besucher, die „Erlauben“ geklickt haben. Beispiel: 100 Anmeldungen, davon
60 mit Einwilligung → Meta meldet etwa 60. Die echte Zahl steht immer in `/admin`.

## Bedienung im Alltag

### Plätze einstellen – `/admin`

Mit dem `ADMIN_PASSWORD` anmelden. Oben stehen die Einstellungen:

- **Plätze gesamt** – z. B. `120`
- **Max. Plätze pro Person** – z. B. `2`
- **Anmeldung geöffnet** – Häkchen weg = Formular verschwindet
- **Kontingent** – so viele freie Plätze zeigt die Seite höchstens, Grundeinstellung `120` (`0` = immer die echte Zahl)
- **Nachschub, wenn nur noch … angezeigt** – Grundeinstellung `30`: dann werden „weitere Plätze freigegeben“

**Beispiel mit 120 Plätzen und max. 2 pro Person:**

| Wer | bucht | Ergebnis | Anzeige danach |
|---|---|---|---|
| Person A | 2 Plätze | ✅ bestätigt, Bestätigungs-Mail | „Noch 118 Plätze frei“ |
| Person A nochmal | 1 Platz | ❌ „bereits angemeldet“ | unverändert |
| Person B | 3 Plätze | geht nicht – Auswahl endet bei 2 | – |
| … | … | Abend voll | „ausgebucht“ → Knopf „Auf die Warteliste setzen“ |
| Person Z | 2 Plätze | ⏳ Warteliste, Mail „Sie stehen auf der Warteliste“ | – |

Die Zahlen lassen sich jederzeit ändern – z. B. von 120 auf 150, wenn mehr Stühle in die
Festhalle passen. Stehen Leute auf der Warteliste, bekommen **sie** die neuen Plätze zuerst (siehe unten).

### Knappe Anzeige der freien Plätze (Kontingent)

Die Seite zeigt nicht alle echten Plätze, sondern ein kleines **Kontingent**. Jede Anmeldung senkt die
Anzeige um genau die gebuchten Plätze (120 frei, jemand bucht 2 → 118). Steht die Anzeige bei der
Nachschub-Zahl, springt sie zurück aufs Kontingent und über dem Formular steht kurz
„Weitere Plätze freigegeben“. Die Anzeige ist nie höher als die echte Zahl – im Endspurt steht dort
genau die echte Zahl, damit niemand einen freien Platz verpasst. Die echte Gesamtzahl (z. B. 400) steht
nirgends auf der Seite (auch nicht in `/api/status`), nur in `/admin`. Unter den Feldern rechnet `/admin`
beim Tippen ein Beispiel vor.

**Beispiel: 400 Plätze, Kontingent 120, Nachschub bei 30:**

| belegt | wirklich frei | Seite zeigt |
|---|---|---|
| 0 | 400 | 120 freie Plätze |
| 20 | 380 | 100 |
| 40 | 360 | 80 |
| 89 | 311 | 31 |
| 90 | 310 | 120 – „Weitere Plätze freigegeben“ |
| 180 | 220 | 120 – „Weitere Plätze freigegeben“ |
| 380 | 20 | 20 (echte Zahl) |
| 397 | 3 | 3 (echte Zahl) |
| 400 | 0 | ausgebucht → Knopf „Auf die Warteliste setzen“ |

Die Rechenregel steht in `public/plaetze.js`; `npm run check` prüft, dass die Anzeige nie höher als die
echte Zahl ist, bei jeder Anmeldung genau mitzählt und im Endspurt stimmt.

### Warteliste, Stornieren, Nachsenden

**Automatisch der Reihe nach:** Werden Plätze frei – weil Sie die Platzzahl erhöhen oder jemand
storniert wird –, gehen sie sofort an die Warteliste, in der Reihenfolge der Anmeldungen
(„Warteliste 1.“ ist als Nächstes dran). Passt jemand nicht mehr hinein (möchte 2 Plätze, nur 1 frei),
ist der Nächste dran, der passt. Vorher fragt `/admin` nach („Dafür rücken nach: …“), danach verschickt
`/admin` die Einladungen einzeln („Gute Nachricht: Ihr Sitzplatz ist gesichert!“).

Beispiele:
- Abend voll, 80 auf der Warteliste → Plätze von 200 auf 250 → die ersten 50 (bei je 1 Platz) rücken nach.
- 30 Plätze werden durch Absagen frei → die nächsten 30 auf der Warteliste rücken nach.

Bricht der Versand ab (z. B. Fenster geschlossen), steht oben ein Kasten „… noch keine Einladungs-Mail
bekommen“ mit dem Knopf **Einladungen jetzt verschicken**; in der Liste steht „nachgerückt · Einladung offen“.

In der Liste in `/admin` je Zeile:

- **Nachrücken** (bei Warteliste) – zieht genau diese Person vor (außer der Reihe), nur wenn genug
  Plätze frei sind; sie bekommt ihre Einladung per Mail.
- **Stornieren** – die Plätze werden sofort wieder frei und gehen der Reihe nach an die Warteliste.
- **Mail erneut** – schickt die Einladung noch einmal (z. B. „Mail nicht angekommen“).
- **Alle Anmeldungen löschen** (unten in `/admin`, nach dem Abend) – für die Speicherfrist aus den
  Datenschutzhinweisen; zur Bestätigung `LÖSCHEN` eintippen.
- **Löschen** (nur bei stornierten) – entfernt den Eintrag endgültig, z. B. Testanmeldungen.
- **CSV exportieren** – Liste für Excel (Stuhlplanung, Namensschilder).

Außerdem in `/admin`:

- **Besucher** – verschiedene IP-Adressen gesamt, heute und je Tag (siehe Schritt 6). **Zahlen zurücksetzen** setzt sie auf null, z. B. nach eigenen Tests vor dem
  Start; Anmeldungen bleiben.
- **Adressliste** – alle mit vollständiger Adresse (Straße, PLZ, Ort), ohne stornierte;
  **CSV exportieren** für Excel/Serienbrief.

### QR-Codes für den Druck

Fertig erzeugt in [`druck/qr-codes/`](druck/qr-codes/):

| Datei | Einsatz | führt auf |
|---|---|---|
| `qr-zeitung.svg/.png` | Zeitungsannonce | `anmeldung.baufinanz-dueren.de/zeitung` |
| `qr-flyer.svg/.png` | Flyer | `anmeldung.baufinanz-dueren.de/flyer` |
| `qr-plakat.svg/.png` | Einladungsplakat | `anmeldung.baufinanz-dueren.de/plakat` |
| `qr-allgemein.svg/.png` | alles andere (Social Media, Website) | `anmeldung.baufinanz-dueren.de` |

- **SVG** an Druckerei/Grafiker geben (Vektor, beliebig groß, gestochen scharf).
- **PNG** (2000 × 2000 px) für Word, Canva, PowerPoint.
- Größe: mindestens **2 × 2 cm**. Faustregel für Plakate: Leseabstand ÷ 10
  (aus 1 m Entfernung → 10 cm groß).
- Zum Eintippen ohne QR-Code reicht `anmeldung.baufinanz-dueren.de`.

**Neuer Werbekanal**, z. B. „radio“: in `netlify.toml` einen Block wie bei `/zeitung` ergänzen,
in `scripts/qr-codes.mjs` eine Zeile hinzufügen und `npm install && npm run qr` ausführen.

### Was Gäste per E-Mail bekommen

- **Eine Bestätigungs-Mail ohne Anhang** im Design von Plakat und Seite: Name, Plätze, Begleitung, Datum,
  Uhrzeit, Ort mit Route (Google Maps/Apple Karten), Ablauf (Teil 1 Finanzierung, Teil 2 Notar), Ankommen & Parken.
  Keine Ticketnummer – Gäste stehen mit Namen auf der Liste in `/admin`.
- **Ein Knopf „Termin in den Kalender eintragen“** (`/kalender`): erkennt das Gerät – iPhone, Mac,
  Outlook, Windows bekommen die Kalenderdatei (Ort + Adresse, Erinnerung am Vortag), Android und Gmail
  im Browser landen im Google Kalender mit fertig ausgefülltem Termin
- Knopf **Persönliche Beratung buchen**

**Erinnerungs-Mails – gehören zur Anmeldung, kein Newsletter.** Im Formular nennt das Datenschutz-Häkchen die
Erinnerungs-Mails mit, darunter steht ein kurzer Hinweis „Erinnerung: …“ (kein eigenes Häkchen). Alle bestätigten Gäste
bekommen automatisch:

| Wann | Mail |
|---|---|
| Mi, 25.11., ab 10 Uhr | „In zwei Wochen: Infoabend …“ (mit Kalender-Knopf, ggf. Zusatzinfo) |
| Mi, 2.12., ab 10 Uhr | „In einer Woche: Infoabend …“ (mit Kalender-Knopf, ggf. Zusatzinfo) |
| Di, 8.12., ab 10 Uhr | „Morgen ist es so weit: Infoabend …“ |

In jeder Erinnerung: Knopf **„Termin absagen“** und Link **„Hier abbestellen“**. Beispiel: Frau Müller klickt
„Termin absagen“ → Seite „Termin absagen?“ → „Ja, Platz freigeben“ → ihre 2 Plätze sind frei, die Warteliste rückt
nach und bekommt sofort die Einladung. In `/admin` steht bei ihr „Storniert · selbst abgesagt“, abends steht sie in der
Zusammenfassung an info@. Wer sich erst kurz vorher (unter 12 Stunden) anmeldet, bekommt die jeweilige Erinnerung nicht.
In `/admin` → **Erinnerungs-Mails**: wie viele Gäste sie bekommen, was verschickt ist, **Test an info@ schicken**;
je Anmeldung „✓ Erinnerung“ bzw. „✗ abbestellt“ und der Knopf **Erinnerung aus** (z. B. wenn jemand am Telefon darum bittet).
Termine und **Zusatzinfo** ändern: `netlify/lib/event.mjs` → `reminders`. Beispiel für den Kasten in der
Zwei-Wochen-Mail: `extra: { title: 'Ihre Fragen', text: 'Antworten Sie auf diese Mail – wir greifen Ihre Frage am Abend auf.' }`
(leer = kein Kasten; nur Infos zum Abend, keine Werbung). Versand läuft alle 10 Minuten in kleinen Portionen.

Apple Wallet und Google Wallet sind für später vorgesehen (Apple-Developer-Konto bzw.
Google-Wallet-Ausstellerkonto nötig).

## Vor dem Start testen (Checkliste aus dem Briefing)

- [ ] Testanmeldung mit eigener E-Mail: Mail da? Kalendereintrag (iPhone/Outlook und Google) klappt?
- [ ] Ohne Datenschutz-Häkchen lässt sich nicht absenden
- [ ] `/admin` → Erinnerungs-Mails → **Test an info@ schicken**: beide Erinnerungen ansehen, „Termin absagen“ anklicken (Test ändert nichts)
- [ ] Gleiche E-Mail zweimal → wird abgelehnt
- [ ] `/admin`: Testanmeldung sichtbar → **Stornieren** → **Löschen**, danach **Zahlen zurücksetzen**
- [ ] QR-Codes mit dem Handy scannen (alle vier)
- [ ] Auf dem Handy durchklicken (iPhone und Android)
- [ ] Plätze und Maximum pro Person in `/admin` final einstellen

## Technik in Kürze

```
public/                 Seite (HTML/CSS/JS), Verwaltung /admin, Bilder
netlify/functions/      register (Anmeldung), status (freie Plätze), admin, ics + kalender (Kalender), visit (Besucherzählung), digest (Abend-Zusammenfassung um 20 Uhr)
netlify/lib/            Veranstaltungsdaten (event.mjs), Mail, Kalender
netlify/lib/db.mjs      Datenspeicher (Netlify Blobs) + Buchungslogik (verhindert Überbuchung, auch bei gleichzeitigen Anmeldungen)
scripts/qr-codes.mjs    erzeugt die QR-Codes (npm run qr)
druck/qr-codes/         fertige QR-Codes
```

Datum, Ort und Texte für die Mail stehen zentral in `netlify/lib/event.mjs`.

## Design = baufinanz-dueren.de

Ausführlich (Farben, Bausteine, Mails, Fallstricke): [`DESIGN.md`](DESIGN.md).

Kopf, Fuß, Farben, Schrift und Buttons sind 1:1 von der Hauptseite übernommen (Stand Oktober 2026):

| | Wert |
|---|---|
| Farben | Dunkelblau `#1A3569`, Blau `#3C59AD`, Text `#191919`, Grau-Blau `#7C829A`, Hellgrau-Blau `#F0F2F9` – dazu Gelb-Orange `#f0a63a` (wie AskMeSomething) für den pulsierenden Knopf „Jetzt Platz sichern“ |
| Schrift | Raleway 400/500/600/700 – **lokal** in `public/assets/fonts/` (keine Verbindung zu Google, wie auf der Hauptseite) |
| Kopf | nur das weiße Logo (Link zur Hauptseite), ohne Menü; scrollt mit der Seite weg |
| Fuß | Logo, Claim, Facebook/Instagram, Kontaktkasten, Impressum/Datenschutz (ohne Menü) |
| Umbruchpunkte | 1600 / 1300 / 1024 / 880 / 767 px |

Ändert sich die Hauptseite (z. B. neue Menüpunkte oder Telefonnummer), Kopf und Fuß in
`public/index.html` entsprechend anpassen.

## Noch offen

- **Rechtliches** – eigene Datenschutzhinweise unter `/datenschutz` (`public/datenschutz.html`) sind online.
  Noch zu tun:
  - Text einmal vom Datenschutz-Ansprechpartner gegenlesen lassen (keine Rechtsberatung).
  - Mit Netlify den Auftragsverarbeitungsvertrag (DPA) abschließen, ebenso mit dem E-Mail-Anbieter
    (bei IONOS/Strato/Microsoft im Kundenkonto abrufbar).
  - Speicherfristen einhalten: spätestens **9. März 2027** in `/admin` → *Alle Anmeldungen löschen*
    (vorher die Adressliste per **CSV exportieren** sichern), Fragen in der Fragen-App ebenfalls löschen.
  - Widersprüche (z. B. „keine Post mehr“) notieren und die Adresse aus euren Listen entfernen.
  - Hauptseite baufinanz-dueren.de: Impressum ergänzen um die Pflichtangaben als
    Immobiliardarlehensvermittler (§ 34i GewO: Registernummer, IHK/Erlaubnisbehörde), „§ 5 TMG“ → „§ 5 DDG“,
    Link zur EU-Streitschlichtungsplattform entfernen (abgeschaltet), Vertretung der KG durch die
    Komplementär-GmbH richtig angeben.
- **E-Mail im Fuß bestätigen:** Dort steht `info@baufinanz-dueren.de`. Die Hauptseite zeigt im Fuß
  und im Impressum derzeit eine Adresse mit `@b10x69i.myrdbx.io` (vermutlich Rest vom Umzug zum
  Hoster) – das sollte auf der Hauptseite korrigiert werden.
- Apple/Google Wallet – später.
