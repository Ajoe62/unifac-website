#!/usr/bin/env node
/**
 * Turns a fresh copy of this repo into a blank site for a different school.
 *
 *   git clone https://github.com/Ajoe62/school-site-template.git greenfield
 *   cd greenfield && npm i
 *   git remote rename origin template     # keeps system fixes reachable
 *   git remote add origin <the school's own repo>
 *   node scripts/new-site.mjs --name "Greenfield Academy" --short Greenfield \
 *     --descriptor "International School" --domain www.greenfield.ng \
 *     --email hello@greenfield.ng --phone "0803 111 2222:+2348031112222" \
 *     --city "Lagos" --region "Lagos State"
 *
 * WHAT IT DOES NOT DO is write the new school's prose. It cannot: nobody can
 * generate a paragraph about a school they have never visited. What it does is
 * remove the previous school's, so the next person is filling blanks rather
 * than hunting for sentences about Benin City in a file about Lagos. Leaving
 * plausible-looking inherited copy in place is how a template ships a site
 * claiming the wrong curriculum.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};

const name = flag('name');
if (!name) {
  console.error('\n  --name is required. See the header of this file for the full form.\n');
  process.exit(1);
}

const short = flag('short', name.split(' ')[0]);
const descriptor = flag('descriptor', 'School');
const domain = flag('domain', 'www.example.com');
const email = flag('email', `hello@${domain.replace(/^www\./, '')}`);
const city = flag('city', 'City');
const region = flag('region', 'Region');
const country = flag('country', 'Nigeria');
const [phoneDisplay, phoneDial] = (flag('phone', '0800 000 0000:+2348000000000')).split(':');

/* ---- identity ------------------------------------------------------------ */

const sitePath = 'src/config/site.ts';
let site = await fs.readFile(sitePath, 'utf8');

// Remember who this copy used to belong to, so the report at the end can say
// exactly where their name still appears. Building a second site from this
// template left eight mentions of the previous school scattered through prose
// that new-site cannot write, and the only reason they were found was that
// somebody went looking.
const previous = {
  name: (site.match(/^  name: '([^']*)'/m) || [, ''])[1],
  short: (site.match(/^  shortName: '([^']*)'/m) || [, ''])[1],
};

const set = (key, value, indent = '  ') => {
  // The value may sit on the line below its key, because the formatter wraps
  // the long ones. The first version of this matched same-line values only and
  // fell over on defaultDescription the first time it was ever run for real.
  const re = new RegExp(`^${indent}${key}:[\\s]*'(?:[^'\\\\]|\\\\.)*'`, 'm');
  if (!re.test(site)) throw new Error(`could not find ${key} in ${sitePath}`);
  site = site.replace(re, `${indent}${key}: '${value.replace(/'/g, "\\'")}'`);
};

set('name', name);
set('shortName', short);
set('descriptor', descriptor);
set('domain', domain);
set('email', email);
set('city', city, '    ');
set('region', region, '    ');
set('country', country, '    ');
set('defaultTitle', `${name} - ${city}`);
set('defaultDescription', `TODO: one sentence describing ${name}, for search results and link previews.`);
set('footerBlurb', `TODO: two sentences about ${name}, shown beside the crest in the footer.`);
set('street', 'TODO: street address', '    ');
set('landmark', '', '    ');
set('area', 'TODO: area', '    ');
set('district', '', '    ');
set('short', `TODO: short address, one line`, '    ');
set('mapsQuery', `${name} ${city}`, '    ');
set('officeHours', 'Monday - Friday, 8:00am - 4:00pm');
set('alt', `${name} crest`, '    ');

site = site.replace(
  /phones: \[[\s\S]*?\],/,
  `phones: [{ display: '${phoneDisplay}', dial: '${phoneDial}' }],`,
);
site = site.replace(/copyrightYear: \d{4},/, `copyrightYear: ${new Date().getFullYear()},`);
await fs.writeFile(sitePath, site, 'utf8');

/* ---- content ------------------------------------------------------------- */

/*
 * A collection is a list of a school's own facts, and inheriting six
 * facilities from a school 300km away is worse than inheriting none: an empty
 * grid is obviously unfinished, a wrong one is not.
 *
 * But that only applies to a REAL school's content. A copy made from the
 * template holds the template's own TODO placeholders, which are not facts
 * about anybody and are the most useful thing in the directory: they show the
 * shape, the frontmatter fields and the icon names. Deleting those emptied
 * every collection, which made Astro warn on every page of every fresh build
 * and left the next person with no example to copy.
 *
 * So the test is what the file claims, not where it sits. A file carrying a
 * placeholder marker is scaffolding and stays; anything else is some other
 * school's fact and goes.
 */
const collections = ['news', 'programmes', 'facilities', 'values', 'directions'];
const PLACEHOLDER = /TODO/;
let removed = 0;
let kept = 0;
for (const c of collections) {
  const dir = path.join('src/content', c);
  for (const f of await fs.readdir(dir)) {
    const file = path.join(dir, f);
    if (f === '.gitkeep') continue;
    const body = await fs.readFile(file, 'utf8');
    if (PLACEHOLDER.test(body)) {
      kept++;
    } else {
      await fs.unlink(file);
      removed++;
    }
  }
  // Only needed where everything was somebody else's and the directory is now
  // empty. Astro cannot load a collection that has no files at all.
  const left = (await fs.readdir(dir)).filter((f) => f !== '.gitkeep');
  if (left.length === 0) await fs.writeFile(path.join(dir, '.gitkeep'), '', 'utf8');
}

/* ---- what is left of the previous school -------------------------------- */

/**
 * The prose this script cannot write, and therefore cannot check for you.
 *
 * Identity and content are handled above. What is left is sentences: a
 * paragraph about a curriculum, an image alt, a meta description. Those are
 * one school writing about itself, and inheriting them silently is how a
 * template ships a site making claims about the wrong school.
 */
async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(astro|ts|md)$/.test(e.name)) out.push(p);
  }
  return out;
}

const stale = [];
for (const dir of ['src/pages', 'src/config']) {
  for (const file of await walk(dir)) {
    const text = await fs.readFile(file, 'utf8');
    let hits = 0;
    for (const term of [previous.name, previous.short].filter(Boolean)) {
      // Counted by splitting rather than by regex: a school name can contain
      // any character, and escaping it correctly is a worse bug than counting
      // it plainly.
      hits += text.split(term).length - 1;
    }
    if (hits) stale.push({ file, hits });
  }
}

/* ---- role ---------------------------------------------------------------- */

const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
pkg.name = short.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-website';
pkg.templateRole = 'client';
await fs.writeFile('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log(`
  ${name} scaffolded.

    identity     src/config/site.ts        (search for TODO)
    content      src/content/*             ${kept} placeholders kept, ${removed} removed
    role         templateRole: "client"    src/system is now guarded

${stale.length ? `  Still mentioning ${previous.name}, in prose this script cannot write:

${stale.map((s) => `    ${String(s.hits).padStart(3)}  ${s.file}`).join('\n')}

  Every one of those is a sentence somebody has to rewrite. A site that ships
  with them is a site claiming another school's curriculum.

` : ''}  Next, in order:

    1. cp <logo> brand/logo.png
       npm run brand:init -- --logo brand/logo.png --preset <preset>
       open brand/preview.html

    2. Fill the TODOs in src/config/site.ts.

    3. Write src/content/{values,facilities,programmes,news,directions}/*.md
       See README.md for each collection's shape.

    4. Set src/config/features.ts and src/config/pages.ts.

    5. npm run check
`);
