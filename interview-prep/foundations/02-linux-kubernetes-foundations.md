# Foundations: Kubernetes Zero To Hero For SRE And Platform Engineers

Kubernetes is a system for running containers reliably across many machines. It gives you a control plane, a scheduling system, APIs for desired state, and node agents that turn declarations into running workloads.

Kubernetes does not replace Linux. It coordinates Linux hosts, container runtimes, cgroups, namespaces, filesystems, and networking.

This guide is designed as a complete path:

- Beginner: what Kubernetes is and why it exists
- Intermediate: pods, deployments, services, config, storage, scheduling
- Advanced: control plane, kubelet, runtime, CNI, controllers, probes, resources
- SRE Level: debugging Pending, CrashLoopBackOff, ImagePullBackOff, Service failures, node pressure
- Interview Level: explain desired state, reconciliation, scheduling, and node-level behavior clearly

---

# Part 1: Why Kubernetes Exists

Before Kubernetes, teams ran services directly on VMs or physical hosts.

Problems:

- where should each service run?
- what happens if a host dies?
- how do we roll out safely?
- how do we scale up/down?
- how do services find each other?
- how do we isolate workloads?

Kubernetes answers these with a declarative platform.

You describe desired state. Kubernetes continuously reconciles actual state toward it.

```text
Desired state -> Kubernetes control loops -> Actual running workloads
```

---

# Part 2: Memory Palace — Kubernetes Is A City

Think of a cluster as a city.

| Kubernetes concept | City analogy | Production meaning |
|---|---|---|
| Cluster | City | Whole platform |
| Node | Building | Worker machine |
| Pod | Apartment | Smallest workload unit |
| Container | Person/process in apartment | App process |
| Scheduler | Housing office | Chooses node placement |
| kubelet | Building manager | Runs assigned pods |
| Service | Public phone number | Stable access to pods |
| EndpointSlice | Directory of real apartments | Ready backend list |
| Ingress | City gate | External HTTP entry |
| CNI | Roads | Pod networking |
| CoreDNS | City directory | Service name lookup |
| Controller | City department | Keeps desired state true |

---

# Part 3: Cluster Architecture

Kubernetes has two major areas.

## Control Plane

Responsible for state, decisions, and coordination.

Components:

- API server
- etcd
- scheduler
- controller manager
- cloud controller manager

## Worker Nodes

Responsible for running workloads.

Components:

- kubelet
- container runtime/containerd
- kube-proxy or eBPF dataplane
- CNI plugin
- Linux kernel

---

# Part 4: API Server And Desired State

The API server is the front door.

Every `kubectl` command talks to the API server.

```bash
kubectl get pods
kubectl apply -f deployment.yaml
kubectl describe pod mypod
```

Kubernetes objects live as API resources.

Examples:

- Pod
- Deployment
- Service
- ConfigMap
- Secret
- PersistentVolumeClaim
- Ingress
- NetworkPolicy

---

# Part 5: etcd

etcd stores cluster state.

If etcd is unhealthy, the cluster may appear stale or unable to persist changes.

SRE concerns:

- quorum
- disk latency
- backup and restore
- compaction
- defragmentation
- control-plane blast radius

etcd is the memory of the cluster.

---

# Part 6: Pods

A Pod is the smallest schedulable unit.

A Pod can contain one or more containers that share:

- network namespace
- Pod IP
- volumes
- localhost

```bash
kubectl get pods -A
kubectl describe pod POD -n NAMESPACE
kubectl logs POD -n NAMESPACE
kubectl exec -it POD -n NAMESPACE -- sh
```

A container is not scheduled by itself. A Pod is scheduled.

---

# Part 7: Deployments, ReplicaSets, And Controllers

A Deployment manages ReplicaSets. ReplicaSets manage Pods.

```text
Deployment -> ReplicaSet -> Pods
```

Deployment gives you:

- rolling updates
- rollback
- replica management
- declarative workload control

```bash
kubectl get deploy
kubectl rollout status deploy/api
kubectl rollout history deploy/api
kubectl rollout undo deploy/api
```

Controllers constantly compare desired state and actual state.

---

# Part 8: Services And Discovery

Pods are ephemeral. IPs change.

A Service provides stable access.

Types:

| Type | Use |
|---|---|
| ClusterIP | internal access |
| NodePort | expose on every node port |
| LoadBalancer | cloud LB integration |
| ExternalName | DNS alias |
| Headless | direct pod discovery |

```bash
kubectl get svc
kubectl describe svc api
kubectl get endpointslice
```

A Service without ready endpoints will not send useful traffic.

---

# Part 9: Scheduling

The scheduler chooses a node for a Pod.

It considers:

- resource requests
- taints and tolerations
- node selectors
- affinity/anti-affinity
- topology spread constraints
- volume constraints

Debug Pending Pods:

```bash
kubectl describe pod POD
kubectl get events -A --sort-by=.lastTimestamp
kubectl describe node NODE
```

Pending usually means scheduling constraints, missing resources, or volume issues.

---

# Part 10: ConfigMaps And Secrets

ConfigMaps store non-sensitive configuration.

Secrets store sensitive values, but are not magically secure unless encryption and access controls are configured.

```bash
kubectl get configmap
kubectl get secret
kubectl describe secret SECRET
```

Use secrets carefully:

- enable encryption at rest
- restrict RBAC
- avoid logging secrets
- prefer external secret managers for production

---

# Part 11: Probes

Kubernetes uses probes to decide health.

