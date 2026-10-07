import { icsFile } from '../lib/ics.mjs';

// GET /api/ics – Kalendereintrag (Apple Kalender, Outlook, Android)
export default async () =>
  new Response(icsFile(), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="Infoabend-Baufinanz-Dueren.ics"',
    },
  });

export const config = { path: '/api/ics' };
