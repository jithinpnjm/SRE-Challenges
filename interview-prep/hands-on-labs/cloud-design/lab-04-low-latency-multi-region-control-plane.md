# Cloud Design Lab 4: Low-Latency Multi-Region Control Plane

## Scenario

Design a low-latency control plane used by compute workloads across GCP and AWS.

Requirements:

- p99 matters more than raw throughput
- correctness matters more than marketing-grade multi-cloud symmetry
- stateful metadata store
- regional and zonal failure tolerance
- public API not required; mostly internal consumers
- strong security and auditability
- strict rollout safety

## Your Task

Write and sketch:

1. control-plane responsibilities versus data-plane responsibilities
2. request path and latency budget
3. consistency model
4. cache strategy
5. regional placement
6. failure mode handling
7. observability and alerting
8. delivery and policy controls

## Interviewer Pressure Questions

- what stays cloud-specific on purpose
- what happens if one cloud is partially degraded
- when do you fail over versus degrade in place
- what is the stateful core and how do you protect it

## Deliverable

- architecture sketch
- latency budget breakdown
- failure-domain table

## Model-Answer Rubric

- control-plane clarity: are responsibilities separated from data-plane work
- latency budgeting: is p99 reasoning concrete
- consistency model: are state tradeoffs explicit
- failure handling: are zonal, regional, and cloud-partition cases discussed
- security and operability: are delivery, identity, and observability included

Strong answer signs:

- names the stateful core early
- resists unnecessary multi-cloud symmetry
- explains degrade-in-place versus failover decisions
