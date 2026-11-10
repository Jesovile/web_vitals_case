/**
 * Measures Core Web Vitals with Google's `web-vitals` library (attribution build) and
 *  1) shows them live in an overlay panel,
 *  2) sends final values to the backend (`POST /api/vitals`) – a minimal RUM setup.
 *
 * Include on every page with: <script src="/shared/vitals.js" defer></script>
 */
(function () {
  var WEB_VITALS_URL = 'https://unpkg.com/web-vitals@4.2.4/dist/web-vitals.attribution.iife.js';
  var METRICS = ['TTFB', 'FCP', 'LCP', 'CLS', 'INP'];
  var page = document.body.dataset.case || location.pathname;
  var latest = {};

  // ---------- overlay ----------
  var panel = document.createElement('aside');
  panel.className = 'wv-panel';
  panel.innerHTML =
    '<div class="wv-title"><span>web-vitals · ' + page + '</span><span>live</span></div>' +
    METRICS.map(function (name) {
      return (
        '<div class="wv-row" id="wv-' + name + '">' +
        '<div class="wv-head"><span>' + name + '</span><span class="wv-value">—</span></div>' +
        '<div class="wv-detail">waiting…</div></div>'
      );
    }).join('');
  document.body.appendChild(panel);

  function format(metric) {
    return metric.name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value) + ' ms';
  }

  function ms(v) {
    return Math.round(v || 0) + 'ms';
  }

  // Human-readable "why" for each metric, from the attribution build.
  function describe(metric) {
    var a = metric.attribution || {};
    switch (metric.name) {
      case 'LCP':
        return (
          (a.element || 'n/a') +
          (a.url ? ' · ' + a.url.split('/').pop() : '') +
          ' · ttfb ' + ms(a.timeToFirstByte) +
          ' · load delay ' + ms(a.resourceLoadDelay) +
          ' · load ' + ms(a.resourceLoadDuration) +
          ' · render delay ' + ms(a.elementRenderDelay)
        );
      case 'CLS':
        return a.largestShiftTarget ? 'largest shift: ' + a.largestShiftTarget : 'no shifts';
      case 'INP':
        return (
          (a.interactionType || '') + ' on ' + (a.interactionTarget || 'n/a') +
          ' · input ' + ms(a.inputDelay) +
          ' · processing ' + ms(a.processingDuration) +
          ' · presentation ' + ms(a.presentationDelay)
        );
      case 'FCP':
        return 'ttfb ' + ms(a.timeToFirstByte) + ' · first byte → FCP ' + ms(a.firstByteToFCP);
      case 'TTFB':
        return (
          'dns ' + ms(a.dnsDuration) +
          ' · connect ' + ms(a.connectionDuration) +
          ' · request/response wait ' + ms(a.requestDuration)
        );
      default:
        return '';
    }
  }

  function render(metric) {
    var row = document.getElementById('wv-' + metric.name);
    var value = row.querySelector('.wv-value');
    var detail = row.querySelector('.wv-detail');
    var text = describe(metric);
    value.textContent = format(metric) + ' · ' + metric.rating;
    value.className = 'wv-value ' + metric.rating;
    detail.textContent = text;
    detail.title = text;
    latest[metric.name] = { name: metric.name, value: metric.value, rating: metric.rating, detail: text };
    console.log('[web-vitals]', metric.name, format(metric), metric.rating, metric.attribution);
  }

  // ---------- RUM beacon ----------
  var sent = false;
  function flush() {
    var metrics = Object.keys(latest).map(function (k) {
      return latest[k];
    });
    if (sent || !metrics.length) return;
    sent = true;
    var body = JSON.stringify({ page: page, metrics: metrics });
    // sendBeacon survives page unload, unlike fetch/XHR (fetch+keepalive is the alternative).
    if (!navigator.sendBeacon || !navigator.sendBeacon('/api/vitals', body)) {
      fetch('/api/vitals', { method: 'POST', body: body, keepalive: true });
    }
  }
  // `visibilitychange` → hidden is the last reliable moment on mobile; `unload` is not.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  // ---------- load web-vitals ----------
  var script = document.createElement('script');
  script.src = WEB_VITALS_URL;
  script.async = true;
  script.onload = function () {
    var opts = { reportAllChanges: true }; // show intermediate values (useful for demos, not for RUM)
    webVitals.onTTFB(render, opts);
    webVitals.onFCP(render, opts);
    webVitals.onLCP(render, opts);
    webVitals.onCLS(render, opts);
    webVitals.onINP(render, opts);
  };
  script.onerror = function () {
    panel.querySelector('.wv-title span:last-child').textContent = 'failed to load web-vitals (offline?)';
  };
  document.head.appendChild(script);
})();
