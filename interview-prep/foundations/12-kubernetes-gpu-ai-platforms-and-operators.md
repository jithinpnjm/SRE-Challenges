# Foundations: Kubernetes GPU, AI Platforms, And Operators Zero To Hero

GPU platforms are not just normal Kubernetes clusters with larger nodes. They combine expensive hardware, specialized drivers, device plugins, topology-aware scheduling, high-performance networking, storage-heavy workflows, and complex lifecycle automation.

This guide is designed as a complete path:

- Beginner: what GPUs are and why AI workloads need them
- Intermediate: scheduling GPU Pods, device plugins, node labels, drivers, images
- Advanced: MIG, topology, NCCL, RDMA/InfiniBand, gang scheduling, operators
- SRE Level: debug GPU allocation, training failures, inference latency, node faults
- Interview Level: explain GPU Kubernetes platforms from hardware to workload lifecycle

---

# Part 1: Why GPUs Matter

A GPU is built for massively parallel computation.

AI/ML workloads use GPUs because matrix operations, tensor operations, and neural network training/inference can be parallelized heavily.

Main workload types:

| Workload | Pattern | Main concern |
|---|---|---|
| Training | long-running batch jobs | throughput, checkpointing, all workers healthy |
| Inference | online request serving | latency, warm capacity, GPU memory |
| Batch inference | offline scoring | cost efficiency, queue throughput |
| Fine-tuning | medium/long jobs | data locality, checkpointing, GPU availability |

---

# Part 2: GPU Memory And Compute Basics

Important concepts:

- GPU cores perform parallel math
- HBM/VRAM stores model weights, activations, KV cache
- PCIe/NVLink connect CPU/GPU or GPU/GPU
- CUDA is NVIDIA's compute platform
- drivers and runtime libraries must match workload needs

For inference, GPU memory is often the limiting factor.

For distributed training, GPU-to-GPU and node-to-node bandwidth often dominate performance.

---

# Part 3: How Kubernetes Sees GPUs

Kubernetes does not understand GPUs natively like CPU/memory.

GPUs are exposed as extended resources.

```text
NVIDIA device plugin -> kubelet -> Node capacity: nvidia.com/gpu
```

Check:

```bash
kubectl describe node GPU_NODE | grep -A5 nvidia.com/gpu
kubectl get nodes -L nvidia.com/gpu.product
kubectl get pods -A -o wide
```

A Pod requests GPU like this:

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

GPU requests are normally exclusive. Standard Kubernetes does not time-slice GPUs like CPU by default.

---

# Part 4: NVIDIA Stack On Kubernetes

Typical stack:

```text
GPU hardware
NVIDIA driver
CUDA libraries
NVIDIA container toolkit/runtime
NVIDIA device plugin
Kubernetes Pod
ML framework/app
```

Common components:

- NVIDIA GPU Operator
- NVIDIA device plugin
- DCGM exporter
- Node Feature Discovery
- NVIDIA container toolkit
- CUDA base images

Debug:

```bash
nvidia-smi
kubectl get pods -n gpu-operator
kubectl logs -n gpu-operator -l app=nvidia-device-plugin-daemonset
kubectl logs -n gpu-operator -l app=nvidia-dcgm-exporter
```

---

# Part 5: Node Labels And Scheduling

GPU nodes should be labeled with capabilities.

Examples:

```bash
kubectl get nodes --show-labels | grep nvidia
```

Common labels:

- GPU product/model
- GPU count
- CUDA driver version
- node pool
- topology zone

Use selectors/tolerations:

```yaml
nodeSelector:
  nvidia.com/gpu.product: NVIDIA-H100-80GB-HBM3

tolerations:
  - key: "nvidia.com/gpu"
    operator: "Exists"
    effect: "NoSchedule"
```

Taint GPU nodes so normal workloads do not waste expensive capacity.

---

# Part 6: Training Vs Inference

## Training

Characteristics:

- long-running
- expensive
- may need many GPUs at once
- sensitive to slow workers
- requires checkpointing
- often needs high-speed networking

## Inference

Characteristics:

- latency-sensitive
- needs warm replicas
- constrained by model load time and GPU memory
- may use autoscaling based on queue depth/request latency

Do not design training and inference platforms the same way.

---

# Part 7: Gang Scheduling

Distributed training often needs all workers to start together.

Without gang scheduling:

- some workers reserve GPUs
- remaining workers cannot schedule
- reserved GPUs sit idle
- job wastes money

Use:

- Kueue
- Volcano
- Ray/KubeRay patterns
- job controllers with queue semantics

Key idea:

> For distributed training, partial scheduling can be worse than not scheduling at all.

---

# Part 8: Topology Awareness

GPU placement matters.

Fast paths:

- same GPU memory
- same node via NVLink/NVSwitch
- same node via PCIe
- cross-node via InfiniBand/RDMA
- cross-node via Ethernet

Topology-aware scheduling tries to place workloads where communication is fastest.

Use cases:

- multi-GPU training
- NCCL all-reduce
- latency-sensitive inference with CPU/GPU affinity

---

# Part 9: MIG And GPU Partitioning

MIG (Multi-Instance GPU) allows supported NVIDIA GPUs to be partitioned into isolated slices.

Useful when:

- inference workloads do not need a full GPU
- multiple small models share one physical GPU
- isolation is needed between tenants

Tradeoffs:

- more efficient utilization
- less flexible than full GPU
- scheduling and observability become more complex

---

# Part 10: NCCL, RDMA, And Distributed Training Networking

Distributed training frequently uses NCCL for collective communication.

Important signals:

- all-reduce latency
- network throughput
- RDMA errors
- packet drops
- straggler workers

Debug ideas:

```bash
kubectl logs JOB_POD
nvidia-smi
ibstat
ibv_devinfo
ethtool -S INTERFACE
```

If one worker is slow, the whole training step can slow down.

---

# Part 11: Storage And Checkpoints

Training jobs must checkpoint.

Storage needs:

- high throughput for datasets
- durable checkpoint storage
- fast local cache for repeated reads
- object storage for model artifacts

Failure model:

> Without checkpoints, a node failure can waste days of training.

---

# Part 12: Inference Platform Design

Typical path:

```text
Client -> API Gateway -> Router -> Inference Pod -> GPU memory/model runtime
```

Common runtimes:

- vLLM
- Triton Inference Server
- TorchServe
- custom FastAPI/transformers service

Key concerns:

- model load time
- cold start
- KV cache memory
- batching
- queue depth
- p95/p99 latency

---

# Part 13: Autoscaling GPU Workloads

CPU utilization is often the wrong scaling signal for inference.

Better signals:

- request queue depth
- GPU utilization
- GPU memory usage
- tokens/sec
- latency SLO
- active batches

Scale-down must be conservative because cold starts are expensive.

---

# Part 14: Operators

An Operator is a controller that manages a complex application or platform.

It watches a Custom Resource and reconciles actual state toward desired state.

```text
CRD spec -> controller reconcile loop -> Kubernetes objects / external actions -> CRD status
```

Operators are useful when lifecycle is more complex than Deployment/StatefulSet.

Examples:

- GPU Operator
- Kueue controllers
- KubeRay
- Soperator/Slurm operator
- database operators
- inference platform operators

---

# Part 15: Operator Failure Model

If an operator crashes:

- existing workloads usually keep running
- new reconciliation stops
- self-healing may pause
- status may become stale

Good operators need:

- idempotent reconciliation
- leader election
- status updates
- clear events
- safe upgrade strategy

---

# Part 16: Observability For GPU Platforms

Monitor:

- GPU utilization
- GPU memory used/free
- ECC errors
- temperature
- power draw
- throttling
- XID errors
- DCGM metrics
- job queue time
- training throughput
- inference latency
- model load time

Tools:

