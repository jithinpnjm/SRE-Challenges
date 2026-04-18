---
title: "AIOPS 01 Alertmanager Webhook Receiver"
description: "AIOPS 01 Alertmanager Webhook Receiver"
slug: "/aiops-01-alertmanager-webhook-receiver"
---

# AIOPS-01: Add Alertmanager Webhook Receiver for AI Enrichment

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 1
**Type:** Configuration
**Risk:** Low — the existing `default-receiver` is preserved as a fallback; both routes run in parallel
**Estimated effort:** 2 hours
**Dependencies:** None (first task in the chain)

---

## Objective

Add a second receiver (`ai-enricher`) and a child route to the Alertmanager configuration so that the 5 pilot alerts are forwarded to the `ai-alert-router` webhook in addition to the existing `#allex-staging-alerts-k8s` Slack channel. The existing alert delivery path is not modified — it stays active throughout the pilot. Engineers will see alerts in both places during the pilot period.

---

## Prerequisites

- Access to merge PRs into this GitOps repo (FluxCD reconciles on merge to `master`)
- The `ai-alert-router` service is deployed and its webhook endpoint is reachable at `http://ai-alert-router.monitoring.svc.cluster.local:3000/webhook/alertmanager` (AIOPS-05 must be complete before the webhook actually processes anything, but the receiver config can be committed in advance — Alertmanager will retry failed webhooks)
- Familiarity with the ExternalSecret template pattern described below

---

## Background

### How the Alertmanager config is managed in this repo

The Alertmanager configuration is **not** stored as a plain Kubernetes ConfigMap or Secret. Instead, it uses the ExternalSecrets Operator pattern:

**File:** `kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml` (`../../kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml`)

This file is an `ExternalSecret` resource. The External Secrets Operator (ESO) reads it, fetches the Slack webhook URL from GCP Secret Manager (key: `allex-secret-slack-alerts-webhook-url`, store: `gcp-backend`), and renders it into a Kubernetes `Secret` named `alertmanager-prom-stack-secret` in the `monitoring` namespace.

The rendered secret contains a single key `alertmanager.yaml` whose value is the full Alertmanager configuration. The `alertmanager.yaml` content is defined **inline in the ExternalSecret template** using Go templating — `{{ .webhookUrl }}` is replaced at render time with the actual Slack webhook URL fetched from GCP.

**Important:** Because the entire `alertmanager.yaml` content lives inside the ExternalSecret template, you edit the Alertmanager config by editing the `alertmanager-prom-stack-secret.yaml` ExternalSecret, not by editing a separate file.

### Current routing topology

```
route (group_by: namespace, repeat_interval: 12h)
├── receiver: default-receiver (slack → #allex-staging-alerts-k8s)
└── child route:
    └── receiver: dead-mans-switch (matches: Watchdog, InfoInhibitor)
```

### Target routing topology (after this task)

```
route (group_by: namespace, repeat_interval: 12h)
├── receiver: default-receiver (slack → #allex-staging-alerts-k8s)  ← UNCHANGED
└── child routes:
    ├── receiver: dead-mans-switch (matches: Watchdog, InfoInhibitor)  ← UNCHANGED
    └── receiver: ai-enricher (webhook → ai-alert-router)  ← NEW
        matches: alertname IN (pilot 5 alerts)
        continue: true  ← ensures default-receiver still fires
```

The `continue: true` flag on the new child route is critical. Without it, Alertmanager would stop routing after the first matching route, which would suppress the existing Slack delivery.

---

## Implementation Steps

### Step 1: Edit the ExternalSecret file

Open `kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml` (`../../kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml`) and apply the following changes.

**Before (current state):**

```yaml
          receivers:
            - name: default-receiver
              slack_configs:
                - channel: "#allex-staging-alerts-k8s"
                  send_resolved: true
                  api_url: {{ .webhookUrl }}
                  text: |-
                    {{ "{{- range .Alerts }}" }}
                    {{ "*Alert:* {{ .Annotations.summary }}" }}
                    {{ "{{- with .Annotations.impact }}" }}
                    {{ "*Impact:* {{ . }}" }}
                    {{ "{{- end }}" }}
                    {{ "{{- with .Annotations.description }}" }}
                    {{ "*Description:* {{ . }}" }}
                    {{ "{{- end }}" }}
                    {{ "*Details:*" }}
                    {{ "{{- if .Annotations.detail }}" }}
                    {{ "- {{ .Annotations.detail }}" }}
                    {{ "{{- else }}" }}
                    {{ "{{- range .Labels.SortedPairs }}" }}
                    {{ "- *{{ .Name }}:* `{{ .Value }}`" }}
                    {{ "{{- end }}" }}
                    {{ "{{- end }}" }}
                    {{ "{{- end }}" }}
            - name: dead-mans-switch
          route:
            group_by: ['namespace']
            group_wait: 30s
            group_interval: 5m
            repeat_interval: 12h
            receiver: 'default-receiver'
            routes:
            - receiver: 'dead-mans-switch'
              matchers:
                - alertname =~ "InfoInhibitor|Watchdog"
```

