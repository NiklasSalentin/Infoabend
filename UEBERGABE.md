# Übergabe: Anmeldeseite Infoabend

Hallo Alex,

hier ist alles, was du brauchst, um die Anmeldeseite für den Infoabend am **9. Dezember 2026**
selbst zu pflegen – Texte, Bilder, Uhrzeiten, Plätze. Für die meisten Änderungen brauchst du
**keine Programmierkenntnisse**.

*Stand: 12. Oktober 2026 · Ansprechpartner bei Fragen: Niklas*

---

## Schnellstart: Schritt für Schritt

### Teil 1 – Einmalig einrichten

Es gibt zwei Wege. **Für den Start nimmst du Weg 1**, später wechselst du am besten auf Weg 2.

#### Weg 1: Mit den Zugängen von Niklas (sofort startklar, ca. 2 Minuten)

1. https://claude.ai/code öffnen und mit den Zugangsdaten anmelden, die Niklas dir gegeben hat.
2. Als Projekt **`NiklasSalentin/Infoabend`** auswählen.
3. Das Passwort für die Verwaltung (`/admin`) gibt dir ebenfalls Niklas.

⚠️ **Bitte beachten:** Mit diesen Zugängen siehst du auch Niklas' andere Projekte und Unterhaltungen.
Arbeite **nur im Projekt `Infoabend`** und ändere keine Einstellungen in GitHub, Netlify oder Claude.
Alle Änderungen erscheinen unter Niklas' Namen.

#### Weg 2: Mit eigenem Konto (empfohlen auf Dauer, ca. 10 Minuten)

Vorteile: Du siehst nur dieses Projekt, deine Änderungen sind als deine erkennbar, und Niklas
muss seine Passwörter nicht teilen.

1. **GitHub-Konto anlegen:** https://github.com/signup (kostenlos).
2. **Niklas deinen GitHub-Benutzernamen schicken.** Er lädt dich ein
   (*Repo → Settings → Collaborators → Add people*).
3. **Einladung annehmen:** E-Mail von GitHub → **Accept invitation**.
4. **Claude Code mit eigenem Claude-Konto öffnen:** https://claude.ai/code
5. **GitHub mit Claude verbinden:** Beim ersten Mal fragt Claude nach GitHub → **Verbinden** /
   **Authorize** klicken.
6. Als Projekt **`NiklasSalentin/Infoabend`** auswählen.
7. Danach ändert Niklas seine Passwörter, die er dir für Weg 1 gegeben hat.

✅ Ab jetzt brauchst du zum Loslegen nur noch: Claude Code öffnen → Projekt `Infoabend` wählen.

### Teil 2 – Deine erste Änderung (ca. 3 Minuten)

Übungsbeispiel: Wir ändern die Unterzeile oben auf der Seite.

1. https://claude.ai/code öffnen, Projekt **`NiklasSalentin/Infoabend`** wählen.
2. In das Eingabefeld schreiben, **was** du ändern willst – so, als würdest du es einem
   Mitarbeiter sagen:

   > „Ändere die Unterzeile oben auf der Anmeldeseite in: ‚Vom ersten Gespräch mit dem Makler
   > bis zum Notartermin – der große Infoabend rund um Ihre Finanzierung‘.“

3. **Enter** drücken. Claude sucht die Stelle, ändert sie und sagt dir, was es gemacht hat.
   Hat Claude eine Rückfrage, beantwortest du sie einfach per Klick.
4. Wenn Claude meldet, dass die Änderung gespeichert ist: **ca. 2 Minuten warten**.
5. https://anmeldung.baufinanz-dueren.de öffnen und **neu laden**
   (Mac: **⌘ + Shift + R**, Windows: **Strg + F5**, Handy: Seite nach unten ziehen).
6. Änderung sichtbar? ✅ Fertig. Nicht sichtbar? → noch 1–2 Minuten warten, dann Teil 3.

**Gefällt dir das Ergebnis nicht?** Einfach schreiben: „Mach das wieder rückgängig.“

### Teil 3 – Prüfen, ob alles geklappt hat

1. https://github.com/NiklasSalentin/Infoabend/actions öffnen.
2. Oben steht deine letzte Änderung:
   - **Grüner Haken ✅** → übernommen, die Seite ist aktuell.
   - **Gelber Punkt 🟡** → läuft noch, kurz warten.
   - **Rotes ✗** → **nicht** übernommen, die Seite ist unverändert (nichts kaputt).
     In Claude Code schreiben: „Die automatische Übernahme ist fehlgeschlagen – bitte prüfen
     und beheben.“

