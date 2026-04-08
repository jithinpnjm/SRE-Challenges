import React, {useEffect, useState} from 'react';

type Props = {
  initialChallenge?: string;
  storageKey?: string;
};

export default function AnswerWorkspace({
  initialChallenge = '',
  storageKey = 'sre-prep-answer-workspace',
}: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setValue(saved);
      return;
    }
    if (initialChallenge) {
      setValue(`Challenge: ${initialChallenge}\n\nRequirements And Assumptions:\n\nTraffic Or Process Flow:\n\nFailure Domains:\n\nArchitecture Or Investigation Plan:\n\nObservability And Validation:\n\nSecurity And Access Control:\n\nRollout, Mitigation, Or Recovery Plan:\n\nTradeoffs:\n\nFinal Answer:\n`);
    }
  }, [initialChallenge, storageKey]);

  function onChange(next: string) {
    setValue(next);
    window.localStorage.setItem(storageKey, next);
  }

  return (
    <div className="card padding--lg margin-top--md">
      <h2>Answer Workspace</h2>
      <p>
        Draft your answer here before sending it to me for review. Your text is
        saved in local browser storage on this machine.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        style={{
          width: '100%',
          resize: 'vertical',
          fontFamily: 'var(--ifm-font-family-monospace)',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          padding: '0.9rem',
        }}
        placeholder={[
          'Challenge:',
          '',
          'Requirements and assumptions:',
          '',
          'Traffic or process flow:',
          '',
          'Failure domains:',
          '',
          'Architecture or investigation plan:',
          '',
          'Observability and validation:',
          '',
          'Security and access control:',
          '',
          'Rollout, mitigation, or recovery:',
          '',
          'Tradeoffs:',
          '',
          'Final answer:',
        ].join('\n')}
      />
    </div>
  );
}
