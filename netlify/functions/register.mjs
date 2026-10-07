import { db, json } from '../lib/db.mjs';
import { sendConfirmation, sendWaitlist, notifyTeam } from '../lib/mail.mjs';

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/register
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Methode nicht erlaubt' }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: 'Ungültige Anfrage' }, 400); }

  // Honeypot gegen Spam-Bots
  if (str(b.website)) return json({ status: 'confirmed' });

  const reg = {
    name: str(b.name, 120),
    email: str(b.email, 200).toLowerCase(),
    phone: str(b.phone, 40),
    seats: Number.parseInt(b.seats, 10) || 1,
    companions: Array.isArray(b.companions) ? b.companions.map((c) => str(c, 120)).filter(Boolean).slice(0, 10) : [],
    street: str(b.street, 150) || null,
    zip: str(b.zip, 10) || null,
    city: str(b.city, 100) || null,
    address_consent: b.addressConsent === true,
    questions: str(b.questions, 2000) || null,
  };
  const hasAddress = Boolean(reg.street || reg.zip || reg.city);

  const errors = {};
  if (!reg.name) errors.name = 'Bitte geben Sie Ihren Namen an.';
  if (!EMAIL_RE.test(reg.email)) errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
  if (reg.phone.replace(/\D/g, '').length < 6) errors.phone = 'Bitte geben Sie Ihre Telefonnummer an.';
  if (b.privacyConsent !== true) errors.privacyConsent = 'Bitte bestätigen Sie die Datenschutzerklärung.';
  if (hasAddress && !reg.address_consent) errors.addressConsent = 'Bitte bestätigen Sie den Versand per Post.';
  if (Object.keys(errors).length) return json({ error: 'Bitte prüfen Sie Ihre Angaben.', errors }, 422);
  if (!hasAddress) reg.address_consent = false;

  const { data, error } = await db().rpc('book_seats', {
    p_name: reg.name, p_email: reg.email, p_phone: reg.phone, p_seats: reg.seats,
    p_companions: reg.companions, p_street: reg.street, p_zip: reg.zip, p_city: reg.city,
    p_address_consent: reg.address_consent, p_questions: reg.questions,
    p_waitlist_ok: b.waitlist === true,
  });
  if (error) {
    console.error(error);
    return json({ error: 'Die Anmeldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.' }, 500);
  }

  const r = data[0];
  const messages = {
    duplicate: 'Mit dieser E-Mail-Adresse wurde bereits eine Anmeldung vorgenommen.',
    too_many: 'Die gewünschte Platzanzahl überschreitet das Maximum pro Person.',
    closed: 'Die Anmeldung ist derzeit geschlossen.',
    full: 'Leider sind nicht mehr genügend Plätze frei.',
  };
  if (messages[r.status]) return json({ status: r.status, free: r.free, error: messages[r.status] }, 409);

  const full = { ...reg, status: r.status, ticket_code: r.ticket_code };
  try {
    await Promise.all([
      r.status === 'confirmed' ? sendConfirmation(full) : sendWaitlist(full),
      notifyTeam(full),
    ]);
  } catch (e) {
    // Buchung ist gespeichert – Mail-Fehler nur loggen, Nachversand über /admin möglich
    console.error('Mailversand fehlgeschlagen', e);
    return json({ status: r.status, free: r.free, mailError: true });
  }
  return json({ status: r.status, free: r.free });
};

export const config = { path: '/api/register' };