### Teil 4 – Plätze und Anmeldungen verwalten (ohne Claude)

1. https://anmeldung.baufinanz-dueren.de/admin öffnen, Passwort eingeben.
2. Oben **Plätze gesamt** und **Max. Plätze pro Person** einstellen → **Speichern**.
3. Darunter siehst du alle Anmeldungen. Je Zeile kannst du:
   **Nachrücken** (von der Warteliste), **Stornieren** oder **Mail erneut** senden.
4. **CSV exportieren** → Liste für Excel (Stuhlplanung, Namensschilder, Adressliste).

### Gut zu wissen

| Situation | Was du tust |
|---|---|
| Du willst einen Text, eine Uhrzeit oder ein Bild ändern | Claude Code (Teil 2) |
| Mehr Plätze, Warteliste, Anmeldeliste | `/admin` (Teil 4) |
| Du willst vorher sehen, wie es aussieht | „Zeig mir vorher einen Screenshot, bevor du es änderst.“ |
| Du bist unsicher, wo etwas steht | „Wo steht auf der Seite der Text über …?“ |
| Etwas sieht nach einer Änderung komisch aus | „Mach die letzte Änderung rückgängig.“ |
| Es klemmt grundsätzlich | Niklas fragen |

Die Details zu allem findest du in den folgenden Abschnitten.

---

## 1. Die wichtigsten Adressen

| Was | Adresse |
|---|---|
| Die Anmeldeseite (live) | https://anmeldung.baufinanz-dueren.de |
| Verwaltung (Plätze, Anmeldeliste) | https://anmeldung.baufinanz-dueren.de/admin – Passwort bekommst du von Niklas |
| Code (GitHub) | https://github.com/NiklasSalentin/Infoabend |
| Veröffentlichung (Netlify) | https://app.netlify.com/projects/baufiabend |
| Technische Einrichtung (E-Mail, Domain, Speicher, Besucherzählung) | [`README.md`](README.md) |

**Live-Branch:** `claude/relaxed-cannon-2kqiie` – nur was auf diesem Branch landet, geht online.

---

## 2. So kommt eine Änderung online – automatisch

```
Du beschreibst die Änderung in Claude Code
   → Claude ändert die Dateien und speichert sie auf GitHub
   → automatische Prüfung (Formular intakt? Uhrzeiten überall gleich? keine Passwörter?)
   → automatisch übernommen und veröffentlicht – nach ca. 2 Minuten live
```

Du musst nichts zusammenführen, freigeben oder hochladen. Findet die Prüfung ein Problem,
geht **nichts** online – die Seite bleibt einfach, wie sie war. Kaputt machen kannst du also
nichts, und jede Änderung lässt sich zurückholen.

### Empfohlen: Weg A – Änderungen in Claude Code eingeben

Voraussetzung: einmal eingerichtet wie im Schnellstart, Teil 1 (Weg 1 oder Weg 2).

1. https://claude.ai/code öffnen, das Repo **`NiklasSalentin/Infoabend`** auswählen.
2. Die Änderung in normalen Worten beschreiben, z. B.:

   > „Ändere den Einlass von 18:00 auf 17:30 Uhr – überall, auch in Mail, PDF und Kalender.“

   > „Tausche das Porträtfoto gegen das angehängte Bild aus.“

   > „Ersetze im Abschnitt zum Notartermin den letzten Satz durch: …“

   > „Füge einen QR-Code für den Werbekanal ‚Radio‘ hinzu.“

3. Claude kennt das Projekt (Anleitung in `CLAUDE.md`), zeigt bei Gestaltungsfragen vorher/nachher
   und meldet sich, wenn die Änderung gespeichert ist.
4. Nach ca. 2 Minuten https://anmeldung.baufinanz-dueren.de neu laden
   (Mac: **⌘ + Shift + R**, Windows: **Strg + F5**).

### Weg B – kleine Textänderung direkt im Browser auf GitHub

Voraussetzung: Anmeldung bei GitHub – mit Niklas' Zugängen oder deinem eigenen, eingeladenen Konto.

1. https://github.com/NiklasSalentin/Infoabend öffnen, oben links muss der Branch
   **`claude/relaxed-cannon-2kqiie`** ausgewählt sein.
2. Datei anklicken, z. B. `public/index.html`.
3. Oben rechts auf den **Stift** (*Edit this file*) klicken.
4. Text ändern. Tipp: Mit **Strg + F** (Mac: **⌘ + F**) findest du die Stelle schnell.
5. Oben rechts **Commit changes…** → kurze Beschreibung (z. B. „Tippfehler korrigiert“)
   → **Commit changes**. Nach ca. 1 Minute ist die Änderung live.

