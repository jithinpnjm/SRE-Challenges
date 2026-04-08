import React from 'react';
import Link from '@docusaurus/Link';

type Props = {
  challengeLabel: string;
  prompt?: string;
};

export default function AnswerCallout({challengeLabel, prompt}: Props) {
  const query = encodeURIComponent(challengeLabel);

  return (
    <div
      className="card padding--md margin-top--md margin-bottom--md"
      style={{borderLeft: '4px solid var(--ifm-color-primary)'}}>
      <h3 style={{marginBottom: '0.5rem'}}>Answer This Like An Interviewer Is Listening</h3>
      <p style={{marginBottom: '0.75rem'}}>
        Draft your response for <strong>{challengeLabel}</strong> in the answer
        workspace, then send it to me and I will review it like an interviewer.
      </p>
      {prompt ? <p style={{marginBottom: '0.75rem'}}>{prompt}</p> : null}
      <Link className="button button--primary button--sm" to={`/workspace?challenge=${query}`}>
        Open Workspace For This Challenge
      </Link>
    </div>
  );
}
