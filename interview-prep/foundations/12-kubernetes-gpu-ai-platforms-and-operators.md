# Kubernetes for GPU and AI/ML Platforms

> GPU and AI workloads on Kubernetes are not just "bigger pods." They require different scheduling strategies, different failure economics, different storage patterns, and different operational knowledge. This is the area that separates a cloud-native SRE from a GPU infrastructure engineer.

---

## What Is It and Why It Matters

Running AI/ML workloads on Kubernetes is a growing discipline. The challenges are:
- **GPU is a scarce, expensive resource** — wrong scheduling wastes thousands of dollars/hour
- **Distributed training requires all workers to start simultaneously** — partial allocation is useless
- **GPU hardware fails** — a single bad GPU can idle an 8-GPU training job
- **Inference platforms have strict latency SLOs** — model loading takes minutes on cold start
- **AI teams expect HPC-style interfaces** — Slurm, MPI, SSH access to nodes

---

## Mental Model

Think of GPU workloads in two categories with fundamentally different characteristics:

**Training:** Long-running (hours to days), batch, fault-tolerant (with checkpointing), resource-intensive, network-intensive (all-reduce operations)

**Inference:** Short-lived requests, latency-sensitive, stateless (mostly), memory-bound, requires warm capacity to avoid cold-start latency

---

## Part 1: GPU Device Plugin — Exposing GPUs to Kubernetes

### How GPUs Appear in Kubernetes

Kubernetes has no native GPU concept. GPUs are exposed as **extended resources** via the Device Plugin framework.

**The lifecycle:**
1. NVIDIA device plugin DaemonSet runs on every GPU node
2. Plugin connects to kubelet via gRPC on `/var/lib/kubelet/device-plugins/nvidia.com_gpu.sock`
3. Plugin discovers GPUs using NVML (NVIDIA Management Library)
4. Plugin registers resource type `nvidia.com/gpu` with kubelet
5. Kubelet advertises `nvidia.com/gpu: 8` in Node capacity (for 8-GPU node)

```bash
# Check GPU capacity and allocatable on a node
kubectl describe node <gpu-node> | grep -A 3 "Capacity\|Allocatable"
# Expected:
# Capacity:
#   nvidia.com/gpu: 8
# Allocatable:
#   nvidia.com/gpu: 8

# Check device plugin is running
kubectl get pods -n kube-system | grep nvidia
kubectl logs -n kube-system <nvidia-device-plugin-pod>
```

### Requesting GPUs

```yaml
# Pod requesting a single GPU
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: training
    image: nvcr.io/nvidia/pytorch:23.10-py3
    resources:
      limits:
        nvidia.com/gpu: 1        # request exactly 1 GPU
      # Note: GPU limits == GPU requests (no overcommit)
      # Note: nvidia.com/gpu is NOT a CPU/memory — cannot use fractions

# Pod requesting all 8 GPUs on a node (for single-node training)
resources:
  limits:
    nvidia.com/gpu: 8

# Multi-GPU distributed training job (PyTorch DDP)
# Each pod = 1 worker, runs on different nodes
```

**Why GPU cannot be overcommitted:**
Unlike CPU (which has time-slicing), GPU memory is physically allocated. If you request `nvidia.com/gpu: 1`, you get exclusive access to one physical GPU. There is no fractional GPU in the standard device plugin (though MIG — Multi-Instance GPU — provides hardware partitioning on H100).

### Node Feature Discovery (NFD)

NFD scans node hardware and labels nodes with their capabilities:

```bash
# GPU-related node labels added by NFD
kubectl get node <node> -o json | jq '.metadata.labels | to_entries | map(select(.key | startswith("nvidia") or startswith("feature")))'

# Common labels:
# nvidia.com/gpu.product: "NVIDIA-H100-80GB-HBM3"
# nvidia.com/gpu.count: "8"
# nvidia.com/gpu.memory: "81920"   # 80GB in MiB
# nvidia.com/cuda.driver.major: "535"
# feature.node.kubernetes.io/cpu-cpuid.AVX512F: "true"
# feature.node.kubernetes.io/memory-numa: "true"

# Use node labels in pod scheduling
nodeSelector:
  nvidia.com/gpu.product: "NVIDIA-H100-80GB-HBM3"
```

---

## Part 2: Topology-Aware Scheduling

### Why Placement Matters

GPU-to-GPU communication bandwidth varies enormously based on physical placement:

