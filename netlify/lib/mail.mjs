import nodemailer from 'nodemailer';
import { EVENT, siteUrl } from './event.mjs';
import { googleCalendarUrl } from './ics.mjs';

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

/**
 * Eine Mail im Stil von Plakat und Seite: blauer Kopf mit Logo und Titel, Navy-Datumsfeld mit Gold-Datum,
 * weißer Inhalt, Navy-Fuß. Tabellen + Inline-Styles, damit es auch in Outlook/Gmail hält.
 */
function layout({ preheader, eyebrow, body }) {
  const site = siteUrl();
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<style>
@font-face{font-family:Raleway;font-weight:400;src:url(${site}/assets/fonts/raleway-400.woff2) format('woff2')}
@font-face{font-family:Raleway;font-weight:600;src:url(${site}/assets/fonts/raleway-600.woff2) format('woff2')}
@font-face{font-family:Raleway;font-weight:700;src:url(${site}/assets/fonts/raleway-700.woff2) format('woff2')}
@media (max-width:620px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:30px!important}.date{font-size:40px!important}.btn{display:block!important;margin:0 0 10px!important;text-align:center!important}}
</style></head>
<body style="margin:0;padding:0;background:${C.light};font-family:${FONT};color:${C.text}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.light}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-radius:18px;overflow:hidden;background:#ffffff">

<!-- Kopf wie Plakat: Logo-Blau, Logo, Hinweis, großer Titel -->
<tr><td class="px" style="background:${C.blue};padding:32px 40px 30px">
  <img src="${site}/assets/logo-weiss.png" width="180" alt="Baufinanz Düren" style="display:block;border:0;width:180px;height:auto">
  <p style="margin:28px 0 14px"><span style="display:inline-block;padding:7px 16px;border-radius:999px;background:${C.gold};color:${C.navy};font-family:${FONT};font-size:14px;font-weight:700">${eyebrow}</span></p>
  <h1 class="h1" style="margin:0;color:#ffffff;font-family:${FONT};font-size:36px;line-height:1.15;font-weight:600;letter-spacing:-.5px">${EVENT.title}</h1>
  <p style="margin:12px 0 0;color:#dfe3f5;font-family:${FONT};font-size:16px;line-height:1.5">${EVENT.subtitle}</p>
</td></tr>

<!-- Datumsfeld wie Plakat: Navy, Gold-Datum -->
<tr><td class="px" style="background:${C.blue};padding:0 40px 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.navy};border-radius:16px"><tr><td style="padding:24px 26px">
    <p style="margin:0;color:#b8c0e6;font-family:${FONT};font-size:14px;letter-spacing:3px;text-transform:uppercase">${weekday}</p>
    <p class="date" style="margin:2px 0 14px;color:${C.gold};font-family:${FONT};font-size:48px;line-height:1.1;font-weight:700">${d}.${m}.${y}</p>
    <p style="margin:0;padding-top:14px;border-top:1px solid #3a4378;color:#ffffff;font-family:${FONT};font-size:16px;line-height:1.6">
      <strong>Einlass ${EVENT.admission}</strong> · Beginn ${EVENT.start}<br>
      <strong>${EVENT.venue}</strong><br><span style="color:#b8c0e6">${EVENT.address}</span></p>
    <p style="margin:12px 0 0;font-family:${FONT};font-size:14px">
      <a href="${EVENT.mapsGoogle}" style="color:${C.gold};font-weight:700;text-decoration:none">Route in Google Maps&nbsp;›</a>&nbsp;&nbsp;
      <a href="${EVENT.mapsApple}" style="color:${C.gold};font-weight:700;text-decoration:none">Apple Karten&nbsp;›</a></p>
  </td></tr></table>
</td></tr>

<!-- Inhalt -->
<tr><td class="px" style="padding:34px 40px 10px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text}">${body}</td></tr>

