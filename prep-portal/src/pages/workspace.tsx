import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import AnswerWorkspace from '@site/src/components/AnswerWorkspace';
import {useLocation} from '@docusaurus/router';

export default function WorkspacePage(): React.ReactNode {
  const {search} = useLocation();
  const params = new URLSearchParams(search);
  const challenge = params.get('challenge') ?? '';

  return (
    <Layout title="Answer Workspace" description="Write your answer drafts and send them for review.">
      <main className="container margin-top--lg margin-bottom--xl">
        <h1>Answer Workspace</h1>
        <p>
          Use this page to draft answers for any challenge in the prep pack, then
          paste the result into chat and I will review it like an interviewer.
        </p>
        <p>
          Recommended companion docs:
          {' '}
          <Link to="/docs/answers-template">Answer Template</Link>
          {' '}
          and
          {' '}
          <Link to="/docs/learning-path">Learning Path</Link>.
        </p>
        {challenge ? (
          <div className="alert alert--info">
            Workspace seeded for: <strong>{challenge}</strong>
          </div>
        ) : null}
        <AnswerWorkspace initialChallenge={challenge} />
      </main>
    </Layout>
  );
}
