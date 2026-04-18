# Foundations: System Design And Cloud Architecture For Senior And Staff-Level Roles

System design interviews are not really product-architecture quizzes. They are tests of judgment.

The interviewer wants to see whether you can take vague requirements, discover the real constraints, choose sane building blocks, protect the stateful core, and explain how the system survives failure and change.

## Mentor Mode

Do not begin with cloud services.

Begin with pressure.

Ask:

1. Who are the users and what are the critical journeys?
2. What scale are we designing for now and later?
3. What matters most: correctness, latency, availability, or speed of delivery?
4. Which parts are stateful and therefore hard to move, fail over, or recover?
5. Which failures are acceptable and which ones are business-critical?
6. What are the security and trust boundaries?
7. What kind of operator burden can the team actually absorb?

That is how senior answers stay grounded.

## Answer This In The Portal

- Draft your architecture answer here: [/workspace?challenge=End-to-end%20cloud%20system%20design](/workspace?challenge=End-to-end%20cloud%20system%20design)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- Guided review flow: [interactive-study.mdx](../interactive-study.mdx)

## The Design Order That Keeps You Honest

Use this order in interviews:

1. clarify functional requirements
2. clarify non-functional requirements
3. identify critical synchronous paths
4. identify stateful core and blast radius
5. place edge and network boundaries
6. choose compute model
7. choose storage, cache, and messaging model
8. define security and identity controls
9. define observability and SLO signals
10. explain failure handling, DR, and rollout model

If you skip straight to products, your answer usually sounds mid-level.

## Requirement Questions You Should Ask Early

### Scale

Ask:

- requests per second
- read versus write ratio
- data size and growth
- regional distribution
- burstiness
- expected concurrent connections

### Availability

Ask:

- target uptime
- acceptable degraded mode
- RTO
- RPO
- whether single-region outage must be survived

### Latency

Ask:

- p50 versus p99 sensitivity
- geographic user distribution
- where time matters most: connect, read, write, inference, or fan-out

### Security

Ask:

- internet-facing or internal-only
- compliance boundary
- tenant isolation requirement
- secrets and key management requirement
- audit and forensics expectations

## End-To-End Cloud Architecture Checklist

Senior designs usually need explicit thinking on:

- DNS
- CDN
- WAF and DDoS protection
- L4 or L7 load balancing
- public and private entry points
- subnet layout
- route tables
- firewall policy
- egress control
- workload identity
- stateless app layer
- stateful data layer
- cache
- queue or stream
- observability
- CI/CD and rollout controls
- backup and disaster recovery
- cost and operational complexity

If your answer does not mention half of these, it is probably too shallow.

## Think In Traffic Paths, Not Service Lists

For a public API platform, narrate the path:

1. client resolves DNS
2. request lands on CDN or edge
3. WAF and edge policy inspect
4. load balancer sends to compute tier
5. app tier authenticates and serves
6. app uses cache for hot reads
7. app writes or reads from relational or stateful store
8. async events go to Pub/Sub, Kafka, or queue
9. telemetry goes to metrics, logs, and tracing systems

This is much stronger than saying “I would use Cloud DNS, GKE, Redis, Cloud SQL, and Pub/Sub.”

## Compute Choice Framework

### VMs

Choose VMs when you need:

- kernel or OS control
- custom host agents
- strong isolation from shared orchestration policies
- stateful or legacy software that does not fit containers cleanly

### Kubernetes

Choose Kubernetes when you need:

- many services with a common deployment model
- multi-team platform controls
- rich scheduling and policy
- sidecars, meshes, operators, or specialized workload patterns

### Serverless Or Cloud Run-Style Platforms

Choose serverless when you need:

- stateless services
- fast delivery
- elastic burst handling
- simpler operational overhead

Senior note:

- choosing the smallest sufficient platform is often a stronger answer than choosing the most complex one

## Edge Architecture

### DNS

DNS is not instant failover. Caches, TTL behavior, and resolver choices matter.

Talk about:

- authoritative ownership
- health-driven failover limits
- split-horizon or private DNS if relevant
- how internal services resolve each other

### CDN

CDN helps when:

- responses are cacheable
- users are globally distributed
- edge TLS termination helps latency
- origin protection matters

But you should also mention:

- invalidation strategy
- stale cache risk
- personalization limits
- origin bypass risks

### Load Balancers

Explain whether you need:

- L4 pass-through
- L7 routing
- internal load balancing
- global anycast or regional balancing
- connection stickiness
- weighted routing or canarying

Health checks matter, but shallow health checks are not enough.

A healthy TCP port is not always a healthy backend.

### WAF And Abuse Controls

For internet-facing systems, mention:

- DDoS protection
- WAF rules
- rate limiting
- authn/authz enforcement at the edge where appropriate
- bot and abuse protections

## Network Design The Senior Way

### Public, Private, And Internal Boundaries

You should be able to clearly separate:

- public ingress
- private app tiers
- data subnets or private services
- control-plane access paths
- east-west traffic
- north-south traffic

### Routing And Egress

Ask:

- how do workloads reach the internet
- which traffic should never egress publicly
- is private service access or private endpoint connectivity needed
- what route tables govern this path
- where can misrouting or asymmetric behavior appear

### Firewall Layers

In AWS:

- security groups are stateful and resource-scoped
- NACLs are stateless and subnet-scoped

