import { icsFile } from '../lib/ics.mjs';
import { useSite } from '../lib/event.mjs';

// GET /api/ics – Kalendereintrag (Apple Kalender, Outlook, Android)
export default async (req, context) => {
  useSite(context);
  return new Response(icsFile(), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="Infoabend-Baufinanz-Dueren.ics"',
    },
  });
};

export const config = { path: '/api/ics' };
