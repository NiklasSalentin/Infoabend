import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { EVENT, siteUrl } from './event.mjs';

const BLUE = rgb(0.16, 0.22, 0.6);
const GOLD = rgb(0.75, 0.6, 0.25);
const GREY = rgb(0.3, 0.3, 0.3);

async function image(pdf, file) {
  try {
    const res = await fetch(`${siteUrl()}/assets/${file}`);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return file.endsWith('.png') ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

// Zeilenumbruch nach Breite
function wrap(text, font, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function invitationPdf(reg) {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Einladung Infoabend – Baufinanz Düren');
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, M = 56, TW = W - 2 * M;
  let y = 841.89 - M;

  const text = (t, { f = font, size = 11, color = GREY, gap = 2 } = {}) => {
    for (const l of wrap(t, f, size, TW)) {
      y -= size;
      page.drawText(l, { x: M, y, size, font: f, color });
      y -= size * 0.4;
    }
    y -= gap;
  };

  const logo = await image(pdf, 'logo-baufinanz.png');
  if (logo) {
    const s = logo.scaleToFit(170, 64);
    page.drawImage(logo, { x: M, y: y - s.height, ...s });
  }
  const badge = await image(pdf, 'kundenliebling-2026.png');
  if (badge) {
    const s = badge.scaleToFit(60, 100);
    page.drawImage(badge, { x: W - M - s.width, y: y - s.height, ...s });
  }
  y -= 115;

  text('PERSÖNLICHE EINLADUNG', { f: bold, size: 10, color: GOLD, gap: 10 });
  text(EVENT.title, { f: bold, size: 22, color: BLUE, gap: 6 });
  text(EVENT.subtitle, { size: 12, gap: 18 });

  // Ticket-Kasten
  const boxTop = y;
  y -= 14;
  const inner = (label, value) => {
    y -= 12;
    page.drawText(label, { x: M + 16, y, size: 10, font, color: GREY });
    page.drawText(value, { x: M + 150, y, size: 11, font: bold, color: BLUE });
    y -= 8;
  };
  inner('Gast', reg.name);
  inner('Plätze', String(reg.seats));
  if (reg.companions?.length) inner('Begleitung', reg.companions.join(', '));
  inner('Datum', EVENT.dateLabel);
  inner('Einlass / Beginn', `${EVENT.admission} / ${EVENT.start}`);
  inner('Ort', EVENT.venue);
  inner('Adresse', EVENT.address);
  inner('Ticket-Code', reg.ticket_code);
  y -= 10;
  page.drawRectangle({ x: M, y, width: TW, height: boxTop - y, borderColor: GOLD, borderWidth: 1.5 });
  y -= 24;

  text('Ankommen & Parken', { f: bold, size: 13, color: BLUE });
  text('Kommen Sie an und nehmen Sie bei freier Platzwahl Platz, bevor es um 18:30 Uhr losgeht. Direkt an der Festhalle stehen ausreichend kostenlose Parkplätze zur Verfügung.', { gap: 12 });

  text('Teil 1 – Ihre Finanzierung', { f: bold, size: 13, color: BLUE });
  text('Als unabhängiger Baufinanzierer erkläre ich Ihnen die entscheidenden Bausteine auf dem Weg zum Eigenheim: Wie Sie im Gespräch mit Maklern überzeugend auftreten und sich gegen andere Interessenten durchsetzen – und wie Sie Ihre Finanzierung von Anfang an richtig aufstellen, von der vollständigen Unterlagenliste bis zum Annuitätendarlehen. Praxisnah, verständlich, ohne Fachchinesisch.', { gap: 12 });

  text('Teil 2 – Der Notartermin', { f: bold, size: 13, color: BLUE });
  text('Zum Abschluss des Abends übernimmt ein erfahrener Notar das Wort und nimmt Sie mit auf die letzte Etappe: Was passiert beim Notartermin wirklich, welche Unterlagen brauchen Sie, und worauf sollten Sie beim Vertrag besonders achten? So gehen Sie bestens vorbereitet in diesen entscheidenden Termin.', { gap: 12 });

  text('Die Teilnahme am Infoabend ist kostenlos. Bitte bringen Sie diese Einladung ausgedruckt oder auf dem Smartphone mit.', { gap: 12 });
  text(`Alle Infos: ${siteUrl()}   ·   Persönliche Beratung: ${EVENT.contactUrl}`, { size: 9 });

  page.drawRectangle({ x: 0, y: 0, width: W, height: 8, color: BLUE });
  return pdf.save();
}
