# Beginner: Linux And Networking

Use these prompts to build clean fundamentals and interviewer-friendly language.

## Challenge 1: Slow SSH To A Newly Created VM

Scenario: A new GCE VM is reachable, but SSH login takes 20 to 30 seconds after TCP connect. CPU and memory are low. The issue is intermittent across several hosts in one subnet.

Your task:

- list the first five checks you would run
- explain whether you suspect DNS, reverse DNS, PAM, disk, or packet loss first
- describe how you would separate network delay from host-side login delay
- name the Linux commands you would use

What the interviewer is looking for:

- structured narrowing from network to OS to auth stack
- familiarity with `ssh -vvv`, `ss`, `dig`, `journalctl`, and host logs
- awareness that slow SSH can be a name resolution or auth dependency issue, not only a network outage

## Challenge 2: One Service Can Reach The Internet, Another Cannot

Scenario: Two processes run on the same Linux node. One can reach an external API. The other gets connection timeouts. Both claim to use the same destination and port.

Your task:

- explain how namespaces, routing tables, firewall rules, proxies, and cgroup policy could cause this
- propose a debugging sequence
- explain what evidence would confirm a network namespace mismatch

Stretch follow-up:

- explain how this kind of issue can happen inside a Kubernetes node

## Challenge 3: Intermittent Packet Loss Between Two Zones

Scenario: A latency-sensitive service shows packet loss and TCP retransmits between two zones, but only during business hours.

Your task:

- explain the difference between application timeout symptoms and packet-level symptoms
- identify at least four plausible causes
- describe what host metrics, network metrics, and packet captures you would compare
- explain why MTU and fragmentation should or should not be suspected

## Challenge 4: Disk Looks Fine But The App Is Slow

Scenario: `df -h` shows free disk space, but a service has long pauses when writing logs and temp files.

Your task:

- explain why disk space alone is not enough
- describe what inode exhaustion, IO wait, filesystem latency, and noisy-neighbor disk contention would look like
- list the commands you would use next

## Challenge 5: Explain TCP To A Junior Engineer

Prompt:

- explain the TCP three-way handshake
- explain retransmissions, windowing, and why tail latency can rise before total failure
- explain what `SYN_SENT`, `ESTABLISHED`, `FIN_WAIT`, and `TIME_WAIT` mean operationally
- explain why a low-latency service still cares about connection reuse and backlog tuning

## Challenge 6: Production Debugging Warm-Up

Scenario: A host is reported as "slow." That is the only information you get.

Your task:

- describe your first 10-minute investigation plan
- include CPU, memory, swap, disk, filesystem, network, and process-level checks
- explain how you decide whether this is a host issue, an application issue, or a dependency issue

Senior answer pattern:

- start with symptom clarification
- confirm blast radius
- verify whether the host is overloaded, blocked, or waiting on something external
- use fast commands first, deep tools second
