/**
 * WHAT EACH PAGE IS MADE OF, as an ordered list.
 *
 * A page file becomes `<Sections spec={home} />`. Reordering the homepage,
 * dropping the news grid, or giving a different school a split hero and a
 * numbered values list is an edit to this array. No markup, no CSS, and no
 * class names: the block knows what wrapper it needs, so a spec only ever
 * names a block, a variant, and the ground it sits on.
 *
 * WHY THE PAGES ARE NOT ALL HERE YET. The homepage is composition: eight
 * interchangeable bands in an order somebody chose. The about and academics
 * pages are largely one school writing prose about itself, and turning a
 * paragraph into a config object buys nothing but indirection. Those keep
 * their own markup and pull blocks in directly, which the block library
 * supports equally well.
 */

import type { Surface, Action } from '../system/blocks/types';
import type { Stat } from '../system/blocks/Stats/Strip.astro';
import { portalHref } from './integrations';
import { site } from './site';
import welcomePhoto from '../assets/images/welcome.jpg';
import hero0 from '../assets/images/hero-1.jpg';
import hero1 from '../assets/images/hero-2.jpg';
import hero2 from '../assets/images/hero-3.jpg';
import hero3 from '../assets/images/hero-4.jpg';
import hero4 from '../assets/images/hero-5.jpg';
import type { Slide } from '../system/blocks/Hero/Carousel.astro';

export interface SectionSpec {
  /** Family of block: 'hero', 'values', 'cta'. */
  block: string;
  /** Which member of that family. An unknown pair fails the build by name. */
  variant: string;
  surface?: Surface;
  slim?: boolean;
  id?: string;
  /** Extra class on the wrapper, for the rare page that needs one. */
  class?: string;
  props?: Record<string, unknown>;
}

// The hero's primary action goes straight to applicant registration, falling
// back to the admissions page out of season, so the most prominent button on
// the site never points at a closed form.
const applyHref = portalHref('entrance') ?? '/admissions';
const applyRel = applyHref.startsWith('http') ? 'noopener' : undefined;

const heroSlides: Slide[] = [
  { src: hero0, alt: 'Pupils and teachers on campus' },
  { src: hero1, alt: 'Students engaged in a bright, modern classroom' },
  { src: hero2, alt: 'Children learning together' },
  { src: hero3, alt: 'School life outdoors' },
  { src: hero4, alt: 'Confident young learners' },
];

// Four facts, each one checkable. The template shipped "EYFS + Cambridge"
// here, which is the curriculum of the school this template was extracted
// from and not the one Unifac teaches.
const stats: Stat[] = [
  { value: 'Nursery to SSS 3', label: 'Every Stage' },
  { value: 'Three Campuses', label: 'Across Benin City' },
  { value: 'Nigerian Curriculum', label: 'BECE, WASSCE & NECO' },
  { value: 'Knowledge from God', label: 'Our Motto' },
];

const heroActions: Action[] = [
  { label: 'Begin an Application', href: applyHref, rel: applyRel },
  { label: 'Discover the School', href: '/about' },
];

export const home: SectionSpec[] = [
  {
    block: 'hero',
    variant: 'carousel',
    props: {
      slides: heroSlides,
      headline: 'Nursery to Senior Secondary, across <em>three campuses</em> in Benin City.',
      actions: heroActions,
    },
  },
  { block: 'stats', variant: 'strip', props: { stats } },
  {
    block: 'welcome',
    variant: 'quote',
    surface: 'alt',
    props: {
      image: welcomePhoto,
      alt: 'A teacher supporting a pupil in class',
      eyebrow: `Welcome to ${site.shortName}`,
      title: 'An education that shapes the whole child.',
      // A quote is attributed to a person, so this one is left unwritten rather
      // than drafted. The template carried the previous school's, which spoke
      // about the cedar it was named for.
      quote:
        'TODO The Head of School’s own words, in one or two sentences. Attributed, so nobody else can write it.',
      signature: 'The Head of School',
      signatureRole: site.name,
      actions: [{ label: 'Read our story', href: '/about', variant: 'brand' }] satisfies Action[],
    },
  },
  {
    block: 'values',
    variant: 'cards',
    props: {
      eyebrow: 'Our Promise',
      title: 'Three commitments, on our crest and in our classrooms.',
      intro:
        'The open book, the ladder and the cap on our crest are not decoration. They name what we set out to give every child who joins us.',
    },
  },
  {
    block: 'feature',
    variant: 'grid',
    surface: 'alt',
    props: {
      // The template listed laboratories, a music studio and sports facilities
      // here. Those are checkable claims about a specific school, and no one
      // has confirmed which of them Unifac has.
      intro:
        'TODO One sentence naming the facilities Unifac actually has, once the list in src/content/facilities is the real one.',
    },
  },
  {
    block: 'cta',
    variant: 'strip',
    surface: 'brand',
    props: {
      eyebrow: `${site.shortName} Portal`,
      title: 'Assessments and lessons, online.',
      body:
        'Students sign in with a username and access code issued by the school. There is no account to create, no password to forget. Lessons keep working when the data runs out.',
      actions: [
        { label: 'Open the Portal', href: '/portal', variant: 'brand' },
        { label: 'Sign-in Guide', href: '/portal/help', variant: 'outline', arrow: false },
      ] satisfies Action[],
    },
  },
  {
    block: 'cards',
    variant: 'grid3',
    props: {
      limit: 3,
      eyebrow: 'News & Events',
      title: `Life at ${site.shortName}.`,
      action: { label: 'View all news', href: '/news', variant: 'brand' } satisfies Action,
    },
  },
  {
    block: 'cta',
    variant: 'band',
    surface: 'feature',
    props: {
      eyebrow: 'Admissions Open',
      title: 'Come and see where your child will grow.',
      body:
        'TODO The closing pitch. Which session is open, which year groups, and what a visit involves.',
      actions: [
        { label: 'Start an Enquiry', href: '/admissions' },
        { label: 'Contact the School', href: '/contact' },
      ] satisfies Action[],
    },
  },
];
