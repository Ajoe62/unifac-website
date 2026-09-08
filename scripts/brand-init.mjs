#!/usr/bin/env node
/**
 * brand:init - a logo goes in, a site's whole visual identity comes out.
 *
 *   npm run brand:init -- --logo brand/logo.png
 *   npm run brand:init -- --logo brand/logo.png --preset modern-clean
 *   npm run brand:init -- --logo brand/logo.png --dry-run
 *
 * Writes:
 *   src/system/styles/generated/brand.css   the palette the site reads
 *   brand/.brand-report.json                what it decided and why
 *   brand/preview.html                      swatches, the contrast table,
 *                                           and the components rendered in it
 *   public/favicon-16x16.png, -32x32.png, apple-touch-icon.png, favicon.ico
 *   public/og-image.png
 *
 * IT IS A STARTING POINT, NOT A LOCK. Extraction gets the palette roughly
 * right in seconds; the last twenty per cent is taste and belongs to a person.
 * Anything in brand/brand.config.json under `overrides` beats what the logo
 * says, and re-running keeps those. That is the whole contract: the script is
 * allowed to be wrong, and it is not allowed to be wrong twice.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { dominantColors, assignRoles, buildRamps, auditAndFix } from './lib/palette.mjs';
import { hex, triplet, parseColor, contrast } from './lib/color.mjs';
import { PRESETS, DEFAULT_PRESET } from './lib/presets.mjs';
import { renderBrandCss } from './lib/emit.mjs';
import { renderPreview } from './lib/preview.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const logoPath = flag('logo', 'brand/logo.png');
const presetName = flag('preset', DEFAULT_PRESET);
const dryRun = has('dry-run');

const preset = PRESETS[presetName];
if (!preset) {
  console.error(`Unknown preset "${presetName}". Available: ${Object.keys(PRESETS).join(', ')}`);
  process.exit(1);
}

try {
  await fs.access(logoPath);
} catch {
  console.error(`No logo at ${logoPath}. Pass --logo <path>.`);
  process.exit(1);
}

/* ---- config overrides ---------------------------------------------------- */

let config = {};
try {
  config = JSON.parse(await fs.readFile('brand/brand.config.json', 'utf8'));
} catch {
  /* No config yet. The first run writes one. */
}
const overrides = Object.fromEntries(
  Object.entries(config.overrides ?? {}).map(([k, v]) => [k, parseColor(v)]),
);

/* ---- extract ------------------------------------------------------------- */

const clusters = await dominantColors(logoPath);
const { roles, notes } = assignRoles(clusters, overrides);
const ramps = buildRamps(roles, overrides);
const { tokens, report } = auditAndFix({ ...roles, ...ramps });

const failures = report.filter((r) => r.failed);
const nudges = report.filter((r) => r.nudged);

/* ---- report -------------------------------------------------------------- */

const ansi = (rgb, s) => `\x1b[48;2;${Math.round(rgb.r)};${Math.round(rgb.g)};${Math.round(rgb.b)}m${s}\x1b[0m`;

console.log(`\n  logo    ${logoPath}`);
console.log(`  preset  ${presetName}  (${preset.description})\n`);

console.log('  Found in the logo');
for (const c of clusters.slice(0, 6)) {
  console.log(`    ${ansi(c.rgb, '      ')}  ${hex(c.rgb)}  ${(c.share * 100).toFixed(1).padStart(5)}%  L=${c.L.toFixed(2)} C=${c.C.toFixed(3)}`);
}

console.log('\n  Assigned');
for (const key of ['brand', 'brand-900', 'accent', 'accent-300', 'feature', 'surface', 'surface-2', 'ink', 'muted']) {
  console.log(`    ${ansi(tokens[key], '      ')}  --${key.padEnd(12)} ${hex(tokens[key])}`);
}

console.log('\n  Contrast');
for (const r of report) {
  const mark = r.failed ? 'FAIL' : r.nudged ? 'FIXED' : 'ok';
  console.log(
    `    ${mark.padEnd(6)} ${r.after.toFixed(2).padStart(6)}:1  (needs ${r.target})  ${r.label}` +
      (r.nudged ? `\n           nudged ${r.nudged}, was ${r.before.toFixed(2)}:1` : ''),
  );
}

for (const n of notes) console.log(`\n  Note: ${n}`);

if (failures.length) {
  console.log(
    `\n  ${failures.length} pair(s) could not be fixed by lightness alone. The logo's own\n` +
      `  colours may be too close together. Set an override in brand/brand.config.json.`,
  );
}