<!-- Fuß -->
<tr><td class="px" style="background:${C.navy};padding:24px 40px;font-family:${FONT};font-size:13px;line-height:1.6;color:#b8c0e6">
  <strong style="color:#ffffff">${EVENT.organizer}</strong><br>
  ${EVENT.officeAddress} · <a href="tel:+491726075100" style="color:#b8c0e6">${EVENT.phone}</a> · <a href="mailto:${EVENT.notifyEmail}" style="color:#b8c0e6">${EVENT.notifyEmail}</a><br>
  <a href="${EVENT.imprintUrl}" style="color:#ffffff">Impressum</a> &nbsp;·&nbsp; <a href="${EVENT.privacyUrl}" style="color:#ffffff">Datenschutz</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (href, label, { bg = C.blue, color = '#ffffff' } = {}) =>
  `<a class="btn" href="${href}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 24px;border-radius:999px;background:${bg};color:${color};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none">${label}</a>`;
const h2 = (t) => `<h2 style="margin:30px 0 8px;color:${C.blue};font-family:${FONT};font-size:20px;line-height:1.3;font-weight:700">${t}</h2>`;
const row = (k, v) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e3e7f3;color:${C.muted};font-size:15px;width:130px;vertical-align:top">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e3e7f3;font-size:15px;font-weight:600">${v}</td></tr>`;
const seatsText = (n) => `${n} ${n === 1 ? 'Platz' : 'Plätze'}`;

export function confirmationHtml(reg) {
  const companions = (reg.companions || []).filter(Boolean);
  return layout({
    preheader: `Ihr Platz ist reserviert: ${EVENT.dateLabel}, Einlass ${EVENT.admission}, ${EVENT.venue}.`,
    eyebrow: 'Ihre Anmeldung ist bestätigt',
    body: `
      <p style="margin:0 0 14px">Hallo ${esc(reg.name)},</p>
      <p style="margin:0 0 14px">vielen Dank für Ihre Anmeldung! Wir haben <strong>${seatsText(reg.seats)}</strong> für Sie reserviert
      und freuen uns, Sie beim Infoabend zu begrüßen. Die Teilnahme ist kostenlos – ein Ticket brauchen Sie nicht,
      Sie stehen mit Ihrem Namen auf unserer Gästeliste.</p>

      ${h2('Ihre Anmeldung')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT}">
        ${row('Name', esc(reg.name))}
        ${row('Plätze', seatsText(reg.seats))}
        ${companions.length ? row('Begleitung', esc(companions.join(', '))) : ''}
        ${row('Datum', EVENT.dateLabel)}
        ${row('Uhrzeit', `Einlass ${EVENT.admission} · Beginn ${EVENT.start}`)}
        ${row('Ort', `${EVENT.venue}<br><span style="font-weight:400">${EVENT.address}</span>`)}
      </table>

      ${h2('In den Kalender eintragen')}
      <p style="margin:0 0 14px">Mit einem Klick steht der Termin samt Adresse in Ihrem Kalender – inklusive Erinnerung am Vortag.</p>
      <p style="margin:0">${btn(siteUrl() + '/api/ics', 'iPhone / Outlook')}${btn(googleCalendarUrl(), 'Google Kalender')}</p>

      ${h2('Das erwartet Sie')}
      <p style="margin:0 0 6px"><strong>Teil 1 · Ihre Finanzierung</strong><br>Wie Sie im Gespräch mit Maklern überzeugend auftreten und Ihre Finanzierung
      von Anfang an richtig aufstellen – von der vollständigen Unterlagenliste bis zum Annuitätendarlehen. Praxisnah, verständlich, auf Augenhöhe.</p>
      <p style="margin:12px 0 0"><strong>Teil 2 · Der Notartermin</strong><br>Ein erfahrener Notar erklärt, was beim Notartermin wirklich passiert,
      welche Unterlagen Sie brauchen und worauf Sie beim Vertrag achten sollten.</p>

      ${h2('Ankommen &amp; Platz nehmen')}
      <p style="margin:0">Kommen Sie an und nehmen Sie bei freier Platzwahl Platz, bevor es um ${EVENT.start} losgeht.
      Direkt an der Festhalle stehen ausreichend kostenlose Parkplätze zur Verfügung.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 20px;background:${C.light};border-radius:14px"><tr><td style="padding:20px 22px;font-family:${FONT}">
        <p style="margin:0 0 12px;font-size:16px;line-height:1.5"><strong>Sie möchten schon vorher persönlich sprechen?</strong><br>
        <span style="color:${C.muted}">Wir nehmen uns gern Zeit für Ihre Finanzierung.</span></p>
        ${btn(EVENT.contactUrl, 'Persönliche Beratung buchen', { bg: C.orange, color: C.navy })}
      </td></tr></table>

      <p style="margin:0 0 24px">Bis bald in der Festhalle!<br><strong>Ihr Team der Baufinanz Düren</strong></p>
      <p style="margin:0 0 20px;font-size:13px;color:${C.muted}">Sie können doch nicht kommen? Antworten Sie einfach kurz auf diese E-Mail – dann geben wir Ihren Platz frei.</p>`,
  });
}

export async function sendConfirmation(reg) {
  await smtp().sendMail({
    from: from(),
    to: reg.email,
    replyTo: EVENT.notifyEmail,
    subject: `Ihre Anmeldung: Infoabend am ${EVENT.dateLabel}`,
    html: confirmationHtml(reg),
  });
}

export const waitlistHtml = (reg) => layout({
      preheader: 'Der Infoabend ist ausgebucht – wir melden uns, sobald ein Platz frei wird.',
      eyebrow: 'Sie stehen auf der Warteliste',
      body: `
        <p style="margin:0 0 14px">Hallo ${esc(reg.name)},</p>
        <p style="margin:0 0 14px">der Infoabend ist aktuell ausgebucht. Wir haben Sie mit <strong>${seatsText(reg.seats)}</strong>
        auf die Warteliste gesetzt. Sobald ein Platz frei wird, melden wir uns – dann erhalten Sie Ihre Bestätigung per E-Mail.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 20px;background:${C.light};border-radius:14px"><tr><td style="padding:20px 22px;font-family:${FONT}">
          <p style="margin:0 0 12px;font-size:16px;line-height:1.5"><strong>Gern beraten wir Sie auch persönlich.</strong></p>
          ${btn(EVENT.contactUrl, 'Persönliche Beratung buchen', { bg: C.orange, color: C.navy })}
        </td></tr></table>
        <p style="margin:0 0 24px">Ihr Team der Baufinanz Düren</p>`,
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

// Interne Info an info@baufinanz-dueren.de
export async function notifyTeam(reg) {
  const rows = [
    ['Status', reg.status === 'confirmed' ? 'Bestätigt' : 'Warteliste'],
    ['Name', reg.name], ['E-Mail', reg.email], ['Telefon', reg.phone],
    ['Plätze', reg.seats], ['Begleitung', (reg.companions || []).join(', ') || '–'],
    ['Adresse', [reg.street, reg.zip, reg.city].filter(Boolean).join(', ') || '–'],
    ['Fragen vorab', reg.questions || '–'], ['Quelle', reg.source || 'direkt'],
  ];
  await smtp().sendMail({
    from: from(),
    to: process.env.NOTIFY_EMAIL || EVENT.notifyEmail,
    replyTo: reg.email,
    subject: `${reg.status === 'confirmed' ? 'Neue Anmeldung' : 'Warteliste'}: ${reg.name} (${reg.seats})`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px"><table cellpadding="6" style="border-collapse:collapse">` +
      rows.map(([k, v]) => `<tr><td style="color:#5a6585"><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('') +
      `</table><p><a href="${siteUrl()}/admin">Zur Verwaltung</a></p></div>`,
  });
}
