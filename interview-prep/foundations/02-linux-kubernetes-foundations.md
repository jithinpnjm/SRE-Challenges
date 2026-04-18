# Foundations: Linux Internals And How Kubernetes Really Uses Them

Kubernetes is not a replacement for Linux knowledge. It is a control layer sitting on top of Linux processes, cgroups, namespaces, filesystems, networking, and kernel behavior.

The more senior you become, the less you say “Kubernetes is broken” and the more you say, “the kubelet is healthy, but the node dataplane is failing for new Pod sandboxes,” or “the scheduler is fine, but the real problem is memory pressure and cgroup reclaim on two worker nodes.”

## Mentor Mode

When Kubernetes feels complicated, reduce it to this:

1. What was the desired state?
2. Which component is responsible for making that state real?
3. Which Linux primitive actually enforces the behavior?
4. Is the problem in the control plane, the node plane, or the dataplane?
5. What evidence would prove that?

That mental model is what takes you from “kubectl user” to real production operator.

## Answer This In The Portal

- Draft your Kubernetes internals answer here: [/workspace?challenge=Kubernetes%20internals%20and%20node-level%20reasoning](/workspace?challenge=Kubernetes%20internals%20and%20node-level%20reasoning)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- Guided review flow: [interactive-study.mdx](../interactive-study.mdx)

## The Three-Plane Model

This is one of the cleanest ways to think in interviews.

### Control Plane

This is where desired state is stored and decisions are made:

- API server
- etcd
- scheduler
- controller manager

Symptoms from this plane:

- objects do not update
- new Pods do not schedule
- node or workload status becomes stale
- control loops lag or fail

### Node Plane

This is where the work is actually run:

- kubelet
- container runtime
- cgroups
- filesystems
- volume mounts
- node OS

Symptoms from this plane:

- image pulls fail
- containers will not start
- probes flap
- node pressure causes evictions
- logs or volumes behave strangely

### Dataplane

This is where packets are forwarded and policies are enforced:

- Pod network namespace
- veth pairs
- CNI setup
- kube-proxy or eBPF service logic
- iptables, nftables, or BPF policy
- conntrack

Symptoms from this plane:

- Pod-to-Pod failures
- Service VIP failures
- DNS timeout in only some Pods
- network policy mismatches
- cross-node reachability problems

## Linux Primitives You Must Own

### Processes

Containers still run as ordinary Linux processes.

That means every container has:

- PID
- scheduler state
- memory map
- file descriptors
- open sockets
- cgroup membership
- namespace membership

Useful commands:

```bash
ps aux
top
pidstat -p ALL 1
lsof -p <pid>
strace -p <pid>
cat /proc/<pid>/status
```

Mentor note:

- if you cannot inspect a Linux process, you are not really debugging the container yet

### Namespaces

Namespaces isolate resource views.

The most important for containers:

- `pid`
- `net`
- `mnt`
- `uts`
- `ipc`
- `user`

Why this matters in Kubernetes:

- a Pod usually has its own network namespace
- containers inside the same Pod share that namespace
- sidecars and the main app see the same Pod IP
- many “Pod networking” issues are namespace-level Linux issues

Useful commands:

```bash
lsns
nsenter --target <pid> --net
nsenter --target <pid> --mount
readlink /proc/<pid>/ns/net
```

### cgroups v2

Requests and limits eventually become kernel-enforced behavior through cgroups.

Important concepts:

- `cpu.max` and throttling
- `cpu.weight` and relative sharing
- `memory.max` for hard caps
- `memory.high` for reclaim pressure before OOM
- `memory.events` for pressure clues
- pressure stall information for queueing pain

Useful commands:

```bash
mount | grep cgroup
cat /sys/fs/cgroup/cgroup.controllers
cat /proc/cgroups
find /sys/fs/cgroup -maxdepth 3 -type f | head
cat /proc/pressure/cpu
cat /proc/pressure/memory
cat /proc/pressure/io
```

Senior interview rule:

- do not just say “CPU high”
- explain whether this is saturation, throttling, runnable queueing, reclaim, or IO stall

