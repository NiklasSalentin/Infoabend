import { timingSafeEqual } from 'node:crypto';
import { db, seatStatus, json } from '../lib/db.mjs';
import { sendConfirmation } from '../lib/mail.mjs';
import { useSite } from '../lib/event.mjs';

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

  if (req.method === 'GET') {
    const [status, list] = await Promise.all([
      seatStatus(),
      db().from('registrations').select('*').order('created_at', { ascending: true }),
    ]);
    if (list.error) return json({ error: list.error.message }, 500);
    return json({ status, registrations: list.data });
  }

  if (req.method !== 'POST') return json({ error: 'Methode nicht erlaubt' }, 405);
  const b = await req.json().catch(() => ({}));

  switch (b.action) {
    case 'settings': {
      const total = Number.parseInt(b.totalSeats, 10);
      const max = Number.parseInt(b.maxPerPerson, 10);
      if (!(total >= 0) || !(max >= 1)) return json({ error: 'Ungültige Werte' }, 400);
      const { error } = await db().from('settings')
        .update({ total_seats: total, max_per_person: max, registration_open: b.open !== false, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    case 'promote': {
      const { data, error } = await db().rpc('promote_registration', { p_id: b.id });
      if (error) return json({ error: error.message }, 500);
      if (data !== 'confirmed') return json({ error: data === 'full' ? 'Nicht genug freie Plätze' : 'Eintrag nicht auf Warteliste' }, 409);
      const { data: reg } = await db().from('registrations').select('*').eq('id', b.id).single();
      await sendConfirmation(reg).catch((e) => console.error(e));
      return json({ ok: true });
    }
    case 'cancel': {
      const { error } = await db().from('registrations').update({ status: 'cancelled' }).eq('id', b.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    case 'resend': {
      const { data: reg, error } = await db().from('registrations').select('*').eq('id', b.id).single();
      if (error || reg.status !== 'confirmed') return json({ error: 'Nur für bestätigte Anmeldungen' }, 400);
      await sendConfirmation(reg);
      return json({ ok: true });
    }
    default:
      return json({ error: 'Unbekannte Aktion' }, 400);
  }
};

export const config = { path: '/api/admin' };
