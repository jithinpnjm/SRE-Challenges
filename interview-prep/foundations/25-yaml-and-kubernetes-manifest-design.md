# YAML and Kubernetes Manifest Design

## What It Is and Why It Matters

YAML is the configuration language of Kubernetes. Every resource — Pods, Deployments, Services, ConfigMaps, Secrets, RBAC rules, Ingress, NetworkPolicies — is described in YAML and submitted to the API server.

Understanding how to write correct, production-quality Kubernetes manifests — with proper resource limits, security contexts, probes, pod disruption budgets, affinity rules, and network policies — is a core platform engineering skill. Poorly written manifests are the source of many production incidents: pods that can't be scheduled, evictions during low-memory events, deployments that can't roll out cleanly, services unreachable due to missing network policies.

---

## YAML Fundamentals

### Syntax

```yaml
# Scalar types
string_value: hello
integer_value: 42
float_value: 3.14
boolean_value: true
null_value: ~

# Multiline strings
literal_block: |
  This is line 1.
  This is line 2.
  Newlines are preserved.

folded_block: >
  This is line 1 and
  line 2 joined by a space.
  Newlines become spaces.

# Lists (sequences)
fruits:
  - apple
  - banana
  - cherry

# Inline list
fruits: [apple, banana, cherry]

# Maps (mappings)
person:
  name: Alice
  age: 30
  address:
    city: London

# Inline map
person: {name: Alice, age: 30}

# Anchors and aliases (reuse values)
defaults: &defaults
  replicas: 2
  image: nginx:1.25

production:
  <<: *defaults   # merge defaults
  replicas: 10    # override specific value

# YAML string gotchas
version: "1.10"   # quote version numbers to prevent float parsing (1.10 → 1.1)
port: "80"        # quote if value could be misinterpreted
enabled: "true"   # quote if you want a string "true", not boolean true
```

---

## Core Kubernetes Manifest Patterns

### Complete Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
  namespace: production
  labels:
    app: checkout-api
    version: v2.3.0
    team: payments
  annotations:
    deployment.kubernetes.io/revision: "14"

spec:
  replicas: 3

  selector:
    matchLabels:
      app: checkout-api          # must match template labels

  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                # create 1 extra pod during rollout
      maxUnavailable: 0          # never go below desired count

  template:
    metadata:
      labels:
        app: checkout-api
        version: v2.3.0

    spec:
      serviceAccountName: checkout-api     # RBAC identity for this pod

      # Pod-level security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 3000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault

      # Graceful shutdown window
      terminationGracePeriodSeconds: 60

      # Topology spread (spread pods across AZs)
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: checkout-api

      containers:
        - name: checkout-api
          image: registry.internal/payments/checkout-api:sha256-abc123

          ports:
            - name: http
              containerPort: 8080
              protocol: TCP

          # Resource requests and limits
          resources:
            requests:
              cpu: "250m"         # 0.25 CPU cores — used for scheduling
              memory: "256Mi"     # used for scheduling
            limits:
              cpu: "1000m"        # 1 CPU core — hard cap (throttle, not kill)
              memory: "512Mi"     # hard cap — OOM kill if exceeded

          # Container-level security
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]

          # Startup probe: check during initialization
          startupProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30    # 30 * 5s = 150s to start

          # Readiness probe: is this pod ready to receive traffic?
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 10
            failureThreshold: 3     # remove from service after 3 failures

          # Liveness probe: should this pod be restarted?
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            periodSeconds: 15
            failureThreshold: 3
            # Only use liveness if a failed probe means the pod is truly dead

          # Environment variables
          env:
            - name: APP_ENV
              value: "production"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: checkout-db-credentials
                  key: password
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: checkout-config
                  key: db_host

          # Volume mounts
          volumeMounts:
            - name: tmp-dir
              mountPath: /tmp           # writable volume for read-only root filesystem
            - name: config
              mountPath: /etc/app
              readOnly: true

      volumes:
        - name: tmp-dir
          emptyDir: {}
        - name: config
          configMap:
            name: checkout-config
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout-api
  namespace: production

