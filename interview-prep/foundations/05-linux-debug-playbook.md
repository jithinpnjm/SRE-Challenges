# Foundations: Linux Debug Playbook For Senior SRE

This file is a practical playbook for turning vague host symptoms into a disciplined investigation.

## Mentor Mode

Your first goal is not root cause. Your first goal is orientation.

Ask:

1. Is the host busy, blocked, or waiting?
2. Is the issue local to one process or systemic?
3. Is the host itself unhealthy, or is it waiting on a dependency?
4. What changed recently: traffic, deploy, config, kernel, package, dependency?

## 10-Minute Host Triage

### Step 1: Get Orientation

```bash
hostname
date
uptime
w
```

What you are looking for:

- load average context
- whether the issue is current
- whether many users or sessions are affected

### Step 2: CPU, Memory, IO Snapshot

```bash
top
free -m
vmstat 1 5
iostat -xz 1 5
```

Interpretation hints:

- high run queue can mean CPU contention
- high wa can mean IO wait
- rising si or so can point to swap pressure
- high await can indicate storage latency

### Step 3: Process View

```bash
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
pidstat 1 5
```

What you are looking for:

- one rogue process
- many workers blocked similarly
- bursty CPU or memory behavior hidden by averages

### Step 4: Filesystem And Capacity

```bash
df -h
df -i
findmnt
```

What you are looking for:

- inode exhaustion
- bad mount or stale mount path
- wrong filesystem under a critical path

### Step 5: Network Snapshot

```bash
ss -s
ss -tanp | head -n 50
ip addr
ip route
```

What you are looking for:

- connection spikes
- lots of retransmits or strange socket states
- route or interface surprises

### Step 6: Recent Errors

```bash
journalctl -p err -n 100
dmesg | tail -n 50
```

What you are looking for:

- OOM
- disk or filesystem errors
- conntrack warnings
- NIC resets

## Symptom-To-Path Mapping

### High Load Average, Low CPU

Think about:

- blocked IO
- uninterruptible sleep
- filesystem issues
- lock contention

### App Slow, Host Calm

Think about:

- dependency latency
- DNS
- TLS handshake
- queueing in app
- remote storage or API wait

### Host Slow, No OOM

Think about:

- reclaim and memory pressure
- swap
- PSI
- page cache churn

### New Connections Fail, Old Ones Survive

Think about:

- conntrack pressure
- backlog saturation
- firewall or NAT state exhaustion

## Advanced Follow-Up Tools

Use these after you have a hypothesis:

```bash
strace -p <pid>
lsof -p <pid>
perf top
sar -n DEV,TCP,ETCP 1
tcpdump -i any host <ip>
cat /proc/pressure/cpu
cat /proc/pressure/memory
cat /proc/pressure/io
```

## Staff-Level Habit

Always finish with:

- likely failure domain
- best immediate mitigation
- evidence still missing
- prevention candidates
