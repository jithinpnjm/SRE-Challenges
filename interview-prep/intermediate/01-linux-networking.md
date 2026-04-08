# Intermediate: Linux And Networking

These scenarios are closer to real production interviews. The goal is to explain why your next command is the right next command.

## Mentor Mode

At this level, move beyond "I would check CPU and logs."

Your answer should sound like:

- what hypothesis you are testing
- why that hypothesis fits the symptom pattern
- what evidence would falsify it
- how you would compare healthy and unhealthy paths

Useful commands:

```bash
mpstat -P ALL 1
pidstat 1
vmstat 1
iostat -xz 1
sar -n DEV,TCP,ETCP 1
ss -s
ss -tanpi
perf top
tcpdump -i any
```

## Challenge 1: High CPU But Low Request Volume

Scenario: A service shows rising p99 latency and node CPU at 90 percent, but request volume is normal. Memory is stable. Disk is quiet.

Your task:

- explain how you would distinguish user CPU, system CPU, steal time, interrupt load, and spin-loop behavior
- describe when to use `top`, `pidstat`, `perf`, `mpstat`, and `strace`
- explain what would make you suspect kernel networking overhead or lock contention

Mentor hints:

- normal volume plus high CPU can still mean retry storm, bad loop, lock contention, or interrupt overhead
- average CPU is not enough; inspect CPU mode and per-core skew
- if one core is pinned or interrupt-heavy, the service can suffer before the whole host looks full

## Challenge 2: Conntrack Saturation

Scenario: A Kubernetes node intermittently drops new outbound connections during traffic bursts. Existing connections mostly survive.

Your task:

- explain why conntrack could cause this
- describe symptoms at the application layer
- list the metrics and host commands you would inspect
- explain both short-term and long-term fixes

Mentor hints:

- "new connections fail, old ones limp on" is a classic state-exhaustion clue
- do not confuse conntrack issues with pure bandwidth issues

Useful commands:

```bash
ss -s
conntrack -S
cat /proc/sys/net/netfilter/nf_conntrack_max
dmesg | grep -i conntrack
```

## Challenge 3: DNS Latency Under Load

Scenario: Application latency spikes correlate with outbound DNS lookup latency. CPU and network bandwidth look healthy.

Your task:

- explain the request path for DNS in a Kubernetes cluster
- explain what could go wrong in CoreDNS, upstream resolvers, node local DNS, or app behavior
- propose mitigations that do not simply "increase replicas"

Mentor hints:

- think about query amplification, search domains, ndots, caching, and connection reuse
- compare app-level lookup behavior with cluster DNS capacity

## Challenge 4: Debugging Packet Reordering And MTU Issues

Scenario: A service behind a load balancer shows intermittent gRPC timeouts for large responses only. Small responses are fine.

Your task:

- explain why MTU, fragmentation, PMTU discovery, or overlay network overhead might matter
- explain how you would validate your theory
- explain how gRPC retries can hide and amplify this issue

Mentor hints:

- "large only" should make MTU move up your suspicion list
- overlay and encapsulation shrink effective payload headroom

## Challenge 5: Memory Pressure Without OOM Kill

Scenario: Hosts become sluggish, but containers are not being OOM-killed. Latency rises and disk IO increases.

Your task:

- explain page cache pressure, reclaim, swap behavior, and PSI
- describe what evidence would show memory contention before process death
- explain why this matters for latency-sensitive systems

Mentor hints:

- explain the chain: pressure -> reclaim -> IO -> latency
- if you wait for OOM, you are late

## Challenge 6: Nebius-Style Troubleshooting Drill

Scenario: A service is "reachable from some racks but not others." You have incomplete data, multiple possible failure domains, and pressure to speak quickly.

Your task:

- give a crisp 5-minute triage narrative
- mention at least host, rack, L3, DNS, ACL, load balancer, and service health possibilities
- explain how you avoid chasing the wrong layer first

Mentor hints:

- start with blast radius and path comparison
- do not say "network issue" without identifying which part of the path

## Challenge 7: Reverse Path And Asymmetric Routing

Your task:

- explain why forward path and return path both matter
- explain how asymmetric routing can interact badly with filtering or conntrack

Mentor hints:

- packets reaching the destination does not guarantee return traffic works the same way

## Challenge 8: TLS Handshake Delay

Your task:

- explain how DNS, TCP, certificate validation, and upstream load can all show up as "HTTPS is slow"

Mentor hints:

- use phase timing, not generic latency talk

## Challenge 9: CPU Throttling Versus Saturation

Your task:

- explain the difference between host CPU pressure and cgroup CPU throttling
- explain how you would prove each one
- explain why Kubernetes limits can create latency on an otherwise not-completely-full node

## Challenge 10: Staff-Level Linux Debug Narrative

Scenario: p50 latency is fine, p99 is terrible, packet retransmits rise slightly, node CPU is moderate, and business traffic doubled after a feature launch.

Your task:

- narrate your likely investigation order
- explain which signals are misleading here
- explain the first mitigation you might take before full diagnosis
