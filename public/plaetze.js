// Angezeigte freie Plätze („Kontingent“) – eine Formel für Seite (über /api/status) und /admin.
//
// Die Seite zeigt nicht alle echten Plätze, sondern ein kleines Kontingent. Jede Anmeldung senkt die
// Anzeige um genau die gebuchten Plätze. Fällt die Anzeige auf `refillAt` oder darunter, werden
// „weitere Plätze freigegeben“ – die Anzeige springt zurück auf `batch`.
// Nie mehr als echt frei: Sind nur noch wenige echte Plätze übrig, steht dort die echte Zahl.
//
// Beispiel: 400 Plätze gesamt, Kontingent 120, Nachschub bei 30 (Seite: „… von 400 Plätzen frei“)
//   0 belegt   → Anzeige 120
//   20 belegt  → Anzeige 100         (jede Anmeldung zählt genau mit)
//   89 belegt  → Anzeige 31
//   90 belegt  → Anzeige 120         „Weitere Plätze freigegeben“
//   180 belegt → Anzeige 120         „Weitere Plätze freigegeben“
//   380 belegt → Anzeige 20          (echte Zahl)
//   397 belegt → Anzeige 3           (echte Zahl)
//
// Ergebnis: { free, released } – released = gerade erst neue Plätze freigegeben (für den Hinweis auf der Seite)
export function shownFree({ total, booked, batch, refillAt }) {
  const free = Math.max(total - booked, 0);
  const size = Number(batch) || 0;
  const refill = Math.max(Number(refillAt) || 0, 0);
  if (size <= 0 || refill >= size) return { free, released: false }; // Kontingent aus: echte Zahl
  const step = size - refill; // so viele Plätze passen in ein Kontingent, bevor Nachschub kommt
  const used = booked % step; // davon im aktuellen Kontingent schon gebucht
  const shown = size - used;
  if (shown >= free) return { free, released: false }; // Endspurt: echte Zahl
  return { free: shown, released: booked >= step && used < step / 2 };
}
