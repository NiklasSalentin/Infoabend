// Werbe-Messung (Google Ads, Meta-Pixel) – lädt NUR nach Einwilligung über den Hinweis unten auf der Seite.
// Google Ads: Google-Tag mit Consent Mode v2 erst nach „Erlauben“; Conversion „Anmeldung Infoabend“ nach
// erfolgreicher Anmeldung (app.js ruft window.adsConversion auf). Meta-Pixel nur, wenn META_PIXEL_ID gesetzt ist.
(() => {
  const KEY = 'einwilligung-werbung'; // 'ja' | 'nein' – gespeichert im Browser, nur damit wir nicht erneut fragen
  const read = () => { try { return localStorage.getItem(KEY) ?? localStorage.getItem('einwilligung-meta'); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); localStorage.removeItem('einwilligung-meta'); } catch {} };
  let cfg = {};
  const anyTool = () => cfg.metaPixelId || cfg.googleAdsId;

  // Für app.js – tun nichts ohne Einwilligung
  // Beispiel: metaTrack('Lead', { content_name: 'Infoabend 09.12.2026' })
  window.metaTrack = (event, params) => { if (window.fbq && read() === 'ja') window.fbq('track', event, params); };
  window.adsConversion = () => {
    if (window.gtag && read() === 'ja' && cfg.googleAdsId && cfg.googleAdsLabel) {
      window.gtag('event', 'conversion', { send_to: `${cfg.googleAdsId}/${cfg.googleAdsLabel}` });
    }
  };

  function loadGoogleAds() {
    if (window.gtag || !cfg.googleAdsId) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // Consent Mode v2: Einwilligung liegt vor (Tag wird ohne Einwilligung gar nicht geladen)
    window.gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', cfg.googleAdsId);
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.googleAdsId}`;
    document.head.append(s);
  }

  function loadPixel() {
    if (window.fbq || !cfg.metaPixelId) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', cfg.metaPixelId);
    window.fbq('track', 'PageView');
  }

  const loadAll = () => { loadGoogleAds(); loadPixel(); };

  function showBanner() {
    if (document.getElementById('consent')) return;
    const names = [cfg.googleAdsId && 'Google Ads', cfg.metaPixelId && 'das Meta-Pixel (Facebook/Instagram)'].filter(Boolean).join(' und ');
    const firms = [cfg.googleAdsId && 'Google', cfg.metaPixelId && 'Meta'].filter(Boolean).join(' bzw. ');
    const box = document.createElement('div');
    box.id = 'consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Einwilligung Werbe-Messung');
    box.innerHTML = `<p><strong>Dürfen wir messen, ob unsere Werbung wirkt?</strong>
      Mit Ihrer Einwilligung nutzen wir ${names}. Dabei werden Cookies gesetzt und Daten an ${firms} übermittelt –
      auch in die USA. Sie können die Einwilligung jederzeit unten über „Cookie-Einstellungen“ widerrufen.
      <a href="/datenschutz#werbung" target="_blank" rel="noopener">Mehr dazu</a></p>
      <div class="consent-buttons"><button type="button" data-c="nein">Ablehnen</button><button type="button" data-c="ja">Erlauben</button></div>`;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-c]');
      if (!b) return;
      const before = read();
      save(b.dataset.c);
      box.remove();
      if (b.dataset.c === 'ja') loadAll();
      else if (before === 'ja') {
        // Widerruf: Werbe-Cookies löschen und Seite neu laden, damit nichts mehr läuft
        const domain = location.hostname.split('.').slice(-2).join('.');
        for (const c of ['_fbp', '_fbc', '_gcl_au', '_gcl_aw', '_gcl_dc', '_gcl_gb', '_gcl_gs']) {
          document.cookie = `${c}=; Max-Age=0; path=/; domain=.${domain}`;
          document.cookie = `${c}=; Max-Age=0; path=/`;
        }
        location.reload();
      }
    });
    document.body.append(box);
  }

  // „Cookie-Einstellungen“ im Fuß: Hinweis erneut zeigen
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-consent-settings]')) {
      e.preventDefault();
      if (anyTool()) showBanner(); else alert('Auf dieser Seite werden derzeit keine Cookies für Werbung verwendet.');
    }
  });

  fetch('/api/config').then((r) => r.json()).then((c) => {
    cfg = c || {};
    if (!anyTool()) return;
    const choice = read();
    if (choice === 'ja') loadAll();
    else if (choice !== 'nein') showBanner();
  }).catch(() => {});
})();
