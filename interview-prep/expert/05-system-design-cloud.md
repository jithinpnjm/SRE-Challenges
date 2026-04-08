# Expert: Distributed Systems, HA, Low Latency, Security, And Cloud

## Challenge 1: Low-Latency Control Plane Across Clouds

Scenario: Design a globally used control-plane service for compute scheduling metadata. Most workloads run in GCP, but critical tenants also run in AWS. The service must remain available during zonal and regional failures, and tail latency matters more than peak throughput.

Your task:

- explain service topology, state strategy, cache behavior, and data replication choices
- explain where you accept eventual consistency and where you do not
- explain how you minimize cross-region and cross-cloud latency
- explain failure handling when one cloud has partial control-plane degradation

## Challenge 2: Resilience Versus Cost

Scenario: Leadership wants near-zero downtime, but platform cost has doubled after adding redundancy everywhere.

Your task:

- explain how you would decide where redundancy buys real risk reduction
- compare active-active, warm standby, and cold recovery patterns
- explain how SLOs and business criticality should shape architecture, not fear alone

## Challenge 3: Overload And Load Shedding

Scenario: A product launch creates a success disaster. Request rate is far above forecast, downstream caches miss heavily, and retries begin to amplify load.

Your task:

- design an overload response strategy
- explain admission control, degradation, shed rules, priority classes, and retry discipline
- explain what you communicate internally while the event is ongoing

## Challenge 4: GCP Platform Deep Dive

Scenario: You are asked to design a GCP-first platform for regulated internal services with GKE, strong auditability, controlled egress, and secure software delivery.

Your task:

- describe network architecture, cluster strategy, identity, secret flow, logging, key management, binary authorization or equivalent policy, and recovery posture
- explain what you would test quarterly

## Challenge 5: AWS Crossover Deep Dive

Scenario: The same platform concepts must work in AWS for a smaller but strategically important environment.

Your task:

- explain what you would keep common across GCP and AWS
- explain where you deliberately use native provider features instead of forcing symmetry
- describe the operational risks of pretending the clouds are identical

## Challenge 6: Senior Interview Synthesis

Prompt:

- explain how you would design a platform that is secure, observable, low-latency, resilient, operable, and cost-aware
- focus on tradeoffs, not buzzwords
- answer as if the interviewer interrupts you every few minutes with failure scenarios
