import { runDigest, berlinHour } from '../lib/digest.mjs';
import { useSite } from '../lib/event.mjs';

// Läuft stündlich (Netlify-Zeitplan) und verschickt um 20 Uhr deutscher Zeit die Abend-Zusammenfassung –
// so stimmt die Uhrzeit auch nach der Zeitumstellung.
export default async (req, context) => {
  useSite(context);
  if (berlinHour() !== 20) return new Response('nicht 20 Uhr');
  try {
    const result = await runDigest();
    console.log('Abend-Zusammenfassung:', result);
    return new Response(result);
  } catch (e) {
    console.error('Abend-Zusammenfassung fehlgeschlagen', e);
    return new Response('Fehler', { status: 500 });
  }
};

export const config = { schedule: '@hourly' };