spec:
  type: ClusterIP                 # internal only (default)
  # type: LoadBalancer            # cloud load balancer (AWS ALB, GCP LB)
  # type: NodePort                # expose on node IP:port

  selector:
    app: checkout-api             # routes to pods with this label

  ports:
    - name: http
      port: 80                    # service port (what callers use)
      targetPort: 8080            # container port
      protocol: TCP
```

### ConfigMap and Secret

```yaml
# ConfigMap: non-sensitive configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: checkout-config
  namespace: production
data:
  db_host: "postgres.production.svc.cluster.local"
  db_name: "checkout"
  max_connections: "50"
  log_level: "info"
  # Multiline values
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://localhost:8080;
      }
    }

---
# Secret: sensitive values (base64-encoded, encrypted at rest with etcd encryption)
apiVersion: v1
kind: Secret
metadata:
  name: checkout-db-credentials
  namespace: production
type: Opaque
data:
  # base64 encoded: echo -n 'mysecretpassword' | base64
  password: bXlzZWNyZXRwYXNzd29yZA==
  username: Y2hlY2tvdXQ=
# Better: use External Secrets Operator to pull from Vault/AWS Secrets Manager
```

---

## Resource Requests and Limits

Understanding this correctly prevents most scheduling and OOM incidents.

### Requests vs Limits

**Request**: the amount of CPU/memory the container is *guaranteed*. Used by the scheduler to decide which node to place the pod on. A node with 4 CPU can run pods whose total CPU requests sum to 4 CPU.

**Limit**: the maximum the container can *consume*. CPU limit: throttled when exceeded (not killed). Memory limit: OOM killed when exceeded.

```
Node: 4 CPU, 8Gi memory
│
├── Pod A: request=1 CPU, 2Gi  ← scheduler allocated
├── Pod B: request=1 CPU, 2Gi  ← scheduler allocated
├── Pod C: request=1 CPU, 2Gi  ← scheduler allocated
└── Pod D: request=2 CPU, 3Gi  ← CANNOT schedule, only 1 CPU free

Pod A at runtime can use up to its CPU limit (say 2 CPU)
If Pod A uses 2 CPU while B also uses 2 CPU: node is at 4 CPU
Kubernetes CPU-throttles both to stay within limits
```

### QoS Classes

QoS affects which pods are evicted when the node runs out of memory:

| QoS Class | Condition | Eviction priority |
|-----------|-----------|-----------------|
| Guaranteed | requests == limits for all containers | Last to evict |
| Burstable | requests < limits (or only limits set) | Middle |
| BestEffort | no requests or limits set | First to evict |

For production services: set Guaranteed QoS by setting requests == limits for memory (CPU can differ since CPU is throttled, not killed):

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2000m"    # allow CPU bursting
    memory: "512Mi" # keep memory request == limit for Guaranteed QoS
```

---

## Health Probes

Three probe types serve different purposes:

**Startup probe**: used when containers take a long time to initialize. Disables liveness probe until it succeeds. Prevents liveness probe from killing a slow-starting container.

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30    # allow up to 150 seconds to start (30 * 5s)
  periodSeconds: 5
```

**Readiness probe**: removes pod from Service endpoints when failing. Pod stays running but receives no traffic. Use for checking dependencies (database connected, cache warmed).

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 10
  failureThreshold: 3    # 30s without traffic before removed
  successThreshold: 1    # 1 success to re-add to service
```

**Liveness probe**: restarts the pod when failing. Use only when the container genuinely cannot recover without restart (deadlocked, corrupted state). Do NOT use liveness probe to check external dependencies — if your database is down, restarting the pod won't fix it.

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 15
  failureThreshold: 3    # restart after 45s of failure
  initialDelaySeconds: 30  # wait 30s before first check
