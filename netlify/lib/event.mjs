// Zentrale Veranstaltungsdaten (Quelle: Inhalts-Checkliste Landingpage, final)
export const EVENT = {
  title: 'Wie können wir uns heute noch ein Eigenheim leisten?',
  subtitle: 'Vom ersten Kontakt mit dem Makler bis zum Notartermin – der große Infoabend rund um Ihre Finanzierung',
  dateLabel: 'Mittwoch, 9. Dezember 2026',
  admission: '18:00 Uhr',
  start: '18:30 Uhr',
  // Kalenderzeiten (Europe/Berlin, Winterzeit = UTC+1)
  startUtc: '20261209T170000Z',
  endUtc: '20261209T200000Z',
  // Erinnerungs-Mails an alle bestätigten Gäste (netlify/lib/reminders.mjs) – kein Newsletter, nie Werbung.
  // Versand ab sendUtc (UTC; im Winter deutsche Zeit minus 1 Stunde: 10:00 Uhr → 09:00Z).
  // extra: kleiner Kasten „Zusatzinfo“ in dieser Mail – leer lassen ('') = kein Kasten. Beispiel:
  //   extra: { title: 'Ihre Fragen', text: 'Sie haben eine Frage? Antworten Sie auf diese Mail – wir greifen sie am Abend auf.' }
  // Freigabe der Gäste-Mails, die noch abgestimmt werden: 'entwurf' = wird NICHT verschickt (nur Vorschau in /admin),
  // 'freigegeben' = geht raus. Erst umstellen, wenn Niklas/Alex den Text abgesegnet haben.
  // aenderung = Mail „Ihre Anmeldung wurde aktualisiert“ nach „Plätze ändern“ in /admin.
  mailStatus: { erinnerungen: 'entwurf', kalender: 'entwurf', aenderung: 'freigegeben' }, // aenderung freigegeben von Niklas am 30.10.
  reminders: [
    { key: 'twoweeks', sendUtc: '2026-11-25T09:00:00Z', label: 'zwei Wochen vorher (Mi, 25.11., ab 10 Uhr)', extra: '' },
    { key: 'week', sendUtc: '2026-12-02T09:00:00Z', label: 'eine Woche vorher (Mi, 2.12., ab 10 Uhr)', extra: '' },
    { key: 'day', sendUtc: '2026-12-08T09:00:00Z', label: 'am Vortag (Di, 8.12., ab 10 Uhr)' },
  ],
  venue: 'Festhalle Birkesdorf',
  address: 'An der Festhalle 3, 52353 Düren-Birkesdorf',
  organizer: 'Baufinanz Düren GmbH & Co. KG',
  contactUrl: 'https://kontakt.baufinanz-dueren.de/',
  privacyUrl: 'https://anmeldung.baufinanz-dueren.de/datenschutz',
  imprintUrl: 'https://baufinanz-dueren.de/impressum/',
  notifyEmail: 'info@baufinanz-dueren.de',
  phone: '0172 60 75 100',
  officeAddress: 'Bahnhofstraße 100 · 52382 Niederzier',
  mapsGoogle: 'https://www.google.com/maps/dir/?api=1&destination=Festhalle+Birkesdorf%2C+An+der+Festhalle+3%2C+52353+D%C3%BCren',
  mapsApple: 'https://maps.apple.com/?daddr=An+der+Festhalle+3%2C+52353+D%C3%BCren&q=Festhalle+Birkesdorf',
};

// Basis-URL für Links in Mails: SITE_URL (falls gesetzt), sonst die primäre
// Adresse des Netlify-Projekts (eigene Domain, solange keine da ist: *.netlify.app)
let projectUrl = '';
export function useSite(context) {
  if (context?.site?.url) projectUrl = context.site.url;
}
export const siteUrl = () =>
  (process.env.SITE_URL || projectUrl || 'https://anmeldung.baufinanz-dueren.de').replace(/\/$/, '');
