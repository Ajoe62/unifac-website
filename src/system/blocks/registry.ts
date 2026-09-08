/**
 * Every block, addressable by name.
 *
 * A page spec in src/config/pages.ts says `{ block: 'hero', variant: 'carousel' }`
 * and this is what turns those two strings into a component. The indirection
 * is the point: choosing a different hero for a different school is then a
 * one word edit in a config file rather than an import swap plus whatever
 * markup the new hero needs around it.
 *
 * Adding a variant means adding a line here and a file beside its siblings.
 * Nothing else in the system needs to know it exists.
 */

import HeroCarousel from './Hero/Carousel.astro';
import HeroSplit from './Hero/Split.astro';
import HeroStatic from './Hero/Static.astro';
import ValuesCards from './Values/Cards.astro';
import ValuesNumbered from './Values/Numbered.astro';
import CardsGrid3 from './Cards/Grid3.astro';
import ProgrammesCards from './Programmes/Cards.astro';
import FeatureGrid from './Feature/Grid.astro';
import MediaText from './Media/Text.astro';
import MediaFullBleed from './Media/FullBleed.astro';
import StatsStrip from './Stats/Strip.astro';
import CtaBand from './Cta/Band.astro';
import CtaStrip from './Cta/Strip.astro';
import WelcomeQuote from './Welcome/Quote.astro';
import DirectionsRoutes from './Directions/Routes.astro';

export const BLOCKS = {
  'hero:carousel': HeroCarousel,
  'hero:split': HeroSplit,
  'hero:static': HeroStatic,
  'values:cards': ValuesCards,
  'values:numbered': ValuesNumbered,
  'cards:grid3': CardsGrid3,
  'programmes:cards': ProgrammesCards,
  'feature:grid': FeatureGrid,
  'media:text': MediaText,
  'media:fullbleed': MediaFullBleed,
  'stats:strip': StatsStrip,
  'cta:band': CtaBand,
  'cta:strip': CtaStrip,
  'welcome:quote': WelcomeQuote,
  'directions:routes': DirectionsRoutes,
} as const;

export type BlockKey = keyof typeof BLOCKS;

/**
 * How a block meets the page.
 *
 *   'section'  content that a <section> positions. The composer wraps it and
 *              puts the surface class on the wrapper.
 *   'self'     the block paints its own full bleed element and takes the
 *              surface as a prop. Heroes and the stats strip are these: a
 *              padded section around a photograph puts a band of page colour
 *              above and below it.
 *
 * `wrapper` is the class the section needs for its own layout, which is a
 * fact about the block rather than about the page using it. Keeping it here
 * is what stops page specs having to name CSS classes.
 */
export const META: Record<BlockKey, { mode: 'section' | 'self'; wrapper?: string }> = {
  'hero:carousel': { mode: 'self' },
  'hero:split': { mode: 'self' },
  'hero:static': { mode: 'self' },
  'stats:strip': { mode: 'self' },
  'media:text': { mode: 'self' },
  'media:fullbleed': { mode: 'self' },
  'feature:grid': { mode: 'self' },
  'directions:routes': { mode: 'self' },

  'welcome:quote': { mode: 'section', wrapper: 'welcome' },
  'values:cards': { mode: 'section' },
  'values:numbered': { mode: 'section' },
  'programmes:cards': { mode: 'section' },
  'cards:grid3': { mode: 'section', wrapper: 'news' },
  'cta:band': { mode: 'section', wrapper: 'band' },
  'cta:strip': { mode: 'section', wrapper: 'portal-strip' },
};

export function blockFor(key: string) {
  const component = BLOCKS[key as BlockKey];
  if (!component) {
    throw new Error(
      `Unknown block "${key}". Available: ${Object.keys(BLOCKS).sort().join(', ')}`,
    );
  }
  return component;
}

export function metaFor(key: string) {
  return META[key as BlockKey] ?? { mode: 'section' as const };
}
