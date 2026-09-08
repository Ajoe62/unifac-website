# School site template

A static Astro template for school websites. One shared system, one config
layer per school, one content directory per school. Nothing in `src/system/`
differs between sites, which is what makes a fix here reachable by every site
already built from it.

Everything in this repo is placeholder. `TODO` appears in the visible copy on
purpose: `npm run check:content` fails the build while any of it survives in a
site built from this template, so a half-written site is something you cannot
deploy rather than something you might not notice.

**Proven against two real deploys** before it was extracted here, which is
where most of the reasoning in this file comes from. Where a comment cites a
specific failure, that failure happened.

---

## The half day

```bash
git clone https://github.com/Ajoe62/school-site-template.git greenfield-academy
cd greenfield-academy && npm i

# Keep the link to the template so system fixes can be pulled later, and
# point origin at this school's own repo.
git remote rename origin template
git remote add origin <this school's repo url>

# 0. Identity, feature flags and the role flip that guards src/system.
node scripts/new-site.mjs --name "Greenfield Academy" --short Greenfield   --domain www.greenfield.ng --email hello@greenfield.ng   --city Lagos --region "Lagos State"

# 1. Brand. Drop the logo in, extract a palette, look at it.
cp ~/Downloads/greenfield-crest.png brand/logo.png
npm run brand:init -- --logo brand/logo.png --preset modern-clean
open brand/preview.html          # swatches, contrast table, real components

# 2. Correct what the extractor got wrong. Two or three colours, usually.
#    Edit brand/brand.config.json, then re-run brand:init. Overrides win.

# 3. Identity. Name, address, phones, email, nav, CTAs.
$EDITOR src/config/site.ts

# 4. What this site has. Portal? News? For-schools page?
$EDITOR src/config/features.ts

# 5. Content. Markdown, one file per item.
$EDITOR src/content/{values,facilities,programmes,news,directions}/

# 6. Composition. Which blocks, in what order, on which grounds.
$EDITOR src/config/pages.ts

npm run check                    # contrast, system guard, build, links, metadata, placeholder copy
npm run dev
```

---

## The five layers, and which one you are allowed to touch

Everything is arranged so a new school edits four directories and nothing else.

| Layer | Path | Per school? |
|---|---|---|
| Palette, type, shape | `brand/`, `src/system/styles/generated/` | **Yes**, generated |
| Identity, flags, integrations | `src/config/` | **Yes**, hand written |
| Content | `src/content/` | **Yes**, Markdown |
| Images, favicons | `public/`, `src/assets/` | **Yes** |
| The system | `src/system/` | **No** |

`src/system/` holds the stylesheet layers, the block library, the icon registry
and the composer. It is identical across every site built from this template,
and that is what makes a fix here reachable by sites that already shipped:

```bash
git remote add template https://github.com/Ajoe62/school-site-template.git
git fetch template
git cherry-pick <sha>
```

`npm run check:system` enforces it in client repos, and CI runs it on every PR.
The exemption is `src/system/styles/generated/`, which `brand:init` writes.

If a client genuinely needs something under `src/system/`, it belongs upstream
where every other school gets it too. That is the difference between eight
sites and eight forks.

---

## The stylesheet chain

An order, not a set. Each layer may only read from the one above it.

```
generated/brand.css   what THIS school's colours and shapes ARE
tokens.css            what they MEAN   (--brand, --shadow-card, --on-accent)
reset.css             element defaults
surfaces.css          the four grounds a section may sit on
primitives.css        buttons, cards, measure, section rhythm
blocks.css            one stanza per section pattern
```

One rule holds the whole thing up: **no layer below `tokens.css` may contain a
colour literal that carries brand identity.** Neutral literals are fine, because
white means the same thing for every school. Before that rule existed, 25
hand-written `rgba(18, 60, 40, …)` values carried the Mt Cedar green through the
stylesheets, so swapping `:root` recoloured about 70% of a site and left the
rest quietly belonging to somebody else.

Colours are stored as RGB triplets, not hex, so every alpha variant derives:
`rgb(var(--brand-rgb) / .14)`. A hex value needs a second hand-written literal,
and the second literal is what rots.

### Why `--accent` and `--accent-text` are different tokens

An accent is chosen to look right as a **fill**. A gold that sits well on a
button is not readable at 11px on pale paper: Mt Cedar's was 2.39:1 against the
page, on every page, for months. Those are two jobs sharing one token.

- `--accent` — fills, rules, underlines, focus rings, anything on a dark ground
- `--accent-text` — eyebrows, tags, field labels: the accent darkened until it
  clears 4.5:1 on `--surface`

`brand:init` derives the second through the contrast gate, so every school gets
one without anyone remembering to.

---

## brand:init

```bash
npm run brand:init -- --logo brand/logo.png             # default preset
npm run brand:init -- --logo brand/logo.png --preset bold-editorial
npm run brand:init -- --logo brand/logo.png --dry-run   # print, write nothing
```

**Writes:** `src/system/styles/generated/brand.css`, `brand/fonts.json`,
`brand/preview.html`, `brand/.brand-report.json`, the favicon set and
`public/og-image.png`.

**It is a starting point, not a lock.** Extraction gets the palette roughly
right in seconds; the last twenty per cent is taste and belongs to a person.
Anything in `brand/brand.config.json` under `overrides` beats what the logo says
and survives re-running. On Mt Cedar's own crest the extractor finds the cedar
green correctly and picks the crest's red as the accent rather than the gold,
because the gold is a small share of the image. That is a correct reading of the
logo and the wrong answer for the school, and it is exactly what overrides are
for.

