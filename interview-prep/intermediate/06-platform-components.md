# Intermediate: Networking In Kubernetes, Gateways, Queues, And Managed Services

## Mentor Mode

At this level, explain how these components fail under load and partial outage, not just what they are.

## Challenge 1: Ingress Works, Backend Still Fails

Scenario: Traffic reaches the Ingress, but one path returns intermittent 502s.

Your task:

- explain the request flow from external LB to Ingress to Service to Pod
- identify where TLS termination, header forwarding, path rewriting, or backend keepalive settings can fail
- explain what logs and metrics you inspect first

## Challenge 2: Kafka Consumer Lag Incident

Scenario: A downstream processor falls behind and lag grows rapidly.

Your task:

- explain what lag means and what can cause it
- explain how partitions, rebalances, slow processing, and backpressure interact
- explain immediate mitigation versus root-cause work

## Challenge 3: Pub/Sub Subscriber Design

Scenario: A service on GCP uses Pub/Sub for asynchronous processing but experiences duplicate deliveries and out-of-order effects.

Your task:

- explain why at-least-once delivery changes application design
- explain idempotency, deduplication, ack deadlines, and dead-lettering

## Challenge 4: Cloud Run Under Traffic Burst

Scenario: A stateless API on Cloud Run gets sudden traffic bursts and latency spikes.

Your task:

- explain concurrency, scaling, cold starts, dependency bottlenecks, and timeout tuning
- explain when to move to GKE or keep the workload on Cloud Run

## Challenge 5: Cloud SQL Bottleneck

Scenario: App latency increases even though CPU on app pods is fine. Database connection count is high and query latency is rising.

Your task:

- explain pool sizing, connection storms, slow queries, read replicas, and failover concerns
- explain what metrics you need from both app and database sides

## Challenge 6: App Design Integration

Scenario: Design an app using load balancer, gateway, Kubernetes or Cloud Run, cache, Cloud SQL, and async messaging.

Your task:

- explain sync path versus async path
- explain what you would protect with timeouts, retries, queues, and circuit breakers
- explain where low latency and HA goals can conflict

Mentor hints:

- show where backpressure belongs
- show what happens when one dependency goes half-bad instead of fully down
