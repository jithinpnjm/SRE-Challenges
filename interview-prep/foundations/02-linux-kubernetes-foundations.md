# Foundations: Linux Internals And How Kubernetes Really Uses Them

Kubernetes sits on top of Linux, not beside it. Senior engineers usually become much stronger in Kubernetes interviews the moment they stop treating Pods and Services as abstract magic objects.

## Mentor Mode

When something in Kubernetes is slow, failing, or weird, ask:

## Answer This In The Portal

- Draft your Kubernetes internals answer here: [/workspace?challenge=Kubernetes%20internals%20and%20node-level%20reasoning](/workspace?challenge=Kubernetes%20internals%20and%20node-level%20reasoning)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- Guided review flow: [interactive-study.mdx](../interactive-study.mdx)

1. Is this desired-state logic failing, or runtime behavior failing?
2. Is the problem in the control plane, node plane, or dataplane?
3. Which Linux primitive is underneath the symptom?
4. Which component is enforcing the behavior: scheduler, kubelet, runtime, kernel, or CNI?

That framing is often the difference between an intermediate answer and a senior one.

## Linux Primitives You Need To Truly Own

### Processes

Containers still run normal Linux processes.

That means each process has:

- a PID
- scheduling state
- memory map
- file descriptors
- sockets
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

### Namespaces

Namespaces isolate views of system resources.

The important ones for containers:

- `pid`: process IDs
- `net`: interfaces, routes, sockets, firewall rules
- `mnt`: mount view
- `uts`: hostname
- `ipc`: shared memory and semaphores
- `user`: UID and GID mapping

Why you care:

- every Pod usually has its own network namespace
- sidecars share that namespace with the app in the same Pod
- debugging a Pod network issue often means entering the right namespace

Useful commands:

```bash
lsns
nsenter --target <pid> --net
nsenter --target <pid> --mount
ip netns
```

### cgroups v2

cgroups organize and limit resource usage hierarchically.

Why senior engineers care:

- Kubernetes requests and limits eventually become cgroup behavior
- CPU throttling, memory protection, and reclaim are visible here
- node pain often appears in cgroup or PSI signals before app teams notice

Important cgroup v2 files to understand conceptually:

- `cpu.max`
- `cpu.weight`
- `cpu.stat`
- `memory.current`
- `memory.max`
- `memory.min`
- `memory.high`
- `memory.events`
- `cpu.pressure`, `memory.pressure`, `io.pressure`

Useful commands:

```bash
mount | grep cgroup
cat /sys/fs/cgroup/cgroup.controllers
cat /proc/cgroups
find /sys/fs/cgroup -maxdepth 2 -type f | head
```

### Pressure Stall Information

PSI is one of the most senior-useful Linux concepts because it helps you see contention before hard failure.

PSI tells you when tasks are stalled waiting on:

- CPU
- memory
- IO

Why it matters:

- utilization alone can hide queuing pain
- memory pressure can harm latency long before OOM
- IO stalls can make a system "slow" without pegging CPU

Useful commands:

```bash
cat /proc/pressure/cpu
cat /proc/pressure/memory
cat /proc/pressure/io
```

### Filesystems And Overlay Layers

Containers use Linux filesystems too.

Relevant facts:

- image layers are often overlay-based
- writable layers are not magic and can behave differently from direct host filesystems
- kubelet mounts volumes into Pods
- inode exhaustion and disk pressure can break "healthy looking" workloads

Useful commands:

```bash
mount
findmnt
df -h
df -i
du -sh /var/lib/containerd 2>/dev/null
du -sh /var/lib/docker 2>/dev/null
```

### Networking Dataplane: iptables, nftables, eBPF

Common possibilities:

- iptables NAT and filtering
- nftables-based filtering
- eBPF-based service or policy logic

You do not need vendor-specific detail first. You do need to know:

- where Service translation might happen
- where policy might be enforced
- where conntrack is used
- what packet visibility changes under eBPF-heavy dataplanes

Useful commands:

```bash
iptables-save
nft list ruleset
bpftool prog show
bpftool map show
```

## Kubernetes Components Through A Linux Lens

### kube-scheduler

The scheduler decides placement, not execution.

Senior-level detail to remember:

- it watches unscheduled Pods
- filters nodes that are invalid for placement
- scores viable nodes
- binds Pod to node
- it reasons from requests, constraints, taints, affinity, topology, and policy

What the scheduler does not do:

- it does not make CPU cycles appear
- it does not fix node-local runtime or dataplane problems

