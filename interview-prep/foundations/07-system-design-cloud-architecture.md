# Foundations: System Design And Cloud Architecture Zero To Hero

System design is not a product-name quiz. It is a structured way to turn vague requirements into reliable, secure, scalable, observable, and operable systems.

For SRE and platform engineers, good architecture means the system can survive failure, explain its behavior, recover safely, and evolve without constant heroics.

This guide is designed as a complete path:

- Beginner: requirements, traffic flow, compute, storage, cache, queues
- Intermediate: load balancing, databases, scaling, async design, observability
- Advanced: HA, DR, consistency, multi-region, capacity planning, rollout safety
- SRE Level: debug slow systems, regional outages, cost spikes, data-tier failures
- Interview Level: explain tradeoffs and design decisions like a senior engineer

---

# Part 1: Memory Palace — Cloud Architecture Is An Airport And City Grid

| Architecture concept | Airport/city analogy | Production meaning |
|---|---|---|
| Region | country hub | geographic deployment area |
| Availability Zone | separate terminal | isolated failure domain |
| VPC | private airport campus | network boundary |
| Subnet | terminal wing | segmented network area |
| Route table | road signs | traffic path rules |
| Load balancer | traffic controller | distributes requests |
| CDN | local kiosk | content close to users |
| WAF | security checkpoint | edge protection |
| App fleet | aircraft/buses | request-serving capacity |
| Database | central records office | stateful source of truth |
| Cache | fast check-in desk | low-latency hot reads |
| Queue | baggage conveyor | async decoupling |
| Observability | control tower | metrics, logs, traces |
| DR site | alternate airport | recovery location |

---

# Part 2: The Senior Design Order

Use this order before naming services:

1. Clarify users and critical journeys.
2. Clarify scale and growth.
3. Clarify latency expectations.
4. Identify the stateful core.
5. Define trust boundaries.
6. Choose compute model.
7. Choose data/cache/queue patterns.
8. Define observability.
9. Define rollout safety.
10. Define HA and DR.
11. Then map to cloud/provider services.

Starting with service names makes the answer shallow.

---

# Part 3: Requirements Gathering

Ask early:

## Functional

- What does the system do?
- Who are the users?
- What are the critical user journeys?
- What data is created/read/updated/deleted?

## Scale

- requests per second?
- read/write ratio?
- object sizes?
- concurrent users?
- geographic distribution?
- peak vs average traffic?

## Reliability

- required uptime?
- acceptable degraded mode?
- RTO and RPO?
- single-region or multi-region?

## Security

- public or private?
- authentication model?
- tenant isolation?
- compliance/audit requirements?

---

# Part 4: Think In Traffic Paths

A common public API path:

```text
DNS -> CDN/WAF -> Load Balancer -> App Fleet -> Cache -> Database
                                      -> Queue -> Workers
Telemetry -> Metrics / Logs / Traces
```

Explain what happens to one request from user to data and back.

This is stronger than listing products.

---

# Part 5: Stateless Edge And Stateful Core

## Stateless Edge

Usually includes:

- web/API servers
- workers
- gateways
- containers

Properties:

- easy to scale horizontally
- easy to replace
- easy to roll back

## Stateful Core

Usually includes:

- database
- object store
- queue state
- identity store

Properties:

- hardest to migrate
- hardest to fail over
- strongest consistency constraints
- biggest RTO/RPO driver

Senior rule:

> Identify the stateful core early.

---

# Part 6: Compute Choices

| Compute model | Good for | Tradeoff |
|---|---|---|
| VM/EC2 | OS control, legacy apps | patching/ops burden |
| Containers/Kubernetes | many services, portability, scheduling | platform complexity |
| Serverless | event-driven, bursty, simple APIs | runtime limits, cold starts |
| Managed PaaS | common app patterns | less deep control |
| Batch/job platform | offline processing | queue/failure design needed |

Choose the smallest platform that satisfies the constraints.

---

# Part 7: Load Balancing And Edge

Edge layer decisions:

- DNS routing
- CDN caching
- WAF/rate limiting
- TLS termination
- L4 vs L7 load balancing
- global vs regional routing

Important details:

- DNS TTL affects failover speed
- CDN cache can hide origin failures or stale data
- L7 load balancers understand HTTP paths/headers
- L4 load balancers are useful for TCP/UDP and low overhead

---

# Part 8: Data Layer Choices

| Need | Typical choice |
|---|---|
| transactions | relational database |
| key-value low latency | NoSQL / DynamoDB-style store |
| hot reads | cache |
| search | search index |
| blobs/files | object storage |
| async events | queue/stream |
| analytics | warehouse/lake |

Ask:

- consistency requirements?
- write volume?
- query patterns?
- data size?
- backup/restore model?
- failover expectations?

---

# Part 9: Cache Design

Caching improves latency and reduces load.

Common patterns:

- read-through
- write-through
- cache-aside
- TTL-based cache
- CDN edge cache

Risks:

- stale data
- cache stampede
- hot keys
- invalidation complexity
- hidden dependency on cache availability

Cache is not a database unless designed that way.

---

# Part 10: Queues And Async Design

Queues decouple producers and consumers.

Use queues for:

- email sending
- image/video processing
- payment post-processing
- event fanout
- workload smoothing

