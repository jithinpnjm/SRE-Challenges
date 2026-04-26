# Start Here: Canonical SRE Learning Roadmap

This is the single source of truth for the study site.

Use this roadmap as the default path. The goal is not to memorize isolated interview answers. The goal is to build SRE and platform engineering fluency from first principles to production-level reasoning.

The rest of the repo should support this path:

- **Foundations** are the main learning material.
- **Hands-on labs** turn concepts into muscle memory.
- **Mock interviews** test whether you can explain and troubleshoot under pressure.
- **Nebius sprint** is optional and secondary, useful only when preparing for that specific interview.
- **Document library/archive** is supplemental reinforcement, not a competing roadmap.

---

## How To Study Each Phase

For every phase, do the same loop:

1. **Read for the mental model**: understand what the system is doing and why it exists.
2. **Trace the request or failure path**: follow packets, processes, pods, alerts, deployments, or state changes end to end.
3. **Do one hands-on drill**: run commands, inspect output, break something, and fix it.
4. **Explain it out loud**: turn the topic into a clear spoken answer.
5. **Write one operational note**: capture symptoms, likely causes, commands, and remediation.

Do not try to finish everything quickly. The site is content-rich on purpose. The win is repeated practice through the same canonical path.

---

## Phase 1: Linux, Networking, And Host Fundamentals

Start here. These topics are the base layer for almost everything else in SRE.

Read in this order:

1. [Linux and network administration](foundations/10-linux-and-network-administration.md)
2. [Networking fundamentals](foundations/01-networking-fundamentals.md)
3. [Linux and Kubernetes foundations](foundations/02-linux-kubernetes-foundations.md)
4. [Linux debug playbook](foundations/05-linux-debug-playbook.md)

You should be able to answer:

- What happens when a process starts, opens files, uses memory, and sends traffic?
- How do DNS, TCP, TLS, HTTP, routing, and firewalls fit together?
- How do cgroups, namespaces, systemd, journald, iptables/nftables, and kernel limits affect Kubernetes nodes?
- Which commands do you run first when a Linux host is slow, full, overloaded, or unreachable?

Practice:

- [Linux labs](hands-on-labs/linux/)
- [Linux admin labs](hands-on-labs/linux-admin/)
- [Networking labs](hands-on-labs/networking/)

Exit criteria:

- You can troubleshoot CPU, memory, disk, DNS, port, and connectivity problems without guessing.
- You can explain packet flow from a process on one host to a service on another host.
- You can read common Linux command output and decide what to check next.

---

## Phase 2: Kubernetes And Containers

Move here after Linux and networking. Kubernetes is easier when you understand the host first.

Read in this order:

1. [Kubernetes networking deep dive](foundations/06-kubernetes-networking-deep-dive.md)
2. [Cloud networking and Kubernetes networking](foundations/11-cloud-networking-and-kubernetes-networking.md)
3. [Docker and container runtime](foundations/13-docker-and-container-runtime.md)
4. [YAML and Kubernetes manifest design](foundations/25-yaml-and-kubernetes-manifest-design.md)
5. [Kubernetes GPU, AI platforms, and operators](foundations/12-kubernetes-gpu-ai-platforms-and-operators.md)

You should be able to answer:

- What happens when a request enters a Kubernetes service and reaches a pod?
- How do kubelet, containerd, runc, CNI, CoreDNS, kube-proxy, ingress, and network policy interact?
- What makes a manifest production-ready rather than merely valid YAML?
- How do operators encode operational knowledge into reconciliation loops?
- How are GPU workloads scheduled, isolated, monitored, and debugged?

Practice:

- [Kubernetes labs](hands-on-labs/kubernetes/)
- [Cloud networking labs](hands-on-labs/cloud-networking/)

Exit criteria:

- You can debug Pending, CrashLoopBackOff, ImagePullBackOff, DNS, service routing, ingress, and node-pressure failures.
- You can explain the difference between container image, container runtime, pod sandbox, process isolation, and workload scheduling.
- You can read a manifest and identify missing resources, probes, labels, security context, rollout strategy, and operational risks.

---

## Phase 3: Observability, SLOs, And Incident Response

Now learn how to see and control production systems.

Read in this order:

1. [Observability, SLOs, and incident response](foundations/09-observability-slos-and-incident-response.md)
2. [Prometheus, Grafana, and Alertmanager](foundations/19-prometheus-grafana-and-alertmanager.md)
3. [DevOps troubleshooting and security errors](foundations/26-devops-troubleshooting-and-security-errors.md)

You should be able to answer:

- What is the difference between metric, log, trace, event, alert, SLI, SLO, and error budget?
- How do you design alerts that page for user pain instead of noise?
- How do burn-rate alerts work?
- How do you run an incident without jumping randomly between dashboards?
- How do you separate symptom, signal, cause, mitigation, and prevention?

Exit criteria:

- You can write useful PromQL for latency, errors, saturation, traffic, availability, and burn rate.
- You can explain a clean incident timeline.
- You can propose dashboards and alerts for a service without over-instrumenting it.

---

## Phase 4: Cloud Architecture, Infrastructure, And Delivery

This phase connects systems thinking with production delivery.

Read in this order:

1. [System design and cloud architecture](foundations/07-system-design-cloud-architecture.md)
2. [AWS cloud services and platform design](foundations/14-aws-cloud-services-and-platform-design.md)
3. [Terraform infrastructure as code](foundations/15-terraform-infrastructure-as-code.md)
4. [CI/CD trusted delivery and platform security](foundations/08-cicd-trusted-delivery-and-platform-security.md)
5. [Delivery systems: Jenkins, GitHub Actions, and ArgoCD](foundations/17-delivery-systems-jenkins-github-actions-and-argocd.md)
6. [Git and version control for platform engineers](foundations/16-git-and-version-control-for-platform-engineers.md)

You should be able to answer:

- How do you design a reliable, secure, multi-AZ platform?
- Where should state live, and what should be stateless?
- How should Terraform modules, state, environments, and approvals be organized?
- What makes a deployment pipeline safe?
- How do GitOps, image signing, policy checks, secrets handling, and rollback strategy fit together?

Practice:

- [Cloud design labs](hands-on-labs/cloud-design/)

Exit criteria:

- You can design a platform from load balancer to compute, storage, network, observability, security, delivery, and disaster recovery.
- You can explain tradeoffs instead of listing services.
- You can identify blast radius and failure modes in an architecture.

---

## Phase 5: Automation, Data, And Platform Services

This phase teaches the supporting tools that SREs use to operate platforms at scale.

Read in this order:

1. [Bash and shell scripting](foundations/03-bash-and-shell-scripting.md)
2. [Python for SRE](foundations/04-python-for-sre.md)
3. [Ansible and host automation](foundations/18-ansible-and-host-automation.md)
4. [Kafka and event streaming](foundations/20-kafka-and-event-streaming.md)
5. [SQL and relational data for SRE](foundations/21-sql-and-relational-data-for-sre.md)
6. [HTTP, APIs, and reverse proxy paths](foundations/22-http-apis-and-reverse-proxy-paths.md)
7. [Azure DevOps crossover](foundations/23-azure-devops-crossover.md)
8. [SonarQube and code quality gates](foundations/24-sonarqube-and-code-quality-gates.md)

You should be able to answer:

- When should you use Bash, Python, Ansible, Terraform, or a controller/operator?
- How do you write scripts that are safe, observable, idempotent, and recoverable?
- How do Kafka consumer lag, partitions, ordering, retries, and delivery semantics affect operations?
- Which SQL queries help an SRE investigate performance, errors, and data integrity?
- How do reverse proxies, API gateways, headers, timeouts, retries, and TLS termination affect reliability?

Practice:

- [Bash labs](hands-on-labs/bash/)
- [Python labs](hands-on-labs/python/)

Exit criteria:

- You can automate routine checks without making production more dangerous.
- You can debug common API, proxy, queue, SQL, and automation failures.
- You can explain the operational tradeoff behind each tool.

---

## Phase 6: Synthesis, Capstone, And Staff-Level Reasoning

Finish here after you have enough depth in the earlier phases.

Read in this order:

1. [End-to-end project and capstone patterns](foundations/27-end-to-end-project-and-capstone-patterns.md)
2. [Senior/staff operating manual](foundations/00-senior-staff-operating-manual.md)
3. [Reference answer: GCP public platform](hands-on-labs/cloud-design/reference-answer-gcp-public-platform.md)
4. [Reference answer: GPU ML/AI platform](hands-on-labs/kubernetes/reference-answer-gpu-ml-ai-platform.md)

You should be able to answer:

- How do all layers connect into one production platform?
- How do you reason about reliability, cost, security, operability, and delivery speed at the same time?
- How do you lead an incident, design review, migration, or platform improvement plan?
- How do you turn vague symptoms into a structured investigation?

Exit criteria:

- You can produce an end-to-end design with assumptions, architecture, data flow, failure modes, observability, rollout, and tradeoffs.
- You can identify what a junior, mid-level, senior, and staff-level answer would each include.
- You can explain not only what you would build, but how you would operate it for months.

---

## Optional Track: Nebius AI Sprint

Use this only if you are preparing for a Nebius AI Staff SRE interview. It is intentionally specific and should not be the default learning path.

- [Nebius sprint overview](nebius/README.md)
- [Company, stack, and interview guide](nebius/00-company-stack-interview-guide.md)
- [Linux deep dive](nebius/01-linux-deep-dive.md)
- [Kubernetes and Cilium production](nebius/02-kubernetes-cilium-production.md)
- [GPU AI infrastructure](nebius/03-gpu-ai-infrastructure.md)
- [System design](nebius/04-system-design.md)
- [Coding and algorithms](nebius/05-coding-algorithms.md)
- [Stress interview and incident response](nebius/06-stress-interview-incident-response.md)

---

## Practice Scenarios

Use these after completing the matching foundation phases:

- [Linux and Kubernetes troubleshooting mock](mock-interviews/01-nebius-linux-kubernetes-troubleshooting.md)
- [Distributed systems and resilience mock](mock-interviews/02-distributed-systems-and-resilience.md)
- [Platform, cloud, and security mock](mock-interviews/03-platform-cloud-and-security.md)

---

## Daily Study Rule

Every session should include three things:

- **One concept read** from a foundation guide.
- **One practical drill** from a lab or command sequence.
- **One spoken or written answer** explaining what you learned.

This is the main habit of the site. Read, practice, explain, repeat.