Achtung: Auf diesem Weg geht die Änderung **sofort** live; die Prüfung läuft erst danach und
meldet Probleme nur per E-Mail. Für mehr als einen Tippfehler deshalb lieber Weg A.

### Wo sehe ich, ob alles geklappt hat?

| Wo | Was du siehst |
|---|---|
| GitHub → Reiter **Actions** | „Änderungen automatisch übernehmen“: grüner Haken = übernommen, rotes ✗ = nicht übernommen |
| Netlify → **Deploys** | „Published“ = online |
| E-Mail von GitHub | kommt nur, wenn etwas schiefging – mit Begründung |

**Rotes ✗?** In Claude Code einfach schreiben: „Die automatische Übernahme ist fehlgeschlagen –
bitte prüfen und beheben.“ Die Seite war in der Zwischenzeit nie kaputt.

---

## 3. Wo steht was?

| Ich will … | Datei | Hinweis |
|---|---|---|
| Texte auf der Seite ändern | `public/index.html` | Nach dem Text suchen und nur den Text zwischen den Zeichen `>` und `<` ändern |
| Datum, Einlass, Ort oben im blauen Bereich | `public/index.html` | Abschnitt „Datumsfeld“ (Suche nach `09.12.2026`) |
| Texte in der **Bestätigungsmail** | `netlify/lib/mail.mjs` | |
| Texte im **PDF** (Einladung) | `netlify/lib/pdf.mjs` | Die Absätze „Teil 1“, „Teil 2“, „Ankommen & Parken“ stehen hier ein zweites Mal |
| Datum/Uhrzeit/Ort für **Mail, PDF und Kalender** | `netlify/lib/event.mjs` | Alles an einer Stelle |
| Countdown und Google-Kalender-Knopf | `public/app.js` | ganz oben bei „Countdown“ |
| Bilder austauschen | `public/assets/` | Siehe Beispiel 3 |
| Farben, Schriftgrößen | `public/style.css` | Farben ganz oben unter `:root` |
| Wer die Info-Mail bei Anmeldungen bekommt | Netlify-Variable `NOTIFY_EMAIL` | Standard: `infoabend@baufinanz-dueren.de` |
| QR-Codes für den Druck | `druck/qr-codes/` | Siehe Abschnitt 5 |
| Plätze, Maximum pro Person, Anmeldung zu/auf | **keine Datei** – in `/admin` | Siehe Abschnitt 4 |

---

## 4. Beispiele

### Beispiel 1: Einen Text ändern

Du möchtest „Praxisnah, verständlich, auf Augenhöhe.“ durch „Praxisnah und verständlich.“
ersetzen.

**Mit Claude Code (Weg A):** „Ersetze ‚Praxisnah, verständlich, auf Augenhöhe.‘ durch
‚Praxisnah und verständlich.‘ – auch im PDF.“ Fertig.

**Von Hand auf GitHub (Weg B):**

1. `public/index.html` öffnen → Stift → **Strg + F** → „Augenhöhe“ suchen.
2. Nur den Text ändern, die Zeichen drumherum stehen lassen:

   ```html
   <!-- vorher -->
   … bis zum Annuitätendarlehen. Praxisnah, verständlich, auf Augenhöhe.</p>
   <!-- nachher -->
   … bis zum Annuitätendarlehen. Praxisnah und verständlich.</p>
   ```

3. Derselbe Absatz steht auch im PDF → in `netlify/lib/pdf.mjs` genauso ändern.
4. **Commit changes** – fertig.

### Beispiel 2: Einlass von 18:00 auf 17:30 Uhr ändern

**Mit Claude Code (Weg A):** „Ändere den Einlass von 18:00 auf 17:30 Uhr – überall.“ Claude kennt
alle Stellen; die automatische Prüfung stellt sicher, dass keine vergessen wurde.

**Zum Nachvollziehen** – Uhrzeiten stehen an mehreren Stellen, weil Seite, Mail, PDF und Kalender
sie jeweils brauchen:

