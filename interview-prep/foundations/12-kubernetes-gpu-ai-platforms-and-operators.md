# Foundations: Kubernetes For GPU, AI/ML Platforms, Operators, Mesh, And DR

This guide is for the expert Kubernetes topics that show up in modern platform interviews, especially around GPU and AI workloads.

## Mentor Mode

Do not treat AI workloads as just "bigger Pods."

GPU and training/inference platforms change:

- scheduling
- placement constraints
- storage and data movement
- network sensitivity
- node preparation
- failure economics
- observability priorities

## GPU Scheduling Basics

Kubernetes GPU support relies on:

- vendor drivers on nodes
- device plugins
- extended resources such as `nvidia.com/gpu`
- node labels and affinity for placement

Senior reminder:

- GPU resources are not like CPU overcommit games
- a bad placement or partial training admission can waste a lot of money fast

## AI Training Platform Concerns

Important topics:

- distributed training and gang-like scheduling needs
- topology-aware placement
- fast east-west networking between workers
- checkpointing and resume strategy
- dataset locality and data loading bottlenecks
- CPU, memory, and storage support for GPU workers
- failed worker recovery behavior

## AI Inference Platform Concerns

Important topics:

- cold model load time
- GPU memory fit
- batching and queueing
- concurrency control
- streaming response behavior
- scale-to-zero versus warm capacity
- many-model versus few-large-model serving

## Operators And Controllers

Operator pattern matters because:

- complex systems need domain-specific reconciliation
- backup, upgrade, restore, and policy logic often exceed built-in controllers
- AI platforms often use CRDs and operators heavily

Senior interview habit:

- ask what controller owns the behavior
- ask what happens if the controller is down or lagging

## Policy And Admission

For expert Kubernetes work, understand:

- ValidatingAdmissionPolicy
- policy webhooks
- resource quota and limit range policy
- image and runtime policy
- GPU node isolation policy
- tenant and namespace guardrails

## Service Mesh

Mesh topics that matter:

- mTLS and identity
- traffic shaping
- retries and timeouts
- policy and telemetry
- sidecar versus ambient-style tradeoffs
- hot-path latency overhead

Senior habit:

- do not add mesh complexity casually to already latency-sensitive systems

## Tooling To Know Conceptually

- Istio
- Kubeflow Trainer
- KServe
- Kueue
- NVIDIA device plugin
- Node Feature Discovery

## Disaster Recovery For Kubernetes Platforms

DR discussions should include:

- etcd backup and restore
- cluster recreation versus repair
- stateful workload recovery
- image and artifact availability
- secret and identity recovery
- data-plane continuity versus control-plane recovery
- multi-cluster failover realism

## Senior Practice Questions

1. Explain why GPU training often needs stronger scheduling guarantees than web APIs.
2. Explain where operators help and where they create new failure modes.
3. Explain when service mesh helps an AI platform and when it mostly adds pain.
4. Explain what DR means for Kubernetes control plane versus stateful ML workloads.
