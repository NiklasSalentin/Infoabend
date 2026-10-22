// Prüft vor jeder Veröffentlichung, dass nichts Wichtiges kaputt ist: npm run check
// Vor jedem Push auf den Live-Branch ausführen – nur wenn alles grün ist, veröffentlichen.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => readFileSync(root + f, 'utf8');
const errors = [];
const fail = (msg) => errors.push(msg);

// 1. JavaScript im Browser fehlerfrei
for (const f of ['public/app.js', 'public/admin.js', 'public/plaetze.js']) {
  try {
    execFileSync(process.execPath, ['--check', f], { cwd: root, stdio: 'pipe' });
  } catch (e) {
    fail(`${f} enthält einen Syntaxfehler:\n${e.stderr}`);
  }
}

// 2. Server-Funktionen lassen sich laden
for (const f of readdirSync(root + 'netlify/functions').filter((f) => f.endsWith('.mjs'))) {
  try {
    await import(root + 'netlify/functions/' + f);
  } catch (e) {
    fail(`netlify/functions/${f} lässt sich nicht laden: ${e.message}`);
  }
}

// 3. Formular und Seite: diese Kennungen braucht die Technik (public/app.js)
const html = read('public/index.html');
const ids = ['form', 'seats', 'companions', 'error', 'submit', 'success', 'waitlisted', 'gcal',
  'seat-hint', 'seats-free', 'seats-label', 'seats-badge', 'seats-prefix', 'social-proof', 'attendees', 'anmeldung'];
for (const id of ids) if (!html.includes(`id="${id}"`)) fail(`public/index.html: id="${id}" fehlt – bitte wiederherstellen (wird von app.js gebraucht).`);
if (!html.includes('class="admin-link" href="/admin"')) fail('public/index.html: Schloss-Link ganz unten rechts (class="admin-link") fehlt – bleibt laut CLAUDE.md, Niklas nutzt ihn.');
const names = ['name', 'email', 'phone', 'street', 'houseNumber', 'zip', 'city', 'privacyConsent', 'questions', 'website'];
for (const n of names) if (!html.includes(`name="${n}"`)) fail(`public/index.html: Formularfeld name="${n}" fehlt.`);

// 4. Gedruckte QR-Codes müssen weiter funktionieren
const toml = read('netlify.toml');
for (const p of ['/zeitung', '/flyer', '/plakat', '/admin', '/datenschutz']) {
  if (!toml.includes(`from = "${p}"`)) fail(`netlify.toml: Weiterleitung ${p} fehlt – gedruckte QR-Codes/Verwaltung wären kaputt.`);
}

// 5. Datum und Uhrzeiten überall gleich (Seite, Countdown, Kalender; Mail nutzt event.mjs)
const { EVENT } = await import(root + 'netlify/lib/event.mjs');
const app = read('public/app.js');
const [, y, m, d] = EVENT.startUtc.match(/^(\d{4})(\d{2})(\d{2})T/);
const same = (where, text, needle, hint) => { if (!text.includes(needle)) fail(`${where}: „${needle}“ nicht gefunden – ${hint}`); };
const hint = 'Datum/Uhrzeit stehen in netlify/lib/event.mjs, public/index.html und public/app.js und müssen überall gleich sein.';
same('public/index.html', html, `Einlass ${EVENT.admission}`, hint);
same('public/index.html', html, `um ${EVENT.start} losgeht`, hint);
same('public/index.html', html, `${d}.${m}.${y}`, hint);
same('public/index.html', html, `datetime="${y}-${m}-${d}`, hint);
same('public/app.js', app, `'${y}-${m}-${d}T`, hint); // eventDate (Meta-Pixel)

