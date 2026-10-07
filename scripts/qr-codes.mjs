// Erzeugt die QR-Codes für den Druck: npm run qr
// Ergebnis in druck/qr-codes/ – SVG (Vektor, für Druckerei/Grafiker) und PNG (2000 px, für Word/Canva).
import QRCode from 'qrcode';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://anmeldung.baufinanz-dueren.de';
const CODES = [
  { name: 'allgemein', url: BASE },               // ohne Quelle, z. B. Website, Social Media
  { name: 'zeitung', url: `${BASE}/zeitung` },    // Zeitungsannonce
  { name: 'flyer', url: `${BASE}/flyer` },        // Flyer
  { name: 'plakat', url: `${BASE}/plakat` },      // Einladungsplakat
];

// Fehlerkorrektur „Q“ (25 %): bleibt lesbar, auch wenn der Druck leicht verschmiert oder verkratzt ist
const options = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#000000', light: '#ffffff' } };
const dir = new URL('../druck/qr-codes/', import.meta.url);
await mkdir(dir, { recursive: true });

for (const { name, url } of CODES) {
  await writeFile(new URL(`qr-${name}.svg`, dir), await QRCode.toString(url, { ...options, type: 'svg' }));
  await writeFile(new URL(`qr-${name}.png`, dir), await QRCode.toBuffer(url, { ...options, width: 2000 }));
  console.log(`qr-${name}: ${url}`);
}
