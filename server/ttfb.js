/**
 * TTFB case: server-rendered personalized page.
 */
import * as db from './db.js';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function renderHead({ caseId, title }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/shared/styles.css">
  <script src="/shared/vitals.js" defer></script>
</head>
<body data-case="${caseId}">
  <header class="site-header"><a href="/">← Web Vitals case</a><span>TTFB</span></header>
  <main class="container">
`;
}

function renderContent({ user, products, recommendations }) {
  const card = (p) => `<li class="row"><span>${escapeHtml(p.name)}</span><b>$${p.price}</b></li>`;
  return `
    <h1>Welcome back, ${escapeHtml(user.name)}</h1>
    <h2>Catalogue</h2>
    <ul class="rows">${products.map(card).join('')}</ul>
    <h2>Recommended for you</h2>
    <ul class="rows">${recommendations.map(card).join('')}</ul>
    <p class="muted">Rendered at ${new Date().toISOString()}</p>
`;
}

const renderFoot = () => `  </main>
</body>
</html>
`;

export async function renderTtfbBroken(req, res) {
  const user = await db.getUser();
  const products = await db.getProducts();
  const recommendations = await db.getRecommendations(user.id);

  const html =
    renderHead({ caseId: 'ttfb', title: 'TTFB — broken' }) +
    renderContent({ user, products, recommendations }) +
    renderFoot();

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
}
