# Foundations: Docker And Container Runtime Zero To Hero

Containers are one of the most important abstractions in modern SRE work. Kubernetes, CI runners, service platforms, batch systems, and many ML workloads all depend on container fundamentals.

A container is not a small virtual machine. A container is usually a Linux process tree isolated with namespaces, limited with cgroups, and started from an image filesystem.

This guide is designed as a complete path:

- Beginner: images, containers, Docker basics
- Intermediate: Dockerfiles, volumes, networking, logs, registries
- Advanced: namespaces, cgroups, overlay filesystems, PID 1, runtime internals
- SRE Level: debugging image pulls, CrashLoopBackOff, OOMKilled, disk pressure, runtime failures
- Interview Level: explain containers clearly from Linux internals to Kubernetes runtime behavior

---

# Part 1: What A Container Actually Is

A container is a running process with isolation and limits.

| Concept | Meaning |
|---|---|
| Image | Static packaged filesystem and metadata |
| Container | Running process created from an image |
| Namespace | What the process can see |
| cgroup | What resources the process can use |
| Runtime | Software that starts and manages containers |
| Registry | Remote storage for images |

Mental model:

```text
Image layers + writable layer + namespaces + cgroups + process = container
```

---

# Part 2: Beginner Docker Commands

```bash
docker pull nginx:1.25
docker run --name web -p 8080:80 nginx:1.25
docker ps
docker logs web
docker exec -it web sh
docker stop web
docker rm web
docker images
```

Important distinction:

- `docker image` = package
- `docker container` = running instance

---

# Part 3: Images And Layers

Images are built from layers.

Each Dockerfile instruction often creates a new layer.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Layer cache rule:

> Put rarely changing instructions first and frequently changing application code last.

Bad ordering makes CI slow.

---

# Part 4: Dockerfile Zero To Hero

## Good Production Dockerfile Pattern

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER nobody

CMD ["python", "app.py"]
```

## Multi-Stage Build

```dockerfile
FROM golang:1.22 AS builder
WORKDIR /src
COPY . .
RUN go build -o app ./cmd/app

