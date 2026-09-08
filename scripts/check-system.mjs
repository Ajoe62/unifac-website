#!/usr/bin/env node
/**
 * The rule that makes template fixes reachable.
 *
 * Sites are spun up by copying this repo, so a bug fixed here has to be
 * cherry-picked into the live sites that already exist. That only stays
 * possible while those sites have not rewritten the files the fix lands in.
 *
 * So: a client repo never edits src/system/. Everything a school needs to be
 * itself lives in brand/, src/config/, src/content/ and public/. If a client
 * genuinely needs a change under src/system/, it belongs upstream, in this
 * repo, where every other school gets it too. That is not bureaucracy, it is
 * the difference between eight sites and eight forks.
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
 * Candidates, not a single guess. A site cloned from the template has an
 * upstream called `template`; one with its own remote has `origin`; and the
 * default branch is `main` in some repos and `master` in others. Hardcoding
 * one of those combinations gives a guard that silently never runs everywhere
 * else, which is worse than no guard because it reports success.
 */
const bases = process.env.SYSTEM_GUARD_BASE
  ? [process.env.SYSTEM_GUARD_BASE]
  : ['template/master', 'template/main', 'origin/master', 'origin/main'];

let changed = null;
let base = null;
for (const candidate of bases) {
  try {
    /*
     * stderr is discarded deliberately. Run outside a repository, git prints
     * its entire hundred line usage dump, and that dump was the first thing a
     * new site owner saw from `npm run check`, ahead of the one sentence
     * saying nothing is wrong. The failure is expected and handled below.
     */
    changed = execSync(`git diff --name-only ${candidate}...HEAD`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    base = candidate;
    break;
  } catch {
    // Not this one. Try the next.
  }
}

if (changed === null) {
  // A freshly copied site has no repository and no upstream yet, and the first
  // thing anybody does with it is run the build. Failing here would block every
  // new site on day one, to guard against an edit nobody has yet had the
  // chance to make. Warn and pass. CI passes a real base ref and never reaches
  // this branch, so the guard still has teeth exactly where it needs them.
  console.log(
    `\n  Skipping the system guard: no base to diff against.` +
      `\n  Tried: ${bases.join(', ')}.` +
      `\n  Expected in a fresh copy. It runs for real in CI, and locally once` +
      `\n  the repo has an upstream.\n`,
  );
  process.exit(0);
}

const offending = changed.filter((f) => f.startsWith('src/system/') && !f.startsWith('src/system/styles/generated/'));

if (offending.length === 0) {
  console.log(`\n  No changes under src/system (vs ${base}). Template fixes stay reachable.\n`);
  process.exit(0);
}

console.error(`
  This client repo has changed ${offending.length} file(s) under src/system:

${offending.map((f) => `    ${f}`).join('\n')}

  src/system is shared with every other site built from this template, and a
  local edit here is what makes the next upstream fix unmergeable.

  If this is branding, it belongs in brand/ or src/config/.
  If this is content, it belongs in src/content/.
  If it is a genuine improvement, send it upstream and cherry-pick it back.

  (src/system/styles/generated/ is exempt: brand:init writes it per school.)
`);
process.exit(1);
