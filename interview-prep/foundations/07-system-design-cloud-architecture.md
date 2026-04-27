# Foundations: System Design And Cloud Architecture For Senior And Staff-Level Roles

System design interviews are not product quizzes. They are judgment tests.

The easiest way to remember modern cloud architecture is as a global airport and city transport network.

---

## What This Foundation Must Help You Do

By the end of this guide, you should be able to:

- turn vague requirements into clear architecture decisions
- reason about scale, latency, availability, and security tradeoffs
- explain traffic paths instead of naming random services
- protect the stateful core of systems
- discuss HA, DR, rollout safety, and operability like a senior engineer

---

## Memory Palace: Cloud Architecture Is An Airport + City Grid

Imagine serving millions of travelers across connected airports and cities.

| Cloud concept | Airport / city analogy | Production meaning |
|---|---|---|
| Region | Major country hub | Geographic deployment area |
| Availability Zone | Separate terminal | Isolated failure domain |
| VPC | Private airport campus | Network boundary |
| Subnet | Terminal wing | Segmented network area |
| Route table | Road signs and taxi lanes | Traffic path rules |
| Internet gateway | Public highway entrance | Internet connectivity |
| NAT gateway | Outbound customs desk | Private workloads outbound only |
| Load balancer | Arrivals traffic controller | Distribute requests |
| CDN | Local city kiosk | Content close to users |
| WAF | Security checkpoint | Application edge protection |
| Compute fleet | Aircraft fleet / buses | Request-serving capacity |
| Database | Central records office | Stateful source of truth |
| Cache | Fast check-in desk | Hot low-latency reads |
| Queue / stream | Baggage conveyor system | Async workload decoupling |
| IAM | Staff badge system | Identity and permissions |
| Observability | Control tower screens | Metrics/logs/traces |
| CI/CD | Fleet maintenance pipeline | Safe change delivery |
| DR site | Alternate airport | Recovery location |

### Story: Flights Delayed Worldwide

A junior engineer says: “Add more planes.”

A senior engineer asks:

1. Is the problem check-in, runway, customs, baggage, or weather?
2. One terminal or all regions?
3. Is the records office slow? Database.
4. Can traffic be rerouted to another airport? DR/failover.
5. What metric proves recovery?

Technical translation:

- scaling compute does not fix database bottlenecks
- one AZ issue differs from regional outage
- async queues can absorb spikes
- edge controls differ from data-tier problems

---

## Senior Design Order

1. Clarify users and critical journeys.
2. Clarify scale now vs later.
3. Clarify latency-sensitive paths.
4. Identify stateful core early.
5. Define trust boundaries.
6. Choose compute model.
7. Choose storage/cache/messaging.
8. Define observability and rollout safety.
9. Explain HA and DR.
10. Then map to concrete services.

If you start with product names, the answer sounds shallow.

---

## Requirement Questions To Ask Early

## Scale

- requests per second
- reads vs writes
- geographic spread
- burst patterns
- concurrency

## Availability

- target uptime
- acceptable degraded mode
- RTO
- RPO
- survive region outage?

## Latency

- p50 vs p99 sensitivity
- user locations
- sync vs async paths

## Security

- public or private system
- tenant isolation
- compliance scope
- audit needs

---

## Think In Traffic Paths, Not Service Lists

For a public API:

```text
DNS -> CDN -> WAF -> Load Balancer -> App Fleet -> Cache -> Database
                               \-> Queue/Events -> Workers
Telemetry -> Metrics / Logs / Traces
```

This is stronger than listing products.

---

## Compute Choice Framework

| Model | Best when | Tradeoff |
|---|---|---|
| VMs | OS control, legacy, custom agents | more ops burden |
| Kubernetes | many services, policy, scheduling | platform complexity |
| Serverless | bursty stateless APIs, speed | runtime constraints |
| Managed PaaS | common workloads | less deep control |

Senior rule:

Choose the smallest platform that satisfies constraints.

---

## Edge Layer: Where Travelers Arrive

## DNS

DNS chooses where users start.

Remember:

- TTL slows failover changes
- resolver caching matters
- geo steering can help or hurt

## CDN

Use when:

- global users
- cacheable assets
- edge TLS benefit
- origin protection needed

## WAF / Abuse Controls

Use:

