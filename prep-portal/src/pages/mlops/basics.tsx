import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import SourceInventory from '@site/src/components/SourceInventory';
import {pythonBasics} from '@site/src/data/mlopsContent';

function slugifyFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function MLOpsBasicsPage(): React.ReactNode {
  return (
    <Layout title="MLOps Python Basics" description="Python basics notebook inventory for the MLOps workspace.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">MLOps: Python Basics</Heading>
        <p>
          This page focuses only on the basics notebook track so you can move
          through the material in order without distractions.
        </p>
        <SourceInventory
          title="Python Basics Notebooks"
          basePath="mlops/PYTHON/Basics"
          items={pythonBasics}
          linkBuilder={(item) => `/mlops-docs/python-basics/${slugifyFileName(item)}`}
        />
        <pre>
          <code>{`cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/mlops
python3 -m venv .venv
source .venv/bin/activate
pip install -r PYTHON/requirements.txt
jupyter lab`}</code>
        </pre>
        <p>
          <Link to="/mlops">Back to MLOps hub</Link>
        </p>
      </main>
    </Layout>
  );
}