### kubelet

The kubelet is the primary node agent.

Operationally, kubelet:

- watches PodSpecs meant for the node
- asks the runtime to start and stop containers
- runs probes
- manages local volume mounts
- reports node and pod status
- handles local eviction under pressure

If kubelet is unhealthy, the cluster can feel haunted:

- probes flap
- pod status goes stale
- logs still exist but state transitions get weird
- node pressure decisions may look confusing

### Container Runtime

The runtime:

- pulls images
- creates container sandboxes
- starts and stops processes
- wires namespace and cgroup setup

If runtime behavior breaks, Kubernetes symptoms may look like:

- `ImagePullBackOff`
- container startup delay
- logs missing or delayed
- sandbox creation failures

### CNI And Pod Networking

At a high level, a Pod often gets:

- its own network namespace
- a veth pair
- a Pod IP
- routes
- DNS configuration
- packet handling integrated into node networking

If Pod-to-Pod traffic fails, think:

- namespace and interface setup
- routes
- policy enforcement
- node dataplane state
- cross-node overlay or routing path

### Service Networking

Service traffic usually depends on:

- Service VIP or proxy path
- EndpointSlice contents
- ready endpoints
- kube-proxy or eBPF dataplane logic
- node-local conntrack state

Senior warning:

- a healthy Pod is not automatically a healthy Service backend

### Logging

Important operational fact:

- `kubectl logs` is convenient, but it is not a full logging architecture
- kubelet usually reads container log files from node storage
- node-local log rotation and pod death can hide useful evidence

## Resource Management The Senior Way

### Requests Versus Limits

Requests influence scheduling.

Limits influence enforcement.

Problems happen when teams:

- set requests too low, hiding real capacity needs
- set CPU limits that cause throttling in latency-sensitive paths
- set memory limits without understanding reclaim and OOM behavior

### QoS Classes

Kubernetes uses QoS classes partly to guide eviction behavior:

- `Guaranteed`
- `Burstable`
- `BestEffort`

But do not oversimplify:

- QoS is not a magic protection shield
- badly set requests still create pain
- cgroup behavior and node pressure matter underneath

### CPU Throttling Versus CPU Saturation

These are not the same:

- saturation means CPUs are genuinely busy
- throttling means a cgroup is being limited even if host capacity exists elsewhere

This matters in Kubernetes because a container can be slow on an otherwise not-fully-loaded node.

### Memory Pressure Before OOM

Senior engineers do not wait for OOM kills to say "memory problem."

Symptoms can appear earlier:

- latency rises
- page cache reclaim increases
- disk IO rises
- PSI memory pressure increases
- kubelet begins considering eviction candidates

### Disk Pressure

Kubernetes can experience pressure from:

- root filesystem usage
- image filesystem usage
- inode exhaustion
- log growth

Pod behavior may degrade long before app owners understand why.

## Mentor Walkthrough: Pod Slow On One Node

Scenario: Pod is slow only on one node.

Think in this order:

1. compare one good node and one bad node
2. check if Pod placement is the main differentiator
3. inspect node pressure, runtime health, kubelet logs, and service path
4. inspect cgroup behavior if throttling or memory pressure is plausible
5. inspect networking if only remote dependencies are slow

Helpful commands:

```bash
kubectl describe pod <pod>
kubectl describe node <node>
kubectl top pod <pod>
kubectl top node
kubectl get events -A --sort-by=.lastTimestamp
journalctl -u kubelet
crictl ps
crictl inspect <container-id>
cat /proc/pressure/cpu
cat /proc/pressure/memory
ip addr
ip route
ss -tanp
```

## Kubernetes Packet Path In Plain Language

For traffic from Pod A to Service B:

1. process in Pod A opens socket
2. packet leaves Pod A network namespace
3. node dataplane translates Service VIP or routes toward backend
4. backend Pod IP is selected from ready endpoints
5. packet crosses node-local or cross-node path
6. packet enters backend Pod network namespace
7. backend process receives it

At least five layers can break this:

- client resolver
- client Pod namespace
- node dataplane
- cross-node path
- backend readiness or local app behavior

## Senior Practice Drills

1. Explain how a Pod gets CPU time from the Linux scheduler.
2. Explain how a memory limit can create latency before a kill.
3. Explain how kubelet and runtime divide responsibility.
4. Explain why a Service failure might be healthy Pods plus stale endpoints.
5. Explain how cgroup v2 and QoS connect conceptually.
