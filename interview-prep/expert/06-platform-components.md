# Expert: Platform Components, Traffic Control, And Complete App Design

## Mentor Mode

Expert answers should explain where shared platform components become systemic risk and how to keep central layers from turning into central outages.

## Challenge 1: API Gateway As Reliability Control Point

Scenario: The gateway is used for auth, rate limits, request shaping, and traffic splitting. During a release incident, the gateway itself becomes the bottleneck.

Your task:

- explain gateway failure modes
- explain what belongs at the gateway versus in the service
- explain how to avoid centralizing too much fragility

## Challenge 2: Global Load Balancing And Regional Degradation

Scenario: A global load balancer still sends traffic to a region with partial dependency failure because health checks are too shallow.

Your task:

- explain why shallow health checks are dangerous
- explain better health signal design
- explain fail-open versus fail-closed tradeoffs

## Challenge 3: Kafka As Critical Backbone

Scenario: Several critical workflows rely on Kafka. One cluster remains available, but tail latency and lag explode after a broker maintenance event.

Your task:

- explain partitions, leaders, ISR pressure, client retries, and consumer lag under stress
- explain what observability and operational guardrails matter most

## Challenge 4: Cloud Run, Functions, And GKE Boundary

Scenario: A company has spread workloads across Cloud Run, Functions, and GKE with unclear ownership and inconsistent behavior.

Your task:

- define a principled workload-placement model
- explain the operational cost of using each platform in the wrong place
- explain how to keep developer experience simple without flattening important differences

## Challenge 5: Managed Database In A High-Availability Design

Scenario: Cloud SQL or a similar managed database is part of a mission-critical control plane.

Your task:

- explain the HA limits of the database layer
- explain connection management, transaction design, read scaling, backup recovery, and failover testing
- explain how app behavior can make a managed database look worse than it is

## Challenge 6: Complete Production Architecture

Scenario: Design a modern platform stack including internet entry, CDN or edge, load balancer, gateway, compute platform, data stores, cache, queue, observability, IAM, CI/CD, and recovery posture.

Your task:

- narrate traffic flow and failure isolation
- explain why each layer exists
- explain what you would simplify first if complexity becomes the real risk

Mentor hints:

- seniority here often shows up as simplification judgment, not by adding more boxes
