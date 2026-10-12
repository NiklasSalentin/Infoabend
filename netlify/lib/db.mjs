// Datenspeicher: Netlify Blobs (im Netlify-Projekt eingebaut, kein extra Konto nötig).
//
// Aufbau des Speichers „infoabend“:
//   event              → { settings: {...}, registrations: [...] }   alle Anmeldungen + Einstellungen
//   stats              → Aufrufzähler (Aufrufe und Besucher, gesamt und je Tag)
//   visitors/<code>    → ein Eintrag je Besucher (nur unumkehrbarer Code, keine IP)
//
// Gleichzeitige Änderungen (zwei Anmeldungen in derselben Sekunde) werden über „ETag“ abgesichert:
// geschrieben wird nur, wenn sich der Eintrag seit dem Lesen nicht verändert hat – sonst neu
// lesen und noch einmal versuchen. So wird nie überbucht und nichts geht verloren.
import { getStore } from '@netlify/blobs';
import { randomUUID, randomBytes } from 'node:crypto';

const DEFAULT_SETTINGS = { total_seats: 120, max_per_person: 2, registration_open: true };

let storeOptions = {};
/** Nur für Tests: anderen Speicher verwenden (z. B. lokalen BlobsServer). */
export const useStoreOptions = (opts) => { storeOptions = opts; };
const store = () => getStore({ name: 'infoabend', consistency: 'strong', ...storeOptions });

/**
 * Liest einen Eintrag, lässt `change` ihn verändern und schreibt ihn nur zurück, wenn ihn
 * zwischendurch niemand anders geändert hat. `change(data)` gibt { data, result } zurück;
 * `data: undefined` = nichts schreiben.
 */
async function mutate(key, init, change) {
  const s = store();
  for (let attempt = 0; attempt < 25; attempt++) {
    const cur = await s.getWithMetadata(key, { type: 'json' });
    if (cur && !cur.etag) throw new Error(`Speicher lieferte keinen ETag (${key}) – Schreiben wäre unsicher`);
    const { data, result } = change(cur ? cur.data : init());
    if (data === undefined) return result;
    const { modified } = await s.setJSON(key, data, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (modified) return result;
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * (attempt + 1)));
  }
  throw new Error(`Speicher ausgelastet (${key}) – bitte erneut versuchen`);
}

// ---------------------------------------------------------------------------
// Anmeldungen und Plätze
// ---------------------------------------------------------------------------
const newEvent = () => ({ settings: { ...DEFAULT_SETTINGS }, registrations: [] });

function summarize(ev) {
  const confirmed = ev.registrations.filter((r) => r.status === 'confirmed');
  const booked = confirmed.reduce((a, r) => a + r.seats, 0);
  return {
    total_seats: ev.settings.total_seats,
    booked,
    free: Math.max(ev.settings.total_seats - booked, 0),
    max_per_person: ev.settings.max_per_person,
    registration_open: ev.settings.registration_open,
    attendees: confirmed.length,
  };
}

async function readEvent() {
  return (await store().get('event', { type: 'json' })) || newEvent();
}

/** Plätze gesamt / belegt / frei – für die Seite und /admin */
export async function seatStatus() {
  return summarize(await readEvent());
}

/** Alle Anmeldungen (älteste zuerst) */
export async function listRegistrations() {
  return (await readEvent()).registrations;
}

export async function getRegistration(id) {
  return (await readEvent()).registrations.find((r) => r.id === id) || null;
}

/**
 * Atomare Buchung. Ergebnis: { status: 'confirmed' | 'waitlist' | 'full' | 'duplicate' | 'closed' | 'too_many',
 * ticket_code, free }
 */
export function bookSeats(reg, waitlistOk) {
  return mutate('event', newEvent, (ev) => {
    const s = ev.settings;
    const stop = (status, free = 0) => ({ result: { status, ticket_code: null, free } });
    if (!s.registration_open) return stop('closed');
    if (reg.seats < 1 || reg.seats > s.max_per_person) return stop('too_many');
    if (ev.registrations.some((r) => r.email === reg.email && r.status !== 'cancelled')) return stop('duplicate');
    const free = s.total_seats - summarize(ev).booked;
    let status;
    if (free >= reg.seats) status = 'confirmed';
    else if (waitlistOk) status = 'waitlist';
    else return stop('full', Math.max(free, 0));

    const codes = new Set(ev.registrations.map((r) => r.ticket_code));
    let ticket_code;
    do ticket_code = randomBytes(4).toString('hex').toUpperCase(); while (codes.has(ticket_code));
    ev.registrations.push({
      id: randomUUID(), created_at: new Date().toISOString(), status, ...reg, privacy_consent: true, ticket_code,
    });
    return { data: ev, result: { status, ticket_code, free: Math.max(free - (status === 'confirmed' ? reg.seats : 0), 0) } };
  });
}

