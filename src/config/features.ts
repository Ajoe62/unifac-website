/**
 * WHAT THIS SITE HAS, as switches.
 *
 * Generalised from the launch flags that used to live in portal.js. That file
 * had the right idea and the wrong scope: it could say "lessons are not live
 * yet" but not "this school has no portal at all", and a school without a
 * portal was the common case for every site after the first.
 *
 * A flag here is load bearing in more than one place. Turning `news` off
 * removes the header link, the mobile menu entry, the footer link and the
 * homepage section together. That is the point. When a nav item and a footer
 * link to the same switched-off page are maintained separately, one of them
 * survives, and a visitor finds it.
 *
 * These say whether the school HAS the thing. Whether a thing the school has
 * is READY is a launch flag, and those stay in integrations.ts next to the
 * URLs they gate: a school can own a portal that is not open yet, and the two
 * questions have different answers on different weeks.
 */

import { z } from 'zod';

const FeaturesSchema = z.object({
  /** The /portal page pack: the chooser, the student and staff doors, the guide. */
  portal: z.boolean(),
  /** The /news page and the homepage news grid. */
  news: z.boolean(),
  /** The /for-schools page, which pitches the software to other schools. */
  forSchools: z.boolean(),
  /** A staff listing. Nothing renders it yet; the flag exists so nothing has to guess. */
  staffDirectory: z.boolean(),
  /** A photo gallery. Same. */
  gallery: z.boolean(),
});

export const features = FeaturesSchema.parse({
  portal: true,
  news: true,
  forSchools: true,
  staffDirectory: false,
  gallery: false,
});

export type Features = typeof features;
export type FeatureName = keyof Features;

/**
 * Whether a navigation entry should render.
 *
 * An entry with no `feature` is unconditional, which keeps the common case
 * quiet. An entry naming a flag that does not exist is treated as off rather
 * than on: a typo should hide a link, not ship a broken one.
 */
export function featureEnabled(name?: string): boolean {
  if (!name) return true;
  return features[name as FeatureName] === true;
}
