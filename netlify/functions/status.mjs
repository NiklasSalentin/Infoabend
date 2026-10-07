import { seatStatus, json } from '../lib/db.mjs';

// GET /api/status – Restplätze für die Anzeige auf der Landingpage
export default async () => {
  try {
    const s = await seatStatus();
    return json({
      total: s.total_seats,
      free: s.free,
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
