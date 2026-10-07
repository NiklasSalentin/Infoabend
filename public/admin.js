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
  const wait = data.registrations.filter((r) => r.status === 'waitlist');
  $('#summary').textContent = `${s.booked} von ${s.total_seats} Plätzen belegt · ${s.free} frei · ${s.attendees} Anmeldungen · ${wait.length} auf Warteliste (${wait.reduce((a, r) => a + r.seats, 0)} Plätze)`;

  // Anmeldungen und Plätze je Werbekanal (nur bestätigte)
  const bySource = {};
  for (const r of data.registrations.filter((x) => x.status === 'confirmed')) {
    const k = r.source || 'direkt';
    bySource[k] = bySource[k] || { n: 0, seats: 0 };
    bySource[k].n++;
    bySource[k].seats += r.seats;
  }
  $('#sources').textContent = Object.keys(bySource).length
    ? 'Nach Quelle: ' + Object.entries(bySource).sort((a, b) => b[1].seats - a[1].seats)
        .map(([k, v]) => `${k}: ${v.n} Anmeldungen / ${v.seats} Plätze`).join(' · ')
    : '';

  $('#rows').innerHTML = data.registrations.map((r) => `
    <tr>
      <td><span class="tag ${r.status}">${LABEL[r.status]}</span></td>
      <td>${new Date(r.created_at).toLocaleString('de-DE')}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.email)}<br>${esc(r.phone)}</td>
      <td>${r.seats}</td>
      <td>${esc(r.companions.join(', '))}</td>
      <td>${esc([r.street, r.zip, r.city].filter(Boolean).join(', '))}${r.address_consent ? '<br>✓ Post' : ''}</td>
      <td>${esc(r.questions)}</td>
      <td>${esc(r.source || 'direkt')}</td>
      <td>${esc(r.ticket_code)}</td>
      <td>
        ${r.status === 'waitlist' ? `<button data-a="promote" data-id="${r.id}">Nachrücken</button>` : ''}
        ${r.status === 'confirmed' ? `<button data-a="resend" data-id="${r.id}">Mail erneut</button>` : ''}
        ${r.status !== 'cancelled' ? `<button data-a="cancel" data-id="${r.id}">Stornieren</button>` : ''}
      </td>
    </tr>`).join('');
}

$('#login-btn').onclick = () => { pw = $('#pw').value; load(); };
$('#pw').onkeydown = (e) => { if (e.key === 'Enter') $('#login-btn').click(); };

$('#save').onclick = async () => {
  try {
    await api('POST', { action: 'settings', totalSeats: $('#total').value, maxPerPerson: $('#max').value, open: $('#open').checked });
    await load();
    alert('Gespeichert');
  } catch (e) { alert(e.message); }
};

$('#rows').onclick = async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const msg = { promote: 'Nachrücken lassen und Einladung senden?', cancel: 'Anmeldung stornieren? Die Plätze werden wieder frei.', resend: 'Einladung erneut senden?' };
  if (!confirm(msg[b.dataset.a])) return;
  try { await api('POST', { action: b.dataset.a, id: b.dataset.id }); await load(); } catch (err) { alert(err.message); }
};

$('#csv').onclick = () => {
  const cols = ['status', 'created_at', 'name', 'email', 'phone', 'seats', 'companions', 'street', 'zip', 'city', 'address_consent', 'questions', 'source', 'ticket_code'];
  const cell = (v) => '"' + String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""') + '"';
  const csv = '﻿' + [cols.join(';'), ...data.registrations.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'anmeldungen-infoabend.csv';
  a.click();
};

if (pw) load();
