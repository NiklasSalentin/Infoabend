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
  $('#show-free').checked = s.show_free !== false;
  $('#display-batch').value = s.display_batch;
  $('#display-refill').value = s.display_refill;
  renderPreview();
  const wait = waitlist();
  $('#summary').textContent = `${s.booked} von ${s.total_seats} Plätzen belegt · ${s.free} frei (${s.show_free === false ? 'Seite zeigt keine Zahl' : `Seite zeigt: ${s.shown_free}${s.shown_released ? ', „weitere freigegeben“' : ''}`}) · ${s.attendees} Anmeldungen · ${wait.length} auf Warteliste (${wait.reduce((a, r) => a + r.seats, 0)} Plätze)`;

  const pending = data.registrations.filter((r) => r.invite_pending && r.status === 'confirmed');
  $('#pending').hidden = !pending.length;
  $('#pending-text').textContent = `${pending.length} nachgerückte ${pending.length === 1 ? 'Person hat' : 'Personen haben'} noch keine Einladungs-Mail bekommen.`;

  renderStats();
  renderAddresses();
  renderReminders();
  renderDigest();
  renderMails();

  // Platz auf der Warteliste (1 = als Nächstes dran)
  renderRows();
}

// Erinnerungs-Mails: abbestellt? Was ist schon raus?
const day = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
function reminderState(r) {
  if (r.reminder_optout_at) return `<span class="rem">✗ Erinnerung abbestellt (${day(r.reminder_optout_at)})</span>`;
  if (r.status !== 'confirmed' && !r.reminders_sent) return '';
  const sent = Object.values(r.reminders_sent || {}).map(day);
  return `<span class="rem on">✓ Erinnerung${sent.length ? ` · verschickt ${sent.join(', ')}` : ''}</span>`;
}

function renderReminders() {
  const rm = data.reminders;
  if (!rm) return;
  $('#rem-consent').textContent = rm.active;
  $('#rem-optout').textContent = rm.optout;
  $('#rem-self').textContent = rm.selfCancelled;
  $('#rem-stages').innerHTML = rm.stages.map((s) => `<tr><td>${esc(s.label)}${s.started ? '' : ' <span class="note">– geplant</span>'}</td>
    <td class="r">${s.sent}</td><td class="r">${s.open}${s.failed ? ` <span class="invite">(${s.failed} fehlgeschlagen)</span>` : ''}</td></tr>`).join('');
}

// Update-Mail zu den Anmeldungen: Empfänger, Häufigkeit, Uhrzeit, nur bei Änderungen
const WEEKDAYS = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
for (let h = 0; h < 24; h++) $('#digest-hour').add(new Option(`${String(h).padStart(2, '0')}:00 Uhr`, h));

function digestForm() {
  return {
    recipients: $('#digest-recipients').value, frequency: $('#digest-frequency').value,
    weekday: Number($('#digest-weekday').value), hour: Number($('#digest-hour').value), onlyChanges: $('#digest-only-changes').checked,
  };
}

function renderDigestNext() {
  const d = digestForm();
  $('#digest-weekday-wrap').hidden = d.frequency !== 'weekly';
  const time = `${String(d.hour).padStart(2, '0')}:00 Uhr`;
  const when = { daily: `jeden Tag um ${time}`, '2days': `alle 2 Tage um ${time}`, weekly: `jeden ${WEEKDAYS[d.weekday]} um ${time}` }[d.frequency];
  const last = data.digest?.lastAt ? ` · zuletzt geprüft: ${new Date(data.digest.lastAt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr` : '';
  $('#digest-next').textContent = d.frequency === 'off'
    ? 'Aus – es wird keine Update-Mail verschickt.'
    : `Kommt ${when}${d.onlyChanges ? ', aber nur wenn sich etwas geändert hat' : ''}${last}`;
}

function renderDigest() {
  const d = data.digest;
  if (!d) return;
  $('#digest-recipients').value = (d.recipients || []).join(', ');
  $('#digest-frequency').value = d.frequency;
  $('#digest-weekday').value = d.weekday;
  $('#digest-hour').value = d.hour;
  $('#digest-only-changes').checked = d.onlyChanges !== false;
  renderDigestNext();
}

for (const id of ['#digest-frequency', '#digest-weekday', '#digest-hour', '#digest-only-changes']) $(id).addEventListener('change', renderDigestNext);

