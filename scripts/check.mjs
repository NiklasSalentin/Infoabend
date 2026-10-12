// Prüft vor jeder Veröffentlichung, dass nichts Wichtiges kaputt ist: npm run check
// Läuft automatisch in GitHub Actions (siehe .github/workflows/auto-merge.yml).
// Nur wenn alles grün ist, wird eine Änderung in den Live-Branch übernommen.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => readFileSync(root + f, 'utf8');
const errors = [];
const fail = (msg) => errors.push(msg);

// 1. JavaScript im Browser fehlerfrei
for (const f of ['public/app.js', 'public/admin.js']) {
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
const ids = ['form', 'seats', 'companions', 'has-companion', 'error', 'submit', 'success', 'waitlisted', 'gcal',
  'seat-hint', 'countdown', 'seats-free', 'seats-label', 'social-proof', 'attendees', 'anmeldung', 'mobile-menu'];
for (const id of ids) if (!html.includes(`id="${id}"`)) fail(`public/index.html: id="${id}" fehlt – bitte wiederherstellen (wird von app.js gebraucht).`);
const names = ['name', 'email', 'phone', 'street', 'zip', 'city', 'addressConsent', 'privacyConsent', 'questions', 'website'];
for (const n of names) if (!html.includes(`name="${n}"`)) fail(`public/index.html: Formularfeld name="${n}" fehlt.`);
if (!html.includes('class="menu-toggle"')) fail('public/index.html: Menü-Knopf (class="menu-toggle") fehlt.');

// 4. Gedruckte QR-Codes müssen weiter funktionieren
const toml = read('netlify.toml');
for (const p of ['/zeitung', '/flyer', '/plakat', '/admin']) {
  if (!toml.includes(`from = "${p}"`)) fail(`netlify.toml: Weiterleitung ${p} fehlt – gedruckte QR-Codes/Verwaltung wären kaputt.`);
}

// 5. Datum und Uhrzeiten überall gleich (Seite, Countdown, Kalender, Mail, PDF)
const { EVENT } = await import(root + 'netlify/lib/event.mjs');
const app = read('public/app.js');
const pdf = read('netlify/lib/pdf.mjs');
const [, y, m, d] = EVENT.startUtc.match(/^(\d{4})(\d{2})(\d{2})T/);
const same = (where, text, needle, hint) => { if (!text.includes(needle)) fail(`${where}: „${needle}“ nicht gefunden – ${hint}`); };
const hint = 'Datum/Uhrzeit stehen in netlify/lib/event.mjs, public/index.html und public/app.js und müssen überall gleich sein.';
same('public/index.html', html, `Einlass ${EVENT.admission}`, hint);
same('public/index.html', html, `um ${EVENT.start} losgeht`, hint);
same('public/index.html', html, `${d}.${m}.${y}`, hint);
same('public/index.html', html, `datetime="${y}-${m}-${d}`, hint);
same('public/app.js', app, `Einlass ${EVENT.admission}, Beginn ${EVENT.start}`, hint);
same('public/app.js', app, `${EVENT.startUtc}/${EVENT.endUtc}`, hint);
same('public/app.js', app, `'${y}-${m}-${d}T`, hint);
same('netlify/lib/pdf.mjs', pdf, `um ${EVENT.start} losgeht`, hint);

// 6. Keine Zugangsdaten und keine Anmeldelisten im (öffentlichen!) Repo
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
