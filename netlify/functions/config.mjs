// GET /api/config – öffentliche Einstellungen für die Seite, z. B. die Meta-Pixel-ID.
// Die ID wird in Netlify als Umgebungsvariable META_PIXEL_ID eingetragen (kein Geheimnis, aber so ohne Code-Änderung austauschbar).
export default async () =>
  new Response(JSON.stringify({ metaPixelId: (process.env.META_PIXEL_ID || '').replace(/\D/g, '') || null }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });

export const config = { path: '/api/config' };
