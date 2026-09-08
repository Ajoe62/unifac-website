/**
 * Logo in, palette out.
 *
 * Two steps that are easy to confuse and must stay separate: finding which
 * colours a logo is MADE of, and deciding which ROLE each one plays. The first
 * is arithmetic. The second is a set of judgements about what a school site
 * needs, and every one of them is written down below so the next person can
 * disagree with a specific line rather than with the whole script.
 */

import sharp from 'sharp';
import { rgbToOklch, oklchToRgb, contrast, bestOn, ensureContrast, hex, clamp } from './color.mjs';

/* ---- Step one: what the logo is made of ---------------------------------- */

/**
 * K-means over the logo's pixels.
 *
 * Downscaled to 128px first, which is not an optimisation: it averages away
 * JPEG ringing and antialiased edges, and those produce dozens of near
 * duplicate colours that would otherwise win a cluster on sheer count.
 */
const dist = (a, b) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;

export async function dominantColors(logoPath, k = 8) {
  const { data, info } = await sharp(logoPath)
    .resize(128, 128, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = [];
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }

  // FARTHEST POINT SEEDING, and it is not a refinement.
  //
  // The obvious approach, taking every (n/k)th pixel, samples the image in
  // reading order, so on a crest with a dark band across the top every seed
  // lands on nearly the same colour. K-means cannot recover from that: one
  // cluster swallows the image and the rest stay empty. On the first crest
  // this was tested against it produced a single cluster holding 100% of the
  // pixels and a primary colour of pure black.
  //
  // Starting from the darkest pixel and then repeatedly taking whichever pixel
  // is furthest from everything chosen so far spreads the seeds across the
  // colours actually present, and is deterministic, which matters because
  // "run it again" is not a design process.
  let centroids = [pixels.reduce((a, b) => (a.r + a.g + a.b <= b.r + b.g + b.b ? a : b))];
  const nearest = pixels.map((p) => dist(p, centroids[0]));
  while (centroids.length < k) {
    let far = 0;
    for (let i = 1; i < pixels.length; i++) if (nearest[i] > nearest[far]) far = i;
    if (nearest[far] === 0) break;
    const seed = { ...pixels[far] };
    centroids.push(seed);
    for (let i = 0; i < pixels.length; i++) {
      const d = dist(pixels[i], seed);
      if (d < nearest[i]) nearest[i] = d;
    }
  }

  let assignment = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < 20; iter++) {
    let moved = false;
    pixels.forEach((p, idx) => {
      let best = 0;
      let bestD = Infinity;
      centroids.forEach((c, ci) => {
        const d = dist(p, c);
        if (d < bestD) { bestD = d; best = ci; }
      });
      if (assignment[idx] !== best) { assignment[idx] = best; moved = true; }
    });
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    pixels.forEach((p, idx) => {
      const s = sums[assignment[idx]];
      s.r += p.r; s.g += p.g; s.b += p.b; s.n++;
    });
    centroids = sums.map((s, i) =>
      s.n ? { r: s.r / s.n, g: s.g / s.n, b: s.b / s.n } : centroids[i],
    );
    if (!moved) break;
  }

  const counts = centroids.map(() => 0);
  assignment.forEach((a) => counts[a]++);

  return centroids
    .map((c, i) => ({
      rgb: { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) },
      share: counts[i] / pixels.length,
      ...rgbToOklch(c),
    }))
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share);
}

/* ---- Step two: which colour plays which part ----------------------------- */