In GCP:

- VPC is global
- subnets are regional
- firewall rules and policy apply differently than AWS models

Staff-level note:

- a good answer explains the path and policy model, not just provider product names

## Stateful Core Versus Stateless Edge

This is one of the most important distinctions in system design.

### Stateless Tier

Usually:

- horizontally scalable
- replaceable
- easier to canary or roll back
- simpler to put behind load balancers

### Stateful Tier

Usually:

- hardest to recover
- hardest to replicate correctly
- biggest determinant of true RTO and RPO
- the real source of consistency tradeoffs

Senior rule:

- identify the stateful core early and design around it

## Data Layer Design

Ask:

- do you need transactions
- do you need strong consistency
- do you need high write throughput
- what is the acceptable data loss
- what is the failover model
- what is the backup and restore model

Common choices:

- relational DB for source of truth
- cache for hot reads and latency control
- stream or queue for asynchronous decoupling
- search store for derived querying
- object storage for durable blobs and snapshots

## Caches And Latency

Caches are not just speed tools. They are correctness and failure-domain decisions.

You should mention:

- read-through versus write-through behavior
- invalidation strategy
- TTL strategy
- stampede protection
- cache warm-up and cold-start risk
- what happens if cache is unavailable

## Messaging, Streams, And Background Work

Use async messaging for:

- decoupling
- retries
- smoothing spikes
- fan-out
- long-running or non-user-facing work

But explain:

- delivery semantics
- ordering
- idempotency
- poison messages
- dead-letter handling
- lag monitoring
- backpressure

This is where many “good” answers become senior answers.

## Security Architecture

Your answer should usually include:

- workload identity
- human access model
- least privilege
- secret storage and rotation
- encryption in transit
- encryption at rest
- tenancy and namespace isolation
- artifact trust
- audit logging
- incident containment

For application-facing systems, also mention:

- public versus private endpoints
- admin plane isolation
- internal service-to-service authentication

## Observability And Operations

Do not bolt observability on at the end.

Plan for:

- metrics
- logs
- traces
- correlation IDs
- SLOs
- alert routing
- synthetic checks
- dependency visibility
- dashboards that match user journeys

Mention OpenTelemetry and ELK or Elastic where relevant:

- OpenTelemetry for consistent instrumentation and pipelines
- ELK or Elastic for log-heavy search and investigation workflows

## Rollouts And Change Safety

A system is not production-ready if the only deployment story is “update the cluster.”

You should mention:

- canary or rolling deployment
- health-based rollback
- schema migration strategy
- config rollout safety
- blast radius control
- break-glass path
- release observability

## High Availability And Disaster Recovery

Do not blur these together.

### High Availability

This is about surviving normal component failure with little or no user-visible impact.

Examples:

- multiple instances
- multi-AZ deployment
- redundant load balancers
- healthy failover inside one region

### Disaster Recovery

This is about restoring service after larger failures.

Examples:

- region failure
- corrupted database
- bad deployment with data impact
- control-plane loss

Ask:

- what is the real RTO
- what is the real RPO
- who triggers failover
- how failback works
- how backups are tested

## Staff-Level Scenarios

### Scenario 1: Public Multi-Region API

A strong answer should cover:

- DNS and CDN path
- WAF
- global versus regional balancing
- stateless app tier
- region-scoped cache
- relational truth store and replication decision
- async event path
- observability
- canary rollout
- degraded mode if one region fails

### Scenario 2: Internal Platform Only

A strong answer should cover:

- private DNS
- internal load balancing
- no public ingress except controlled admin path
- private service connectivity
- IAM and identity boundaries
- auditability
- supportability for other internal teams

### Scenario 3: Low-Latency AI Or Inference Platform

A strong answer should cover:

- p99 sensitivity
- warm capacity versus cold scale-out
- model placement
- GPU or specialized compute path
- request routing
- cache and feature-store locality
- backpressure under overload
- streaming and batch separation

## What Good Sounds Like In An Interview

If someone asks, “Design a globally available production API,” a strong answer sounds like this:

1. I would first clarify availability target, acceptable data loss, and where latency matters most.
2. I would separate the public edge path from the private service and data paths.
3. I would keep the request-serving layer stateless and identify the relational or stateful core early.
4. I would use cache and asynchronous messaging to remove unnecessary work from the synchronous path.
5. I would define the security boundaries at the edge, workload, and data layers.
6. I would explain observability, release safety, and failover as part of the design, not as add-ons.
7. I would then choose concrete cloud services based on those requirements.

That answer sounds like someone who has operated real systems.

## Reinforcement From Your Archive

Use these after this guide if you want more detail:

- [14-aws-cloud-services-and-platform-design.md](./14-aws-cloud-services-and-platform-design.md)
- [15-terraform-infrastructure-as-code.md](./15-terraform-infrastructure-as-code.md)
- [22-http-apis-and-reverse-proxy-paths.md](./22-http-apis-and-reverse-proxy-paths.md)
- [19-prometheus-grafana-and-alertmanager.md](./19-prometheus-grafana-and-alertmanager.md)
- [20-kafka-and-event-streaming.md](./20-kafka-and-event-streaming.md)
- [27-end-to-end-project-and-capstone-patterns.md](./27-end-to-end-project-and-capstone-patterns.md)