```

Common mistake: setting liveness probe to check database connectivity. When the database is down, all pods restart in a loop, making recovery harder.

---

## Pod Disruption Budgets

PodDisruptionBudget (PDB) prevents too many pods from being unavailable simultaneously during voluntary disruptions (node drains, cluster upgrades):

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: checkout-api-pdb
  namespace: production
spec:
  minAvailable: 2        # always keep at least 2 pods running
  # maxUnavailable: 1    # or: allow at most 1 pod down at a time
  selector:
    matchLabels:
      app: checkout-api
```

Without PDB: `kubectl drain <node>` would evict all pods on the node simultaneously, causing downtime. With PDB: drain respects the budget, waiting for replacement pods to be ready before evicting the next one.

---

## Node Affinity and Scheduling

```yaml
spec:
  # Hard requirement: only schedule on nodes with GPU label
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: nvidia.com/gpu.present
                operator: In
                values: ["true"]

      # Soft preference: prefer nodes with label (but not required)
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 1
          preference:
            matchExpressions:
              - key: node.kubernetes.io/instance-type
                operator: In
                values: ["g4dn.xlarge"]

    # Pod anti-affinity: don't schedule on node that already has this pod
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: checkout-api
          topologyKey: kubernetes.io/hostname    # one per node
```

### Taints and Tolerations

Taints prevent pods from being scheduled on specific nodes unless they have a matching toleration:

```yaml
# Node taint (applied to the node)
# kubectl taint nodes gpu-node-1 nvidia.com/gpu=present:NoSchedule

# Pod toleration (applied to the pod)
spec:
  tolerations:
    - key: "nvidia.com/gpu"
      operator: "Equal"
      value: "present"
      effect: "NoSchedule"
```

Common use: taint GPU nodes so only GPU workloads are scheduled on them (protect expensive nodes from general workloads).

---

## Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout-api
  minReplicas: 2
  maxReplicas: 20

  metrics:
    # Scale on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60    # scale when avg CPU > 60% of request

    # Scale on custom metric (e.g., queue depth from Kafka)
    - type: Pods
      pods:
        metric:
          name: kafka_consumer_lag
        target:
          type: AverageValue
          averageValue: 1000        # scale when avg lag per pod > 1000

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5 min before scaling down
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60         # scale down max 25% per minute
    scaleUp:
      stabilizationWindowSeconds: 0    # scale up immediately
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15         # can double every 15 seconds
```

---

## Network Policies

NetworkPolicies control which pods can communicate with which. Default behavior: all pods can reach all pods. With network policies, you opt-in to permitted traffic.

```yaml
# Default deny all ingress — apply to every namespace in production
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}          # applies to all pods
  policyTypes:
    - Ingress              # ingress is now denied by default

---
# Allow ingress to checkout-api from frontend only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-checkout-from-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: checkout-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080

---
# Allow egress to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-checkout-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: checkout-api
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    # Also allow DNS (always needed)
    - to: []
      ports:
        - port: 53
          protocol: UDP
```

---

## Kustomize

Kustomize manages variations of manifests for different environments without duplicating files:

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── replica-patch.yaml
    └── production/
        ├── kustomization.yaml
        └── replica-patch.yaml
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml

# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../../base
patchesStrategicMerge:
  - replica-patch.yaml
images:
  - name: checkout-api
    newTag: sha256-abc123    # set specific image tag for this environment

# overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
spec:
  replicas: 10               # override base replicas for production
```

Build and apply: `kubectl apply -k overlays/production/`

---

## Common Failure Modes

**Pod stuck in Pending:** Not enough resources on any node. Check `kubectl describe pod <name>` for the Events section. Common messages: "Insufficient cpu", "Insufficient memory", "0/5 nodes are available: taint NoSchedule".

**OOMKilled:** Container exceeded memory limit. `kubectl describe pod` shows `OOMKilled: true`. Increase the memory limit or investigate memory leak in the application.

**CrashLoopBackOff:** Container crashes and Kubernetes restarts it with exponential backoff. `kubectl logs <pod> --previous` to see the last crash's logs. Usually an application startup error.

