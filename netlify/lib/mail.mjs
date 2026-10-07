import nodemailer from 'nodemailer';
import { EVENT, siteUrl } from './event.mjs';
import { invitationPdf } from './pdf.mjs';
import { icsFile, googleCalendarUrl } from './ics.mjs';

let transport;
function smtp() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

const from = () => process.env.MAIL_FROM || `Baufinanz Düren <${EVENT.notifyEmail}>`;
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const layout = (body) => `<!doctype html><html><body style="margin:0;background:#F0F2F9;font-family:Raleway,Arial,Helvetica,sans-serif;color:#191919">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-top:6px solid #3C59AD">
<tr><td style="padding:28px 32px"><img src="${siteUrl()}/assets/logo-baufinanz.png" alt="Baufinanz Düren" width="160"></td></tr>
<tr><td style="padding:0 32px 32px;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#1A3569;color:#fff;font-size:12px">${EVENT.organizer} · <a href="${EVENT.imprintUrl}" style="color:#fff">Impressum</a> · <a href="${EVENT.privacyUrl}" style="color:#fff">Datenschutz</a></td></tr>
</table></td></tr></table></body></html>`;

// primary = dunkelblauer Hauptknopf wie „Beraten lassen“ auf baufinanz-dueren.de
const btn = (href, label, primary = false) =>
  `<a href="${href}" style="display:inline-block;background:${primary ? '#1A3569' : '#3C59AD'};color:#fff;text-decoration:none;padding:12px 24px;border-radius:120px;font-weight:bold;margin:4px 8px 4px 0">${label}</a>`;

export async function sendConfirmation(reg) {
  const pdf = await invitationPdf(reg);
  const html = layout(`
    <h1 style="color:#1A3569;font-size:22px;margin:0 0 12px">Sie sind angemeldet!</h1>
    <p>Hallo ${esc(reg.name)},</p>
    <p>vielen Dank für Ihre Anmeldung zu unserem Infoabend <strong>„${EVENT.title}“</strong>.
    Wir haben <strong>${reg.seats} ${reg.seats === 1 ? 'Platz' : 'Plätze'}</strong> für Sie reserviert.</p>
    <p style="background:#F0F2F9;padding:14px 16px;border-left:4px solid #3C59AD">
      <strong>${EVENT.dateLabel}</strong><br>Einlass ${EVENT.admission} · Beginn ${EVENT.start}<br>
      ${EVENT.venue}<br>${EVENT.address}<br>Ticket-Code: <strong>${esc(reg.ticket_code)}</strong></p>
    <p>Ihre persönliche Einladung finden Sie <strong>als PDF im Anhang</strong> – mit allen Infos zum Abend.</p>
    <p>${btn(googleCalendarUrl(), 'In Google Kalender')} ${btn(siteUrl() + '/api/ics', 'In Apple/Outlook-Kalender')}</p>
    <p>Alle Informationen zum Abend: <a href="${siteUrl()}">${siteUrl().replace('https://', '')}</a></p>
    <p>Sie möchten schon vorher persönlich sprechen?<br>${btn(EVENT.contactUrl, 'Termin vereinbaren', true)}</p>
    <p>Wir freuen uns auf Sie!<br>Ihr Team der Baufinanz Düren</p>`);

  await smtp().sendMail({
    from: from(),
    to: reg.email,
    replyTo: EVENT.notifyEmail,
    subject: `Ihre Einladung: Infoabend am ${EVENT.dateLabel}`,
    html,
    attachments: [
      { filename: 'Einladung-Infoabend-Baufinanz-Dueren.pdf', content: Buffer.from(pdf) },
      { filename: 'Infoabend.ics', content: icsFile(), contentType: 'text/calendar' },
    ],
  });
}

export async function sendWaitlist(reg) {
  await smtp().sendMail({
    from: from(),
    to: reg.email,
    replyTo: EVENT.notifyEmail,
    subject: 'Sie stehen auf der Warteliste – Infoabend Baufinanz Düren',
    html: layout(`
      <h1 style="color:#1A3569;font-size:22px;margin:0 0 12px">Sie stehen auf der Warteliste</h1>
      <p>Hallo ${esc(reg.name)},</p>
      <p>der Infoabend am <strong>${EVENT.dateLabel}</strong> ist aktuell ausgebucht. Wir haben Sie mit
      <strong>${reg.seats} ${reg.seats === 1 ? 'Platz' : 'Plätzen'}</strong> auf die Warteliste gesetzt und melden uns,
      sobald ein Platz frei wird – dann erhalten Sie Ihre Einladung per E-Mail.</p>
      <p>Gern beraten wir Sie auch persönlich:<br>${btn(EVENT.contactUrl, 'Termin vereinbaren', true)}</p>
      <p>Ihr Team der Baufinanz Düren</p>`),
  });
}

// Interne Info an infoabend@baufinanz-dueren.de
export async function notifyTeam(reg) {
  const rows = [
    ['Status', reg.status === 'confirmed' ? 'Bestätigt' : 'Warteliste'],
    ['Name', reg.name], ['E-Mail', reg.email], ['Telefon', reg.phone],
    ['Plätze', reg.seats], ['Begleitung', (reg.companions || []).join(', ') || '–'],
    ['Adresse', [reg.street, reg.zip, reg.city].filter(Boolean).join(', ') || '–'],
    ['Magazin per Post', reg.address_consent ? 'Ja' : 'Nein'],
    ['Fragen vorab', reg.questions || '–'], ['Quelle', reg.source || 'direkt'], ['Ticket', reg.ticket_code],
  ];
  await smtp().sendMail({
    from: from(),
    to: process.env.NOTIFY_EMAIL || EVENT.notifyEmail,
    replyTo: reg.email,
    subject: `${reg.status === 'confirmed' ? 'Neue Anmeldung' : 'Warteliste'}: ${reg.name} (${reg.seats})`,
    html: '<table cellpadding="4">' + rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('') + '</table>',
  });
}
