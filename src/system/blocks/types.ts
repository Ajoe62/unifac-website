/**
 * Shared block prop shapes.
 *
 * Kept in a .ts file rather than exported from a .astro component so a config
 * file can import the type without pulling a component into the module graph.
 */
export interface Action {
  label: string;
  href: string;
  /** Which button treatment. Defaults to the primary one for the first action. */
  variant?: 'gold' | 'ghost' | 'brand' | 'outline';
  /** The nudging arrow. On for the primary action, off for the secondary. */
  arrow?: boolean;
  /** Set on anything leaving the site. */
  rel?: string;
  large?: boolean;
}

/**
 * The ground a section sits on. Four named choices, defined once, because a
 * surface decides a background AND what the heading, body and eyebrow on it
 * must become. Those travel together or the section is unreadable.
 */
export type Surface = 'base' | 'alt' | 'brand' | 'feature';
