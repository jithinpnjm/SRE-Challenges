# Foundations: Linux And Network Administration For Senior SRE

This guide is meant to be useful in an interview and useful on a bad production day.

The older version of this file was too light. It named areas and commands, but it did not teach a strong enough way to think. This version is the practical layer: what matters, how to reason, what to run first, and what a senior answer should sound like.

## What This Foundation Must Help You Do

By the time you finish this file, you should be better at:

- triaging a sick Linux host without panicking
- choosing the right command based on the symptom
- reasoning about permissions, storage, processes, systemd, DNS, routing, and sockets together
- speaking like an operator in interviews instead of listing random commands
- connecting Linux foundations to Kubernetes and cloud troubleshooting

## Mentor Mode

Linux is not a trivia topic. It is your control surface.

When a host or service is unhealthy, your job is not to remember the maximum number of commands. Your job is to reduce uncertainty quickly and safely.

### The Right Starting Questions

Always start with:

1. What exactly is failing?
2. Is the problem user-facing, service-facing, or host-wide?
3. Is the host busy, blocked, or waiting?
4. Is this process, filesystem, memory, network, or dependency related?
5. What changed recently?

### The Wrong Starting Pattern

Do not do this:

- restart the service immediately
- change permissions blindly
- run `kill -9` before you know what you are killing
- assume “host slow” means CPU
- assume “connection failed” means firewall

### The Senior Pattern

A senior Linux answer sounds like this:

“I’d first classify whether the issue is local to the process, local to the host, or outside the host. Then I’d take a fast snapshot of CPU, memory, IO, disk, sockets, routes, and recent errors. I want to know whether I’m dealing with compute pressure, storage pressure, dependency wait, or policy misconfiguration before I touch the service.”

## The 10-Minute Linux Triage Routine

This is the first-pass flow I want you to internalize.

### Step 1: Orient Yourself

```bash
hostname
date
uptime
w
whoami
```

Why this matters:

- confirms you are on the expected host
- shows whether the issue is current
- gives load average context
- tells you whether other users are affected

### Step 2: Check CPU, Memory, And IO

```bash
top
free -m
vmstat 1 5
```

If available:

```bash
iostat -xz 1 5
pidstat 1 5
```

How to think:

- high load average with low CPU can mean blocked IO or lock contention
- memory pressure may exist before an OOM
- swap activity matters even when the box is not technically “out of memory”
- averages hide bursts, so repeated samples are better than one glance

### Step 3: Look At The Noisiest Processes

```bash
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
pgrep -af sshd
```

What you are trying to learn:

- is one process dominating
- is there a fork bomb or worker explosion
- is the service process even present
- is the symptom local to one service or system-wide

### Step 4: Check Storage And Mounts

```bash
df -h
df -i
findmnt
lsblk
```

If disk still looks wrong after deletes:

```bash
lsof +L1
```

Why this matters:

- full disk and full inode conditions look similar to users
- wrong mount or stale mount causes weird failures
- deleted-but-open files can keep disk full

### Step 5: Check Network State

```bash
ip addr
ip route
ss -s
ss -lntp
ss -tanp | head -n 50
resolvectl status
dig example.com
```

How to think:

- interface down is different from route wrong
- DNS wrong is different from TCP blocked
- service not listening is different from service listening on the wrong address

### Step 6: Look For Recent Errors

```bash
journalctl -p err -n 100 --no-pager
dmesg | tail -n 50
```

Watch for:

- OOM killer
- disk or filesystem errors
- network driver resets
- conntrack issues
- read-only remount behavior

## The Core Linux Areas You Must Own

## Filesystem Layout And Why It Matters

You should know what to expect in:

- `/etc`
- `/var`
- `/var/log`
- `/proc`
- `/sys`
- `/run`
- `/tmp`
- `/usr/bin`
- `/usr/sbin`
- `/home`
- `/root`

Interview meaning:

- `/etc` tells me config
- `/var/log` tells me evidence
- `/proc` tells me process and kernel state
- `/run` tells me runtime files and pids
- `/tmp` and `/var/tmp` tell me ephemeral behavior

Useful commands:

```bash
ls -lah /etc
find /etc -name '*.conf'
find /var/log -type f | head
cat /proc/meminfo | head
cat /proc/loadavg
```

## Permissions, Ownership, And Identity

This is one of the most repeated topics in Linux interviews because real incidents often turn into access-control mistakes.

Essential commands:

```bash
ls -l
ls -ld /path /path/to/file
chmod 640 file
chmod 755 script.sh
chown user:group file
id
groups username
getent passwd username
getent group groupname
sudo -l
umask
namei -l /path/to/file
```

Key concepts:

- file read/write/execute and directory traversal are different
- write access to a file is not enough if directory traversal is blocked
- group-based fixes are usually safer than broad `777` style changes
- permission denied can also mean mount policy, SELinux, or missing parent directory access

### Mini Scenario: User Can Read But Not Edit

Think:

1. does the user own the file
2. does the user have write bit
3. is the parent directory writable or traversable
4. is there ACL or policy interference

Commands:

```bash
ls -ld /path /path/to/file
id
namei -l /path/to/file
```

## Processes, Signals, And Systemd

