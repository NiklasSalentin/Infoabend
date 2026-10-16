import { shownFree } from '/plaetze.js';

const $ = (s) => document.querySelector(s);
let pw = sessionStorage.getItem('adminPw') || '';
let data = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LABEL = { confirmed: 'Bestätigt', waitlist: 'Warteliste', cancelled: 'Storniert' };

async function api(method, body) {
  const res = await fetch('/api/admin', {
    method,
    headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (res.status === 401) throw new Error('auth');
  if (!res.ok) throw new Error(json.error || 'Fehler');
  return json;
}

async function load() {
  try {
    data = await api('GET');
  } catch (e) {
    $('#login-err').textContent = e.message === 'auth' ? 'Falsches Passwort' : e.message;
    $('#login').hidden = false;
    $('#app').hidden = true;
    return;
  }
  sessionStorage.setItem('adminPw', pw);
  $('#login').hidden = true;
  $('#app').hidden = false;
  const s = data.status;
  $('#total').value = s.total_seats;
  $('#max').value = s.max_per_person;
  $('#open').checked = s.registration_open;
  $('#display-batch').value = s.display_batch;
  $('#display-refill').value = s.display_refill;
  renderPreview();
  const wait = waitlist();
  $('#summary').textContent = `${s.booked} von ${s.total_seats} Plätzen belegt · ${s.free} frei (Seite zeigt: ${s.shown_free}${s.shown_released ? ', „weitere freigegeben“' : ''}) · ${s.attendees} Anmeldungen · ${wait.length} auf Warteliste (${wait.reduce((a, r) => a + r.seats, 0)} Plätze)`;

  const pending = data.registrations.filter((r) => r.invite_pending && r.status === 'confirmed');
  $('#pending').hidden = !pending.length;
  $('#pending-text').textContent = `${pending.length} nachgerückte ${pending.length === 1 ? 'Person hat' : 'Personen haben'} noch keine Einladungs-Mail bekommen.`;

  renderStats();
  renderAddresses();

  // Platz auf der Warteliste (1 = als Nächstes dran)
  const rank = new Map(wait.map((r, i) => [r.id, i + 1]));
  $('#rows').innerHTML = data.registrations.map((r) => `
    <tr>
      <td><span class="tag ${r.status}">${LABEL[r.status]}${rank.has(r.id) ? ` ${rank.get(r.id)}.` : ''}</span>
        ${r.promoted_at && r.status === 'confirmed' ? `<br><span class="invite">nachgerückt${r.invite_pending ? ' · Einladung offen' : ''}</span>` : ''}</td>
      <td>${new Date(r.created_at).toLocaleString('de-DE')}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.email)}<br>${esc(r.phone)}</td>
      <td>${r.seats}</td>
      <td>${esc(r.companions.join(', '))}</td>
      <td>${esc([r.street, r.zip, r.city].filter(Boolean).join(', '))}${r.address_consent ? '<br>✓ Post' : ''}</td>
      <td>${esc(r.questions)}</td>
      <td>${esc(r.source || 'direkt')}</td>
      <td>
        ${r.status === 'waitlist' ? `<button data-a="promote" data-id="${r.id}">Nachrücken</button>` : ''}
        ${r.status === 'confirmed' ? `<button data-a="resend" data-id="${r.id}">Mail erneut</button>` : ''}
        ${r.status !== 'cancelled' ? `<button data-a="cancel" data-id="${r.id}">Stornieren</button>` : `<button data-a="delete" data-id="${r.id}">Löschen</button>`}
      </td>
    </tr>`).join('');
}

// Warteliste in der Reihenfolge, in der nachgerückt wird (wer zuerst kam, ist zuerst dran)
const waitlist = (regs = data.registrations) => regs.filter((r) => r.status === 'waitlist')
  .sort((a, b) => a.created_at.localeCompare(b.created_at));

/** Wer würde bei so vielen freien Plätzen nachrücken? (gleiche Regel wie netlify/lib/db.mjs fillFromWaitlist) */
function wouldPromote(free) {
  const out = [];
  for (const r of waitlist()) {
    if (free <= 0) break;
    if (r.seats > free) continue;
    out.push(r);
    free -= r.seats;
  }
  return out;
}

// Beispiel-Zeile unter den Anzeige-Feldern – rechnet live mit, während man tippt
function renderPreview() {
  const total = Number($('#total').value) || 0;
  const batch = Number($('#display-batch').value) || 0;
  const refillAt = Number($('#display-refill').value) || 0;
  if (!batch || refillAt >= batch) {
    $('#display-preview').textContent = 'Aus – die Seite zeigt die echte Zahl der freien Plätze.'
      + (batch && refillAt >= batch ? ' („Nachschub“ muss kleiner sein als das Kontingent.)' : '');
    return;
  }
  const step = batch - refillAt;
  const points = [...new Set([0, 3, step - 1, step, 2 * step, total - 10, total - 3].filter((b) => b >= 0 && b < total))].sort((a, b) => a - b);
  $('#display-preview').textContent = 'Beispiel: ' + points.map((booked) => {
    const s = shownFree({ total, booked, batch, refillAt });
    return `${booked} belegt → Seite zeigt ${s.free}${s.released ? ' („weitere freigegeben“)' : ''}${s.free === total - booked ? ' (echte Zahl)' : ''}`;
  }).join(' · ');
}
for (const id of ['#total', '#display-batch', '#display-refill']) $(id).addEventListener('input', renderPreview);

/** Einladungs-Mails an Nachgerückte nacheinander verschicken (einzeln, damit nichts in eine Zeitüberschreitung läuft) */
async function sendInvites(ids) {
  let ok = 0;
  const failed = [];
  for (const [i, id] of ids.entries()) {
    $('#pending').hidden = false;
    $('#pending-text').textContent = `Einladungen werden verschickt … ${i + 1} von ${ids.length}`;
    try { await api('POST', { action: 'resend', id }); ok++; } catch (e) { failed.push(e.message); }
  }
  await load();
  alert(`${ok} Einladung${ok === 1 ? '' : 'en'} verschickt.` + (failed.length ? `\n\n${failed.length} fehlgeschlagen:\n${failed.join('\n')}` : ''));
}

$('#pending-send').onclick = () => {
  const ids = data.registrations.filter((r) => r.invite_pending && r.status === 'confirmed').map((r) => r.id);
  if (ids.length && confirm(`${ids.length} Einladung${ids.length === 1 ? '' : 'en'} jetzt per E-Mail verschicken?`)) sendInvites(ids);
};

// Besucherzähler: jede IP-Adresse einmal, gesamt und je Tag
function renderStats() {
  const st = data.stats;
  $('#st-registered').textContent = data.registrations.filter((r) => r.status !== 'cancelled').length;
  const empty = '<tr><td colspan="2" class="note">Noch keine Besucher</td></tr>';
  if (!st) {
    for (const id of ['#st-visitors', '#st-today']) $(id).textContent = '–';
    $('#st-days').innerHTML = empty;
    return;
  }
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  const days = st.by_day || [];
  $('#st-visitors').textContent = st.visitors;
  $('#st-today').textContent = days.find((d) => d.day === today)?.visitors || 0;
  $('#st-days').innerHTML = days.length
    ? days.map((d) => `<tr><td>${new Date(d.day + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td><td class="r">${d.visitors}</td></tr>`).join('')
    : empty;
}

// Adressliste: nur vollständige Adressen, ohne stornierte
const withAddress = () => data.registrations.filter((r) => r.status !== 'cancelled' && r.street && r.zip && r.city);

function renderAddresses() {
  const list = withAddress();
  $('#addr-rows').innerHTML = list.length
    ? list.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.street)}</td><td>${esc(r.zip)}</td><td>${esc(r.city)}</td><td>${esc(r.email)}</td><td>${esc(r.phone)}</td><td>${new Date(r.created_at).toLocaleDateString('de-DE')}</td></tr>`).join('')
    : '<tr><td colspan="7" class="note">Noch keine vollständigen Adressen</td></tr>';
}

function download(name, cols, rows) {
  const cell = (v) => '"' + String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""') + '"';
  const csv = '\ufeff' + [cols.map(([, h]) => h).join(';'), ...rows.map((r) => cols.map(([c]) => cell(r[c])).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name;
  a.click();
}

$('#reset-stats').onclick = async () => {
  if (!confirm('Besucherzahl auf null setzen? Sinnvoll z. B. nach eigenen Tests vor dem Start. Anmeldungen bleiben erhalten.')) return;
  try { await api('POST', { action: 'reset-stats' }); await load(); } catch (e) { alert(e.message); }
};

$('#purge').onclick = async () => {
  const word = prompt('Wirklich ALLE Anmeldungen endgültig löschen? Das lässt sich nicht rückgängig machen.\n\nZur Bestätigung LÖSCHEN eingeben:');
  if (word === null) return;
  try { await api('POST', { action: 'purge', confirm: word.trim().toUpperCase() }); await load(); alert('Gelöscht'); } catch (e) { alert(e.message); }
};

$('#csv-addr').onclick = () => download('adressen-infoabend.csv',
  [['name', 'Name'], ['street', 'Straße und Nr.'], ['zip', 'PLZ'], ['city', 'Ort'], ['email', 'E-Mail'], ['phone', 'Telefon']],
  withAddress());

$('#login-btn').onclick = () => { pw = $('#pw').value; load(); };
$('#pw').onkeydown = (e) => { if (e.key === 'Enter') $('#login-btn').click(); };

$('#save').onclick = async () => {
  const total = Number($('#total').value);
  const next = wouldPromote(total - data.status.booked);
  if (next.length && !confirm(`Durch die neue Platzzahl rücken ${next.length} ${next.length === 1 ? 'Person' : 'Personen'} von der Warteliste nach `
    + `(${next.map((r) => r.name).join(', ')}) und ${next.length === 1 ? 'bekommt' : 'bekommen'} eine Einladung per E-Mail.\n\nSpeichern?`)) return;
  try {
    const r = await api('POST', {
      action: 'settings', totalSeats: $('#total').value, maxPerPerson: $('#max').value, open: $('#open').checked,
      displayBatch: $('#display-batch').value, displayRefill: $('#display-refill').value,
    });
    if (r.promoted?.length) return sendInvites(r.promoted);
    await load();
    alert('Gespeichert');
  } catch (e) { alert(e.message); }
};

$('#rows').onclick = async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const reg = data.registrations.find((r) => r.id === b.dataset.id);
  // Stornieren einer bestätigten Anmeldung: wer rückt dafür von der Warteliste nach?
  const next = b.dataset.a === 'cancel' && reg?.status === 'confirmed' ? wouldPromote(data.status.free + reg.seats) : [];
  const msg = {
    promote: 'Diese Person vor allen anderen auf der Warteliste nachrücken lassen und Einladung senden?',
    cancel: 'Anmeldung stornieren? Die Plätze werden wieder frei.'
      + (next.length ? `\n\nDafür rückt von der Warteliste nach: ${next.map((r) => r.name).join(', ')} (bekommt eine Einladung per E-Mail).` : ''),
    resend: 'Einladung erneut senden?',
    delete: 'Stornierte Anmeldung endgültig löschen? Das lässt sich nicht rückgängig machen.',
  };
  if (!confirm(msg[b.dataset.a])) return;
  try {
    const r = await api('POST', { action: b.dataset.a, id: b.dataset.id });
    if (r.promoted?.length) return sendInvites(r.promoted);
    await load();
  } catch (err) { alert(err.message); }
};

$('#csv').onclick = () => {
  const cols = ['status', 'created_at', 'name', 'email', 'phone', 'seats', 'companions', 'street', 'zip', 'city', 'address_consent', 'questions', 'source'];
  const cell = (v) => '"' + String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""') + '"';
  const csv = '﻿' + [cols.join(';'), ...data.registrations.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'anmeldungen-infoabend.csv';
  a.click();
};

if (pw) load();
