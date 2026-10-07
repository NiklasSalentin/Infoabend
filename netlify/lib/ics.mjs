import { EVENT, siteUrl } from './event.mjs';

const esc = (s) => s.replace(/[\\;,]/g, (c) => '\\' + c);

export function icsFile() {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Baufinanz Dueren//Infoabend//DE',
    'BEGIN:VEVENT',
    'UID:infoabend-2026-12-09@baufinanz-dueren.de',
    'DTSTAMP:20261001T000000Z',
    `DTSTART:${EVENT.startUtc}`,
    `DTEND:${EVENT.endUtc}`,
    `SUMMARY:${esc('Infoabend: ' + EVENT.title)}`,
    `LOCATION:${esc(EVENT.venue + ', ' + EVENT.address)}`,
    `DESCRIPTION:${esc(`Einlass ${EVENT.admission}, Beginn ${EVENT.start}. Infos: ${siteUrl()}`)}`,
    `URL:${siteUrl()}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Morgen: Infoabend Baufinanz Düren',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl() {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Infoabend: ' + EVENT.title,
    dates: `${EVENT.startUtc}/${EVENT.endUtc}`,
    location: `${EVENT.venue}, ${EVENT.address}`,
    details: `Einlass ${EVENT.admission}, Beginn ${EVENT.start}. Infos: ${siteUrl()}`,
  });
  return 'https://calendar.google.com/calendar/render?' + p;
}
