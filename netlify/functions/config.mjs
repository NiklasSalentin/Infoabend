// GET /api/config – öffentliche Einstellungen für die Seite (keine Geheimnisse, stehen ohnehin im Seitenquelltext):
// - Meta-Pixel-ID aus Netlify META_PIXEL_ID (leer = Meta aus)
// - Google-Ads-Konto und Conversion-Label (Conversion-Aktion „Anmeldung Infoabend“); per Netlify
//   GOOGLE_ADS_ID / GOOGLE_ADS_LABEL änderbar, GOOGLE_ADS_ID=off schaltet Google Ads ab
const ADS_ID = 'AW-17036255610';
const ADS_LABEL = '1lhoCPqMrqEdEPrCwrs_';

export default async () => {
  const adsId = (process.env.GOOGLE_ADS_ID || ADS_ID).trim();
  const body = {
    metaPixelId: (process.env.META_PIXEL_ID || '').replace(/\D/g, '') || null,
    googleAdsId: /^AW-\d+$/.test(adsId) ? adsId : null,
    googleAdsLabel: (process.env.GOOGLE_ADS_LABEL || ADS_LABEL).trim(),
  };
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
};

export const config = { path: '/api/config' };
