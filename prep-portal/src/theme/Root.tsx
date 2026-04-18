import React from 'react';
import SREMentor from '@site/src/components/SREMentor';

export default function Root({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      {children}
      <SREMentor />
    </>
  );
}
