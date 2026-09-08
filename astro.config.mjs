import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { origin } from './src/config/site';

// `site` must match the host production actually serves, because it is what
// every canonical link and every sitemap entry is built from. Vercel redirects
// the apex to www here, so a non-www value would put a redirecting URL into
// all of them.
//
// It is read from src/config/site.ts rather than written out again. Two copies
// of a domain is one copy too many: the wrong half gets updated when a school
// changes host, and the symptom is a sitemap full of URLs that 301 elsewhere,
// which nobody notices until the rankings do.
export default defineConfig({
  site: origin,
  integrations: [sitemap()],
});
