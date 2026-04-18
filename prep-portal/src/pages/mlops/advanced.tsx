import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import SourceInventory from '@site/src/components/SourceInventory';
import {pythonAdvanced} from '@site/src/data/mlopsContent';

function slugifyFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function MLOpsAdvancedPage(): React.ReactNode {
  return (
    <Layout title="MLOps Python Advanced" description="Advanced Python notebook inventory for the MLOps workspace.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">MLOps: Python Advanced</Heading>
        <p>
          This track moves from patterns and concurrency into APIs, FastAPI,
          SQLAlchemy, testing, and capstones.
        </p>
        <SourceInventory
          title="Python Advanced Notebooks"
          basePath="mlops/PYTHON/Advanced"
          items={pythonAdvanced}
          linkBuilder={(item) => `/mlops-docs/python-advanced/${slugifyFileName(item)}`}
        />
        <pre>
          <code>{`cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/mlops
python3 -m venv .venv
source .venv/bin/activate
pip install -r PYTHON/requirements.txt
jupyter lab`}</code>
        </pre>
        <p>
          <Link to="/mlops/deployment-control-center">Open deployment control center</Link>
        </p>
        <p>
          <Link to="/mlops">Back to MLOps hub</Link>
        </p>
      </main>
    </Layout>
  );
}
