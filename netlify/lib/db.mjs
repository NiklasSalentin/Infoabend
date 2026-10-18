// Datenspeicher: Netlify Blobs (im Netlify-Projekt eingebaut, kein extra Konto nötig).
//
// Aufbau des Speichers „infoabend“:
//   event              → { settings: {...}, registrations: [...] }   alle Anmeldungen + Einstellungen
//   stats              → Besucherzähler (verschiedene IP-Adressen, gesamt und je Tag)
//   visitors/<code>    → ein Eintrag je Besucher (nur unumkehrbarer Code, keine IP)
//
// Gleichzeitige Änderungen (zwei Anmeldungen in derselben Sekunde) werden über „ETag“ abgesichert:
// geschrieben wird nur, wenn sich der Eintrag seit dem Lesen nicht verändert hat – sonst neu
// lesen und noch einmal versuchen. So wird nie überbucht und nichts geht verloren.
import { getStore } from '@netlify/blobs';
import { randomUUID, randomBytes } from 'node:crypto';
import { shownFree } from '../../public/plaetze.js';

// display_batch: Kontingent – so viele freie Plätze zeigt die Seite höchstens (0 = immer die echte Zahl)
// display_refill: zeigt die Seite nur noch so wenige, werden weitere Plätze freigegeben (public/plaetze.js)
const DEFAULT_SETTINGS = { total_seats: 120, max_per_person: 4, registration_open: true, display_batch: 120, display_refill: 30 };

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
  const s = { ...DEFAULT_SETTINGS, ...ev.settings };
  const confirmed = ev.registrations.filter((r) => r.status === 'confirmed');
  const booked = confirmed.reduce((a, r) => a + r.seats, 0);
  const free = Math.max(s.total_seats - booked, 0);
  const shown = shownFree({ total: s.total_seats, booked, batch: s.display_batch, refillAt: s.display_refill });
  return {
    total_seats: s.total_seats,
    booked,
    free,
    // diese Zahl sieht der Besucher auf der Seite (public/plaetze.js)
    shown_free: shown.free,
    shown_released: shown.released, // gerade weitere Plätze freigegeben → Hinweis auf der Seite
    display_batch: s.display_batch,
    display_refill: s.display_refill,
    max_per_person: s.max_per_person,
    registration_open: s.registration_open,
    attendees: confirmed.length,
  };
}

/**
 * Freie Plätze der Reihe nach an die Warteliste geben (wer sich zuerst eingetragen hat, kommt zuerst dran).
 * Passt jemand nicht mehr hinein (z. B. 2 Plätze gewünscht, nur 1 frei), ist der Nächste dran, der passt.
 * Nachgerückte bekommen `invite_pending` – die Einladungs-Mail verschickt danach /admin.
 * Gibt die nachgerückten Einträge zurück.
 */
function fillFromWaitlist(ev) {
  let free = summarize(ev).free;
  const promoted = [];
  const waiting = ev.registrations.filter((r) => r.status === 'waitlist')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const r of waiting) {
    if (free <= 0) break;
    if (r.seats > free) continue;
    r.status = 'confirmed';
    r.promoted_at = new Date().toISOString();
    r.invite_pending = true;
    free -= r.seats;
    promoted.push(r);
  }
  return promoted;
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

/** Einen bestimmten Wartelisten-Eintrag vorziehen (nur wenn genug Plätze frei sind): 'confirmed' | 'full' | 'invalid' */
export function promoteRegistration(id) {
  return mutate('event', newEvent, (ev) => {
    const r = ev.registrations.find((x) => x.id === id);
    if (!r || r.status !== 'waitlist') return { result: 'invalid' };
    if (summarize(ev).free < r.seats) return { result: 'full' };
    Object.assign(r, { status: 'confirmed', promoted_at: new Date().toISOString(), invite_pending: true });
    return { data: ev, result: 'confirmed' };
  });
}

