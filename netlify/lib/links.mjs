// Persönliche Links mit Prüfcode (Absagen, Erinnerungen abbestellen, Kalender-Knopf).
// Der Code wird aus der Anmeldungs-ID und einem geheimen Wert gebildet – ohne ihn kann niemand
// fremde Anmeldungen absagen oder als „Kalender eingetragen“ markieren.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { siteUrl } from './event.mjs';
import { secretSalt } from './db.mjs';

export const sign = async (purpose, id) =>
  createHmac('sha256', await secretSalt()).update(`${purpose}:${id}`).digest('base64url').slice(0, 22);

/** Prüft den Code aus einem Link. purpose: 'absagen' | 'abbestellen' | 'kalender' */
export async function validToken(purpose, id, token) {
  if (typeof id !== 'string' || typeof token !== 'string' || !id || !token) return false;
  const expected = Buffer.from(await sign(purpose, id));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Persönlicher Kalender-Link – so sieht /admin, wer den Termin über den Knopf eingetragen hat.
 * via: 'mail' (Bestätigungs-Mail) | 'seite' (nach der Anmeldung) | 'erinnerung' (Erinnerungs-Mail)
 * Beispiel: https://anmeldung.baufinanz-dueren.de/kalender?id=…&t=…&k=mail
 */
export async function calendarUrl(id, via, { absolute = true } = {}) {
  const path = `/kalender?id=${encodeURIComponent(id)}&t=${await sign('kalender', id)}&k=${via}`;
  return absolute ? siteUrl() + path : path;
}
