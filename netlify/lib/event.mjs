// Zentrale Veranstaltungsdaten (Quelle: Inhalts-Checkliste Landingpage, final)
export const EVENT = {
  title: 'Wie kaufe ich eigentlich eine Immobilie?',
  subtitle: 'Vom ersten Kontakt mit dem Makler bis zum Notartermin – der große Infoabend rund um Ihre Finanzierung',
  dateLabel: 'Mittwoch, 9. Dezember 2026',
  admission: '18:00 Uhr',
  start: '18:30 Uhr',
  // Kalenderzeiten (Europe/Berlin, Winterzeit = UTC+1)
  startUtc: '20261209T170000Z',
  endUtc: '20261209T200000Z',
  venue: 'Festhalle Birkesdorf',
  address: 'An der Festhalle 3, 52353 Düren-Birkesdorf',
  organizer: 'Baufinanz Düren GmbH & Co. KG',
  contactUrl: 'https://baufinanz-dueren.de/kontakt/',
  privacyUrl: 'https://baufinanz-dueren.de/datenschutz/',
  imprintUrl: 'https://baufinanz-dueren.de/impressum/',
  notifyEmail: 'infoabend@baufinanz-dueren.de',
};

// Basis-URL für Links in Mails/PDF: SITE_URL (falls gesetzt), sonst die primäre
// Adresse des Netlify-Projekts (eigene Domain, solange keine da ist: *.netlify.app)
let projectUrl = '';
export function useSite(context) {
  if (context?.site?.url) projectUrl = context.site.url;
}
export const siteUrl = () =>
  (process.env.SITE_URL || projectUrl || 'https://anmeldung.baufinanz-dueren.de').replace(/\/$/, '');
