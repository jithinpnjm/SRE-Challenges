# Expert: Kubernetes Internals, Resilience, And Platform Design

## Challenge 1: API Server Healthy, Cluster Unhealthy

Scenario: The API server is responsive, but controllers lag, endpoints are stale, and node-level symptoms differ by pool.

Your task:

- explain how you would reason about watches, controller queues, kubelet state, CNI behavior, and kube-proxy dataplane freshness
- identify where eventual consistency is acceptable and where it becomes dangerous

## Challenge 2: Large-Scale Rollout Failure

Scenario: A rollout to thousands of pods across multiple zones triggers readiness collapse, autoscaler thrash, and cross-zone traffic spikes.

Your task:

- explain the interaction between rollout strategy, autoscaling, service routing, and dependency saturation
- propose a safer release architecture
- explain what pre-production tests would have revealed this

## Challenge 3: Control Plane Degradation During Incident

Scenario: During a major incident, node churn rises and some control-plane operations slow down. Engineers want to "just restart things."

Your task:

- explain the risks of aggressive restarts during control-plane stress
- explain what signals you need before touching core components
- describe a stabilization-first response

## Challenge 4: Multi-Cluster Strategy

Scenario: You operate critical services with strong availability targets and regional failure concerns.

Your task:

- compare single-cluster multi-zone, regional clusters, and multi-cluster active-active patterns
- explain where service discovery, identity, policy, observability, and failover logic become harder
- explain when multi-cluster is worth the operational complexity

## Challenge 5: CNI And Dataplane Deep Dive

Prompt:

- compare at a high level how overlay, routed, and eBPF-heavy dataplanes affect debugging
- explain what changes in packet visibility, policy enforcement, and failure symptoms
- explain how you would interview-debug a suspected CNI issue without vendor-specific assumptions

## Challenge 6: Platform Guardrails

Scenario: You are building guardrails for dozens of product teams on Kubernetes.

Your task:

- define the minimum enforced controls for resource policy, security policy, rollout safety, observability, and network segmentation
- explain how to avoid becoming a blocking centralized team
