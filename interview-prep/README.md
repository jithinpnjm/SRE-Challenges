# Interview Prep Pack

This pack is a production-oriented interview system for Senior SRE, DevOps Engineer, and Platform Engineer preparation.

It is designed for:

- SRE and platform breadth across Linux, networking, Kubernetes, observability, CI/CD, cloud, resilience, security, and incident work
- deep interview practice in distributed production design, low-latency systems, and high-availability tradeoffs
- Nebius-style preparation with extra emphasis on Linux, networking principles, Kubernetes internals, troubleshooting, and distributed system reasoning
- GCP-first scenarios with AWS crossover challenges so you can translate principles across cloud providers

## How To Use This Pack

Use the structured progression in [learning-path.md](learning-path.md).

Short version:

1. foundations
2. beginner
3. intermediate
4. expert
5. hands-on labs
6. mock interviews

Work challenge-by-challenge, not file-by-file. For each prompt:

- answer aloud in 10 to 20 minutes
- write a short architecture or incident note
- list assumptions before solutions
- name failure modes before optimizations
- explain how you would validate your answer in production
- compare a GCP choice with an AWS equivalent when relevant

## Recommended Study Rhythm

- Week 1: close gaps in Linux, networking, Kubernetes fundamentals, and observability basics
- Week 2: focus on troubleshooting, incident response, production debugging, and alert quality
- Week 3: push into system design, resilience, low latency, HA, and cloud architecture
- Week 4: run timed mock interviews, review weak spots, and rehearse concise senior-level communication

The detailed schedule is in [4-week-roadmap.md](4-week-roadmap.md).

## 10-Day Interview Sprint

If your interview is in 10 days, do not try to read everything evenly. Prioritize the highest-signal path below.

### Day 1: Linux And Admin Base

Read:

- [foundations/10-linux-and-network-administration.md](foundations/10-linux-and-network-administration.md)
- [foundations/05-linux-debug-playbook.md](foundations/05-linux-debug-playbook.md)
- [hands-on-labs/linux-admin/README.md](hands-on-labs/linux-admin/README.md)

Do:

- one Linux admin drill
- one spoken answer for "host is slow"

### Day 2: Networking Fundamentals

Read:

- [foundations/01-networking-fundamentals.md](foundations/01-networking-fundamentals.md)
- [foundations/11-cloud-networking-and-kubernetes-networking.md](foundations/11-cloud-networking-and-kubernetes-networking.md)

Do:

- [hands-on-labs/networking/lab-01-http-dns-flow.md](hands-on-labs/networking/lab-01-http-dns-flow.md)
- [hands-on-labs/networking/lab-02-ssh-latency.md](hands-on-labs/networking/lab-02-ssh-latency.md)

### Day 3: Kubernetes Core Internals

Read:

- [foundations/02-linux-kubernetes-foundations.md](foundations/02-linux-kubernetes-foundations.md)
- [foundations/06-kubernetes-networking-deep-dive.md](foundations/06-kubernetes-networking-deep-dive.md)
- [beginner/02-kubernetes.md](beginner/02-kubernetes.md)

Do:

- [hands-on-labs/kubernetes/lab-01-pod-service-debug.md](hands-on-labs/kubernetes/lab-01-pod-service-debug.md)

### Day 4: Kubernetes Expert Topics

Read:

- [foundations/12-kubernetes-gpu-ai-platforms-and-operators.md](foundations/12-kubernetes-gpu-ai-platforms-and-operators.md)
- [expert/02-kubernetes.md](expert/02-kubernetes.md)

Do:

- [hands-on-labs/kubernetes/lab-04-gpu-ml-ai-platform-review.md](hands-on-labs/kubernetes/lab-04-gpu-ml-ai-platform-review.md)

### Day 5: Observability And Incident Response

Read:

- [foundations/09-observability-slos-and-incident-response.md](foundations/09-observability-slos-and-incident-response.md)
- [expert/03-observability-incident-response.md](expert/03-observability-incident-response.md)

Do:

- answer two incident questions aloud
- write one mock incident update and one postmortem action list

### Day 6: System Design And Cloud Architecture

Read:

- [foundations/07-system-design-cloud-architecture.md](foundations/07-system-design-cloud-architecture.md)
- [expert/05-system-design-cloud.md](expert/05-system-design-cloud.md)
- [hands-on-labs/cloud-design/reference-answer-gcp-public-platform.md](hands-on-labs/cloud-design/reference-answer-gcp-public-platform.md)

Do:

- [hands-on-labs/cloud-design/lab-01-gcp-public-platform.md](hands-on-labs/cloud-design/lab-01-gcp-public-platform.md)

### Day 7: CI/CD And Platform Security

Read:

- [foundations/08-cicd-trusted-delivery-and-platform-security.md](foundations/08-cicd-trusted-delivery-and-platform-security.md)
- [expert/04-cicd-release-security.md](expert/04-cicd-release-security.md)

Do:

- answer one trusted-delivery design question
- answer one break-glass and one runner-compromise question aloud

### Day 8: Cloud Networking And Architecture Review

Read:

- [hands-on-labs/cloud-networking/README.md](hands-on-labs/cloud-networking/README.md)

Do:

- [hands-on-labs/cloud-networking/drill-02-gcp-vpc-and-load-balancing.md](hands-on-labs/cloud-networking/drill-02-gcp-vpc-and-load-balancing.md)
- [hands-on-labs/cloud-networking/drill-03-aws-vpc-sg-nacl-and-routing.md](hands-on-labs/cloud-networking/drill-03-aws-vpc-sg-nacl-and-routing.md)

