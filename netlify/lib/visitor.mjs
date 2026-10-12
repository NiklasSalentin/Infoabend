// Unumkehrbarer Besucher-Code für die Auswertung in /admin – ohne Cookies, ohne Speicher auf dem Gerät.
// Aus IP + Browser + geheimem Salz wird ein Hash gebildet; die IP-Adresse wird nie gespeichert.
// Bots/Vorschau-Dienste (z. B. WhatsApp-Linkvorschau, Suchmaschinen) werden nicht gezählt.
import { createHash } from 'node:crypto';
import { secretSalt } from './db.mjs';

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget|python|headless|lighthouse|pingdom|uptime|monitor/i;

export async function visitorHash(req, context) {
  const ua = req.headers.get('user-agent') || '';
  if (!ua || BOTS.test(ua)) return null;
  // „Do Not Track“ bzw. „Global Privacy Control“ im Browser eingeschaltet → nicht zählen
  if (req.headers.get('sec-gpc') === '1' || req.headers.get('dnt') === '1') return null;
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || '';
  const salt = process.env.ANALYTICS_SALT || await secretSalt();
  return createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 32);
}
