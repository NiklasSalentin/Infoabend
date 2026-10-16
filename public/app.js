const $ = (s) => document.querySelector(s);

const form = $('#form');
const seatsSel = $('#seats');
const companionBox = $('#companions');
let state = { free: null, maxPerPerson: 1, open: true };

// Werbekanal aus dem QR-Code (z. B. /zeitung → ?utm_source=zeitung) – nur aus der Adresse gelesen,
// bewusst nichts im Browser gespeichert
const source = new URLSearchParams(location.search).get('utm_source') || '';

// Besucherzähler für /admin – ohne Cookies, nichts wird auf dem Gerät gespeichert
try {
  if (!(navigator.sendBeacon && navigator.sendBeacon('/api/visit'))) fetch('/api/visit', { method: 'POST', keepalive: true }).catch(() => {});
} catch {}

// Termin des Abends (für das Meta-Pixel-Ereignis unten)
const eventDate = new Date('2026-12-09T18:00:00+01:00');

// Meta-Pixel: Name des Abends für das Ereignis „Lead“, z. B. „Infoabend 09.12.2026“ (Datum aus eventDate)
const metaLead = (status) => window.metaTrack?.('Lead', {
  content_name: `Infoabend ${eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })}`,
  content_category: status, // 'Anmeldung' oder 'Warteliste' – zum Unterscheiden im Events Manager
});

// Kalender-Knopf nach der Anmeldung: /kalender erkennt das Gerät (iPhone/Outlook → Kalenderdatei, Android → Google Kalender)

const waitlistMode = () => !state.open ? false : state.free === 0;

function renderSeats() {
  const max = waitlistMode() ? state.maxPerPerson : Math.max(1, Math.min(state.maxPerPerson, state.free ?? state.maxPerPerson));
  const current = Number(seatsSel.value) || 1;
  seatsSel.innerHTML = '';
  for (let i = 1; i <= max; i++) seatsSel.add(new Option(i === 1 ? '1 Platz' : `${i} Plätze`, i));
  seatsSel.value = Math.min(current, max);
  renderCompanions();
}

function renderCompanions() {
  const n = Number(seatsSel.value) - 1;
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

// Siegel immer genau so hoch wie das Datumsfeld (wie auf dem Plakat) – auch wenn Texte umbrechen
const eckRow = $('.eckdaten-row');
const dateBox = $('.date-box');
eckRow.classList.add('js-seal');
const syncSeal = () => {
  const cs = getComputedStyle(eckRow);
  if (cs.display === 'flex' && cs.flexDirection === 'row') eckRow.style.setProperty('--eck-h', dateBox.offsetHeight + 'px');
  else eckRow.style.removeProperty('--eck-h'); // Handy: Siegel klein im Datumsfeld, feste Höhe aus dem CSS
};
new ResizeObserver(syncSeal).observe(dateBox);
syncSeal();

// Navigations-Auswahl (Google Maps / Apple Karten): schließen bei Klick daneben oder Escape
const navChoice = $('.nav-choice');
document.addEventListener('click', (e) => { if (navChoice.open && !navChoice.contains(e.target)) navChoice.open = false; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') navChoice.open = false; });
navChoice.querySelectorAll('a[data-nav]').forEach((a) => a.addEventListener('click', () => { navChoice.open = false; }));

// Zeichenzähler für „Ihre Fragen vorab“ (max. 300 – so viel nimmt die Fragen-App an)
const questionsField = form.elements.questions;
const updateCount = () => { $('#questions-count').textContent = `${questionsField.value.length} / 300 Zeichen`; };
questionsField.addEventListener('input', updateCount);


async function loadStatus() {
  try {
    const s = await (await fetch('/api/status')).json();
    if (s.error) return;
    state = s;
    // Schild neben „Jetzt Platz sichern“. s.free ist die angezeigte Zahl (Kontingent, public/plaetze.js) –
    // keine Gesamtzahl auf der Seite
    const full = s.free === 0;
    $('#seats-badge').classList.toggle('full', full);
    $('#seats-prefix').textContent = full ? 'Ausgebucht' : 'Noch';
    $('#seats-free').textContent = full ? '' : s.free;
    $('#seats-label').textContent = full ? 'Warteliste offen' : s.free === 1 ? 'Platz frei' : 'Plätze frei';
    $('#seats-badge').hidden = !s.open;
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
      hint.textContent = `${s.released ? 'Weitere Plätze freigegeben: ' : ''}Noch ${s.free} ${s.free === 1 ? 'Platz' : 'Plätze'} frei · max. ${s.maxPerPerson} pro Anmeldung`;
      btn.textContent = 'Platz verbindlich reservieren';
    }
    renderSeats();
  } catch {}
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#error');
  err.textContent = '';
  if (!form.reportValidity()) return;

  const f = form.elements;
  const body = {
    name: f.name.value, email: f.email.value, phone: f.phone.value,
    seats: Number(seatsSel.value),
    companions: [...companionBox.querySelectorAll('input')].map((i) => i.value),
    street: f.street.value, houseNumber: f.houseNumber.value, zip: f.zip.value, city: f.city.value,
    privacyConsent: f.privacyConsent.checked,
    questions: f.questions.value,
    website: f.website.value,
    waitlist: waitlistMode(),
    source,
  };

  const btn = $('#submit');
  btn.disabled = true;
  try {
    const res = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.status === 'confirmed' || data.status === 'waitlist') {
      // Meta-Pixel (nur mit Einwilligung): erfolgreiche Anmeldung bzw. Warteliste als „Lead“ melden
      metaLead(data.status === 'confirmed' ? 'Anmeldung' : 'Warteliste');
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
        metaLead('Warteliste');
        form.hidden = true;
        $('#waitlisted').hidden = false;
        return;
      }
      err.textContent = r2.error || 'Fehler';
    } else {
      err.textContent = data.errors ? Object.values(data.errors).join(' ') : data.error || 'Die Anmeldung ist gerade nicht möglich. Bitte versuchen Sie es später erneut oder rufen Sie uns an: 0172 60 75 100.';
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
