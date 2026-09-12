/**
 * robots.txt, generated from the domain rather than typed out.
 *
 * This was a static file in public/, and it still carried the sitemap URL of
 * the school this template was extracted from: it told Google that Unifac's
 * sitemap lived on mtcedarbritishinternationalsch.com.ng. Nothing caught it.
 * check:content reads the built HTML pages and looks for TODO and the
 * placeholder domain, and robots.txt is neither an HTML page nor either of
 * those strings.
 *
 * A hand-written host in a file nobody reads is a fact free to go stale, and
 * this one did. Building it from `origin` means the sitemap line follows
 * site.ts the way every canonical link already does, including the www that
 * Vercel actually serves.
 */
import type { APIRoute } from 'astro';
import { origin } from '../config/site';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