/** Wartelisten-Eintrag nachrücken lassen (nur wenn genug Plätze frei sind): 'confirmed' | 'full' | 'invalid' */
export function promoteRegistration(id) {
  return mutate('event', newEvent, (ev) => {
    const r = ev.registrations.find((x) => x.id === id);
    if (!r || r.status !== 'waitlist') return { result: 'invalid' };
    if (summarize(ev).free < r.seats) return { result: 'full' };
    r.status = 'confirmed';
    return { data: ev, result: 'confirmed' };
  });
}

export function cancelRegistration(id) {
  return mutate('event', newEvent, (ev) => {
    const r = ev.registrations.find((x) => x.id === id);
    if (!r) return { result: false };
    r.status = 'cancelled';
    return { data: ev, result: true };
  });
}

/** Stornierten Eintrag endgültig entfernen (z. B. Testanmeldungen) */
export function deleteRegistration(id) {
  return mutate('event', newEvent, (ev) => {
    const i = ev.registrations.findIndex((x) => x.id === id && x.status === 'cancelled');
    if (i < 0) return { result: false };
    ev.registrations.splice(i, 1);
    return { data: ev, result: true };
  });
}

export function updateSettings({ total_seats, max_per_person, registration_open }) {
  return mutate('event', newEvent, (ev) => {
    ev.settings = { total_seats, max_per_person, registration_open, updated_at: new Date().toISOString() };
    return { data: ev, result: true };
  });
}

// ---------------------------------------------------------------------------
// Aufrufzähler – jedes Öffnen der Seite zählt als Aufruf, jede neue IP-Adresse einmal als Besucher
// ---------------------------------------------------------------------------
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // JJJJ-MM-TT
const newStats = () => ({ views: 0, visitors: 0, days: {} });

/** Seite geöffnet: Aufruf +1, und Besucher +1, wenn diese IP-Adresse (als Code) neu ist */
export async function trackVisit(hash) {
  const { modified: isNew } = await store().setJSON(`visitors/${hash}`, { day: today() }, { onlyIfNew: true });
  const day = today();
  await mutate('stats', newStats, (st) => {
    const d = (st.days[day] = st.days[day] || { views: 0, visitors: 0 });
    st.views++; d.views++;
    if (isNew) { st.visitors++; d.visitors++; }
    return { data: st };
  });
}

/** Zähler auf null setzen (z. B. nach Tests vor dem Start) */
export async function resetStats() {
  const s = store();
  const { blobs } = await s.list({ prefix: 'visitors/' });
  for (const { key } of blobs) await s.delete(key);
  await s.setJSON('stats', newStats());
}

/**
 * Nach dem Abend (Speicherfrist laut /datenschutz): alle Anmeldungen und alle Besucher-Kennungen löschen.
 * Übrig bleiben die Einstellungen und die Summen der Auswertung (ohne Personenbezug).
 */
export async function purgePersonalData() {
  const s = store();
  await mutate('event', newEvent, (ev) => ({ data: { ...ev, registrations: [] }, result: true }));
  const { blobs } = await s.list({ prefix: 'visitors/' });
  for (const { key } of blobs) await s.delete(key);
}

/** Kleiner Merkzettel im Speicher (z. B. wann die Abend-Zusammenfassung zuletzt verschickt wurde) */
export const readNote = async (key) => (await store().get(`notes/${key}`, { type: 'json' })) || {};
export const writeNote = (key, value) => store().setJSON(`notes/${key}`, value);

/** Geheimes „Salz“ für den Besucher-Code – einmal zufällig erzeugt und im Speicher abgelegt */
let salt;
export async function secretSalt() {
  if (!salt) {
    salt = await mutate('salt', () => null, (cur) => (cur ? { result: cur.salt } : (() => {
      const fresh = randomBytes(24).toString('hex');
      return { data: { salt: fresh }, result: fresh };
    })()));
  }
  return salt;
}

/** Zahlen für /admin: gesamt und je Tag (letzte 60 Tage) */
export async function visitStats() {
  const st = { ...newStats(), ...((await store().get('stats', { type: 'json' })) || {}) };
  const since = new Date(Date.now() - 60 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  return {
    views: st.views || 0,
    visitors: st.visitors || 0,
    by_day: Object.entries(st.days || {}).map(([day, v]) => ({ day, views: v.views || 0, visitors: v.visitors || 0 }))
      .filter((d) => d.day >= since && d.views > 0).sort((a, b) => b.day.localeCompare(a.day)),
  };
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
