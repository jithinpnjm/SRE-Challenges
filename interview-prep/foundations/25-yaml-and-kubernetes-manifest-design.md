# Foundations: YAML And Kubernetes Manifest Design Zero To Hero

YAML is the language most Kubernetes users touch every day, but production-quality manifest design is much more than indentation.

A manifest is an operational contract: it tells Kubernetes what to run, how to run it, how to expose it, how to secure it, how to update it, and how to recover when things go wrong.

This guide is designed as a complete path:

- Beginner: YAML syntax and Kubernetes object structure
- Intermediate: Pods, Deployments, Services, ConfigMaps, Secrets, probes, resources
- Advanced: scheduling, rollout strategy, securityContext, NetworkPolicy, PDBs, HPA, Kustomize
- SRE Level: avoid outages caused by bad manifests
- Interview Level: explain safe production manifest design clearly

---

# Part 1: What YAML Is

YAML is a human-readable data format used for configuration.

Kubernetes manifests are YAML documents submitted to the API server.

Basic YAML building blocks:

```yaml
name: checkout
replicas: 3
enabled: true
ports:
  - 80
  - 443
labels:
  app: checkout
  team: payments
```

YAML uses indentation to express structure. Spaces matter.

---

# Part 2: YAML Gotchas

## Quote Risky Values

```yaml
version: "1.10"
port: "080"
value: "true"
```

Without quotes, parsers may interpret values as numbers or booleans.

## Lists

```yaml
containers:
  - name: app
    image: nginx
```

## Multi-Line Strings

```yaml
script: |
  echo starting
  echo done
```

## Multiple Documents

```yaml
---
apiVersion: v1
kind: Service
---
apiVersion: apps/v1
kind: Deployment
```

---

# Part 3: Kubernetes Object Anatomy

Most Kubernetes objects follow this shape:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
  labels:
    app: api
spec:
  replicas: 3
```

| Field | Meaning |
|---|---|
| apiVersion | API group/version |
| kind | object type |
| metadata | name, namespace, labels, annotations |
| spec | desired state |
| status | observed state, written by controllers |

You normally write `spec`; Kubernetes writes `status`.

---

# Part 4: Labels, Selectors, And Annotations

Labels connect objects.

Service selector matches Pod labels.
Deployment selector matches Pod template labels.

```yaml
selector:
  matchLabels:
    app: checkout
```

Common production mistake:

> Service selector does not match Pod labels, so Service has no endpoints.

Annotations store metadata for tools/controllers.

Examples:

- ingress controller options
- Prometheus scrape hints
- rollout metadata

---

# Part 5: Pod Manifest

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  labels:
    app: api
spec:
  containers:
    - name: api
      image: nginx:1.25
      ports:
        - containerPort: 80
```

Pods are useful for learning, but production workloads usually use Deployments, StatefulSets, Jobs, or DaemonSets.

---

# Part 6: Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: checkout-api
    spec:
      containers:
        - name: checkout-api
          image: registry.example.com/checkout-api:v1.2.3
          ports:
            - name: http
              containerPort: 8080
```

Important:

- selector must match template labels
- image should be immutable/tagged safely
- rollout strategy affects availability

---

# Part 7: Service Manifest

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout-api
spec:
  type: ClusterIP
  selector:
    app: checkout-api
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

`port` is what callers use.
`targetPort` is where the container listens.

If `targetPort` is wrong, Service exists but traffic fails.

---

# Part 8: ConfigMaps And Secrets

## ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: checkout-config
data:
  LOG_LEVEL: "info"
  DB_HOST: "postgres.production.svc.cluster.local"
```

## Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: checkout-secret
type: Opaque
stringData:
  DB_PASSWORD: "example"
```

Secrets are base64-encoded in Kubernetes, not automatically safe by default.

Production guidance:

- enable encryption at rest
- restrict RBAC
- avoid logging secrets
- prefer external secret managers where appropriate

---

# Part 9: Environment Variables And Volumes

```yaml
env:
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: checkout-config
        key: LOG_LEVEL
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: checkout-secret
        key: DB_PASSWORD
```

Config can also be mounted as files.

```yaml
volumes:
  - name: config
    configMap:
      name: checkout-config
volumeMounts:
  - name: config
    mountPath: /etc/app
    readOnly: true