const hueGap = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Assign roles.
 *
 * The judgements, in order:
 *
 * 1. Paper and outline are not brand colours. Nearly every logo is mostly
 *    white and has black linework, and both would otherwise win on population
 *    and make every school's site grey.
 * 2. The primary is the darkest well represented colour. Dark sections, solid
 *    buttons and body text all derive from it, and a pale primary gives none
 *    of the three anywhere to go.
 * 3. The accent must be far enough round the wheel from the primary to read as
 *    a second colour rather than a shade of the first. Below 40 degrees a
 *    viewer sees one colour used twice.
 * 4. The page ground carries the accent's hue at very low chroma. This is why
 *    a warm brand yields warm paper rather than grey, and it reproduces for
 *    any brand without anybody choosing an off-white by eye.
 * 5. Ink and muted are the primary hue at low chroma, never a neutral grey.
 *    Text that shares the brand's hue looks like it belongs to the page.
 */
/**
 * The text ramp keys, listed here so assignRoles can tell a pinned ramp step
 * apart from a typo. buildRamps applies them; assignRoles must not reject them.
 */
export const RAMP_KEYS = [
  'on-brand-strong', 'on-brand', 'on-brand-2', 'on-brand-3', 'on-brand-4',
  'on-brand-5', 'on-brand-6', 'on-feature', 'on-feature-2', 'on-accent',
];

