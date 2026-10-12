import { trackVisit, markEngaged } from '../lib/db.mjs';
import { visitorHash } from '../lib/visitor.mjs';

// POST /api/visit – Besuchszählung für /admin: type 'view' (Seite geöffnet) oder 'engaged' (30 s aktiv)
export default async (req, context) => {
  const done = new Response(null, { status: 204 });
  if (req.method !== 'POST') return done;
  let b = {};
  try { b = JSON.parse(await req.text()); } catch {}
  const source = typeof b.source === 'string' ? b.source.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) : '';
  try {
    const hash = await visitorHash(req, context);
    if (!hash) return done;
    if (b.type === 'engaged') await markEngaged(hash);
    else await trackVisit(hash, source || null);
  } catch (e) {
    console.error('Besuchszählung:', e.message); // Zählfehler dürfen die Seite nie stören
  }
  return done;
};

export const config = { path: '/api/visit' };
