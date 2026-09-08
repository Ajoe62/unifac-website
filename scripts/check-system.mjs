#!/usr/bin/env node
/**
 * The rule that makes template fixes reachable.
 *
 * Sites are spun up by cloning this repo, so a bug fixed here has to reach the
 * live sites that already exist. That only stays possible while those sites
 * have not rewritten the files the fix lands in.
 *
 * So: a client repo never edits src/system/. Everything a school needs to be
 * itself lives in brand/, src/config/, src/content/ and public/. If a client
 * genuinely needs a change under src/system/, it belongs upstream, in the
 * template, where every other school gets it too. That is not bureaucracy, it
 * is the difference between eight sites and eight forks.
 *
 * Enabled by "templateRole": "client" in package.json, which scripts/new-site
 * sets. In the template repo itself the role is "template" and editing
 * src/system is the entire job, so the check passes and says so.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const role = pkg.templateRole ?? 'template';

if (role !== 'client') {
  console.log(`\n  templateRole is "${role}": src/system is editable here.\n`);
  process.exit(0);
}

/*
 * WHAT IS COMPARED, and why it changed.
 *
 * This used to diff the working branch against its own base: `git diff
 * base...HEAD`. That answers "did this branch touch src/system", which is a
 * question about a pull request rather than about a site. It also cannot
 * answer anything at all on a site whose history shares no merge base with
 * the template, which is every site created by cloning.
 *
 * The invariant is simpler than that. src/system is supposed to be IDENTICAL
 * to the template's, whatever route the files took to get here. So compare
 * the directory against the template's directly. That works on any branch, on
 * unrelated histories, and on a site whose last sync was a file copy.
 *
 * A `template` remote is preferred over `origin`, because a site cloned from
 * the template has both and only one of them is the template.
 */
const refs = process.env.SYSTEM_GUARD_BASE
  ? [process.env.SYSTEM_GUARD_BASE]
  : ['template/master', 'template/main', 'origin/master', 'origin/main'];

let offending = null;
let base = null;

for (const ref of refs) {
  try {
    /*
     * Two dots, not three. A merge base is exactly what an unrelated history
     * does not have, and asking for one is how this check used to disqualify
     * itself on the sites it most needed to run on.
     *
     * stderr is discarded deliberately. Run outside a repository, git prints
     * its entire hundred line usage dump, and that dump was the first thing a
     * new site owner saw from `npm run check`, ahead of the one sentence
     * saying nothing was wrong.
     */
    offending = execSync(`git diff --name-only ${ref} -- src/system/`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    base = ref;
    break;
  } catch {
    // Not this one. Try the next.
  }
}

if (offending === null) {
  // A freshly copied site has no repository and no template remote yet, and
  // the first thing anybody does with it is run the build. Failing here would
  // block every new site on day one, to guard against an edit nobody has yet
  // had the chance to make. Warn and pass. CI adds the remote and never
  // reaches this branch, so the guard keeps its teeth where it needs them.
  console.log(
    `\n  Skipping the system guard: no template to compare against.` +
      `\n  Tried: ${refs.join(', ')}.` +
      `\n  Expected in a fresh copy. Add the template as a remote to enable it:` +
      `\n    git remote add template <template repo url> && git fetch template\n`,
  );
  process.exit(0);
}

if (offending.length === 0) {
  console.log(
    `\n  src/system is identical to ${base}. Template fixes stay reachable.\n`,
  );
  process.exit(0);
}

console.error(`
  src/system differs from ${base} in ${offending.length} file(s):

${offending.map((f) => `    ${f}`).join('\n')}

  src/system is shared with every site built from this template, and a local
  edit here is what makes the next upstream fix unmergeable.

  If this is branding, it belongs in brand/ or src/config/.
  If this is content, it belongs in src/content/.
  If it is a genuine improvement, make it in the template and pull it back:

    git fetch template && git checkout ${base} -- src/system/ scripts/

  That command is also the fix when these differences are stale rather than
  deliberate: it takes the template's copy wholesale. The per-school palette
  lives in brand/palette.css and is not touched by it.
`);
process.exit(1);
