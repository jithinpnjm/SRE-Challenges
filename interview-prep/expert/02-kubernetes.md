# Expert: Kubernetes Internals, GPU And AI Platforms, Operators, Mesh, Policy, And DR

This file is meant to sound like real platform ownership. It assumes you can already explain normal Kubernetes and now need to reason about deeper cluster behavior, specialized workloads, and platform-scale tradeoffs.

## Mentor Mode

Expert Kubernetes discussion should include:

## Answer This In The Portal

- Draft your expert Kubernetes answer here: [/workspace?challenge=Expert%20Kubernetes%20GPU%20operators%20mesh%20policy%20and%20DR](/workspace?challenge=Expert%20Kubernetes%20GPU%20operators%20mesh%20policy%20and%20DR)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- GPU/AI reference answer: [hands-on-labs/kubernetes/reference-answer-gpu-ml-ai-platform.md](../hands-on-labs/kubernetes/reference-answer-gpu-ml-ai-platform.md)

- control-plane consistency and lag
- kubelet, runtime, and node behavior under stress
- dataplane and CNI realities
- specialized workload placement
- operator and controller ownership
- policy and admission layers
- service mesh tradeoffs
- disaster recovery realism

Useful commands and views:

```bash
kubectl get --raw /readyz
kubectl get events -A --sort-by=.lastTimestamp
kubectl get endpointslices -A
kubectl describe node <node>
kubectl top node
kubectl api-resources
kubectl get validatingadmissionpolicies
journalctl -u kubelet
crictl ps
iptables-save
bpftool prog show
```

## Challenge 1: API Server Healthy, Cluster Unhealthy

Scenario: The API server is responsive, but controllers lag, endpoints are stale, and node-level symptoms differ by pool.

Your task:

- explain how you would reason about watches, controller queues, kubelet state, CNI behavior, and kube-proxy or dataplane freshness
- identify where eventual consistency is acceptable and where it becomes dangerous
- explain how you would avoid overreacting with disruptive control-plane actions

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

## Challenge 7: Large Cluster Failure Containment

Your task:

- explain how you would keep a large cluster failure from becoming a fleet failure
- explain what should be partitioned by node pool, cluster, region, or tenant
- explain when separate clusters are safer than more policy inside one cluster

## Challenge 8: Admission Control Tradeoffs

Your task:

- explain when admission policy improves safety
- explain when it can create fragility during incidents
- explain how to design a break-glass path without breaking trust

## Challenge 9: Service Health Versus User Health

Scenario: Load balancer and readiness health checks are green, but user traffic is failing for one high-value path.

Your task:

- explain how Kubernetes-level health and real service health can diverge
- explain what health signals you would redesign
- explain how gateway, mesh, and app-specific logic can hide this divergence

## Challenge 10: GPU Cluster Design

Scenario: You are designing a Kubernetes cluster for mixed CPU services, batch jobs, and GPU-based training and inference.

Your task:

- explain how you would isolate GPU node pools
- explain drivers, device plugins, labels, taints, and affinity
- explain how you prevent general workloads from landing on expensive GPU nodes
- explain what observability you need for GPU capacity and utilization

Mentor hints:

- GPU nodes are high-cost and high-friction; treat them as a protected scheduling domain

## Challenge 11: Distributed AI Training On Kubernetes

Scenario: A multi-node, multi-GPU training job is expensive and network-sensitive. Partial scheduling wastes time and money.

Your task:

- explain what scheduling and placement problems matter
- explain how gang-like or coordinated scheduling concerns change platform design
- explain data locality, checkpointing, and failure recovery choices
- explain how you would think about Kubeflow Trainer, Kueue, or similar orchestration layers

Mentor hints:

- training is not just "a Job with bigger resources"
- partial startup can be an expensive non-result

## Challenge 12: Model Serving Platform Architecture

Scenario: You need a Kubernetes-based serving platform for both predictive inference and generative inference.

Your task:

- explain how the platform differs for CPU-friendly predictive models versus GPU-heavy generative models
- explain batching, queueing, concurrency, and long-lived streaming response concerns
- explain when KServe with standard deployment, Knative style, or ModelMesh-style density tradeoffs make sense

## Challenge 13: Operators And Controllers At Scale

Scenario: Your platform uses many CRDs and operators for databases, messaging, AI training, and model serving.

Your task:

- explain what extra failure modes operators introduce
- explain how you observe operator health and reconcile lag
- explain how you decide whether to adopt, write, or avoid an operator

Mentor hints:

- operators move toil into control loops, but bad control loops become platform bugs

## Challenge 14: Service Mesh In A Latency-Sensitive Platform

Scenario: Teams want mesh features for identity, traffic control, and telemetry, but some workloads are latency-sensitive and some AI inference paths stream responses.

Your task:

- explain where mesh helps
- explain where mesh overhead, retries, or complexity can hurt
- compare sidecar-style and ambient-style tradeoffs at a high level
- explain what you would keep outside the mesh

## Challenge 15: Policy, Multi-Tenancy, And Cost Control

Scenario: A shared cluster hosts product teams, batch workloads, and AI teams with expensive GPU jobs.

Your task:

- explain resource quota, priority, taints, quotas, and admission policy strategy
- explain how to protect critical services from opportunistic workloads
- explain how to protect GPU budget from careless scheduling

## Challenge 16: Kubernetes Disaster Recovery Reality Check

Scenario: Leadership asks if the Kubernetes platform is "DR-ready." The cluster runs stateless services, internal tooling, operators, and stateful workloads.

Your task:

- explain what DR means for control plane, etcd, workloads, and data
- explain what backup and restore is actually needed
- explain cluster rebuild versus in-place repair
- explain what multi-cluster does and does not solve

Mentor hints:

- cluster recovery and application recovery are related but not identical

## Challenge 17: Staff-Level Kubernetes Architecture Review

Scenario: You inherit a platform with large clusters, many daemonsets, aggressive admission policy, mixed latency-sensitive plus batch workloads, and emerging AI platform requirements.

Your task:

- identify likely reliability fault lines
- explain the first structural changes you would consider
- explain how you would decide between tuning, segmentation, and re-architecture
- explain which problems are cultural, which are control-plane, and which are workload-shape problems
