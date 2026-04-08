import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const docsRoot = path.join(repoRoot, 'interview-prep');
const absolutePrefix = `${docsRoot}/`;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeTarget(targetPath) {
  const clean = targetPath.replace(/\\/g, '/');
  const absTarget = clean.startsWith('/') ? clean : path.join(docsRoot, clean);
  if (fs.existsSync(absTarget) && fs.statSync(absTarget).isDirectory()) {
    const readmeMd = path.join(absTarget, 'README.md');
    const readmeMdx = path.join(absTarget, 'README.mdx');
    if (fs.existsSync(readmeMd)) return readmeMd;
    if (fs.existsSync(readmeMdx)) return readmeMdx;
  }
  return absTarget;
}

function rewriteContent(filePath, content) {
  const markdownLinkRegex = /\]\((\/Users\/[^)\s]+)\)/g;
  return content.replace(markdownLinkRegex, (_, rawTarget) => {
    if (!rawTarget.startsWith(absolutePrefix) && !rawTarget.startsWith(docsRoot)) {
      return `](${rawTarget})`;
    }
    const target = normalizeTarget(rawTarget);
    const relative = path.relative(path.dirname(filePath), target).replace(/\\/g, '/');
    return `](${relative})`;
  });
}

let changed = 0;
for (const filePath of walk(docsRoot)) {
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = rewriteContent(filePath, original);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
    changed += 1;
  }
}

console.log(`Rewrote absolute markdown links in ${changed} files.`);
