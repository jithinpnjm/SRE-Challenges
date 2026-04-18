import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import AnswerCallout from '@site/src/components/AnswerCallout';

const days = [
  {
    title: 'Day 1: Linux Administration And Host Triage',
    links: [
      ['/docs/foundations/linux-and-network-administration', 'Linux and network administration'],
      ['/docs/foundations/linux-debug-playbook', 'Linux debug playbook'],
      ['/docs/hands-on-labs/linux-admin/README', 'Linux admin drills'],
    ],
  },
  {
    title: 'Day 2: Networking Fundamentals',
    links: [
      ['/docs/foundations/networking-fundamentals', 'Networking fundamentals'],
      ['/docs/foundations/cloud-networking-and-kubernetes-networking', 'Cloud and Kubernetes networking'],
      ['/docs/hands-on-labs/networking/README', 'Networking labs'],
    ],
  },
  {
    title: 'Day 3: Kubernetes Core Internals',
    links: [
      ['/docs/foundations/linux-kubernetes-foundations', 'Linux and Kubernetes foundations'],
      ['/docs/foundations/kubernetes-networking-deep-dive', 'Kubernetes networking deep dive'],
      ['/docs/foundations/yaml-and-kubernetes-manifest-design', 'YAML and manifest design'],
    ],
  },
  {
    title: 'Day 4: Expert Kubernetes And AI Platform Topics',
    links: [
      ['/docs/foundations/kubernetes-gpu-ai-platforms-and-operators', 'GPU, AI, operators, and mesh foundations'],
      ['/docs/foundations/docker-and-container-runtime', 'Docker and container runtime'],
      ['/docs/hands-on-labs/kubernetes/README', 'Kubernetes labs'],
    ],
  },
  {
    title: 'Day 5: Observability And Incident Response',
    links: [
      ['/docs/foundations/observability-slos-and-incident-response', 'Observability foundation'],
      ['/docs/foundations/prometheus-grafana-and-alertmanager', 'Prometheus, Grafana, and Alertmanager'],
      ['/docs/foundations/devops-troubleshooting-and-security-errors', 'Troubleshooting patterns'],
    ],
  },
  {
    title: 'Day 6: System Design And Cloud Architecture',
    links: [
      ['/docs/foundations/system-design-cloud-architecture', 'System design foundation'],
      ['/docs/foundations/aws-cloud-services-and-platform-design', 'AWS cloud services'],
      ['/docs/hands-on-labs/cloud-design/reference-answer-gcp-public-platform', 'Reference architecture answer'],
    ],
  },
  {
    title: 'Day 7: CI/CD And Platform Security',
    links: [
      ['/docs/foundations/cicd-trusted-delivery-and-platform-security', 'Trusted delivery foundation'],
      ['/docs/foundations/delivery-systems-jenkins-github-actions-and-argocd', 'Jenkins, GitHub Actions, and ArgoCD'],
      ['/docs/foundations/git-and-version-control-for-platform-engineers', 'Git for platform engineers'],
    ],
  },
  {
    title: 'Day 8: Cloud Networking And VPC Design',
    links: [
      ['/docs/hands-on-labs/cloud-networking/README', 'Cloud networking drills'],
      ['/docs/foundations/cloud-networking-and-kubernetes-networking', 'Cloud networking foundation'],
      ['/docs/foundations/terraform-infrastructure-as-code', 'Terraform and IaC'],
    ],
  },
  {
    title: 'Day 9: Mock Interview Day',
    links: [
      ['/docs/mock-interviews/01-nebius-linux-kubernetes-troubleshooting', 'Nebius troubleshooting mock'],
      ['/docs/mock-interviews/02-distributed-systems-and-resilience', 'Distributed systems mock'],
      ['/docs/mock-interviews/03-platform-cloud-and-security', 'Platform and security mock'],
    ],
  },
  {
    title: 'Day 10: Final Tightening',
    links: [
      ['/docs/foundations/end-to-end-project-and-capstone-patterns', 'End-to-end project patterns'],
      ['/docs/learning-path', 'Learning path'],
      ['/workspace', 'Answer workspace'],
    ],
  },
];

export default function TodayPage(): React.ReactNode {
  return (
    <Layout title="Today Dashboard" description="Your 10-day sprint dashboard.">
      <main className="container margin-top--lg margin-bottom--xl">
        <Heading as="h1">Today Dashboard</Heading>
        <p>
          Use this as your daily entry page for the next 10 days. Pick today's
          block, do one drill, write one answer, and send it to me for review.
        </p>
        <div className="row">
          {days.map((day, index) => (
            <div className="col col--6 margin-bottom--md" key={day.title}>
              <div className="card padding--lg portal-card">
                <Heading as="h2">{day.title}</Heading>
                <ul>
                  {day.links.map(([href, label]) => (
                    <li key={href}>
                      <Link to={href}>{label}</Link>
                    </li>
                  ))}
                </ul>
                {index < 4 ? (
                  <AnswerCallout challengeLabel={day.title} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
