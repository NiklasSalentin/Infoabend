# Anmeldung Infoabend – anmeldung.baufinanz-dueren.de

Anmeldeseite für den Infoabend **„Wie kaufe ich eigentlich eine Immobilie?“** am
**Mittwoch, 9. Dezember 2026** in der Festhalle Birkesdorf.

**So läuft eine Anmeldung ab – ein Beispiel:**

1. Frau Müller scannt den QR-Code auf dem **Flyer** → `anmeldung.baufinanz-dueren.de/flyer`
2. Sie landet auf der Anmeldeseite (im Hintergrund wird „Quelle: flyer“ gemerkt).
3. Sie bucht **2 Plätze** (sich + Begleitung „Herr Müller“).
4. Sofort danach bekommt sie eine **E-Mail mit PDF-Einladung** und Kalendereintrag.
5. Ihr bekommt eine **Info-Mail** an `infoabend@baufinanz-dueren.de`.
6. In der Verwaltung (`/admin`) steht sie mit 2 Plätzen und der Quelle „flyer“.
7. Will sie sich mit derselben E-Mail-Adresse noch einmal anmelden, kommt:
   *„Mit dieser E-Mail-Adresse wurde bereits eine Anmeldung vorgenommen.“*

## Die Seiten

| Adresse | Für wen | Was passiert dort |
|---|---|---|
| `anmeldung.baufinanz-dueren.de/` | Besucher | Infos zum Abend, Countdown, „Noch 37 von 120 Plätzen frei“, Anmeldeformular, Knopf **Termin vereinbaren** (→ baufinanz-dueren.de/kontakt) |
| `…/zeitung`, `…/flyer`, `…/plakat` | QR-Codes | Kurzlinks: leiten auf die Anmeldeseite weiter und merken sich den Werbekanal |
| `…/admin` | Team (Passwort) | Plätze einstellen, Anmeldeliste, Warteliste, Nachrücken, Stornieren, CSV-Export |

## Einrichtung in 6 Schritten

### 1. Datenbank bei Supabase anlegen

