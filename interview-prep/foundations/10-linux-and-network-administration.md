# Foundations: Linux Zero To Hero For SRE And Platform Engineers

Linux is the operating foundation underneath cloud instances, Kubernetes nodes, CI runners, build agents, containers, databases, and most modern infrastructure.

If Linux feels mysterious, everything above it feels harder than necessary.

This guide is designed as a complete path:

- **Beginner:** what Linux is and how to use it
- **Intermediate:** operate users, files, services, storage, and networking
- **Advanced:** understand scheduler, memory internals, cgroups, namespaces, IO pressure
- **Production SRE:** troubleshoot unhealthy hosts quickly and safely
- **Interview Level:** explain Linux clearly with senior judgment

---

# Part 1: What Linux Actually Is

Linux is often used to mean three related things:

| Term | Meaning |
|---|---|
| Linux kernel | Core software that manages CPU, memory, devices, filesystems, networking |
| GNU / userland tools | Commands such as `ls`, `cp`, `grep`, `bash`, `systemctl` |
| Distribution (distro) | Packaged operating system using Linux kernel + tools (Ubuntu, Debian, RHEL, Fedora, Alpine) |

A simple mental model:

```text
Applications
Shell / CLI tools
System libraries
Linux kernel
Hardware
```

The kernel talks to hardware and provides system calls. Applications request services through the kernel.

## Why Linux Dominates Infrastructure

- stable and efficient
- strong networking stack
- automation friendly
- container ecosystem built on Linux primitives
- runs from tiny devices to massive servers

---

# Part 2: The Terminal And File Navigation (Beginner)

## Core Navigation Commands

```bash
pwd        # where am I
ls -lah    # list files with details
cd /path   # move directory
mkdir app  # create directory
touch x.txt
cp a b
mv a b
rm file
```

## Paths Matter

| Path | Purpose |
|---|---|
| `/` | filesystem root |
| `/home` | user home directories |
| `/root` | root user home |
| `/etc` | configuration |
| `/var` | changing data/logs |
| `/tmp` | temporary files |
| `/usr/bin` | common binaries |
| `/proc` | live kernel/process virtual data |
| `/sys` | device/kernel interfaces |
| `/run` | runtime state / pid files |

## Helpful Reading Commands

```bash
cat file
less file
head file
tail -f logfile
grep pattern file
find /path -name '*.log'
```

---

# Part 3: Users, Groups, And Permissions

Linux is multi-user by design.

## Identity Commands

```bash
whoami
id
groups
sudo -l
```

## Permission Model

```text
-rwxr-x---
 owner group others
```

- `r` read
- `w` write
- `x` execute (or traverse for directories)

## Common Commands

```bash
chmod 644 file
chmod 755 script.sh
chown user:group file
ls -ld /path
namei -l /path/to/file
```

## Important Truth

A user may have file write permission but still fail if parent directory traversal is blocked.

---

# Part 4: Processes And Services

A process is a running program.

## Process Commands

```bash
ps aux
ps -ef
top
htop
pgrep -af nginx
kill -15 PID
kill -9 PID
```

## Signals

| Signal | Meaning |
|---|---|
| TERM (15) | graceful stop |
| KILL (9) | force stop |
| HUP | reload config in some apps |
| INT | interrupt |

Use `kill -9` only when graceful stop fails.

## systemd (Modern Service Manager)

```bash
systemctl status nginx
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl enable nginx
journalctl -u nginx -n 100 --no-pager
```

systemd supervises services, restarts failures, tracks logs, manages boot targets.

---

# Part 5: CPU, Scheduling, And Load

CPU time is finite. The scheduler decides who runs next.

## Core Commands

```bash
uptime
top
mpstat -P ALL 1 5
vmstat 1 5
```

## Understand Load Average

Load average is not CPU percentage. It roughly represents runnable or uninterruptible tasks waiting for CPU or resources.

Examples:

- High load + high CPU = compute saturation
- High load + low CPU = often IO wait or lock contention

## Nice Levels

```bash
nice -n 10 command
renice 5 -p PID
```

Used to influence scheduling priority.

---

# Part 6: Memory Internals (Intermediate → Advanced)

RAM is used for:

- process memory
- page cache
- kernel structures
- buffers

## Commands

```bash
free -m
cat /proc/meminfo
vmstat 1 5
```

## Important Concepts

## Page Cache

Linux uses free RAM to cache disk reads. High memory usage is not automatically bad.

