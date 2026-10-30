// Vorschau aller Gäste- und Team-Mails für /admin – mit Beispiel-Gast „Maria Muster“ (2 Plätze).
// So sieht man jederzeit, wie jede Mail gerade aussieht, auch Entwürfe, die noch nicht verschickt werden.
import { EVENT } from './event.mjs';
import {
  confirmationHtml, seatChangeHtml, seatChangeSubject, waitlistHtml, reminderHtml, reminderSubject, calendarReminderHtml, calendarReminderSubject, digestHtml,
} from './mail.mjs';

const SAMPLE = { id: 'beispiel', name: 'Maria Muster', seats: 2, companions: ['Peter Muster'] };
// Links der Vorschau führen ins Leere (#), damit beim Ansehen nichts ausgelöst wird
const LINKS = { cancelUrl: '#', unsubscribeUrl: '#', calendarUrl: '#' };
const released = (key) => EVENT.mailStatus?.[key] === 'freigegeben';

/** Liste aller Mails mit Anlass und Status (für /admin) */
export function mailCatalog() {
  return [
    { key: 'bestaetigung', name: 'Bestätigung', when: 'sofort nach der Anmeldung', status: 'aktiv' },
    { key: 'nachgerueckt', name: 'Bestätigung nach Nachrücken', when: 'wenn ein Platz frei wird und jemand von der Warteliste nachrückt', status: 'aktiv' },
    { key: 'aenderung', name: 'Anmeldung aktualisiert', when: 'nach „Plätze ändern“ in /admin, wenn das Häkchen „Gast per E-Mail informieren“ gesetzt ist', status: released('aenderung') ? 'aktiv' : 'entwurf' },
    { key: 'warteliste', name: 'Warteliste', when: 'sofort nach einer Anmeldung auf die Warteliste', status: 'aktiv' },
    ...EVENT.reminders.map((r) => ({
      key: `erinnerung-${r.key}`, name: `Erinnerung ${r.label.replace(/\s*\(.*\)$/, '')}`, when: `automatisch ${r.label}`,
      status: released('erinnerungen') ? 'aktiv' : 'entwurf',
    })),
    { key: 'kalender', name: 'Kalender-Erinnerung', when: 'per Knopf in /admin an Gäste ohne Kalendereintrag', status: released('kalender') ? 'aktiv' : 'entwurf' },
    { key: 'update', name: 'Update-Mail (an euch)', when: 'laut Einstellung „Update-Mail zu den Anmeldungen“', status: 'aktiv' },
  ];
}

/** Betreff + HTML einer Mail mit Beispiel-Daten. key aus mailCatalog() */
export function previewMail(key) {
  const day = 864e5;
  if (key === 'bestaetigung') return { subject: 'Ihr Sitzplatz ist gesichert!', html: confirmationHtml(SAMPLE, LINKS) };
  if (key === 'nachgerueckt') {
    return { subject: 'Gute Nachricht: Ihr Sitzplatz ist gesichert!', html: confirmationHtml({ ...SAMPLE, promoted_at: new Date().toISOString() }, LINKS) };
  }
  if (key === 'aenderung') {
    return { subject: seatChangeSubject(), html: seatChangeHtml({ ...SAMPLE, seats: 3, companions: ['Peter Muster', 'Lena Muster'] }, { ...LINKS, changedFrom: 2 }) };
  }
  if (key === 'warteliste') return { subject: 'Sie stehen auf der Warteliste – Infoabend Baufinanz Düren', html: waitlistHtml(SAMPLE) };
  if (key.startsWith('erinnerung-')) {
    const stage = key.slice('erinnerung-'.length);
    if (!EVENT.reminders.some((r) => r.key === stage)) return null;
    return { subject: reminderSubject(stage), html: reminderHtml(SAMPLE, stage, LINKS) };
  }
  if (key === 'kalender') return { subject: calendarReminderSubject(), html: calendarReminderHtml(SAMPLE, LINKS) };
  if (key === 'update') {
    const fresh = [{ ...SAMPLE, email: 'maria@example.de', phone: '0170 1234567', status: 'confirmed', source: 'zeitung', questions: 'Wie viel Eigenkapital brauche ich?' }];
    const cancelled = [{ name: 'Jan Beispiel', seats: 1, companions: [], email: 'jan@example.de', phone: '0171 7654321', status: 'cancelled', cancelled_via: 'link' }];
    const changed = [{ name: 'Familie Schmitz', seats: 3, seats_before: 2, companions: ['Anna Schmitz', 'Tom Schmitz'], email: 'schmitz@example.de', phone: '0172 1112223', status: 'confirmed' }];
    return {
      subject: 'Infoabend: 2 Plätze neu gebucht, 1 Platz abgesagt, 1 Platz nachgebucht – 47 von 120 Plätzen belegt',
      html: digestHtml({ fresh, cancelled, promoted: [], changed, status: { booked: 47, total_seats: 120, free: 73, attendees: 23 }, waitlist: [{ seats: 3 }], since: new Date(Date.now() - day).toISOString() }),
    };
  }
  return null;
}
