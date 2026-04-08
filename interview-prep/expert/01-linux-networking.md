# Expert: Linux, Performance, And Networking

These prompts are aimed at senior production reasoning under scale and ambiguity.

## Challenge 1: Tail Latency Meltdown

Scenario: Median latency is steady, but p99 and p999 rise sharply during bursts. CPU is only 55 percent on average. Throughput remains high until sudden collapse.

Your task:

- explain why averages are misleading here
- walk through queueing, lock contention, run-queue growth, retransmits, and dependency fan-out as candidate causes
- describe what high-resolution measurements you would want first

## Challenge 2: Kernel And Host Tuning Tradeoffs

Scenario: A latency-sensitive service team wants to tune TCP buffers, backlog sizes, IRQ affinity, and CPU pinning on shared nodes.

Your task:

- explain which of these are reasonable and which are risky without workload proof
- explain how tuning can improve one workload while harming multi-tenant stability
- describe a safe experiment design

## Challenge 3: Packet Path Reasoning

Prompt:

- explain the packet path from a client outside the cluster to a containerized service behind a cloud load balancer
- include LB, node networking, kube-proxy or eBPF service handling, CNI path, and container namespace delivery
- name at least five places latency or drops can be introduced

## Challenge 4: Noisy Neighbor In A Shared Platform

Scenario: One tenant runs bursty jobs that create latency spikes for a neighboring low-latency API.

Your task:

- explain how CPU, memory bandwidth, disk, network, and conntrack contention can show up
- explain mitigation options at Linux, Kubernetes, and platform policy layers
- explain when hard isolation is worth the cost

## Challenge 5: Incident With Conflicting Signals

Scenario: Application metrics show rising error rate, but host metrics look normal. Packet captures show retransmits, yet only for one traffic class. The issue crosses multiple layers.

Your task:

- narrate your investigation in priority order
- explain how you avoid overfitting to the first suspicious metric
- explain what evidence would convince you to move from app, to service mesh, to network, to kernel, or back again

## Challenge 6: Explain PSI And Why It Matters

Prompt:

- explain pressure stall information and why it can reveal pain before hard resource failure
- describe where PSI helps more than simple utilization metrics
- explain how you would use it in a platform environment
