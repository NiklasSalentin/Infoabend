// Datenspeicher: Netlify Blobs (im Netlify-Projekt eingebaut, kein extra Konto nötig).
//
// Aufbau des Speichers „infoabend“:
//   event              → { settings: {...}, registrations: [...] }   alle Anmeldungen + Einstellungen
//   stats              → Kennzahlen der Besucher-Auswertung (Summen je Tag und je Quelle)
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
// Besucher-Auswertung – jede Person zählt einmal, eigene Geräte (Login in /admin) gar nicht
// ---------------------------------------------------------------------------
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // JJJJ-MM-TT
const newStats = () => ({ visitors: 0, views: 0, engaged: 0, registered: 0, internal: 0, days: {}, sources: {} });
const newVisitor = (source) => ({ day: today(), source: source || null, views: 0, engaged: false, registered: false, internal: false });

/** Zählt in der Gesamtsumme sowie beim Tag und der Quelle des ersten Besuchs. field: 'visitors' | 'engaged' | 'registered' */
function bump(st, v, field, by = 1) {
  st[field] += by;
  for (const [map, k] of [[st.days, v.day], [st.sources, v.source || 'direkt']]) {
    map[k] = map[k] || { visitors: 0, engaged: 0, registered: 0 };
    map[k][field] += by;
  }
}

/**
 * Einen Besucher ändern. `change(v, isNew)` passt den Eintrag an und gibt zurück:
 * false = nichts speichern, null = speichern ohne Kennzahlen, Funktion = speichern und damit die Kennzahlen anpassen.
 */
async function updateVisitor(hash, source, change) {
  const statsChange = await mutate(`visitors/${hash}`, () => null, (cur) => {
    const v = cur || newVisitor(source);
    const fn = change(v, !cur);
    return fn === false ? { result: null } : { data: v, result: fn };
  });
  if (statsChange) await mutate('stats', newStats, (st) => { statsChange(st); return { data: st }; });
}

/** Seite geöffnet */
export const trackVisit = (hash, source) => updateVisitor(hash, source, (v, isNew) => {
  v.views++;
  return v.internal ? null : (st) => { st.views++; if (isNew) bump(st, v, 'visitors'); };
});

/** Mindestens 30 Sekunden aktiv auf der Seite */
export const markEngaged = (hash) => updateVisitor(hash, null, (v, isNew) => {
  if (isNew || v.engaged) return false;
  v.engaged = true;
  return v.internal ? null : (st) => bump(st, v, 'engaged');
});

/** Hat sich angemeldet */
export const markRegistered = (hash, source) => updateVisitor(hash, source, (v, isNew) => {
  if (v.registered) return false;
  v.registered = true;
  return v.internal ? null : (st) => { if (isNew) bump(st, v, 'visitors'); bump(st, v, 'registered'); };
});

/** Eigenes Gerät (Login in /admin): wird aus allen Zahlen herausgerechnet */
export const markInternal = (hash) => updateVisitor(hash, null, (v, isNew) => {
  if (v.internal) return false;
  v.internal = true;
  return (st) => {
    st.internal++;
    if (isNew) return;
    st.views -= v.views;
    bump(st, v, 'visitors', -1);
    if (v.engaged) bump(st, v, 'engaged', -1);
    if (v.registered) bump(st, v, 'registered', -1);
  };
});

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

/** Kennzahlen für /admin */
export async function visitStats() {
  const st = (await store().get('stats', { type: 'json' })) || newStats();
  const since = new Date(Date.now() - 60 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  const rows = (map, key) => Object.entries(map).map(([k, v]) => ({ [key]: k, ...v }));
  return {
    visitors: st.visitors, views: st.views, engaged: st.engaged, registered: st.registered, internal: st.internal,
    by_day: rows(st.days, 'day').filter((d) => d.day >= since && d.visitors > 0).sort((a, b) => b.day.localeCompare(a.day)),
    by_source: rows(st.sources, 'source').filter((s) => s.visitors > 0).sort((a, b) => b.visitors - a.visitors),
  };
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
