import { runDigest } from '../lib/digest.mjs';
import { useSite } from '../lib/event.mjs';

// Läuft stündlich (Netlify-Zeitplan) und verschickt die Update-Mail zu den Anmeldungen, wenn sie laut
// Einstellung in /admin fällig ist (Empfänger, Häufigkeit, Uhrzeit in deutscher Zeit, nur bei Änderungen).
export default async (req, context) => {
  useSite(context);
  try {
    const result = await runDigest();
    if (result !== 'not-due') console.log('Update-Mail:', result);
    return new Response(result);
  } catch (e) {
    console.error('Update-Mail fehlgeschlagen', e);
    return new Response('Fehler', { status: 500 });
  }
};

export const config = { schedule: '@hourly' };