You need to move between process view and service view without confusion.

Commands:

```bash
ps aux
ps -ef
top
pgrep -af nginx
kill -15 PID
kill -9 PID
systemctl status nginx
systemctl list-units --type=service
systemctl show nginx
journalctl -u nginx -n 200 --no-pager
```

### How To Think

Do not ask only:

- “is the process up?”

Also ask:

- is it healthy
- is it ready to serve traffic
- is it flapping
- is systemd restarting it repeatedly
- is it blocked on config, socket bind, disk, secrets, or dependency

### Signal Discipline

- `kill -15` is polite and allows cleanup
- `kill -9` is force and should be used when graceful stop is not working or not possible

If you say “I’d just kill -9 it” in an interview, that usually sounds careless.

## Storage, Mounts, Inodes, And LVM

This area matters because storage problems produce some of the most confusing production symptoms.

Commands:

```bash
df -h
df -i
du -sh /var/*
mount
findmnt
lsblk
blkid
cat /etc/fstab
lsof +L1
```

### What Interviewers Want To Hear

- difference between disk space and inode exhaustion
- how mounts can hide or replace expected paths
- how deleted-open files keep space allocated
- how to reason about block device to filesystem to mount point

### LVM Mental Model

You should understand:

1. physical volume
2. volume group
3. logical volume
4. filesystem on top
5. mount point using the filesystem

This is especially useful when explaining how cloud block storage maps to Linux.

### Mini Scenario: Disk Still Full After Log Delete

Think:

- was the file deleted while still open
- did inode exhaustion trick me
- is another process recreating the file

Commands:

```bash
df -h
df -i
lsof +L1
du -sh /var/log/*
```

## Network Administration On Linux Hosts

This is the bridge between host troubleshooting and cloud/Kubernetes troubleshooting.

Commands:

```bash
ip addr
ip route
ip neigh
ss -lntp
ss -tanp
ss -s
dig example.com
nslookup example.com
curl -v https://example.com
ping host
traceroute host
tracepath host
tcpdump -i any port 443
```

### What You Must Be Able To Explain

- interface state
- local routes
- default route
- local listening ports
- established versus waiting connections
- DNS resolver behavior
- whether failure is name resolution, transport, or application

### Mini Scenario: SSH Is Slow

This is one of the best examples of Linux plus networking plus system design thinking.

Do not just say “check network.”

Think:

1. can I reach the IP quickly
2. is forward DNS or reverse DNS slow
3. is TCP handshake slow
4. is auth slow because of PAM, LDAP, or key lookup
5. is the host overloaded

Commands:

```bash
time ssh -vvv user@host
dig target-host
getent hosts target-host
ss -tanp | grep ':22'
journalctl -u sshd -n 100 --no-pager
vmstat 1 5
```

## The Linux Command Clusters You Should Drill

### Host Identity And Time

```bash
hostname
hostnamectl
date
timedatectl
whoami
who
w
```

### File And Search Workflow

```bash
pwd
ls -lah
find /path -type f -name '*.log'
grep -R 'pattern' /etc
sed -n '1,120p' file
less file
tail -f /var/log/syslog
```

### Resource Checks

```bash
free -m
vmstat 1 5
ulimit -n
cat /proc/meminfo
cat /proc/pressure/cpu
cat /proc/pressure/memory
cat /proc/pressure/io
```

### Sockets And Connectivity

```bash
ss -lntp
ss -tanp
lsof -i :443
dig service.example.com
curl -vk https://service.example.com
```

## Interview Scenarios You Should Be Able To Answer

1. User can `ls` the file but cannot edit it.
2. Service is running but unreachable.
3. Host is slow but CPU is not maxed.
4. Disk is full even after deleting logs.
5. `/tmp` behaves strangely and writes fail.
6. SSH login is very slow.
7. A config file was deleted accidentally.
8. New connections fail but old ones continue.

### Example Senior Answer Shape

If asked, “How would you troubleshoot a slow Linux host?” a strong answer is:

“First I’d decide whether the problem is host-wide or isolated to one process. I’d gather a fast snapshot with `uptime`, `top`, `free -m`, `vmstat`, and if available `iostat`, because I want to separate CPU saturation from IO wait and memory pressure. Then I’d look at the top offenders with `ps` or `pidstat`, validate disk and inode state with `df -h` and `df -i`, and inspect recent kernel or service errors with `journalctl` and `dmesg`. If the host looks calm, I’d shift to dependency or network latency rather than assuming local compute pressure.” 

That sounds much better than a random command dump.

## How This Connects To Kubernetes

Kubernetes does not remove Linux foundations. It depends on them.

You need Linux reasoning to understand:

- kubelet behavior
- container runtime issues
- node pressure
- cgroups and namespaces
- DNS and socket failures on nodes
- mount and filesystem issues affecting pods

If your Linux base is weak, your Kubernetes troubleshooting ceiling stays low.

## Best Companion Files

Read with this:

- [05-linux-debug-playbook.md](05-linux-debug-playbook.md)
- [03-bash-and-shell-scripting.md](03-bash-and-shell-scripting.md)
- [26-devops-troubleshooting-and-security-errors.md](26-devops-troubleshooting-and-security-errors.md)