- DDoS controls
- bot mitigation
- rate limits
- auth checks where appropriate

## Load Balancer

Choose:

- L4 pass-through
- L7 routing
- internal vs external
- sticky vs stateless routing
- weighted/canary traffic splits

---

## Network Boundaries

Separate clearly:

- public ingress
- private app tier
- data tier
- admin/control plane
- east-west traffic
- north-south traffic

Common mistakes:

- public databases
- unrestricted egress
- flat networks with no segmentation

---

## Stateful Core Vs Stateless Edge

## Stateless Edge

Usually:

- easy horizontal scale
- easy replace/rollback
- load-balanced

## Stateful Core

Usually:

- hardest to fail over
- hardest to scale correctly
- biggest RTO/RPO driver
- strongest consistency tradeoffs

Senior rule:

Identify the records office early.

---

## Data Layer Choices

| Need | Typical choice |
|---|---|
| transactions/source of truth | relational DB |
| hot reads / latency | cache |
| async decoupling | queue / stream |
| search | index/search store |
| blobs/backups | object storage |

Ask:

- consistency needs?
- write volume?
- failover model?
- backup restore tested?

---

## High Availability Vs Disaster Recovery

## High Availability

Survive common component failures.

Examples:

- multi-instance app tier
- multi-AZ databases
- redundant load balancers

## Disaster Recovery

Recover from major failure.

Examples:

- region outage
- corrupted database
- control plane loss
- bad deploy with data damage

Ask:

- actual RTO?
- actual RPO?
- who triggers failover?
- failback plan?

---

## Rollout Safety

A system is incomplete if deployment story is weak.

Include:

- rolling/canary deploys
- schema migration strategy
- config rollout safety
- blast-radius control
- rollback path
- release observability

---

## Real Incident Stories

## Scenario 1: API Slow Worldwide

Wrong assumption: add app servers.

Better path:

- inspect DB latency
- cache hit rate
- external dependency latency
- regional edge routing

## Scenario 2: One Region Down

Wrong assumption: total outage unavoidable.

Better path:

- fail traffic to healthy region
- assess data consistency impact
- preserve critical journeys first

## Scenario 3: Costs Exploding

Wrong assumption: just cut instance count.

Better path:

- rightsize idle compute
- improve cache hit rate
- lifecycle storage tiers
- reduce data transfer waste

## Scenario 4: Security Incident At Edge

Better path:

- tighten WAF/rate limits
- rotate credentials
- isolate affected services
- audit logs and blast radius

---

## Command / Tool Interpretation Table

| Tool | What it answers | Bad signs | Next step |
|---|---|---|---|
| Metrics dashboards | Where is pain now? | latency/errors | scope bottleneck |
| DB metrics | Is records office slow? | locks/IO/CPU | tune/scale/read replicas |
| CDN analytics | Is edge helping? | low hit ratio | cache strategy |
| LB metrics | Is traffic balanced? | unhealthy targets | inspect backends |
| Queue metrics | Are conveyors jammed? | lag/depth growth | scale workers |
| Cost reports | Where money leaks? | idle/high egress | optimize design |

---

## Hands-On Drill

Design a global checkout platform.

Include:

1. DNS + CDN + WAF
2. Multi-AZ app tier
3. Cache + relational DB
4. Queue for emails/events
5. Observability stack
6. Canary deploy path
7. Regional DR strategy

Then explain your stateful core and blast radius.

---

## Interview Answer Shape

If asked, “Design a globally available production API,” a strong answer is:

> I would first clarify uptime targets, acceptable data loss, and where latency matters most. Then I’d separate the public edge path from the private service and data paths. I’d keep the request-serving layer stateless behind global or regional load balancing, identify the database as the stateful core, and use cache plus asynchronous messaging to remove unnecessary synchronous load. I’d include observability, progressive delivery, and a realistic multi-region recovery strategy before choosing specific cloud products.

---

## Recall Prompts

- In the airport model, what is an Availability Zone?
- Why does scaling app servers not always fix slowness?
- What is the stateful core in most SaaS systems?
- How is HA different from DR?
- Why is DNS not instant failover?

---

## What To Study Next

- AWS cloud services and platform design
- Terraform and Infrastructure as Code
- CI/CD trusted delivery and platform security
- Observability, SLOs, and incident response