**Presets** are shape, depth and rhythm decisions taken together, because taken
separately they fight:

| Preset | Feel |
|---|---|
| `classic-institutional` | serif display, pill buttons, warm ground, dotted texture |
| `modern-clean` | sans display, soft rectangles, flat shadows, no texture |
| `bold-editorial` | heavy display, square corners, dramatic depth, generous air |

Colour alone does not make two sites look different. Recolour one layout and it
is visibly the same page, which is the failure mode of every recoloured
template. The presets are what stop that.

---

## Blocks

A page spec names a block and a variant; the registry turns those two strings
into a component.

```ts
// src/config/pages.ts
export const home: SectionSpec[] = [
  { block: 'hero',    variant: 'carousel', props: { slides, headline, actions } },
  { block: 'stats',   variant: 'strip',    props: { stats } },
  { block: 'welcome', variant: 'quote',    surface: 'alt', props: { … } },
  { block: 'values',  variant: 'cards' },
  { block: 'feature', variant: 'grid',     surface: 'alt' },
  { block: 'cta',     variant: 'strip',    surface: 'brand', props: { … } },
  { block: 'cards',   variant: 'grid3',    props: { limit: 3 } },
  { block: 'cta',     variant: 'band',     surface: 'feature', props: { … } },
];
```

| Block | Variants |
|---|---|
| `hero` | `carousel`, `split`, `static` |
| `values` | `cards`, `numbered` |
| `cta` | `band`, `strip` |
| `media` | `text`, `fullbleed` |
| `cards` | `grid3` |
| `programmes` | `cards` |
| `feature` | `grid` |
| `stats` | `strip` |
| `welcome` | `quote` |
| `directions` | `routes` |

Surfaces are `base`, `alt`, `brand`, `feature`. A surface is not only a
background: putting a section on the brand colour also decides its heading, its
body copy, its eyebrow and its outlined buttons, and those five travel together
or the section is unreadable.

**Not every page needs a spec.** The homepage is composition, eight
interchangeable bands in a chosen order. The about and academics pages are
largely one school writing prose about itself, and turning a paragraph into a
config object buys indirection and nothing else. Those keep their own markup and
import blocks directly, which works equally well.

---

## Feature flags gate routes, not just links

```ts
// src/config/features.ts
export const features = { portal: true, news: true, forSchools: true, … };
```

Setting `news: false` removes the header link, the mobile menu entry and the
footer link — and stops `/news` being emitted at all. The optional pages are
rest routes whose `getStaticPaths` returns one path or none. A link that
survives its feature being switched off is a 404 with a signpost pointing at it.

Whether a school **has** a thing is `features.ts`. Whether a thing it has is
**ready** is `integrations.ts`, next to the URLs it gates, because a school can
own a portal that is not open yet and the two questions get different answers in
different weeks.

---

## Content

| Collection | What it holds |
|---|---|
| `values` | The school's promises. Homepage and about page read the same files. |
| `facilities` | Labs, studios, library. Each names an icon from the registry. |
| `programmes` | The stages a child passes through. |
| `news` | Posts. `order` decides the sequence so a notice can be pinned. |
| `directions` | The two routes families actually use. Markdown body, for the bold landmark names. |

Bodies live in frontmatter except for `directions`, which needs inline emphasis.
Icons are named (`icon: flask`), never pasted: an unknown name fails the build
and lists the valid ones. See `src/system/components/Icon.astro`.

---

## Verifying a refactor

Every phase of this conversion was checked by building the previous commit and
diffing the output. The harness is worth keeping:

```bash
git stash -u && npx astro build --outDir dist-old && git stash pop
npx astro build --outDir dist-new
# then diff dist-old against dist-new, ignoring asset hashes
```

Two things that will bite you when reading such a diff: the old build stored
alpha as 8-bit hex, so an authored `.14` reads back as `.141`; and a value that
moves from a restatement to an inheritance shows up as a deletion even though
nothing changed.

`npm run check` runs the contrast gate, the system guard, the build, the link
check and the metadata check.

### brand/brand.config.json is not optional

`brand:init` reads a logo and guesses. It guesses well, and it is still a guess:
on Mt Cedar's own crest it proposes a **salmon accent and a purple feature band**,
because clustering the image finds green and red and cannot know which of them
the school considers its second colour. A logo cannot tell it.

`brand/brand.config.json` is where you correct that, and it **must be committed**.
Without it, a fresh clone plus one `brand:init` run silently repaints a live
site. `brand`, `accent` and `feature` are source colours: pinning one of those
three re-derives everything hanging off it (`--accent-300`, `--accent-deep`,
`--accent-text`, both surface tints), which is what you want. Pin the two or
three the extractor gets wrong and let the rest derive.

Mt Cedar pins its whole palette, because that palette was chosen by a designer
years before this tool existed. A new school should pin far less.

---

## Pulling a fix down from the template

`src/system/` is byte identical across every site, and `check:system` fails a
client repo that edits it. That guarantee is what makes syncing trivial:

```bash
git fetch template
git checkout template/master -- src/system/ scripts/
npm run check
```

Taking the directory wholesale is deliberate. Merging would ask git to reconcile
two histories that diverged on config and content, which is exactly the part
each school owns and the template must never overwrite.
