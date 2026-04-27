# Foundations: Linux And Network Administration For Senior SRE

This guide is meant to be useful in an interview and useful on a bad production day.

Linux is not a trivia topic. It is your control surface.

---

## What This Foundation Must Help You Do

By the time you finish this file, you should be better at:

- triaging a sick Linux host without panicking
- choosing the right command based on the symptom
- reasoning about permissions, storage, processes, systemd, DNS, routing, and sockets together
- speaking like an operator in interviews instead of listing random commands
- connecting Linux foundations to Kubernetes and cloud troubleshooting

---

## Memory Palace: The Linux Host Is A Hospital

Use this model to remember Linux under pressure.

| Linux concept | Hospital analogy | Production meaning |
|---|---|---|
| CPU | Doctors actively treating patients | Active compute work |
| Memory | Beds and active charts | Working set / RAM |
| Swap | Overflow hallway beds | Emergency slow memory |
| Disk | Storage rooms | Persistent capacity |
| Inodes | Numbered shelves/labels | File-count capacity |
| Processes | Patients/procedures | Running workloads |
| systemd | Hospital operations manager | Service supervisor |
| journalctl | Incident logbook | Service/system logs |
| DNS | Reception desk directory | Name resolution |
| NIC | Ambulance bay | Network interface |
| Routes | Hallway map | Packet forwarding path |
| Permissions | Staff badge access | Authorization |

### Story: The Hospital Feels Slow

A junior operator says: “Doctors are slow.”

A senior operator asks:

- Are doctors busy or waiting on elevators?
- Are beds full?
- Is the pharmacy reachable?
- Are storage rooms full?
- Did maintenance change a locked door?

Technical translation:

- High load with low CPU can mean IO wait or blocked threads.
- Swap can hurt latency before total exhaustion.
- Full disks and inode exhaustion break normal workflows.
- Dependency failures can look like local slowness.

---

## The Senior Pattern

A senior Linux answer sounds like this:

> I’d first classify whether the issue is local to the process, local to the host, or outside the host. Then I’d take a fast snapshot of CPU, memory, IO, disk, sockets, routes, and recent errors. I want evidence before I change the system.

---

## The 10-Minute Linux Triage Routine

## 1. Orient Yourself

```bash
hostname
date
uptime
w
whoami
```

Use this to verify host, time, load context, and who else is impacted.

## 2. CPU, Memory, IO

```bash
top
free -m
vmstat 1 5
iostat -xz 1 5
```

Interpretation:

- high `wa` in vmstat => storage wait
- high load + idle CPU => blocked work
- swap in/out => memory pressure

## 3. Noisy Processes

```bash
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
pidstat 1 5
```

Find runaway workers, leaks, fork storms, or one dominant process.

## 4. Storage And Mounts

```bash
df -h
df -i
findmnt
lsblk
lsof +L1
```

Interpretation:

- bytes full != inode full
- deleted-open files still consume space
- wrong mount can hide expected data

## 5. Network State

```bash
ip addr
ip route
ss -s
ss -lntp
dig example.com
```

Interpretation:

- DNS failure != TCP failure
- listening on localhost != reachable remotely
- no route != blocked firewall

## 6. Recent Errors

```bash
journalctl -p err -n 100 --no-pager
dmesg | tail -50
```

Look for OOM, remount read-only, driver resets, conntrack, filesystem errors.

---

## Real Incident Stories

## Scenario 1: Disk Still Full After Log Cleanup

Wrong assumption: cleanup failed.

Better path:

```bash
df -h
df -i
lsof +L1
```

Likely cause: deleted file still held open by process.

Mitigation: restart or rotate the owning process safely.

## Scenario 2: SSH Is Slow

Wrong assumption: network issue.

Better path:

```bash
time ssh -vvv user@host
dig target-host
journalctl -u sshd -n 50
vmstat 1 5
```

Likely causes:

- reverse DNS delay
- PAM / LDAP latency
- host pressure

## Scenario 3: Service Running But Unreachable

Wrong assumption: app bug.

Better path:

```bash
systemctl status nginx
ss -lntp
curl -vk localhost:PORT
ip route
```

Likely causes:

- bound only to 127.0.0.1
- local firewall / policy
- upstream dependency issue

---

## Linux To Kubernetes Connection

Kubernetes does not remove Linux foundations. It depends on them.

- kubelet is a host service
- container runtime uses Linux namespaces/cgroups
- node pressure starts as CPU, memory, disk, or inode pressure
- pod DNS depends on node networking and resolvers
- mounts and filesystems affect pods directly

If Linux is weak, Kubernetes troubleshooting has a low ceiling.

---

## Hands-On Drill

Simulate disk pressure:

```bash
fallocate -l 2G bigfile
 df -h
 rm bigfile
```

Then keep a file open with `tail -f` in another shell and observe why space may not return immediately.

---

## Interview Answer Shape

> First I’d determine whether the symptom is host-wide or isolated. Then I’d gather fast signals with uptime, top, free, vmstat, and disk/network checks to separate compute, memory, storage, network, and dependency causes. I’d avoid restarts until I had evidence for a safe mitigation.

---

## Recall Prompts

- In the hospital model, what is swap?
- What does high load with low CPU often suggest?
- Which command separates byte exhaustion from inode exhaustion?
- Why can a service run but still be unreachable?

---

## Best Companion Files

- Linux debug playbook
- Networking fundamentals
n- DevOps troubleshooting and security errors
