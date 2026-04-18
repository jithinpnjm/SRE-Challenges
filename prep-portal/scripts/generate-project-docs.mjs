import fs from 'node:fs';
import path from 'node:path';

const portalRoot = path.resolve(new URL('.', import.meta.url).pathname, '..');
const repoRoot = path.resolve(portalRoot, '..');
const generatedRoot = path.join(portalRoot, 'generated-docs');
const mlopsSource = path.join(repoRoot, 'mlops');
const aiopsSource = path.join(repoRoot, 'aiops');
const mlopsOutput = path.join(generatedRoot, 'mlops');
const aiopsOutput = path.join(generatedRoot, 'aiops');

const SKIP_NAMES = new Set([
  '.DS_Store',
  '.ipynb_checkpoints',
  '__pycache__',
  'mlartifacts',
  '.venv',
  'venv',
  'env',
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, {recursive: true});
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, {recursive: true, force: true});
  ensureDir(dirPath);
}

function slugifyFileName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function titleFromFileName(fileName) {
  const stripped = fileName.replace(/\.[^.]+$/, '');
  return stripped
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function writeFile(targetPath, content) {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, 'utf8');
}

function frontmatter(title, description, slug) {
  const descriptionLine = description ? `description: ${JSON.stringify(description)}\n` : '';
  const slugLine = slug ? `slug: ${JSON.stringify(slug)}\n` : '';
  return `---\ntitle: ${JSON.stringify(title)}\n${descriptionLine}${slugLine}---\n\n`;
}

function codeFenceLanguage(extension) {
  switch (extension) {
    case '.py':
      return 'python';
    case '.toml':
      return 'toml';
    case '.json':
    case '.ipynb':
      return 'json';
    case '.csv':
      return 'csv';
    case '.txt':
      return 'text';
    default:
      return '';
  }
}

function normalizeNotebookSource(value) {
  if (Array.isArray(value)) {
    return value.join('');
  }
  return value ?? '';
}

function extractNotebookOutputs(outputs = []) {
  const lines = [];

  for (const output of outputs) {
    if (output.text) {
      lines.push(normalizeNotebookSource(output.text));
      continue;
    }

    if (output.data?.['text/plain']) {
      lines.push(normalizeNotebookSource(output.data['text/plain']));
    }
  }

  return lines.join('\n').trim();
}

function renderNotebook(filePath, title, sourcePath, slug) {
  const notebook = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const parts = [
    frontmatter(title, `Generated from ${sourcePath}`, slug),
    `<div className="notebook-meta">Source: <code>${sourcePath}</code></div>\n`,
  ];

  for (const [index, cell] of (notebook.cells ?? []).entries()) {
    const source = normalizeNotebookSource(cell.source).trimEnd();

    if (!source) {
      continue;
    }

    if (cell.cell_type === 'markdown') {
      parts.push(`${source}\n`);
      continue;
    }

    if (cell.cell_type === 'code') {
      parts.push(
        `<div className="notebook-cell notebook-cell--code">\n<div className="notebook-cell__label notebook-cell__label--code">Code Example ${index + 1}</div>\n\n\`\`\`python\n${source}\n\`\`\`\n`,
      );
      const outputText = extractNotebookOutputs(cell.outputs);
      if (outputText) {
        parts.push(
          `<div className="notebook-output__label">Output</div>\n\n\`\`\`text\n${outputText}\n\`\`\`\n`,
        );
      }
      parts.push(`</div>\n`);
    }
  }

  return parts.join('\n');
}

function transformMarkdownLinks(body) {
  return body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#')) {
      return match;
    }

    if (url.endsWith('.md')) {
      const target = slugifyFileName(path.basename(url));
      return `[${label}](./${target})`;
    }

    if (url.startsWith('./') || url.startsWith('../')) {
      return `${label} (\`${url}\`)`;
    }

    return match;
  });
}

function renderCodeFile(filePath, title, sourcePath, slug) {
  const extension = path.extname(filePath);
  const language = codeFenceLanguage(extension);
  const body = fs.readFileSync(filePath, 'utf8');
  return `${frontmatter(title, `Generated from ${sourcePath}`, slug)}> Source: \`${sourcePath}\`\n\n\`\`\`${language}\n${body}\n\`\`\`\n`;
}

function renderMarkdownFile(filePath, title, slug) {
  const body = transformMarkdownLinks(fs.readFileSync(filePath, 'utf8'));
  return `${frontmatter(title, title, slug)}${body}\n`;
}

function createCategory(dirPath, label) {
  writeFile(
    path.join(dirPath, '_category_.json'),
    JSON.stringify({label, position: 1}, null, 2),
  );
}

