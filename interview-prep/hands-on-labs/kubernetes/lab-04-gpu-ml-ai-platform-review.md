# Kubernetes Lab 4: GPU And AI Platform Architecture Review

## Scenario

You are designing a Kubernetes platform that must support:

- general stateless services
- scheduled batch jobs
- GPU-based training
- GPU-based inference
- strong cost control
- safe multi-tenant operation

## Your Task

Write and sketch:

1. node pool strategy
2. GPU isolation strategy
3. scheduling and quota design
4. training versus inference platform differences
5. observability for GPU workloads
6. failure handling for expensive training jobs
7. what tooling you would adopt for Trainer, KServe, Kueue, or plain Kubernetes

## Model-Answer Rubric

- does the answer separate training and inference needs clearly
- does it explain GPU isolation using node pools, taints, labels, and quotas
- does it address cost and scheduling waste
- does it address failure recovery and checkpointing
- does it mention controller or operator ownership where relevant
