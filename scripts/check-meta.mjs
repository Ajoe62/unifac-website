/**
 * check:meta - every built page carries a canonical link and a usable share card.
 *
 * WHY THIS IS A BUILD GATE AND NOT A CHECKLIST ITEM.
 *
 * This site shipped for months with zero of thirteen pages carrying a
 * canonical link, an og: tag or a Twitter card. Nothing was broken. The build
 * was green, every page rendered, every link resolved. The only symptom was
 * that a link shared into a WhatsApp group came out as a bare grey URL, and
 * nobody who could fix it was in the group.
 *
 * That is the shape of every metadata bug: invisible to the person building
 * the site, visible to everyone the site is for. A test is the only place it
 * can be caught, because there is no screen you can look at to see it.
 *
 * The three failures below are the ones that actually happen:
 *
 *   MISSING     the tag was never added, or a new layout forgot it.
 *   RELATIVE    og:image is "/og-image.png" rather than a full URL. Present,
 *               looks right in the source, and silently ignored by every
 *               scraper on earth. This is the one that fools people.
 *   DUPLICATED  two pages claim the same canonical. Search engines treat that
 *               as "these are the same page", and one of them stops ranking.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';

/** Tag, how to find it, and whether its value has to be an absolute URL. */
const REQUIRED = [
  ['canonical', /<link rel="canonical" href="([^"]*)"/, true],
  ['og:title', /<meta property="og:title" content="([^"]*)"/, false],
  ['og:description', /<meta property="og:description" content="([^"]*)"/, false],
  ['og:url', /<meta property="og:url" content="([^"]*)"/, true],
  ['og:image', /<meta property="og:image" content="([^"]*)"/, true],
  ['og:site_name', /<meta property="og:site_name" content="([^"]*)"/, false],
  ['twitter:card', /<meta name="twitter:card" content="([^"]*)"/, false],
  ['twitter:image', /<meta name="twitter:image" content="([^"]*)"/, true],
];

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
 * Not every .html in dist/ is a page. Anything in public/ is copied through
 * byte for byte, and some of those files are HTML that must stay exactly as
 * issued: Google Search Console's verification file is one line long and stops
 * working the moment anything is added to it. Comparing against public/ is the
 * check that stays correct when the next such file arrives, which guessing
 * from the filename would not.
 */
const verbatim = new Set();
for (const file of await walk('public').catch(() => [])) {
  verbatim.add(path.relative('public', file).replace(/\\/g, '/'));
}
pages = pages.filter(
  (f) => !verbatim.has(path.relative(DIST, f).replace(/\\/g, '/')),
);

const problems = [];
const canonicals = new Map();
/** Images referenced by a share card, so a 404 card can be caught too. */
const socialImages = new Set();

for (const file of pages) {
  const html = await fs.readFile(file, 'utf8');
  const page = '/' + path.relative(DIST, file).replace(/\\/g, '/');

  for (const [name, pattern, absolute] of REQUIRED) {
    const match = html.match(pattern);
    if (!match) {
      problems.push(`MISSING     ${name.padEnd(16)} ${page}`);
      continue;
    }
    const value = match[1];
    if (absolute && !/^https?:\/\//.test(value)) {
      problems.push(`RELATIVE    ${name.padEnd(16)} ${page}  ->  ${value}`);
    }
    if (name === 'canonical') {
      const seen = canonicals.get(value);
      if (seen) problems.push(`DUPLICATED  canonical        ${page}  same as  ${seen}`);
      else canonicals.set(value, page);
    }
    if (name === 'og:image' && /^https?:\/\//.test(value)) {
      socialImages.add(new URL(value).pathname);
    }
  }
}

/*
 * A share card pointing at a file that is not in the build is worse than no
 * card: the scraper caches the miss, and re-sharing the link later still shows
 * nothing. brand:init writes public/og-image.png, so this is really a check
 * that somebody ran it.
 */
for (const image of socialImages) {
  try {
    await fs.access(path.join(DIST, image));
  } catch {
    problems.push(
      `NOT BUILT   og:image         ${image} is referenced but not in ${DIST}/. ` +
        `Run: npm run brand:init -- --logo brand/<logo>`,
    );
  }
}

if (problems.length) {
  console.error(`\n  Metadata problems in ${problems.length} place(s):\n`);
  for (const p of problems) console.error(`    ${p}`);
  console.error(
    '\n  These are invisible in a browser and visible in every share.\n',
  );
  process.exit(1);
}

console.log(
  `\n  All ${pages.length} pages carry a canonical link and a complete share card.\n`,
);
