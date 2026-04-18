# AIOPS-05: Deploy ai-alert-router to GKE via FluxCD

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 1
**Type:** Infrastructure
**Risk:** Medium — new workload in the `monitoring` namespace; misconfiguration could affect monitoring stack stability
**Estimated effort:** 3 hours
**Dependencies:** AIOPS-03 (ConfigMap must exist), AIOPS-04 (service image must be published to Artifact Registry)

---

## Objective

Deploy the `ai-alert-router` service to the GKE staging cluster by adding the necessary GitOps manifests to this repository. FluxCD will reconcile the HelmRelease and deploy the service to the `monitoring` namespace alongside Prometheus and Alertmanager. After this task, the service will be running in shadow mode and able to receive test webhook payloads from Alertmanager.

---

## Prerequisites

- AIOPS-03 complete: `ai-alert-router-team-ownership` ConfigMap merged to `master`
- AIOPS-04 complete: Service code built, Docker image pushed to `europe-west3-docker.pkg.dev/allex-artifacts/allex-artifacts-docker/ai-alert-router` with at least one `dev-*` tagged image
- AIOPS-06 complete (or at least the ExternalSecrets filed): The service depends on secrets from AIOPS-06 only for Phase 2, but the deployment YAML references them. If AIOPS-06 is not done yet, deploy without the secret volume mounts and add them later.
- Access to merge to `master` branch of this GitOps repo
- The `monitoring` namespace exists and hosts the monitoring stack

---

## Background

### Namespace

The `ai-alert-router` runs in the existing `monitoring` namespace. No new namespace is needed. The service is internal-only (no Ambassador/Ingress mapping) — it only needs to be reachable by Alertmanager within the cluster, via the Kubernetes Service DNS name `ai-alert-router.monitoring.svc.cluster.local:3000`.

### Node pool

All monitoring workloads run on the `monitoring-stack` node pool. Match this with a toleration and nodeSelector on the Pod spec to ensure the service lands on the correct nodes.

### FluxCD pattern

