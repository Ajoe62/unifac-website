/**
 * The page you open before trusting any of this.
 *
 * A terminal swatch tells you a colour exists. It does not tell you whether
 * the eyebrow disappears against the page, whether the gold button looks
 * cheap, or whether the footer went muddy. Those are visual judgements and
 * they need the actual components at actual size, which is what this renders.
 */

import { hex, contrast } from './color.mjs';

export function renderPreview({ tokens, report, clusters, preset, presetName, notes }) {
  const t = (k) => hex(tokens[k]);
  const swatch = (k) => `
    <div class="sw">
      <div class="chip" style="background:${t(k)}"></div>
      <code>--${k}</code><span>${t(k)}</span>
    </div>`;

  const rows = report
    .map(
      (r) => `
      <tr class="${r.failed ? 'fail' : r.nudged ? 'fixed' : ''}">
        <td>${r.label}</td>
        <td><span class="dot" style="background:${r.fg}"></span>${r.fg}</td>
        <td><span class="dot" style="background:${r.bg}"></span>${r.bg}</td>
        <td class="num">${r.after.toFixed(2)}:1</td>
        <td class="num">${r.target}</td>
        <td>${r.failed ? 'FAILED' : r.nudged ? `fixed (${r.nudged})` : 'ok'}</td>
      </tr>`,
    )
    .join('');

  const found = clusters
    .slice(0, 8)
    .map(
      (c) =>
        `<div class="sw"><div class="chip" style="background:${hex(c.rgb)}"></div><code>${hex(c.rgb)}</code><span>${(c.share * 100).toFixed(1)}%</span></div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brand preview - ${presetName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${preset.fonts.google}&display=swap" rel="stylesheet">
<style>
:root{
${Object.entries(tokens).map(([k, v]) => `  --${k}: ${hex(v)};`).join('\n')}
${Object.entries(preset.shape).map(([k, v]) => `  --${k}: ${v};`).join('\n')}
  --font-display: ${preset.fonts.display};
  --font-body: ${preset.fonts.body};
}
*{box-sizing:border-box}
body{margin:0;font-family:var(--font-body);background:var(--surface);color:var(--ink);line-height:1.6}
.wrap{width:min(1100px,92vw);margin-inline:auto;padding:2.5rem 0}
h1,h2,h3{font-family:var(--font-display);margin:0;line-height:1.15}
h1{font-size:2.4rem}
h2{font-size:1.5rem;margin:2.6rem 0 1rem}
.meta{color:var(--muted);margin:.5rem 0 0}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.9rem}
.sw{background:#fff;border:1px solid rgb(0 0 0 /.08);border-radius:var(--radius-card);padding:.7rem;display:grid;gap:.3rem}
.chip{height:56px;border-radius:calc(var(--radius-card) - 4px);border:1px solid rgb(0 0 0 /.08)}
.sw code{font-size:.78rem}
.sw span{font-size:.75rem;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:.88rem;background:#fff;border-radius:var(--radius-card);overflow:hidden}
th,td{text-align:left;padding:.55rem .7rem;border-bottom:1px solid rgb(0 0 0 /.07)}
th{background:var(--surface-2);font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}
td.num{text-align:right;font-variant-numeric:tabular-nums}
tr.fixed{background:rgb(255 200 0 /.10)}
tr.fail{background:rgb(220 0 0 /.10);font-weight:700}
.dot{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:.45rem;vertical-align:-1px;border:1px solid rgb(0 0 0 /.15)}
.note{background:var(--surface-2);border-left:4px solid var(--accent);padding:.8rem 1rem;border-radius:var(--radius-sm);margin:.6rem 0}

/* the components, at the size they actually appear */
.demo{margin-top:1rem;border-radius:var(--radius-lg);overflow:hidden;border:1px solid rgb(0 0 0 /.08)}
.d-hero{background:linear-gradient(160deg,var(--brand),var(--brand-900));color:var(--on-brand);padding:3rem 2rem}
.d-hero .eyebrow{color:var(--accent-300)}
.d-hero h3{color:var(--on-brand-strong);font-size:2rem;margin:.4rem 0 .6rem}
.d-hero p{color:var(--on-brand-3);max-width:46ch;margin:0 0 1.4rem}
.eyebrow{font-weight:700;letter-spacing:.18em;text-transform:uppercase;font-size:.72rem;color:var(--accent);margin:0}
.btn{display:inline-flex;align-items:center;gap:.5rem;font-weight:800;font-size:.95rem;padding:.9rem 1.7rem;border-radius:var(--radius-pill);border:var(--border-weight-btn) solid transparent;text-decoration:none}
.btn-gold{background:linear-gradient(180deg,var(--accent-300),var(--accent));color:var(--on-accent)}
.btn-ghost{border-color:rgb(255 255 255 /.55);color:#fff}
.btn-brand{background:var(--brand);color:var(--on-brand-strong)}
.d-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;padding:2rem;background:var(--surface-2)}
.card{background:#fff;border:var(--border-weight) solid rgb(0 0 0 /.08);border-radius:var(--radius-card);padding:1.6rem}
.card .ic{width:52px;height:52px;border-radius:var(--radius-ic);background:rgb(0 0 0 /.06);margin-bottom:1rem}
.card h3{font-size:1.2rem}
.card p{color:var(--muted);font-size:.95rem;margin:.4rem 0 0}
.d-band{background:linear-gradient(120deg,var(--feature),var(--feature-900));color:var(--on-feature);text-align:center;padding:3rem 2rem}
.d-band h3{color:#fff;font-size:1.7rem;margin-bottom:.6rem}
.d-band p{color:var(--on-feature-2);max-width:50ch;margin:0 auto 1.4rem}
.d-foot{background:var(--brand-900);color:var(--on-brand-4);padding:2rem}
.d-foot h4{color:var(--accent-300);text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;margin:0 0 .6rem;font-family:var(--font-body)}
.d-foot small{color:var(--on-brand-6);display:block;margin-top:1rem}
@media(max-width:760px){.d-cards{grid-template-columns:1fr}}
</style></head><body>
<div class="wrap">
  <h1>Brand preview</h1>
  <p class="meta">Preset <strong>${presetName}</strong> &middot; ${preset.description}</p>
  ${notes.map((n) => `<div class="note">${n}</div>`).join('')}

  <h2>Found in the logo</h2>
  <div class="swatches">${found}</div>

  <h2>Assigned roles</h2>
  <div class="swatches">${['brand', 'brand-900', 'accent', 'accent-300', 'accent-deep', 'feature', 'feature-900', 'surface', 'surface-2', 'ink', 'muted'].map(swatch).join('')}</div>

  <h2>Text ramp on dark grounds</h2>
  <div class="swatches">${['on-brand-strong', 'on-brand', 'on-brand-2', 'on-brand-3', 'on-brand-4', 'on-brand-5', 'on-brand-6', 'on-accent'].map(swatch).join('')}</div>

  <h2>Contrast audit</h2>
  <table>
    <tr><th>Pair</th><th>Foreground</th><th>Ground</th><th>Ratio</th><th>Needs</th><th>Result</th></tr>
    ${rows}
  </table>

  <h2>How it actually looks</h2>
  <div class="demo">
    <div class="d-hero">
      <p class="eyebrow">Admissions Open</p>
      <h3>Where character takes root and excellence grows.</h3>
      <p>Small classes, high standards, and teachers who know every child by name.</p>
      <a class="btn btn-gold" href="#">Begin an Application</a>
      <a class="btn btn-ghost" href="#">Discover the School</a>
    </div>
    <div class="d-cards">
      <div class="card"><div class="ic"></div><h3>Excellence</h3><p>High academic standards, and the habits that make them last.</p></div>
      <div class="card"><div class="ic"></div><h3>Character</h3><p>Honesty, kindness and courage, carried into everything they do.</p></div>
      <div class="card"><div class="ic"></div><h3>Growth</h3><p>Room to rise, each child rooted deep and reaching high.</p></div>
    </div>
    <div class="d-band">
      <p class="eyebrow" style="color:var(--accent-300)">Admissions Open</p>
      <h3>Come and see where your child will grow.</h3>
      <p>Arrange a visit, meet our teachers, and feel the difference in person.</p>
      <a class="btn btn-gold" href="#">Start an Enquiry</a>
    </div>
    <div class="d-foot">
      <h4>Visit &amp; Contact</h4>
      <div>The school office, weekdays 8am to 4pm</div>
      <small>&copy; 2026 The School &middot; privacy</small>
    </div>
  </div>
</div>
</body></html>`;
}
