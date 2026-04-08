# Beginner: System Design, Cloud Architecture, And Security

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

Nebius interview note:

- keep your system design answers grounded in packets, process behavior, failure domains, and operational debugging paths
