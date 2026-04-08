import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import AnswerCallout from '@site/src/components/AnswerCallout';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/today">
            Open Today Dashboard
          </Link>
          <Link
            className="button button--primary button--lg"
            to="/docs/learning-path">
            Start The Learning Path
          </Link>
          <Link
            className="button button--outline button--lg margin-left--sm"
            to="/workspace">
            Open Answer Workspace
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Senior SRE Study Portal"
      description="Searchable local study portal for Linux, networking, Kubernetes, cloud architecture, observability, CI/CD, and platform engineering interview prep.">
      <HomepageHeader />
      <main>
        <section className="container margin-top--lg margin-bottom--xl">
          <div className="portal-hero-grid margin-bottom--lg">
            <div className="portal-banner">
              <Heading as="h2">10 Days To Interview</Heading>
              <p>
                Focus on Linux, networking, Kubernetes, cloud architecture, and
                concise operator-style answers. Use the portal as your daily
                sprint board.
              </p>
              <div className={styles.buttons}>
                <Link className="button button--primary button--lg" to="/today">
                  Go To Today
                </Link>
                <Link className="button button--secondary button--lg" to="/workspace">
                  Write Today&apos;s Answer
                </Link>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col col--4">
              <div className="card padding--lg portal-card">
                <Heading as="h2">Foundations First</Heading>
                <p>Start from Linux, networking, Kubernetes internals, system design, observability, and trusted delivery foundations.</p>
                <Link to="/docs/foundations">Open Foundations</Link>
              </div>
            </div>
            <div className="col col--4">
              <div className="card padding--lg portal-card">
                <Heading as="h2">Hands-On Labs</Heading>
                <p>Practice Linux admin drills, cloud networking drills, Kubernetes troubleshooting, and design-review labs.</p>
                <Link to="/docs/hands-on-labs">Open Labs</Link>
              </div>
            </div>
            <div className="col col--4">
              <div className="card padding--lg portal-card">
                <Heading as="h2">Staff-Level Calibration</Heading>
                <p>Use the learning path, reference answers, and mock interviews to raise your bar before real interviews.</p>
                <Link to="/docs/mock-interviews">Open Mock Interviews</Link>
              </div>
            </div>
          </div>
          <section className="margin-top--xl">
            <Heading as="h2">10-Day Sprint</Heading>
            <div className="row">
              <div className="col col--6">
                <ol>
                  <li><Link to="/docs/foundations/linux-and-network-administration">Day 1: Linux administration and host triage</Link></li>
                  <li><Link to="/docs/foundations/networking-fundamentals">Day 2: Networking fundamentals and SSH/TLS flow</Link></li>
                  <li><Link to="/docs/foundations/linux-kubernetes-foundations">Day 3: Kubernetes core internals</Link></li>
                  <li><Link to="/docs/expert/kubernetes">Day 4: Expert Kubernetes and GPU/AI topics</Link></li>
                  <li><Link to="/docs/foundations/observability-slos-and-incident-response">Day 5: Observability and incident response</Link></li>
                </ol>
              </div>
              <div className="col col--6">
                <ol start={6}>
                  <li><Link to="/docs/expert/system-design-cloud">Day 6: System design and cloud architecture</Link></li>
                  <li><Link to="/docs/expert/cicd-release-security">Day 7: CI/CD and trusted delivery</Link></li>
                  <li><Link to="/docs/hands-on-labs/cloud-networking">Day 8: Cloud networking and VPC drills</Link></li>
                  <li><Link to="/docs/mock-interviews/nebius-linux-kubernetes-troubleshooting">Day 9: Mock interview day</Link></li>
                  <li><Link to="/docs/learning-path">Day 10: Final tightening and review</Link></li>
                </ol>
              </div>
            </div>
            <AnswerCallout
              challengeLabel="10-day sprint daily answer"
              prompt="Each day, draft one answer in the workspace and send it to me. I will review it like an interviewer."
            />
          </section>
        </section>
      </main>
    </Layout>
  );
}
