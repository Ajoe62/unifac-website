/**
 * WHO THIS SITE IS FOR, in one file.
 *
 * Before this existed the school's name appeared 27 times across the pages,
 * its email 12 times, its phone numbers 8 times between them, and the year on
 * the copyright line was typed wherever it was needed. Standing a second
 * school up meant find-and-replace across every file in src/, which is the
 * kind of job that silently leaves one page still greeting the wrong school.
 *
 * Everything below is a fact about the institution. Nothing below is a fact
 * about the website: no colours (those are brand/), no section ordering (that
 * is pages.ts, Phase 4), no URLs into the applications (integrations.ts).
 *
 * WHY THIS IS VALIDATED AT BUILD TIME. A template is used by someone in a
 * hurry, filling in a form for a school that opens on Monday. Leaving the
 * email blank should not produce a site with `mailto:` links that go nowhere;
 * it should stop the build and say which field is missing. The schema below
 * is what turns "we forgot" into a failure you cannot ship past.
 */

import { z } from 'zod';

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} is required`);

/**
 * A phone number, kept as two fields on purpose.
 *
 * `display` is how the school writes it to a parent, spacing and all, and
 * changes country to country. `dial` is what goes in the tel: href and has to
 * be E.164 with the country code, or a tap on a mobile fails silently. Deriving
 * one from the other means guessing a national dialling convention, so the
 * template asks for both and checks the shape of the one that has a shape.
 */
const Phone = z.object({
  display: nonEmpty('phone display'),
  dial: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'dial must be E.164, e.g. +2348056733071'),
});

const Address = z.object({
  /** Street line, as the school writes it. */
  street: nonEmpty('street'),
  /**
   * The landmark a family is actually told to look for. Optional, because most
   * addresses do not need one, and load bearing where street names are not
   * signposted.
   */
  landmark: z.string().trim().default(''),
  /** The community or neighbourhood the school sits in. */
  area: nonEmpty('area'),
  /** Local government area, council, county: the tier above the community. */
  district: z.string().trim().default(''),
  city: nonEmpty('city'),
  region: nonEmpty('region'),
  country: nonEmpty('country'),
  /**
   * The short form for the utility bar, where there is room for one line and
   * a visitor only needs to know roughly where the school is.
   */
  short: nonEmpty('address.short'),
  /**
   * What gets pasted into Google Maps. Deliberately not derived from the
   * fields above: the address that reads best to a person and the string that
   * actually resolves on a map are different strings, and out here they are
   * very different. This one is chosen by whoever checked that it works.
   */
  mapsQuery: nonEmpty('address.mapsQuery'),
});

const NavItem = z.object({
  href: nonEmpty('nav href'),
  label: nonEmpty('nav label'),
  /** Matches the `active` prop a page passes to the layout. */
  key: nonEmpty('nav key'),
  /**
   * Gate this item behind a feature flag. The item disappears from the header,
   * the mobile menu and the footer together, which is the whole point: a nav
   * entry and a footer link to the same switched-off page are two places to
   * forget.
   */
  feature: z.string().optional(),
});

const Cta = z.object({
  label: nonEmpty('cta label'),
  href: nonEmpty('cta href'),
});

const SiteSchema = z.object({
  name: nonEmpty('name'),
  /** The wordmark. What fits beside the crest in the header. */
  shortName: nonEmpty('shortName'),
  /** The line under the wordmark. */
  descriptor: nonEmpty('descriptor'),

  /**
   * The host production actually serves, and the one canonical links and the
   * sitemap are built from. It must match the host visitors end up on: Vercel
   * redirects the apex to www here, so a non-www value would put a redirecting
   * URL into every canonical tag and every sitemap entry.
   */
  domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'domain must be a bare hostname'),

  /** The `lang` attribute on <html>. A bare language tag: "en", "fr". */
  locale: nonEmpty('locale'),
  /**
   * The `og:locale` tag, which wants language AND territory joined by an
   * underscore ("en_NG"), not the bare tag <html lang> wants. They are
   * deliberately two fields: deriving one from the other means owning a
   * country-to-territory-code table for a value a school types once.
   */
  ogLocale: z
    .string()
    .regex(/^[a-z]{2}_[A-Z]{2}$/, 'ogLocale must look like en_NG'),

  logo: z.object({
    src: nonEmpty('logo.src'),
    alt: nonEmpty('logo.alt'),
  }),

  address: Address,
  phones: z.array(Phone).min(1, 'at least one phone number is required'),
  email: z.string().email('email must be a valid address'),
  officeHours: nonEmpty('officeHours'),

  /** Default <title> and meta description, used by any page that passes none. */
  defaultTitle: nonEmpty('defaultTitle'),
  defaultDescription: nonEmpty('defaultDescription'),
  /** The paragraph beside the crest in the footer. */
  footerBlurb: nonEmpty('footerBlurb'),

  /**
   * Fixed rather than `new Date().getFullYear()`, so two builds of the same
   * commit produce the same bytes. A footer year that changes on its own is a
   * diff nobody authored, appearing in whichever deploy happens to straddle
   * new year.
   */
  copyrightYear: z.number().int().min(2000),

  nav: z.array(NavItem).min(1),
  /** Extra footer links that are not in the main navigation. */
  footerLinks: z.array(NavItem),
  /** The bottom bar, beside the copyright line. */
  legalLinks: z.array(NavItem),

  ctas: z.object({
    /** The button in the header and the mobile menu. */
    visit: Cta,
    /** Where the utility bar's highlighted link goes. */
    portal: Cta,
  }),
});

const config = {
  // TODO Every value in this block. `npm run check` fails while a TODO
  // survives into the build, so nothing here can reach production by accident.
  name: 'Unifac',
  shortName: 'Unifac',
  descriptor: 'School',

  domain: 'www.example.com',
  locale: 'en',
  ogLocale: 'en_NG',

  logo: {
    src: '/logo.png',
    alt: 'Unifac crest',
  },

  address: {
    street: 'TODO: street address',
    landmark: '',
    area: 'TODO: area',
    district: '',
    city: 'City',
    region: 'Region',
    country: 'Nigeria',
    short: 'TODO: short address, one line',
    mapsQuery: 'Unifac City',
  },

  phones: [{ display: '0800 000 0000', dial: '+2348000000000' }],
  email: 'hello@example.com',
  officeHours: 'Monday - Friday, 8:00am - 4:00pm',

  defaultTitle: 'Unifac - City',
  defaultDescription: 'TODO: one sentence describing Unifac, for search results and link previews.',
  footerBlurb: 'TODO: two sentences about Unifac, shown beside the crest in the footer.',

  copyrightYear: 2026,

  nav: [
    { href: '/about', label: 'About', key: 'about' },
    { href: '/academics', label: 'Academics', key: 'academics' },
    { href: '/admissions', label: 'Admissions', key: 'admissions' },
    { href: '/school-life', label: 'School Life', key: 'school-life' },
    { href: '/portal', label: 'Portal', key: 'portal', feature: 'portal' },
    { href: '/news', label: 'News', key: 'news', feature: 'news' },
    { href: '/contact', label: 'Contact', key: 'contact' },
  ],

  footerLinks: [
    { href: '/about', label: 'About the School', key: 'about' },
    { href: '/academics', label: 'Academics', key: 'academics' },
    { href: '/admissions', label: 'Admissions', key: 'admissions' },
    { href: '/school-life', label: 'School Life', key: 'school-life' },
    { href: '/portal', label: 'Portal Sign-in', key: 'portal', feature: 'portal' },
    { href: '/portal/students', label: 'Student Portal', key: 'portal-students', feature: 'portal' },
    { href: '/portal/staff', label: 'Staff Portal', key: 'portal-staff', feature: 'portal' },
    { href: '/portal/help', label: 'Sign-in Guide', key: 'portal-help', feature: 'portal' },
    { href: '/news', label: 'News & Events', key: 'news', feature: 'news' },
    { href: '/contact', label: 'Contact', key: 'contact' },
  ],

  legalLinks: [
    { href: '/privacy', label: 'Privacy', key: 'privacy' },
    { href: '/for-schools', label: 'For Schools', key: 'for-schools', feature: 'forSchools' },
  ],

  ctas: {
    visit: { label: 'Book a Visit', href: '/admissions' },
    portal: { label: 'Portal Sign-in', href: '/portal' },
  },
};

/**
 * Parsed, not merely typed. TypeScript would catch a missing field, but
 * `astro build` does not type check, so a type alone would let a half filled
 * config reach production. This throws during the build instead.
 */
export const site = SiteSchema.parse(config);

export type Site = typeof site;
export type NavItem = z.infer<typeof NavItem>;

/**
 * The registrable domain, with any `www.` stripped.
 *
 * The applications answer on sibling subdomains (portal.*, learn.*), so they
 * hang off this rather than off `domain`. Writing `portal.www.example.com`
 * would be nobody's intention and is exactly what naive concatenation gives.
 */
export const apexDomain = site.domain.replace(/^www\./, '');

/** The canonical origin, for `site` in astro.config and for absolute URLs. */
export const origin = `https://${site.domain}`;

