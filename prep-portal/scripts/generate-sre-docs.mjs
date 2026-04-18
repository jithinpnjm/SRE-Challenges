import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const OUT_FILE = path.resolve(__dirname, '../static/sre-docs.json');

const SCAN_DIRS = [
  'interview-prep/nebius',       // Nebius-specific interview prep (highest priority)
  'interview-prep/foundations',
  'interview-prep/hands-on-labs',
  'interview-prep/mock-interviews',
  'interview-prep',
];

function walkMd(dir, base = '') {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        results.push(...walkMd(full, rel));
      } else if (entry.endsWith('.md')) {
        results.push({ full, rel });
      }
    }
  } catch {}
  return results;
}

const seen = new Set();
const docs = [];

for (const dir of SCAN_DIRS) {
  const absDir = path.join(REPO_ROOT, dir);
  for (const { full, rel } of walkMd(absDir)) {
    if (seen.has(full)) continue;
    seen.add(full);
    try {
      const content = readFileSync(full, 'utf8');
      docs.push({ path: path.join(dir, rel), content });
    } catch {}
  }
}

const output = {
  generated: new Date().toISOString(),
  totalFiles: docs.length,
  docs,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 0));
console.log(`[sre-docs] Generated ${docs.length} files → static/sre-docs.json`);
