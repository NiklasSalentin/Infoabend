import { seatStatus, json } from '../lib/db.mjs';

// GET /api/status – Restplätze für die Anzeige auf der Landingpage: angezeigte Zahl (Kontingent,
// public/plaetze.js) „von“ der echten Gesamtzahl.
export default async () => {
  try {
    const s = await seatStatus();
    return json({
      total: s.total_seats,
      free: s.shown_free,
      released: s.shown_released,
      maxPerPerson: s.max_per_person,
      open: s.registration_open,
      // Zähler „Personen bereits angemeldet“ nur ohne Kontingent – sonst widerspräche er „120 von 400 frei“
      attendees: s.shown_free < s.free ? 0 : s.booked,
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Status nicht verfügbar' }, 500);
  }
};

export const config = { path: '/api/status' };
