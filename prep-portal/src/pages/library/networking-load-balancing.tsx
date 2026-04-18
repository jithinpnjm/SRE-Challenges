import React from 'react';
import LibraryTopicPage from '@site/src/components/LibraryTopicPage';
import {libraryTopics} from '@site/src/data/documentLibrary';

export default function NetworkingLibraryPage(): React.ReactNode {
  return <LibraryTopicPage topic={libraryTopics.find((topic) => topic.slug === 'networking-load-balancing')!} />;
}