/**
 * Stornieren – frei gewordene Plätze gehen sofort der Reihe nach an die Warteliste.
 * via: 'admin' (Knopf in /admin) | 'link' (Gast sagt über den Link in der Erinnerung selbst ab).
 * Ergebnis: null (nicht gefunden) | { promoted, already } – already = war schon storniert
 */
export function cancelRegistration(id, via = 'admin') {
  return mutate('event', newEvent, (ev) => {
    const r = ev.registrations.find((x) => x.id === id);
    if (!r) return { result: null };
    if (r.status === 'cancelled') return { result: { promoted: [], already: true } };
    Object.assign(r, { status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_via: via });
    delete r.invite_pending;
    return { data: ev, result: { promoted: fillFromWaitlist(ev), already: false } };
  });
}

/** Einladungs-Mail an einen Nachgerückten ist raus */
export function markInvited(id) {
  return mutate('event', newEvent, (ev) => {
    const r = ev.registrations.find((x) => x.id === id);
    if (!r?.invite_pending) return { result: false };
    delete r.invite_pending;
    return { data: ev, result: true };
  });
}

/** Erinnerungs-Mail `key` ('week' | 'day') ist raus – bzw. ging schief (`error`, nach 3 Fehlversuchen wird nicht mehr versucht) */
export function markReminder(id, key, error = null) {
  return mutate('event', newEvent, (ev) => {
    const r = ev.registrations.find((x) => x.id === id);
    if (!r) return { result: false };
    if (error) {
      r.reminder_errors = { ...r.reminder_errors, [key]: (r.reminder_errors?.[key] || 0) + 1 };
      r.reminder_last_error = String(error).slice(0, 200);
    } else {
      r.reminders_sent = { ...r.reminders_sent, [key]: new Date().toISOString() };
    }
    return { data: ev, result: true };
  });
}

/** Keine Erinnerungen mehr (Abbestell-Link in der Mail oder Knopf in /admin). Ergebnis: false = nicht gefunden */
export function stopReminders(id, via) {
  return mutate('event', newEvent, (ev) => {
    const r = ev.registrations.find((x) => x.id === id);
    if (!r) return { result: false };
    if (!r.reminder_consent) return { result: true };
    Object.assign(r, { reminder_consent: false, reminder_optout_at: new Date().toISOString(), reminder_optout_via: via });
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

/** Einstellungen speichern – mehr Plätze gehen sofort der Reihe nach an die Warteliste. Ergebnis: { promoted } */
export function updateSettings({ total_seats, max_per_person, registration_open, display_batch, display_refill }) {
  return mutate('event', newEvent, (ev) => {
    ev.settings = { total_seats, max_per_person, registration_open, display_batch, display_refill, updated_at: new Date().toISOString() };
    return { data: ev, result: { promoted: fillFromWaitlist(ev) } };
  });
}

// ---------------------------------------------------------------------------
// Besucherzähler – jede IP-Adresse zählt genau einmal (5× öffnen mit derselben IP = 1 Besucher)
// ---------------------------------------------------------------------------
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // JJJJ-MM-TT
const newStats = () => ({ visitors: 0, days: {} });

/** Seite geöffnet: Besucher +1 nur, wenn diese IP-Adresse (als Code) zum ersten Mal kommt */
export async function trackVisit(hash) {
  const { modified: isNew } = await store().setJSON(`visitors/${hash}`, { day: today() }, { onlyIfNew: true });
  if (!isNew) return;
  const day = today();
  await mutate('stats', newStats, (st) => {
    st.visitors = (st.visitors || 0) + 1;
    st.days[day] = { visitors: (st.days[day]?.visitors || 0) + 1 };
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
    visitors: st.visitors || 0,
    by_day: Object.entries(st.days || {}).map(([day, v]) => ({ day, visitors: v.visitors || 0 }))
      .filter((d) => d.day >= since && d.visitors > 0).sort((a, b) => b.day.localeCompare(a.day)),
  };
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
