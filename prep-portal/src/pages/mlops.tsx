import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import SourceInventory from '@site/src/components/SourceInventory';
import {
  deploymentControlCenterFiles,
  mlflowFiles,
  pythonAdvanced,
  pythonBasics,
} from '@site/src/data/mlopsContent';

function slugifyFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function MLOpsPage(): React.ReactNode {
  const [filter, setFilter] = useState('');

  const totalMatches = useMemo(() => {
    const groups = [
      pythonBasics,
      pythonAdvanced,
      deploymentControlCenterFiles,
      mlflowFiles,
    ];

    return groups.reduce(
      (count, items) =>
        count +
        items.filter((item) =>
          item.toLowerCase().includes(filter.toLowerCase()),
        ).length,
      0,
    );
  }, [filter]);

  return (
    <Layout
      title="MLOps"
      description="Separate MLOps workspace with Python, notebooks, FastAPI, and MLflow study material.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">MLOps Workspace</Heading>
        <p>
          Use this as a real section hub. You can jump into Basics, Advanced,
          Deployment Control Center, or MLflow, and you can filter the file
          inventory from this page before drilling deeper.
        </p>

        <div className="portal-banner portal-banner--mlops margin-bottom--lg">
          <Heading as="h2">Recommended Order</Heading>
          <p>
            Start with Python basics, move into advanced Python, then run the
            deployment control center and finish with MLflow.
          </p>
          <div className="button-group">
            <Link className="button button--primary button--lg" to="/mlops/basics">
              Open Python Basics
            </Link>
            <Link className="button button--secondary button--lg" to="/mlops/advanced">
              Open Python Advanced
            </Link>
            <Link className="button button--outline button--lg" to="/mlops/deployment-control-center">
              Open Deployment Project
            </Link>
            <Link className="button button--outline button--lg" to="/mlops/mlflow">
              Open MLflow
            </Link>
          </div>
        </div>

        <section className="margin-bottom--lg">
          <Heading as="h2">Quick Filter</Heading>
          <input
            className="portal-input"
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by file name, for example fastapi, pandas, mlflow, or capstone"
          />
          <p className="margin-top--sm">
            Matching files across all MLOps sections: <strong>{totalMatches}</strong>
          </p>
          <p className="portal-subtle">
            Open any item below to read it directly inside the portal.
          </p>
        </section>

        <div className="row">
          <div className="col col--6">
            <SourceInventory
              title="Python Basics Inventory"
              basePath="mlops/PYTHON/Basics"
              items={pythonBasics}
              linkBuilder={(item) => `/mlops-docs/python-basics/${slugifyFileName(item)}`}
              filter={filter}
            />
          </div>
          <div className="col col--6">
            <SourceInventory
              title="Python Advanced Inventory"
              basePath="mlops/PYTHON/Advanced"
              items={pythonAdvanced}
              linkBuilder={(item) => `/mlops-docs/python-advanced/${slugifyFileName(item)}`}
              filter={filter}
            />
          </div>
        </div>

        <div className="row">
          <div className="col col--6">
            <SourceInventory
              title="Deployment Control Center Inventory"
              basePath="mlops/PYTHON/Advanced/deployment_control_center"
              items={deploymentControlCenterFiles}
              linkBuilder={(item) => `/mlops-docs/deployment-control-center/${slugifyFileName(item)}`}
              filter={filter}
              defaultOpen={false}
            />
          </div>
          <div className="col col--6">
            <SourceInventory
              title="MLflow Inventory"
              basePath="mlops/mlflow"
              items={mlflowFiles}
              linkBuilder={(item) => `/mlops-docs/mlflow/${slugifyFileName(item)}`}
              filter={filter}
              defaultOpen={false}
            />
          </div>
        </div>

        <section className="margin-top--lg">
          <Heading as="h2">Run The Notebook Environment</Heading>
          <pre>
            <code>{`cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/mlops
python3 -m venv .venv
source .venv/bin/activate
pip install -r PYTHON/requirements.txt
python -m ipykernel install --user --name sre-challenges-mlops --display-name "SRE Challenges MLOps"
jupyter lab`}</code>
          </pre>
        </section>

        <section className="margin-top--lg">
          <Heading as="h2">Move Between Tracks</Heading>
          <ul>
            <li>
              <Link to="/aiops">Open AIOps</Link>
            </li>
            <li>
              <Link to="/docs/learning-path">Return to interview prep</Link>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
