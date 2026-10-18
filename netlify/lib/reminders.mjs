// Erinnerungs-Mails vor dem Infoabend – nur an Gäste mit Häkchen „Ja, erinnern Sie mich …“.
//
// Beispiel (Termine in event.mjs → reminders):
//   Frau Müller meldet sich am 20.10. an und setzt das Häkchen.
//   → Mi, 2.12. ab 10 Uhr: „Nur noch eine Woche“   → Di, 8.12. ab 10 Uhr: „Morgen ist es so weit“
//   Herr Weber meldet sich erst am 5.12. an → bekommt nur die Erinnerung am Vortag.
//   Wer sich weniger als 12 Stunden vor einer Erinnerung anmeldet, bekommt diese nicht (hat ja gerade die Bestätigung).
//
// In jeder Erinnerung: Link „Termin absagen“ (Platz wird frei, Warteliste rückt nach) und „Erinnerungen abbestellen“.
// Die Links enthalten einen Prüfcode – ohne ihn kann niemand fremde Anmeldungen absagen.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EVENT, siteUrl } from './event.mjs';
import { listRegistrations, markReminder, secretSalt } from './db.mjs';
import { sendReminder, smtpPool } from './mail.mjs';

/** Fassung des Einwilligungstextes im Formular (public/index.html) – bei Textänderung hochzählen */
export const REMINDER_CONSENT_VERSION = 'erinnerung-v1-2026-10';

const GAP_MS = 12 * 3600e3; // Mindestabstand zwischen Anmeldung/Nachrücken und Erinnerung
const MAX_TRIES = 3; // so oft wird eine Mail an dieselbe Adresse höchstens versucht
const eventStart = () => new Date(EVENT.startUtc.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));

// ---------------------------------------------------------------------------
// Links mit Prüfcode
// ---------------------------------------------------------------------------
const sign = async (purpose, id) =>
  createHmac('sha256', await secretSalt()).update(`${purpose}:${id}`).digest('base64url').slice(0, 22);

/** Prüft den Code aus einem Link. purpose: 'absagen' | 'abbestellen' */
export async function validToken(purpose, id, token) {
  if (typeof id !== 'string' || typeof token !== 'string' || !id || !token) return false;
  const expected = Buffer.from(await sign(purpose, id));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function reminderLinks(id) {
  const q = async (purpose) => `?id=${encodeURIComponent(id)}&t=${await sign(purpose, id)}`;
  return {
    cancelUrl: `${siteUrl()}/absagen${await q('absagen')}`,
    unsubscribeUrl: `${siteUrl()}/erinnerung-abbestellen${await q('abbestellen')}`,
  };
}

// ---------------------------------------------------------------------------
// Wer bekommt wann was?
// ---------------------------------------------------------------------------
/** Die gerade fällige Erinnerung (die späteste, deren Zeit erreicht ist) – null vorher und ab Beginn des Abends */
export function dueStage(now = new Date()) {
  if (now >= eventStart()) return null;
  return [...EVENT.reminders].reverse().find((s) => now >= new Date(s.sendUtc)) || null;
}

/** Bekommt diese Anmeldung die Erinnerung `stage` (noch)? */
export function needsReminder(r, stage) {
  if (r.status !== 'confirmed' || !r.reminder_consent) return false;
  if (r.reminders_sent?.[stage.key]) return false;
  // Spätere Erinnerung schon raus (z. B. nach Ausfall) → frühere nicht mehr nachschicken
  const later = EVENT.reminders.slice(EVENT.reminders.findIndex((s) => s.key === stage.key) + 1);
  if (later.some((s) => r.reminders_sent?.[s.key])) return false;
  if ((r.reminder_errors?.[stage.key] || 0) >= MAX_TRIES) return false;
  const confirmedAt = new Date(r.promoted_at || r.created_at).getTime();
  return confirmedAt <= new Date(stage.sendUtc).getTime() - GAP_MS;
}

/** Überblick für /admin: je Erinnerung Zeitpunkt, verschickt, noch offen */
export function reminderOverview(regs, now = new Date()) {
  const withConsent = regs.filter((r) => r.status === 'confirmed' && r.reminder_consent);
  return {
    consent: withConsent.length,
    confirmed: regs.filter((r) => r.status === 'confirmed').length,
    optout: regs.filter((r) => r.reminder_optout_at).length,
    selfCancelled: regs.filter((r) => r.cancelled_via === 'link').length,
    stages: EVENT.reminders.map((s) => ({
      key: s.key,
      label: s.label,
      sendUtc: s.sendUtc,
      started: now >= new Date(s.sendUtc),
      sent: regs.filter((r) => r.reminders_sent?.[s.key]).length,
      open: withConsent.filter((r) => needsReminder(r, s)).length,
      failed: regs.filter((r) => (r.reminder_errors?.[s.key] || 0) >= MAX_TRIES).length,
    })),
  };
}

/**
 * Fällige Erinnerungen verschicken, bis die Zeit (budgetMs) um ist – der Rest folgt beim nächsten Lauf
 * (alle 10 Minuten). Jede verschickte Mail wird sofort vermerkt, damit niemand eine doppelt bekommt.
 * Ergebnis: Text für das Protokoll.
 */
export async function runReminders({ now = new Date(), budgetMs = 20000 } = {}) {
  const stage = dueStage(now);
  if (!stage) return 'nichts fällig';
  const due = (await listRegistrations()).filter((r) => needsReminder(r, stage));
  if (!due.length) return `${stage.key}: alle verschickt`;

  const started = Date.now();
  const pool = smtpPool();
  let sent = 0;
  let failedInRow = 0;
  try {
    for (const r of due) {
      if (Date.now() - started > budgetMs) break;
      try {
        await sendReminder(r, stage.key, await reminderLinks(r.id), pool);
        await markReminder(r.id, stage.key);
        sent++;
        failedInRow = 0;
      } catch (e) {
        console.error(`Erinnerung an ${r.id} fehlgeschlagen`, e);
        await markReminder(r.id, stage.key, e.message || e);
        // Mehrere Fehler hintereinander = Postfach gestört → beim nächsten Lauf weiter
        if (++failedInRow >= 3) break;
      }
    }
  } finally {
    pool.close();
  }
  return `${stage.key}: ${sent} verschickt, ${due.length - sent} offen`;
}

/** Test aus /admin: beide Erinnerungen mit Beispiel-Gast an info@ (Links führen auf eine Beispiel-Seite) */
export async function sendReminderTest() {
  const sample = { id: 'test', name: 'Maria Muster', seats: 2, companions: ['Max Muster'] };
  const links = await reminderLinks('test');
  for (const s of EVENT.reminders) await sendReminder(sample, s.key, links, undefined, EVENT.notifyEmail);
}