This deployment follows exactly the same pattern as the `allex-ai-assistant` service:
- A `GitRepository` source (pointing at the service's GitHub repo)
- A `HelmRelease` using a chart embedded in the service repo (`./charts/ai-alert-router/`)
- An `ImageRepository` + `ImagePolicy` in `flux-system` for automated image tag updates
- A `FluxCD Alert` watching the HelmRelease for deployment notifications

Reference files:
- [`kubernetes-resources/releases/allex-ai-assistant/ai-assistant.helm-release.yaml`](../../kubernetes-resources/releases/allex-ai-assistant/ai-assistant.helm-release.yaml)
- [`kubernetes-resources/releases/allex-ai-assistant/fluxcd-helmrelese-alert.yaml`](../../kubernetes-resources/releases/allex-ai-assistant/fluxcd-helmrelese-alert.yaml)

---

## Implementation Steps

All files below go into the directory `kubernetes-resources/releases/monitoring/ai-alert-router/` which you created in AIOPS-03.

### File 1: HelmRelease

Create `kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml`:

```yaml
---
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: ai-alert-router
  namespace: monitoring
  annotations:
    fluxcd.io/automated: "true"
spec:
  interval: 5m
  releaseName: ai-alert-router
  chart:
    spec:
      chart: ./charts/ai-alert-router
      sourceRef:
        kind: GitRepository
        name: allex-ai-alert-router
        namespace: flux-system
      interval: 5m
  values:
    replicaCount: 1
    image:
      repository: europe-west3-docker.pkg.dev/allex-artifacts/allex-artifacts-docker/ai-alert-router
      tag: dev-20260407120000-0000000000000000000000000000000000000000 #{"$imagepolicy": "flux-system:allex-ai-alert-router:tag"}
      pullPolicy: IfNotPresent
    imagePullSecrets:
      - name: artifact-access
    podLabels:
      environment: staging
      app.kubernetes.io/name: ai-alert-router
      app.kubernetes.io/component: alert-enrichment
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    tolerations:
      - key: nodepool_type
        operator: Equal
        value: monitoring-stack
        effect: NoSchedule
    nodeSelector:
      nodepool_type: monitoring-stack
    env:
      - name: PORT
        value: "3000"
      - name: LOG_LEVEL
        value: "info"
      - name: SHADOW_MODE
        value: "true"
      - name: PILOT_MODE
        value: "true"
      - name: TEAMS_CONFIG_PATH
        value: "/config/teams.yaml"
    volumeMounts:
      - name: team-ownership-config
        mountPath: /config/teams.yaml
        subPath: teams.yaml
        readOnly: true
    volumes:
      - name: team-ownership-config
        configMap:
          name: ai-alert-router-team-ownership
    service:
      name: ai-alert-router
      port: 3000
      targetPort: 3000
      type: ClusterIP
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3
    podDisruptionBudget:
      minAvailable: 1
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: allex-ai-alert-router
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/actano/allex-ai-alert-router
  secretRef:
    name: ssh-key
  ref:
    branch: dev
```

### File 2: FluxCD Alert for HelmRelease notifications

Create `kubernetes-resources/releases/monitoring/ai-alert-router/fluxcd-alert.yaml`:

```yaml
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: ai-alert-router-fluxcd-hr-alert
  namespace: flux-system
spec:
  summary: "Allex Staging Cluster"
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: '*'
      namespace: monitoring
```

### File 3: ImageRepository and ImagePolicy (in flux-system namespace)

Create `kubernetes-resources/releases/monitoring/ai-alert-router/imagerepository.yaml`:

```yaml
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: allex-ai-alert-router
  namespace: flux-system
spec:
  image: europe-west3-docker.pkg.dev/allex-artifacts/allex-artifacts-docker/ai-alert-router
  interval: 5m
  secretRef:
    name: artifact-access
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: allex-ai-alert-router
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: allex-ai-alert-router
  filterTags:
    pattern: '^dev-(?P<timestamp>\d{14})-.*'
    extract: '$timestamp'
  policy:
    alphabetical:
      order: asc
```

### Step 4: Commit and push all files

```bash
git add \
  kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml \
  kubernetes-resources/releases/monitoring/ai-alert-router/fluxcd-alert.yaml \
  kubernetes-resources/releases/monitoring/ai-alert-router/imagerepository.yaml

git commit -m "feat(aiops): deploy ai-alert-router to monitoring namespace via FluxCD"
git push origin master
```

### Step 5: Create the Helm chart in the service repo

In the `allex-ai-alert-router` service repository, create a minimal Helm chart at `charts/ai-alert-router/`. The chart needs to render a Deployment, Service, and optionally a PodDisruptionBudget from the `values.yaml` keys defined in the HelmRelease above.

Minimum required chart files:
```
charts/ai-alert-router/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    └── pdb.yaml
```

`Chart.yaml`:
```yaml
apiVersion: v2
name: ai-alert-router
description: AI-powered alert enrichment and routing service
type: application
version: 0.1.0
appVersion: "1.0.0"
```

The chart templates should follow the same pattern as the `ai-assistant` chart. Key points:
- The `deployment.yaml` must iterate over `values.volumeMounts` and `values.volumes`
- The `deployment.yaml` must render `values.env` as environment variables
- The `deployment.yaml` must apply `values.tolerations` and `values.nodeSelector`
- The `service.yaml` must expose port 3000 as `ClusterIP`

---

## Verification

### Check Flux reconciles the GitRepository

```bash
# Watch for the GitRepository to sync
kubectl get gitrepository -n flux-system allex-ai-alert-router -w
```

Wait for `READY: True` and `STATUS: stored artifact for revision 'dev@sha1:...'`

### Check the HelmRelease deploys successfully

```bash
kubectl get helmrelease -n monitoring ai-alert-router -w
```

Wait for `READY: True` and `STATUS: Release reconciliation succeeded`

```bash
# Get more detail if it fails
kubectl describe helmrelease -n monitoring ai-alert-router
```

### Check the pod is running

```bash
kubectl get pod -n monitoring -l app.kubernetes.io/name=ai-alert-router
```

Expected output:
```
NAME                               READY   STATUS    RESTARTS   AGE
ai-alert-router-7d9f8c6b5-xxxxx    1/1     Running   0          2m
```

### Check pod logs

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=20
```

Expected log lines:
```json
{"event":"service_starting","service":"ai-alert-router","port":3000,"shadow_mode":true}
{"event":"service_started","port":3000}
```

### Check the health endpoint from within the cluster

```bash
kubectl run -it --rm debug --image=curlimages/curl:latest --restart=Never -n monitoring -- \
  curl -s http://ai-alert-router.monitoring.svc.cluster.local:3000/health
```

Expected response: `{"status":"ok","service":"ai-alert-router",...}`

### Check ConfigMap is mounted correctly

```bash
kubectl exec -n monitoring \
  $(kubectl get pod -n monitoring -l app.kubernetes.io/name=ai-alert-router -o jsonpath='{.items[0].metadata.name}') \
  -- cat /config/teams.yaml | head -10
```

Expected: YAML content starting with `fallback_channel:`

### Verify ImagePolicy is watching the registry

```bash
kubectl get imagepolicy -n flux-system allex-ai-alert-router
```

Expected: `READY: True` and a `LATESTIMAGE` value.

### Send a test webhook from Alertmanager to the service

```bash
# Port-forward Alertmanager
kubectl port-forward -n monitoring svc/prometheus-operated 9093:9093 &

# Fire a test alert matching the pilot route
curl -s -X POST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "RedisDown",
      "severity": "critical",
      "namespace": "allex-redis",
      "team": "platform",
      "service": "redis"
    },
    "annotations": {"summary": "Redis is down - test"},
    "generatorURL": "http://prometheus.monitoring:9090"
  }]'