FROM gcr.io/distroless/base-debian12
COPY --from=builder /src/app /app
USER nonroot:nonroot
ENTRYPOINT ["/app"]
```

Why:

- smaller images
- fewer CVEs
- no compiler/runtime junk in production
- faster pulls

---

# Part 5: Container Filesystems

Most Docker installations use OverlayFS/overlay2.

```text
container writable layer
image layer 3
image layer 2
image layer 1
```

Writes go to the container writable layer.

SRE implications:

- logs written inside containers can fill node disk
- deleting files inside a container does not shrink the image
- volumes are needed for persistent data

---

# Part 6: Volumes And Mounts

Containers are ephemeral. Persistent data should live outside the writable layer.

```bash
docker volume create app-data
docker run -v app-data:/data myapp
```

Bind mount:

```bash
docker run -v "$PWD/config:/config:ro" myapp
```

Production rule:

> Do not treat container writable layers as durable storage.

---

# Part 7: Networking Basics

Default Docker networking uses a bridge.

```text
container eth0 -> veth pair -> docker0 bridge -> NAT -> host network
```

Commands:

```bash
docker network ls
docker network inspect bridge
docker run -p 8080:80 nginx
docker port container
```

Port publishing maps host port to container port.

```bash
docker run -p 8080:80 nginx
```

Means:

- host listens on 8080
- traffic forwards to container port 80

---

# Part 8: Process Model And PID 1

The container entrypoint becomes PID 1 inside the container.

PID 1 has special responsibilities:

- handle signals
- reap zombie child processes

Bad pattern:

```dockerfile
CMD "python app.py"
```

Better:

```dockerfile
CMD ["python", "app.py"]
```

For apps that spawn children, use `tini` or proper signal handling.

---

# Part 9: Namespaces

Namespaces isolate what a container can see.

| Namespace | Isolates |
|---|---|
| PID | process IDs |
| Network | interfaces, routes, ports |
| Mount | filesystem mounts |
| UTS | hostname |
| IPC | shared memory/semaphores |
| User | UID/GID mapping |

A container sees its own world, but it still shares the host kernel.

---

# Part 10: cgroups And Resource Limits

cgroups limit resource usage.

```bash
docker run --memory=512m --cpus=1.5 myapp
```

Kubernetes maps requests/limits to cgroups underneath.

Important:

- memory limit exceeded -> OOMKilled
- CPU limit -> throttling, not usually kill
- no limits -> noisy neighbor risk

---

# Part 11: Runtime Architecture

Modern Kubernetes usually does not use Docker directly.

```text
kubelet -> CRI -> containerd -> runc -> Linux kernel
```

Tools:

```bash
crictl ps
crictl pods
crictl logs CONTAINER_ID
crictl inspect CONTAINER_ID
ctr containers list
```

On Kubernetes nodes, `crictl` is often more useful than `docker`.

---

# Part 12: Registries And Image Pulls

Images usually come from registries.

```bash
docker login registry.example.com
docker tag app:local registry.example.com/team/app:v1
docker push registry.example.com/team/app:v1
```

Production guidance:

- avoid `latest`
- prefer immutable tags or digests
- scan images
- sign images when possible

---

# Part 13: Security Basics

Do not run containers as root unless required.

```dockerfile
USER nonroot
```

Avoid:

- secrets in images
- privileged containers
- hostPath mounts unless necessary
- `--network host` casually
- writable root filesystems where not needed

Use:

- read-only root filesystem
- least privilege
- image scanning
- signed images
- minimal base images

---

# Part 14: Debugging Containers

## Container Exits Immediately

```bash
docker ps -a
docker logs CONTAINER
docker inspect CONTAINER --format '{{.State.ExitCode}}'
```

Common exit codes:

- `0` clean exit
- `1` app error
- `126` command not executable
- `127` command not found
- `137` SIGKILL / OOM
- `143` SIGTERM

## OOMKilled

```bash
docker inspect CONTAINER | grep OOMKilled
dmesg | grep -i oom
```

In Kubernetes:

```bash
kubectl describe pod POD
kubectl logs POD --previous
```

## No Shell In Image

Distroless images may not have `sh`.

Use Kubernetes ephemeral debug containers or node-level namespace entry.

---

# Part 15: Real Incident Stories

## Image Pull BackOff

Likely causes:

- wrong image tag
- registry auth missing
- private registry unavailable
- architecture mismatch

## CrashLoopBackOff

Likely causes:

- app startup failure
- missing env var/secret
- bad command/entrypoint
- dependency unavailable

## Node Disk Full

Likely causes:

- container logs
- unused images
- writable layers
- failed builds/cache

Commands:

```bash
docker system df
docker image prune
crictl rmi --prune
```

## Graceful Shutdown Fails

Likely causes:

- PID 1 not forwarding SIGTERM
- app does not handle termination
- Kubernetes grace period too short

---

# Part 16: Containers And Kubernetes Connection

Kubernetes adds orchestration around containers.

| Docker/container concept | Kubernetes concept |
|---|---|
| container | container inside pod |
| image | image in pod spec |
| docker run args | command/args/env/securityContext |
| port publish | Service/Ingress |
| volume | volume/PVC |
| restart | restartPolicy/controller |
| resource flags | requests/limits |

Kubernetes still depends on Linux namespaces, cgroups, filesystems, and networking.

---

# Part 17: Interview Questions

- Why are containers not VMs?
- What are namespaces and cgroups?
- What is the PID 1 problem?
- Why use multi-stage builds?
- Why avoid `latest` in production?
- What happens when a container exceeds memory limit?
- What is containerd?
- How do you debug CrashLoopBackOff?

---

# Part 18: Labs

## Beginner

- run nginx locally
- map ports
- inspect logs
- exec into container

## Intermediate

- write Dockerfile for Python app
- build and push image
- add volume
- create custom network

## Advanced

- multi-stage build
- non-root image
- simulate OOM
- inspect cgroups
- debug container without shell

---

# Part 19: Senior Answer Shape

> A container is a Linux process tree started from an image, isolated by namespaces, limited by cgroups, and usually backed by an overlay filesystem. Docker is a developer interface around these primitives; Kubernetes normally talks to containerd through CRI, which ultimately uses an OCI runtime such as runc. For production debugging I separate image problems, startup problems, runtime resource limits, networking, and node-level filesystem/runtime issues.

---

# Recall Prompts

- What is the difference between image and container?
- Why is PID 1 special?
- What does overlay2 provide?
- What happens when memory limit is exceeded?
- Why does Kubernetes use containerd/crictl instead of Docker commands on many nodes?
