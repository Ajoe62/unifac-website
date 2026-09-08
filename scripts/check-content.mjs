/**
 * check:content - the template's placeholder copy cannot reach production.
 *
 * WHY THIS EXISTS.
 *
 * A template has to ship prose, or its pages are empty boxes and nobody can
 * see what goes where. That prose is the most dangerous thing in the repo. It
 * is written to look like a finished school website, and the failure mode is
 * not that somebody notices it and leaves it in: it is that nobody notices at
 * all, because plausible copy on a well designed page reads as done.
 *
 * The first school built from this template inherited seventy-eight mentions
 * of the previous school across fourteen files. Every one was found by
 * grepping, on purpose, because somebody thought to look. That is not a
 * process, it is luck, and it does not survive the fifth site.
 *
 * So the placeholders say TODO out loud, in the visible text, and this gate
 * fails the build while any of them survive. A half-finished site is then
 * something you cannot deploy rather than something you might not spot.
 *
 * WHY IT SKIPS IN THE TEMPLATE ITSELF. The template is supposed to be full of
 * TODOs; that is its job. It reports and passes when templateRole is
 * "template", exactly as check:system does, and enforces in a client repo,
 * which is what `npm run new-site` flips a copy into.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const MARKER = 'TODO';

const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
const role = pkg.templateRole ?? 'template';

if (role === 'template') {
  console.log(
    `\n  templateRole is "template": placeholder copy is expected here, not checked.\n`,
  );
  process.exit(0);
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let pages;
try {
  pages = await walk(DIST);
} catch {
  console.error(`\n  No ${DIST}/ to check. Run the build first.\n`);
  process.exit(1);
}

/*
 * Checked against the BUILT html rather than against src/. A TODO in a code
 * comment is a note to a developer and nobody's problem; the same word in a
 * rendered paragraph is a parent reading placeholder text. Only one of those
 * should stop a deploy, and building first is what tells them apart.
 */
const found = [];
for (const file of pages) {
  const html = await fs.readFile(file, 'utf8');
  const page = '/' + path.relative(DIST, file).replace(/\\/g, '/');
  const hits = html.split(MARKER).length - 1;
  if (!hits) continue;

  // The first line of context, so the report says WHICH sentence is unwritten
  // rather than only how many are.
  const sample = html
    .slice(Math.max(0, html.indexOf(MARKER) - 40), html.indexOf(MARKER) + 90)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  found.push({ page, hits, sample });
}

if (found.length) {
  const total = found.reduce((n, f) => n + f.hits, 0);
  console.error(
    `\n  ${total} piece(s) of placeholder copy still in the build, across ${found.length} page(s):\n`,
  );
  for (const f of found.sort((a, b) => b.hits - a.hits)) {
    console.error(`    ${String(f.hits).padStart(3)}  ${f.page}`);
    console.error(`         ...${f.sample}...`);
  }
  console.error(
    '\n  Each one is a sentence somebody still has to write. Sources: ' +
      'src/config/site.ts, src/content/*, src/pages/*.\n',
  );
  process.exit(1);
}

console.log(`\n  No placeholder copy left in ${pages.length} built pages.\n`);