| Datei | Suchen nach | Ändern in |
|---|---|---|
| `public/index.html` | `Einlass 18:00 Uhr` | `Einlass 17:30 Uhr` |
| `netlify/lib/event.mjs` | `admission: '18:00 Uhr'` | `admission: '17:30 Uhr'` |
| `netlify/lib/event.mjs` | `startUtc: '20261209T170000Z'` | `startUtc: '20261209T163000Z'` |
| `public/app.js` | `2026-12-09T18:00:00+01:00` | `2026-12-09T17:30:00+01:00` |
| `public/app.js` | `20261209T170000Z/20261209T200000Z` | `20261209T163000Z/20261209T200000Z` |
| `public/app.js` | `Einlass 18:00 Uhr` | `Einlass 17:30 Uhr` |

> **Was ist `20261209T170000Z`?** Das ist die Uhrzeit für Kalender in Weltzeit (UTC).
> Im Dezember gilt: **deutsche Uhrzeit minus 1 Stunde**.
> 18:00 Uhr → `170000Z`, 17:30 Uhr → `163000Z`, 20:00 Uhr → `190000Z`.

Ändert sich der **Beginn** (18:30 Uhr): `netlify/lib/event.mjs` (`start:`), in `public/index.html` und
`netlify/lib/pdf.mjs` der Satz „… bevor es um 18:30 Uhr losgeht“ sowie in `public/app.js` der Text
„Beginn 18:30 Uhr“.

### Beispiel 3: Ein Bild austauschen

Das neue Bild muss **genau so heißen** wie das alte, dann ist keine weitere Änderung nötig.

| Bild | Dateiname in `public/assets/` |
|---|---|
| Porträt (Teil 1) | `portrait.jpg` |
| Notar-Bild (Teil 2) | `notariat.jpg` |
| Festhalle-Logo | `festhalle.png` |
| FOCUS-MONEY-Siegel | `kundenliebling-2026.png` |
| Hausfoto oben | `hero-haus.webp` |

**Mit Claude Code (Weg A):** Bild in den Chat ziehen und schreiben „Tausche das Porträtfoto
gegen dieses Bild aus.“ Claude verkleinert es passend.

**Von Hand auf GitHub (Weg B):** Ordner `public/assets` öffnen → **Add file → Upload files** → Bild mit demselben
Namen hochladen → **Commit changes**.
Tipp: Bilder vorher verkleinern (max. ca. 1600 px breit, unter 300 KB), sonst lädt die Seite
langsam – z. B. mit https://squoosh.app.

### Beispiel 4: Plätze erhöhen (ohne Code)

Die Festhalle hat mehr Stühle als gedacht → statt 120 sollen 150 Plätze buchbar sein:

1. https://anmeldung.baufinanz-dueren.de/admin öffnen, Passwort eingeben.
2. **Plätze gesamt** auf `150` → **Speichern**.
3. Sofort zeigt die Seite z. B. „Noch 67 von 150 Plätzen frei“, und wer auf der Warteliste
   steht, kann per **Nachrücken** übernommen werden (bekommt dann automatisch die Einladung).

---

## 5. Die Verwaltung `/admin`

| Funktion | Was passiert |
|---|---|
| **Plätze gesamt** | Wie viele Plätze insgesamt buchbar sind |
| **Max. Plätze pro Person** | z. B. `2` = eine Person + eine Begleitung |
| **Anmeldung geöffnet** | Häkchen weg = Formular verschwindet von der Seite |
| **Nachrücken** (Warteliste) | Nur wenn genug Plätze frei sind; Person bekommt automatisch die Einladung mit PDF |
| **Stornieren** | Plätze werden sofort wieder frei |
| **Mail erneut** | Schickt die Einladung noch einmal |
| **Löschen** (nur stornierte) | Entfernt den Eintrag endgültig, z. B. Testanmeldungen |
| **CSV exportieren** | Liste für Excel: Stuhlplanung, Namensschilder |
| **Nach Quelle** | Wie viele Anmeldungen über Zeitung, Flyer, Plakat oder direkt kamen |
| **Auswertung** | Neue Besucher (jede Person nur einmal), wie viele länger als 30 Sekunden blieben, Anmeldungen, Anmeldequote – je Tag und je Quelle. Eigene Geräte zählen nicht mit, sobald man sich einmal in `/admin` angemeldet hat |
| **Adressliste** | Alle, die Straße, PLZ und Ort angegeben haben (ohne Stornierte) – mit Knopf **Adressen als CSV** für Excel/Serienbrief |

Regeln der Anmeldung: **eine Anmeldung pro E-Mail-Adresse**, höchstens so viele Plätze wie
eingestellt. Ist der Abend voll, können sich Besucher auf die Warteliste setzen.

### QR-Codes

