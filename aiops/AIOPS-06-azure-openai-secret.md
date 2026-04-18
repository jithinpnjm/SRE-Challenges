# AIOPS-06: Create ExternalSecrets for Azure OpenAI and Slack Webhook

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 1
**Type:** Configuration
**Risk:** Low — new secrets only; no existing secrets modified
**Estimated effort:** 1 hour
**Dependencies:** None (can be done in parallel with other Week 1 tasks)

---

## Objective

Create two `ExternalSecret` resources in the `monitoring` namespace so that the `ai-alert-router` service can access Azure OpenAI credentials and the Slack webhook URL at runtime. Both secrets already exist in GCP Secret Manager — no new GCP secrets need to be created. This task only creates the Kubernetes ExternalSecret manifests that instruct the External Secrets Operator to materialise them in the cluster.

---

## Prerequisites

- External Secrets Operator is running and the `gcp-backend` ClusterSecretStore is healthy
- GCP Secret Manager key `allex-secret-azure-ai-key-staging` exists and has a value (verify by checking the `allex-ai-assistant` namespace — it uses the same key)
- GCP Secret Manager key `allex-secret-slack-alerts-webhook-url` exists (it is already used by Alertmanager)
- Access to merge to `master` branch of this GitOps repo

---

## Background

### How ExternalSecrets work in this repo

The External Secrets Operator (ESO) watches `ExternalSecret` resources. When it sees one, it:
1. Connects to the referenced `ClusterSecretStore` (in this case `gcp-backend` — a GCP Secret Manager backend)
2. Fetches the secret value(s) from GCP using the `remoteRef.key`
3. Renders the value into a Kubernetes `Secret` using the `template` block
4. Sets `refreshInterval: "0"` means the secret is fetched once and not refreshed unless the ExternalSecret is deleted and re-created (suitable for API keys that rarely rotate)

Reference existing usage in this repo:
- Azure OpenAI pattern: [`kubernetes-resources/secrets/allex-ai-assistant/azure-openai-credentials.yaml`](../../kubernetes-resources/secrets/allex-ai-assistant/azure-openai-credentials.yaml)
- Slack webhook pattern: [`kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml`](../../kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml)

### No new GCP secrets required

| GCP Secret Key | Used by | Purpose |
|---|---|---|
| `allex-secret-azure-ai-key-staging` | `allex-ai-assistant` (existing) | Azure OpenAI API key |
| `allex-secret-slack-alerts-webhook-url` | Alertmanager (existing) | Slack incoming webhook URL |

Both keys are reused. The only new thing is the ExternalSecret Kubernetes resource in the `monitoring` namespace that references them.

### How the service reads these secrets

The `ai-alert-router` service reads secrets from environment variables injected by Kubernetes:

```yaml
env:
  - name: AZURE_OPENAI_API_KEY
    valueFrom:
      secretKeyRef:
        name: azure-openai-credentials
        key: apiKey
  - name: SLACK_WEBHOOK_URL
    valueFrom:
      secretKeyRef:
        name: ai-alert-router-slack-webhook
        key: webhookUrl
```

Add these env var references to the HelmRelease values in AIOPS-05 once the secrets are created.

---

## Implementation Steps

### Step 1: Create the secrets directory

```bash
mkdir -p kubernetes-resources/secrets/monitoring/ai-alert-router
```

### Step 2: Create the Azure OpenAI ExternalSecret

Create `kubernetes-resources/secrets/monitoring/ai-alert-router/azure-openai-credentials.yaml`:

```yaml
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: external-secret-azure-openai-credentials-ai-alert-router
  namespace: monitoring
spec:
  secretStoreRef:
    kind: ClusterSecretStore
    name: gcp-backend
  refreshInterval: "0"
  target:
    name: azure-openai-credentials
    creationPolicy: 'Owner'
    deletionPolicy: 'Retain'
    template:
      type: Opaque
      data:
        apiKey: "{{ .apiKey }}"
  data:
  - secretKey: apiKey
    remoteRef:
      key: allex-secret-azure-ai-key-staging
```

> **Note:** The target secret name `azure-openai-credentials` matches the name used by `allex-ai-assistant`. If both namespaces need the same GCP secret, using the same logical secret name in both namespaces is intentional — each namespace has its own independent Kubernetes Secret object.

### Step 3: Create the Slack Webhook ExternalSecret

Create `kubernetes-resources/secrets/monitoring/ai-alert-router/slack-webhook.yaml`:

```yaml
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: external-secret-slack-webhook-ai-alert-router
  namespace: monitoring
spec:
  secretStoreRef:
    kind: ClusterSecretStore
    name: gcp-backend
  refreshInterval: "0"
  target:
    name: ai-alert-router-slack-webhook
    creationPolicy: 'Owner'
    deletionPolicy: 'Retain'
    template:
      type: Opaque
      data:
        webhookUrl: "{{ .webhookUrl }}"
  data:
  - secretKey: webhookUrl
    remoteRef:
      key: allex-secret-slack-alerts-webhook-url
```

> **Note:** The Slack webhook URL used here is the same one Alertmanager uses for `#allex-staging-alerts-k8s`. During the pilot, the `ai-alert-router` will post to `#allex-aiops-test`. When Phase 2 begins and per-team routing is enabled, you will need to add GCP secrets for each team's webhook URL and create additional ExternalSecrets. At that point, reference this file as the template.

