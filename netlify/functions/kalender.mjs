import { icsFile, googleCalendarUrl } from '../lib/ics.mjs';
import { useSite } from '../lib/event.mjs';

// GET /kalender – ein Knopf für alle Kalender (Link in der Bestätigungs-Mail):
// Android oder Gmail im Browser → Google Kalender mit fertig ausgefülltem Termin,
// alle anderen (iPhone, Mac, Outlook, Windows) → Kalenderdatei mit Ort, Adresse und Erinnerung
export default async (req, context) => {
  useSite(context);
  const ua = req.headers.get('user-agent') || '';
  let refHost = '';
  try { refHost = new URL(req.headers.get('referer') || '').hostname; } catch {}
  if (/android/i.test(ua) || /(^|\.)google\./.test(refHost)) {
    return new Response(null, { status: 302, headers: { location: googleCalendarUrl(), 'cache-control': 'no-store' } });
  }
  return new Response(icsFile(), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="Infoabend-Baufinanz-Dueren.ics"',
      'cache-control': 'no-store',
    },
  });
};

export const config = { path: '/kalender' };
