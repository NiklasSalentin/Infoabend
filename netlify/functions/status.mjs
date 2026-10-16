import { seatStatus, json } from '../lib/db.mjs';

// GET /api/status – Restplätze für die Anzeige auf der Landingpage.
// Bewusst nur die angezeigte Zahl (Kontingent, public/plaetze.js) – die echte Gesamtzahl steht nur in /admin.
export default async () => {
  try {
    const s = await seatStatus();
    return json({
      free: s.shown_free,
      released: s.shown_released,
      maxPerPerson: s.max_per_person,
      open: s.registration_open,
      attendees: s.booked,
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Status nicht verfügbar' }, 500);
  }
};

export const config = { path: '/api/status' };
