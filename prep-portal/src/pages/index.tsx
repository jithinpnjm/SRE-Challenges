import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import AnswerCallout from '@site/src/components/AnswerCallout';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          SRE &amp; Platform Engineer Study Hub
        </Heading>
        <p className="hero__subtitle">
          A complete study library — Linux to Kubernetes, networking to GPU infrastructure,
          observability to system design. Beginner to expert in every topic.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/nebius/README">
            Nebius Sprint
          </Link>
          <Link className="button button--primary button--lg" to="/docs/foundations/linux-and-network-administration">
            Start Studying
          </Link>
          <Link className="button button--outline button--lg margin-left--sm" to="/mlops">
            MLOps
          </Link>
          <Link className="button button--outline button--lg margin-left--sm" to="/aiops">
            AIOps
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="SRE Study Hub"
      description="Complete SRE and platform engineering study library. Linux, networking, Kubernetes, GPU infrastructure, observability, system design, CI/CD, and more — beginner to expert.">
      <HomepageHeader />
      <main>
        <section className="container margin-top--lg margin-bottom--xl">

          {/* Nebius Sprint Banner */}
          <div className="card padding--lg margin-bottom--lg" style={{borderLeft: '4px solid #e8462a', background: 'var(--ifm-background-surface-color)'}}>
            <div className="row">
              <div className="col col--8">
                <Heading as="h2" style={{marginBottom: '0.5rem'}}>
                  🎯 Nebius Interview Sprint — 10 Days
                </Heading>
                <p style={{marginBottom: '1rem'}}>
                  Focused sprint for a Staff SRE interview at Nebius AI. Covers their exact 4-stage
                  interview format: Linux internals, Kubernetes + Cilium, GPU/AI infrastructure,
                  system design, coding, and stress interview simulation.
                </p>
                <div className={styles.buttons}>
                  <Link className="button button--primary button--lg" to="/docs/nebius/README">
                    Start Sprint
                  </Link>
                  <Link className="button button--secondary button--lg" to="/docs/nebius/company-stack-interview-guide">
                    About Nebius
                  </Link>
                </div>
              </div>
              <div className="col col--4">
                <div style={{fontSize: '0.9rem', lineHeight: '1.8'}}>
                  <strong>Day 1–3:</strong> Linux internals (cgroups, namespaces, eBPF)<br/>
                  <strong>Day 4–5:</strong> Kubernetes + Cilium + GPU scheduling<br/>
                  <strong>Day 6:</strong> GPU/AI infra (InfiniBand, DCGM, vLLM)<br/>
                  <strong>Day 7:</strong> System design (GPU cluster, inference platform)<br/>
                  <strong>Day 8:</strong> Coding + algorithms<br/>
                  <strong>Day 9:</strong> Stress interview simulation<br/>
                  <strong>Day 10:</strong> Full mock + review
                </div>
              </div>
            </div>
          </div>

          {/* Study Tracks */}
          <div className="row margin-bottom--lg">
            <div className="col col--4">
              <div className="card padding--lg portal-card portal-card--prep">
                <Heading as="h2">Study Library</Heading>
                <p>Comprehensive guides across all SRE and platform engineering topics — from first principles to production depth.</p>
                <Link to="/docs/foundations/linux-and-network-administration">Open Library</Link>
              </div>
            </div>
            <div className="col col--4">
              <div className="card padding--lg portal-card portal-card--mlops">
                <Heading as="h2">MLOps</Heading>
                <p>Python, notebooks, FastAPI, and MLflow study area with runnable commands and project-oriented learning.</p>
                <Link to="/mlops">Open MLOps</Link>
              </div>
            </div>
            <div className="col col--4">
              <div className="card padding--lg portal-card portal-card--aiops">
                <Heading as="h2">AIOps</Heading>
                <p>Operational design and implementation docs for AI-assisted alert enrichment, routing, and platform workflows.</p>
                <Link to="/aiops">Open AIOps</Link>
              </div>
            </div>
          </div>

          {/* Study Library Navigation */}
          <section className="margin-top--xl">
            <Heading as="h2">Study Library — By Topic</Heading>
            <div className="row">
              <div className="col col--4">
                <div className="card padding--md">
                  <Heading as="h3">Linux &amp; Systems</Heading>
                  <ul>
                    <li><Link to="/docs/foundations/linux-and-network-administration">Linux administration</Link></li>
                    <li><Link to="/docs/foundations/linux-debug-playbook">Linux debugging playbook</Link></li>
                    <li><Link to="/docs/foundations/linux-kubernetes-foundations">Linux to Kubernetes</Link></li>
                    <li><Link to="/docs/foundations/bash-and-shell-scripting">Bash scripting</Link></li>
                    <li><Link to="/docs/foundations/python-for-sre">Python for SRE</Link></li>
                  </ul>
                </div>
              </div>
              <div className="col col--4">
                <div className="card padding--md">
                  <Heading as="h3">Networking</Heading>
                  <ul>
                    <li><Link to="/docs/foundations/networking-fundamentals">Networking fundamentals</Link></li>
                    <li><Link to="/docs/foundations/cloud-networking-and-kubernetes-networking">Cloud and Kubernetes networking</Link></li>
                    <li><Link to="/docs/foundations/http-apis-and-reverse-proxy-paths">HTTP, APIs, and reverse proxies</Link></li>
                    <li><Link to="/docs/foundations/kubernetes-networking-deep-dive">Kubernetes networking deep dive</Link></li>
                  </ul>
                </div>
              </div>
              <div className="col col--4">
                <div className="card padding--md">
                  <Heading as="h3">Kubernetes &amp; Containers</Heading>
                  <ul>
                    <li><Link to="/docs/foundations/kubernetes-gpu-ai-platforms-and-operators">GPU and AI platforms</Link></li>
                    <li><Link to="/docs/foundations/docker-and-container-runtime">Docker and runtimes</Link></li>
                    <li><Link to="/docs/foundations/yaml-and-kubernetes-manifest-design">YAML and manifests</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="row margin-top--md">
              <div className="col col--4">
                <div className="card padding--md">
                  <Heading as="h3">Observability &amp; Reliability</Heading>
                  <ul>
                    <li><Link to="/docs/foundations/observability-slos-and-incident-response">Observability and SLOs</Link></li>
                    <li><Link to="/docs/foundations/prometheus-grafana-and-alertmanager">Prometheus, Grafana, Alertmanager</Link></li>
                    <li><Link to="/docs/foundations/devops-troubleshooting-and-security-errors">Troubleshooting patterns</Link></li>
                  </ul>
                </div>
              </div>
              <div className="col col--4">
                <div className="card padding--md">
                  <Heading as="h3">Cloud &amp; Infrastructure</Heading>
                  <ul>
                    <li><Link to="/docs/foundations/system-design-cloud-architecture">System design</Link></li>
                    <li><Link to="/docs/foundations/aws-cloud-services-and-platform-design">AWS platform design</Link></li>
                    <li><Link to="/docs/foundations/terraform-infrastructure-as-code">Terraform and IaC</Link></li>
                    <li><Link to="/docs/foundations/azure-devops-crossover">Azure DevOps crossover</Link></li>
                  </ul>
                </div>
              </div>
              <div className="col col--4">
                <div className="card padding--md">
                  <Heading as="h3">CI/CD &amp; Delivery</Heading>
                  <ul>
                    <li><Link to="/docs/foundations/cicd-trusted-delivery-and-platform-security">CI/CD and security</Link></li>
                    <li><Link to="/docs/foundations/delivery-systems-jenkins-github-actions-and-argocd">Jenkins, GitHub Actions, ArgoCD</Link></li>
                    <li><Link to="/docs/foundations/git-and-version-control-for-platform-engineers">Git for platform engineers</Link></li>
                    <li><Link to="/docs/foundations/sonarqube-and-code-quality-gates">SonarQube and quality gates</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="row margin-top--md">
              <div className="col col--4">
                <div className="card padding--md">
                  <Heading as="h3">Platforms &amp; Services</Heading>
                  <ul>
                    <li><Link to="/docs/foundations/kafka-and-event-streaming">Kafka and event streaming</Link></li>
                    <li><Link to="/docs/foundations/ansible-and-host-automation">Ansible and automation</Link></li>
                    <li><Link to="/docs/foundations/sql-and-relational-data-for-sre">SQL for SRE</Link></li>
                    <li><Link to="/docs/foundations/end-to-end-project-and-capstone-patterns">End-to-end patterns</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Nebius 10-Day Sprint Detail */}
          <section className="margin-top--xl">
            <Heading as="h2">Nebius 10-Day Sprint Plan</Heading>
            <div className="row">
              <div className="col col--6">
                <ol>
                  <li><Link to="/docs/nebius/company-stack-interview-guide">Day 1: Nebius — company, stack, interview format</Link></li>
                  <li><Link to="/docs/nebius/linux-deep-dive">Day 2: Linux internals — processes, namespaces, cgroups</Link></li>
                  <li><Link to="/docs/nebius/linux-deep-dive">Day 3: Linux debugging — eBPF, perf, QEMU/KVM</Link></li>
                  <li><Link to="/docs/nebius/kubernetes-cilium-production">Day 4: Kubernetes control plane + Cilium CNI</Link></li>
                  <li><Link to="/docs/nebius/kubernetes-cilium-production">Day 5: GPU scheduling, operators, Soperator</Link></li>
                </ol>
              </div>
              <div className="col col--6">
                <ol start={6}>
                  <li><Link to="/docs/nebius/gpu-ai-infrastructure">Day 6: GPU/AI infra — InfiniBand, DCGM, vLLM</Link></li>
                  <li><Link to="/docs/nebius/system-design">Day 7: System design — GPU cluster + inference platform</Link></li>
                  <li><Link to="/docs/nebius/coding-algorithms">Day 8: Coding — Python SRE scripts + algorithms</Link></li>
                  <li><Link to="/docs/nebius/stress-interview-incident-response">Day 9: Stress interview simulation</Link></li>
                  <li><Link to="/docs/nebius/README">Day 10: Full mock + review</Link></li>
                </ol>
              </div>
            </div>
            <AnswerCallout
              challengeLabel="daily answer"
              prompt="Each day, draft one answer in the workspace and send it to me for review."
            />
          </section>
        </section>
      </main>
    </Layout>
  );
}
