import { timingSafeEqual } from 'node:crypto';
import { seatStatus, listRegistrations, getRegistration, promoteRegistration, cancelRegistration, deleteRegistration, updateSettings, resetStats, purgePersonalData, visitStats, json } from '../lib/db.mjs';
import { sendConfirmation } from '../lib/mail.mjs';
import { useSite } from '../lib/event.mjs';
import { runDigest } from '../lib/digest.mjs';

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
    const [status, registrations, stats] = await Promise.all([
      seatStatus(),
      listRegistrations(),
      visitStats().catch((e) => { console.error(e); return null; }),
    ]);
    return json({ status, registrations, stats });
  }

  if (req.method !== 'POST') return json({ error: 'Methode nicht erlaubt' }, 405);
  const b = await req.json().catch(() => ({}));

  switch (b.action) {
    case 'settings': {
      const total = Number.parseInt(b.totalSeats, 10);
      const max = Number.parseInt(b.maxPerPerson, 10);
      if (!(total >= 0) || !(max >= 1)) return json({ error: 'Ungültige Werte' }, 400);
      await updateSettings({ total_seats: total, max_per_person: max, registration_open: b.open !== false });
      return json({ ok: true });
    }
    case 'promote': {
      const result = await promoteRegistration(b.id);
      if (result !== 'confirmed') return json({ error: result === 'full' ? 'Nicht genug freie Plätze' : 'Eintrag nicht auf Warteliste' }, 409);
      await sendConfirmation(await getRegistration(b.id)).catch((e) => console.error(e));
      return json({ ok: true });
    }
    case 'cancel': {
      if (!(await cancelRegistration(b.id))) return json({ error: 'Anmeldung nicht gefunden' }, 404);
      return json({ ok: true });
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
    case 'digest': {
      // Abend-Zusammenfassung sofort an info@ schicken (zum Testen) – ändert nichts am Abend-Versand
      try { await runDigest({ force: true }); } catch (e) { return json({ error: `Mail konnte nicht verschickt werden: ${e.message}` }, 502); }
      return json({ ok: true });
    }
    case 'resend': {
      const reg = await getRegistration(b.id);
      if (!reg || reg.status !== 'confirmed') return json({ error: 'Nur für bestätigte Anmeldungen' }, 400);
      try {
        await sendConfirmation(reg);
      } catch (e) {
        console.error(e);
        return json({ error: `Mail konnte nicht verschickt werden: ${e.message}` }, 502);
      }
      return json({ ok: true });
    }
    default:
      return json({ error: 'Unbekannte Aktion' }, 400);
  }
}

export const config = { path: '/api/admin' };
