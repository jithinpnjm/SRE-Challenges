# Beginner: System Design, Cloud Architecture, And Security

## Mentor Mindset

Before drawing components, ask:

- who uses this system
- what matters most: latency, availability, consistency, cost, security, or simplicity
- what failure domains exist
- what happens when a dependency is slow, wrong, or unavailable

## Where To Practice And Simulate

- use [foundations/07-system-design-cloud-architecture.md](../foundations/07-system-design-cloud-architecture.md) as the base framework
- use GCP docs for architecture drills: https://cloud.google.com/architecture/framework
- use AWS reliability guidance for crossover thinking: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html

## Challenge 1: Highly Available Internal API

Scenario: Design an internal control-plane API used by deployment systems. It must be highly available, moderately low latency, and auditable. Traffic is mostly from GCP, but some workloads run in AWS.

Your task:

- design the service at a high level
- explain stateless versus stateful components
- explain load balancing, database choice, caching, and failure domains
- describe the minimum security controls

## Challenge 2: GCP To AWS Translation

Prompt:

- map these GCP concepts to AWS rough equivalents:
- GKE
- Cloud Load Balancing
- Cloud Armor
- Cloud DNS
- Cloud Run
- Cloud Monitoring
- Pub/Sub
- IAM service accounts

Then explain which mappings are approximate rather than exact.

## Challenge 3: Regional Failure

Scenario: Your primary GCP region becomes degraded. Some control-plane operations still work, but write latency to a backing data store jumps.

Your task:

- explain your immediate response
- explain the difference between active-active and active-passive options
- explain what data consistency questions matter before failover

## Challenge 4: Low-Latency Design Basics

Prompt:

- explain the main sources of latency in a distributed request path
- explain why queues, retries, DNS, TLS handshakes, and cross-zone traffic matter
- describe three practical ways to reduce tail latency without risky micro-optimization

## Challenge 5: Secure Platform Baseline

Prompt:

- describe the baseline controls you would require for a new service platform
- include IAM, network boundaries, secrets, image provenance, logging, auditability, and patching

## Extra Deep-Dive Prompts

### Challenge 8: Public Versus Private Service

Your task:

- explain what changes when a service is internet-facing versus internal-only
- explain how DNS, CDN, LB, WAF, firewall, routing, and identity choices change

### Challenge 9: Stateless Versus Stateful Design

Your task:

- explain how stateless and stateful parts of the same system should be separated
- explain why state determines most HA and DR complexity

Nebius interview note:

- keep your system design answers grounded in packets, process behavior, failure domains, and operational debugging paths

## Extra Challenges

### Challenge 6: Load Balancer Basics

Your task:

- explain L4 versus L7 load balancing
- explain health checks, session affinity, and why bad health checks can route traffic to broken backends

### Challenge 7: Cloud IAM Basics

Your task:

- explain least privilege
- explain service accounts or IAM roles for workloads
- explain why broad permissions become operational risk, not just security risk
