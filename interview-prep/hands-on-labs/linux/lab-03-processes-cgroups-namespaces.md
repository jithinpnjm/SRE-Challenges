# Linux Lab 3: Processes, cgroups, And Namespaces

## Scenario

A containerized app is slow on one node only. Kubernetes says the Pod is Running.

## Learning Goal

Bridge the gap between Kubernetes symptoms and Linux primitives.

## How To Think

The container is still just Linux processes with:

- scheduling state
- memory usage
- open files
- sockets
- namespace boundaries
- cgroup limits

## Commands To Try

```bash
ps aux
pidstat 1 5
lsns
cat /proc/cgroups
mount | grep cgroup
ls /sys/fs/cgroup
```

## Tasks

1. Explain what a namespace isolates.
2. Explain what a cgroup controls.
3. Explain how Kubernetes CPU and memory limits eventually matter at the Linux level.
4. Pick one running process and inspect its open files or sockets.
5. Write three sentences connecting kubelet, container runtime, namespaces, and cgroups.

## Stretch

- explain how CPU throttling differs from CPU saturation
- explain why memory pressure may be visible before any OOM kill