export function assignRoles(colors, overrides = {}) {
  const notes = [];

  const candidates = colors.filter((c) => c.L > 0.12 && c.L < 0.95 && c.share > 0.004);
  const pool = candidates.length >= 2 ? candidates : colors;
  if (candidates.length < 2) {
    notes.push('Logo is mostly paper and linework; fell back to the raw clusters.');
  }

  const dark = [...pool].sort((a, b) => a.L - b.L);
  const brandSrc = dark.find((c) => c.L < 0.55) ?? dark[0];

  const chromatic = [...pool].sort((a, b) => b.C - a.C);
  let accentSrc = chromatic.find(
    (c) => c !== brandSrc && hueGap(c.h, brandSrc.h) > 40 && c.C > 0.03,
  );
  if (!accentSrc) {
    // No second colour in the logo. Rotate the primary rather than inventing
    // one: a derived accent is at least in the same family as the crest.
    accentSrc = { ...brandSrc, h: (brandSrc.h + 40) % 360, C: Math.max(brandSrc.C, 0.11), L: 0.68 };
    notes.push('Logo carries a single hue; the accent was derived by rotating it 40 degrees.');
  }

  let featureSrc = chromatic.find(
    (c) => c !== brandSrc && c !== accentSrc && hueGap(c.h, brandSrc.h) > 60 && hueGap(c.h, accentSrc.h) > 40,
  );
  if (!featureSrc) {
    featureSrc = { ...brandSrc, h: (brandSrc.h + 150) % 360, C: Math.max(brandSrc.C, 0.1), L: 0.35 };
    notes.push('No third distinct hue; the feature band colour is the primary rotated 150 degrees.');
  }

  /*
   * An override replaces the colour the logo suggested BEFORE anything is
   * derived from it, which is the only way it can mean what somebody writing
   * it expects.
   *
   * This used to run at the end, over the finished roles. Correcting `accent`
   * therefore changed the accent and nothing else: --accent-300, --accent-700,
   * --accent-deep, --accent-text and both surface tints all stayed derived
   * from the colour the extractor had guessed. You got your gold button on a
   * page whose off-white, hover states and eyebrow text were still tuned to a
   * colour nobody had asked for. The crest this was built against is the
   * proof: extraction reads it as green and RED, and pinning the accent alone
   * would have fixed one swatch out of six.
   *
   * The extractor's lightness clamps are skipped for an overridden colour too.
   * Clamping exists to stop a logo's own colour being unusable as a large
   * fill; a value typed by a person is already the answer.
   */
  const SOURCE_ROLES = ['brand', 'accent', 'feature'];
  const pin = (key, derive) => {
    if (!overrides[key]) return derive();
    notes.push(`--${key} pinned by brand.config overrides; its relatives follow it.`);
    return overrides[key];
  };

  const brand = pin('brand', () =>
    oklchToRgb({ L: Math.min(brandSrc.L, 0.42), C: brandSrc.C, h: brandSrc.h }),
  );
  const brandO = rgbToOklch(brand);

  const accent = pin('accent', () =>
    oklchToRgb({ L: clamp(accentSrc.L, 0.6, 0.78), C: accentSrc.C, h: accentSrc.h }),
  );
  const accentO = rgbToOklch(accent);

  const feature = pin('feature', () =>
    oklchToRgb({ L: clamp(featureSrc.L, 0.3, 0.45), C: featureSrc.C, h: featureSrc.h }),
  );
  const featureO = rgbToOklch(feature);

  const roles = {
    brand,
    'brand-900': oklchToRgb({ ...brandO, L: brandO.L * 0.7 }),
    'brand-300': oklchToRgb({ ...brandO, L: Math.min(brandO.L * 1.5, 0.6) }),

    accent,
    'accent-300': oklchToRgb({ ...accentO, L: Math.min(accentO.L + 0.12, 0.92), C: accentO.C * 0.95 }),
    'accent-200': oklchToRgb({ ...accentO, L: Math.min(accentO.L + 0.05, 0.9) }),
    'accent-700': oklchToRgb({ ...accentO, L: accentO.L * 0.72 }),
    /* Under the accent button. A shadow in the accent's own colour reads as a
       halo and washes the edge out, so it has to be the darker relative. */
    'accent-deep': oklchToRgb({ ...accentO, L: accentO.L * 0.6, C: accentO.C * 0.9 }),
    /* The accent is chosen to sit well as a FILL. At 11px on a pale ground it
       is usually nowhere near legible, so eyebrows and tags get their own
       darkened relative. The gate below is what sets how far it moves. */
    'accent-text': { ...accent },

    feature,
    'feature-900': oklchToRgb({ ...featureO, L: featureO.L * 0.78 }),
    'feature-300': oklchToRgb({ ...featureO, L: featureO.L * 1.35, h: (featureO.h + 12) % 360 }),

    surface: oklchToRgb({ L: 0.962, C: 0.014, h: accentO.h }),
    'surface-2': oklchToRgb({ L: 0.932, C: 0.02, h: accentO.h }),

    ink: oklchToRgb({ L: 0.22, C: 0.018, h: brandO.h }),
    muted: oklchToRgb({ L: 0.5, C: 0.018, h: brandO.h }),
    scrim: oklchToRgb({ L: 0.14, C: 0.03, h: brandO.h }),
  };

  /*
   * Fine grained overrides, for the roles that are not sources of anything.
   * Pinning --surface or --muted directly is legitimate and affects nothing
   * downstream, so it can safely happen here. The three source colours are
   * skipped: they were applied above, before their relatives were derived.
   */
  for (const [key, value] of Object.entries(overrides)) {
    if (!value || SOURCE_ROLES.includes(key) || RAMP_KEYS.includes(key)) continue;
    if (!roles[key]) {
      throw new Error(
        `brand.config.json overrides "${key}", which is not a colour role. ` +
          `Valid: ${[...Object.keys(roles), ...RAMP_KEYS].sort().join(', ')}`,
      );
    }
    roles[key] = value;
    notes.push(`--${key} pinned by brand.config overrides.`);
  }

  return { roles, notes };
}

/* ---- Step three: the ramps that hang off the roles ----------------------- */

/**
 * The text ramp for dark grounds.
 *
 * Six steps, generated from the page ground's hue so that light text on the
 * brand colour belongs to the same family as the paper. The stylesheets used
 * to carry thirteen of these picked by eye.
 */
