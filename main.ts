// Marlowe Budget — entrypoint (Node 22, standard library only).
//
// The program hands the site in: it copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there,
// the summary the judge reads (screenshots, first-load files and bytes, and
// the site's source), using the vendored make.fun library. Leave
// vendor/makefun-frontend.ts untouched: the scorer rebuilds the dossier
// with its own copy and requires a byte-for-byte match.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);

// Small self-check so a bad run is obvious: the dossier must exist and the
// site must have been copied beside it.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log('Marlowe Budget handed in: dossier.json is ' + dossierBytes + ' bytes in ' + out);
