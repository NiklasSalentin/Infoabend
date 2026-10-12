// Fragen aus der Anmeldung direkt an die AskMeSomething-App weitergeben
// (fragen.baufinanz-dueren.de → erscheinen dort in der Speaker-Ansicht, „an alle“).
// Klappt die Weitergabe nicht (App aus, Fragerunde geschlossen), bleibt die Frage trotzdem
// in der Anmeldung gespeichert und ist in /admin sichtbar – die Anmeldung selbst scheitert nie daran.
import { createHash } from 'node:crypto';

export const ASKME_MAX = 300; // Höchstlänge einer Frage in AskMeSomething

export async function forwardQuestion({ text, name, ticket }) {
  const base = (process.env.ASKME_URL || 'https://fragen.baufinanz-dueren.de').replace(/\/$/, '');
  if (!text || process.env.ASKME_URL === 'off') return { skipped: true };
  try {
    const res = await fetch(`${base}/api/questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, ASKME_MAX),
        name: (name || '').slice(0, 60),
        speaker: null, // an alle Speaker
        // eigene Geräte-ID je Anmeldung, damit die Mengenbegrenzung der App nicht greift
        clientId: 'anmeldung-' + createHash('sha256').update(String(ticket)).digest('hex').slice(0, 16),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('AskMeSomething:', res.status, await res.text().catch(() => ''));
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error('AskMeSomething nicht erreichbar:', e.message);
    return { ok: false };
  }
}
