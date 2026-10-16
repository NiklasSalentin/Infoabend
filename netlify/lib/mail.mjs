import nodemailer from 'nodemailer';
import { EVENT, siteUrl } from './event.mjs';

let transport;
function smtp() {
  if (!transport) {
    // Standard: Strato-Postfach info@baufinanz-dueren.de – in Netlify muss nur SMTP_PASS stehen
    const port = Number(process.env.SMTP_PORT || 465);
    if (!process.env.SMTP_PASS) throw new Error('SMTP_PASS fehlt in Netlify – Mails können nicht verschickt werden');
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.strato.de',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER || EVENT.notifyEmail, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

const from = () => process.env.MAIL_FROM || `Baufinanz Düren <${EVENT.notifyEmail}>`;
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Farben wie Plakat und Anmeldeseite
const C = { blue: '#323D8D', navy: '#1C2350', gold: '#D9B56C', orange: '#f0a63a', text: '#191919', muted: '#5a6585', light: '#F0F2F9' };
const FONT = "Raleway, 'Segoe UI', Arial, Helvetica, sans-serif";

// Termin als Kurzform wie auf dem Plakat: „Mittwoch“ + „09.12.2026“
const [, y, m, d] = EVENT.startUtc.match(/^(\d{4})(\d{2})(\d{2})/);
const weekday = EVENT.dateLabel.split(',')[0];
// Anrede für die Überschrift: Vorname („Maria Muster“ → „Maria“); bei Anrede/Titel/Initiale
// den ganzen Namen („Herr Müller“, „Dr. Weber“, „S. Salentin“ bleiben vollständig)
const firstName = (name) => {
  const full = String(name || '').trim().replace(/\s+/g, ' ');
  const first = full.split(' ')[0];
  const keepFull = /^(herr|frau|familie|fam\.?|dr\.?|prof\.?)$/i.test(first) || first.length <= 2 || first.endsWith('.');
  return esc(keepFull || !full.includes(' ') ? full : first);
};
const seatsText = (n) => `${n} ${n === 1 ? 'Platz' : 'Plätze'}`;

/**
 * Rahmen im Design von Plakat und Seite (Logo-Blau, Navy, Gold, Raleway) – Inhalt ist eine Bestätigung,
 * keine Kopie der Seite. Tabellen + Inline-Styles, damit es auch in Outlook/Gmail hält.
 */
function layout({ preheader, hero, body }) {
  const site = siteUrl();
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<style>
@font-face{font-family:Raleway;font-weight:400;src:url(${site}/assets/fonts/raleway-400.woff2) format('woff2')}
@font-face{font-family:Raleway;font-weight:600;src:url(${site}/assets/fonts/raleway-600.woff2) format('woff2')}
@font-face{font-family:Raleway;font-weight:700;src:url(${site}/assets/fonts/raleway-700.woff2) format('woff2')}
@media (max-width:620px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:30px!important}.date{font-size:38px!important}.btn{display:block!important;margin:0 0 10px!important;text-align:center!important}}
</style></head>
<body style="margin:0;padding:0;background:${C.light};font-family:${FONT};color:${C.text}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.light}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-radius:18px;overflow:hidden;background:#ffffff">
<tr><td class="px" style="background:${C.blue};padding:30px 40px 36px">
  <img src="${site}/assets/logo-weiss.png" width="170" alt="Baufinanz Düren" style="display:block;border:0;width:170px;height:auto">
  ${hero}
</td></tr>
<tr><td class="px" style="padding:32px 40px 10px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text}">${body}</td></tr>
<tr><td class="px" style="background:${C.navy};padding:24px 40px;font-family:${FONT};font-size:13px;line-height:1.6;color:#b8c0e6">
  <strong style="color:#ffffff">${EVENT.organizer}</strong><br>
  ${EVENT.officeAddress} · <a href="tel:+491726075100" style="color:#b8c0e6">${EVENT.phone}</a> · <a href="mailto:${EVENT.notifyEmail}" style="color:#b8c0e6">${EVENT.notifyEmail}</a><br>
  <a href="${EVENT.imprintUrl}" style="color:#ffffff">Impressum</a> &nbsp;·&nbsp; <a href="${EVENT.privacyUrl}" style="color:#ffffff">Datenschutz</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (href, label, { bg = C.blue, color = '#ffffff' } = {}) =>
  `<a class="btn" href="${href}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 24px;border-radius:999px;background:${bg};color:${color};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none">${label}</a>`;
const pill = (t) => `<span style="display:inline-block;padding:7px 16px;border-radius:999px;background:${C.gold};color:${C.navy};font-family:${FONT};font-size:14px;font-weight:700">${t}</span>`;
const heroTitle = (title, sub, line = `Infoabend „${EVENT.title}“`) => `
  <p style="margin:30px 0 14px">${pill(sub)}</p>
  <h1 class="h1" style="margin:0;color:#ffffff;font-family:${FONT};font-size:36px;line-height:1.15;font-weight:600;letter-spacing:-.5px">${title}</h1>
  <p style="margin:10px 0 0;color:#dfe3f5;font-family:${FONT};font-size:16px;line-height:1.5">${line}</p>`;
const label = (t) => `<p style="margin:0 0 2px;color:#b8c0e6;font-family:${FONT};font-size:12px;letter-spacing:2px;text-transform:uppercase">${t}</p>`;
const tip = (title, text) => `<tr><td width="28" style="padding:0 0 12px;vertical-align:top;color:${C.gold};font-size:18px;line-height:1.4">&#9679;</td>
  <td style="padding:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.55"><strong>${title}</strong> – ${text}</td></tr>`;

export function confirmationHtml(reg) {
  const companions = (reg.companions || []).filter(Boolean);
  // Von der Warteliste nachgerückt? Dann beginnt die Mail mit der guten Nachricht
  const promoted = Boolean(reg.promoted_at);
  // Bestätigungskarte (Navy, Gold-Datum) – wie das Datumsfeld auf Plakat und Seite
  const card = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;background:${C.navy};border-radius:16px"><tr><td style="padding:22px 24px 8px">
    ${label('Reserviert für')}
    <p style="margin:0 0 14px;color:#ffffff;font-family:${FONT};font-size:19px;font-weight:700;line-height:1.35">${esc(reg.name)}
      <span style="font-weight:400;color:#b8c0e6"> · ${seatsText(reg.seats)}</span>
      ${companions.length ? `<br><span style="font-size:15px;font-weight:400;color:#dfe3f5">mit ${esc(companions.join(', '))}</span>` : ''}</p>
  </td></tr>
  <tr><td style="padding:0 24px"><div style="border-top:2px dashed #3a4378;height:0;line-height:0;font-size:0">&nbsp;</div></td></tr>
  <tr><td style="padding:16px 24px 22px">
    ${label(weekday)}
    <p class="date" style="margin:0 0 10px;color:${C.gold};font-family:${FONT};font-size:44px;line-height:1.1;font-weight:700">${d}.${m}.${y}</p>
    <p style="margin:0;color:#ffffff;font-family:${FONT};font-size:16px;line-height:1.6"><strong>Einlass ${EVENT.admission}</strong> · Beginn ${EVENT.start}<br>
      <strong>${EVENT.venue}</strong><br><span style="color:#b8c0e6">${EVENT.address}</span></p>
    <p style="margin:12px 0 0;font-family:${FONT};font-size:14px">
      <a href="${EVENT.mapsGoogle}" style="color:${C.gold};font-weight:700;text-decoration:none">Route mit Google Maps&nbsp;›</a>&nbsp;&nbsp;
      <a href="${EVENT.mapsApple}" style="color:${C.gold};font-weight:700;text-decoration:none">Apple Karten&nbsp;›</a></p>
  </td></tr></table>`;

  return layout({
    preheader: `Ihr Platz ist reserviert: ${EVENT.dateLabel}, Einlass ${EVENT.admission}, ${EVENT.venue}.`,
    hero: heroTitle(`Herzlich willkommen, ${firstName(reg.name)}!`, promoted ? '✓ Platz frei geworden' : '✓ Anmeldung bestätigt',
      `Wir freuen uns, Sie beim Infoabend „${EVENT.title}“ begrüßen zu dürfen.`) + card,
    body: `
      <p style="margin:0 0 14px">Hallo ${esc(reg.name)},</p>
      <p style="margin:0 0 22px">${promoted
    ? 'gute Nachricht: Für Sie ist ein Platz frei geworden! Sie sind von der Warteliste nachgerückt – wir haben'
    : 'vielen Dank für Ihre Anmeldung! Wir haben'} <strong>${seatsText(reg.seats)}</strong> für Sie reserviert.
      Sie stehen mit Ihrem Namen auf unserer Gästeliste – ein Ticket brauchen Sie nicht.</p>

      <p style="margin:0">${btn(siteUrl() + '/kalender', 'Termin in den Kalender eintragen')}</p>
      <p style="margin:0 0 26px;font-size:13px;color:${C.muted}">Für iPhone, Android, Outlook und Google – mit Adresse und Erinnerung am Vortag.</p>

      <p style="margin:0 0 12px;color:${C.blue};font-size:18px;font-weight:700">Gut zu wissen</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${tip('Freie Platzwahl', `Einlass ab ${EVENT.admission}, los geht es um ${EVENT.start}.`)}
        ${tip('Parken', 'kostenlose Parkplätze direkt an der Festhalle.')}
        ${tip('Kostenlos', 'die Teilnahme kostet nichts.')}
        ${tip('Verhindert?', 'antworten Sie kurz auf diese E-Mail, dann geben wir Ihren Platz frei.')}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;background:${C.light};border-radius:14px"><tr><td style="padding:20px 22px;font-family:${FONT}">
        <p style="margin:0 0 12px;font-size:16px;line-height:1.5"><strong>Sie möchten schon vorher sprechen?</strong><br>
        <span style="color:${C.muted}">Wir nehmen uns gern Zeit für Ihre Finanzierung.</span></p>
        ${btn(EVENT.contactUrl, 'Persönliche Beratung buchen', { bg: C.orange, color: C.navy })}
      </td></tr></table>

      <p style="margin:0 0 26px">Wir freuen uns auf Sie!<br><strong>Ihr Team der Baufinanz Düren</strong></p>`,
  });
}

export async function sendConfirmation(reg) {
  await smtp().sendMail({
    from: from(),
    to: reg.email,
    replyTo: EVENT.notifyEmail,
    subject: reg.promoted_at ? 'Gute Nachricht: Ihr Sitzplatz ist gesichert!' : 'Ihr Sitzplatz ist gesichert!',
    html: confirmationHtml(reg),
  });
}

export const waitlistHtml = (reg) => layout({
  preheader: 'Der Infoabend ist ausgebucht – wir melden uns, sobald ein Platz frei wird.',
  hero: heroTitle(`Sie stehen auf der Warteliste, ${firstName(reg.name)}`, 'Warteliste'),
  body: `
    <p style="margin:0 0 14px">Hallo ${esc(reg.name)},</p>
    <p style="margin:0 0 14px">der Infoabend am <strong>${EVENT.dateLabel}</strong> ist aktuell ausgebucht. Wir haben Sie mit
    <strong>${seatsText(reg.seats)}</strong> auf die Warteliste gesetzt. Frei werdende Plätze vergeben wir in der Reihenfolge
    der Anmeldungen – sobald Sie an der Reihe sind, erhalten Sie Ihre Bestätigung per E-Mail.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 22px;background:${C.light};border-radius:14px"><tr><td style="padding:20px 22px;font-family:${FONT}">
      <p style="margin:0 0 12px;font-size:16px;line-height:1.5"><strong>Gern beraten wir Sie auch persönlich.</strong></p>
      ${btn(EVENT.contactUrl, 'Persönliche Beratung buchen', { bg: C.orange, color: C.navy })}
    </td></tr></table>
    <p style="margin:0 0 26px">Ihr Team der Baufinanz Düren</p>`,
});

export async function sendWaitlist(reg) {
  await smtp().sendMail({
    from: from(),
    to: reg.email,
    replyTo: EVENT.notifyEmail,
    subject: 'Sie stehen auf der Warteliste – Infoabend Baufinanz Düren',
    html: waitlistHtml(reg),
  });
}

// Abend-Zusammenfassung an info@ (statt einer Mail pro Anmeldung)
export function digestHtml({ fresh, status, waitlist, since }) {
  const n = fresh.length;
  const seats = fresh.reduce((a, r) => a + r.seats, 0);
  const sinceText = new Date(since).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const th = (t) => `<th style="text-align:left;padding:8px 10px;background:${C.light};color:${C.blue};font-size:13px">${t}</th>`;
  const td = (t) => `<td style="padding:8px 10px;border-bottom:1px solid #e3e7f3;font-size:14px;vertical-align:top">${t}</td>`;
  const stat = (num, text) => `<td width="33%" style="padding:14px 12px;background:${C.light};border-radius:12px;font-family:${FONT}">
    <div style="color:${C.blue};font-size:28px;font-weight:700;line-height:1.1">${num}</div><div style="color:${C.muted};font-size:13px">${text}</div></td>`;
  const rows = fresh.map((r) => `<tr>
    ${td(`<strong>${esc(r.name)}</strong>${r.status === 'waitlist' ? ' <span style="color:#b26b00">(Warteliste)</span>' : ''}${(r.companions || []).length ? `<br><span style="color:${C.muted}">mit ${esc(r.companions.join(', '))}</span>` : ''}`)}
    ${td(r.seats)}
    ${td(`${esc(r.email)}<br>${esc(r.phone)}`)}
    ${td(esc([r.street, r.zip, r.city].filter(Boolean).join(', ') || '–'))}
    ${td(esc(r.source || 'direkt'))}
    ${td(esc(r.questions || '–'))}</tr>`).join('');

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${C.light};font-family:${FONT};color:${C.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="760" cellpadding="0" cellspacing="0" style="width:100%;max-width:760px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${C.blue};padding:22px 28px;color:#fff;font-family:${FONT}">
  <div style="font-size:13px;color:${C.gold};font-weight:700;letter-spacing:1px;text-transform:uppercase">Abend-Zusammenfassung</div>
  <div style="font-size:24px;font-weight:700;margin-top:4px">${n ? `${n} neue Anmeldung${n === 1 ? '' : 'en'} (${seats} ${seats === 1 ? 'Platz' : 'Plätze'})` : 'Keine neuen Anmeldungen'}</div>
  <div style="font-size:14px;color:#dfe3f5;margin-top:2px">seit ${sinceText} Uhr</div>
</td></tr>
<tr><td style="padding:22px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="8"><tr>
  ${stat(`${status.booked} / ${status.total_seats}`, 'Plätze belegt')}${stat(status.free, 'Plätze frei')}${stat(waitlist.length, 'auf der Warteliste')}
</tr></table></td></tr>
${n ? `<tr><td style="padding:10px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:${FONT}">
  <tr>${th('Name')}${th('Plätze')}${th('Kontakt')}${th('Adresse')}${th('Quelle')}${th('Fragen vorab')}</tr>${rows}</table></td></tr>` : ''}
<tr><td style="padding:18px 28px 26px;font-family:${FONT};font-size:14px">
  <a href="${siteUrl()}/admin" style="display:inline-block;padding:11px 22px;border-radius:999px;background:${C.blue};color:#fff;font-weight:700;text-decoration:none">Alle Anmeldungen in der Verwaltung</a>
</td></tr></table></td></tr></table></body></html>`;
  return html;
}

export async function sendDigest(data) {
  const n = data.fresh.length;
  await smtp().sendMail({
    from: from(),
    to: EVENT.notifyEmail,
    subject: `Infoabend: ${n ? `${n} neue Anmeldung${n === 1 ? '' : 'en'} heute` : 'Zusammenfassung'} – ${data.status.booked} von ${data.status.total_seats} Plätzen belegt`,
    html: digestHtml(data),
  });
}