$('#digest-save').onclick = async () => {
  try {
    const r = await api('POST', { action: 'digest-settings', ...digestForm() });
    data.digest = { ...data.digest, ...r.digest };
    renderDigest();
    alert('Gespeichert');
  } catch (e) { alert(e.message); }
};

$('#digest-test').onclick = async () => {
  const to = $('#digest-recipients').value.trim();
  if (!confirm(`Jetzt eine Update-Mail mit dem aktuellen Stand an die gespeicherten Empfänger schicken?\n\n(${to || 'keine Empfänger'})\n\nDer geplante Versand ändert sich dadurch nicht.`)) return;
  try { await api('POST', { action: 'digest' }); alert('Verschickt – bitte im Postfach nachsehen.'); } catch (e) { alert(e.message); }
};

// E-Mails ansehen (Vorschau aller Mails) + Kalender-Erinnerung
function renderMails() {
  const mails = data.mails || [];
  const isDraft = (key) => mails.find((m) => m.key === key)?.status === 'entwurf';
  $('#rem-draft').hidden = !mails.some((m) => m.key.startsWith('erinnerung-') && m.status === 'entwurf');
  $('#cal-draft').hidden = !isDraft('kalender');
  $('#cal-send').disabled = isDraft('kalender');
  const targets = data.registrations.filter((r) => r.status === 'confirmed' && !r.calendar_at && !r.reminder_optout_at && !r.calendar_reminder_at && !r.calendar_reminder_error);
  const got = data.registrations.filter((r) => r.calendar_reminder_at);
  const seatSum = (l) => l.reduce((a, r) => a + r.seats, 0);
  $('#cal-targets').textContent = `Würde jetzt gehen an: ${seatSum(targets)} Plätze (${targets.length} Anmeldungen)`
    + (got.length ? ` · schon bekommen: ${seatSum(got)} Plätze (${got.length} Anmeldungen)` : '');
  $('#mail-list').innerHTML = mails.map((m) => `<tr>
    <td><strong>${esc(m.name)}</strong></td><td>${esc(m.when)}</td>
    <td><span class="status-tag ${m.status}">${m.status === 'aktiv' ? 'aktiv' : 'Entwurf – wird nicht verschickt'}</span></td>
    <td><button data-preview="${esc(m.key)}">Ansehen</button></td></tr>`).join('');
}