### Day 9: Mock Interview Day

Run:

- [mock-interviews/01-nebius-linux-kubernetes-troubleshooting.md](mock-interviews/01-nebius-linux-kubernetes-troubleshooting.md)
- [mock-interviews/02-distributed-systems-and-resilience.md](mock-interviews/02-distributed-systems-and-resilience.md)

Do:

- keep answers concise
- focus on flow, failure domains, and operator decisions

### Day 10: Final Tightening

Review only:

- weak Linux and networking areas
- weak Kubernetes areas
- one system design answer
- one incident answer

Do not broaden scope on the last day. Tighten clarity and confidence.

## What To Prioritize Most For Your Interview

If time gets squeezed, prioritize in this order:

1. Linux troubleshooting and administration
2. Networking fundamentals and packet-path reasoning
3. Kubernetes internals and troubleshooting
4. System design and cloud networking
5. Incident response and observability
6. CI/CD and platform security

## Daily Output Rule

Each day, produce three things:

- one spoken answer
- one written answer using [answers-template.md](answers-template.md)
- one drill or lab

That is the fastest path to interview readiness in 10 days.

## Structure

- [foundations](foundations/README.md)
- [hands-on-labs](hands-on-labs/README.md)
- [beginner](beginner/README.md)
- [intermediate](intermediate/README.md)
- [expert](expert/README.md)
- [mock-interviews](mock-interviews/README.md)
- [sources-and-references.md](sources-and-references.md)
- [learning-path.md](learning-path.md)
- [answers-template.md](answers-template.md)

## Best Daily Entry Point

Use the Docusaurus portal as your main daily entry point during the 10-day sprint.

Run:

```bash
cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/prep-portal
npm start
```

Then use:

- home page for the 10-day sprint sequence
- sidebar for navigation
- local search for fast lookup
- `Answer Workspace` page to draft answers before sending them to me
- [interactive-study.mdx](interactive-study.mdx) for a guided answer-and-review flow

## Mentor Mode

This pack now has two layers:

- foundation guides to teach concepts and mental models
- challenge packs to make you practice explaining, debugging, and designing like an interviewer expects

When you get stuck, use this sequence:

1. Re-explain the flow of the system from first principles.
2. Identify the layer where the symptom first appears.
3. Name the commands, metrics, and logs that can confirm or reject your theory.
4. Only then propose fixes.

Example:

- if SSH is slow, think through the flow first: DNS, TCP connect, SSH negotiation, key exchange, auth, shell startup
- once the flow is clear, every command becomes more meaningful: `ssh -vvv`, `dig`, `ss`, `journalctl`, `tcpdump`

The detailed foundation material lives in:

- [foundations/00-senior-staff-operating-manual.md](foundations/00-senior-staff-operating-manual.md)
- [foundations/01-networking-fundamentals.md](foundations/01-networking-fundamentals.md)
- [foundations/02-linux-kubernetes-foundations.md](foundations/02-linux-kubernetes-foundations.md)
- [foundations/03-bash-and-shell-scripting.md](foundations/03-bash-and-shell-scripting.md)
- [foundations/04-python-for-sre.md](foundations/04-python-for-sre.md)
- [foundations/05-linux-debug-playbook.md](foundations/05-linux-debug-playbook.md)
- [foundations/06-kubernetes-networking-deep-dive.md](foundations/06-kubernetes-networking-deep-dive.md)
- [foundations/07-system-design-cloud-architecture.md](foundations/07-system-design-cloud-architecture.md)

The practice layer lives in:

- [hands-on-labs/README.md](hands-on-labs/README.md)

The CI/CD and trusted delivery foundation lives in:

- [foundations/08-cicd-trusted-delivery-and-platform-security.md](foundations/08-cicd-trusted-delivery-and-platform-security.md)

The observability and incident-response foundation lives in:

- [foundations/09-observability-slos-and-incident-response.md](foundations/09-observability-slos-and-incident-response.md)

The Linux, network administration, cloud networking, and advanced Kubernetes platform foundations live in:

- [foundations/10-linux-and-network-administration.md](foundations/10-linux-and-network-administration.md)
- [foundations/11-cloud-networking-and-kubernetes-networking.md](foundations/11-cloud-networking-and-kubernetes-networking.md)
- [foundations/12-kubernetes-gpu-ai-platforms-and-operators.md](foundations/12-kubernetes-gpu-ai-platforms-and-operators.md)

## Interview Answer Standards

For senior-level answers, aim to consistently cover:

- requirements and constraints
- failure domains
- observability and diagnostics
- rollback and safe rollout strategy
- security and least privilege
- operational ownership and on-call impact
- capacity and cost tradeoffs
- regional and zonal blast radius
- how you would test, verify, and game-day the design

## Nebius Bias

For Nebius-oriented prep, spend extra time on:

- Linux process, memory, IO, and network debugging
- DNS, TCP, routing, MTU, conntrack, load balancing, and packet flow reasoning
- Kubernetes scheduling, kubelet behavior, probes, QoS, evictions, CNI, and control plane interactions
- distributed service design under latency and failure pressure
- incident handling with incomplete information

## How I Can Help You Next

You can use this pack with me as a learning partner later. I can:

- run live mock interviews from any file
- review your answers and score them like an interviewer
- give hints instead of solutions
- turn a prompt into a hands-on repo exercise
- create follow-up drills only for the areas where you struggle