- DCGM exporter
- Prometheus/Grafana
- NVIDIA SMI
- scheduler/Kueue metrics
- application metrics

---

# Part 17: Troubleshooting By Symptom

## Pod Pending With GPU Request

Likely causes:

- no allocatable GPUs
- wrong nodeSelector
- missing toleration
- queue/gang scheduling not admitted
- GPU already allocated

Check:

```bash
kubectl describe pod POD
kubectl describe node GPU_NODE
kubectl get events -A --sort-by=.lastTimestamp
```

## Pod Cannot See GPU

Likely causes:

- device plugin not running
- NVIDIA runtime missing
- driver issue
- wrong image/runtime config

Check:

```bash
nvidia-smi
kubectl logs -n gpu-operator -l app=nvidia-device-plugin-daemonset
kubectl exec POD -- nvidia-smi
```

## Training Job Hangs

Likely causes:

- missing worker
- NCCL network issue
- one slow/bad GPU
- RDMA/IB path issue
- checkpoint/storage stall

## Inference Latency Spikes

Likely causes:

- cold start/model loading
- GPU memory pressure
- queue depth growth
- batching misconfiguration
- noisy neighbor
- autoscaling too slow

---

# Part 18: Real Incident Stories

## GPUs Allocated But Job Not Progressing

Wrong assumption: scheduler is broken.

Better path:

- verify all workers started
- inspect NCCL logs
- check network/RDMA
- check one slow worker
- confirm checkpoint/data loading

## Inference Outage After Scale Down

Cause:

- scaled to zero or too few warm replicas
- model load took minutes

Fix:

- minimum warm capacity
- readiness only after model loaded
- predictive scaling based on queue trend

## GPU Node Looks Healthy But Jobs Fail

Possible causes:

- XID errors
- ECC errors
- driver/runtime mismatch
- device plugin stale state

---

# Part 19: AI Platform Design Checklist

For training:

- queue/gang scheduling
- GPU topology awareness
- checkpoint strategy
- dataset access path
- failure/retry policy
- fair sharing between teams

For inference:

- warm replicas
- autoscaling signal
- model cache
- batching strategy
- latency SLO
- rollout/canary model versions

For platform:

- GPU observability
- node health automation
- quota/fairness
- cost visibility
- security/isolation

---

# Part 20: Interview Questions

- Why are GPU workloads different from normal web workloads?
- How does Kubernetes expose GPUs?
- What does the NVIDIA device plugin do?
- Why does distributed training need gang scheduling?
- What is MIG?
- Why is topology important for training?
- What would you monitor on GPU nodes?
- How would you debug a Pod that requested GPU but cannot see it?
- When would you build or use an operator?

---

# Part 21: Labs

## Beginner

- inspect GPU node labels
- run a CUDA sample pod
- request one GPU in a Pod

## Intermediate

- deploy DCGM exporter
- build a simple inference Deployment
- add nodeSelector/toleration
- inspect GPU metrics

## Advanced

- simulate Pending GPU workload
- configure queue-based scheduling
- test model cold start
- compare full GPU vs MIG allocation
- investigate fake NCCL failure from logs

---

# Part 22: Senior Answer Shape

> GPU Kubernetes platforms combine scarce hardware scheduling, Linux device exposure, NVIDIA drivers, device plugins, container runtimes, workload queues, and observability. I separate training and inference because training needs gang scheduling, topology awareness, checkpointing, and high-speed network reliability, while inference needs warm capacity, latency-aware autoscaling, model memory management, and safe model rollout. During incidents I first determine whether the failure is scheduling, device exposure, driver/runtime, network/storage, or workload-level behavior.

---

# Recall Prompts

- Why is GPU not scheduled like CPU?
- What does the device plugin register with kubelet?
- Why can partial scheduling waste GPUs?
- Why does inference need warm replicas?
- What happens if an operator crashes?
- Why do NCCL/RDMA issues affect distributed training so much?
