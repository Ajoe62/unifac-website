/**
 * The content the school edits, and its shape.
 *
 * Everything here was previously markup. Six facility cards lived inside
 * Facilities.astro with their icons pasted in as SVG paths; the values trio,
 * the four programme stages and the six news items were arrays and <div>s in
 * the pages that rendered them. Adding a news item meant editing a page.
 *
 * WHY THESE FIVE AND NOT THE REST. A collection earns its place when there is
 * a LIST of like things that a school will add to or remove from. Prose that
 * happens to sit in a section is not that: the "Our Approach" paragraphs on
 * the academics page are one school's writing about itself, rewritten wholesale
 * for the next school, and putting them in Markdown buys a directory listing
 * and nothing else. Those become block props in Phase 4.
 *
 * WHY EVERY BODY IS FRONTMATTER, EXCEPT DIRECTIONS. A one paragraph summary in
 * frontmatter renders as exactly the <p> the markup used to hold, byte for
 * byte. The directions bodies are the exception because they carry inline
 * emphasis on the landmark names, which is the whole reason a family can
 * follow them, and that wants Markdown.
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Sort keys are explicit rather than inferred from filename or date.
 *
 * A school reorders these by hand and needs the order to be stable and
 * obvious. News is the one that will eventually want a date, and it has one:
 * `order` still decides the sequence so that a school pinning an admissions
 * notice to the top does not have to backdate it.
 */
const order = z.number().int();

const dir = (name: string) =>
  glob({ pattern: '**/*.md', base: `./src/content/${name}` });

const news = defineCollection({
  loader: dir('news'),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      /** The small uppercase label above the headline. */
      tag: z.string().min(1),
      summary: z.string().min(1),
      cover: image(),
      /** Never the headline reworded. A screen reader user gets both. */
      coverAlt: z.string().min(1),
      date: z.coerce.date().optional(),
      order,
    }),
});

const programmes = defineCollection({
  loader: dir('programmes'),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      /** "Ages 2-5", "JSS 1-3". Free text because school systems differ. */
      stage: z.string().min(1),
      summary: z.string().min(1),
      cover: image(),
      coverAlt: z.string().min(1),
      order,
    }),
});

const facilities = defineCollection({
  loader: dir('facilities'),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    /** A name from the Icon registry. An unknown name fails the build. */
    icon: z.string().min(1),
    order,
  }),
});

const values = defineCollection({
  loader: dir('values'),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    icon: z.string().min(1),
    order,
  }),
});

const directions = defineCollection({
  loader: dir('directions'),
  schema: z.object({
    /** "Coming from Presco". Written from the visitor's starting point. */
    title: z.string().min(1),
    icon: z.string().min(1),
    order,
  }),
});

export const collections = { news, programmes, facilities, values, directions };
