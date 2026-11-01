# Anmeldeseite Infoabend – Arbeitsanweisungen für Claude

Anmeldeseite für den Infoabend der Baufinanz Düren am 9. Dezember 2026, live unter
https://anmeldung.baufinanz-dueren.de (Netlify-Projekt `baufiabend`).

## Wie Änderungen live gehen

- Live-Branch: **`claude/relaxed-cannon-2kqiie`**. Netlify veröffentlicht jeden Push darauf
  (ca. 1–2 Minuten).
- Vor jedem Push: `npm ci` (falls nötig) und **`npm run check`** – nur bei „✓ Alles in Ordnung“ pushen.
- Nach dem Push live prüfen (z. B. `/api/status` oder die geänderte Datei abrufen) und das Ergebnis melden.

## Kommunikation

- Deutsch, einfache Worte, keine Fachbegriffe ohne Erklärung; mit Beispielen erklären.
- Rückfragen als Auswahl (Multiple Choice), eine pro Nachricht.
- **Zahlen immer in Plätzen:** Niklas meint mit „Buchungen“, „Anmeldungen“, „Warteliste“ usw. immer **Plätze**
  (Anmelder + Begleitung), nicht die Zahl der Anmeldungen/Personen – in Mails, Kacheln und `/admin` so zählen.
- **Design:** vor jeder Design-Änderung `DESIGN.md` lesen (Farben, Bausteine, Mail-Aufbau, Fallstricke) und neue
  Entscheidungen dort nachtragen.
- Bei Design-/Farbfragen vorher/nachher als Screenshot zeigen (Playwright, Chromium unter
  `/opt/pw-browsers/chromium`, lokal z. B. `python3 -m http.server` im Ordner `public`).
- Texte stammen aus der finalen Inhalts-Checkliste: nur ändern, wenn darum gebeten wird;
  Tippfehler dürfen korrigiert werden. Notar auf der Seite **ohne Namen** (Vorgabe Checkliste).

## Wo steht was

| Inhalt | Datei |
|---|---|
| Texte, Abschnitte, Kopf/Fuß der Seite | `public/index.html` |
| Datenschutzhinweise (`/datenschutz`) | `public/datenschutz.html` – bei neuen Daten/Diensten mit anpassen |
| Farben, Schriften, Layout | `public/style.css` (Variablen in `:root`) |
| Countdown, Google-Kalender-Link, Formularlogik | `public/app.js` |
| Datum/Ort/Uhrzeiten für Mail und Kalenderdatei | `netlify/lib/event.mjs` |
| Bestätigungs-/Wartelisten-/Team-Mail (Design wie Plakat, Texte teils doppelt zur Seite!) | `netlify/lib/mail.mjs` |
| Update-Mail zu den Anmeldungen (Empfänger, Häufigkeit, Uhrzeit, nur bei Änderungen) | Einstellung in `/admin` (gespeichert als `notes/digest-settings`), Logik `netlify/lib/digest.mjs`, Mail `digestHtml` in `netlify/lib/mail.mjs`, Zeitplan `netlify/functions/digest.mjs` (stündlich) |
| Erinnerungs-Mails (Zeitplan, Absage-/Abbestell-Links) | Termine in `netlify/lib/event.mjs` (`reminders`), Logik `netlify/lib/reminders.mjs`, Versand `netlify/functions/reminders.mjs` (alle 10 Min.), Seiten `/absagen` + `/erinnerung-abbestellen` in `netlify/functions/termin.mjs` – gehen an alle bestätigten Gäste (Teil der Anmeldung, kein Newsletter, **nie Werbung** hineinschreiben), abbestellbar |
| Kalender-Knopf mit persönlichem Link (wer hat den Termin eingetragen) | Links/Prüfcodes `netlify/lib/links.mjs`, Vermerk `markCalendar` in `netlify/lib/db.mjs`, Auswertung `netlify/functions/kalender.mjs`, Spalte „Kalender“ in `/admin` |
| Freigabe von Gäste-Mails (Entwurf / freigegeben) | `netlify/lib/event.mjs` → `mailStatus` (`erinnerungen`, `kalender`, `aenderung`) – **nur auf „freigegeben“ stellen, wenn Niklas den Text abgesegnet hat**; vorher wird nichts verschickt |
| Kalender-Erinnerung (Knopf in `/admin`) und Vorschau aller Mails | Text `calendarReminderHtml` in `netlify/lib/mail.mjs`, Versand `runCalendarReminder` in `netlify/lib/reminders.mjs`, Vorschau-Liste `netlify/lib/previews.mjs` (neue Mail → dort eintragen) |
| Bilder | `public/assets/` (Schriften lokal in `public/assets/fonts/`) |
| QR-Kurzlinks `/zeitung`, `/flyer`, `/plakat` | `netlify.toml` + `scripts/qr-codes.mjs` → `druck/qr-codes/` |
| Besucherzähler & Adressliste in `/admin` | `public/admin.html`/`admin.js`, `netlify/functions/visit.mjs`, `netlify/lib/visitor.mjs` |
| Google Ads + Meta-Pixel mit Einwilligungs-Hinweis | `public/consent.js`, IDs über `/api/config` (`netlify/functions/config.mjs`: Google Ads `AW-17036255610`, Conversion „Anmeldung Infoabend“; Meta über `META_PIXEL_ID`) – nie ohne Einwilligung laden |
| Speicher für Anmeldungen (Netlify Blobs) + Buchungslogik | `netlify/lib/db.mjs` – nur mit Niklas ändern; Speicher „infoabend“ im Netlify-Dashboard nie löschen |
| Plätze, Max. pro Person, Warteliste, knappe Anzeige | keine Datei – Verwaltung unter `/admin` |
| Plätze nachbuchen / ändern („Plätze ändern“ je Anmeldung in `/admin`) | Logik `changeSeats` in `netlify/lib/db.mjs` (Verlauf `seat_changes`), Aktion `seats` in `netlify/functions/admin.mjs`, Fenster in `public/admin.html`/`admin.js`, kurze Mail „Ein weiterer Platz für Sie“ = `seatChangeHtml`/`sendSeatChange` in `netlify/lib/mail.mjs` |
| Rechenregel „angezeigte freie Plätze“ (Seite + `/admin`) | `public/plaetze.js` |