### Filesystems And Volumes

Containers use Linux filesystems and mounted storage. Nothing magical here.

Operationally important:

- image layers often use overlay filesystems
- writable layers are not a durable storage strategy
- kubelet mounts persistent volumes and projected config
- disk pressure and inode exhaustion can break nodes without obvious app-level errors

Useful commands:

```bash
mount
findmnt
df -h
df -i
du -sh /var/lib/containerd 2>/dev/null
du -sh /var/lib/kubelet 2>/dev/null
```

### Linux Networking On A Node

The node dataplane may involve:

- veth pairs
- bridge or routed Pod networking
- iptables or nftables
- eBPF programs and maps
- conntrack state

Useful commands:

```bash
ip addr
ip route
ip link
ss -tulpn
iptables-save
nft list ruleset
bpftool prog show
bpftool map show
conntrack -S
```

## Kubernetes Components Through A Linux Lens

### API Server

The API server is the front door to cluster state.

If it is impaired:

- writes may fail
- controllers lag
- scheduler decisions slow down
- kubelets may keep running existing workloads while the cluster feels stale

### etcd

etcd is the authoritative state store, not a random implementation detail.

Operationally, you should care about:

- quorum
- write latency
- compaction
- defragmentation
- backup and restore procedures

Staff-level note:

- many “cluster failures” are actually state-store or control-plane health problems

### Scheduler

The scheduler decides placement from declared constraints.

It evaluates:

- resource requests
- taints and tolerations
- affinity and anti-affinity
- topology spread
- node selectors
- custom scheduling constraints

The scheduler does not solve:

- node runtime failure
- image pull latency
- broken CNI
- packet loss

### kubelet

The kubelet is the most important node agent to understand.

It:

- watches Pods assigned to the node
- asks the runtime to realize sandboxes and containers
- manages probes
- mounts volumes
- reports status
- participates in eviction under pressure

If kubelet is sick:

- status becomes misleading
- Pods may look stuck between states
- probes become noisy
- log access and runtime behavior diverge

Useful commands:

```bash
systemctl status kubelet
journalctl -u kubelet -n 200
crictl ps
crictl pods
```

### Container Runtime

The runtime is where sandboxes and containers become real processes.

If the runtime breaks, symptoms may appear as:

- `ImagePullBackOff`
- `CrashLoopBackOff`
- sandbox creation errors
- failed mounts
- missing logs

Useful commands:

```bash
crictl ps -a
crictl inspect <container-id>
crictl logs <container-id>
ctr -n k8s.io containers list
```

## How Pod Networking Really Works

At a high level, a Pod usually gets:

- a network namespace
- one or more interfaces
- a Pod IP
- routes
- DNS config
- connectivity controlled by the node dataplane

When traffic fails, split it into:

1. interface and namespace creation
2. local routing
3. Service translation
4. policy enforcement
5. cross-node transport
6. DNS resolution

This prevents vague answers like “CNI issue.”

## Services, EndpointSlices, And Readiness

Senior engineers know the distinction between:

- a healthy container
- a ready Pod
- a reachable endpoint
- a healthy Service backend

Service traffic often depends on:

- Service VIP
- EndpointSlice correctness
- readiness gating
- kube-proxy or eBPF dataplane rules
- conntrack behavior on the node

Useful commands:

```bash
kubectl get svc,endpoints,endpointslices -A
kubectl describe svc <name>
kubectl get pod -o wide
```

Mentor note:

- “Pod is running” does not prove “Service is healthy”

## The Questions Behind Common Symptoms

### Symptom: Pod Will Not Start

Ask:

- did the scheduler bind the Pod
- did kubelet receive and process it
- did image pull succeed
- did sandbox creation succeed
- did volume setup succeed
- did the process start and exit

### Symptom: Pod Starts But Never Becomes Ready

Ask:

- is the app listening on the expected port
- are startup or readiness probes wrong
- is dependency access blocked
- is DNS resolution failing
- is sidecar init delaying readiness

### Symptom: Service Fails But Pod Is Running

Ask:

- is the Pod marked ready
- does EndpointSlice include the Pod
- does the Service selector match
- is kube-proxy or eBPF dataplane healthy
- does network policy block the path

### Symptom: Only One Node Has Many Failures

Ask:

- kubelet health
- disk pressure or inode exhaustion
- CNI state drift
- conntrack pressure
- MTU mismatch
- DNS cache issue on that node
- runtime instability

## Resource Management The Senior Way

### Requests Versus Limits

Requests affect scheduling.

Limits affect runtime enforcement.

If you say only that, you are still at the surface.

Go deeper:

- low request plus high actual use can cause noisy-neighbor behavior
- low CPU limit can cause throttling and latency spikes
- memory limit can create hard kills
- `memory.high` style reclaim pressure can hurt before OOM
- overcommitting nodes is a policy decision, not an accident

### Eviction Thinking

Kubernetes can evict Pods due to:

- memory pressure
- disk pressure
- inode pressure
- ephemeral storage pressure

Interview tip:

- know the difference between app crash, OOM kill, and kubelet eviction

## Linux Commands That Matter During Kubernetes Incidents

### Node State

```bash
uptime
free -m
vmstat 1
iostat -xz 1
df -h
df -i
```

### Process And Runtime

```bash
ps aux --sort=-%mem | head
ps aux --sort=-%cpu | head
crictl ps -a
crictl stats
journalctl -u kubelet -n 200
```

### Network

```bash
ip addr
ip route
ss -tulpn
iptables-save | head -200
conntrack -S
tcpdump -ni any host <pod-ip>
```

### Kubernetes Objects

```bash
kubectl get nodes
kubectl describe node <node>
kubectl get pods -A -o wide
kubectl describe pod <pod> -n <ns>
kubectl get events -A --sort-by=.lastTimestamp
```

## How Linux And Kubernetes Work Hand In Hand

This is the bridge interviewers care about:

- Kubernetes declares desired state
- kubelet and runtime translate that into processes, namespaces, mounts, and cgroups
- the kernel enforces scheduling, memory, IO, and networking behavior
- CNI and dataplane logic wire Pod and Service traffic into Linux networking
- observability and troubleshooting still depend on Linux signals underneath

Once this clicks, Kubernetes becomes much less mystical.

## Staff-Level Drills

### Drill 1: Pod Ready In One Zone, Failing In Another

Think:

- topology-specific dependency reachability
- zone-local DNS or LB path
- CNI differences
- route or MTU mismatch
- node image or kernel drift

### Drill 2: API Latency Spikes After CPU Limits Added

Think:

- cgroup CPU throttling
- request concurrency
- probe sensitivity
- tail latency under quota pressure

### Drill 3: New Pods Cannot Reach A Database

Think:

- DNS for the database name
- egress network policy
- route and firewall path
- NAT or SNAT expectations
- database allowlist assumptions

## Reinforcement From Your Archive

Use these after this guide if you want more examples:

- [06-kubernetes-networking-deep-dive.md](06-kubernetes-networking-deep-dive.md)
- [12-kubernetes-gpu-ai-platforms-and-operators.md](12-kubernetes-gpu-ai-platforms-and-operators.md)
- [25-yaml-and-kubernetes-manifest-design.md](25-yaml-and-kubernetes-manifest-design.md)
- [13-docker-and-container-runtime.md](13-docker-and-container-runtime.md)
- [26-devops-troubleshooting-and-security-errors.md](26-devops-troubleshooting-and-security-errors.md)

## What Good Looks Like In An Interview

If someone asks, “Why would a Service fail even when Pods are running?”, a strong answer sounds like this:

1. I would separate container health from Service reachability.
2. I would verify readiness, selectors, and EndpointSlice population.
3. I would then check whether kube-proxy or the eBPF dataplane is programming the Service path correctly.
4. If it is scoped to one node, I would inspect node-local networking, conntrack, and CNI state.
5. I would confirm whether this is a control-plane state issue or a dataplane delivery issue before proposing fixes.

That answer shows Linux awareness, Kubernetes awareness, and operational discipline together.