| Communication Path | Bandwidth | Latency |
|-------------------|-----------|---------|
| Same GPU (memory) | 2 TB/s | nanoseconds |
| Same node via NVLink (H100) | 900 GB/s bidirectional | microseconds |
| Same server via PCIe | ~64 GB/s | microseconds |
| Cross-node via InfiniBand (NDR800) | ~100 GB/s | 3–5 µs |
| Cross-node via 100G Ethernet | ~12 GB/s | 20–80 µs |

**For training:** Place all workers in the same NVLink domain (same node or NVLink switch) if possible. InfiniBand for cross-node all-reduce.

**For inference:** Placement is less critical (stateless), but NUMA affinity between CPU and GPU PCIe slot matters for model loading speed.

### Kubernetes Topology Manager

```yaml
# kubelet configuration on GPU nodes
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: best-effort
# Options:
# none: ignore NUMA topology (default, not recommended for GPU)
# best-effort: try to align to NUMA but don't fail if impossible
# restricted: only schedule if NUMA-aligned resources are available
# single-numa-node: all resources must come from a single NUMA node

topologyManagerScope: pod
# pod: allocate all containers in the pod from same NUMA node
# container: per-container allocation (less strict)
```

### Gang Scheduling — The Core Problem

Distributed training requires ALL workers to start simultaneously. Without gang scheduling:

```
Job: 4 workers, each needs 8 GPUs (32 GPUs total)
Cluster: 30 GPUs available, 2 being released by finishing job

Without gang scheduling:
  - Scheduler places workers 1, 2, 3 (24 GPUs)
  - Worker 4 cannot be placed (needs 8, only 6 available)
  - Workers 1-3 sit idle WAITING
  - If 2 more GPUs freed later: worker 4 placed
  - Total wasted time: depends on how long you wait
  - Meanwhile workers 1-3 are holding 24 GPUs doing NOTHING

With gang scheduling (Kueue/Volcano):
  - Job is queued until ALL 32 GPUs are available
  - All 4 workers start simultaneously
  - No GPUs wasted
```

**Kueue** is the Kubernetes-native solution for batch and GPU workload queuing:

```yaml
# ClusterQueue: defines capacity and fair-sharing
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata:
  name: gpu-queue
spec:
  resourceGroups:
  - coveredResources: ["nvidia.com/gpu", "cpu", "memory"]
    flavors:
    - name: h100
      resources:
      - name: nvidia.com/gpu
        nominalQuota: 64        # 8 nodes × 8 GPUs
        borrowingLimit: 128     # can borrow from other teams

---
# Workload (wraps a Job for Kueue admission)
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    kueue.x-k8s.io/queue-name: gpu-queue
spec:
  parallelism: 4
  completions: 4
  template:
    spec:
      containers:
      - name: trainer
        resources:
          limits:
            nvidia.com/gpu: 8
```

---

## Part 3: Kubernetes Operators — The Pattern

### What Is an Operator?

An operator is a controller that encodes **domain-specific operational knowledge** for a complex stateful system. It watches Custom Resource Definitions (CRDs) and reconciles desired state to actual state.

**The controller reconciliation loop:**
```
Watch: API server events for owned CRDs
For each event:
    1. Fetch current state of the CRD
    2. Observe actual system state
    3. Calculate difference
    4. Take minimum action to close the gap
    5. Update CRD .status
    6. Requeue after interval to catch drift
```

**Why operators exist:** Built-in controllers (Deployment, StatefulSet) are general-purpose. Complex systems (databases, training clusters, inference platforms) have domain-specific lifecycle needs:
- "How do I upgrade a Slurm cluster without losing in-flight jobs?"
- "How do I replace a failed GPU node without resubmitting the training job?"
- "How do I scale an inference fleet while preserving KV cache locality?"

### Building a Mental Model of Operators

```
CRD: the declarative spec
  e.g., SlurmCluster { workerCount: 32, gpusPerWorker: 8 }

Controller: the operator that acts on the CRD
  e.g., Soperator controller watches SlurmCluster

Reconcile loop: runs constantly
  - if workerCount is 30 but spec says 32: create 2 more worker Pods
  - if a worker Pod failed: create replacement, notify Slurm
  - if spec.workerCount changed from 32 to 16: drain and delete 16 worker Pods

Status: reflects current state
  e.g., SlurmCluster.status.readyWorkers: 30
```

