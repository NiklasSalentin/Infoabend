# Anmeldung Infoabend – anmeldung.baufinanz-dueren.de

Anmeldeseite für den Infoabend **„Wie kaufe ich eigentlich eine Immobilie?“** am
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
| `anmeldung.baufinanz-dueren.de/` | Besucher | Infos zum Abend, Countdown, „Noch 37 von 120 Plätzen frei“, Anmeldeformular, Knopf **Termin vereinbaren** (→ baufinanz-dueren.de/kontakt) |
| `…/zeitung`, `…/flyer`, `…/plakat` | QR-Codes | Kurzlinks: leiten auf die Anmeldeseite weiter und merken sich den Werbekanal |
| `…/admin` | Team (Passwort) | Plätze einstellen, Anmeldeliste, Warteliste, Nachrücken, Stornieren, CSV-Export |

## Einrichtung in 6 Schritten

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
  | `stats` | Summen der Besucher-Auswertung (je Tag, je Quelle) |
  | `visitors/3f9a…` | ein Eintrag je Besucher – nur ein unumkehrbarer Code, keine IP |
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

### 6. Besucher-Auswertung (eingebaut, ohne Cookies)

Nichts einzurichten – die Seite zählt selbst mit. Die Zahlen
stehen in `/admin` im Kasten **Auswertung**.

So funktioniert es:
- Beim Öffnen der Seite schickt sie einen „Aufruf“ an `/api/visit`, nach 30 Sekunden sichtbarer
  Zeit einmal „aktiv“.
- Der Server bildet aus IP-Adresse + Browserkennung einen **unumkehrbaren Code** (Hash). Nur
  dieser Code wird gespeichert, keine IP und kein Cookie auf dem Gerät – deshalb kein
  Cookie-Banner.
- Gleicher Code = gleiche Person → zählt nur **einmal** („neue Besucher“). Mehrfachöffnungen
  erhöhen nur die Zahl „Seitenaufrufe“.
- Wer sich in `/admin` anmeldet, wird als **eigenes Gerät** markiert und nicht mitgezählt.
  Bots/Link-Vorschauen (WhatsApp, Google …) werden ebenfalls ausgefiltert.
- Optional: Umgebungsvariable `ANALYTICS_SALT` (beliebiger zufälliger Text) – sonst wird ein
  vorhandener Schlüssel als „Salz“ für den Hash verwendet.

Grenzen: Wechselt jemand das Netz (WLAN → Mobilfunk) oder das Gerät, kann er doppelt zählen;
mehrere Personen im selben WLAN mit gleichem Browser können als eine zählen. Für einen
Infoabend ist das genau genug.

**Was ihr dann seht – Beispiel:**

| Quelle | Besucher | > 30 Sek. | angemeldet |
|---|---|---|---|
| zeitung | 320 | 150 | 40 |
| flyer | 90 | 50 | 15 |
| direkt | 60 | 20 | 5 |

Die **Datenschutzerklärung** sollte diese Zählung erwähnen (gekürzte, unumkehrbare
Kennung aus IP und Browser, kein Cookie, Zweck: Besucherstatistik).

## Bedienung im Alltag

### Plätze einstellen – `/admin`

Mit dem `ADMIN_PASSWORD` anmelden. Oben stehen die Einstellungen:

- **Plätze gesamt** – z. B. `120`
- **Max. Plätze pro Person** – z. B. `2`
- **Anmeldung geöffnet** – Häkchen weg = Formular verschwindet

**Beispiel mit 120 Plätzen und max. 2 pro Person:**

| Wer | bucht | Ergebnis | Anzeige danach |
|---|---|---|---|
| Person A | 2 Plätze | ✅ bestätigt, Bestätigungs-Mail | „Noch 118 von 120 Plätzen frei“ |
| Person A nochmal | 1 Platz | ❌ „bereits angemeldet“ | unverändert |
| Person B | 3 Plätze | geht nicht – Auswahl endet bei 2 | – |
| … | … | Abend voll | „ausgebucht“ → Knopf „Auf die Warteliste setzen“ |
| Person Z | 2 Plätze | ⏳ Warteliste, Mail „Sie stehen auf der Warteliste“ | – |

Die Zahlen lassen sich jederzeit ändern – z. B. von 120 auf 150, wenn mehr Stühle in die
Festhalle passen. Die neuen Plätze sind sofort buchbar.

### Warteliste, Stornieren, Nachsenden

In der Liste in `/admin` je Zeile:

- **Nachrücken** (bei Warteliste) – nur wenn genug Plätze frei sind; die Person bekommt
  automatisch ihre Bestätigungs-Mail.
- **Stornieren** – die Plätze werden sofort wieder frei.
  Beispiel: A (2 Plätze) storniert → Z (Warteliste, 2 Plätze) → **Nachrücken** klicken.
- **Mail erneut** – schickt die Einladung noch einmal (z. B. „Mail nicht angekommen“).
- **Alle Anmeldungen löschen** (unten in `/admin`, nach dem Abend) – für die Speicherfrist aus den
  Datenschutzhinweisen; zur Bestätigung `LÖSCHEN` eintippen.
- **Löschen** (nur bei stornierten) – entfernt den Eintrag endgültig, z. B. Testanmeldungen.
- **CSV exportieren** – Liste für Excel (Stuhlplanung, Namensschilder).

Außerdem in `/admin`:

- **Auswertung** – neue Besucher (jede Person einmal), länger als 30 Sek., Anmeldungen, Quote,
  je Tag und je Quelle (siehe Schritt 6). **Zahlen zurücksetzen** setzt sie auf null, z. B. nach
  eigenen Tests vor dem Start; Anmeldungen bleiben.
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

Apple Wallet und Google Wallet sind für später vorgesehen (Apple-Developer-Konto bzw.
Google-Wallet-Ausstellerkonto nötig).

## Vor dem Start testen (Checkliste aus dem Briefing)

- [ ] Testanmeldung mit eigener E-Mail: Mail da? Kalendereintrag (iPhone/Outlook und Google) klappt?
- [ ] Ohne Datenschutz-Häkchen lässt sich nicht absenden
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