## Swap
nOverflow memory on disk. Prevents crashes but can severely hurt latency.

## OOM Killer

When memory is exhausted and recovery fails, Linux may kill processes.

Check:

```bash
dmesg | grep -i oom
journalctl -k | grep -i oom
```

## PSI Metrics (Modern Pressure Signals)

```bash
cat /proc/pressure/cpu
cat /proc/pressure/memory
cat /proc/pressure/io
```

Shows time spent stalled under pressure.

---

# Part 7: Storage, Filesystems, Inodes

## Core Commands

```bash
df -h
df -i
du -sh /var/*
lsblk
findmnt
mount
```

## Bytes vs Inodes

A disk can have free bytes but no inodes left (too many files).

## Deleted But Still Full

```bash
lsof +L1
```

If a process still holds a deleted file open, space remains allocated.

## Filesystems You Should Know

- ext4
- xfs
- tmpfs
- overlayfs (containers)

---

# Part 8: Networking On Linux

Linux hosts are network participants.

## Core Commands

```bash
ip addr
ip route
ip neigh
ss -lntp
ss -tanp
ping host
dig example.com
curl -vk https://example.com
```

## Concepts

- interface = NIC
- route = where packets go next
- port = application door
- socket = communication endpoint
- DNS = name to IP lookup

## Common Truth

DNS success does not guarantee TCP success.

---

# Part 9: Boot, Logs, And Runtime State

## Boot / Kernel Messages

```bash
dmesg | tail -50
journalctl -b
journalctl -p err -n 100
```

## Runtime State

```bash
/run
/var/run
```

Often stores sockets, PID files, temporary service state.

---

# Part 10: Linux Internals Powering Containers

Containers are not tiny VMs.

They mainly rely on Linux primitives.

## Namespaces

Isolation for:

- PID
- network
- mount
- user
- IPC
- hostname

## cgroups

Resource control for:

- CPU
- memory
- IO
- pids

## Why This Matters

Kubernetes issues often begin as Linux node issues.

---

# Part 11: 10-Minute Production Triage Routine

## 1. Orient

```bash
hostname
date
uptime
whoami
w
```

## 2. CPU / Memory / IO

```bash
top
free -m
vmstat 1 5
iostat -xz 1 5
```

## 3. Processes

```bash
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
```

## 4. Disk

```bash
df -h
df -i
lsof +L1
```

## 5. Network

```bash
ip route
ss -s
ss -lntp
```

## 6. Errors

```bash
journalctl -p err -n 100
dmesg | tail -50
```

---

# Part 12: Real Incident Stories

## Host Slow But CPU Low

Likely causes:

- IO wait
- lock contention
- network dependency wait
- swap thrash

## Disk Full After Log Delete

Likely cause:

- deleted file still open

## SSH Login Slow

Likely causes:

- reverse DNS delay
- LDAP/PAM slowness
- host pressure

## Service Running But Unreachable

Likely causes:

- bound to localhost only
- firewall/policy
- wrong route

---

# Part 13: Linux + Kubernetes Connection

- kubelet = host service
- container runtime = Linux process manager + namespaces/cgroups
- node pressure = Linux CPU/memory/disk issues
- CNI = Linux networking concepts at scale
- persistent volumes = Linux storage underneath

---

# Part 14: Interview Questions You Must Answer

- Why can load average be high while CPU is idle?
- Why can memory look full but system be healthy?
- Why does deleting a log not free space immediately?
- Why can a process run but not accept traffic?
- How do cgroups help containers?

---

# Part 15: Labs To Build Real Skill

## Beginner

- create users/groups
- change permissions
- navigate filesystem quickly

## Intermediate

- create and manage a systemd service
- debug port listening issues
- rotate logs

## Advanced

- simulate memory pressure
- inspect PSI metrics
- analyze IO wait
- inspect namespaces/cgroups

---

# Part 16: Senior Answer Shape

> I first classify whether the issue is local to a process, host-wide, or external dependency related. Then I gather fast evidence across CPU, memory, IO, disk, sockets, routes, and recent errors. I avoid random restarts until I understand whether I’m dealing with compute pressure, storage pressure, policy misconfiguration, or dependency latency.

---

# Recall Prompts

- What is the difference between kernel and distro?
- Why can high memory usage be healthy?
- What causes high load with low CPU?
- Why does `lsof +L1` matter?
- Why are containers fundamentally Linux features?
