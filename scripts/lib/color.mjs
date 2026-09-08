/**
 * Colour maths, written out rather than pulled in.
 *
 * This is the one place in the template where a dependency would have been
 * easy and wrong. `npm run brand:init` is the first thing somebody does after
 * cloning, and it has to work on the machine they cloned onto without a
 * second install step. Everything below is standard and testable: Björn
 * Ottosson's OKLab matrices and the WCAG relative luminance formula.
 *
 * OKLab rather than HSL, because the role assignment leans on lightness and
 * chroma meaning what they say. In HSL a yellow and a blue at the same L are
 * nowhere near the same brightness, so a palette built in HSL produces an
 * accent that vanishes on one brand and glares on another.
 */

/* ---- sRGB ---------------------------------------------------------------- */

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** "#123c28" or "18 60 40" to {r,g,b} in 0..255. */
export function parseColor(input) {
  const s = String(input).trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  const [r, g, b] = s.split(/[\s,]+/).map(Number);
  return { r, g, b };
}

export const hex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

export const triplet = ({ r, g, b }) => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;

/* ---- OKLab / OKLCH ------------------------------------------------------- */

export function rgbToOklch({ r, g, b }) {
  const lr = toLinear(r / 255), lg = toLinear(g / 255), lb = toLinear(b / 255);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return {
    L,
    C: Math.sqrt(A * A + B * B),
    h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360,
  };
}

function oklchToRgbRaw({ L, C, h }) {
  const rad = (h * Math.PI) / 180;
  const A = C * Math.cos(rad);
  const B = C * Math.sin(rad);

  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return {
    r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255,
    g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255,
    b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255,
  };
}

const inGamut = ({ r, g, b }) => [r, g, b].every((v) => v >= -0.5 && v <= 255.5);

/**
 * OKLCH to sRGB, reducing chroma until the colour actually fits.
 *
 * Naively clamping each channel is what turns a saturated brand colour into a
 * different hue when it falls outside sRGB: red clips at 255 while green and
 * blue keep their values, and the result is a colour nobody chose. Backing off
 * chroma keeps the hue and the lightness, which are the two properties a role
 * assignment is actually relying on.
 */
export function oklchToRgb({ L, C, h }) {
  let lo = 0;
  let hi = C;
  if (inGamut(oklchToRgbRaw({ L, C, h }))) hi = C;
  else {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgbRaw({ L, C: mid, h }))) lo = mid;
      else hi = mid;
    }
    hi = lo;
  }
  const out = oklchToRgbRaw({ L, C: hi, h });
  return { r: clamp(out.r, 0, 255), g: clamp(out.g, 0, 255), b: clamp(out.b, 0, 255) };
}

/** Nudge a colour in OKLCH space. Deltas are absolute for L and C, degrees for h. */
export function adjust(rgb, { L = 0, C = 0, h = 0, setL, setC } = {}) {
  const o = rgbToOklch(rgb);
  return oklchToRgb({
    L: clamp(setL ?? o.L + L, 0, 1),
    C: Math.max(0, setC ?? o.C + C),
    h: (o.h + h + 360) % 360,
  });
}

/* ---- Contrast ------------------------------------------------------------ */

export function luminance({ r, g, b }) {
  return 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** White or ink, whichever reads better on this ground. */
export function bestOn(background, light, dark) {
  return contrast(background, light) >= contrast(background, dark) ? light : dark;
}

/**
 * Walk a foreground's lightness until it clears a contrast ratio.
 *
 * Direction is chosen by which side of the background it already sits on, so a
 * pale caption on a dark ground gets paler rather than being dragged through
 * the background to the other side. Returns the original if no step helps,
 * and the caller reports that rather than silently shipping it.
 */
export function ensureContrast(foreground, background, target) {
  if (contrast(foreground, background) >= target) return { color: foreground, moved: 0 };

  const up = luminance(foreground) >= luminance(background);
  const start = rgbToOklch(foreground);

  for (let step = 1; step <= 100; step++) {
    const L = clamp(start.L + (up ? step : -step) * 0.01, 0, 1);
    const candidate = oklchToRgb({ ...start, L });
    if (contrast(candidate, background) >= target) {
      return { color: candidate, moved: (up ? step : -step) / 100 };
    }
    if (L === 0 || L === 1) break;
  }
  return { color: foreground, moved: 0, failed: true };
}