### Step 4: Commit and push

```bash
git add \
  kubernetes-resources/secrets/monitoring/ai-alert-router/azure-openai-credentials.yaml \
  kubernetes-resources/secrets/monitoring/ai-alert-router/slack-webhook.yaml

git commit -m "feat(aiops): add ExternalSecrets for Azure OpenAI and Slack webhook in monitoring namespace"
git push origin master
```

### Step 5: Add secret references to the HelmRelease

Once the secrets are verified (Step 6 below), update `kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml` to inject them as environment variables. Add the following under `values.env`:

```yaml
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
      # Added after AIOPS-06 secrets are verified:
      - name: AZURE_OPENAI_API_KEY
        valueFrom:
          secretKeyRef:
            name: azure-openai-credentials
            key: apiKey
      - name: AZURE_OPENAI_ENDPOINT
        value: "https://allex-openai-rg.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview"
      - name: SLACK_WEBHOOK_URL
        valueFrom:
          secretKeyRef:
            name: ai-alert-router-slack-webhook
            key: webhookUrl
```

Commit this change alongside or after the ExternalSecrets are confirmed healthy.

---

## Verification

### Wait for FluxCD to apply the ExternalSecrets

```bash
# Watch ExternalSecret sync status
kubectl get externalsecret -n monitoring -w
```

Look for both new ExternalSecrets to show `READY: True`.

### Check individual ExternalSecret status

```bash
kubectl get externalsecret -n monitoring \
  external-secret-azure-openai-credentials-ai-alert-router \
  -o jsonpath='{.status.conditions}' | python3 -m json.tool
```

Expected:
```json
[
  {
    "lastTransitionTime": "...",
    "message": "Secret was synced",
    "reason": "SecretSynced",
    "status": "True",
    "type": "Ready"
  }
]
```

```bash
kubectl get externalsecret -n monitoring \
  external-secret-slack-webhook-ai-alert-router \
  -o jsonpath='{.status.conditions}' | python3 -m json.tool
```

### Verify the Kubernetes Secrets were created

```bash
# Check the secrets exist
kubectl get secret -n monitoring azure-openai-credentials
kubectl get secret -n monitoring ai-alert-router-slack-webhook
```

### Verify the secrets have non-empty values (without printing the values)

```bash
# Check that apiKey is non-empty (length > 0)
kubectl get secret -n monitoring azure-openai-credentials \
  -o jsonpath='{.data.apiKey}' | base64 -d | wc -c

# Check that webhookUrl is non-empty
kubectl get secret -n monitoring ai-alert-router-slack-webhook \
  -o jsonpath='{.data.webhookUrl}' | base64 -d | wc -c
```

Both commands should return a byte count greater than 0. Do not print the actual values.

### Verify the secret is accessible from the ai-alert-router pod

```bash
kubectl exec -n monitoring \
  $(kubectl get pod -n monitoring -l app.kubernetes.io/name=ai-alert-router -o jsonpath='{.items[0].metadata.name}') \
  -- sh -c 'echo "AZURE_OPENAI_API_KEY is set: $([ -n "$AZURE_OPENAI_API_KEY" ] && echo YES || echo NO)"'
```

Expected: `AZURE_OPENAI_API_KEY is set: YES`

---

## Rollback

Both ExternalSecrets are new resources. To remove them:

```bash
# Via GitOps (recommended)
git rm kubernetes-resources/secrets/monitoring/ai-alert-router/azure-openai-credentials.yaml
git rm kubernetes-resources/secrets/monitoring/ai-alert-router/slack-webhook.yaml
git commit -m "revert(aiops): remove ai-alert-router ExternalSecrets from monitoring namespace"
git push origin master

# Via kubectl (immediate, but Flux will re-create from Git unless the files are also removed)
kubectl delete externalsecret -n monitoring external-secret-azure-openai-credentials-ai-alert-router
kubectl delete externalsecret -n monitoring external-secret-slack-webhook-ai-alert-router
```

The `azure-openai-credentials` and `ai-alert-router-slack-webhook` Kubernetes Secrets have `deletionPolicy: Retain`, meaning they will persist even after the ExternalSecret is deleted. Clean them up manually if needed:

```bash
kubectl delete secret -n monitoring azure-openai-credentials
kubectl delete secret -n monitoring ai-alert-router-slack-webhook
```

---

## Acceptance Criteria

- [ ] `kubectl get externalsecret -n monitoring external-secret-azure-openai-credentials-ai-alert-router` shows `READY: True`
- [ ] `kubectl get externalsecret -n monitoring external-secret-slack-webhook-ai-alert-router` shows `READY: True`
- [ ] `kubectl get secret -n monitoring azure-openai-credentials` exists with a non-empty `apiKey` value
- [ ] `kubectl get secret -n monitoring ai-alert-router-slack-webhook` exists with a non-empty `webhookUrl` value
- [ ] The `ai-alert-router` pod has `AZURE_OPENAI_API_KEY` set (verified via exec without printing the value)
- [ ] The `ai-alert-router` pod has `SLACK_WEBHOOK_URL` set (verified via exec without printing the value)
- [ ] No secret values appear in pod logs or in the HelmRelease YAML