**After (with ai-enricher added):**

```yaml
          receivers:
            - name: default-receiver
              slack_configs:
                - channel: "#allex-staging-alerts-k8s"
                  send_resolved: true
                  api_url: {{ .webhookUrl }}
                  text: |-
                    {{ "{{- range .Alerts }}" }}
                    {{ "*Alert:* {{ .Annotations.summary }}" }}
                    {{ "{{- with .Annotations.impact }}" }}
                    {{ "*Impact:* {{ . }}" }}
                    {{ "{{- end }}" }}
                    {{ "{{- with .Annotations.description }}" }}
                    {{ "*Description:* {{ . }}" }}
                    {{ "{{- end }}" }}
                    {{ "*Details:*" }}
                    {{ "{{- if .Annotations.detail }}" }}
                    {{ "- {{ .Annotations.detail }}" }}
                    {{ "{{- else }}" }}
                    {{ "{{- range .Labels.SortedPairs }}" }}
                    {{ "- *{{ .Name }}:* `{{ .Value }}`" }}
                    {{ "{{- end }}" }}
                    {{ "{{- end }}" }}
                    {{ "{{- end }}" }}
            - name: dead-mans-switch
            - name: ai-enricher
              webhook_configs:
                - url: 'http://ai-alert-router.monitoring.svc.cluster.local:3000/webhook/alertmanager'
                  send_resolved: true
                  http_config:
                    follow_redirects: true
                  max_alerts: 0
          route:
            group_by: ['namespace']
            group_wait: 30s
            group_interval: 5m
            repeat_interval: 12h
            receiver: 'default-receiver'
            routes:
            - receiver: 'dead-mans-switch'
              matchers:
                - alertname =~ "InfoInhibitor|Watchdog"
            - receiver: 'ai-enricher'
              continue: true
              matchers:
                - alertname =~ "KubernetesPodCrashLooping|RedisDown|RedisRejectedConnections|FailedAsyncJobs|TooManyPendingMessagesNotifications"
```

### Step 2: Understanding the full diff in context

The complete updated ExternalSecret file should look like this:

```yaml
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: external-secret-alertmanager-prom-stack-secret
  namespace: monitoring
spec:
  secretStoreRef:
    kind: ClusterSecretStore
    name: gcp-backend
  refreshInterval: "0"
  target:
    name: alertmanager-prom-stack-secret
    creationPolicy: 'Owner'
    deletionPolicy: 'Retain'
    template:
      type: Opaque
      data:
        alertmanager.yaml: |
          global:
            resolve_timeout: 5m
          inhibit_rules:
            - source_matchers:
                - 'severity = critical'
              target_matchers:
                - 'severity =~ warning|info'
              equal:
                - 'namespace'
                - 'alertname'
            - source_matchers:
                - 'severity = warning'
              target_matchers:
                - 'severity = info'
              equal:
                - 'namespace'
                - 'alertname'
            - source_matchers:
                - 'alertname = InfoInhibitor'
              target_matchers:
                - 'severity = info'
              equal:
                - 'namespace'
          receivers:
            - name: default-receiver
              slack_configs:
                - channel: "#allex-staging-alerts-k8s"
                  send_resolved: true
                  api_url: {{ .webhookUrl }}
                  text: |-
                    {{ "{{- range .Alerts }}" }}
                    {{ "*Alert:* {{ .Annotations.summary }}" }}
                    {{ "{{- with .Annotations.impact }}" }}
                    {{ "*Impact:* {{ . }}" }}
                    {{ "{{- end }}" }}
                    {{ "{{- with .Annotations.description }}" }}
                    {{ "*Description:* {{ . }}" }}
                    {{ "{{- end }}" }}
                    {{ "*Details:*" }}
                    {{ "{{- if .Annotations.detail }}" }}
                    {{ "- {{ .Annotations.detail }}" }}
                    {{ "{{- else }}" }}
                    {{ "{{- range .Labels.SortedPairs }}" }}
                    {{ "- *{{ .Name }}:* `{{ .Value }}`" }}
                    {{ "{{- end }}" }}
                    {{ "{{- end }}" }}
                    {{ "{{- end }}" }}
            - name: dead-mans-switch
            - name: ai-enricher
              webhook_configs:
                - url: 'http://ai-alert-router.monitoring.svc.cluster.local:3000/webhook/alertmanager'
                  send_resolved: true
                  http_config:
                    follow_redirects: true
                  max_alerts: 0
          route:
            group_by: ['namespace']
            group_wait: 30s
            group_interval: 5m
            repeat_interval: 12h
            receiver: 'default-receiver'
            routes:
            - receiver: 'dead-mans-switch'
              matchers:
                - alertname =~ "InfoInhibitor|Watchdog"
            - receiver: 'ai-enricher'
              continue: true
              matchers:
                - alertname =~ "KubernetesPodCrashLooping|RedisDown|RedisRejectedConnections|FailedAsyncJobs|TooManyPendingMessagesNotifications"
  data:
  - secretKey: webhookUrl
    remoteRef:
      key: allex-secret-slack-alerts-webhook-url
```

