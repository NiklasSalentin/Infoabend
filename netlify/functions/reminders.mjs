import { runReminders } from '../lib/reminders.mjs';
import { useSite } from '../lib/event.mjs';

// Läuft alle 10 Minuten (Netlify-Zeitplan). Vor dem 2.12. passiert nichts; ab dem Erinnerungstermin werden
// je Lauf so viele Erinnerungen verschickt, wie in 20 Sekunden gehen – der Rest beim nächsten Lauf.
export default async (req, context) => {
  useSite(context);
  try {
    const result = await runReminders();
    console.log('Erinnerungen:', result);
    return new Response(result);
  } catch (e) {
    console.error('Erinnerungen fehlgeschlagen', e);
    return new Response('Fehler', { status: 500 });
  }
};

export const config = { schedule: '*/10 * * * *' };