export function buildRamps(roles, overrides = {}) {
  const s = rgbToOklch(roles.surface);
  const step = (L, C = s.C) => oklchToRgb({ L, C, h: s.h });
  const ramp = {
    'on-brand-strong': step(0.975, s.C * 0.8),
    'on-brand': step(0.945),
    'on-brand-2': step(0.9),
    'on-brand-3': step(0.855),
    'on-brand-4': step(0.805),
    'on-brand-5': step(0.69, s.C * 0.8),
    'on-brand-6': step(0.6, s.C * 0.7),
    'on-feature': oklchToRgb({ L: 0.955, C: 0.02, h: rgbToOklch(roles.feature).h }),
    'on-feature-2': oklchToRgb({ L: 0.895, C: 0.035, h: rgbToOklch(roles.feature).h }),
    'on-accent': bestOn(roles.accent, { r: 255, g: 255, b: 255 }, oklchToRgb({ L: 0.18, C: 0.04, h: rgbToOklch(roles.accent).h })),
  };

  /*
   * The ramp is pinnable for the same reason the roles are. A school whose
   * text colours were chosen before this tool existed needs brand:init to
   * reproduce them, not to improve on them by four points per channel: the
   * whole value of a generated file is that regenerating it is a no-op.
   * A new school pins none of these and gets the derived ramp.
   */
  for (const [key, value] of Object.entries(overrides)) {
    if (value && key in ramp) ramp[key] = value;
  }
  return ramp;
}

/* ---- Step four: the gate ------------------------------------------------- */

/**
 * The twelve pairs a school site actually puts in front of a reader.
 *
 * Anything under its target is nudged in lightness until it passes, and the
 * nudge is reported. Silently shipping a caption at 3:1 is the failure this
 * whole script exists to prevent, so nothing here fails quietly.
 */
export function contrastPairs(t) {
  return CONTRAST_PAIRS.map(([label, fg, bg, target]) => [label, t[fg], t[bg], target, fg, bg]);
}

/**
 * The twelve pairs a school site actually puts in front of a reader, named by
 * TOKEN rather than by colour.
 *
 * They used to be given as colour values, and the audit worked out which token
 * to nudge by matching object identity. That silently moved the wrong token
 * the moment two roles started out equal: --accent-text begins as a copy of
 * --accent, so darkening the eyebrow darkened every gold fill on the site
 * instead. Names cannot collide the way values can.
 */
const CONTRAST_PAIRS = [
  ['body text on the page', 'ink', 'surface', 4.5],
  ['body text on the alternate band', 'ink', 'surface-2', 4.5],
  ['secondary text on the page', 'muted', 'surface', 4.5],
  ['body text on the brand colour', 'on-brand-2', 'brand', 4.5],
  ['card text on the brand colour', 'on-brand-4', 'brand', 4.5],
  ['footer text', 'on-brand-4', 'brand-900', 4.5],
  ['footer fine print', 'on-brand-6', 'brand-900', 4.5],
  ['button label on the accent', 'on-accent', 'accent', 4.5],
  ['eyebrow on the page', 'accent-text', 'surface', 4.5],
  ['eyebrow on the brand colour', 'accent-300', 'brand', 4.5],
  ['body text on the feature band', 'on-feature-2', 'feature', 4.5],
  ['heading on the feature band', 'white', 'feature', 3],
];

export function auditAndFix(tokens) {
  const report = [];
  const fixed = { ...tokens, white: { r: 255, g: 255, b: 255 } };

  for (const [label, fgKey, bgKey, target] of CONTRAST_PAIRS) {
    const fg = fixed[fgKey];
    const bg = fixed[bgKey];
    const before = contrast(fg, bg);
    const { color, moved, failed } = ensureContrast(fg, bg, target);
    if (moved) fixed[fgKey] = color;
    report.push({
      label,
      target,
      before: Number(before.toFixed(2)),
      after: Number(contrast(color, bg).toFixed(2)),
      nudged: moved !== 0 ? `--${fgKey} lightness ${moved > 0 ? '+' : ''}${(moved * 100).toFixed(0)}%` : null,
      failed: Boolean(failed),
      fg: hex(fg),
      bg: hex(bg),
    });
  }
  delete fixed.white;
  return { tokens: fixed, report };
}