```

---

# Part 10: Probes

| Probe | Purpose |
|---|---|
| startupProbe | app has finished starting |
| readinessProbe | app can receive traffic |
| livenessProbe | app is stuck and should restart |

Readiness is for traffic.
Liveness is for restart.
Startup protects slow-starting apps.

Bad pattern:

> Liveness probe checks database connectivity, causing restart storms when DB is down.

---

# Part 11: Resource Requests And Limits

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1"
    memory: "512Mi"
```

Requests affect scheduling.
Limits affect runtime enforcement.

Important:

- CPU limit causes throttling
- memory limit causes OOMKill
- missing requests cause poor scheduling
- requests too low create noisy-neighbor behavior

---

# Part 12: Security Context

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
```

Production goal:

- non-root
- minimal Linux capabilities
- no privilege escalation
- read-only root filesystem where practical

---

# Part 13: Scheduling Controls

## nodeSelector

```yaml
nodeSelector:
  nodepool: general
```

## Taints And Tolerations

```yaml
tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
```

## Affinity

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: checkout-api
          topologyKey: kubernetes.io/hostname
```

Use these to control placement and resilience.

---

# Part 14: Topology Spread

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: checkout-api
```

This spreads replicas across zones or nodes.

Useful for fault tolerance.

---

# Part 15: PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: checkout-api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: checkout-api
```

PDB protects workloads during voluntary disruptions like node drains.

---

# Part 16: HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

HPA depends on resource requests and metrics.

No CPU request often means CPU utilization-based HPA cannot work correctly.

---

# Part 17: NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080
```

Remember to allow DNS when using egress deny policies.

---

# Part 18: Kustomize And Overlays

Use Kustomize to avoid copy-pasting manifests across environments.

```text
base/
  deployment.yaml
  service.yaml
  kustomization.yaml
overlays/
  dev/
  prod/
```

```bash
kubectl apply -k overlays/prod
```

Base holds common config. Overlay applies environment-specific changes.

---

# Part 19: Validation And Review

Useful tools:

```bash
kubectl apply --dry-run=server -f file.yaml
kubectl diff -f file.yaml
kubectl explain deployment.spec.template.spec.containers
kubeconform manifest.yaml
kube-score score manifest.yaml
conftest test manifest.yaml
```

Review checklist:

- selectors match labels
- image tag is safe
- probes are correct
- requests/limits exist
- securityContext is hardened
- rollout strategy is safe
- PDB exists for replicated services
- config/secrets are separated

---

# Part 20: Real Incident Stories

## Service Has No Endpoints

Cause:

- selector mismatch

Fix:

- compare Service selector with Pod labels

```bash
kubectl describe svc api
kubectl get pods --show-labels
kubectl get endpointslice
```

## Deployment Rollout Hangs

Causes:

- readiness probe failing
- maxUnavailable too strict with insufficient capacity
- image pull failure

## App Restart Storm

Cause:

- liveness probe checks external dependency

Fix:

- move dependency check to readiness

## Pods Evicted During Node Maintenance

Cause:

- missing PDB

Fix:

- add PDB and enough replicas

---

# Part 21: Anti-Patterns

Avoid:

- `image: latest`
- no resource requests
- liveness checking database
- root containers by default
- no readiness probe
- Service selector too broad
- secrets committed in plain text
- huge manifests copied between environments
- no PDB for critical replicated services

---

# Part 22: Interview Questions

- What fields are required in a Kubernetes object?
- Why do labels and selectors matter?
- Requests vs limits?
- Readiness vs liveness?
- Why is `latest` dangerous?
- How does a bad manifest cause outage?
- What should every production Deployment include?
- How would you review a Kubernetes manifest PR?

---

# Part 23: Senior Answer Shape

> I review Kubernetes manifests as operational contracts. I check whether selectors match labels, rollout settings preserve availability, probes distinguish traffic readiness from process death, resources support scheduling and prevent noisy-neighbor behavior, security contexts reduce runtime privilege, and disruption budgets protect maintenance events. A manifest is production-ready only when it defines not just what to run, but how the workload behaves during failure, rollout, and recovery.

---

# Recall Prompts

- Why can a Service exist but have no endpoints?
- Why does HPA need requests?
- Why should liveness not depend on database health?
- What does PDB protect against?
- Why are manifests operational contracts?