| Datei in `druck/qr-codes/` | Einsatz | führt auf |
|---|---|---|
| `qr-zeitung.svg` / `.png` | Zeitungsannonce | `anmeldung.baufinanz-dueren.de/zeitung` |
| `qr-flyer.svg` / `.png` | Flyer | `anmeldung.baufinanz-dueren.de/flyer` |
| `qr-plakat.svg` / `.png` | Plakat | `anmeldung.baufinanz-dueren.de/plakat` |
| `qr-allgemein.svg` / `.png` | alles andere | `anmeldung.baufinanz-dueren.de` |

**SVG** an die Druckerei (beliebig groß, scharf), **PNG** für Word/Canva.
Mindestgröße 2 × 2 cm. Die Adressen `/zeitung`, `/flyer`, `/plakat` bitte **nie löschen**
(in `netlify.toml`) – sonst funktionieren gedruckte Codes nicht mehr.

---

## 6. Bitte nicht ändern (oder nur mit Niklas)

- **Die Teile in spitzen Klammern** in `public/index.html`, vor allem `id="…"` und `name="…"` im
  Formular – daran hängt die Technik. Sichtbare Texte ändern ist immer okay.
- `netlify/lib/db.mjs` – das ist der Speicher mit den Anmeldungen (Buchungslogik).
- Im Netlify-Dashboard unter *Blobs* den Speicher **infoabend** nie löschen – dort liegen alle Anmeldungen.
- **Passwörter, Schlüssel, Zugangsdaten** gehören **nie** in eine Datei: Das Repo ist
  **öffentlich** – alles, was dort steht, kann jeder lesen. Zugangsdaten nur in Netlify unter
  *Project configuration → Environment variables*.
- **Keine Anmeldelisten/CSV-Dateien** ins Repo hochladen (personenbezogene Daten).
- Kopf und Fuß sind 1:1 von baufinanz-dueren.de übernommen. Ändert sich dort etwas
  (Menü, Telefonnummer), am besten hier gleich mit anpassen.

---

## 7. Offene Punkte (Stand 12. Oktober 2026)

1. ⚠️ **E-Mail-Versand fehlt noch.** Anmeldungen werden gespeichert und stehen in `/admin`,
   aber die Bestätigungs-Mail mit PDF geht erst raus, wenn die Postfach-Zugangsdaten eingetragen
   sind: in Netlify (Projekt **baufiabend**) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
   `MAIL_FROM` (Anleitung in [`README.md`](README.md), Schritte 2–3) → *Deploys → Trigger deploy*
   → **Testanmeldung** machen. Fehlende Mails lassen sich danach in `/admin` mit **Mail erneut** nachschicken.
   **Erst danach die QR-Codes drucken bzw. die Annonce schalten.**
2. **Datenschutzerklärung prüfen**: Veranstaltung, Speicherung der Adressen, Besucherzählung
   ohne Cookies (README Schritt 6; Briefing Punkt 3 „Rechtliches“).
3. **E-Mail im Fuß bestätigen**: Dort steht `info@baufinanz-dueren.de` – gibt es das Postfach?
4. **Fehler auf der Hauptseite**: Im Fuß und im **Impressum** von baufinanz-dueren.de stehen
   E-Mail-Adressen mit `@b10x69i.myrdbx.io` (Rest vom Hoster-Umzug) – in WordPress korrigieren.
5. **Plakat**: Tippfehler „Rednerbeitrag durch eien Ntar“ → „einen Notar“.
7. Offene Entscheidung: Soll der Absende-Knopf im Formular („Platz verbindlich reservieren“)
   auch orange werden wie „Jetzt Platz sichern“?
8. Netlify: Das leere Projekt **anmeldung-baufinanz** wird nicht gebraucht und kann gelöscht werden.
9. Später: Einladung zusätzlich für **Apple Wallet / Google Wallet** (braucht ein
   Apple-Developer- bzw. Google-Wallet-Konto).

---

## 8. Vor dem Start testen

- [ ] Testanmeldung mit eigener E-Mail: Mail da? PDF öffnet? Kalendereintrag klappt?
- [ ] Info-Mail an `infoabend@baufinanz-dueren.de` angekommen?
- [ ] Gleiche E-Mail zweimal → wird abgelehnt
- [ ] In `/admin`: Testanmeldung sichtbar → **Stornieren** → **Löschen**
- [ ] Alle vier QR-Codes mit dem Handy scannen
- [ ] Auf iPhone und Android einmal komplett durchklicken
- [ ] Plätze und Maximum pro Person in `/admin` final einstellen
