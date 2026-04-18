# Linux Debug Playbook

## What It Is and Why It Matters

When a production host or service is behaving abnormally, you need a systematic approach: observe, hypothesize, test, interpret. Random command execution wastes time and can make problems worse.

This playbook gives you the exact command sequences and interpretation patterns for the most common Linux production scenarios: high load, slow service, disk full, memory pressure, network problems, and process debugging. Master this, and you can diagnose most incidents in under 10 minutes.

---

## Mental Model: Orient Before You Act

Before running any command, answer three questions:

1. **What is the symptom?** (high load? slow response? disk full? OOM?)
2. **When did it start?** (sharp transition = something changed; gradual = trend)
3. **What changed recently?** (deploy? config? traffic? time-based event?)

Then work **top-down**: system → resources → processes → code.

---

## The 60-Second System Overview

When you land on an unfamiliar or misbehaving host:

```bash
# 1. Uptime and load average
uptime
# 10:23:45 up 45 days, load average: 12.34, 8.56, 4.32
# Load average: 1-min, 5-min, 15-min
# On a 4-core system: load > 4.0 = overloaded
# Trend: 1-min > 15-min = getting worse; 1-min < 15-min = recovering

# 2. Who is logged in and what are they doing
w
# or last (who logged in recently)

# 3. CPU snapshot
top -bn1 | head -20
# or: mpstat -P ALL 1 3   (per-CPU breakdown)

# 4. Memory
free -h
# Columns: total, used, free, shared, buff/cache, available
# "available" = what processes can actually allocate (most meaningful)

# 5. Disk usage
df -h
# Check / and /var — these fill most often
df -i   # inode usage (can be 100% even with disk space free)

# 6. IO
iostat -xz 1 3
# Key columns: %util (how busy), await (latency ms), r/s and w/s (throughput)

# 7. Network
ss -s   # socket statistics summary
netstat -s | grep -E "retransmit|failed|error"

# 8. Kernel messages (recent hardware/driver errors)
dmesg | tail -30
journalctl -p err -n 30

# 9. Running processes sorted by CPU
ps aux --sort=-%cpu | head -15

# 10. Running processes sorted by memory
ps aux --sort=-%mem | head -15
```

---

## CPU Debugging

### High Load Average

Load average counts threads in R (running) + D (uninterruptible sleep/IO wait) state. High load + low CPU = IO wait or lock contention, not CPU pressure.

```bash
# Step 1: Check if it's CPU or IO
vmstat 1 5
# Column "r": run queue (threads waiting for CPU)
# Column "b": blocked on IO
# Column "wa": CPU time spent waiting for IO (%)
# If wa > 20%: IO is the bottleneck, not CPU

# Step 2: If CPU is high, find the culprit
top
# Press 1 for per-CPU breakdown
# Press P to sort by CPU
# Look at: %us (user), %sy (system), %wa (IO wait), %si (software interrupt)

# Step 3: Find CPU-heavy processes
pidstat -u 1 5    # per-process CPU with command names
ps aux --sort=-%cpu | head -10

# Step 4: Profile the process (what is it spending CPU on?)
perf top -p <pid>               # live profiling (requires perf)
perf record -g -p <pid> sleep 30
perf report                      # flame graph input

# Step 5: Check for CPU throttling (containerized workloads)
cat /sys/fs/cgroup/cpu/docker/<container-id>/cpu.stat
# nr_throttled: how many times CPU was throttled
# throttled_time: total ns spent throttled
```

### D-State Processes (Uninterruptible Sleep)

Processes in D state are waiting on kernel IO. They cannot be killed with SIGKILL. High count of D-state processes = IO bottleneck.

```bash
# Find D-state processes
ps aux | awk '$8 == "D" {print}'
# or
top   # press H for threads, look for D in the STAT column

# Check what they're waiting on
cat /proc/<pid>/wchan    # kernel wait function
# futex_wait: waiting on a mutex/semaphore
# do_sys_poll: waiting on select/poll
# ext4_file_write_iter: waiting on ext4 IO

# Check IO stats
iostat -xz 1 5
# If await is high (> 50ms): disk is saturated or has hardware issues

# Find which process is doing the most IO
iotop -o -b -n 3
# or
pidstat -d 1 5    # per-process disk IO
```

