// Hearth & Ledger — handover program for the best-household-budget-site-20261126-1457 entry
// (Node 22, standard library only).
//
// The site lives in app/ as plain static files (app/index.html and its classic scripts and
// stylesheet, no library, no network request): a household budget book for one worked-example
// family — a month view with a five-month switcher, eleven spending envelopes with pace notes
// and a working add-an-expense form, a bills page with due dates, paid tick-offs and an
// add-a-bill form, savings goals whose finish lines move with a slider, a year view that sums
// all five months into a cumulative savings line and a month-by-month table, and an insights
// page with the spending donut, an honest 50/30/20 check and a what-if bench that rehearses
// trimming the "want" envelopes. Every total is computed from the same entries, so the books balance.
// This program hands it in: it copies app/ and screenshots/ into the output directory, verifies
// what it copied against the scorer's caps, and writes dossier.json with the vendored make.fun
// library (vendor/makefun-frontend.ts, left exactly as the kit shipped it, because the scorer
// requires the dossier to be byte for byte what its own copy writes).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the site locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty: at most 4 screenshots, none over 256 KiB; app/ at most 993
// files and directories and 16 MiB in all. The handover refuses to write a dossier for an output
// that breaks them, so a broken entry fails here, loudly, instead of at grading.
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 262144;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 16777216;

function copyIn() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
}

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      const sub = countTree(p);
      files += sub.files + 1;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

function verifyOutput() {
  const problems = [];
  if (!existsSync(join(out, 'app', 'index.html'))) problems.push('app/index.html is missing');
  const appTree = countTree(join(out, 'app'));
  if (appTree.files > APP_MAX_FILES) problems.push(`app/ holds ${appTree.files} files and directories, over the ${APP_MAX_FILES} cap`);
  if (appTree.bytes > APP_MAX_BYTES) problems.push(`app/ is ${appTree.bytes} bytes, over the ${APP_MAX_BYTES} cap`);
  const shots = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.'));
  if (shots.length < 3 || shots.length > SHOT_MAX) problems.push(`screenshots/ holds ${shots.length} images, outside the 3-${SHOT_MAX} range`);
  for (const name of shots) {
    const size = statSync(join(out, 'screenshots', name)).size;
    if (size > SHOT_MAX_BYTES) problems.push(`screenshots/${name} is ${size} bytes, over the ${SHOT_MAX_BYTES} cap`);
  }
  if (problems.length > 0) {
    throw new Error(`Hearth & Ledger handover refuses this output:\n- ${problems.join('\n- ')}`);
  }
  return { appFiles: appTree.files, shots: shots.length };
}

copyIn();
const summary = verifyOutput();
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);
console.log(`Hearth & Ledger handed in: ${summary.appFiles} app files, ${summary.shots} screenshots, dossier written to ${join(out, 'dossier.json')}`);
