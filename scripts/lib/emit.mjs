/**
 * Renders generated/brand.css.
 *
 * The output has to stay readable, because a person opens it to check what the
 * extractor decided before they trust it. That is why the comments explaining
 * each role are written into the generated file rather than kept here.
 */

import { hex, triplet } from './color.mjs';

const ROLE_NOTES = {
  brand: 'Primary. Dark sections, solid buttons, icon glyphs.',
  'brand-900': 'Deepest step of the primary. Utility bar and footer ground.',
  'brand-300': 'Primary lightened, for placeholder tints behind loading images.',
  accent: 'Accent. Eyebrows, nav underlines, the primary call to action.',
  'accent-300': 'Accent lifted for dark grounds, and the focus ring.',
  'accent-200': 'Accent lightened, placeholder tint.',
  'accent-700': 'Accent darkened, placeholder tint.',
  'accent-text':
    "The accent darkened until it is legible as TEXT on the page ground. Eyebrows, tags and field labels. Fills and anything on a dark ground keep --accent.",
  'accent-deep':
    "Under the accent button only. A shadow in the accent's own colour reads as a halo and washes the edge out, so the drop colour is the darker relative.",
  feature: 'The one high contrast band that is neither brand nor accent.',
  'feature-900': "Feature, deepened for the band's gradient tail.",
  'feature-300': 'Feature lightened, placeholder tint.',
  surface: "Page ground. Carries the accent's hue at very low chroma, which is why it reads warm rather than grey.",
  'surface-2': 'Alternate band ground, one step down from the page.',
  ink: 'Body text. The brand hue taken almost to black, never a neutral.',
  muted: 'Secondary text. The brand hue at mid lightness, low chroma.',
  scrim: 'Photo overlays. The brand hue at near black, so scrims stay in family.',
};

const RAMP_NOTES = {
  'on-brand-strong': 'Headings on a brand ground.',
  'on-brand': 'Body copy on a brand ground.',
  'on-brand-2': 'Utility bar, and body copy on the mid brand sections.',
  'on-brand-3': 'Lead paragraphs and mottos on a brand ground.',
  'on-brand-4': 'Supporting copy inside cards on a brand ground.',
  'on-brand-5': 'Footer prose.',
  'on-brand-6': 'Footer fine print, the quietest legible step.',
  'on-feature': 'Body copy on the feature band.',
  'on-feature-2': 'Secondary copy on the feature band.',
  'on-accent': 'Text on an accent fill. Chosen by contrast, not by preference.',
};

const RGB_ROLES = Object.keys(ROLE_NOTES);

export function renderBrandCss({ tokens, preset, presetName, logoPath }) {
  const lines = [];
  const push = (s = '') => lines.push(s);

  push('/* ==========================================================================');
  push('   GENERATED BRAND PALETTE');
  push('');
  push(`   Written by \`npm run brand:init -- --logo ${logoPath}\`.`);
  push('   Hand edits here are overwritten on the next run. Deliberate corrections');
  push('   belong in brand/brand.config.json under `overrides`, which beats');
  push('   extraction and survives re-running.');
  push('');
  push("   This is the ONLY file that differs between one school's site and");
  push('   another. Nothing in here knows what a button, a footer or a hero is:');
  push('   the semantic layer in tokens.css does that mapping.');
  push('');
  push('   Colours are space separated RGB triplets rather than hex so that every');
  push('   alpha variant stays derivable: `rgb(var(--brand-rgb) / .14)`. A hex');
  push('   value cannot do that without a second, hand written literal, and the');
  push('   second literal is what rots.');
  push('   ========================================================================== */');
  push('');
  push(':root {');
  push('  /* ---- Core roles ------------------------------------------------------ */');
  push('');

  for (const role of RGB_ROLES) {
    const value = tokens[role];
    if (!value) continue;
    push(`  /** ${ROLE_NOTES[role]} ${hex(value)} */`);
    push(`  --${role}-rgb: ${triplet(value)};`);
  }

  push('');
  push('  /* ---- Text ramps ------------------------------------------------------ */');
  push('  /*');
  push('   * Generated from the page ground\'s hue, so light text on the brand colour');
  push('   * belongs to the same family as the paper. These were thirteen near');
  push('   * identical off whites picked by eye before the ramp existed.');
  push('   */');
  push('');
  for (const [key, note] of Object.entries(RAMP_NOTES)) {
    const value = tokens[key];
    if (!value) continue;
    push(`  /** ${note} */`);
    push(`  --${key}: ${hex(value)};`);
  }

  push('');
  push('  /* ---- Type ------------------------------------------------------------ */');
  push('  /*');
  push('   * --font-google is the Google Fonts query string. The layout builds its');
  push('   * <link> from brand.fonts.google in brand/fonts.json, which this run also');
  push('   * wrote, so a preset change cannot load one family and apply another.');
  push('   */');
  push(`  --font-display: ${preset.fonts.display};`);
  push(`  --font-body: ${preset.fonts.body};`);
  push(`  --font-display-weight: ${preset.fonts.displayWeight};`);

  push('');
  push(`  /* ---- Personality preset: ${presetName} ----`);
  push(`     ${preset.description}`);
  push('');
  push('     Shape, depth and rhythm. These are what stop two schools built from');
  push('     this template reading as the same page in different colours, which is');
  push('     why the preset is a brand decision rather than a system constant. */');
  push('');
  for (const [key, value] of Object.entries(preset.shape)) {
    push(`  --${key}: ${value};`);
  }
  push('');
  push('  /** Dot grid on dark headers. `none` for a preset without texture. */');
  for (const [key, value] of Object.entries(preset.texture)) {
    push(`  --${key}: ${value};`);
  }
  push('}');
  push('');

  return lines.join('\n');
}
