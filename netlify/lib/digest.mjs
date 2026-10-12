// Abend-Zusammenfassung an info@: einmal täglich um 20:00 Uhr (deutsche Zeit) – nur an Tagen mit neuen Anmeldungen.
import { listRegistrations, seatStatus, readNote, writeNote } from './db.mjs';
import { sendDigest } from './mail.mjs';

const berlinDate = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
export const berlinHour = (d = new Date()) => Number(d.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }));

/**
 * force = true: sofort schicken (Test aus /admin), ohne den Stand „zuletzt verschickt“ zu verändern.
 * Ergebnis: 'sent' | 'none' (keine neuen Anmeldungen) | 'already' (heute schon verschickt)
 */
export async function runDigest({ force = false } = {}) {
  const state = await readNote('digest');
  const today = berlinDate();
  if (!force && state.lastDate === today) return 'already';
  const since = state.lastAt || new Date(Date.now() - 864e5).toISOString();
  const [regs, status] = await Promise.all([listRegistrations(), seatStatus()]);
  const fresh = regs.filter((r) => r.created_at > since && r.status !== 'cancelled');
  if (!fresh.length && !force) {
    await writeNote('digest', { lastDate: today, lastAt: new Date().toISOString() });
    return 'none';
  }
  const waitlist = regs.filter((r) => r.status === 'waitlist');
  await sendDigest({ fresh, status, waitlist, since });
  if (!force) await writeNote('digest', { lastDate: today, lastAt: new Date().toISOString() });
  return 'sent';
}
