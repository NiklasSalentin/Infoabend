// Update-Mail zu den Anmeldungen (früher „Abend-Zusammenfassung“). Einstellbar in /admin:
// Empfänger, Häufigkeit (täglich / alle 2 Tage / wöchentlich / aus), Uhrzeit, ob nur bei Änderungen.
// Der Netlify-Zeitplan ruft stündlich runDigest() auf; verschickt wird, wenn laut Einstellung „fällig“.
import { listRegistrations, seatStatus, readNote, writeNote } from './db.mjs';
import { sendDigest } from './mail.mjs';
import { EVENT } from './event.mjs';

export const DIGEST_DEFAULTS = {
  recipients: [EVENT.notifyEmail], // z. B. ['info@baufinanz-dueren.de', 'a.robens@baufinanz-dueren.de']
  frequency: 'daily',              // 'daily' | '2days' | 'weekly' | 'off'
  hour: 20,                        // volle Stunde, deutsche Zeit
  weekday: 1,                      // nur bei 'weekly': 1 = Montag … 7 = Sonntag
  onlyChanges: true,               // true = nur verschicken, wenn sich etwas getan hat
};
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

const berlinDate = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
// Stunde in deutscher Zeit als Zahl 0–23 (en-GB liefert „20“, de-DE dagegen „20 Uhr“ – das ergab früher keine Zahl)
export const berlinHour = (d = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(d));
const berlinWeekday = (d = new Date()) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  .indexOf(d.toLocaleDateString('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' })) + 1;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

export async function digestSettings() {
  return { ...DIGEST_DEFAULTS, ...(await readNote('digest-settings')) };
}

/** Einstellungen aus /admin prüfen und speichern. Wirft Error mit verständlicher Meldung. */
export async function saveDigestSettings(input) {
  const recipients = String(input.recipients ?? '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const bad = recipients.filter((e) => !EMAIL_RE.test(e));
  if (bad.length) throw new Error(`Ungültige E-Mail-Adresse: ${bad.join(', ')}`);
  if (recipients.length > 10) throw new Error('Höchstens 10 Empfänger');
  const frequency = ['daily', '2days', 'weekly', 'off'].includes(input.frequency) ? input.frequency : 'daily';
  if (frequency !== 'off' && !recipients.length) throw new Error('Bitte mindestens eine E-Mail-Adresse eintragen');
  const hour = Math.min(23, Math.max(0, Number.parseInt(input.hour, 10) || 0));
  const weekday = Math.min(7, Math.max(1, Number.parseInt(input.weekday, 10) || 1));
  const settings = { recipients: [...new Set(recipients)], frequency, hour, weekday, onlyChanges: input.onlyChanges !== false };
  await writeNote('digest-settings', settings);
  return settings;
}

/** Ist laut Einstellung jetzt eine Update-Mail fällig? (wird stündlich geprüft) */
export function isDue(settings, state, now = new Date()) {
  if (settings.frequency === 'off' || berlinHour(now) !== settings.hour) return false;
  const today = berlinDate(now);
  if (state.lastDate === today) return false;
  if (settings.frequency === 'weekly') return berlinWeekday(now) === settings.weekday;
  if (settings.frequency === '2days') return !state.lastDate || daysBetween(state.lastDate, today) >= 2;
  return true;
}

/** Was hat sich seit `since` getan? */
export function changesSince(regs, since) {
  const fresh = regs.filter((r) => r.created_at > since && r.status !== 'cancelled');
  const cancelled = regs.filter((r) => r.status === 'cancelled' && r.cancelled_at > since && !(r.created_at > since));
  const promoted = regs.filter((r) => r.status === 'confirmed' && r.promoted_at > since && !(r.created_at > since));
  // Plätze nachträglich geändert („Plätze ändern“ in /admin): Stand vor der ersten Änderung seit `since` → jetzt
  const changed = regs.filter((r) => r.status !== 'cancelled' && !(r.created_at > since))
    .map((r) => ({ ...r, seats_before: (r.seat_changes || []).find((c) => c.at > since)?.from }))
    .filter((r) => r.seats_before !== undefined && r.seats_before !== r.seats);
  return { fresh, cancelled, promoted, changed, count: fresh.length + cancelled.length + promoted.length + changed.length };
}

/**
 * force = true: sofort schicken (Test aus /admin), ohne den Stand „zuletzt verschickt“ zu verändern.
 * Ergebnis: 'sent' | 'none' (keine Änderungen) | 'not-due' (laut Einstellung gerade nicht dran)
 */
export async function runDigest({ force = false, now = new Date() } = {}) {
  const [settings, state] = await Promise.all([digestSettings(), readNote('digest')]);
  if (!force && !isDue(settings, state, now)) return 'not-due';
  const since = state.lastAt || new Date(now.getTime() - 864e5).toISOString();
  const [regs, status] = await Promise.all([listRegistrations(), seatStatus()]);
  const changes = changesSince(regs, since);
  const done = () => writeNote('digest', { lastDate: berlinDate(now), lastAt: now.toISOString() });
  if (!force && !changes.count && settings.onlyChanges) { await done(); return 'none'; }
  if (!settings.recipients.length) throw new Error('Keine Empfänger für die Update-Mail eingetragen');
  const waitlist = regs.filter((r) => r.status === 'waitlist');
  await sendDigest({ ...changes, status, waitlist, since, recipients: settings.recipients });
  if (!force) await done();
  return 'sent';
}
