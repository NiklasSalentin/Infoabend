import { bookSeats, markRegistered, json } from '../lib/db.mjs';
import { sendConfirmation, sendWaitlist, notifyTeam } from '../lib/mail.mjs';
import { useSite } from '../lib/event.mjs';
import { forwardQuestion, ASKME_MAX } from '../lib/askme.mjs';
import { visitorHash } from '../lib/visitor.mjs';

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/register
export default async (req, context) => {
  useSite(context);
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
    // Straße und Hausnummer werden zusammen gespeichert (Spalte street)
    street: [str(b.street, 150), str(b.houseNumber, 20)].filter(Boolean).join(' ') || null,
    zip: str(b.zip, 10) || null,
    city: str(b.city, 100) || null,
    address_consent: false,
    questions: str(b.questions, ASKME_MAX) || null,
    // Werbekanal aus dem QR-Code, z. B. 'zeitung' (leer = direkt aufgerufen)
    source: str(b.source, 40).toLowerCase().replace(/[^a-z0-9-]/g, '') || null,
  };

  const errors = {};
  if (!reg.name) errors.name = 'Bitte geben Sie Ihren Namen an.';
  if (!EMAIL_RE.test(reg.email)) errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
  if (reg.phone.replace(/\D/g, '').length < 6) errors.phone = 'Bitte geben Sie Ihre Telefonnummer an.';
  if (b.privacyConsent !== true) errors.privacyConsent = 'Bitte bestätigen Sie die Datenschutzerklärung.';
  if (Object.keys(errors).length) return json({ error: 'Bitte prüfen Sie Ihre Angaben.', errors }, 422);

  let r;
  try {
    r = await bookSeats(reg, b.waitlist === true);
  } catch (e) {
    console.error(e);
    return json({ error: 'Die Anmeldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.' }, 500);
  }

  const messages = {
    duplicate: 'Mit dieser E-Mail-Adresse wurde bereits eine Anmeldung vorgenommen.',
    too_many: 'Die gewünschte Platzanzahl überschreitet das Maximum pro Person.',
    closed: 'Die Anmeldung ist derzeit geschlossen.',
    full: 'Leider sind nicht mehr genügend Plätze frei.',
  };
  if (messages[r.status]) return json({ status: r.status, free: r.free, error: messages[r.status] }, 409);

  const full = { ...reg, status: r.status, ticket_code: r.ticket_code };
  // Auswertung: diesen Besucher als „angemeldet“ markieren
  try {
    const hash = await visitorHash(req, context);
    if (hash) await markRegistered(hash, reg.source);
  } catch (e) { console.error(e); }
  // Frage vorab gleich an die AskMeSomething-App weitergeben (Fehler dort stoppen die Anmeldung nicht)
  const asked = reg.questions ? forwardQuestion({ text: reg.questions, name: reg.name, ticket: r.ticket_code }) : null;
  try {
    await Promise.all([
      r.status === 'confirmed' ? sendConfirmation(full) : sendWaitlist(full),
      notifyTeam(full),
    ]);
  } catch (e) {
    // Buchung ist gespeichert – Mail-Fehler nur loggen, Nachversand über /admin möglich
    console.error('Mailversand fehlgeschlagen', e);
    await asked;
    return json({ status: r.status, free: r.free, mailError: true });
  }
  await asked;
  return json({ status: r.status, free: r.free });
};

export const config = { path: '/api/register' };
