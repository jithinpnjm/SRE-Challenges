# Beginner: Linux And Networking

Use this file to build the kind of clarity that later supports senior answers. Even at beginner level, think in flows, phases, and evidence.

## Mentor Mode

When a Linux or networking symptom appears, use this sequence:

1. restate the symptom in plain language
2. identify the request or process flow
3. locate where in the flow the symptom first appears
4. compare a healthy path with an unhealthy path
5. choose commands that disambiguate one layer at a time

Useful first commands:

```bash
hostname
uptime
w
top
free -m
vmstat 1 5
df -h
df -i
ip addr
ip route
ss -tanp
dig example.com
curl -v https://example.com
journalctl -xe
```

## What Interviewers Are Testing

- do you understand packets, processes, sockets, and filesystems as real things
- can you move from vague symptoms to concrete checks
- can you avoid random command spraying
- can you explain what a command is intended to prove

## Challenge 1: Slow SSH To A Newly Created VM

Scenario: A new GCE VM is reachable, but SSH login takes 20 to 30 seconds after TCP connect. CPU and memory are low. The issue is intermittent across several hosts in one subnet.

Your task:

- list the first five checks you would run
- explain whether you suspect DNS, reverse DNS, PAM, disk, or packet loss first
- describe how you would separate network delay from host-side login delay
- name the Linux commands you would use

Mentor hints:

- think in SSH phases: DNS, TCP connect, SSH negotiation, authentication, shell startup
- `time ssh host true` helps isolate shell startup from raw connection time
- `ssh -vvv` tells you roughly which phase is slow
- reverse DNS and PAM lookups can surprise people here

Useful commands:

```bash
ssh -vvv user@host
time ssh user@host true
dig host
dig -x <server-ip>
ss -tanp | grep :22
journalctl -u sshd
tcpdump -i any port 22
```

What strong answers include:

- phase-by-phase reasoning
- one fast disambiguating check per theory
- understanding that "reachable" does not mean "healthy login path"

## Challenge 2: One Service Can Reach The Internet, Another Cannot

Scenario: Two processes run on the same Linux node. One can reach an external API. The other gets connection timeouts. Both claim to use the same destination and port.

Your task:

- explain how namespaces, routing tables, firewall rules, proxies, and cgroup policy could cause this
- propose a debugging sequence
- explain what evidence would confirm a network namespace mismatch

Mentor hints:

- same node does not guarantee same namespace or same environment
- compare process environment, namespace membership, routes, and socket state
- a timeout suggests a different class of failure than connection refused

Useful commands:

```bash
ps aux
lsns
nsenter --target <pid> --net ip addr
nsenter --target <pid> --net ip route
ss -tanp
env
curl -v https://target.example.com
```

Stretch follow-up:

- explain how this kind of issue can happen inside a Kubernetes node

## Challenge 3: Intermittent Packet Loss Between Two Zones

Scenario: A latency-sensitive service shows packet loss and TCP retransmits between two zones, but only during business hours.

Your task:

- explain the difference between application timeout symptoms and packet-level symptoms
- identify at least four plausible causes
- describe what host metrics, network metrics, and packet captures you would compare
- explain why MTU and fragmentation should or should not be suspected

Mentor hints:

- business-hours-only often means load, contention, or traffic-shape correlation
- retransmits can hurt p99 before average latency looks terrible
- compare healthy zone pair and unhealthy zone pair

Useful commands:

```bash
ss -s
sar -n DEV,TCP,ETCP 1
mtr -rw target
tcpdump -i any host <target-ip>
```

## Challenge 4: Disk Looks Fine But The App Is Slow

Scenario: `df -h` shows free disk space, but a service has long pauses when writing logs and temp files.

Your task:

- explain why disk space alone is not enough
- describe what inode exhaustion, IO wait, filesystem latency, and noisy-neighbor disk contention would look like
- list the commands you would use next

Mentor hints:

- "space free" is not the same as "storage healthy"
- remember `df -i`
- think about await, utilization, page cache pressure, and overlay filesystem effects

Useful commands:

```bash
df -h
df -i
iostat -xz 1 5
vmstat 1 5
findmnt
du -sh /var/log/* | sort -h | tail
```

## Challenge 5: Explain TCP To A Junior Engineer

Prompt:

- explain the TCP three-way handshake
- explain retransmissions, windowing, and why tail latency can rise before total failure
- explain what `SYN_SENT`, `ESTABLISHED`, `FIN_WAIT`, and `TIME_WAIT` mean operationally
- explain why a low-latency service still cares about connection reuse and backlog tuning

Mentor hints:

- do not explain TCP like a textbook
- explain what operators see when a system is unhealthy
- relate socket states to incident symptoms

## Challenge 6: Production Debugging Warm-Up

Scenario: A host is reported as "slow." That is the only information you get.

Your task:

- describe your first 10-minute investigation plan
- include CPU, memory, swap, disk, filesystem, network, and process-level checks
- explain how you decide whether this is a host issue, an application issue, or a dependency issue

Mentor hints:

- first decide if the host is busy, blocked, or mostly waiting
- compare top CPU and memory consumers with system-wide symptoms
- if host metrics look calm, think dependency or application queueing

Senior answer pattern:

- start with symptom clarification
- confirm blast radius
- verify whether the host is overloaded, blocked, or waiting on something external
- use fast commands first, deep tools second

## Challenge 7: Explain DNS Like An Operator

Your task:

- explain the path from application call to resolver to authoritative answer
- explain what TTL means operationally
- explain how stale caches or broken `/etc/resolv.conf` can hurt production

Mentor hints:

- good DNS answers can still be too slow
- fast answers can still be wrong

## Challenge 8: Firewall Versus Routing

Your task:

- explain how you tell apart "no route," "filtered," "connection refused," and "timeout"
- explain what each symptom suggests

Mentor hints:

- connect refused usually implies reachability to the host
- timeout often points to drop, deep stall, or one-way path issues

## Challenge 9: Linux Command Drill

For each command, explain what problem it helps with and one misuse to avoid:

- `ss`
- `ip route`
- `lsof`
- `strace`
- `journalctl`
- `tcpdump`
- `vmstat`
- `iostat`

## Challenge 10: Explain The Internet Path For One Request

Prompt:

- start from a browser hitting `https://service.example.com`
- walk through DNS, TCP, TLS, load balancer, reverse proxy, app, and database
- identify where latency can hide at each step

Mentor hints:

- this is one of the best foundational drills in the entire pack
- if you can narrate the path, you can usually troubleshoot the path
