import { timingSafeEqual } from 'node:crypto';
import { seatStatus, listRegistrations, getRegistration, promoteRegistration, cancelRegistration, changeSeats, markInvited, deleteRegistration, updateSettings, resetStats, purgePersonalData, visitStats, stopReminders, readNote, json } from '../lib/db.mjs';
import { sendConfirmation, sendSeatChange } from '../lib/mail.mjs';
import { useSite, EVENT } from '../lib/event.mjs';
import { runDigest, digestSettings, saveDigestSettings } from '../lib/digest.mjs';
import { reminderOverview, sendReminderTest, runCalendarReminder } from '../lib/reminders.mjs';
import { mailCatalog, previewMail } from '../lib/previews.mjs';

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const given = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// /api/admin – Einstellungen & Anmeldeliste (passwortgeschützt)
export default async (req, context) => {
  useSite(context);
  if (!authorized(req)) return json({ error: 'Nicht berechtigt' }, 401);
  try {
    return await handle(req, context);
  } catch (e) {
    console.error(e);
    return json({ error: 'Speicher gerade nicht erreichbar – bitte in einer Minute erneut versuchen.' }, 500);
  }
};

async function handle(req, context) {
  if (req.method === 'GET') {
    const [status, registrations, stats, digest, digestState] = await Promise.all([
      seatStatus(),
      listRegistrations(),
      visitStats().catch((e) => { console.error(e); return null; }),
      digestSettings(),
      readNote('digest'),
    ]);
    return json({ status, registrations, stats, reminders: reminderOverview(registrations), mails: mailCatalog(), digest: { ...digest, lastAt: digestState.lastAt || null } });
  }

  if (req.method !== 'POST') return json({ error: 'Methode nicht erlaubt' }, 405);
  const b = await req.json().catch(() => ({}));

  switch (b.action) {
    case 'settings': {
      const total = Number.parseInt(b.totalSeats, 10);
      const max = Number.parseInt(b.maxPerPerson, 10);
      const batch = Number.parseInt(b.displayBatch, 10) || 0;
      const refill = Number.parseInt(b.displayRefill, 10) || 0;
      if (!(total >= 0) || !(max >= 1) || !(batch >= 0) || !(refill >= 0)) return json({ error: 'Ungültige Werte' }, 400);
      const { promoted } = await updateSettings({
        total_seats: total, max_per_person: max, registration_open: b.open !== false,
        display_batch: batch, display_refill: refill, show_free: b.showFree !== false,
      });
      // Einladungs-Mails an Nachgerückte verschickt /admin danach einzeln (Aktion „resend“)
      return json({ ok: true, promoted: promoted.map((r) => r.id) });
    }
    case 'promote': {
      const result = await promoteRegistration(b.id);
      if (result !== 'confirmed') return json({ error: result === 'full' ? 'Nicht genug freie Plätze' : 'Eintrag nicht auf Warteliste' }, 409);
      return json({ ok: true, promoted: [b.id] });
    }
    case 'cancel': {
      const r = await cancelRegistration(b.id, 'admin');
      if (!r) return json({ error: 'Anmeldung nicht gefunden' }, 404);
      return json({ ok: true, promoted: r.promoted.map((x) => x.id) });
    }
    case 'seats': {
      // Plätze nachbuchen / ändern (z. B. Gast meldet sich: „Wir kommen zu dritt“)
      const seats = Number.parseInt(b.seats, 10);
      if (!(seats >= 1 && seats <= 20)) return json({ error: 'Bitte 1 bis 20 Plätze angeben' }, 400);
      const companions = (Array.isArray(b.companions) ? b.companions : [])
        .map((c) => (typeof c === 'string' ? c.trim().slice(0, 120) : '')).filter(Boolean).slice(0, seats - 1);
      const r = await changeSeats(b.id, seats, companions);
      if (r.status === 'invalid') return json({ error: 'Anmeldung nicht gefunden oder storniert' }, 404);
      if (r.status === 'full') {
        return json({ error: `Nicht genug freie Plätze: ${r.free} frei, gebraucht ${seats - r.from}. Erst oben „Plätze gesamt“ erhöhen.` }, 409);
      }
      const promoted = (r.promoted || []).map((x) => x.id);
      // Gast über die Änderung informieren – nur wenn die Mail freigegeben ist und er nicht gerade selbst nachgerückt ist
      // (dann bekommt er ohnehin die Einladung mit der neuen Platzzahl)
      let mailed = false;
      if (r.status === 'ok' && b.notify === true && EVENT.mailStatus?.aenderung === 'freigegeben' && !promoted.includes(b.id)) {
        const reg = await getRegistration(b.id);
        if (reg?.status === 'confirmed') {
          try {
            await sendSeatChange(reg, r.from);
            mailed = true;
          } catch (e) {
            console.error(e);
            return json({ ok: true, promoted, mailed, mailError: `Gespeichert, aber die Mail konnte nicht verschickt werden: ${e.message}` });
          }
        }
      }
      return json({ ok: true, promoted, mailed, unchanged: r.status === 'unchanged' });
    }
    case 'delete': {
      if (!(await deleteRegistration(b.id))) return json({ error: 'Nur stornierte Anmeldungen können gelöscht werden' }, 400);
      return json({ ok: true });
    }
    case 'reset-stats': {
      await resetStats();
      return json({ ok: true });
    }
    case 'purge': {
      if (b.confirm !== 'LÖSCHEN') return json({ error: 'Bitte zur Bestätigung LÖSCHEN eingeben' }, 400);
      await purgePersonalData();
      return json({ ok: true });
    }
    case 'preview': {
      // Vorschau einer Mail mit Beispiel-Gast (auch Entwürfe)
      const p = previewMail(String(b.key || ''));
      return p ? json(p) : json({ error: 'Unbekannte Mail' }, 404);
    }
    case 'calendar-reminder': {
      // Kalender-Erinnerung an alle ohne Kalendereintrag – in Portionen, /admin ruft erneut auf, bis open = 0
      try { return json({ ok: true, ...(await runCalendarReminder()) }); } catch (e) { return json({ error: e.message }, 409); }
    }
    case 'digest-settings': {
      // Update-Mail: Empfänger, Häufigkeit, Uhrzeit, nur bei Änderungen
      try { return json({ ok: true, digest: await saveDigestSettings(b) }); } catch (e) { return json({ error: e.message }, 400); }
    }
    case 'digest': {
      // Update-Mail sofort an die eingestellten Empfänger schicken (zum Testen) – ändert nichts am geplanten Versand
      try { await runDigest({ force: true }); } catch (e) { return json({ error: `Mail konnte nicht verschickt werden: ${e.message}` }, 502); }
      return json({ ok: true });
    }
    case 'reminder-test': {
      // Alle Erinnerungen mit Beispiel-Gast an info@ – zum Ansehen vor dem Versand
      try { await sendReminderTest(); } catch (e) { return json({ error: `Mail konnte nicht verschickt werden: ${e.message}` }, 502); }
      return json({ ok: true });
    }
    case 'reminder-off': {
      // Gast möchte keine Erinnerungen mehr (z. B. per Telefon oder Mail gesagt)
      if (!(await stopReminders(b.id, 'admin'))) return json({ error: 'Anmeldung nicht gefunden' }, 404);
      return json({ ok: true });
    }
    case 'resend': {
      // Bestätigung (erneut) schicken – bei Nachgerückten die Einladung „Gute Nachricht: Platz frei geworden“
      const reg = await getRegistration(b.id);
      if (!reg || reg.status !== 'confirmed') return json({ error: 'Nur für bestätigte Anmeldungen' }, 400);
      try {
        await sendConfirmation(reg);
      } catch (e) {
        console.error(e);
        return json({ error: `Mail konnte nicht verschickt werden: ${e.message}` }, 502);
      }
      if (reg.invite_pending) await markInvited(b.id);
      return json({ ok: true });
    }
    default:
      return json({ error: 'Unbekannte Aktion' }, 400);
  }
}

export const config = { path: '/api/admin' };
