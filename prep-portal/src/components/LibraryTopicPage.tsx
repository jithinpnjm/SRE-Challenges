import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import type {LibraryTopic} from '@site/src/data/documentLibrary';

type Props = {
  topic: LibraryTopic;
};

export default function LibraryTopicPage({topic}: Props): React.ReactNode {
  const bannerClass =
    topic.colorClass === 'portal-card--mlops'
      ? 'portal-banner--mlops'
      : topic.colorClass === 'portal-card--aiops'
        ? 'portal-banner--aiops'
        : '';

  return (
    <Layout title={topic.title} description={`Document-library topic page for ${topic.title}.`}>
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">{topic.title}</Heading>
        <p>
          This page translates the raw document archive into a clean interview-study
          route. Use the related prep docs first, then come back to the folder set
          below for reinforcement and question-bank practice.
        </p>

        <div className={`portal-banner ${bannerClass} margin-bottom--lg`}>
          <Heading as="h2">Topic Focus</Heading>
          <ul>
            {topic.focus.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="row">
          <div className="col col--6">
            <div className={`card padding--lg portal-card ${topic.colorClass}`}>
              <Heading as="h2">Related Prep Docs</Heading>
              <ul>
                {topic.relatedDocs.map((doc) => (
                  <li key={doc.to}>
                    <Link to={doc.to}>{doc.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="col col--6">
            <div className={`card padding--lg portal-card ${topic.colorClass}`}>
              <Heading as="h2">Archive Source Folders</Heading>
              <ul>
                {topic.folders.map((folder) => (
                  <li key={folder}>
                    <code>{folder}</code>
                  </li>
                ))}
              </ul>
              <p className="portal-subtle">
                These are the raw archive sources behind this topic. Use the readable prep docs on the left first.
              </p>
            </div>
          </div>
        </div>

        <section className="margin-top--lg">
          <Heading as="h2">Recommended Study Flow</Heading>
          <ol>
            <li>Read the related prep docs above.</li>
            <li>Do one matching drill or lab.</li>
            <li>Answer one question aloud.</li>
            <li>Only then use the archive folders for reinforcement.</li>
          </ol>
        </section>

        <section className="margin-top--lg">
          <Link to="/library">Back to library</Link>
        </section>
      </main>
    </Layout>
  );
}