---

## Memory Debugging

### Memory Pressure

```bash
# Step 1: Check memory overview
free -h
# "available" is what matters — how much can new processes allocate

# Step 2: Check what's using memory
ps aux --sort=-%mem | head -15
# VSZ: virtual memory size (includes mapped but not yet used)
# RSS: resident set size (actually in RAM)

# Step 3: Check for swap activity
vmstat 1 5
# si (swap in) + so (swap out) > 0 = swap is being used
# Active swapping = major performance problem

# Step 4: Check slab cache (kernel memory)
cat /proc/slabinfo | head -10
slabtop    # interactive slab memory viewer

# Step 5: Check OOM killer history
dmesg | grep -i "oom\|killed"
# Shows which process was OOM killed and why

# Step 6: Check process memory over time
while true; do
  ps aux --sort=-%mem | head -5
  echo "---"
  sleep 10
done
# If RSS keeps growing: memory leak
```

### Memory Leak Investigation

```bash
# Track memory usage over time for a specific process
watch -n 5 "cat /proc/<pid>/status | grep -E 'VmRSS|VmSize'"

# smaps for detailed memory breakdown
cat /proc/<pid>/smaps | awk '/^[0-9a-f]/{addr=$1} /^Rss/{rss+=$2} END{print rss "kB RSS"}'

# Python: use tracemalloc
python3 -c "
import tracemalloc
tracemalloc.start()
# ... run the code that leaks ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
"

# Go: use pprof
curl http://localhost:6060/debug/pprof/heap > heap.out
go tool pprof heap.out
# Inside pprof: top10, web (flame graph)
```

---

## Disk Debugging

### Disk Full

```bash
# Step 1: Find what's full
df -h    # which filesystem

# Step 2: Find large directories
du -sh /var/log/*   # common culprit: logs
du -sh /var/lib/docker/*  # Docker data
du -sh /tmp/*

# Or find large files
find / -xdev -size +1G -ls 2>/dev/null
# -xdev: don't cross filesystem boundaries

# Step 3: Check for deleted-but-open files (common gotcha!)
# When a process opens a file and another process deletes it,
# the file is "deleted" but still occupies space until all file handles are closed
lsof +L1 | grep deleted
# Shows: process, PID, file name (deleted), size
# Fix: restart the process to release the file handle

# Step 4: Check log sizes
ls -lh /var/log/*.log
journalctl --disk-usage

# Rotate logs manually if needed
logrotate -f /etc/logrotate.d/syslog

# Truncate a log without deleting (safe if process is still writing)
: > /var/log/myapp.log   # truncate to zero
# or
truncate -s 0 /var/log/myapp.log
```

### Inode Exhaustion

Disk appears to have space but can't create files — inode table is full.

```bash
df -i    # check inode usage (Use% column)

# Find directories with most files
find / -xdev -printf '%h\n' 2>/dev/null | sort | uniq -c | sort -rn | head -20

# Common culprit: /tmp or session files, small files from mail queue, npm packages
ls /tmp | wc -l

# Fix: delete unnecessary small files in the directory with highest inode count
```

---

## Network Debugging

### High Network Latency or Packet Loss

```bash
# Step 1: Basic connectivity test
ping -c 10 <target>    # check latency and packet loss

# Step 2: Path tracing
traceroute <target>
mtr <target>   # real-time traceroute with statistics (more useful)

# Step 3: Check network interface stats
ip -s link show eth0
# Errors in TX/RX? Dropped packets? → hardware or driver issue

# Step 4: Check TCP retransmissions
netstat -s | grep -i retransmit
# ss -s also shows some stats

# Step 5: Check conntrack table
sysctl net.netfilter.nf_conntrack_count   # current entries
sysctl net.netfilter.nf_conntrack_max     # limit
# If count == max: new connections fail
# Fix: increase limit or investigate conntrack leak

# Step 6: Check bandwidth usage
iftop -i eth0    # per-connection bandwidth
sar -n DEV 1 5   # network interface stats over time

# Step 7: Capture traffic for analysis
tcpdump -i eth0 -n host <target-ip> -w /tmp/capture.pcap
# Analyze with wireshark or:
tcpdump -r /tmp/capture.pcap -n | head -50
```