if (dryRun) {
  console.log('\n  --dry-run: nothing written.\n');
  process.exit(failures.length ? 1 : 0);
}

/* ---- write --------------------------------------------------------------- */

await fs.mkdir('src/system/styles/generated', { recursive: true });
await fs.writeFile(
  'src/system/styles/generated/brand.css',
  renderBrandCss({ tokens, preset, presetName, logoPath }),
  'utf8',
);

await fs.mkdir('brand', { recursive: true });
await fs.writeFile(
  'brand/.brand-report.json',
  JSON.stringify(
    {
      generatedFrom: logoPath,
      preset: presetName,
      clusters: clusters.map((c) => ({ hex: hex(c.rgb), share: c.share, L: c.L, C: c.C })),
      tokens: Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, hex(v)])),
      contrast: report,
      notes,
    },
    null,
    2,
  ),
  'utf8',
);

if (!config.overrides) {
  await fs.writeFile(
    'brand/brand.config.json',
    JSON.stringify(
      {
        _comment:
          'Anything under overrides beats what the logo says, and survives re-running brand:init. Use hex strings.',
        preset: presetName,
        overrides: {},
      },
      null,
      2,
    ),
    'utf8',
  );
}

/**
 * The Google Fonts query, written where the layout can read it.
 *
 * Phase 2 left the <link> hand written in Layout.astro while the families were
 * declared in CSS, which meant a preset swap could load Fraunces and apply
 * Sora. Both now come from the preset, through this file.
 */
await fs.writeFile(
  'brand/fonts.json',
  JSON.stringify({ google: preset.fonts.google, display: preset.fonts.display, body: preset.fonts.body }, null, 2),
  'utf8',
);

await fs.writeFile('brand/preview.html', renderPreview({ tokens, report, clusters, preset, presetName, notes }), 'utf8');

/* ---- icons --------------------------------------------------------------- */

const icons = [
  ['public/favicon-16x16.png', 16],
  ['public/favicon-32x32.png', 32],
  ['public/apple-touch-icon.png', 180],
];
for (const [out, size] of icons) {
  await sharp(logoPath).resize(size, size, { fit: 'cover' }).png().toBuffer().then((b) => fs.writeFile(out, b));
}

/**
 * A .ico wrapping the 32px PNG.
 *
 * PNG inside ICO has been valid since Vista and is what every generator emits
 * now. Six byte header, one sixteen byte directory entry, then the PNG.
 */
const png32 = await sharp(logoPath).resize(32, 32, { fit: 'cover' }).png().toBuffer();
const ico = Buffer.alloc(22 + png32.length);
ico.writeUInt16LE(0, 0);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt8(32, 6);
ico.writeUInt8(32, 7);
ico.writeUInt8(0, 8);
ico.writeUInt8(0, 9);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png32.length, 14);
ico.writeUInt32LE(22, 18);
png32.copy(ico, 22);
await fs.writeFile('public/favicon.ico', ico);

/**
 * The share card: the brand gradient with the crest on it.
 *
 * Deliberately no text. Rendering type here would depend on whichever fonts
 * happen to be installed on the machine running the script, and a share card
 * that silently falls back to a different typeface on someone else's laptop is
 * worse than one with no words on it. The page's own og:title carries the name.
 */
const ogLogo = await sharp(logoPath).resize(280, 280, { fit: 'inside' }).png().toBuffer();
const ogBg = Buffer.from(
  `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0%" stop-color="${hex(tokens.brand)}"/>
       <stop offset="100%" stop-color="${hex(tokens['brand-900'])}"/>
     </linearGradient></defs>
     <rect width="1200" height="630" fill="url(#g)"/>
     <circle cx="600" cy="315" r="188" fill="none" stroke="${hex(tokens['accent-300'])}" stroke-opacity="0.35" stroke-width="2"/>
   </svg>`,
);
await sharp(ogBg)
  .composite([{ input: ogLogo, gravity: 'centre' }])
  .png()
  .toBuffer()
  .then((b) => fs.writeFile('public/og-image.png', b));

console.log(`
  Written
    src/system/styles/generated/brand.css
    brand/.brand-report.json
    brand/brand.config.json
    brand/fonts.json
    brand/preview.html
    public/favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png
    public/og-image.png

  Open brand/preview.html before you trust any of it.
`);

process.exit(failures.length ? 1 : 0);
