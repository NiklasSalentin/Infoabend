// Farbe der Browser-Leiste oben (Safari/Chrome am Handy): blau nur, solange der blaue Kopfbereich oben
// zu sehen ist – bei den weißen Abschnitten weiß. Am Computer bleibt die Leiste immer neutral (weiß).
(() => {
  const top = document.querySelector('[data-topbar]');
  const meta = document.getElementById('theme-mobile');
  if (!top || !meta || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => {
    document.documentElement.classList.toggle('top-blue', e.isIntersecting);
    meta.content = e.isIntersecting ? '#323D8D' : '#ffffff';
  }, { rootMargin: '0px 0px -98% 0px' }).observe(top);
})();
