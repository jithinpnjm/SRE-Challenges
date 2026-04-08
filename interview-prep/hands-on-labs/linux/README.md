# Linux Labs

These labs focus on host-level reasoning, process inspection, filesystem and memory behavior, and practical troubleshooting.

## Labs

1. [lab-01-host-triage.md](lab-01-host-triage.md)
2. [lab-02-filesystem-and-io.md](lab-02-filesystem-and-io.md)
3. [lab-03-processes-cgroups-namespaces.md](lab-03-processes-cgroups-namespaces.md)

## What Good Looks Like

- you explain what the host is waiting on, not just what command output says
- you compare CPU, memory, disk, and process symptoms together
- you can explain how Linux primitives connect to container behavior

## Where To Run These

- any Linux VM
- a cloud VM in GCP or AWS
- a Linux container with enough tooling for basic commands
- a local Linux host

Helpful references:

- Linux namespaces man page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- cgroup v2 docs: https://docs.kernel.org/admin-guide/cgroup-v2.html
- PSI docs: https://docs.kernel.org/accounting/psi.html
