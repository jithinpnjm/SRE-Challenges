import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import SourceInventory from '@site/src/components/SourceInventory';
import {deploymentControlCenterFiles} from '@site/src/data/mlopsContent';

function slugifyFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function DeploymentControlCenterPage(): React.ReactNode {
  return (
    <Layout title="Deployment Control Center" description="Runnable FastAPI project inventory and run commands.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">Deployment Control Center</Heading>
        <p>
          This is the most runnable project-like part of the MLOps area. Use it
          to study Python project structure, config, services, persistence, and
          testing in one place.
        </p>
        <SourceInventory
          title="Project Files"
          basePath="mlops/PYTHON/Advanced/deployment_control_center"
          items={deploymentControlCenterFiles}
          linkBuilder={(item) => `/mlops-docs/deployment-control-center/${slugifyFileName(item)}`}
        />
        <Heading as="h2">Run The App</Heading>
        <pre>
          <code>{`cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/mlops/PYTHON/Advanced/deployment_control_center
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload`}</code>
        </pre>
        <p>
          Then open <code>http://127.0.0.1:8000/docs</code> and{' '}
          <code>http://127.0.0.1:8000/health</code>.
        </p>
        <Heading as="h2">Run Tests</Heading>
        <pre>
          <code>{`cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/mlops/PYTHON/Advanced/deployment_control_center
source .venv/bin/activate
pytest -q`}</code>
        </pre>
        <p>
          <Link to="/mlops">Back to MLOps hub</Link>
        </p>
      </main>
    </Layout>
  );
}
