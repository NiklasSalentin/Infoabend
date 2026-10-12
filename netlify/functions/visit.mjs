import { trackVisit } from '../lib/db.mjs';
import { visitorHash } from '../lib/visitor.mjs';

// POST /api/visit – Aufrufzähler für /admin (Seite geöffnet)
export default async (req, context) => {
  const done = new Response(null, { status: 204 });
  if (req.method !== 'POST') return done;
  try {
    const hash = await visitorHash(req, context);
    if (!hash) return done;
    await trackVisit(hash);
  } catch (e) {
    console.error('Besuchszählung:', e.message); // Zählfehler dürfen die Seite nie stören
  }
  return done;
};

export const config = { path: '/api/visit' };
