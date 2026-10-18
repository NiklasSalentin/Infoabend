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
  // Erinnerungs-Mails – nur an Gäste mit Häkchen „Ja, erinnern Sie mich …“ (netlify/lib/reminders.mjs).
  // Versand ab sendUtc (UTC; im Dezember deutsche Zeit minus 1 Stunde: 10:00 Uhr → 09:00Z).
  reminders: [
    { key: 'week', sendUtc: '2026-12-02T09:00:00Z', label: 'eine Woche vorher (Mi, 2.12., ab 10 Uhr)' },
    { key: 'day', sendUtc: '2026-12-08T09:00:00Z', label: 'am Vortag (Di, 8.12., ab 10 Uhr)' },
  ],
  venue: 'Festhalle Birkesdorf',
  address: 'An der Festhalle 3, 52353 Düren-Birkesdorf',
  organizer: 'Baufinanz Düren GmbH & Co. KG',
  contactUrl: 'https://baufinanz-dueren.de/kontakt/',
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