// 5b. Erinnerungs-Mails: Termine der Reihe nach und vor Beginn des Abends
const startIso = `${y}-${m}-${d}T${EVENT.startUtc.slice(9, 11)}:${EVENT.startUtc.slice(11, 13)}:00Z`;
let prevRem = '';
for (const r of EVENT.reminders || []) {
  if (!(new Date(r.sendUtc) < new Date(startIso))) fail(`netlify/lib/event.mjs: Erinnerung „${r.key}“ (${r.sendUtc}) liegt nicht vor dem Beginn des Abends.`);
  if (r.sendUtc <= prevRem) fail('netlify/lib/event.mjs: Erinnerungen müssen zeitlich der Reihe nach stehen (früheste zuerst).');
  prevRem = r.sendUtc;
}

// 6. Angezeigte freie Plätze (Kontingent): nie mehr als echt frei, nie 0 solange etwas frei ist,
//    jede Anmeldung senkt die Anzeige um genau die gebuchten Plätze (außer bei Nachschub/echter Zahl)
const { shownFree } = await import(root + 'public/plaetze.js');
for (const [total, batch, refillAt] of [[400, 120, 30], [200, 30, 5], [120, 20, 3], [50, 80, 10], [30, 10, 0], [200, 0, 5], [200, 5, 10]]) {
  let prev = null;
  for (let booked = 0; booked <= total; booked++) {
    const free = total - booked;
    const { free: shown } = shownFree({ total, booked, batch, refillAt });
    const where = `Anzeige (${total} Plätze, Kontingent ${batch}, Nachschub bei ${refillAt}) bei ${booked} belegt`;
    if (!Number.isInteger(shown) || shown > free || (free > 0 && shown < 1)) fail(`public/plaetze.js: ${where} → ${shown} (falsch)`);
    if (free <= refillAt && shown !== free) fail(`public/plaetze.js: ${where} → ${shown}, erwartet ${free} (echte Zahl)`);
    if (prev !== null && shown !== prev - 1 && shown !== free && shown !== batch) fail(`public/plaetze.js: ${where} → ${shown} nach ${prev} – sinkt nicht um genau 1 Platz`);
    prev = shown;
  }
}
const ex = (booked) => shownFree({ total: 200, booked, batch: 30, refillAt: 5 }).free;
if (ex(0) !== 30 || ex(3) !== 27 || ex(24) !== 6 || ex(25) !== 30 || ex(197) !== 3) fail('public/plaetze.js: Beispiel 200/30/5 stimmt nicht mehr (siehe Kommentar in der Datei).');
const ex2 = (booked) => shownFree({ total: 400, booked, batch: 120, refillAt: 30 }).free;
if (ex2(0) !== 120 || ex2(20) !== 100 || ex2(89) !== 31 || ex2(90) !== 120 || ex2(380) !== 20 || ex2(397) !== 3) fail('public/plaetze.js: Beispiel 400/120/30 stimmt nicht mehr (siehe Kommentar in der Datei).');

// 7. Keine Zugangsdaten und keine Anmeldelisten im (öffentlichen!) Repo
const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const secret = /eyJhbGciOi[\w-]{20,}\.[\w-]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
for (const f of files) {
  if (/\.(csv|xlsx?)$/i.test(f)) fail(`${f}: Tabellen mit Anmeldungen gehören nicht ins öffentliche Repo.`);
  if (/\.(png|jpe?g|webp|gif|woff2?|pdf|ico)$/i.test(f)) {
    if (f.startsWith('public/') && statSync(root + f).size > 2 * 1024 * 1024) fail(`${f}: größer als 2 MB – bitte verkleinern (lädt sonst langsam).`);
    continue;
  }
  if (f === 'scripts/check.mjs') continue;
  if (secret.test(read(f))) fail(`${f}: sieht nach einem Passwort/Schlüssel aus – Zugangsdaten nur in Netlify eintragen, nie ins Repo!`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} Problem(e) gefunden – die Änderung wird NICHT veröffentlicht:\n`);
  for (const e of errors) console.error(' • ' + e);
  process.exit(1);
}
console.log('✓ Alles in Ordnung – die Änderung kann veröffentlicht werden.');