### Port Not Reachable

```bash
# Step 1: Is anything listening on that port?
ss -tlnp | grep <port>    # listening TCP
ss -ulnp | grep <port>    # listening UDP
# If nothing: service isn't running

# Step 2: Can we connect locally?
curl http://localhost:<port>/health
nc -zv localhost <port>
# If works locally but not remotely: firewall/security group issue

# Step 3: Check iptables
iptables -L -n -v | grep <port>
iptables -t nat -L -n -v   # NAT table (for container forwarding)

# Step 4: For Kubernetes services
kubectl get svc <service> -n <namespace>   # what port is the service on?
kubectl get endpoints <service> -n <namespace>  # are there pods behind it?
```

---

## Process Debugging

### Strace — System Call Tracing

```bash
# Trace all syscalls of a process
strace -p <pid>

# Filter to specific syscalls
strace -p <pid> -e trace=network    # only network calls
strace -p <pid> -e trace=file       # only file operations
strace -p <pid> -e trace=read,write # only reads and writes

# Trace with timing (show duration of each syscall)
strace -T -p <pid>

# Trace a new process from the start
strace -T -o strace.out ./myprogram

# Common patterns:
# poll([{fd=5}], 1, 5000) = 0 (timeout)   → waiting on socket that never sends data
# read(5, "", 4096) = 0                    → EOF on socket (connection closed by remote)
# write(1, "...", N) = N                   → writing output
# futex(0x..., FUTEX_WAIT_PRIVATE, ...) = -1 ETIMEDOUT  → lock timeout
# open("/etc/passwd", O_RDONLY) = -1 ENOENT  → file not found
```

### lsof — Open Files and Network Connections

```bash
# All files opened by a process
lsof -p <pid>

# What process is using a port
lsof -i :<port>
lsof -i TCP:443

# All network connections for a process
lsof -i -p <pid>

# Files deleted but still open (consuming disk space)
lsof +L1

# All files opened by processes of a user
lsof -u username
```

### gdb — Process Inspection

```bash
# Attach to running process
gdb -p <pid>
# Inside gdb:
# (gdb) backtrace    → show call stack
# (gdb) info threads → list all threads
# (gdb) thread 3     → switch to thread 3
# (gdb) bt           → thread's backtrace
# (gdb) quit

# Non-interruptive backtrace (doesn't pause process long)
gdb -batch -ex "thread apply all bt" -p <pid> 2>/dev/null
```

---

## Scenario: Service Slow, No Obvious Cause

Full investigation sequence:

```bash
# 1. Orient
uptime           # load average
w                # who's logged in
date             # what time is it (for log correlation)

# 2. Resources
vmstat 1 5       # CPU, IO, swap — check "wa" column
free -h          # memory available
df -h            # disk space
iostat -xz 1 3   # IO latency and throughput

# 3. Identify likely culprit
# High wa? → IO problem
# High CPU? → CPU contention
# Low memory + swap? → memory pressure causing swapping
# Disk full? → writes failing

# 4. Find the process
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10
iotop -o -b -n 3   # if IO problem

# 5. Investigate the process
pid=<PID>
strace -c -p $pid sleep 5    # summary of syscall distribution
lsof -p $pid | grep -v txt   # what files/sockets it has open
cat /proc/$pid/status         # memory, threads, state

# 6. Check logs
journalctl -u myservice --since "30 minutes ago" | tail -100
tail -100 /var/log/myapp/error.log

# 7. Application-level metrics (if available)
curl http://localhost:8080/metrics | grep -E "request|error|latency"
```

---

## Scenario: High Load, Low CPU

This is the D-state / IO wait scenario:

```bash
# Confirm: IO wait
vmstat 1 5
# wa column > 20 confirms IO wait

# Find what's doing IO
iotop -o -b -n 3

# Find D-state processes
ps aux | awk '$8 ~ /D/ {print $0}'

# Identify the disk
iostat -xz 1 3
# Which device has high util and await?
# Example: sda with await=180ms and %util=95

# Find what files are being accessed on that disk
lsof | grep /dev/sda
# or find large active files
lsof -n | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

# Check for slow filesystem
mount | grep sda
dmesg | grep -i "sda\|ext4\|xfs" | tail -20
# Hardware errors? Smart data?
smartctl -a /dev/sda | grep -i "reallocated\|error\|fail"
```

---

## Key Questions and Answers

**Q: Load average is 8 on a 4-core server but CPU usage is only 20%. What's happening?**

Load average counts both running threads AND threads in D (uninterruptible IO wait) state. 8 on a 4-core means 8 threads want CPU/IO resources but only 4 CPU slots are available. 20% CPU but high load means threads are waiting on IO, not CPU. Check: `vmstat 1 5` — if `wa` (IO wait) is high, the bottleneck is disk or network IO. Find the culprit with `iotop` and `iostat`. D-state processes can't be killed (waiting on kernel IO), so fix requires resolving the IO bottleneck.

**Q: Disk is full but `df -h` shows only 80% usage. How is that possible?**

Two possibilities: (1) Deleted files still held open — a process opened a file, another process deleted it, but the space isn't freed until all file handles close. `lsof +L1` shows files with link count 0 (deleted) still open. Restart the holding process to free the space. (2) Inode exhaustion — `df -i` shows 100% inode usage even though block usage is low. Caused by many small files. Find with `find / -xdev -printf '%h\n' | sort | uniq -c | sort -rn | head -10` and delete the unnecessary small files.

**Q: How do you find the source of a memory leak in a production process without restarting it?**

On Linux, `/proc/<pid>/smaps` shows detailed memory breakdown per mapping. Watch `VmRSS` in `/proc/<pid>/status` over time. For Python: attach with `py-spy` or inject `tracemalloc` via pyrasite (live REPL injection). For Go: hit the `/debug/pprof/heap` endpoint (if pprof server is enabled) to get a heap profile. For Java: `jmap -dump:format=b,file=heap.bin <pid>`. The pattern you're looking for: steadily growing RSS without corresponding data growth = leak.

**Q: A process is in D state and the service is hanging. What do you do?**

D-state processes cannot be killed — they're inside a kernel IO wait. Options: (1) Resolve the IO dependency — if it's waiting on a disk read, check the disk (`iostat`, `dmesg`). If the disk has hardware errors, the process may wait indefinitely. (2) Forcibly unmount if it's a filesystem issue: `umount -l /mountpoint` (lazy unmount). (3) If it's NFS: the NFS server may be down. Check the NFS server, or `umount -f -l /nfs-mount`. (4) Last resort: if the kernel can't resolve it and the system is hung, a reboot may be necessary. The D-state process itself cannot be killed at userspace.

---

## Points to Remember

- Load average = R + D state threads; high load + low CPU = IO/lock contention
- `vmstat`: `wa` column = IO wait %; `b` column = blocked on IO
- `iostat -xz`: `await` = IO latency (ms), `%util` = disk utilization
- D-state processes: cannot be killed, waiting on kernel IO; find with `ps aux | awk '$8=="D"'`
- Disk full gotcha: deleted-but-open files; `lsof +L1` shows them
- Inode exhaustion: `df -i` not `df -h`; caused by many small files
- `strace -p <pid>` traces syscalls; `-T` adds timing; `-e trace=network` filters
- `lsof -i :<port>` shows what process is using a port
- Reflex sequence: uptime → vmstat → free → df → iostat → ps → logs
- Always correlate: what changed at the time symptoms started?

## What to Study Next

- [Linux and Network Administration](./linux-and-network-administration) — deeper Linux internals
- [Observability, SLOs, and Incident Response](./observability-slos-and-incident-response) — structured incident response
- [Devops Troubleshooting and Security Errors](./devops-troubleshooting-and-security-errors) — error patterns in tools
