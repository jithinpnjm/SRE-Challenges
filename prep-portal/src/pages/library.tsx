import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {libraryTopics} from '@site/src/data/documentLibrary';

export default function LibraryPage(): React.ReactNode {
  return (
    <Layout
      title="Document Library"
      description="Topic-based document collection library mapped into the interview-prep system.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">Document Library</Heading>
        <p>
          Each tile maps the raw <code>docs/</code> archive into a topic-based
          study route. Use the foundation guides first, then return here for
          additional reinforcement and question-bank practice.
        </p>

        <div className="portal-banner margin-bottom--lg">
          <Heading as="h2">How To Use This Library</Heading>
          <p>
            Read the matching foundation guide first. Then use the library tile
            for extra repetition, worked examples, or question-bank practice
            from the archive.
          </p>
          <div className="button-group">
            <Link className="button button--primary button--lg" to="/docs/foundations/linux-and-network-administration">
              Open Study Library
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/document-collection-integration">
              Open Integration Notes
            </Link>
          </div>
        </div>

        <div className="row">
          {libraryTopics.map((topic) => (
            <div className="col col--6 margin-bottom--lg" key={topic.slug}>
              <div className={`card padding--lg portal-card ${topic.colorClass}`}>
                <Heading as="h2">{topic.title}</Heading>
                <p>
                  <strong>{topic.count}</strong> supporting files across the
                  mapped folders.
                </p>
                <p className="portal-subtle">Primary folders:</p>
                <ul>
                  {topic.folders.slice(0, 4).map((folder) => (
                    <li key={folder}>
                      <code>{folder}</code>
                    </li>
                  ))}
                </ul>
                <p className="portal-subtle">Best used for:</p>
                <ul>
                  {topic.focus.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link className="button button--primary button--md" to={`/library/${topic.slug}`}>
                  Open Topic
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