$('#mail-list').onclick = async (e) => {
  const b = e.target.closest('button[data-preview]');
  if (!b) return;
  try {
    const p = await api('POST', { action: 'preview', key: b.dataset.preview });
    $('#mail-subject').textContent = p.subject;
    $('#mail-frame').srcdoc = p.html;
    $('#mail-preview').hidden = false;
    $('#mail-preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) { alert(err.message); }
};

$('#cal-send').onclick = async () => {
  if (!confirm($('#cal-targets').textContent + '\n\nKalender-Erinnerung jetzt an diese Gäste verschicken?')) return;
  const btnEl = $('#cal-send');
  btnEl.disabled = true;
  let total = 0;
  let failed = 0;
  try {
    for (;;) {
      btnEl.textContent = `Wird verschickt … ${total}`;
      const r = await api('POST', { action: 'calendar-reminder' });
      total += r.sent; failed += r.failed;
      if (!r.open || (!r.sent && !r.failed)) break;
    }
    alert(`Verschickt: ${total}${failed ? ` · fehlgeschlagen: ${failed}` : ''}`);
  } catch (err) { alert(err.message); }
  btnEl.textContent = 'Jetzt verschicken';
  await load();
};

$('#reminder-test').onclick = async () => {
  if (!confirm('Alle Erinnerungen (zwei Wochen vorher, eine Woche vorher, Vortag) mit Beispiel-Gast „Maria Muster“ an info@ schicken?')) return;
  try { await api('POST', { action: 'reminder-test' }); alert('Verschickt – bitte im Postfach info@ nachsehen.'); } catch (e) { alert(e.message); }
};

// Warteliste in der Reihenfolge, in der nachgerückt wird (wer zuerst kam, ist zuerst dran)
const waitlist = (regs = data.registrations) => regs.filter((r) => r.status === 'waitlist')
  .sort((a, b) => a.created_at.localeCompare(b.created_at));

/**
 * Wer würde bei so vielen freien Plätzen nachrücken? (gleiche Regel wie netlify/lib/db.mjs fillFromWaitlist)
 * override = { id, seats }: so rechnen, als hätte dieser Eintrag schon die neue Platzzahl („Plätze ändern“)
 */
function wouldPromote(free, override = null) {
  const out = [];
  for (const r of waitlist()) {
    const seats = r.id === override?.id ? override.seats : r.seats;
    if (free <= 0) break;
    if (seats > free) continue;
    out.push(r);
    free -= seats;
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
  if (next.length && !confirm(`Durch die neue Platzzahl ${next.length === 1 ? 'rückt 1 Person' : `rücken ${next.length} Personen`} von der Warteliste nach `
    + `(${next.map((r) => r.name).join(', ')}) und ${next.length === 1 ? 'bekommt' : 'bekommen'} eine Einladung per E-Mail.\n\nSpeichern?`)) return;
  try {
    const r = await api('POST', {
      action: 'settings', totalSeats: $('#total').value, maxPerPerson: $('#max').value, open: $('#open').checked,
      displayBatch: $('#display-batch').value, displayRefill: $('#display-refill').value, showFree: $('#show-free').checked,
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
  if (b.dataset.a === 'seats') return openSeatDialog(reg);
  // Stornieren einer bestätigten Anmeldung: wer rückt dafür von der Warteliste nach?
  const next = b.dataset.a === 'cancel' && reg?.status === 'confirmed' ? wouldPromote(data.status.free + reg.seats) : [];
  const msg = {
    promote: 'Diese Person vor allen anderen auf der Warteliste nachrücken lassen und Einladung senden?',
    cancel: 'Anmeldung stornieren? Die Plätze werden wieder frei.'
      + (next.length ? `\n\nDafür ${next.length === 1 ? 'rückt' : 'rücken'} von der Warteliste nach: ${next.map((r) => r.name).join(', ')} (${next.length === 1 ? 'bekommt' : 'bekommen'} eine Einladung per E-Mail).` : ''),
    resend: 'Einladung erneut senden?',
    'reminder-off': 'Diese Person bekommt keine Erinnerungs-Mails mehr (z. B. weil sie es telefonisch gewünscht hat). Fortfahren?',
    delete: 'Stornierte Anmeldung endgültig löschen? Das lässt sich nicht rückgängig machen.',
  };
  if (!confirm(msg[b.dataset.a])) return;
  try {
    const r = await api('POST', { action: b.dataset.a, id: b.dataset.id });
    if (r.promoted?.length) return sendInvites(r.promoted);
    await load();
  } catch (err) { alert(err.message); }
};

// Anmeldeliste (mit Kalender-Spalte und Filter „ohne Kalendereintrag“)
function renderRows() {
  const rank = new Map(waitlist().map((r, i) => [r.id, i + 1]));
  // Kalender-Knopf: wer hat den Termin über den persönlichen Knopf eingetragen? (Zählung in Plätzen)
  const confirmedRegs = data.registrations.filter((r) => r.status === 'confirmed');
  const withCal = confirmedRegs.filter((r) => r.calendar_at);
  const noCal = confirmedRegs.filter((r) => !r.calendar_at);
  const seatSum = (l) => l.reduce((a, r) => a + r.seats, 0);
  $('#cal-summary').textContent = `Kalender-Knopf genutzt: ${seatSum(withCal)} Plätze (${withCal.length} Anmeldungen) · `
    + `ohne Kalendereintrag: ${seatSum(noCal)} Plätze (${noCal.length} Anmeldungen)`;
  const onlyNoCal = $('#cal-filter').checked;
  const VIA = { mail: 'Bestätigungs-Mail', seite: 'nach der Anmeldung', erinnerung: 'Erinnerungs-Mail' };
  const calCell = (r) => r.status !== 'confirmed' ? ''
    : r.calendar_at
      ? `<span title="über ${VIA[r.calendar_via] || 'Knopf'}${r.calendar_clicks > 1 ? `, ${r.calendar_clicks}× geklickt` : ''}">📅 ${new Date(r.calendar_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>`
      : '<span class="invite">nicht eingetragen</span>';

  $('#rows').innerHTML = data.registrations.filter((r) => !onlyNoCal || (r.status === 'confirmed' && !r.calendar_at)).map((r) => `
    <tr>
      <td><span class="tag ${r.status}">${LABEL[r.status]}${rank.has(r.id) ? ` ${rank.get(r.id)}.` : ''}</span>
        ${r.promoted_at && r.status === 'confirmed' ? `<br><span class="invite">nachgerückt${r.invite_pending ? ' · Einladung offen' : ''}</span>` : ''}
        ${r.cancelled_via === 'link' ? '<br><span class="invite">selbst abgesagt</span>' : ''}</td>
      <td>${new Date(r.created_at).toLocaleString('de-DE')}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.email)}<br>${esc(r.phone)}<br>${reminderState(r)}</td>
      <td>${r.seats}${seatChangeNote(r)}</td>
      <td>${esc(r.companions.join(', '))}</td>
      <td>${esc([r.street, r.zip, r.city].filter(Boolean).join(', '))}${r.address_consent ? '<br>✓ Post' : ''}</td>
      <td>${esc(r.questions)}</td>
      <td>${esc(r.source || 'direkt')}</td>
      <td>${calCell(r)}</td>
      <td>
        ${r.status !== 'cancelled' ? `<button data-a="seats" data-id="${r.id}">Plätze ändern</button>` : ''}
        ${r.status === 'waitlist' ? `<button data-a="promote" data-id="${r.id}">Nachrücken</button>` : ''}
        ${r.status === 'confirmed' ? `<button data-a="resend" data-id="${r.id}">Mail erneut</button>` : ''}
        ${!r.reminder_optout_at && r.status === 'confirmed' ? `<button data-a="reminder-off" data-id="${r.id}">Erinnerung aus</button>` : ''}
        ${r.status !== 'cancelled' ? `<button data-a="cancel" data-id="${r.id}">Stornieren</button>` : `<button data-a="delete" data-id="${r.id}">Löschen</button>`}
      </td>
    </tr>`).join('');
}

$('#cal-filter').addEventListener('change', () => renderRows());

// ---------------------------------------------------------------------------
// Plätze ändern / nachbuchen – z. B. Gast ruft an: „Mein Bruder kommt auch mit“ → 2 statt 1 Platz
// ---------------------------------------------------------------------------
const plaetze = (n) => `${n} ${n === 1 ? 'Platz' : 'Plätze'}`;

// kleiner Vermerk unter der Platzzahl: „geändert: 2 → 3 (30.10.)“
function seatChangeNote(r) {
  const ch = r.seat_changes || [];
  if (!ch.length) return '';
  const all = ch.map((c) => `${day(c.at)}: ${c.from} → ${c.to}`).join('\n');
  return `<br><span class="seat-change" title="${esc(all)}">geändert: ${ch[0].from} → ${r.seats} (${day(ch.at(-1).at)})</span>`;
}

let seatReg = null;
const seatCount = () => Math.min(20, Math.max(1, Number.parseInt($('#seat-count').value, 10) || 1));
const companionInputs = () => [...document.querySelectorAll('#seat-companions input')];

function openSeatDialog(reg) {
  if (!reg) return;
  seatReg = reg;
  $('#seat-who').textContent = `${reg.name} · ${LABEL[reg.status]} · bisher ${plaetze(reg.seats)}`;
  $('#seat-count').value = reg.seats;
  renderSeatFields(reg.companions || []);
  // Mail an den Gast nur bei bestätigten – und erst, wenn der Text freigegeben ist (event.mjs → mailStatus.aenderung)
  const released = (data.mails || []).find((m) => m.key === 'aenderung')?.status === 'aktiv';
  $('#seat-notify-wrap').hidden = reg.status !== 'confirmed';
  $('#seat-notify').checked = released;
  $('#seat-notify').disabled = !released;
  $('#seat-notify-note').textContent = released
    ? 'Mail „Ihre Anmeldung wurde aktualisiert“ mit neuer Platzzahl, Namen und Kalender-Knopf.'
    : 'Die Mail „Anmeldung aktualisiert“ ist noch ein Entwurf (Ansehen: unten bei „E-Mails ansehen“). '
      + 'Bis zur Freigabe nach dem Speichern „Mail erneut“ drücken – das schickt die normale Bestätigung mit der neuen Platzzahl.';
  $('#seat-dialog').showModal();
}

// Namensfelder für die Begleitung (Plätze − 1) – Eingetipptes bleibt beim Ändern der Zahl erhalten
function renderSeatFields(names = companionInputs().map((i) => i.value)) {
  const n = seatCount();
  $('#seat-companions').innerHTML = Array.from({ length: n - 1 }, (_, i) => `<label>Begleitung ${i + 1} – Name (optional)
    <input type="text" maxlength="120" value="${esc(names[i] || '')}"></label>`).join('');
  renderSeatCheck();
}

// Was passiert beim Speichern? Rechnet live mit (in Plätzen)
function renderSeatCheck() {
  const n = seatCount();
  const diff = n - seatReg.seats;
  const free = data.status.free;
  const out = [];
  let cls = '';
  if (seatReg.status === 'confirmed') {
    if (diff > free) {
      cls = 'bad';
      out.push(`Nicht genug frei: ${plaetze(free)} frei, ${diff} gebraucht. Erst oben „Plätze gesamt“ erhöhen.`);
    } else if (diff > 0) {
      out.push(`${diff} ${diff === 1 ? 'Platz' : 'Plätze'} nachbuchen → ${plaetze(n)}. ${free - diff ? `Danach noch ${plaetze(free - diff)} frei.` : 'Danach ist alles belegt.'}`);
    } else if (diff < 0) {
      const next = wouldPromote(free - diff);
      out.push(`${plaetze(-diff)} werden frei → ${plaetze(n)}.`
        + (next.length ? ` Dafür ${next.length === 1 ? 'rückt' : 'rücken'} von der Warteliste nach: ${next.map((r) => r.name).join(', ')} (Einladung per E-Mail).` : ''));
    } else out.push(`Platzzahl bleibt bei ${n} – nur die Namen werden gespeichert.`);
  } else {
    const self = wouldPromote(free, { id: seatReg.id, seats: n }).some((r) => r.id === seatReg.id);
    out.push(self
      ? `Mit ${plaetze(n)} passt diese Anmeldung in die freien Plätze und rückt sofort nach (Einladung per E-Mail).`
      : `Bleibt auf der Warteliste an derselben Stelle – jetzt mit ${plaetze(n)}.`);
  }
  if (n > data.status.max_per_person && cls !== 'bad') {
    cls = 'warn';
    out.push(`Mehr als das Maximum pro Person (${data.status.max_per_person}) – hier in der Verwaltung erlaubt.`);
  }
  $('#seat-check').className = cls;
  $('#seat-check').textContent = out.join(' ');
  $('#seat-save').disabled = cls === 'bad';
}

$('#seat-count').addEventListener('input', () => renderSeatFields());
$('#seat-minus').onclick = () => { $('#seat-count').value = seatCount() - 1; renderSeatFields(); };
$('#seat-plus').onclick = () => { $('#seat-count').value = seatCount() + 1; renderSeatFields(); };
$('#seat-cancel').onclick = () => $('#seat-dialog').close();

$('#seat-save').onclick = async () => {
  const btnEl = $('#seat-save');
  btnEl.disabled = true;
  try {
    const r = await api('POST', {
      action: 'seats', id: seatReg.id, seats: seatCount(),
      companions: companionInputs().map((i) => i.value), notify: $('#seat-notify').checked && !$('#seat-notify-wrap').hidden,
    });
    $('#seat-dialog').close();
    if (r.mailError) alert(r.mailError);
    if (r.promoted?.length) return sendInvites(r.promoted);
    await load();
    alert(r.unchanged ? 'Nichts geändert.' : `Gespeichert.${r.mailed ? ' Die Mail an den Gast ist raus.' : ''}`);
  } catch (err) {
    alert(err.message);
  } finally {
    btnEl.disabled = false;
  }
};

$('#csv').onclick = () => {
  const cols = ['status', 'created_at', 'name', 'email', 'phone', 'seats', 'companions', 'street', 'zip', 'city', 'address_consent', 'questions', 'source',
    'reminder_optout_at', 'cancelled_via', 'calendar_at', 'calendar_via'];
  const cell = (v) => '"' + String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""') + '"';
  const csv = '﻿' + [cols.join(';'), ...data.registrations.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'anmeldungen-infoabend.csv';
  a.click();
};

if (pw) load();