# Wait ~30s for Alertmanager to fire (group_wait), then check logs
sleep 35
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=20
```

---

## Rollback

If the HelmRelease fails or the pod is crashing and causing issues in the `monitoring` namespace:

```bash
# Option 1: Suspend the HelmRelease via GitOps
# Edit helm-release.yaml and add spec.suspend: true, then commit

# Option 2: Immediate suspension via kubectl
kubectl patch helmrelease -n monitoring ai-alert-router \
  --type='merge' \
  -p '{"spec":{"suspend":true}}'

# Option 3: Delete the pod (it will restart from the HelmRelease — only do this for transient issues)
kubectl delete pod -n monitoring -l app.kubernetes.io/name=ai-alert-router

# Option 4: Full removal — remove the files from the GitOps repo and let Flux clean up
git rm kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml
git rm kubernetes-resources/releases/monitoring/ai-alert-router/fluxcd-alert.yaml
git commit -m "revert(aiops): remove ai-alert-router HelmRelease"
git push origin master
```

The Alertmanager webhook receiver added in AIOPS-01 will continue to try to call the webhook URL. If the service is down, Alertmanager will log webhook failures but will still deliver alerts to `#allex-staging-alerts-k8s` via the `default-receiver` route. **No alert loss will occur.**

---

## Acceptance Criteria

- [ ] `kubectl get gitrepository -n flux-system allex-ai-alert-router` shows `READY: True`
- [ ] `kubectl get helmrelease -n monitoring ai-alert-router` shows `READY: True`
- [ ] `kubectl get pod -n monitoring -l app.kubernetes.io/name=ai-alert-router` shows `1/1 Running`
- [ ] Pod is running on a node in the `monitoring-stack` node pool (`kubectl get pod -n monitoring -l app.kubernetes.io/name=ai-alert-router -o wide` — node name should include `monitoring`)
- [ ] `GET /health` from within the cluster returns HTTP 200
- [ ] `/config/teams.yaml` is mounted and readable inside the pod
- [ ] Test webhook payload logged as `event: alert_processed` with correct `team` and `target_channel`
- [ ] `kubectl get imagepolicy -n flux-system allex-ai-alert-router` shows `READY: True`
- [ ] No error logs in the pod within 5 minutes of startup
