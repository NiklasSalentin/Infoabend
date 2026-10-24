// Erinnerungs-Mails vor dem Infoabend – gehören zur Anmeldung (kein Newsletter, keine Werbung), gehen an alle
// bestätigten Gäste, außer sie haben abbestellt. Im Formular steht das im Datenschutz-Häkchen + Hinweis darunter.
//
// Beispiel (Termine in event.mjs → reminders):
//   Frau Müller meldet sich am 20.10. an.
//   → Mi, 25.11. ab 10 Uhr: „Noch zwei Wochen“ → Mi, 2.12.: „Nur noch eine Woche“ → Di, 8.12.: „Morgen ist es so weit“
//   Herr Weber meldet sich erst am 28.11. an → bekommt „eine Woche“ und „Vortag“.
//   Zusatzinfo-Kasten je Erinnerung: event.mjs → reminders → extra.
//   Wer sich weniger als 12 Stunden vor einer Erinnerung anmeldet, bekommt diese nicht (hat ja gerade die Bestätigung).
//
// In jeder Erinnerung: Link „Termin absagen“ (Platz wird frei, Warteliste rückt nach) und „Erinnerungen abbestellen“.
// Die Links enthalten einen Prüfcode – ohne ihn kann niemand fremde Anmeldungen absagen.
import { EVENT, siteUrl } from './event.mjs';
import { listRegistrations, markReminder, markCalendarReminder } from './db.mjs';
import { sign, validToken, calendarUrl } from './links.mjs';
import { sendReminder, sendCalendarReminder, smtpPool } from './mail.mjs';

const GAP_MS = 12 * 3600e3; // Mindestabstand zwischen Anmeldung/Nachrücken und Erinnerung
const MAX_TRIES = 3; // so oft wird eine Mail an dieselbe Adresse höchstens versucht
const eventStart = () => new Date(EVENT.startUtc.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));

// ---------------------------------------------------------------------------
// Links mit Prüfcode
// ---------------------------------------------------------------------------
export { validToken }; // Prüfcodes stehen in links.mjs

export async function reminderLinks(id) {
  const q = async (purpose) => `?id=${encodeURIComponent(id)}&t=${await sign(purpose, id)}`;
  return {
    cancelUrl: `${siteUrl()}/absagen${await q('absagen')}`,
    unsubscribeUrl: `${siteUrl()}/erinnerung-abbestellen${await q('abbestellen')}`,
    calendarUrl: await calendarUrl(id, 'erinnerung'),
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
  if (r.status !== 'confirmed' || r.reminder_optout_at) return false;
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
  const active = regs.filter((r) => r.status === 'confirmed' && !r.reminder_optout_at);
  return {
    released: EVENT.mailStatus?.erinnerungen === 'freigegeben',
    active: active.length,
    confirmed: regs.filter((r) => r.status === 'confirmed').length,
    optout: regs.filter((r) => r.reminder_optout_at).length,
    selfCancelled: regs.filter((r) => r.cancelled_via === 'link').length,
    stages: EVENT.reminders.map((s) => ({
      key: s.key,
      label: s.label,
      sendUtc: s.sendUtc,
      started: now >= new Date(s.sendUtc),
      sent: regs.filter((r) => r.reminders_sent?.[s.key]).length,
      open: active.filter((r) => needsReminder(r, s)).length,
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
  // Noch Entwurf (event.mjs → mailStatus.erinnerungen): nichts verschicken
  if (EVENT.mailStatus?.erinnerungen !== 'freigegeben') return 'Erinnerungen noch nicht freigegeben (Entwurf)';
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

/** Test aus /admin: alle Erinnerungen mit Beispiel-Gast an info@ (Links führen auf eine Beispiel-Seite) */
export async function sendReminderTest() {
  const sample = { id: 'test', name: 'Maria Muster', seats: 2, companions: ['Max Muster'] };
  const links = await reminderLinks('test');
  for (const s of EVENT.reminders) await sendReminder(sample, s.key, links, undefined, EVENT.notifyEmail);
}

// ---------------------------------------------------------------------------
// Kalender-Erinnerung (Knopf in /admin): an bestätigte Gäste ohne Kalendereintrag über den Knopf
// ---------------------------------------------------------------------------
/** Wer bekommt sie? Bestätigt, Kalender-Knopf nicht genutzt, Erinnerungen nicht abbestellt, noch nicht bekommen */
export const needsCalendarReminder = (r) =>
  r.status === 'confirmed' && !r.calendar_at && !r.reminder_optout_at && !r.calendar_reminder_at && !r.calendar_reminder_error;

/**
 * Verschickt so viele wie in `budgetMs` passen – /admin ruft so lange erneut auf, bis `open` 0 ist.
 * Ergebnis: { sent, failed, open }. Gesperrt, solange event.mjs → mailStatus.kalender nicht 'freigegeben' ist.
 */
export async function runCalendarReminder({ budgetMs = 7000 } = {}) {
  if (EVENT.mailStatus?.kalender !== 'freigegeben') throw new Error('Die Kalender-Erinnerung ist noch ein Entwurf und kann noch nicht verschickt werden.');
  const due = (await listRegistrations()).filter(needsCalendarReminder);
  const started = Date.now();
  const pool = smtpPool();
  let sent = 0;
  let failed = 0;
  try {
    for (const r of due) {
      if (Date.now() - started > budgetMs) break;
      try {
        await sendCalendarReminder(r, await reminderLinks(r.id), pool);
        await markCalendarReminder(r.id);
        sent++;
      } catch (e) {
        console.error(`Kalender-Erinnerung an ${r.id} fehlgeschlagen`, e);
        await markCalendarReminder(r.id, e.message || e);
        failed++;
        if (failed >= 3) break;
      }
    }
  } finally {
    pool.close();
  }
  return { sent, failed, open: (await listRegistrations()).filter(needsCalendarReminder).length };
}
