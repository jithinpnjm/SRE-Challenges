# Intermediate: Kubernetes Internals And Troubleshooting

## Challenge 1: Pod Pending For 20 Minutes

Scenario: A Deployment rollout stalls because new Pods remain Pending.

Your task:

- explain how you would inspect scheduler events and node state
- enumerate causes including requests too large, taints, affinity, PV binding, quota, PodSecurity, and admission controls
- explain how you identify the true blocker quickly

## Challenge 2: Readiness Flaps Cause Cascading Failure

Scenario: During peak load, pods start failing readiness checks and are removed from service. Remaining pods take more traffic and also fail.

Your task:

- explain the failure loop
- explain what is wrong with the probe or rollout model
- propose a safer design using readiness, autoscaling, connection limits, and backpressure

## Challenge 3: Node Pressure And Eviction

Scenario: A node under memory pressure begins evicting Pods. The affected workload is a mix of stateless APIs, batch jobs, and a daemonset.

Your task:

- explain kubelet eviction behavior at a practical level
- explain how QoS changes eviction likelihood
- describe how you would redesign requests, limits, and workload placement

## Challenge 4: Control Plane Seems Healthy But Cluster Behavior Is Wrong

Scenario: `kubectl` works, but new Services are not routing traffic correctly and endpoint changes propagate slowly.

Your task:

- explain which control-plane and node-plane components you suspect
- explain how kube-proxy mode, CNI issues, API watch lag, or EndpointSlice problems could show up
- describe the evidence you would gather

## Challenge 5: NetworkPolicy Surprise

Scenario: A restrictive NetworkPolicy rollout was intended to allow only app-to-db traffic. Instead, service discovery and telemetry broke.

Your task:

- explain why DNS, metrics, tracing, and control traffic are often forgotten
- propose a validation and rollout approach that reduces blast radius
- explain how you would test this before production

## Challenge 6: Stateful Workload Upgrade

Scenario: You need to upgrade a stateful service on Kubernetes with low downtime and data safety requirements.

Your task:

- explain when StatefulSet is helpful and when it is not enough
- explain readiness gates, disruption budgets, backup validation, and rollback strategy
- explain how you would reason about zonal spread and persistent volume failure domains
