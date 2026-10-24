import { icsFile, googleCalendarUrl } from '../lib/ics.mjs';
import { useSite } from '../lib/event.mjs';
import { validToken } from '../lib/links.mjs';
import { markCalendar } from '../lib/db.mjs';

// GET /kalender – ein Knopf für alle Kalender (Link in der Bestätigungs-Mail):
// Android oder Gmail im Browser → Google Kalender mit fertig ausgefülltem Termin,
// alle anderen (iPhone, Mac, Outlook, Windows) → Kalenderdatei mit Ort, Adresse und Erinnerung
export default async (req, context) => {
  useSite(context);
  // Persönlicher Link (?id=…&t=…&k=mail|seite|erinnerung): in /admin vermerken, dass dieser Gast den Termin eingetragen hat
  const q = new URL(req.url).searchParams;
  try {
    // Sicherheits-Scanner in Firmen-Postfächern „klicken“ Links vorab – solche Roboter zählen nicht
    const robot = /bot|crawl|spider|scan|preview|safelinks|proofpoint|mimecast|barracuda|curl|wget|python|headless/i.test(req.headers.get('user-agent') || '');
    if (!robot && q.get('id') && await validToken('kalender', q.get('id'), q.get('t'))) {
      await markCalendar(q.get('id'), ['mail', 'seite', 'erinnerung'].includes(q.get('k')) ? q.get('k') : 'mail');
    }
  } catch (e) { console.error('Kalender-Klick nicht gespeichert', e); } // der Termin kommt trotzdem
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
