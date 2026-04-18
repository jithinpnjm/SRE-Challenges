# Learning Path: From Foundations to Staff-Level Fluency

This is the recommended reading order for building real senior and staff-level platform engineering depth — not just knowing the answers, but understanding the why and the what-breaks.

---

## Phase 1: Linux and Networking Core

These are the hardest things to fake in a technical conversation. Start here.

1. [foundations/10-linux-and-network-administration.md](foundations/10-linux-and-network-administration.md)
2. [foundations/01-networking-fundamentals.md](foundations/01-networking-fundamentals.md)
3. [foundations/02-linux-kubernetes-foundations.md](foundations/02-linux-kubernetes-foundations.md)
4. [foundations/05-linux-debug-playbook.md](foundations/05-linux-debug-playbook.md)

Goal: become confident with Linux host triage, TCP/IP packet flow, kernel memory and process model, and the link between Linux internals and Kubernetes node behavior.

Hands-on:
- [hands-on-labs/linux/](hands-on-labs/linux/)
- [hands-on-labs/linux-admin/](hands-on-labs/linux-admin/)
- [hands-on-labs/networking/](hands-on-labs/networking/)

---

## Phase 2: Kubernetes and Containers

1. [foundations/06-kubernetes-networking-deep-dive.md](foundations/06-kubernetes-networking-deep-dive.md)
2. [foundations/11-cloud-networking-and-kubernetes-networking.md](foundations/11-cloud-networking-and-kubernetes-networking.md)
3. [foundations/13-docker-and-container-runtime.md](foundations/13-docker-and-container-runtime.md)
4. [foundations/25-yaml-and-kubernetes-manifest-design.md](foundations/25-yaml-and-kubernetes-manifest-design.md)
5. [foundations/12-kubernetes-gpu-ai-platforms-and-operators.md](foundations/12-kubernetes-gpu-ai-platforms-and-operators.md)

Goal: trace a request from DNS through kube-proxy to a pod, understand overlay2 layering and containerd/runc, write production-quality manifests, and understand GPU scheduling and operators.

Hands-on:
- [hands-on-labs/kubernetes/](hands-on-labs/kubernetes/)
- [hands-on-labs/cloud-networking/](hands-on-labs/cloud-networking/)

---

## Phase 3: Observability and Reliability

1. [foundations/09-observability-slos-and-incident-response.md](foundations/09-observability-slos-and-incident-response.md)
2. [foundations/19-prometheus-grafana-and-alertmanager.md](foundations/19-prometheus-grafana-and-alertmanager.md)
3. [foundations/26-devops-troubleshooting-and-security-errors.md](foundations/26-devops-troubleshooting-and-security-errors.md)

Goal: design SLOs and error budgets from scratch, write PromQL queries and multi-window burn rate alerts, run structured incident triage across Kubernetes, CI/CD, and cloud layers.

---

## Phase 4: Cloud, Infrastructure, and Delivery

1. [foundations/07-system-design-cloud-architecture.md](foundations/07-system-design-cloud-architecture.md)
2. [foundations/14-aws-cloud-services-and-platform-design.md](foundations/14-aws-cloud-services-and-platform-design.md)
3. [foundations/15-terraform-infrastructure-as-code.md](foundations/15-terraform-infrastructure-as-code.md)
4. [foundations/08-cicd-trusted-delivery-and-platform-security.md](foundations/08-cicd-trusted-delivery-and-platform-security.md)
5. [foundations/17-delivery-systems-jenkins-github-actions-and-argocd.md](foundations/17-delivery-systems-jenkins-github-actions-and-argocd.md)
6. [foundations/16-git-and-version-control-for-platform-engineers.md](foundations/16-git-and-version-control-for-platform-engineers.md)

Goal: design multi-AZ VPCs, write Terraform modules with split state, build CI pipelines with image signing and policy gates, and operate GitOps-driven deployments.

Hands-on:
- [hands-on-labs/cloud-design/](hands-on-labs/cloud-design/)

---

## Phase 5: Platform Services and Tooling

1. [foundations/18-ansible-and-host-automation.md](foundations/18-ansible-and-host-automation.md)
2. [foundations/20-kafka-and-event-streaming.md](foundations/20-kafka-and-event-streaming.md)
3. [foundations/21-sql-and-relational-data-for-sre.md](foundations/21-sql-and-relational-data-for-sre.md)
4. [foundations/22-http-apis-and-reverse-proxy-paths.md](foundations/22-http-apis-and-reverse-proxy-paths.md)
5. [foundations/23-azure-devops-crossover.md](foundations/23-azure-devops-crossover.md)
6. [foundations/24-sonarqube-and-code-quality-gates.md](foundations/24-sonarqube-and-code-quality-gates.md)

Goal: automate host configuration at scale, understand Kafka consumer lag and delivery semantics, write SRE-relevant SQL queries, debug the HTTP request path through NGINX and Envoy, and integrate quality gates.

---

## Phase 6: Scripting and Automation

1. [foundations/03-bash-and-shell-scripting.md](foundations/03-bash-and-shell-scripting.md)
2. [foundations/04-python-for-sre.md](foundations/04-python-for-sre.md)

Hands-on:
- [hands-on-labs/bash/](hands-on-labs/bash/)
- [hands-on-labs/python/](hands-on-labs/python/)

---

## Phase 7: Synthesis and Design Depth

1. [foundations/27-end-to-end-project-and-capstone-patterns.md](foundations/27-end-to-end-project-and-capstone-patterns.md)
2. [foundations/00-senior-staff-operating-manual.md](foundations/00-senior-staff-operating-manual.md)
3. [hands-on-labs/cloud-design/reference-answer-gcp-public-platform.md](hands-on-labs/cloud-design/reference-answer-gcp-public-platform.md)
4. [hands-on-labs/kubernetes/reference-answer-gpu-ml-ai-platform.md](hands-on-labs/kubernetes/reference-answer-gpu-ml-ai-platform.md)

Goal: compose all layers into a complete production system design. Use the reference answers to calibrate what staff-level depth looks like.

---

## Nebius AI Sprint (10 Days)

If you have a specific Nebius AI Staff SRE interview:

- [nebius/README.md](nebius/README.md) — sprint overview and daily plan
- [nebius/00-company-stack-interview-guide.md](nebius/00-company-stack-interview-guide.md)
- [nebius/01-linux-deep-dive.md](nebius/01-linux-deep-dive.md)
- [nebius/02-kubernetes-cilium-production.md](nebius/02-kubernetes-cilium-production.md)
- [nebius/03-gpu-ai-infrastructure.md](nebius/03-gpu-ai-infrastructure.md)
- [nebius/04-system-design.md](nebius/04-system-design.md)

---

## Practice Scenarios

Use these after completing relevant foundation phases:

- [mock-interviews/01-nebius-linux-kubernetes-troubleshooting.md](mock-interviews/01-nebius-linux-kubernetes-troubleshooting.md)
- [mock-interviews/02-distributed-systems-and-resilience.md](mock-interviews/02-distributed-systems-and-resilience.md)
- [mock-interviews/03-platform-cloud-and-security.md](mock-interviews/03-platform-cloud-and-security.md)

---

## Daily Practice Rule

Every session, try to do all three:

- one concept read (foundation guide)
- one drill or lab (hands-on-labs)
- one spoken answer (mock scenario or practice question)

That combination compounds faster than passive reading alone.
