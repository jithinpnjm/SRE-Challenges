import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {aiopsFiles} from '@site/src/data/aiopsContent';

function slugifyFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function AIOpsPage(): React.ReactNode {
  return (
    <Layout
      title="AIOps"
      description="Separate AIOps workspace for AI-assisted alert enrichment and routing project docs.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">AIOps Workspace</Heading>
        <p>
          This section now works as a proper project index. You can browse the
          real documents, see what each file does, and move through the
          implementation in order.
        </p>

        <div className="portal-banner portal-banner--aiops margin-bottom--lg">
          <Heading as="h2">Project Focus</Heading>
          <p>
            Prometheus and Alertmanager alerts are enriched with team ownership,
            log context, and AI-generated incident summaries before being routed
            to Slack, while preserving a safe fallback path.
          </p>
        </div>

        <section className="margin-bottom--lg">
          <Heading as="h2">AIOps File Index</Heading>
          <div className="card padding--lg portal-card">
            <div className="portal-file-list">
              {aiopsFiles.map(([file, description]) => (
                <div className="portal-file-item portal-file-item--descriptive" key={file}>
                  <Link to={`/aiops-docs/${slugifyFileName(file)}`}>
                    <span className="portal-file-item__title">{file}</span>
                  </Link>
                  <div className="portal-file-item__description">{description}</div>
                  <div className="portal-file-item__path">
                    <span>{`aiops/${file}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="margin-top--lg">
          <Heading as="h2">Suggested Sequence</Heading>
          <ol>
            <li>Read `README.md` for architecture and guardrails.</li>
            <li>Go through AIOPS-01 to AIOPS-05 for core platform setup.</li>
            <li>Then work through AIOPS-06 to AIOPS-09 for enrichment logic.</li>
            <li>Finish with AIOPS-10 for pilot validation and rollout review.</li>
          </ol>
        </section>

        <section className="margin-top--lg">
          <Heading as="h2">Move Between Tracks</Heading>
          <ul>
            <li>
              <Link to="/mlops">Open MLOps</Link>
            </li>
            <li>
              <Link to="/docs/learning-path">Return to interview prep</Link>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
