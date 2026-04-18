import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import SourceInventory from '@site/src/components/SourceInventory';
import {mlflowFiles} from '@site/src/data/mlopsContent';

function slugifyFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function MLOpsMlflowPage(): React.ReactNode {
  return (
    <Layout title="MLOps MLflow" description="MLflow study notebooks and local run commands.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">MLOps: MLflow</Heading>
        <p>
          This page focuses on the MLflow study area and gives you the local run
          commands in one place.
        </p>
        <SourceInventory
          title="MLflow Files"
          basePath="mlops/mlflow"
          items={mlflowFiles}
          linkBuilder={(item) => `/mlops-docs/mlflow/${slugifyFileName(item)}`}
        />
        <pre>
          <code>{`cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/mlops/mlflow
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mlflow ui --backend-store-uri sqlite:///mlflow.db`}</code>
        </pre>
        <p>
          Open <code>http://127.0.0.1:5000</code>.
        </p>
        <p>
          <Link to="/mlops">Back to MLOps hub</Link>
        </p>
      </main>
    </Layout>
  );
}
