# Intermediate: System Design, Resilience, And Cloud Platform Challenges

## Mentor Mindset

Tie every architecture choice to one of these:

- latency
- availability
- resilience
- security
- operability
- cost

## Where To Practice And Simulate

- use [foundations/07-system-design-cloud-architecture.md](../foundations/07-system-design-cloud-architecture.md) before attempting these
- GCP architecture framework: https://cloud.google.com/architecture/framework
- Cloud Load Balancing overview: https://cloud.google.com/load-balancing/docs/load-balancing-overview
- Cloud Armor overview: https://cloud.google.com/armor/docs/cloud-armor-overview
- VPC overview: https://cloud.google.com/vpc/docs/overview
- AWS VPC security: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html
- AWS NACLs: https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_ACLs.html

## Challenge 1: Multi-Zone API Platform

Scenario: Design a multi-zone platform for an internal API gateway and policy service with strong availability requirements and moderate latency sensitivity.

Your task:

- describe request flow, failure domains, state handling, and deployment topology
- explain how you would avoid a zonal dependency hidden behind a regional facade
- explain how you would test failover

## Challenge 2: GCP Platform Design

Scenario: You need to design a secure GCP platform for internal services that will run mainly on GKE.

Your task:

- describe cluster topology, VPC design, load balancing, IAM model, secret management, logging, and image policy
- explain what you would centralize at the platform layer versus delegate to service teams

## Challenge 3: AWS Crossover

Scenario: The company acquires a team running EKS and AWS-native networking. Your control-plane tooling must support both GKE and EKS.

Your task:

- explain the abstraction boundaries you would choose
- explain where cloud-specific behavior must remain explicit
- identify the biggest portability traps

## Challenge 4: Queue-Based Resilience

Scenario: A downstream dependency becomes slow and intermittently unavailable. You cannot drop all traffic, but you also cannot let the dependency take the platform down.

Your task:

- explain backpressure, queuing, shedding, circuit breaking, retries, and idempotency
- explain when each helps and when each can worsen overload

## Challenge 5: Database Failover Tradeoffs

Scenario: A control-plane service needs high availability and low operational risk. Read latency matters more than write throughput.

Your task:

- compare managed relational, managed key-value, and replicated in-memory options at a high level
- explain the failover and consistency questions you would ask before choosing

## Challenge 6: Threat Model Warm-Up

Prompt:

- identify likely threats for an internal developer platform
- include CI compromise, overly broad IAM, metadata abuse, secret sprawl, image tampering, and lateral movement
- explain the top preventive and detective controls

## Extra Challenges

### Challenge 7: Cross-Region DNS And Failover

Your task:

- explain why DNS failover is not instant
- explain how TTL and client behavior affect recovery

### Challenge 8: Control Plane Versus Data Plane

Your task:

- explain the difference
- explain why a healthy data plane can hide a struggling control plane for a while

### Challenge 9: End-To-End Cloud Architecture

Scenario: Design a production web platform with public DNS, CDN, WAF, L7 load balancing, Kubernetes-based APIs, private databases, async messaging, observability, and CI/CD.

Your task:

- explain the full request path
- explain public, private, and internal boundaries
- explain how you would secure east-west and north-south traffic
- explain where latency, availability, and operational complexity trade off
