/**
 * Block variants this school uses that the template's registry does not have.
 *
 * src/system/blocks/registry.ts cannot be edited in this repo (see
 * scripts/check-system.mjs), so src/pages/index.astro checks a spec entry's
 * `block:variant` key against this map first, and only hands entries that are
 * not here to the template's <Sections>. `props` are defaults; the spec's own
 * props are spread over them.
 */
import CardSlider from './CardSlider.astro';

export const SITE_BLOCKS: Record<string, { Component: typeof CardSlider; props?: Record<string, unknown> }> = {
  'values:slider': { Component: CardSlider, props: { collection: 'values' } },
  'feature:slider': { Component: CardSlider, props: { collection: 'facilities' } },
};
