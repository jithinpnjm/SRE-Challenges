# Intermediate: Linux And Networking

These scenarios are closer to real production interviews. Expect to justify your debugging order and tradeoffs.

## Challenge 1: High CPU But Low Request Volume

Scenario: A service shows rising p99 latency and node CPU at 90 percent, but request volume is normal. Memory is stable. Disk is quiet.

Your task:

- explain how you would distinguish user CPU, system CPU, steal time, interrupt load, and spin-loop behavior
- describe when to use `top`, `pidstat`, `perf`, `mpstat`, and `strace`
- explain what would make you suspect kernel networking overhead or lock contention

## Challenge 2: Conntrack Saturation

Scenario: A Kubernetes node intermittently drops new outbound connections during traffic bursts. Existing connections mostly survive.

Your task:

- explain why conntrack could cause this
- describe symptoms at the application layer
- list the metrics and host commands you would inspect
- explain both short-term and long-term fixes

## Challenge 3: DNS Latency Under Load

Scenario: Application latency spikes correlate with outbound DNS lookup latency. CPU and network bandwidth look healthy.

Your task:

- explain the request path for DNS in a Kubernetes cluster
- explain what could go wrong in CoreDNS, upstream resolvers, node local DNS, or app behavior
- propose mitigations that do not simply "increase replicas"

## Challenge 4: Debugging Packet Reordering And MTU Issues

Scenario: A service behind a load balancer shows intermittent gRPC timeouts for large responses only. Small responses are fine.

Your task:

- explain why MTU, fragmentation, PMTU discovery, or overlay network overhead might matter
- explain how you would validate your theory
- explain how gRPC retries can hide and amplify this issue

## Challenge 5: Memory Pressure Without OOM Kill

Scenario: Hosts become sluggish, but containers are not being OOM-killed. Latency rises and disk IO increases.

Your task:

- explain page cache pressure, reclaim, swap behavior, and PSI
- describe what evidence would show memory contention before process death
- explain why this matters for latency-sensitive systems

## Challenge 6: Nebius-Style Troubleshooting Drill

Scenario: A service is "reachable from some racks but not others." You have incomplete data, multiple possible failure domains, and pressure to speak quickly.

Your task:

- give a crisp 5-minute triage narrative
- mention at least host, rack, L3, DNS, ACL, load balancer, and service health possibilities
- explain how you avoid chasing the wrong layer first
