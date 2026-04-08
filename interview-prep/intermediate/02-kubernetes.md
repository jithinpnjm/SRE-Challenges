# Intermediate: Kubernetes Internals And Troubleshooting

This file is where Kubernetes stops being just resources and starts becoming a distributed control system running on Linux nodes with real failure and consistency behavior.

## Mentor Mode

Strong answers here connect:

- desired state to controller action
- Pod behavior to kubelet and runtime behavior
- Service behavior to endpoints and node dataplane behavior
- cluster symptoms to node pressure, watch lag, policy, or control-plane delay

Useful commands:

```bash
kubectl get events -A --sort-by=.lastTimestamp
kubectl describe pod <pod>
kubectl describe node <node>
kubectl get svc,endpoints,endpointslices -A
kubectl top pod -A
kubectl top node
journalctl -u kubelet
crictl ps
```

## Challenge 1: Pod Pending For 20 Minutes

Scenario: A Deployment rollout stalls because new Pods remain Pending.

Your task:

- explain how you would inspect scheduler events and node state
- enumerate causes including requests too large, taints, affinity, PV binding, quota, PodSecurity, and admission controls
- explain how you identify the true blocker quickly

Mentor hints:

- do not say "scheduler issue" unless you can name the actual constraint
- Pending is often a fast clue if you read events carefully

## Challenge 2: Readiness Flaps Cause Cascading Failure

Scenario: During peak load, pods start failing readiness checks and are removed from service. Remaining pods take more traffic and also fail.

Your task:

- explain the failure loop
- explain what is wrong with the probe or rollout model
- propose a safer design using readiness, autoscaling, connection limits, and backpressure

Mentor hints:

- readiness can protect or amplify failure depending on how it is designed
- think about load redistribution and warm capacity

## Challenge 3: Node Pressure And Eviction

Scenario: A node under memory pressure begins evicting Pods. The affected workload is a mix of stateless APIs, batch jobs, and a daemonset.

Your task:

- explain kubelet eviction behavior at a practical level
- explain how QoS changes eviction likelihood
- describe how you would redesign requests, limits, and workload placement

Mentor hints:

- kubelet pressure response is not the same as kernel OOM
- explain eviction order and why some workloads should never compete on the same nodes

## Challenge 4: Control Plane Seems Healthy But Cluster Behavior Is Wrong

Scenario: `kubectl` works, but new Services are not routing traffic correctly and endpoint changes propagate slowly.

Your task:

- explain which control-plane and node-plane components you suspect
- explain how kube-proxy mode, CNI issues, API watch lag, or EndpointSlice problems could show up
- describe the evidence you would gather

Mentor hints:

- responsive API server does not prove watchers and controllers are healthy
- stale endpoints plus working `kubectl` is an important clue

## Challenge 5: NetworkPolicy Surprise

Scenario: A restrictive NetworkPolicy rollout was intended to allow only app-to-db traffic. Instead, service discovery and telemetry broke.

Your task:

- explain why DNS, metrics, tracing, and control traffic are often forgotten
- propose a validation and rollout approach that reduces blast radius
- explain how you would test this before production

Mentor hints:

- policy should be rolled out like code, not like faith
- default-deny without observability awareness is a classic footgun

## Challenge 6: Stateful Workload Upgrade

Scenario: You need to upgrade a stateful service on Kubernetes with low downtime and data safety requirements.

Your task:

- explain when StatefulSet is helpful and when it is not enough
- explain readiness gates, disruption budgets, backup validation, and rollback strategy
- explain how you would reason about zonal spread and persistent volume failure domains

Mentor hints:

- ordered identity helps, but data correctness still dominates the design

## Challenge 7: kube-proxy Or Dataplane Issue

Scenario: Service VIP traffic is failing but direct Pod IP traffic works.

Your task:

- explain what that suggests
- explain what evidence you would gather on node and cluster sides
- explain whether EndpointSlice, kube-proxy, or policy is most suspicious first

## Challenge 8: DaemonSet Pressure

Scenario: A node-local agent consumes too much CPU across the fleet.

Your task:

- explain why daemonsets can become cluster-wide reliability risks
- explain what rollout and throttling guardrails you would want
- explain how you would detect this before it hurts workloads

## Challenge 9: Control-Plane Watch Lag

Scenario: Pods are healthy, but endpoint and policy changes appear to propagate slowly under load.

Your task:

- explain the role of watches and eventual consistency
- explain which controllers or agents may be lagging
- explain the operational implications during an incident

## Challenge 10: Senior Kubernetes Triage Narrative

Scenario: A cluster shows these symptoms at once: some rollouts stall, some Services route incorrectly, and certain nodes show memory pressure.

Your task:

- explain how you would split and prioritize the investigation
- explain which signals would make you suspect one underlying cause versus several related failures
