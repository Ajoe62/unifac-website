/**
 * Every link from this static site into an application.
 *
 * The site itself stays a plain static build. It never talks to Firebase and
 * never holds a credential. It only points at URLs, so this file is the whole
 * integration surface.
 *
 * THE SHAPE OF THE JOURNEY, and why it is not a set of raw outbound links.
 * A visitor who clicks "Portal" lands on OUR chooser first (/portal), picks
 * one of three doors, and only then crosses into an application. Every screen
 * before the crossing carries the school's crest, colours and wording, and the
 * screen that does the crossing says which application it is handing them to.
 * Sending a parent straight from a school page into an unfamiliar product is
 * what made the portal feel like somebody else's software.
 *
 * THE SCHOOL IS IDENTIFIED BY THE HOST, and by nothing else. Both applications
 * answer on a subdomain of the school's own domain, so the address itself
 * already says which school this is. Nothing below carries an /s/{slug} path
 * segment: a slug in the URL would be a second source of truth about the
 * school's identity, free to disagree with the host, and it is exactly that
 * disagreement which once handed a child a picker listing every
 * other school. One school, one name, in one place.
 *
 * WHAT CHANGED WHEN THIS BECAME A TEMPLATE. The two hosts used to be written
 * out in full, which meant the next school had to retype its own domain in a
 * file that is otherwise about applications rather than about the school. They
 * are now built from `apexDomain`, so a school that follows the portal.* and
 * learn.* convention needs no edit here at all, and one that does not can
 * still write a host out in full.
 */

import { z } from 'zod';
import { apexDomain } from './site';

const App = z.object({
  /** Shown to a visitor on the handoff line, so name it as the school does. */
  name: z.string().min(1),
  /** Completes the sentence "Opens ResultPeak, ...". Lower case, no full stop. */
  role: z.string().min(1),
  /** Full origin. Defaults to `<subdomain>.<apex>` for the usual arrangement. */
  origin: z.string().url(),
  /**
   * Whether this application is serving this school YET.
   *
   * Separate from the feature flags in features.ts, which say whether the
   * school has a portal at all. Assessments and lessons went live here in
   * different terms, and a single site wide switch could not express that.
   * Anything not live renders as an inert "opening soon" card, because a
   * child's first experience of the school's site should not be a failed
   * login.
   */
  live: z.boolean(),
});

const IntegrationsSchema = z.object({
  apps: z.record(z.string(), App),
  routes: z.record(z.string(), z.object({ app: z.string(), path: z.string() })),
  launch: z.record(z.string(), z.boolean()),
});

const config = {
  apps: {
    /** Assessments, exams and result sheets. */
    resultpeak: {
      name: 'ResultPeak',
      role: "the school's assessment and results system",
      origin: `https://portal.${apexDomain}`,
      // Live since 2026-09-17. Both hosts are registered against Unifac's school
      // record in ResultPeak's `schoolDomains`, which is what makes each one wear
      // the school's crest and colours before anybody signs in.
      live: true,
    },
    /** Lessons, summaries, practice questions and assignments. */
    jdsmartlearn: {
      name: 'JDSmartLearn',
      role: "the school's lessons and assignments platform",
      origin: `https://learn.${apexDomain}`,
      live: true,
    },
  },

  /**
   * Every destination, named once, each pointing at the application that
   * answers it. Naming the application per route rather than per link is what
   * lets the handoff line be generated instead of typed, so no card can
   * quietly stop saying where it is sending somebody.
   */
  routes: {
    /** Student sign-in for an exam or assessment. The host names the school. */
    exam: { app: 'resultpeak', path: '/start' },
    /** Entrance examination for prospective students. */
    entrance: { app: 'resultpeak', path: '/start/entrance' },
    /** Standalone result lookup. Gated by the resultLookup launch flag. */
    results: { app: 'resultpeak', path: '/results' },
    /** Marks, exams and result sheets. ResultPeak routes tutors and admins by role. */
    staffResultPeak: { app: 'resultpeak', path: '/admin/login' },
    /**
     * The school administrator's door.
     *
     * The same address as staffResultPeak, and deliberately named separately.
     * Staff and administrators are told to go to different places by the people
     * who train them, so the site says two names even where one host answers
     * both. If ResultPeak ever splits the two, only this line changes.
     */
    admin: { app: 'resultpeak', path: '/admin/login' },
    /** Student sign-in for lessons: the subdomain's own front door. */
    lessons: { app: 'jdsmartlearn', path: '/' },
    /** Lesson authoring. A tutor's claims already carry the school. */
    staffLearn: { app: 'jdsmartlearn', path: '/tutor' },
  },

  /**
   * Per destination launch flags, for the cases an application being live does
   * not settle.
   */
  launch: {
    /**
     * Set false out of season, or if the entrance paper is not configured, and
     * the admissions callout disappears rather than sending a prospective
     * family into an empty sign-in.
     */
    entrance: true,
    /**
     * Flip when ResultPeak ships a standalone result lookup (username + code
     * to a published term result sheet). Until then the results card explains
     * how result sheets are issued instead of linking into a flow that only
     * exists immediately after sitting a paper.
     */
    results: false,
  },
};

export const integrations = IntegrationsSchema.parse(config);

export const APPS = integrations.apps;

export type RouteKey = keyof typeof config.routes;

/** Which application a destination belongs to, or null if the key is unknown. */
export function appFor(key?: string | null) {
  if (!key) return null;
  const route = integrations.routes[key];
  return route ? integrations.apps[route.app] ?? null : null;
}

/**
 * Resolves a destination against the launch flags, so no page repeats the
 * conditional. Returns null when the destination is not live yet; callers
 * render a non-clickable card instead of a broken link.
 */
export function portalHref(key: string): string | null {
  const route = integrations.routes[key];
  if (!route) return null;

  const app = integrations.apps[route.app];
  if (!app || !app.live) return null;

  // A destination may additionally be gated in its own right. Absent means
  // ungated, so only the flags that are actually written down can hide a link.
  if (integrations.launch[key] === false) return null;

  return `${app.origin}${route.path}`;
}

/** True when any student facing destination works, for page level messaging. */
export const portalLive = Object.values(integrations.apps).some((a) => a.live);

/**
 * Whether one destination is reachable, for the copy around it rather than for
 * the link itself. A page that says "online lookup is not open yet" and a card
 * that refuses to link there must never disagree, so both ask this.
 */
export function routeLive(key: string): boolean {
  return portalHref(key) !== null;
}

/** Whether one application is serving this school yet. */
export function appLive(key: string): boolean {
  return integrations.apps[key]?.live === true;
}