1. Auf [supabase.com](https://supabase.com) → **New project** → Name z. B. `infoabend`,
   Region **Frankfurt (eu-central-1)**.
2. Links **SQL Editor** → **New query** → den kompletten Inhalt von
   [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**.
   (Das Skript darf auch zweimal laufen, es geht nichts kaputt.)
3. **Project Settings → API** (bzw. *API Keys*): die **Project URL** und den
   **service_role**- bzw. **Secret**-Schlüssel kopieren – beides braucht ihr in Schritt 3.

> ⚠️ Der service_role-Schlüssel hat vollen Zugriff auf die Datenbank. Er gehört **nur** in die
> Netlify-Einstellungen, nie in den Code oder in eine E-Mail.

### 2. Zugangsdaten des E-Mail-Postfachs (SMTP) heraussuchen

Die Mails werden über euer eigenes Postfach verschickt, z. B. `infoabend@baufinanz-dueren.de`.
Die Daten stehen beim Mail-Anbieter, typische Werte:

| Anbieter | `SMTP_HOST` | `SMTP_PORT` |
|---|---|---|
| IONOS | `smtp.ionos.de` | `587` |
| Strato | `smtp.strato.de` | `465` |
| Microsoft 365 | `smtp.office365.com` | `587` |
| Google Workspace | `smtp.gmail.com` | `587` (App-Passwort nötig) |

Tipp: `MAIL_FROM` muss zum Postfach passen, sonst landen die Mails eher im Spam.

### 3. Umgebungsvariablen in Netlify setzen

Das Netlify-Projekt ist **`baufiabend`** (live unter https://anmeldung.baufinanz-dueren.de) →
https://app.netlify.com/projects/baufiabend

Dort unter **Project configuration → Environment variables**:

| Variable | Beispiel | Pflicht? |
|---|---|---|
| `SUPABASE_URL` | `https://abcdefghijk.supabase.co` | ja |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi…` bzw. `sb_secret_…` | ja – **Secret** |
| `SMTP_HOST` | `smtp.ionos.de` | ja |
| `SMTP_PORT` | `587` | ja |
| `SMTP_USER` | `infoabend@baufinanz-dueren.de` | ja |
| `SMTP_PASS` | Passwort des Postfachs | ja – **Secret** |
| `MAIL_FROM` | `Baufinanz Düren <infoabend@baufinanz-dueren.de>` | empfohlen |
| `ADMIN_PASSWORD` | mind. 12 Zeichen, z. B. drei zufällige Wörter: `Kompass-Laterne-Rübe-47` | ja – **Secret** |
| `NOTIFY_EMAIL` | `infoabend@baufinanz-dueren.de` | optional – Empfänger der Info-Mails (Standard: diese Adresse) |
| `SITE_URL` | `https://anmeldung.baufinanz-dueren.de` | optional – sonst gilt automatisch die Hauptadresse des Netlify-Projekts |

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

### 6. Plausible (Besucherzahlen, cookiefrei)

1. Konto auf [plausible.io](https://plausible.io) → **Add website** → `anmeldung.baufinanz-dueren.de`.
2. Der Code-Schnipsel ist schon in `public/index.html` eingebaut. Zeigt Plausible beim Anlegen
   einen anderen Schnipsel an (neue Konten bekommen teils ein persönliches Skript `pa-….js`),
   die beiden Plausible-Zeilen im `<head>` von `public/index.html` damit ersetzen.
3. **Settings → Goals → Add goal → Custom event** – drei Ziele anlegen:
   `Anmeldung`, `Warteliste`, `Termin vereinbaren`.
4. Die **Datenschutzerklärung** um Plausible ergänzen (siehe Briefing, Punkt 3 „Rechtliches“).

**Was ihr dann seht – Beispiel:**

| Quelle | Besucher | Anmeldungen | Quote |
|---|---|---|---|
| zeitung | 320 | 40 | 12,5 % |
| flyer | 90 | 15 | 16,7 % |
| direkt | 60 | 5 | 8,3 % |

Die Spalte „Anmeldungen je Quelle“ seht ihr auch **ohne** Plausible in `/admin`.

## Bedienung im Alltag

### Plätze einstellen – `/admin`

Mit dem `ADMIN_PASSWORD` anmelden. Oben stehen die Einstellungen:

- **Plätze gesamt** – z. B. `120`
- **Max. Plätze pro Person** – z. B. `2`
- **Anmeldung geöffnet** – Häkchen weg = Formular verschwindet

**Beispiel mit 120 Plätzen und max. 2 pro Person:**

| Wer | bucht | Ergebnis | Anzeige danach |
|---|---|---|---|
| Person A | 2 Plätze | ✅ bestätigt, Mail mit PDF | „Noch 118 von 120 Plätzen frei“ |
| Person A nochmal | 1 Platz | ❌ „bereits angemeldet“ | unverändert |
| Person B | 3 Plätze | geht nicht – Auswahl endet bei 2 | – |
| … | … | Abend voll | „ausgebucht“ → Knopf „Auf die Warteliste setzen“ |
| Person Z | 2 Plätze | ⏳ Warteliste, Mail „Sie stehen auf der Warteliste“ | – |

Die Zahlen lassen sich jederzeit ändern – z. B. von 120 auf 150, wenn mehr Stühle in die
Festhalle passen. Die neuen Plätze sind sofort buchbar.

### Warteliste, Stornieren, Nachsenden

In der Liste in `/admin` je Zeile:

- **Nachrücken** (bei Warteliste) – nur wenn genug Plätze frei sind; die Person bekommt
  automatisch ihre Einladung mit PDF.
- **Stornieren** – die Plätze werden sofort wieder frei.
  Beispiel: A (2 Plätze) storniert → Z (Warteliste, 2 Plätze) → **Nachrücken** klicken.
- **Mail erneut** – schickt die Einladung noch einmal (z. B. „Mail nicht angekommen“).
- **CSV exportieren** – Liste für Excel (Stuhlplanung, Namensschilder, Versand des Themenmagazins).

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

- **PDF-Einladung** mit Name, Plätzen, Begleitung, Ticket-Code, Ablauf (Teil 1 Finanzierung,
  Teil 2 Notar), Einlass/Parken und Link zur Seite
- **Kalendereintrag**: Apple/Outlook als Anhang (mit Erinnerung am Vortag), Google als Knopf
- Knopf **Termin vereinbaren**

Apple Wallet und Google Wallet sind für später vorgesehen (Apple-Developer-Konto bzw.
Google-Wallet-Ausstellerkonto nötig).

## Vor dem Start testen (Checkliste aus dem Briefing)

- [ ] Testanmeldung mit eigener E-Mail: Mail da? PDF öffnet? Kalendereintrag klappt?
- [ ] Info-Mail an `infoabend@baufinanz-dueren.de` angekommen?
- [ ] Ohne Datenschutz-Häkchen lässt sich nicht absenden
- [ ] Adresse ausgefüllt → Häkchen „Themenmagazin per Post“ wird Pflicht
- [ ] Gleiche E-Mail zweimal → wird abgelehnt
- [ ] `/admin`: Testanmeldung sichtbar → **Stornieren** (damit sie nicht mitzählt)
- [ ] QR-Codes mit dem Handy scannen (alle vier)
- [ ] Auf dem Handy durchklicken (iPhone und Android)
- [ ] Plätze und Maximum pro Person in `/admin` final einstellen

## Technik in Kürze

```
public/                 Seite (HTML/CSS/JS), Verwaltung /admin, Bilder
netlify/functions/      register (Anmeldung), status (freie Plätze), admin, ics (Kalender)
netlify/lib/            Veranstaltungsdaten (event.mjs), Mail, PDF, Kalender, Datenbank
supabase/schema.sql     Tabellen + Buchungslogik (verhindert Überbuchung, auch bei gleichzeitigen Anmeldungen)
scripts/qr-codes.mjs    erzeugt die QR-Codes (npm run qr)
druck/qr-codes/         fertige QR-Codes
```

Datum, Ort und Texte für Mail/PDF stehen zentral in `netlify/lib/event.mjs`.

## Design = baufinanz-dueren.de

Kopf, Fuß, Farben, Schrift und Buttons sind 1:1 von der Hauptseite übernommen (Stand Oktober 2026):

| | Wert |
|---|---|
| Farben | Dunkelblau `#1A3569`, Blau `#3C59AD`, Text `#191919`, Grau-Blau `#7C829A`, Hellgrau-Blau `#F0F2F9` – dazu Gelb-Orange `#f0a63a` (wie AskMeSomething) für den pulsierenden Knopf „Jetzt Platz sichern“ |
| Schrift | Raleway 400/500/600/700 – **lokal** in `public/assets/fonts/` (keine Verbindung zu Google, wie auf der Hauptseite) |
| Kopf | weißes Logo + Menü der Hauptseite, ab 50 px Scrollen blau; Tablet/Handy: runder Menü-Knopf |
| Fuß | Logo, Claim, Menü, Facebook/Instagram, Kontaktkasten, Impressum/Datenschutz |
| Umbruchpunkte | 1600 / 1300 / 1024 / 880 / 767 px |

Ändert sich die Hauptseite (z. B. neue Menüpunkte oder Telefonnummer), Kopf und Fuß in
`public/index.html` entsprechend anpassen.

## Noch offen

- **Plausible einrichten** (Schritt 6).
- **Datenschutzerklärung prüfen** (Veranstaltung, Versand Themenmagazin, Plausible) – Briefing Punkt 3.
- **E-Mail im Fuß bestätigen:** Dort steht `info@baufinanz-dueren.de`. Die Hauptseite zeigt im Fuß
  und im Impressum derzeit eine Adresse mit `@b10x69i.myrdbx.io` (vermutlich Rest vom Umzug zum
  Hoster) – das sollte auf der Hauptseite korrigiert werden.
- Apple/Google Wallet – später.