### Step 3: Commit and push

```bash
git add kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml
git commit -m "feat(aiops): add ai-enricher webhook receiver and pilot alert route to Alertmanager"
git push origin master
```

### Step 4: Wait for FluxCD to reconcile

FluxCD polls the Git repository every 5 minutes. The ExternalSecret will be updated, which triggers the ESO to re-render the `alertmanager-prom-stack-secret` Kubernetes Secret. Alertmanager then reloads its configuration automatically.

```bash
# Watch Flux reconcile the secret
kubectl get kustomization -n flux-system -w

# Watch ExternalSecret sync status
kubectl get externalsecret -n monitoring external-secret-alertmanager-prom-stack-secret -w
```

---

## Verification

### Check that the ExternalSecret has synced

```bash
kubectl get externalsecret -n monitoring external-secret-alertmanager-prom-stack-secret -o jsonpath='{.status.conditions[0]}'
```

Expected output: `{"lastTransitionTime":"...","message":"Secret was synced","reason":"SecretSynced","status":"True","type":"Ready"}`

### Check that the Alertmanager secret contains the new receiver

```bash
kubectl get secret -n monitoring alertmanager-prom-stack-secret -o jsonpath='{.data.alertmanager\.yaml}' | base64 -d
```

Confirm you see `name: ai-enricher` in the output.

### Check Alertmanager has loaded the new config

```bash
# Port-forward to Alertmanager
kubectl port-forward -n monitoring svc/prometheus-operated 9093:9093 &

# Check the config endpoint
curl -s http://localhost:9093/api/v2/status | python3 -m json.tool | grep -A5 "ai-enricher"
```

### Validate the config using amtool

```bash
# Download amtool from the Alertmanager release matching your cluster version, then:
kubectl get secret -n monitoring alertmanager-prom-stack-secret -o jsonpath='{.data.alertmanager\.yaml}' | base64 -d > /tmp/alertmanager.yaml
amtool check-config /tmp/alertmanager.yaml
```

Expected: `Checking '/tmp/alertmanager.yaml' SUCCESS`

### Send a test webhook payload to verify routing

Once `ai-alert-router` is deployed (AIOPS-05), test that the child route is firing correctly:

```bash
# Trigger a test alert via amtool
kubectl port-forward -n monitoring svc/prometheus-operated 9093:9093 &

amtool --alertmanager.url=http://localhost:9093 alert add \
  alertname=KubernetesPodCrashLooping \
  severity=warning \
  namespace=allex-notifications \
  pod=test-pod-123

# Or send a raw POST directly to Alertmanager's API
curl -s -X POST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "KubernetesPodCrashLooping",
      "severity": "warning",
      "namespace": "allex-notifications",
      "pod": "test-pod-123"
    },
    "annotations": {
      "summary": "Test pod crash looping"
    },
    "generatorURL": "http://prometheus.monitoring:9090"
  }]'
```

Then check `ai-alert-router` logs:

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=50
```

---

## Rollback

If the Alertmanager config change causes issues (e.g., ESO fails to re-render the secret, or Alertmanager rejects the config):

1. Revert the commit:
   ```bash
   git revert HEAD
   git push origin master
   ```

2. If FluxCD has already applied the broken ExternalSecret and Alertmanager is not receiving alerts, manually restore the previous secret content:
   ```bash
   # Get the previous version of the secret and re-apply
   kubectl rollout undo deployment -n monitoring prometheus-alertmanager
   ```

3. Verify the config is valid again using the amtool command above.

**Risk assessment:** The `default-receiver` route is not modified in any way. Even if the `ai-enricher` receiver fails to register (e.g., syntax error in the ExternalSecret template), the ESO will refuse to update the secret and the previous valid config will remain in place. Alertmanager will not apply an invalid configuration.

---

## Acceptance Criteria

- [ ] ExternalSecret `external-secret-alertmanager-prom-stack-secret` shows `Ready: True` after the change
- [ ] `kubectl get secret -n monitoring alertmanager-prom-stack-secret -o jsonpath='{.data.alertmanager\.yaml}' | base64 -d` contains `name: ai-enricher` and the regex matcher for the 5 pilot alertnames
- [ ] `amtool check-config` passes on the rendered alertmanager.yaml
- [ ] Test alert `KubernetesPodCrashLooping` appears in `#allex-staging-alerts-k8s` (proving `continue: true` works)
- [ ] Test alert `KubernetesPodCrashLooping` also triggers a webhook call to `ai-alert-router` (visible in pod logs)
- [ ] An alert NOT in the pilot list (e.g., `RedisMissingMaster`) does NOT appear in `ai-alert-router` logs
- [ ] No existing alerts were lost or delayed during the config reload

