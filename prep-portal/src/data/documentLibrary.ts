export type LibraryTopic = {
  slug: string;
  title: string;
  count: number;
  colorClass: string;
  folders: string[];
  focus: string[];
  relatedDocs: Array<{label: string; to: string}>;
};

export const libraryTopics: LibraryTopic[] = [
  {
    slug: 'linux-shell',
    title: 'Linux And Shell',
    count: 58,
    colorClass: 'portal-card--prep',
    folders: [
      'docs/Linux/',
      'docs/Bash Scripting/',
      'docs/Shell Scripting/',
      'docs/Interview Ouestions/Linux/',
    ],
    focus: [
      'host triage and system administration',
      'Linux command mastery and shell workflow',
      'service, filesystem, and process troubleshooting',
      'Linux interview-question rehearsal',
    ],
    relatedDocs: [
      {label: 'Linux and network administration', to: '/docs/foundations/linux-and-network-administration'},
      {label: 'Linux debugging playbook', to: '/docs/foundations/linux-debug-playbook'},
      {label: 'Bash and shell scripting', to: '/docs/foundations/bash-and-shell-scripting'},
      {label: 'Linux admin drills', to: '/docs/hands-on-labs/linux-admin/README'},
      {label: 'Linux labs', to: '/docs/hands-on-labs/linux/README'},
    ],
  },
  {
    slug: 'networking-load-balancing',
    title: 'Networking And Load Balancing',
    count: 19,
    colorClass: 'portal-card--prep',
    folders: [
      'docs/Networking/',
      'docs/Networking and Load Balancing/',
      'docs/Forward proxy VS Reverse proxy/',
      'docs/Cloud/',
    ],
    focus: [
      'packet flow, DNS, TCP, and TLS reasoning',
      'reverse proxy, ingress, and load balancer behavior',
      'cloud network boundaries and path explanation',
    ],
    relatedDocs: [
      {label: 'Networking fundamentals', to: '/docs/foundations/networking-fundamentals'},
      {label: 'Cloud and Kubernetes networking', to: '/docs/foundations/cloud-networking-and-kubernetes-networking'},
      {label: 'HTTP, APIs, and reverse proxies', to: '/docs/foundations/http-apis-and-reverse-proxy-paths'},
      {label: 'Networking labs', to: '/docs/hands-on-labs/networking/README'},
      {label: 'Cloud networking drills', to: '/docs/hands-on-labs/cloud-networking/README'},
    ],
  },
  {
    slug: 'kubernetes-platform',
    title: 'Kubernetes And Platform',
    count: 76,
    colorClass: 'portal-card--prep',
    folders: [
      'docs/Kubernetes/',
      'docs/Docker/',
      'docs/API/',
      'docs/Kafka/',
      'docs/Interview Ouestions/Kubernetes/',
      'docs/Interview Ouestions/Docker/',
    ],
    focus: [
      'Kubernetes internals and troubleshooting',
      'Docker and container-runtime concepts',
      'platform behavior around APIs, messaging, and networking',
      'Kubernetes interview-question reinforcement',
    ],
    relatedDocs: [
      {label: 'Linux and Kubernetes foundations', to: '/docs/foundations/linux-kubernetes-foundations'},
      {label: 'Kubernetes networking deep dive', to: '/docs/foundations/kubernetes-networking-deep-dive'},
      {label: 'Docker and container runtime', to: '/docs/foundations/docker-and-container-runtime'},
      {label: 'YAML and manifest design', to: '/docs/foundations/yaml-and-kubernetes-manifest-design'},
      {label: 'Kubernetes labs', to: '/docs/hands-on-labs/kubernetes/README'},
    ],
  },
  {
    slug: 'cloud-terraform-aws',
    title: 'Cloud, Terraform, And AWS',
    count: 52,
    colorClass: 'portal-card--aiops',
    folders: [
      'docs/AWS/',
      'docs/AWS Project/',
      'docs/Terraform/',
      'docs/Cloud/',
      'docs/Interview Ouestions/AWS/',
      'docs/Interview Ouestions/Terraform/',
    ],
    focus: [
      'AWS crossover architecture',
      'Terraform-based infrastructure thinking',
      'cloud networking and platform design',
    ],
    relatedDocs: [
      {label: 'System design and cloud architecture', to: '/docs/foundations/system-design-cloud-architecture'},
      {label: 'AWS cloud services and platform design', to: '/docs/foundations/aws-cloud-services-and-platform-design'},
      {label: 'Terraform infrastructure as code', to: '/docs/foundations/terraform-infrastructure-as-code'},
      {label: 'Cloud design labs', to: '/docs/hands-on-labs/cloud-design/README'},
    ],
  },
  {
    slug: 'cicd-tooling',
    title: 'CI/CD And Tooling',
    count: 43,
    colorClass: 'portal-card--aiops',
    folders: [
      'docs/Jenkins/',
      'docs/Github Action/',
      'docs/ArgoCD/',
      'docs/SonarQube/',
      'docs/Ansible/',
      'docs/Git/',
      'docs/YAML/',
      'docs/Interview Ouestions/Jenkins/',
      'docs/Interview Ouestions/Devops/',
    ],
    focus: [
      'tool-specific pipeline understanding',
      'GitOps and delivery-system reasoning',
      'policy, gates, and rollout safety',
    ],
    relatedDocs: [
      {label: 'CI/CD and trusted delivery', to: '/docs/foundations/cicd-trusted-delivery-and-platform-security'},
      {label: 'Jenkins, GitHub Actions, and ArgoCD', to: '/docs/foundations/delivery-systems-jenkins-github-actions-and-argocd'},
      {label: 'Git and version control', to: '/docs/foundations/git-and-version-control-for-platform-engineers'},
      {label: 'SonarQube and quality gates', to: '/docs/foundations/sonarqube-and-code-quality-gates'},
    ],
  },
  {
    slug: 'observability-signals',
    title: 'Observability And Signals',
    count: 35,
    colorClass: 'portal-card--aiops',
    folders: [
      'docs/Grafana+Prometheus/',
      'docs/Prometheus+Grafana/',
      'docs/Devops Basics/',
    ],
    focus: [
      'Prometheus and Grafana vocabulary',
      'monitoring and alerting reinforcement',
      'operational signal interpretation',
    ],
    relatedDocs: [
      {label: 'Observability, SLOs, and incident response', to: '/docs/foundations/observability-slos-and-incident-response'},
      {label: 'Prometheus, Grafana, and Alertmanager', to: '/docs/foundations/prometheus-grafana-and-alertmanager'},
      {label: 'Troubleshooting patterns', to: '/docs/foundations/devops-troubleshooting-and-security-errors'},
    ],
  },
  {
    slug: 'python-automation',
    title: 'Python And Automation',
    count: 15,
    colorClass: 'portal-card--mlops',
    folders: [
      'docs/Python/',
      'docs/Bash Scripting/',
      'docs/Shell Scripting/',
      'docs/Interview Ouestions/Python/',
    ],
    focus: [
      'Python scripting for SRE work',
      'bash and shell automation reinforcement',
      'automation interview question practice',
    ],
    relatedDocs: [
      {label: 'Python for SRE', to: '/docs/foundations/python-for-sre'},
      {label: 'Bash and shell scripting', to: '/docs/foundations/bash-and-shell-scripting'},
      {label: 'Ansible and host automation', to: '/docs/foundations/ansible-and-host-automation'},
      {label: 'Python labs', to: '/docs/hands-on-labs/python/README'},
      {label: 'Bash labs', to: '/docs/hands-on-labs/bash/README'},
    ],
  },
];
