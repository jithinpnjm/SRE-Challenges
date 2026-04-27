import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import AnswerCallout from '@site/src/components/AnswerCallout';

import styles from './index.module.css';

const memoryPalaces = [
  {title: 'Linux', place: 'Hospital', description: 'CPU as doctors, memory as beds, logs as charts, systemd as operations manager.', to: '/docs/foundations/linux-and-network-administration'},
  {title: 'Networking', place: 'Hotel', description: 'DNS as front desk, ports as doors, routes as hallways, firewalls as security guards.', to: '/docs/foundations/networking-fundamentals'},
  {title: 'Kubernetes', place: 'City', description: 'Nodes as buildings, pods as apartments, Services as public numbers, CNI as roads.', to: '/docs/foundations/kubernetes-networking-deep-dive'},
  {title: 'Observability', place: 'Emergency Room', description: 'Metrics as vitals, traces as patient journeys, alerts as alarms, postmortems as case reviews.', to: '/docs/foundations/observability-slos-and-incident-response'},
  {title: 'CI/CD', place: 'Factory', description: 'Commits as raw material, tests as inspection, registry as warehouse, rollback as recall.', to: '/docs/foundations/cicd-trusted-delivery-and-platform-security'},
  {title: 'Terraform', place: 'City Planner', description: 'Code as blueprints, state as the city ledger, drift as illegal construction.', to: '/docs/foundations/terraform-infrastructure-as-code'},
  {title: 'Cloud Design', place: 'Airport Grid', description: 'Regions as hubs, AZs as terminals, load balancers as traffic control, DBs as records offices.', to: '/docs/foundations/system-design-cloud-architecture'},
];

const phases = [
  {
    title: '1. Foundations Core',
    description: 'Master host, packet, and debugging fundamentals before touching higher-level platforms.',
    to: '/docs/learning-path#phase-1-linux-networking-and-host-fundamentals',
  },
  {
    title: '2. Kubernetes & Containers',
    description: 'Learn pods, services, ingress, CNI, kubelet, container runtime, manifests, and operators.',
    to: '/docs/learning-path#phase-2-kubernetes-and-containers',
  },
  {
    title: '3. Reliability & Incidents',
    description: 'Use SLOs, alerts, dashboards, traces, and incident command to operate real systems.',
    to: '/docs/learning-path#phase-3-observability-slos-and-incident-response',
  },
  {
    title: '4. Cloud, IaC & Delivery',
    description: 'Design platforms with cloud architecture, Terraform, CI/CD, GitOps, and rollout safety.',
    to: '/docs/learning-path#phase-4-cloud-architecture-infrastructure-and-delivery',
  },
  {
    title: '5. Automation & Platform Services',
    description: 'Use Bash, Python, Ansible, Kafka, SQL, APIs, proxies, and quality gates operationally.',
    to: '/docs/learning-path#phase-5-automation-data-and-platform-services',
  },
  {
    title: '6. Staff-Level Synthesis',
    description: 'Combine design, operations, reliability, security, cost, tradeoffs, and leadership judgment.',
    to: '/docs/learning-path#phase-6-synthesis-capstone-and-staff-level-reasoning',
  },
];

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          Learn SRE Like Real Systems
        </Heading>
        <p className="hero__subtitle">
          A memory-first SRE and platform engineering study system: Linux as a hospital, networking as a hotel,
          Kubernetes as a city, observability as an emergency room, CI/CD as a factory, Terraform as city planning,
          and cloud architecture as a global airport grid.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/learning-path">
            Start The Roadmap
          </Link>
          <Link className="button button--primary button--lg" to="/docs/memory-palace">
            Open Memory Palace
          </Link>
          <Link className="button button--outline button--lg margin-left--sm" to="/workspace">
            Practice Answers
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
      description="A memory-first SRE and platform engineering learning system from Linux fundamentals to staff-level design.">
      <HomepageHeader />
      <main>
        <section className="container margin-top--lg margin-bottom--xl">
          <div className="portal-banner margin-bottom--lg">
            <Heading as="h2">A Study System You Can Remember Under Pressure</Heading>
            <p>
              Most SRE resources become command dumps. This site turns each platform layer into a place you can walk
              through mentally during interviews and incidents. Read the guide, walk the memory palace, run a drill,
              then explain the system out loud until the reasoning is automatic.
            </p>
            <div className="button-group">
              <Link className="button button--primary button--lg" to="/docs/learning-path">
                Follow Canonical Roadmap
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/module-template">
                Learn The Module Pattern
              </Link>
            </div>
          </div>

          <section className="margin-top--xl">
            <Heading as="h2">Memory Palaces</Heading>
            <div className="row">
              {memoryPalaces.map((item) => (
                <div className="col col--4 margin-bottom--lg" key={item.title}>
                  <div className="card padding--lg portal-card portal-card--prep">
                    <Heading as="h3">{item.title}: {item.place}</Heading>
                    <p>{item.description}</p>
                    <Link to={item.to}>Study this palace</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

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
            <Heading as="h2">Daily Study Loop</Heading>
            <div className="row">
              <div className="col col--3"><div className="card padding--md"><Heading as="h3">1. Read</Heading><p>Choose one guide from the roadmap.</p></div></div>
              <div className="col col--3"><div className="card padding--md"><Heading as="h3">2. Walk</Heading><p>Attach the topic to its memory palace.</p></div></div>
              <div className="col col--3"><div className="card padding--md"><Heading as="h3">3. Drill</Heading><p>Run commands, inspect output, and break/fix safely.</p></div></div>
              <div className="col col--3"><div className="card padding--md"><Heading as="h3">4. Explain</Heading><p>Answer like a senior operator under interview pressure.</p></div></div>
            </div>
            <AnswerCallout
              challengeLabel="memory palace SRE answer"
              prompt="Pick one palace and explain the technical layer from first principles: mental model, traffic or failure path, commands, likely incidents, and senior tradeoffs."
            />
          </section>
        </section>
      </main>
    </Layout>
  );
}
