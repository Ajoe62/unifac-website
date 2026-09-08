#!/usr/bin/env node
/**
 * Every internal link points at a page this build actually emitted.
 *
 * WHY THIS EXISTS. Feature flags remove a page's nav entry, its footer link
 * and its route together, which covers the links the system generates. It
 * cannot cover a link somebody wrote inside a sentence. Building a second
 * school from this template with `portal: false` produced a clean site with
 * two dead links buried in prose: "lesson summaries carry that work home
 * through the Portal" on the academics page, and "see the portal page" in the
 * privacy policy. Nothing warned about either.
 *
 * That is the shape of the failure this template is most likely to ship: not a
 * broken build, a broken sentence. So the build is not finished until every
 * href in the output resolves.
 *
 * Run after `astro build`, against dist/.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = process.argv[2] || 'dist';

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = await walk(DIST);
} catch {
  console.error(`\n  No ${DIST}/ to check. Run the build first.\n`);
  process.exit(1);
}

const emitted = new Set(files.map((f) => path.relative(DIST, f).split(path.sep).join('/')));

/** Does "/about" or "/about#directions" resolve to something in the build? */
function resolves(href) {
  const clean = href.split('#')[0].split('?')[0].replace(/^\//, '');
  if (clean === '') return true;
  return (
    emitted.has(clean) ||
    emitted.has(`${clean}/index.html`) ||
    emitted.has(`${clean.replace(/\/$/, '')}/index.html`) ||
    emitted.has(`${clean}.html`)
  );
}

const broken = [];
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = await fs.readFile(file, 'utf8');
  const from = path.relative(DIST, file).split(path.sep).join('/');
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    // Protocol-relative URLs are external despite starting with a slash.
    if (href.startsWith('//')) continue;
    if (!resolves(href)) {
      const near = html.slice(Math.max(0, html.indexOf(`href="${href}"`)), html.indexOf(`href="${href}"`) + 160);
      const text = (near.match(/>([^<]{1,60})</) || [, ''])[1].trim();
      broken.push({ from, href, text });
    }
  }
}

if (broken.length === 0) {
  console.log(`\n  All internal links in ${DIST}/ resolve.\n`);
  process.exit(0);
}

console.error(`\n  ${broken.length} dead internal link(s):\n`);
const byHref = new Map();
for (const b of broken) {
  if (!byHref.has(b.href)) byHref.set(b.href, []);
  byHref.get(b.href).push(b);
}
for (const [href, hits] of byHref) {
  console.error(`    ${href}`);
  for (const h of hits) console.error(`      ${h.from}${h.text ? `   "${h.text}"` : ''}`);
}
console.error(`
  If the target is behind a feature flag that is off, the sentence linking to
  it needs rewriting too. A generated nav entry disappears on its own; a link
  somebody wrote inside a paragraph does not.
`);
process.exit(1);