**What happens when the operator pod crashes?**
- Running workloads continue unaffected (operator is not in the data path)
- No new reconciliation until operator restarts
- Self-healing (node replacement) stops working until operator recovers
- This is why operators need HA (multiple replicas with leader election)

### Idempotency in Operators

Operators must be idempotent: running reconcile multiple times on the same CRD state must produce the same result. This is harder than it sounds:

```go
// BAD: not idempotent
// If this runs twice, it creates two Deployments
err := client.Create(ctx, deployment)

// GOOD: idempotent (create or update)
err := controllerutil.CreateOrUpdate(ctx, client, deployment, func() error {
    // mutate deployment to desired state
    deployment.Spec = desiredSpec
    return nil
})

// GOOD: check before creating
existing := &appsv1.Deployment{}
err := client.Get(ctx, types.NamespacedName{Name: "my-deploy"}, existing)
if errors.IsNotFound(err) {
    err = client.Create(ctx, deployment)
} else if err == nil {
    err = client.Update(ctx, deployment)
}
```

---

## Part 4: AI Inference on Kubernetes

### Inference Platform Architecture

```
User Request
    │
[API Gateway] ← rate limiting, auth, request validation
    │
[Router / Load Balancer] ← KV-cache aware or simple round-robin
    │
[Inference Pods] ← vLLM, Triton, TorchServe
    │ GPU memory
[Model Weights] ← loaded from object storage or shared filesystem
```

### Cold Start Problem

When an inference pod starts (or restarts), it must load the model:
- 7B model at FP16 = 14GB (fast — ~15 seconds on NVMe SSD)
- 70B model at FP16 = 140GB (slow — 2–5 minutes from fast NFS)
- 175B model = 350GB (very slow — may need pre-loading tricks)

**Solutions:**
1. **Never scale to zero:** Keep minimum 1–2 warm replicas
2. **Pre-warm on new pod:** Send test request before routing real traffic (readiness probe)
3. **Model caching on fast local SSD:** Attach NVMe SSDs to inference nodes, cache model weights
4. **Quantization:** FP8 or INT4 quantization cuts model size by 2–4x, faster loading and inference

### Autoscaling Inference

```yaml
# Scale based on queue depth (requests waiting)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    name: llm-inference
  metrics:
  - type: External
    external:
      metric:
        name: inference_queue_depth
      target:
        type: AverageValue
        averageValue: "5"     # scale when queue > 5 per replica
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60   # don't scale up before 60s
      policies:
      - type: Pods
        value: 2              # add max 2 replicas per scale event
    scaleDown:
      stabilizationWindowSeconds: 300  # wait 5 min before scale down
```

**Scale-up lead time:** Because model loading takes minutes, you need to scale up proactively:
- Monitor queue depth trend (not just current value)
- Scale when queue depth starts increasing, not when it's already saturated

### GPU Memory Management in Inference

The primary constraint for inference is GPU HBM memory:
```
H100 80GB HBM3:
  - Model weights: 70B × 2 bytes (FP16) = 140GB → needs 2 GPUs minimum
  - KV cache: depends on sequence length and batch size
  - Activations: depends on batch size
  - Overhead: framework runtime, CUDA context

# vLLM PagedAttention splits HBM into:
#   model_loading_portion + kv_cache_portion
# kv_cache_portion = gpu_memory_utilization × total_HBM - model_weights

# Example on 2× H100 80GB:
#   Total HBM = 160GB
#   Model weights (Llama-3 70B FP16) = 140GB
#   Available for KV cache = 0.90 × 160 - 140 = 4GB
#   At this ratio: very little KV cache → must serve small batch sizes or use quantization
```

---

## Part 5: Service Mesh Considerations for AI Platforms

### When to Use a Service Mesh

A service mesh (Istio, Linkerd) adds a sidecar proxy to every Pod, handling mTLS, traffic policies, retries, and telemetry.

**When it helps for AI platforms:**
- mTLS between inference API and internal clients
- Traffic splitting for model version canary deployments (5% to v2, 95% to v1)
- Request-level retry policies and timeout enforcement
- Distributed tracing for inference request chains

