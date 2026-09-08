#!/usr/bin/env node
/**
 * brand:check - the gate, run against whatever is actually committed.
 *
 * brand:init audits the palette it generates. This audits the palette the site
 * is currently building with, which is not the same thing: somebody edits a
 * token by hand, or pastes an override, or a designer nudges the accent, and
 * the audit that ran weeks ago at generation time says nothing about it.
 *
 * Exits non-zero on a failure, so `npm run check` and CI stop rather than
 * shipping a caption at 3:1.
 */

import fs from 'node:fs/promises';
import { parseColor, hex, contrast } from './lib/color.mjs';
import { contrastPairs } from './lib/palette.mjs';

const css = await fs.readFile('src/system/styles/generated/brand.css', 'utf8');

const tokens = {};
for (const [, name, value] of css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
  const v = value.trim();
  if (/^\d+\s+\d+\s+\d+$/.test(v)) tokens[name.replace(/-rgb$/, '')] = parseColor(v);
  else if (/^#[0-9a-f]{3,8}$/i.test(v)) tokens[name] = parseColor(v);
}

const required = [
  'brand', 'brand-900', 'accent', 'accent-300', 'feature', 'surface', 'surface-2',
  'ink', 'muted', 'accent-text', 'on-brand-2', 'on-brand-4', 'on-brand-6', 'on-accent',
  'on-feature-2',
];
const missing = required.filter((k) => !tokens[k]);
if (missing.length) {
  console.error(`\n  generated/brand.css is missing: ${missing.join(', ')}`);
  console.error('  Run: npm run brand:init -- --logo brand/logo.png\n');
  process.exit(1);
}

let failed = 0;
console.log('\n  Contrast audit of src/system/styles/generated/brand.css\n');
tokens.white = { r: 255, g: 255, b: 255 };
for (const [label, fg, bg, target] of contrastPairs(tokens)) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= target;
  if (!ok) failed++;
  console.log(
    `    ${(ok ? 'ok' : 'FAIL').padEnd(5)} ${ratio.toFixed(2).padStart(6)}:1  (needs ${String(target).padStart(3)})  ${label}` +
      (ok ? '' : `   ${hex(fg)} on ${hex(bg)}`),
  );
}

if (failed) {
  console.error(
    `\n  ${failed} pair(s) below their contrast target.\n` +
      `  Fix by setting an override in brand/brand.config.json and re-running brand:init.\n`,
  );
  process.exit(1);
}
console.log('\n  All pairs pass.\n');
