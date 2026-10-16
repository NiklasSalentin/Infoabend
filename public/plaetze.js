// Angezeigte freie Plätze („knappe“ Anzeige) – eine Formel für Seite (über /api/status) und /admin.
//
// Die Seite zeigt weniger freie Plätze als wirklich frei sind. Je voller der Abend, desto näher kommt
// die Anzeige an die echte Zahl; ab `realFrom` freien Plätzen steht dort genau die echte Zahl.
//
// Beispiel: 200 Plätze gesamt, Anzeige beginnt bei 60, echte Zahl ab 10 freien Plätzen
//   0 belegt   → echt 200 frei → Anzeige 60
//   1 belegt   → echt 199 frei → Anzeige 59
//   100 belegt → echt 100 frei → Anzeige 33
//   190 belegt → echt  10 frei → Anzeige 10   (ab hier immer die echte Zahl)
//   197 belegt → echt   3 frei → Anzeige 3
//
// Die Anzeige ist nie größer als die echte Zahl und nie 0, solange noch ein Platz frei ist.
export function shownFree({ total, free, displayStart, realFrom }) {
  const start = Number(displayStart) || 0;
  const real = Math.max(Number(realFrom) || 0, 0);
  // Anzeige aus (0, nicht kleiner als gesamt oder nicht größer als realFrom) bzw. Endspurt: echte Zahl
  if (start <= real || start >= total || free <= real) return free;
  // gerade Linie von (echt = realFrom → Anzeige = realFrom) bis (echt = total → Anzeige = displayStart)
  return Math.min(free, Math.max(1, Math.floor(real + ((free - real) * (start - real)) / (total - real))));
}
