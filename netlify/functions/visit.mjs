import { db } from '../lib/db.mjs';
import { visitorHash } from '../lib/visitor.mjs';

// POST /api/visit – Besuchszählung für /admin: type 'view' (Seite geöffnet) oder 'engaged' (30 s aktiv)
export default async (req, context) => {
  const done = new Response(null, { status: 204 });
  if (req.method !== 'POST') return done;
  const hash = visitorHash(req, context);
  if (!hash) return done;
  let b = {};
  try { b = JSON.parse(await req.text()); } catch {}
  const source = typeof b.source === 'string' ? b.source.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) : '';
  try {
    const { error } = b.type === 'engaged'
      ? await db().rpc('mark_engaged', { p_hash: hash })
      : await db().rpc('track_visit', { p_hash: hash, p_source: source || null });
    if (error) console.error(error);
  } catch (e) {
    console.error('Besuchszählung:', e.message); // z. B. Datenbank noch nicht eingerichtet
  }
  return done;
};

export const config = { path: '/api/visit' };
