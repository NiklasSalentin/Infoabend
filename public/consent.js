// Meta-Pixel (Facebook-Werbung) – lädt NUR nach Einwilligung über den Hinweis unten auf der Seite.
// Ohne eingetragene Pixel-ID (Netlify: META_PIXEL_ID) passiert hier gar nichts – auch kein Hinweis.
(() => {
  const KEY = 'einwilligung-meta'; // 'ja' | 'nein' – gespeichert im Browser, nur damit wir nicht erneut fragen
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };
  let pixelId = null;

  // Für app.js: Ereignis melden (z. B. erfolgreiche Anmeldung) – tut nichts ohne Einwilligung
  window.metaTrack = (event) => { if (window.fbq && read() === 'ja') window.fbq('track', event); };

  function loadPixel() {
    if (window.fbq || !pixelId) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }

  function showBanner() {
    if (document.getElementById('consent')) return;
    const box = document.createElement('div');
    box.id = 'consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Einwilligung Meta-Pixel');
    box.innerHTML = `<p><strong>Dürfen wir messen, ob unsere Werbung wirkt?</strong>
      Mit Ihrer Einwilligung nutzen wir das Meta-Pixel (Facebook/Instagram). Dabei werden Cookies gesetzt und Daten an Meta übermittelt –
      auch in die USA. Sie können die Einwilligung jederzeit unten über „Cookie-Einstellungen“ widerrufen.
      <a href="/datenschutz#meta" target="_blank" rel="noopener">Mehr dazu</a></p>
      <div class="consent-buttons"><button type="button" data-c="nein">Ablehnen</button><button type="button" data-c="ja">Erlauben</button></div>`;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-c]');
      if (!b) return;
      const before = read();
      save(b.dataset.c);
      box.remove();
      if (b.dataset.c === 'ja') loadPixel();
      else if (before === 'ja') {
        // Widerruf: Meta-Cookies löschen und Seite neu laden, damit das Pixel nicht mehr läuft
        for (const c of ['_fbp', '_fbc']) document.cookie = `${c}=; Max-Age=0; path=/; domain=.${location.hostname.split('.').slice(-2).join('.')}`, document.cookie = `${c}=; Max-Age=0; path=/`;
        location.reload();
      }
    });
    document.body.append(box);
  }

  // „Cookie-Einstellungen“ im Fuß: Hinweis erneut zeigen
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-consent-settings]')) { e.preventDefault(); if (pixelId) showBanner(); else alert('Auf dieser Seite werden derzeit keine Cookies für Werbung verwendet.'); }
  });

  fetch('/api/config').then((r) => r.json()).then((c) => {
    pixelId = c.metaPixelId;
    if (!pixelId) return;
    const choice = read();
    if (choice === 'ja') loadPixel();
    else if (choice !== 'nein') showBanner();
  }).catch(() => {});
})();
