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

  renderStats();
  renderAddresses();

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
        ${r.status !== 'cancelled' ? `<button data-a="cancel" data-id="${r.id}">Stornieren</button>` : `<button data-a="delete" data-id="${r.id}">Löschen</button>`}
      </td>
    </tr>`).join('');
}

// Auswertung: Besucher (jede Person einmal), länger auf der Seite, angemeldet
function renderStats() {
  const st = data.stats;
  const regs = data.registrations.filter((r) => r.status !== 'cancelled').length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + ' %' : '–');
  const empty = '<tr><td colspan="4" class="note">Noch keine Daten</td></tr>';
  $('#st-registered').textContent = regs;
  if (!st) {
    for (const id of ['#st-visitors', '#st-engaged', '#st-rate']) $(id).textContent = '–';
    $('#st-days').innerHTML = $('#st-sources').innerHTML = empty;
    return;
  }
  $('#st-visitors').textContent = st.visitors;
  $('#st-engaged').textContent = `${st.engaged} (${pct(st.engaged, st.visitors)})`;
  $('#st-rate').textContent = pct(regs, st.visitors);
  $('#st-note').textContent = `Jede Person zählt nur einmal – öffnet jemand die Seite mehrmals, bleibt es ein Besucher (insgesamt ${st.views} Seitenaufrufe). Eigene Geräte (nach dem Anmelden hier in der Verwaltung) und Suchmaschinen-Roboter werden nicht mitgezählt.`;
  const row = (label, r) => `<tr><td>${esc(label)}</td><td class="r">${r.visitors}</td><td class="r">${r.engaged}</td><td class="r">${r.registered}</td></tr>`;
  const days = st.by_day || [];
  $('#st-days').innerHTML = days.length
    ? days.map((d) => row(new Date(d.day + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }), d)).join('')
    : empty;
  const sources = st.by_source || [];
  $('#st-sources').innerHTML = sources.length ? sources.map((s) => row(s.source || 'direkt', s)).join('') : empty;
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

$('#csv-addr').onclick = () => download('adressen-infoabend.csv',
  [['name', 'Name'], ['street', 'Straße und Nr.'], ['zip', 'PLZ'], ['city', 'Ort'], ['email', 'E-Mail'], ['phone', 'Telefon']],
  withAddress());

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
  const msg = { promote: 'Nachrücken lassen und Einladung senden?', cancel: 'Anmeldung stornieren? Die Plätze werden wieder frei.', resend: 'Einladung erneut senden?', delete: 'Stornierte Anmeldung endgültig löschen? Das lässt sich nicht rückgängig machen.' };
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