**ImagePullBackOff:** Image can't be pulled. Either image doesn't exist, tag is wrong, or registry credentials are missing/expired.

**Readiness probe failing, pod never receives traffic:** Probe is checking wrong endpoint, wrong port, or the app's health check is too strict (checking dependencies that aren't ready). Add `kubectl exec -it <pod> -- curl http://localhost:8080/ready` to diagnose.

**Eviction during node pressure:** Pod is BestEffort (no requests/limits) or Burstable, and node is under memory pressure. Set proper requests and limits, use Guaranteed QoS for critical workloads.

---

## Key Questions and Answers

**Q: What is the difference between resource requests and limits?**

Requests are what the scheduler uses to find a node — the pod is guaranteed this amount. Limits are the maximum the container can consume at runtime: CPU is throttled at the limit (not killed), memory triggers OOM kill when exceeded. A pod with `memory: requests=256Mi limits=512Mi` is guaranteed 256Mi but may use up to 512Mi. If it tries to use 513Mi, it's killed. Setting requests too low causes scheduling on nodes that can't actually handle the load; setting limits too tight causes unnecessary OOM kills.

**Q: When should you use a liveness probe vs a readiness probe?**

Readiness probe: use to signal "I'm not ready to serve traffic right now" — pod is running but waiting for a database connection, warming a cache, finishing startup initialization. The pod stays up but exits the Service's endpoint list until ready. Liveness probe: use only to signal "I'm stuck and cannot recover without a restart" — deadlock, corrupted in-memory state. The pod will be killed and restarted. Never use liveness probe to check external dependencies (database, downstream services) — if the database is down, restarting your pod won't fix it and just makes recovery harder.

**Q: What is a PodDisruptionBudget and why is it important?**

PDB sets minimum availability constraints for voluntary disruptions like node drains (for maintenance or cluster upgrades). Without PDB, `kubectl drain` evicts all pods on a node simultaneously. With `minAvailable: 2` on a 3-replica deployment, drain can only evict one pod at a time, waiting for a replacement to be ready before evicting the next. Critical for zero-downtime maintenance. Set PDBs for all production services with more than 1 replica.

**Q: How do you make a Deployment rollout and rollback work safely?**

Configure `rollingUpdate.maxUnavailable: 0` so pods are never removed before new ones are ready. Use `startupProbe` for slow-starting containers so they're not killed during init. Use readiness probes so new pods only receive traffic once healthy. Set a `terminationGracePeriodSeconds` appropriate to your longest in-flight request. For rollback: `kubectl rollout undo deployment/myapp` or set image back to previous version. Monitor with `kubectl rollout status deployment/myapp --timeout=5m`.

---

## Points to Remember

- Labels connect resources (Deployment selector → Pod labels → Service selector)
- Resources: requests for scheduling, limits for runtime cap; CPU throttled, memory kills
- Guaranteed QoS: requests == limits for memory (last to be evicted)
- Startup probe: for slow-starting containers; disables liveness until first success
- Readiness probe: remove from service when failing; use for dependency checks
- Liveness probe: restart when failing; only for truly dead-locked containers, not dependency failures
- PodDisruptionBudget: prevents evicting too many pods during node maintenance
- TopologySpreadConstraints: spread pods across AZs for fault tolerance
- Taints/tolerations: restrict which pods can run on which nodes (e.g., GPU nodes)
- NetworkPolicy: default deny + explicit allow = zero-trust pod networking
- Kustomize: manage environment-specific variations without copy-pasting manifests
- `readOnlyRootFilesystem: true` + `runAsNonRoot: true` + drop all capabilities = hardened container

## What to Study Next

- [Kubernetes Networking Deep Dive](./kubernetes-networking-deep-dive) — how Service networking works
- [Kubernetes GPU and AI Platforms](./kubernetes-gpu-ai-platforms-and-operators) — GPU-specific scheduling and configuration
- [CI/CD and Trusted Delivery](./cicd-trusted-delivery-and-platform-security) — deploying manifests via GitOps
