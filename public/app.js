const $ = (s) => document.querySelector(s);
const form = $('#form');
const seatsSel = $('#seats');
const companionBox = $('#companions');
const hasCompanion = $('#has-companion');
let state = { free: null, maxPerPerson: 1, open: true };

// Countdown bis 9. Dezember 2026
const eventDate = new Date('2026-12-09T18:00:00+01:00');
const days = Math.max(0, Math.ceil((eventDate - Date.now()) / 864e5));
$('#countdown').textContent = days;

$('#gcal').href = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
  action: 'TEMPLATE',
  text: 'Infoabend: Wie kaufe ich eigentlich eine Immobilie?',
  dates: '20261209T170000Z/20261209T200000Z',
  location: 'Festhalle Birkesdorf, An der Festhalle 3, 52353 Düren-Birkesdorf',
  details: 'Einlass 18:00 Uhr, Beginn 18:30 Uhr. Infos: ' + location.origin,
});

const waitlistMode = () => !state.open ? false : state.free === 0;

function renderSeats() {
  const max = waitlistMode() ? state.maxPerPerson : Math.max(1, Math.min(state.maxPerPerson, state.free ?? state.maxPerPerson));
  const current = Number(seatsSel.value) || 1;
  seatsSel.innerHTML = '';
  for (let i = 1; i <= max; i++) seatsSel.add(new Option(i === 1 ? '1 Platz' : `${i} Plätze`, i));
  seatsSel.value = Math.min(current, max);
  hasCompanion.parentElement.hidden = max < 2;
  renderCompanions();
}

function renderCompanions() {
  const n = Number(seatsSel.value) - 1;
  hasCompanion.checked = n > 0;
  const existing = [...companionBox.querySelectorAll('input')].map((i) => i.value);
  companionBox.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const l = document.createElement('label');
    l.textContent = `Name Begleitperson ${n > 1 ? i + 1 : ''}`;
    const inp = document.createElement('input');
    inp.name = 'companion';
    inp.value = existing[i] || '';
    l.append(inp);
    companionBox.append(l);
  }
  companionBox.hidden = n === 0;
}

seatsSel.addEventListener('change', renderCompanions);
hasCompanion.addEventListener('change', () => {
  seatsSel.value = hasCompanion.checked ? 2 : 1;
  renderCompanions();
});

// Adress-Einverständnis nur Pflicht, wenn Adresse ausgefüllt
const addressFields = ['street', 'zip', 'city'].map((n) => form.elements[n]);
const addressConsent = form.elements.addressConsent;
const syncAddress = () => {
  const filled = addressFields.some((f) => f.value.trim());
  addressConsent.required = filled;
  $('#address-consent-wrap .req').hidden = !filled;
};
addressFields.forEach((f) => f.addEventListener('input', syncAddress));

async function loadStatus() {
  try {
    const s = await (await fetch('/api/status')).json();
    if (s.error) return;
    state = s;
    $('#seats-free').textContent = s.free;
    $('#seats-label').textContent = `von ${s.total} Plätzen frei`;
    if (s.attendees >= 10) {
      $('#attendees').textContent = s.attendees;
      $('#social-proof').hidden = false;
    }
    const hint = $('#seat-hint');
    const btn = $('#submit');
    if (!s.open) {
      hint.textContent = 'Die Anmeldung ist derzeit geschlossen.';
      form.hidden = true;
    } else if (s.free === 0) {
      hint.textContent = 'Der Abend ist aktuell ausgebucht. Tragen Sie sich gern auf die Warteliste ein – wird ein Platz frei, melden wir uns.';
      btn.textContent = 'Auf die Warteliste setzen';
    } else {
      hint.textContent = `Noch ${s.free} von ${s.total} Plätzen frei · max. ${s.maxPerPerson} pro Anmeldung`;
      btn.textContent = 'Platz verbindlich reservieren';
    }
    renderSeats();
  } catch {}
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#error');
  err.textContent = '';
  syncAddress();
  if (!form.reportValidity()) return;

  const f = form.elements;
  const body = {
    name: f.name.value, email: f.email.value, phone: f.phone.value,
    seats: Number(seatsSel.value),
    companions: [...companionBox.querySelectorAll('input')].map((i) => i.value),
    street: f.street.value, zip: f.zip.value, city: f.city.value,
    addressConsent: addressConsent.checked,
    privacyConsent: f.privacyConsent.checked,
    questions: f.questions.value,
    website: f.website.value,
    waitlist: waitlistMode(),
  };

  const btn = $('#submit');
  btn.disabled = true;
  try {
    const res = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.status === 'confirmed' || data.status === 'waitlist') {
      form.hidden = true;
      $('#seat-hint').hidden = true;
      $(data.status === 'confirmed' ? '#success' : '#waitlisted').hidden = false;
      $('#anmeldung').scrollIntoView({ behavior: 'smooth' });
      loadStatus();
      return;
    }
    if (data.status === 'full' && confirm('Für diese Anzahl sind nicht mehr genug Plätze frei. Möchten Sie sich auf die Warteliste setzen?')) {
      body.waitlist = true;
      const r2 = await (await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
      if (r2.status === 'waitlist') {
        form.hidden = true;
        $('#waitlisted').hidden = false;
        return;
      }
      err.textContent = r2.error || 'Fehler';
    } else {
      err.textContent = data.errors ? Object.values(data.errors).join(' ') : data.error || 'Unbekannter Fehler';
    }
    loadStatus();
  } catch {
    err.textContent = 'Verbindungsfehler – bitte versuchen Sie es erneut.';
  } finally {
    btn.disabled = false;
  }
});

renderSeats();
loadStatus();