| Probe | Meaning |
|---|---|
| startupProbe | app finished startup |
| readinessProbe | app can receive traffic |
| livenessProbe | app should be restarted if stuck |

Common mistake:

- using liveness when readiness is needed
- probe too aggressive for slow startup
- shallow health check that ignores dependencies

---

# Part 12: Resources, Requests, Limits

Requests affect scheduling.

Limits affect runtime enforcement.

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1"
    memory: "512Mi"
```

Important behavior:

- CPU limit can throttle
- memory limit can OOMKill
- missing requests cause bad scheduling decisions
- overcommit is a policy choice

---

# Part 13: Storage

Kubernetes storage concepts:

| Concept | Meaning |
|---|---|
| Volume | mounted storage in Pod |
| PersistentVolume | actual storage resource |
| PersistentVolumeClaim | request for storage |
| StorageClass | dynamic provisioning policy |

```bash
kubectl get pv,pvc,storageclass
kubectl describe pvc PVC
```

Storage problems often appear as Pods stuck in Pending or ContainerCreating.

---

# Part 14: Networking Overview

Kubernetes expects:

- Pods can communicate with Pods
- Pods can communicate with Services
- nodes can reach Pods
- DNS resolves service names

Core pieces:

- CNI plugin
- CoreDNS
- kube-proxy or eBPF service dataplane
- NetworkPolicy
- Ingress controller

Networking issues should be separated into DNS, Service, endpoint, policy, and node dataplane problems.

---

# Part 15: Security Basics

Key controls:

- namespaces for organization
- RBAC for API permissions
- service accounts for workload identity
- NetworkPolicy for traffic control
- securityContext for runtime restrictions
- admission policies for guardrails

```bash
kubectl auth can-i get pods
kubectl get role,rolebinding -A
kubectl get serviceaccount -A
```

Least privilege matters.

---

# Part 16: Troubleshooting Common States

## Pending

Likely causes:

- insufficient CPU/memory
- taints not tolerated
- affinity impossible
- PVC not bound
- node selector mismatch

## ImagePullBackOff

Likely causes:

- wrong image name/tag
- private registry auth missing
- registry outage
- architecture mismatch

## CrashLoopBackOff

Likely causes:

- app exits on startup
- missing config/secret
- dependency unavailable
- bad command/args

## Running But Not Ready

Likely causes:

- readiness probe failing
- app not listening
- dependency unavailable
- startup too slow

## Service Fails But Pods Run

Likely causes:

- labels/selectors mismatch
- no ready endpoints
- wrong targetPort
- NetworkPolicy
- dataplane/kube-proxy/eBPF issue

---

# Part 17: Node-Level Debugging

Kubernetes incidents often require node access.

```bash
systemctl status kubelet
journalctl -u kubelet -n 200
crictl ps -a
crictl logs CONTAINER_ID
df -h
df -i
free -m
vmstat 1 5
conntrack -S
```

Think:

- kubelet health
- runtime health
- disk/inode pressure
- memory pressure
- CNI state
- conntrack exhaustion

---

# Part 18: Real Incident Stories

## Pods Pending After Deployment

Wrong assumption: deployment broken.

Better path:

- describe pod
- read scheduler events
- inspect requests/taints/PVCs

## Service Exists But No Traffic

Wrong assumption: network broken.

Better path:

- check Service selector
- check EndpointSlice
- check readiness
- test direct Pod IP vs Service IP

## CrashLoopBackOff After Config Change

Better path:

- logs previous container
- inspect env/config/secret mount
- rollback deployment

## One Node Has Many Failures

Better path:

- describe node
- kubelet logs
- runtime status
- disk/inode/conntrack/CNI

---

# Part 19: Kubernetes + Linux Connection

Kubernetes desired state becomes Linux reality:

- Pod -> namespaces
- resources -> cgroups
- volume -> mounts
- Service -> iptables/IPVS/eBPF rules
- container -> process
- node pressure -> kernel/resource pressure

If Linux is weak, Kubernetes troubleshooting stays shallow.

---

# Part 20: Interview Questions

- What happens after you run `kubectl apply`?
- What is the difference between Pod and Deployment?
- Why can a Pod be Running but not Ready?
- What does the scheduler do and not do?
- How does a Service find Pods?
- What causes CrashLoopBackOff?
- How do requests and limits differ?
- How would you debug a Service with no endpoints?

---

# Part 21: Labs

## Beginner

- create a Pod
- create a Deployment
- expose with ClusterIP Service
- inspect logs and events

## Intermediate

- break a readiness probe
- create ImagePullBackOff intentionally
- create Pending Pod with impossible nodeSelector
- rollback a Deployment

## Advanced

- inspect node kubelet logs
- compare Pod IP vs Service access
- simulate memory OOM
- inspect container runtime with crictl

---

# Part 22: Senior Answer Shape

> Kubernetes is a desired-state control system. The API server accepts declarations, stores them in etcd, and controllers continuously reconcile actual state toward desired state. The scheduler chooses nodes for Pods based on constraints, while kubelet and the container runtime turn assigned Pods into Linux processes with namespaces, cgroups, mounts, and network configuration. During incidents I separate control-plane state, node execution, and dataplane delivery before changing anything.

---

# Recall Prompts

- What is reconciliation?
- Why is a Pod the smallest schedulable unit?
- Why can a Service have no endpoints?
- What is the kubelet responsible for?
- What is the difference between control plane, node plane, and dataplane?
