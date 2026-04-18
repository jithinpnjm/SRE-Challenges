import React from 'react';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

type Props = {
  title: string;
  basePath: string;
  items: string[];
  linkBuilder: (item: string) => string;
  filter?: string;
  defaultOpen?: boolean;
};

export default function SourceInventory({
  title,
  basePath,
  items,
  linkBuilder,
  filter = '',
  defaultOpen = true,
}: Props) {
  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <details className="card padding--lg portal-card margin-bottom--md" open={defaultOpen}>
      <summary className="portal-summary">
        <Heading as="h2">{title}</Heading>
        <span>{filteredItems.length} items</span>
      </summary>
      <div className="margin-top--md portal-file-list">
        {filteredItems.map((item) => {
          const relative = `${basePath}/${item}`;
          return (
            <div className="portal-file-item" key={relative}>
              <Link to={linkBuilder(item)}>
                <span className="portal-file-item__title">{item}</span>
              </Link>
              <div className="portal-file-item__path">
                <span>{relative}</span>
              </div>
            </div>
          );
        })}
      </div>
      {!filteredItems.length ? <p>No files matched this filter.</p> : null}
    </details>
  );
}
