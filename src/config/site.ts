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

/**
 * One site the school teaches on.
 *
 * Unifac is a group of three campuses across Benin City, each with its own
 * street address and its own phone. The template's original shape assumed one
 * of each, which is true of most schools and not of this one. Rather than keep
 * a second copy of the main campus in `address`, the array below IS the source
 * and `address` points at whichever entry is the head office, so the two can
 * never drift apart.
 */
const Campus = Address.extend({
  /** How the school refers to this site, as a parent would hear it said. */
  name: nonEmpty('campus name'),
  /** Each campus answers its own line. */
  phone: Phone,
  /**
   * A WhatsApp line, where the campus keeps one. Optional because only Campus 1
   * does, and out here WhatsApp is often the number a parent actually uses.
   */
  whatsapp: Phone.optional(),
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
  /** Every campus, in the order the school lists them. */
  campuses: z.array(Campus).min(1, 'at least one campus is required'),
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

/**
 * The three campuses, in the order the school lists them.
 *
 * Oliha is the head office, so it is first and `address` points at it.
 *
 * `district` is left empty throughout: the LGA for each quarter was not given,
 * and an LGA guessed from a neighbourhood name is the kind of wrong that reads
 * as authoritative.
 *
 * Every `mapsQuery` ends "Edo State, Nigeria" where the displayed address stops
 * at the state. Benin City geocodes to the Republic of Benin often enough that
 * the country is worth the words here, and this string is never read by a
 * person: it exists only to be handed to Google Maps.
 */
const campuses = [
  {
    name: 'Campus 1',
    street: '1 Ribway Close, 2nd Uzama Street',
    landmark: '',
    area: 'Oliha Quarters',
    district: '',
    city: 'Benin City',
    region: 'Edo State',
    country: 'Nigeria',
    short: 'Oliha Quarters, Benin City',
    mapsQuery: '1 Ribway Close, 2nd Uzama Street, Oliha Quarters, Benin City, Edo State, Nigeria',
    phone: { display: '0913 715 7221', dial: '+2349137157221' },
    whatsapp: { display: '0913 715 7252', dial: '+2349137157252' },
  },
  {
    name: 'Campus 2',
    street: '2 Ikwebor Street, off 2nd Power Line',
    landmark: 'Aigbangbe Junction',
    area: 'Evbuotubu Quarters',
    district: '',
    city: 'Benin City',
    region: 'Edo State',
    country: 'Nigeria',
    short: 'Evbuotubu Quarters, Benin City',
    mapsQuery: '2 Ikwebor Street, 2nd Power Line, Evbuotubu Quarters, Benin City, Edo State, Nigeria',
    phone: { display: '0913 715 7247', dial: '+2349137157247' },
  },
  {
    name: 'Ogbomwan Campus',
    street: 'Km 4, 2nd Power Line, Upper Ekenwan Road',
    landmark: '',
    area: 'Ugbiyoko Quarters',
    district: '',
    city: 'Benin City',
    region: 'Edo State',
    country: 'Nigeria',
    short: 'Ugbiyoko Quarters, Benin City',
    mapsQuery: 'Upper Ekenwan Road, Ugbiyoko Quarters, Benin City, Edo State, Nigeria',
    phone: { display: '0915 078 3897', dial: '+2349150783897' },
  },
];

const config = {
  name: 'Unifac Group of Schools',
  shortName: 'Unifac',
  descriptor: 'Nursery, Primary & Secondary',

  domain: 'unifacsch.com.ng',
  locale: 'en',
  ogLocale: 'en_NG',

  logo: {
    src: '/logo.png',
    alt: 'Unifac Group of Schools crest',
  },

  /**
   * The head office, and the address the footer, the utility bar and the page
   * titles speak with. Oliha, confirmed by the school. It is an index into the
   * array rather than a second copy, so moving the head office is one edit.
   */
  address: campuses[0],
  campuses,

  /** One line per campus, in campus order. */
  phones: campuses.map((campus) => campus.phone),
  email: 'unifacsch@gmail.com',
  officeHours: 'Monday - Friday, 8:00am - 4:00pm',

  defaultTitle: 'Unifac Group of Schools - Benin City',
  defaultDescription:
    'Unifac Group of Schools is a nursery, primary and secondary school across three campuses in Benin City, Edo State.',
  footerBlurb:
    'Unifac Group of Schools teaches nursery, primary and secondary pupils across three campuses in Benin City. Our motto is Knowledge from God.',

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

type AddressLike = Site['address'];

/**
 * Google Maps link for any campus.
 *
 * Taken as an argument rather than read off `site.address`, because with three
 * campuses the interesting question is "where is THIS one", and a helper that
 * can only answer for the head office would be quietly wrong on two thirds of
 * the contact page.
 */
export function mapsUrlFor(address: AddressLike) {
  return `https://maps.google.com/?q=${address.mapsQuery.replace(/\s+/g, '+')}`;
}

/** The address as one line. Same reasoning: any campus, not just the first. */
export function addressLineFor(address: AddressLike) {
  return [
    address.street,
    address.landmark,
    address.area,
    address.district,
    address.city,
    address.region,
  ]
    .filter(Boolean)
    .join(', ');
}

/** Google Maps link for the head office, for the footer and the utility bar. */
export const mapsUrl = mapsUrlFor(site.address);

/** The head office address as one line. */
export const addressLine = addressLineFor(site.address);

/**
 * `https://wa.me/...` for a campus that keeps a WhatsApp line.
 *
 * wa.me wants the number without the leading `+`, and opens the app on a phone
 * and WhatsApp Web on a desktop. A `tel:` link to the same number would reach
 * the handset instead, which is not what a parent tapping "WhatsApp" means.
 */
export function whatsappUrl(phone: { dial: string }) {
  return `https://wa.me/${phone.dial.replace(/^\+/, '')}`;
}

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