**When it hurts:**
- High-throughput, latency-sensitive inference: sidecar adds 1–5ms per hop
- Large model downloads: sidecar memory overhead is trivial but not zero
- Training jobs: no benefit (NCCL doesn't go through the sidecar)

**Ambient mesh (Istio 1.18+):** Moves L4 mTLS to a per-node agent (ztunnel) instead of per-pod sidecar. Better fit for GPU pods where overhead matters.

### Disaster Recovery for Kubernetes Platforms

**etcd:** The most critical component. Without etcd, the cluster cannot function.
```bash
# Backup etcd (should run on a cron)
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-$(date +%Y%m%d-%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify backup
etcdctl snapshot verify /backup/etcd-*.db

# Restore (on new cluster)
etcdctl snapshot restore /backup/etcd-latest.db \
  --data-dir=/var/lib/etcd-restored
```

**Stateful ML workloads:**
- Model weights: stored in object storage (multi-region replication)
- Training checkpoints: stored on distributed filesystem (WEKA/NFS with snapshot)
- Experiment metadata: MLflow tracking server with PostgreSQL backend (replicated)

**Multi-cluster failover:**
- Active-active: two clusters in different AZs, both serving traffic
- Active-passive: one cluster serves, other is warm standby
- For training: no need for active-active (batch workload, submit to healthy cluster)
- For inference: active-active with global load balancer, minimum 2 clusters

---

## Part 6: Interview Questions + Strong Answers

### Q: "Why does distributed training need stronger scheduling guarantees than a web API?"

"A web API pod is independent — adding or removing replicas is seamless, and a failed pod is replaced without affecting others. But a distributed training job is a tightly coupled group: all workers execute the same code and synchronize via all-reduce at every training step.

If one worker is not started: the entire job hangs waiting for it — wasting the GPUs that are running.
If one worker crashes: the job cannot proceed — all other workers are idle.
If workers start on suboptimal nodes: slow all-reduce degrades throughput for all workers.

This means:
1. Gang scheduling: all-or-nothing placement. No partial start.
2. Topology awareness: place workers to minimize all-reduce latency (same NVLink domain, then InfiniBand).
3. Fault detection: fast detection and recovery. A slow straggler must be detected and replaced, not just 'eventually evicted.'
4. Checkpoint management: a long training job cannot restart from scratch — it must checkpoint regularly and resume from the latest checkpoint."

---

### Q: "What is a Kubernetes Operator and when would you use one over a StatefulSet?"

"A Kubernetes Operator is a controller that watches a Custom Resource Definition and implements domain-specific reconciliation logic. It encodes operational knowledge that built-in controllers don't have.

StatefulSet handles: ordered pod creation, stable network identities, persistent volume claim templates, ordered rolling updates.

Operator handles: application-level lifecycle operations that require domain knowledge — 'to upgrade a Cassandra cluster, drain one node at a time, wait for repair to complete before proceeding, run nodetool cleanup after joining' — none of that is in a StatefulSet.

I would use an operator when:
1. The stateful system has a complex upgrade or failure-recovery procedure
2. Operations require domain knowledge (run this command in this state, wait for this condition)
3. The system needs custom health logic (not just pod liveness but application-level quorum)

For AI platforms specifically: training cluster operators (Soperator), inference platform operators, MLflow operators, feature store operators — all encode GPU-specific or ML-specific lifecycle logic that generic Kubernetes controllers cannot express."

---

## Points to Remember

- GPU cannot be overcommitted — one request = exclusive access to that GPU (unless MIG)
- Gang scheduling prevents wasted GPU time from partial job placement — always use Kueue or Volcano for training
- Topology manager allocates Pod resources from same NUMA node — critical for GPU PCIe performance
- NVLink bandwidth (900 GB/s) >> InfiniBand (100 GB/s) >> PCIe/Ethernet — always prefer NVLink-connected GPUs for multi-GPU training
- Cold start: 70B FP16 model takes 2–5 minutes to load — always keep warm replicas for inference
- Operators are not in the critical data path — existing workloads continue if operator crashes
- Operator reconcile must be idempotent — running it twice must not create duplicate resources
- etcd backup is non-negotiable — test restore procedures, not just backups

## What to Study Next

- [nebius/03-gpu-ai-infrastructure.md](../nebius/03-gpu-ai-infrastructure.md) — GPU hardware (InfiniBand, DCGM, NCCL) at Nebius depth
- [nebius/02-kubernetes-cilium-production.md](../nebius/02-kubernetes-cilium-production.md) — Kubernetes control plane and Cilium
- [nebius/04-system-design.md](../nebius/04-system-design.md) — Design a GPU cluster and inference platform from scratch
