/**
 * Site motion: entrances on scroll, the header's scrolled state and the
 * reading progress line. What each class looks like is in src/styles/motion.css.
 */

// Kept in step with the list in motion.css; see the note at the top of that file.
const TARGETS = [
  '.sec-head',
  '.page-hero .wrap > *',
  '.hero-content > *',
  '.facts .f',
  '.welcome .wrap > *',
  '.mt-body',
  '.mt-media',
  '.fb-content > *',
  '.cs-viewport',
  '.prog > *',
  '.grid3 > *',
  '.steps > *',
  '.feat-grid > *',
  '.values-grid > *',
  '.contact-grid > *',
  '.two-col > *',
  '.band .wrap > *',
  '.portal-strip .wrap > *',
  'footer.site .wrap > *',
].join(',');

const STAGGER_MS = 90;
const MAX_STAGGER = 6;
// Longest transition in motion.css plus headroom, in case transitionend never comes.
const FALLBACK_MS = 1800;

const html = document.documentElement;

function reveals() {
  if (!html.classList.contains('motion')) return;
  // Tells the inline guard in Layout.astro that motion started, so it keeps .motion.
  html.setAttribute('data-motion-live', '');

  const finish = (el: HTMLElement) => {
    el.classList.add('rv-done');
    el.classList.remove('rv-in');
    el.style.removeProperty('--rv-delay');
  };

  const show = (el: HTMLElement, order: number) => {
    const delay = Math.min(order, MAX_STAGGER) * STAGGER_MS;
    el.style.setProperty('--rv-delay', `${delay}ms`);
    el.classList.add('rv-in');
    const done = () => {
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      finish(el);
    };
    // Transitions on children bubble up, so only the element's own counts.
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === 'transform') done();
    };
    const timer = window.setTimeout(done, delay + FALLBACK_MS);
    el.addEventListener('transitionend', onEnd);
  };

  const io = new IntersectionObserver(
    (entries) => {
      // Siblings that arrive in the same moment cascade instead of landing at once.
      const groups = new Map<Element | null, HTMLElement[]>();
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        const group = groups.get(el.parentElement) ?? [];
        group.push(el);
        groups.set(el.parentElement, group);
      }
      for (const group of groups.values()) group.forEach((el, i) => show(el, i));
    },
    // No negative bottom margin: the last row of the footer sits at the very
    // bottom of the page, and a margin there is a zone it can never scroll into.
    { threshold: 0.1 },
  );

  for (const el of Array.from(document.querySelectorAll<HTMLElement>(TARGETS))) {
    // Already scrolled past, as on a reload halfway down: no entrance to watch.
    if (el.getBoundingClientRect().bottom < 0) finish(el);
    else io.observe(el);
  }
}

function chrome() {
  const header = document.querySelector<HTMLElement>('header.site');
  const progress = document.querySelector<HTMLElement>('.scroll-progress');
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 24);
    if (progress) {
      const max = html.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    }
  };
  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
}

reveals();
chrome();