function generateMlopsDocs() {
  resetDir(mlopsOutput);
  createCategory(mlopsOutput, 'MLOps');

  const overview = `${frontmatter('MLOps Overview', 'Local MLOps docs generated from repository files.', '/overview')}This section is generated from the local \`mlops/\` workspace so you can read notebooks and project files inside Docusaurus.\n\n## Sections\n\n- [Python Basics](./python-basics/chapter-01-python-syntax-and-semantics)\n- [Python Advanced](./python-advanced/chapter-01-advanced-python-patterns)\n- [Deployment Control Center](./deployment-control-center/readme)\n- [MLflow](./mlflow/00-study-guide)\n`;
  writeFile(path.join(mlopsOutput, 'overview.md'), overview);

  const sections = [
    {
      label: 'Python Basics',
      sourceDir: path.join(mlopsSource, 'PYTHON', 'Basics'),
      outputDir: path.join(mlopsOutput, 'python-basics'),
      slugBase: '/python-basics',
    },
    {
      label: 'Python Advanced',
      sourceDir: path.join(mlopsSource, 'PYTHON', 'Advanced'),
      outputDir: path.join(mlopsOutput, 'python-advanced'),
      slugBase: '/python-advanced',
    },
    {
      label: 'Deployment Control Center',
      sourceDir: path.join(mlopsSource, 'PYTHON', 'Advanced', 'deployment_control_center'),
      outputDir: path.join(mlopsOutput, 'deployment-control-center'),
      slugBase: '/deployment-control-center',
    },
    {
      label: 'MLflow',
      sourceDir: path.join(mlopsSource, 'mlflow'),
      outputDir: path.join(mlopsOutput, 'mlflow'),
      slugBase: '/mlflow',
    },
  ];

  for (const section of sections) {
    createCategory(section.outputDir, section.label);
    walkAndGenerate(section.sourceDir, section.outputDir, section.sourceDir, section.slugBase);
  }
}

function generateAiopsDocs() {
  resetDir(aiopsOutput);
  createCategory(aiopsOutput, 'AIOps');

  const overview = `${frontmatter('AIOps Overview', 'Local AIOps docs generated from repository files.', '/overview')}This section is generated from the local \`aiops/\` workspace so you can read the implementation docs inside Docusaurus.\n\n## Start Here\n\n- [README](./readme)\n- [AIOPS-01 Alertmanager Webhook Receiver](./aiops-01-alertmanager-webhook-receiver)\n`;
  writeFile(path.join(aiopsOutput, 'overview.md'), overview);

  for (const entry of fs.readdirSync(aiopsSource, {withFileTypes: true})) {
    if (!entry.isFile() || SKIP_NAMES.has(entry.name)) {
      continue;
    }
    const sourcePath = path.join(aiopsSource, entry.name);
    if (path.extname(entry.name) !== '.md') {
      continue;
    }
    const title = titleFromFileName(entry.name);
    const target = path.join(aiopsOutput, `${slugifyFileName(entry.name)}.md`);
    writeFile(target, renderMarkdownFile(sourcePath, title, `/${slugifyFileName(entry.name)}`));
  }
}

function walkAndGenerate(sourceDir, outputDir, sectionSourceRoot, slugBase) {
  for (const entry of fs.readdirSync(sourceDir, {withFileTypes: true})) {
    if (SKIP_NAMES.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);

    if (entry.isDirectory()) {
      const childOutput = path.join(outputDir, slugifyFileName(entry.name));
      createCategory(childOutput, titleFromFileName(entry.name));
      walkAndGenerate(sourcePath, childOutput, sectionSourceRoot, slugBase);
      continue;
    }

    const extension = path.extname(entry.name);
    if (['.pyc', '.db'].includes(extension)) {
      continue;
    }

    const sourceRelative = path.relative(repoRoot, sourcePath).replaceAll(path.sep, '/');
    const targetName = `${slugifyFileName(entry.name)}.md`;
    const targetPath = path.join(outputDir, targetName);
    const title = titleFromFileName(entry.name);
    const sourceRelativeWithinSection = path
      .relative(sectionSourceRoot, sourcePath)
      .replaceAll(path.sep, '/');
    const slug = `${slugBase}/${slugifyFileName(sourceRelativeWithinSection)}`;

    if (extension === '.md') {
      writeFile(targetPath, renderMarkdownFile(sourcePath, title, slug));
      continue;
    }

    if (extension === '.ipynb') {
      writeFile(targetPath, renderNotebook(sourcePath, title, sourceRelative, slug));
      continue;
    }

    writeFile(targetPath, renderCodeFile(sourcePath, title, sourceRelative, slug));
  }
}

generateMlopsDocs();
generateAiopsDocs();
