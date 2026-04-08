# Foundations: System Design And Cloud Architecture For Senior SRE And Platform Roles

This file is the missing bridge between component knowledge and real architecture interviews.

## Mentor Mode

Do not start a senior system design answer by naming cloud products.

Start with:

1. who uses the system
2. traffic shape and scale
3. availability target and recovery expectation
4. latency target and where it matters
5. consistency requirements
6. security and compliance boundaries
7. change velocity and operator burden

Only after that should you map to cloud resources.

## The End-To-End Architecture Checklist

When designing a serious production system, explicitly consider:

- internet edge or private entry point
- DNS and failover behavior
- CDN or edge caching
- L4 or L7 load balancing
- WAF and DDoS protection
- public, private, and internal network boundaries
- route tables and egress path
- firewall layers
- compute platform choice
- stateless versus stateful boundaries
- cache strategy
- database and persistence
- async messaging
- observability
- alerting and SLOs
- CI/CD and rollout safety
- secrets and identity
- backups and disaster recovery
- tenancy boundaries
- cost and operational complexity

If you omit half of these, the answer often sounds mid-level.

## Compute Choice Framework

### VMs

Use when you need:

- full OS control
- custom kernel or network behavior
- unusual runtime requirements
- stateful or legacy workloads

### Kubernetes

Use when you need:

- many services with strong operational standardization
- portable deployment model
- multi-team platform controls
- resource packing and scheduling

### Cloud Run Or Serverless

Use when you need:

- fast product delivery
- stateless services
- elastic scale without cluster operations
- simple HTTP or event-driven workloads

Do not force all workloads into one model.

## Edge And Traffic Layers

### DNS

DNS does not create instant failover. TTL, resolver behavior, caching, and client behavior all matter.

### CDN

CDN helps when:

- content is cacheable
- users are geographically distributed
- origin protection matters
- TLS termination and edge presence reduce latency

But CDN can also:

- cache bad content
- hide origin failures temporarily
- make invalidation and consistency more complicated

### Load Balancers

Know when you need:

- L4 network load balancing
- L7 application routing
- internal load balancing
- global versus regional traffic steering

Health checks are crucial, but shallow health checks are dangerous.

### WAF And Edge Protection

Application-facing systems usually need:

- DDoS protection
- WAF rules
- rate limiting
- bot or abuse controls
- source reputation or geo policy where justified

## Network Architecture

Senior answers should explicitly talk about:

- public subnets or public entry points
- private app subnets
- data subnets
- east-west versus north-south traffic
- egress control
- route tables
- firewall or SG and NACL layering
- private service connectivity

AWS-specific habit:

- explain the difference between security groups and network ACLs
- SGs are resource-level and stateful
- NACLs are subnet-level and stateless

GCP-specific habit:

- explain global VPC behavior, regional subnets, firewall policy, and internal versus external load balancing choices

## Stateful Versus Stateless

Stateless components:

- easier to scale horizontally
- easier to replace
- easier to load balance

Stateful components:

- dominate failover and consistency design
- need backup, recovery, and topology thought
- often determine real RTO and RPO

Senior interview rule:

- identify the stateful core early

## Data Layer Design

Ask:

- is relational consistency required
- is read latency more important than write throughput
- do we need strong transactions
- what is acceptable data loss
- how will failover affect correctness

Common production choices:

- relational database for transactional truth
- cache for latency and read relief
- queue or pub-sub for async decoupling
- search or analytics store for derived workloads

## Async Systems: Pub/Sub, Kafka, Queues

Use async messaging for:

- workload smoothing
- decoupling
- fan-out
- retries outside the request path

But always explain:

- ordering requirements
- duplication handling
- dead-letter strategy
- backpressure
- lag monitoring
- idempotency

## Security Architecture

Senior/system answers should cover:

- identity for humans and workloads
- least privilege
- secret storage and rotation
- encryption in transit
- encryption at rest
- network segmentation
- image or artifact trust
- auditability
- incident containment

## Observability Architecture

You should account for:

- service metrics
- infrastructure metrics
- logs
- traces
- correlation IDs
- SLOs
- synthetic checks
- alert routing
- dashboard and dependency views

Also consider ELK and OpenTelemetry explicitly when relevant:

- ELK or Elastic Observability for log and search-heavy workflows
- OpenTelemetry for vendor-neutral instrumentation and telemetry pipeline design

## High Availability And Disaster Recovery

Distinguish:

- multi-instance
- multi-zone
- multi-region
- active-passive
- active-active
- failover versus resilience
- service continuity versus full correctness

Always ask:

- what is the real RTO
- what is the real RPO
- who triggers failover
- how is failback handled

## System Design Walkthrough Template

Use this order in interviews:

1. clarify requirements
2. identify critical user journeys
3. split synchronous and asynchronous paths
4. identify stateful core
5. place edge, network, and compute layers
6. design storage, caching, and messaging
7. define observability and SLOs
8. define security controls
9. explain failure handling and recovery
10. explain rollout and operational model

## Senior Practice Drills

1. Design a public API with CDN, DNS, WAF, LB, Kubernetes, cache, relational DB, and Pub/Sub.
2. Redesign it for internal-only traffic over private networking.
3. Explain how the design changes if p99 latency matters more than raw throughput.
4. Explain how the design changes if the data layer must survive regional failure with minimal data loss.
5. Explain where Cloud Run beats GKE and where GKE beats Cloud Run.
