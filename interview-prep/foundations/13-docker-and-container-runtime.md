# Docker and Container Runtime

## What It Is and Why It Matters

Docker popularized containers, but containers themselves predate Docker. A container is a Linux process (or group of processes) that runs in isolated namespaces with constrained resources via cgroups. Docker provides tooling to build, distribute, and run containers with a developer-friendly interface.

At the infrastructure level, containers are not virtual machines. They share the host kernel. The isolation is provided by Linux namespaces (what you can see) and cgroups (how much you can use). Understanding this distinction is essential for debugging container security, performance, and networking issues.

The container runtime landscape has evolved significantly. The original Docker daemon is now split into components: containerd (runtime), runc (OCI runtime, spawns containers), and the Container Runtime Interface (CRI) that Kubernetes uses to talk to runtimes.

---

## Mental Model

**A container is a namespace-isolated, cgroup-limited process tree.**

When you run `docker run nginx`:
1. Docker (or containerd) unpacks the image layers into a merged filesystem (overlay2)
2. Creates Linux namespaces: new PID namespace, network namespace, mount namespace, UTS namespace
3. Configures cgroup limits (CPU, memory, I/O)
4. Starts the init process (PID 1 in the container's namespace)

The "image" is just a layered filesystem. The "container" is the running process with its namespace/cgroup configuration. They are separate concepts — an image is static, a container is live.

```
Docker Image (OCI image)
    → Series of filesystem layers (overlay2)
    → Manifest + config (layer hashes, entrypoint, env vars)

Docker Container
    → Union mount of image layers + writable layer on top
    → Running in PID/net/mnt/uts namespaces
    → CPU/memory limits via cgroups
```

---

## Core Concepts

### Namespaces in Containers

| Namespace | Flag | What it isolates |
|-----------|------|-----------------|
| PID | CLONE_NEWPID | Process IDs (container sees its own PID 1) |
| Network | CLONE_NEWNET | Network interfaces, routing, iptables |
| Mount | CLONE_NEWNS | Filesystem mounts |
| UTS | CLONE_NEWUTS | Hostname and domain name |
| IPC | CLONE_NEWIPC | IPC (shared memory, semaphores) |
| User | CLONE_NEWUSER | UID/GID mapping (rootless containers) |

By default, Docker creates all these namespaces for each container. The host shares none of them (unless you use `--pid=host` or `--network=host`).

### The Overlay2 Filesystem

Container images use overlay2 (OverlayFS) for efficient layering. Each layer contains only the diff from the previous layer.

```
Container layer (writable)    ← writes go here
    ↓
Layer 3: npm install
    ↓
Layer 2: apt-get install nodejs
    ↓
Layer 1: FROM ubuntu:22.04
```

When a container reads a file, the kernel merges these layers (overlay). Writes go to the top writable layer only. This means:

- **Files are not duplicated** across containers using the same image — they share read-only layers
- **Large writes inside a container** (e.g., a process writing 10GB of logs) go to the container's writable layer and consume host disk space
- **Dockerfile layer ordering matters**: put rarely-changing layers first (`FROM`, `RUN apt-get`), frequently-changing layers last (`COPY . .`) to maximize cache hits

### PID 1 Problem

In a container, the first process (ENTRYPOINT or CMD) runs as PID 1. In normal Linux, PID 1 (init/systemd) has special responsibilities:

- **Signal handling**: PID 1 must handle SIGTERM. If it doesn't, the process can't be stopped gracefully.
- **Zombie reaping**: PID 1 must reap zombie child processes. If your process forks children that die, zombies accumulate.

Many application processes (Python apps, Node.js, shell scripts) are not designed to be PID 1.

Common problems:
```bash
# Shell script as entrypoint — does NOT pass SIGTERM to child
ENTRYPOINT ["./start.sh"]

# Direct exec — DOES receive SIGTERM
ENTRYPOINT ["python", "app.py"]
```

Solutions:
1. Use `exec form` in ENTRYPOINT (JSON array, not string) — `["python", "app.py"]` not `"python app.py"`
2. Use `tini` as a minimal init process that handles signal forwarding and zombie reaping
3. Implement SIGTERM handling in your application

```dockerfile
# Using tini
FROM python:3.11-slim
RUN apt-get install -y tini
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "app.py"]
```

---

## Dockerfile Best Practices

### Multi-Stage Builds

Multi-stage builds separate the build environment from the runtime image, reducing image size significantly:

```dockerfile
# Stage 1: Build
FROM golang:1.21 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download                    # separate layer for dependencies
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

# Stage 2: Runtime (minimal image)
FROM gcr.io/distroless/static:nonroot  # no shell, no package manager
WORKDIR /app
COPY --from=builder /app/server .
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
```

Result: Go binary only, no Go compiler, no source code, no package manager. Typical size: 10-20MB vs 800MB for a full build image.

### Layer Caching Strategy

```dockerfile
FROM python:3.11-slim

# Layer 1: System dependencies (changes rarely)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Layer 2: Python dependencies (changes on dependency updates)
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 3: Application code (changes frequently)
COPY . .

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

If you put `COPY . .` before `pip install`, every code change invalidates the pip cache and reinstalls all dependencies. Wrong order = slow CI.

### Security in Dockerfiles

```dockerfile
# Don't run as root
USER nobody

# Use specific image tags, never :latest in production
FROM python:3.11.7-slim-bookworm

# Don't include secrets in image layers
# Bad: RUN echo "API_KEY=secret" > /app/.env
# Good: pass secrets at runtime via env vars or secrets mounts

# Use .dockerignore to prevent sensitive files entering the build context
# .dockerignore should include: .git, .env, node_modules, *.key, *.pem

# Read-only root filesystem where possible
# docker run --read-only --tmpfs /tmp myimage
```

### Scanning for Vulnerabilities

```bash
# Trivy — CNCF vulnerability scanner
trivy image myapp:latest

# Grype
grype myapp:latest

# Docker Scout (built into Docker)
docker scout cves myapp:latest

# Snyk
snyk container test myapp:latest
```

Run vulnerability scanning in CI as a build step. Set a policy: fail build on CRITICAL CVEs, warn on HIGH.

---

## Container Runtime Architecture

### Docker vs containerd vs runc

The original Docker monolith was split into modular components:

```
dockerd (Docker daemon)
    → containerd (manages container lifecycle)
        → containerd-shim (per-container process)
            → runc (OCI runtime, creates namespaces/cgroups, execs process)
```

In Kubernetes, `dockerd` was removed. Kubernetes talks directly to `containerd` via the CRI (Container Runtime Interface):

```
kubelet
    → CRI gRPC API
        → containerd (CRI plugin)
            → containerd-shim-runc-v2
                → runc
```

When debugging containers on a Kubernetes node, use `crictl` (the CRI client), not `docker`:

```bash
# List all containers on this node (crictl, not docker)
crictl ps

# Container logs
crictl logs <container-id>

# Pod sandboxes
crictl pods

# Inspect container
crictl inspect <container-id>

# Pull image
crictl pull nginx:latest

# Remove all unused images
crictl rmi --prune
```

### Alternative Runtimes

| Runtime | Type | Use Case |
|---------|------|---------|
| runc | OCI runtime | Default, standard containers |
| gVisor (runsc) | Sandbox runtime | Security-sensitive multi-tenant workloads |
| Kata Containers | VM-based runtime | Full VM isolation per container |
| crun | OCI runtime | Faster, lower memory than runc |
| Firecracker | microVM | AWS Lambda / Fargate |

For GPU workloads, NVIDIA provides `nvidia-container-runtime` which wraps runc and injects GPU device access:

```
containerd → nvidia-container-runtime → runc + GPU device injection
```

---

## Networking

### Container Network Model

Each container gets its own network namespace. Docker creates a virtual Ethernet pair (veth): one end in the container (`eth0`), one on the host (e.g., `veth3a2b1c`), connected to a bridge (`docker0`).

```
Container eth0 ←→ veth3a2b1c ←→ docker0 bridge ←→ NAT ←→ host network
```

Traffic between containers on the same host goes through the bridge. Traffic to the internet gets NAT'd at the host.

Common networking modes:
- `bridge` (default): isolated network, NAT for outbound
- `host`: shares host network namespace (no isolation, no NAT overhead)
- `none`: no network (completely isolated)
- `overlay`: multi-host networking (Docker Swarm/custom)

```bash
# Inspect container networking
docker inspect <container> | grep -A 20 NetworkSettings

# Check which containers are on which network
docker network inspect bridge

# Create a custom network (containers on same network can reach each other by name)
docker network create myapp-net
docker run --network=myapp-net --name=db postgres
docker run --network=myapp-net --name=app myapp
# app can reach db via hostname "db"
```

### Port Publishing

```bash
# Publish container port 8080 to host port 80
docker run -p 80:8080 myapp

# This creates an iptables rule:
# -A DOCKER -i ! docker0 -p tcp --dport 80 -j DNAT --to-destination 172.17.0.2:8080

# View the rule
iptables -t nat -L DOCKER
```

---

## Resource Limits and cgroups

### Setting Limits

```bash
# CPU: limit to 1.5 CPUs
docker run --cpus=1.5 myapp

# CPU shares (relative weight, not absolute)
docker run --cpu-shares=512 myapp   # default 1024, half means half priority

# Memory: hard limit 512MB, soft limit 256MB
docker run --memory=512m --memory-reservation=256m myapp

# Memory: if OOM, kill this container first (lower score = killed last)
docker run --oom-score-adj=-500 critical-service

# I/O: limit disk read to 100MB/s
docker run --device-read-bps=/dev/sda:100mb myapp
```

These map directly to cgroup v2 settings:
- `--cpus` → `cpu.max` (quota/period)
- `--memory` → `memory.max`
- `--memory-reservation` → `memory.high`

### Inspecting Container Resource Usage

```bash
# Live stats for all containers
docker stats

# One-shot snapshot
docker stats --no-stream

# Inspect cgroup files directly on host
# Find container's cgroup path
docker inspect <container> | grep CgroupsMode
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/cpu.stat
cat /sys/fs/cgroup/system.slice/docker-<id>.scope/memory.current
```

### OOM Kills

When a container exceeds its memory limit, the Linux OOM killer terminates processes inside it. Signs:
- Container restarts unexpectedly
- `docker inspect` shows `OOMKilled: true`
- `dmesg | grep -i oom` on the host shows the kill event

```bash
# Check if OOM kill happened
docker inspect <container> | grep OOMKilled

# Check host kernel log
dmesg | grep -i "oom\|killed"

# In Kubernetes
kubectl describe pod <pod> | grep -A 5 OOM
```

---

## Debugging Running Containers

### Exec into Container

```bash
# Get a shell
docker exec -it <container> bash

# Run a command
docker exec <container> ps aux

# If the container has no shell (distroless images):
# Option 1: Use kubectl debug (Kubernetes)
kubectl debug -it <pod> --image=busybox --target=<container>

# Option 2: nsenter on host
# Find PID of container's init process
docker inspect <container> --format '{{ .State.Pid }}'
# Enter its namespaces
nsenter -t <pid> -n -p -m -u -- bash
```

### Inspecting Filesystem

```bash
# Show filesystem diff (files changed in container layer vs image)
docker diff <container>
# A = added, C = changed, D = deleted

# Copy file out of container
docker cp <container>:/app/config.json ./config.json

# Export entire container filesystem
docker export <container> | tar -t | head -20
```

### Viewing Logs

```bash
# All logs
docker logs <container>

# Follow (tail -f style)
docker logs -f <container>

# Last 100 lines
docker logs --tail=100 <container>

# With timestamps
docker logs -t <container>

# Since time (10 minutes ago)
docker logs --since=10m <container>
```

Container logs go to the Docker logging driver. Default is `json-file` (stored in `/var/lib/docker/containers/<id>/<id>-json.log`). On Kubernetes, logs go to container runtime, collected by a log agent (Fluentd, Fluent Bit).

### Inspecting a Dead Container

```bash
# List all containers including stopped
docker ps -a

# Get exit code
docker inspect <container> --format '{{ .State.ExitCode }}'

# Common exit codes:
# 0 = clean exit
# 1 = application error
# 137 = killed by signal 9 (SIGKILL) — OOM kill or docker kill
# 143 = killed by signal 15 (SIGTERM) — graceful shutdown
# 125 = docker daemon error
# 126 = container command not executable
# 127 = container command not found

# Get logs from dead container
docker logs <container-id>  # still works until container is removed
```

---

## Image Management

### Pulling and Tagging

```bash
# Pull from registry
docker pull nginx:1.25.3

# Tag for your registry
docker tag nginx:1.25.3 registry.internal/base/nginx:1.25.3

# Push
docker push registry.internal/base/nginx:1.25.3

# List local images
docker images

# Remove unused images (free disk space)
docker image prune -a    # removes all images not used by running containers
```

### Image Layers

```bash
# Inspect image layers
docker history nginx:latest

# Show full layer IDs and sizes
docker history --no-trunc nginx:latest

# Dive tool: interactive layer explorer
dive nginx:latest
```

### Registry Operations

```bash
# Login to registry
docker login registry.internal

# For ECR (AWS)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# For GCR
gcloud auth configure-docker gcr.io
```

---

## Common Failure Modes

**Container exits immediately with code 1:** Application error at startup. Check `docker logs <container>` — almost always the application printed the error before dying.

**Container stuck in CrashLoopBackOff (Kubernetes):** Container starts, fails, Kubernetes restarts it with exponential backoff. Use `kubectl logs <pod> --previous` to see logs from the last failed attempt.

**OOMKilled:** Container exceeded memory limit. Either increase the limit, or investigate the memory leak. Start with `docker stats` to see current usage trend before increasing limits blindly.

**Large image size slowing CI:** Multi-stage builds are the primary fix. Also: use `.dockerignore` to exclude unnecessary files, use slim base images (`alpine`, `distroless`), clean up package manager caches in the same `RUN` layer as the install.

**Can't reach container from another container:** Check they are on the same Docker network. Containers on `bridge` (default) network can't reach each other by name — you need a user-defined network. `docker network create mynet`, then `--network=mynet` on both containers.

**Permission denied in container:** Common causes:
- Application runs as non-root, file created as root during build
- Volume mounted from host has different UID
- Security context in Kubernetes prevents write

Fix: use `chown` in Dockerfile, or use `--user` flag, or configure Kubernetes `securityContext.fsGroup`.

---

## Key Questions and Answers

**Q: What is the difference between a container and a virtual machine?**

A container is an isolated process using Linux namespaces and cgroups — it shares the host kernel. A VM is a full hardware virtualization layer with its own kernel, memory pages, and virtual devices. Containers are lighter (startup in milliseconds, minimal overhead) but provide weaker isolation (all containers share the same kernel — a kernel vulnerability can break all containers). VMs provide stronger isolation but more overhead. In practice: containers for density and speed, VMs (or gVisor/Kata) for security boundaries between tenants.

**Q: Why do Docker builds use layer caching, and how do you optimize for it?**

Each Dockerfile instruction creates an image layer. Docker caches layers and only rebuilds from the first changed instruction onward. If `COPY requirements.txt` is before `pip install`, a change to requirements.txt invalidates the pip cache (correct behavior — dependencies changed). If `COPY . .` is before `pip install`, any code change invalidates pip (wasteful). Rule: order layers from least-frequently-changed to most-frequently-changed. Dependencies before code. System packages before app packages.

**Q: A container is using more memory than expected and getting OOM killed. How do you investigate?**

First: check `docker inspect <container> | grep OOMKilled` to confirm it's OOM. Then: `docker stats` to see current memory usage. If it keeps growing: memory leak in the application. Add heap profiling (Python tracemalloc, Java JProfiler, Go pprof). If it's a sudden spike: look at what request or operation triggered it — check logs for the time of the kill. Increase the limit temporarily to gather more data, but also fix the root cause.

**Q: What is containerd and how does it relate to Docker and Kubernetes?**

containerd is the container lifecycle manager — it handles image management, container creation, and execution. Docker daemon is built on top of containerd. Kubernetes talks to containerd directly via the CRI (Container Runtime Interface) gRPC API, without going through the Docker daemon. runc is the OCI runtime that containerd delegates to for actually creating the namespaces and cgroups. So the stack is: kubelet → containerd → runc → Linux namespaces/cgroups.

**Q: How do you reduce a Docker image from 800MB to under 50MB?**

Multi-stage build: compile in a full SDK image, copy only the binary/artifact to a minimal runtime image (distroless, alpine, scratch). Use `.dockerignore` to exclude build artifacts, tests, docs from the build context. Clean up package manager caches in the same `RUN` statement as the install (separate `RUN apt-get clean` doesn't help — the files are already in the layer). Use slim or alpine base images. Remove debug tools from production images.

**Q: What is the PID 1 problem in containers, and how do you solve it?**

PID 1 in a container is responsible for signal forwarding and zombie reaping. Most application processes are not written to do this. If your app doesn't handle SIGTERM, `docker stop` sends SIGTERM, waits 10 seconds, then sends SIGKILL — your app gets no chance to shut down gracefully. The fix: use `ENTRYPOINT` in exec form (`["python", "app.py"]`) so the app becomes PID 1 directly, or use `tini` as a minimal init that handles signal forwarding and zombie reaping.

---

## Points to Remember

- Containers are namespace-isolated, cgroup-limited processes — not VMs
- Overlay2: each container has read-only image layers plus a writable layer on top
- PID 1 in a container must handle SIGTERM; use exec-form ENTRYPOINT or tini
- Multi-stage builds: build in SDK image, copy artifact to minimal runtime image
- Layer ordering in Dockerfile matters for cache: least-changed first, code last
- containerd is the runtime; runc is the OCI executor; Docker daemon wraps containerd
- On Kubernetes nodes, use `crictl` not `docker` to inspect containers
- `docker stats` for live resource usage; `docker inspect` for configuration
- OOMKilled = container exceeded memory.max cgroup limit
- Exit code 137 = SIGKILL (OOM or force kill); 143 = SIGTERM (graceful)
- Never use `:latest` in production images — pin to specific digest or tag
- Scan images for CVEs in CI; fail on CRITICAL vulnerabilities

## What to Study Next

- [Linux to Kubernetes](./linux-kubernetes-foundations) — how containers connect to the Kubernetes control plane
- [Kubernetes Networking Deep Dive](./kubernetes-networking-deep-dive) — how container networking works in Kubernetes
- [YAML and Kubernetes Manifest Design](./yaml-and-kubernetes-manifest-design) — configuring container resources and security contexts