Monitor:

- queue depth
- age of oldest message
- consumer errors
- dead-letter queue count

Tradeoff:

Async design improves resilience but introduces eventual consistency.

---

# Part 11: Consistency And CAP Thinking

Common consistency choices:

- strong consistency
- eventual consistency
- read-your-writes
- monotonic reads

Design question:

> What happens if user sees stale data for 30 seconds?

Some systems can tolerate eventual consistency. Payments, identity, and inventory often need stronger guarantees.

---

# Part 12: Scaling Patterns

## Horizontal scaling

Add more instances.

Good for stateless services.

## Vertical scaling

Use bigger instance/database.

Simple but limited.

## Read replicas

Scale read-heavy workloads.

Watch replication lag.

## Sharding/partitioning

Split data across partitions.

Powerful but complex.

## Backpressure

Protect systems under overload.

Use queues, rate limits, circuit breakers, and graceful degradation.

---

# Part 13: High Availability

HA survives common failures.

Examples:

- app replicas across AZs
- load balancer health checks
- multi-AZ database
- redundant NAT gateways
- queue-based decoupling

Do not claim HA if one hidden dependency is single-AZ.

---

# Part 14: Disaster Recovery

DR handles larger failure or data loss.

Ask:

- RTO: how fast must we recover?
- RPO: how much data loss is acceptable?
- backup frequency?
- restore tested?
- failover manual or automatic?
- failback plan?

DR without restore testing is hope, not design.

---

# Part 15: Observability In Architecture

Design observability upfront:

- request rate
- error rate
- p95/p99 latency
- saturation
- dependency latency
- queue depth
- database metrics
- deploy markers
- tracing by request path

A system is not production-ready if operators cannot tell whether users are hurting.

---

# Part 16: Rollout Safety

Include:

- canary or blue-green
- feature flags
- backward-compatible schema migrations
- config rollout safety
- fast rollback path
- SLO-aware promotion checks

Architecture is incomplete without the change-delivery story.

---

# Part 17: Security Architecture

Think in trust boundaries:

- public edge
- private app tier
- data tier
- admin/control plane
- third-party dependencies
- tenant boundaries

Controls:

- least privilege IAM/RBAC
- network segmentation
- encryption in transit/at rest
- audit logs
- secrets management
- WAF/rate limits
- secure supply chain

---

# Part 18: Capacity And Cost

Capacity planning asks:

- expected peak traffic?
- growth rate?
- bottleneck resource?
- safe headroom?
- autoscaling signal?
- cost per request/job/user?

Cost signals:

- idle compute
- data transfer
- overprovisioned databases
- cache size
- log ingestion
- cross-region replication

Cost is an engineering signal, not only finance work.

---

# Part 19: Real Incident Stories

## API Slow Worldwide

Wrong assumption:

- add more app servers

Better path:

- inspect p99 latency
- database latency
- cache hit rate
- dependency latency
- regional routing

## One Region Down

Better path:

- fail critical traffic to healthy region
- understand data consistency impact
- preserve critical journeys first
- communicate degraded mode

## Cost Explosion

Likely causes:

- NAT/data transfer
- log ingestion
- idle compute
- missing lifecycle rules

## Database Bottleneck

Options:

- optimize queries
- add indexes
- cache reads
- read replicas
- partition/shard if required

Do not jump to sharding first.

---

# Part 20: Common Design Anti-Patterns

Avoid:

- starting with Kubernetes for everything
- public databases
- no rollback path
- no queue for bursty async work
- single-AZ hidden dependency
- average latency dashboards only
- no restore testing
- overusing microservices without operational maturity
- choosing services before requirements

---

# Part 21: Design Walkthrough — Global Checkout API

Requirements:

- global users
- checkout must be reliable
- low p99 latency
- payment dependency can fail
- order state must be durable

Design:

```text
Route53/Global DNS
 -> CDN/WAF
 -> Regional ALB
 -> API service across 3 AZs
 -> Redis cache for hot product/session reads
 -> relational DB for order/payment state
 -> queue for email/inventory events
 -> workers for async tasks
 -> metrics/logs/traces + SLO burn alerts
```

Key tradeoffs:

- orders require strong consistency
- emails can be async
- product catalog can be cached
- payment failure should degrade gracefully
- DR depends on RTO/RPO requirements

---

# Part 22: Interview Questions

- How do you gather requirements?
- How do you choose SQL vs NoSQL?
- Why use a queue?
- How do you design for p99 latency?
- HA vs DR?
- How do you handle regional failure?
- How do you scale a database?
- What do you monitor in a new architecture?
- Why is rollback part of system design?

---

# Part 23: Senior Answer Shape

> I start by clarifying user journeys, scale, latency, availability, data consistency, and security boundaries. Then I design the traffic path from edge to data layer, keeping stateless services horizontally scalable and identifying the stateful core early. I use cache and queues where they reduce latency or decouple failures, but I call out consistency tradeoffs. I include observability, rollout safety, HA, DR, and cost controls before mapping the design to specific cloud services.

---

# Recall Prompts

- Why identify the stateful core early?
- Why does scaling app servers not fix every latency issue?
- Why can queues improve resilience?
- Why is RTO different from RPO?
- Why should design answers include rollback?
