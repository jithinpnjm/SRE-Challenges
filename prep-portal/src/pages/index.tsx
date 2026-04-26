import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import AnswerCallout from '@site/src/components/AnswerCallout';

import styles from './index.module.css';

const phases = [
  {
    title: '1. Linux, networking, and host fundamentals',
    description:
      'Build the base layer: processes, memory, filesystems, DNS, TCP, TLS, HTTP, routing, firewalls, and host triage.',
    to: '/docs/learning-path#phase-1-linux-networking-and-host-fundamentals',
  },
  {
    title: '2. Kubernetes and containers',
    description:
      'Understand pods, services, ingress, CNI, kubelet, containerd, manifests, operators, and GPU platform patterns.',
    to: '/docs/learning-path#phase-2-kubernetes-and-containers',
  },
  {
    title: '3. Observability and incidents',
    description:
      'Learn SLOs, Prometheus, Grafana, Alertmanager, incident command, troubleshooting loops, and post-incident learning.',
    to: '/docs/learning-path#phase-3-observability-slos-and-incident-response',
  },
  {
    title: '4. Cloud, architecture, and delivery',
    description:
      'Connect VPCs, compute, storage, Terraform, CI/CD, GitOps, security gates, rollout safety, and system design.',
    to: '/docs/learning-path#phase-4-cloud-architecture-infrastructure-and-delivery',
  },
  {
    title: '5. Automation and platform services',
    description:
      'Use Bash, Python, Ansible, Kafka, SQL, HTTP, proxies, and quality gates as operational building blocks.',
    to: '/docs/learning-path#phase-5-automation-data-and-platform-services',
  },
  {
    title: '6. Synthesis and staff-level reasoning',
    description:
      'Combine all layers into end-to-end production designs with tradeoffs, failure modes, operations, and leadership depth.',
    to: '/docs/learning-path#phase-6-synthesis-capstone-and-staff-level-reasoning',
  },
];

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          SRE Study Guide
        </Heading>
        <p className="hero__subtitle">
          One canonical learning path for SRE and platform engineering: from Linux and networking basics to Kubernetes,
          observability, cloud architecture, delivery systems, automation, and staff-level design.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/learning-path">
            Start With The Roadmap
          </Link>
          <Link className="button button--primary button--lg" to="/docs/foundations/linux-and-network-administration">
            Begin Foundations
          </Link>
          <Link className="button button--outline button--lg margin-left--sm" to="/workspace">
            Practice Workspace
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="SRE Study Guide"
      description="A canonical SRE and platform engineering learning system from basics to advanced practice.">
      <HomepageHeader />
      <main>
        <section className="container margin-top--lg margin-bottom--xl">
          <div className="portal-banner margin-bottom--lg">
            <Heading as="h2">Use This Site As One Learning System</Heading>
            <p>
              The main path is now simple: follow the roadmap, read the foundation guide for the current phase,
              complete a lab or drill, then explain the topic in the practice workspace. Nebius, MLOps, AIOps,
              and the archive are useful supplements, but they should not compete with the core roadmap.
            </p>
            <div className="button-group">
              <Link className="button button--primary button--lg" to="/docs/learning-path">
                Open Canonical Roadmap
              </Link>
              <Link className="button button--secondary button--lg" to="/today">
                Open Study Sessions
              </Link>
            </div>
          </div>

          <section className="margin-top--xl">
            <Heading as="h2">Canonical Roadmap</Heading>
            <div className="row">
              {phases.map((phase) => (
                <div className="col col--4 margin-bottom--lg" key={phase.title}>
                  <div className="card padding--lg portal-card portal-card--prep">
                    <Heading as="h3">{phase.title}</Heading>
                    <p>{phase.description}</p>
                    <Link to={phase.to}>Study this phase</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="margin-top--xl">
            <Heading as="h2">Primary Learning Areas</Heading>
            <div className="row">
              <div className="col col--4">
                <div className="card padding--lg portal-card portal-card--prep">
                  <Heading as="h3">Foundations</Heading>
                  <p>
                    The main course material. Start here for broad SRE depth, from beginner-friendly fundamentals
                    to advanced production reasoning.
                  </p>
                  <Link to="/docs/foundations/linux-and-network-administration">Open foundations</Link>
                </div>
              </div>
              <div className="col col--4">
                <div className="card padding--lg portal-card portal-card--prep">
                  <Heading as="h3">Practice</Heading>
                  <p>
                    Labs, drills, mock interviews, and written answers. Use this layer to convert reading into skill.
                  </p>
                  <Link to="/workspace">Open practice workspace</Link>
                </div>
              </div>
              <div className="col col--4">
                <div className="card padding--lg portal-card portal-card--prep">
                  <Heading as="h3">Supplemental</Heading>
                  <p>
                    Nebius sprint, archive material, MLOps, and AIOps. Use these after the roadmap tells you what to study.
                  </p>
                  <Link to="/library">Open supplemental archive</Link>
                </div>
              </div>
            </div>
          </section>

          <section className="margin-top--xl">
            <Heading as="h2">Study Loop</Heading>
            <div className="row">
              <div className="col col--3">
                <div className="card padding--md">
                  <Heading as="h3">1. Read</Heading>
                  <p>Use the roadmap to choose exactly one foundation guide.</p>
                </div>
              </div>
              <div className="col col--3">
                <div className="card padding--md">
                  <Heading as="h3">2. Trace</Heading>
                  <p>Follow the process, packet, pod, alert, deployment, or state change end to end.</p>
                </div>
              </div>
              <div className="col col--3">
                <div className="card padding--md">
                  <Heading as="h3">3. Practice</Heading>
                  <p>Run commands, inspect output, break something safely, or complete a lab.</p>
                </div>
              </div>
              <div className="col col--3">
                <div className="card padding--md">
                  <Heading as="h3">4. Explain</Heading>
                  <p>Write or speak one answer in the workspace until it is clear and operational.</p>
                </div>
              </div>
            </div>
            <AnswerCallout
              challengeLabel="daily SRE study loop"
              prompt="After each session, explain one topic from basics to advanced: mental model, commands, failure modes, and production tradeoffs."
            />
          </section>
        </section>
      </main>
    </Layout>
  );
}
