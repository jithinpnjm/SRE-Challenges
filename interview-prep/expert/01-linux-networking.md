# Expert: Linux, Performance, And Networking

These prompts target the level where you are expected to sound like someone who has operated complex systems under load, failure, and ambiguity.

## Mentor Mode

Expert answers should:

- separate observation from interpretation
- reason about queueing and contention, not just raw utilization
- distinguish node-local, network-path, and dependency causes
- explain what you would measure before tuning
- include the safest mitigation path, not only the clever diagnosis path

Useful commands:

```bash
perf top
perf record
bpftool prog show
ss -ti
sar -n DEV,TCP,ETCP 1
ethtool -S <iface>
cat /proc/pressure/cpu
cat /proc/pressure/memory
cat /proc/pressure/io
tcpdump -nnvvXSs 0
```

## Challenge 1: Tail Latency Meltdown

Scenario: Median latency is steady, but p99 and p999 rise sharply during bursts. CPU is only 55 percent on average. Throughput remains high until sudden collapse.

Your task:

- explain why averages are misleading here
- walk through queueing, lock contention, run-queue growth, retransmits, and dependency fan-out as candidate causes
- describe what high-resolution measurements you would want first

Mentor hints:

- you are looking for where work waits, not just where work runs
- tail latency often points to queue buildup, partial loss, retries, or skewed hotspots

## Challenge 2: Kernel And Host Tuning Tradeoffs

Scenario: A latency-sensitive service team wants to tune TCP buffers, backlog sizes, IRQ affinity, and CPU pinning on shared nodes.

Your task:

- explain which of these are reasonable and which are risky without workload proof
- explain how tuning can improve one workload while harming multi-tenant stability
- describe a safe experiment design

Mentor hints:

- tuning is an engineering change, not a superstition
- say what baseline and rollback you want before touching knobs

## Challenge 3: Packet Path Reasoning

Prompt:

- explain the packet path from a client outside the cluster to a containerized service behind a cloud load balancer
- include LB, node networking, kube-proxy or eBPF service handling, CNI path, and container namespace delivery
- name at least five places latency or drops can be introduced

Mentor hints:

- this is a staff-level "can you see the whole system" question

## Challenge 4: Noisy Neighbor In A Shared Platform

Scenario: One tenant runs bursty jobs that create latency spikes for a neighboring low-latency API.

Your task:

- explain how CPU, memory bandwidth, disk, network, and conntrack contention can show up
- explain mitigation options at Linux, Kubernetes, and platform policy layers
- explain when hard isolation is worth the cost

Mentor hints:

- do not reduce this to CPU shares alone
- think about shared state and shared buffers too

## Challenge 5: Incident With Conflicting Signals

Scenario: Application metrics show rising error rate, but host metrics look normal. Packet captures show retransmits, yet only for one traffic class. The issue crosses multiple layers.

Your task:

- narrate your investigation in priority order
- explain how you avoid overfitting to the first suspicious metric
- explain what evidence would convince you to move from app, to service mesh, to network, to kernel, or back again

Mentor hints:

- "host metrics normal" does not clear the network path
- one traffic class only usually means path, policy, or dependency-specific behavior

## Challenge 6: Explain PSI And Why It Matters

Prompt:

- explain pressure stall information and why it can reveal pain before hard resource failure
- describe where PSI helps more than simple utilization metrics
- explain how you would use it in a platform environment

## Challenge 7: eBPF Observation Strategy

Your task:

- explain where eBPF-based observability helps
- explain its limits and operational risks
- explain when packet capture is still the better first move

## Challenge 8: IRQ And CPU Affinity

Your task:

- explain when interrupt distribution or CPU pinning can matter
- explain why the wrong tuning can harm neighbors
- explain how you would validate whether this is even relevant to the workload

## Challenge 9: Overload At The TCP And App Boundary

Scenario: A service survives normal traffic but collapses during a successful launch because new connections spike, retries surge, and downstream caches miss.

Your task:

- explain how overload can appear at the TCP layer, proxy layer, and application layer at the same time
- explain safe overload controls
- explain what you would shed first and why

## Challenge 10: Staff-Level Narrative Under Pressure

Scenario: Leadership asks whether to fail over a region, but you only know that cross-zone latency is up, new connections are failing intermittently, and some node pools show pressure signals.

Your task:

- explain how you would talk through the decision
- explain what you still need to know
- explain how to reduce blast radius while uncertainty remains
