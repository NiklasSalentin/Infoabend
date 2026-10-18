// /absagen und /erinnerung-abbestellen – Links aus der Erinnerungs-Mail.
//
// Beispiel: Frau Müller klickt in der Erinnerung auf „Termin absagen“
//   → Seite „Möchten Sie Ihren Platz wirklich freigeben?“ → Knopf „Ja, Platz freigeben“
//   → Anmeldung storniert (in /admin: „storniert · selbst abgesagt“), die Plätze gehen der Reihe nach an die
//     Warteliste, Nachgerückte bekommen sofort ihre Einladung.
// Der Klick auf den Link allein ändert nichts (manche Mailprogramme öffnen Links vorab zur Virenprüfung) –
// erst der Knopf auf der Seite.
import { getRegistration, cancelRegistration, stopReminders, markInvited } from '../lib/db.mjs';
import { sendConfirmation, esc } from '../lib/mail.mjs';
import { validToken } from '../lib/reminders.mjs';
import { EVENT, useSite } from '../lib/event.mjs';

const seatsText = (n) => `${n} ${n === 1 ? 'Platz' : 'Plätze'}`;

function page(title, content, status = 200) {
  return new Response(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${title} – Infoabend | Baufinanz Düren</title>
<link rel="icon" href="/assets/favicon.png?v=2" type="image/png">
<meta name="theme-color" content="#323D8D">
<link rel="stylesheet" href="/style.css">
</head>
<body class="legal-page termin-page">
<header class="site-header">
  <div class="header-inner">
    <a class="header-logo" href="https://baufinanz-dueren.de"><img src="/assets/logo-weiss.png" width="241" height="91" alt="Baufinanz Düren GmbH &amp; Co. KG"></a>
  </div>
</header>
<main class="legal">
  <div class="container legal-inner termin">
    <h1>${title}</h1>
    ${content}
  </div>
</main>
</body>
</html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

const contact = `<p class="note">Fragen? Rufen Sie uns an: <a href="tel:+491726075100">${EVENT.phone}</a> oder schreiben Sie an
  <a href="mailto:${EVENT.notifyEmail}">${EVENT.notifyEmail}</a>.</p>`;
const invalid = () => page('Link nicht gültig', `<p>Dieser Link ist leider nicht (mehr) gültig – vielleicht wurde er beim Kopieren
  abgeschnitten. Antworten Sie einfach auf die Erinnerungs-Mail, dann kümmern wir uns darum.</p>${contact}`, 400);
const booking = (r) => `<div class="legal-box"><p><strong>${esc(r.name)}</strong> · ${seatsText(r.seats)}<br>
  ${EVENT.dateLabel} · Einlass ${EVENT.admission} · ${EVENT.venue}</p></div>`;

// Test-Mail aus /admin: Links zeigen die Seiten, ändern aber nichts
const SAMPLE = { id: 'test', name: 'Maria Muster', seats: 2, status: 'confirmed' };

export default async (req, context) => {
  useSite(context);
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  const purpose = url.pathname.startsWith('/absagen') ? 'absagen' : 'abbestellen';
  if (!(await validToken(purpose, id, url.searchParams.get('t') || ''))) return invalid();
  const isTest = id === 'test';
  const reg = isTest ? SAMPLE : await getRegistration(id);
  const post = req.method === 'POST';

  if (purpose === 'absagen') {
    if (!reg || reg.status === 'cancelled') {
      return page('Bereits abgesagt', `<p>Ihre Anmeldung ist bereits storniert – Sie müssen nichts weiter tun.</p>
        <p><a class="link-arrow" href="/">Zur Anmeldeseite</a></p>${contact}`);
    }
    if (!post) {
      return page('Termin absagen?', `<p>Schade, dass Sie nicht kommen können! Mit einem Klick geben Sie Ihren Platz frei –
        so kann jemand von der Warteliste nachrücken.</p>${booking(reg)}
        <form method="post" class="termin-actions">
          <button class="button-main" type="submit">Ja, Platz freigeben</button>
          <a class="btn btn-outline" href="/">Nein, ich komme doch</a>
        </form>${contact}`);
    }
    if (!isTest) {
      const r = await cancelRegistration(id, 'link');
      // Nachgerückte bekommen sofort ihre Einladung; klappt das nicht, steht sie in /admin unter „Einladung offen“
      for (const p of r?.promoted || []) {
        try { await sendConfirmation(p); await markInvited(p.id); } catch (e) { console.error('Einladung fehlgeschlagen', e); }
      }
    }
    return page('Ihr Platz ist freigegeben', `<p>Vielen Dank, dass Sie Bescheid gegeben haben! Ihre Anmeldung ist storniert,
      Sie bekommen keine weiteren Erinnerungen.${isTest ? ' <strong>(Beispiel aus der Test-Mail – es wurde nichts geändert.)</strong>' : ''}</p>
      <p>Sie möchten trotzdem über Ihre Finanzierung sprechen? Wir nehmen uns gern Zeit für Sie.</p>
      <p class="termin-actions"><a class="btn btn-primary" href="${EVENT.contactUrl}">Persönliche Beratung buchen</a></p>${contact}`);
  }

  // Erinnerungen abbestellen (auch „Abbestellen“-Knopf im Mailprogramm: POST mit List-Unsubscribe=One-Click)
  if (!reg) return invalid();
  if (!post) {
    return page('Erinnerungen abbestellen?', `<p>Sie bekommen dann keine Erinnerungs-Mails mehr zum Infoabend.
      <strong>Ihr Platz bleibt reserviert.</strong></p>${reg.status === 'confirmed' ? booking(reg) : ''}
      <form method="post" class="termin-actions">
        <button class="button-main" type="submit">Erinnerungen abbestellen</button>
      </form>${contact}`);
  }
  if (!isTest) await stopReminders(id, 'link');
  return page('Erinnerungen abbestellt', `<p>Sie bekommen keine Erinnerungs-Mails mehr.${reg.status === 'confirmed' ? ' Ihr Platz bleibt reserviert – wir freuen uns auf Sie!' : ''}${isTest ? ' <strong>(Beispiel aus der Test-Mail – es wurde nichts geändert.)</strong>' : ''}</p>${contact}`);
};

export const config = { path: ['/absagen', '/erinnerung-abbestellen'] };