/** Google Maps link for the school's address. */
export const mapsUrl = `https://maps.google.com/?q=${site.address.mapsQuery.replace(/\s+/g, '+')}`;

/** The address as one line, for the footer and the contact page. */
export const addressLine = [
  site.address.street,
  site.address.landmark,
  site.address.area,
  site.address.district,
  site.address.city,
  site.address.region,
]
  .filter(Boolean)
  .join(', ');

/**
 * `mailto:` for the school office, with an optional pre-filled subject.
 *
 * Parentheses are encoded on top of what encodeURIComponent does. It leaves
 * them alone, being a URI component encoder rather than a mailto one, and
 * RFC 6068 asks for them escaped in the header of a mailto. Some mail clients
 * treat a bare "(" as the end of the subject.
 */
export function mailto(subject?: string) {
  if (!subject) return `mailto:${site.email}`;
  const encoded = encodeURIComponent(subject).replace(
    /[()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
  return `mailto:${site.email}?subject=${encoded}`;
}

/** `tel:` for one of the school's numbers, first by default. */
export function tel(index = 0) {
  const phone = site.phones[index] ?? site.phones[0];
  return `tel:${phone.dial}`;
}

/** The display form of one of the school's numbers, first by default. */
export function phoneLabel(index = 0) {
  return (site.phones[index] ?? site.phones[0]).display;
}