## Regeln

- **Datum und Uhrzeiten** stehen an mehreren Stellen und müssen gleich bleiben
  (`npm run check` prüft das): `netlify/lib/event.mjs` (`dateLabel`, `admission`, `start`,
  `startUtc`, `endUtc`), `public/index.html` (Datumsfeld, „Einlass …“, „… um 18:30 Uhr losgeht“,
  Meta-Beschreibung), `public/app.js` (`eventDate` für den Countdown); Kalender und Mail lesen alles aus `event.mjs`. Kalenderzeiten in UTC: im Dezember
  deutsche Zeit minus 1 Stunde (18:00 → `170000Z`).
- `id="…"`/`name="…"` im Formular nicht ändern – `public/app.js` hängt daran.
- Kopf und Fuß sind 1:1 von baufinanz-dueren.de; der obere Abschnitt folgt dem Infoabend-Plakat
  (Logo-Blau `#323D8D`, Navy `#1C2350`, Gold `#D9B56C`). Den Knopf „Jetzt Platz sichern“ im Kopfbereich gibt es
  nicht mehr (Wunsch Nov. 2026) – das Formular steht direkt unter dem Datumsfeld.
- Das Repo ist **öffentlich**: keine Passwörter/Schlüssel (nur Netlify-Umgebungsvariablen),
  keine Anmeldelisten oder andere personenbezogenen Daten, keine Bilder mit ungeklärten Rechten
  (z. B. Canva-Stockfotos).
- Bilder vor dem Einchecken verkleinern (max. ca. 1600 px, möglichst < 300 KB; WebP/JPG).
- Die Weiterleitungen `/zeitung`, `/flyer`, `/plakat` nie entfernen – gedruckte QR-Codes zeigen darauf.
- Das kleine, fast unsichtbare **Schloss ganz unten rechts** (Link auf `/admin`) **bleibt** – Niklas nutzt es; nicht entfernen
  (`npm run check` prüft das).
- Einrichtung und Bedienung: `README.md`.
