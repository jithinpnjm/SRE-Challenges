# AIOPS-03: Create Team Ownership ConfigMap

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 1
**Type:** Configuration
**Risk:** Low — new resource, nothing depends on it until AIOPS-04/05 are deployed
**Estimated effort:** 2 hours
**Dependencies:** None (can be done in parallel with AIOPS-01 and AIOPS-02)

---

## Objective

Create a Kubernetes ConfigMap in the `monitoring` namespace that maps every namespace and application in the cluster to a team name and a Slack channel. The `ai-alert-router` service will mount this ConfigMap at runtime and use it to determine where to route each enriched alert. Centralising ownership data in a ConfigMap means you can update team assignments without rebuilding or redeploying the service.

---

## Prerequisites

- Access to merge PRs into this GitOps repo
- FluxCD is reconciling the `kubernetes-resources/releases/monitoring/` directory
- The `monitoring` namespace exists (`kubectl get namespace monitoring`)

---

## Background

### Why a ConfigMap and not code?

Team ownership changes frequently — services move between teams, new namespaces are created, and Slack channel names evolve. By storing this data in a ConfigMap rather than hardcoding it in the service, you can update ownership assignments with a single GitOps commit that FluxCD applies within minutes, with no service restart needed (the service reads the file on each request, or watches the file for changes using inotify).

### How Flux picks this file up

FluxCD's Kustomization for the `monitoring` namespace watches the `kubernetes-resources/releases/monitoring/` directory tree. Any YAML file you add inside that tree (including new subdirectories) is automatically reconciled. You do not need to add this file to any `kustomization.yaml` — the directory is glob-matched.

Verify the Kustomization is watching this path:

```bash
kubectl get kustomization -n flux-system -o yaml | grep -A5 "monitoring"
```

### Slack channel naming convention

During the pilot (AIOPS-09), all enriched alerts go to `#allex-aiops-test`. The channels defined in this ConfigMap are for Phase 2, when routing goes live to team-specific channels. The ConfigMap includes them now so the structure is in place before Phase 2 begins.

---

## Implementation Steps

### Step 1: Create the directory for the ai-alert-router resources

```bash
mkdir -p kubernetes-resources/releases/monitoring/ai-alert-router
```

### Step 2: Create the ConfigMap file

Create the file `kubernetes-resources/releases/monitoring/ai-alert-router/team-ownership-config.yaml` with the following content:

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-alert-router-team-ownership
  namespace: monitoring
  labels:
    app.kubernetes.io/name: ai-alert-router
    app.kubernetes.io/component: config
data:
  teams.yaml: |
    # Team Ownership Configuration for ai-alert-router
    # Maps namespaces and applications to teams and Slack channels.
    # Updated: 2026-04-07
    # Format:
    #   teams:
    #     <team-name>:
    #       slack_channel: "<channel>"
    #       namespaces: [...]
    #       apps: [...]         # optional: app-level overrides within a namespace
    #
    # Resolution order: app match > namespace match > fallback

    fallback_channel: "#allex-staging-alerts-k8s"

    teams:

      platform:
        slack_channel: "#allex-platform-alerts"
        namespaces:
          - allex-graphql
          - allex-api-gateway
          - allex-authentication
          - allex-real-time
          - allex-redis
          - allex-neo4j-cluster
          - allex-accounts
          - allex-permissions
          - allex-license
          - allex-resources
          - allex-file-mgmt
          - allex-sqlproxy

      devops:
        slack_channel: "#allex-platform-alerts"
        namespaces:
          - monitoring
          - kube-system
          - cert-manager
          - external-secrets
          - flux-system
          - internal-gateway
          - allex-ai-assistant

      data:
        slack_channel: "#allex-data-alerts"
        namespaces:
          - allex-search
          - allex-data-exchange
          - allex-reporting
          - confluent
          - allex-catalog

      business:
        slack_channel: "#allex-business-alerts"
        namespaces:
          - allex-notifications
          - allex-planning-objects
          - allex-calendar
          - allex-activities
          - allex-job-executor
          - allex-job-manager

    # Service-to-team overrides (used when alert label 'service' is set by AIOPS-02)
    # These take precedence over namespace-based lookup.
    service_overrides:
      kubernetes:
        team: platform
        slack_channel: "#allex-platform-alerts"
      redis:
        team: platform
        slack_channel: "#allex-platform-alerts"
      neo4j:
        team: platform
        slack_channel: "#allex-platform-alerts"
      job-executor:
        team: business
        slack_channel: "#allex-business-alerts"
      notifications:
        team: business
        slack_channel: "#allex-business-alerts"
      search-ingestor:
        team: data
        slack_channel: "#allex-data-alerts"
      kafka:
        team: data
        slack_channel: "#allex-data-alerts"
      elasticsearch:
        team: data
        slack_channel: "#allex-data-alerts"
      postgresql:
        team: platform
        slack_channel: "#allex-platform-alerts"
      cert-manager:
        team: devops
        slack_channel: "#allex-platform-alerts"
      fluxcd:
        team: devops
        slack_channel: "#allex-platform-alerts"

    # Pilot override: During the pilot phase, ALL enriched alerts go to the test channel.
    # Set pilot_mode: false when ready to enable per-team routing (Phase 2).
    pilot_mode: true
    pilot_channel: "#allex-aiops-test"
```

### Step 3: Commit and push

```bash
git add kubernetes-resources/releases/monitoring/ai-alert-router/team-ownership-config.yaml
git commit -m "feat(aiops): add team ownership ConfigMap for ai-alert-router"
git push origin master
```

### Step 4: Wait for Flux to reconcile

```bash
# Watch for Flux to apply the new ConfigMap
kubectl get kustomization -n flux-system -w

# Check that the ConfigMap has been created
kubectl get configmap -n monitoring ai-alert-router-team-ownership
```

---

## Verification

### Check ConfigMap exists

```bash
kubectl get configmap -n monitoring ai-alert-router-team-ownership
```

Expected output:
```
NAME                            DATA   AGE
ai-alert-router-team-ownership  1      <age>
```

### Check ConfigMap content is correct

```bash
kubectl get configmap -n monitoring ai-alert-router-team-ownership -o jsonpath='{.data.teams\.yaml}' | head -30
```

Verify you see the `fallback_channel`, `teams`, and `service_overrides` keys.

### Validate YAML syntax of the ConfigMap data

```bash
kubectl get configmap -n monitoring ai-alert-router-team-ownership \
  -o jsonpath='{.data.teams\.yaml}' | python3 -c "
import yaml, sys
try:
    data = yaml.safe_load(sys.stdin)
    teams = data.get('teams', {})
    print(f'Teams loaded: {list(teams.keys())}')
    total_ns = sum(len(t.get(\"namespaces\", [])) for t in teams.values())
    print(f'Total namespace mappings: {total_ns}')
    print('YAML validation: PASSED')
except Exception as e:
    print(f'YAML validation FAILED: {e}')
    sys.exit(1)
"
```

Expected output:
```
Teams loaded: ['platform', 'devops', 'data', 'business']
Total namespace mappings: 26
YAML validation: PASSED
```

### Simulate a namespace lookup (dry run)

```bash
kubectl get configmap -n monitoring ai-alert-router-team-ownership \
  -o jsonpath='{.data.teams\.yaml}' | python3 - <<'EOF'
import yaml, sys

config = yaml.safe_load(sys.stdin)
test_cases = [
    ("allex-notifications", None),
    ("allex-redis", None),
    ("confluent", None),
    ("monitoring", None),
    (None, "redis"),
    (None, "notifications"),
    (None, "unknown-service"),
]

def lookup(namespace, service):
    # Service override takes precedence
    if service:
        override = config.get("service_overrides", {}).get(service)
        if override:
            return override["team"], override["slack_channel"]
    # Namespace lookup
    for team_name, team_data in config.get("teams", {}).items():
        if namespace in team_data.get("namespaces", []):
            return team_name, team_data["slack_channel"]
    return "unknown", config["fallback_channel"]

print(f"{'Namespace/Service':<40} {'Team':<15} {'Channel'}")
print("-" * 80)
for ns, svc in test_cases:
    label = f"ns={ns}" if ns else f"svc={svc}"
    team, channel = lookup(ns, svc)
    print(f"{label:<40} {team:<15} {channel}")
EOF
```

Expected output:
```
Namespace/Service                        Team            Channel
--------------------------------------------------------------------------------
ns=allex-notifications                   business        #allex-business-alerts
ns=allex-redis                           platform        #allex-platform-alerts
ns=confluent                             data            #allex-data-alerts
ns=monitoring                            devops          #allex-platform-alerts
svc=redis                                platform        #allex-platform-alerts
svc=notifications                        business        #allex-business-alerts
svc=unknown-service                      unknown         #allex-staging-alerts-k8s
```

---

## Rollback

The ConfigMap is a new resource — deleting it is the rollback:

```bash
# Option 1: Remove from GitOps repo and let Flux delete it
git rm kubernetes-resources/releases/monitoring/ai-alert-router/team-ownership-config.yaml
git commit -m "revert(aiops): remove team ownership ConfigMap"
git push origin master

# Option 2: If you need immediate removal
kubectl delete configmap -n monitoring ai-alert-router-team-ownership
```

If the `ai-alert-router` service is already running and cannot find the ConfigMap, it will fall back to routing all alerts to `#allex-staging-alerts-k8s` (the default fallback). This is safe.

---

## Acceptance Criteria

- [ ] `kubectl get configmap -n monitoring ai-alert-router-team-ownership` shows the ConfigMap exists
- [ ] `kubectl get configmap -n monitoring ai-alert-router-team-ownership -o jsonpath='{.data.teams\.yaml}'` returns valid YAML
- [ ] YAML content includes all 4 teams: `platform`, `devops`, `data`, `business`
- [ ] All namespaces from the namespace inventory are covered by at least one team entry
- [ ] `service_overrides` section covers all 8 pilot alert services
- [ ] `pilot_mode: true` and `pilot_channel: "#allex-aiops-test"` are present
- [ ] `fallback_channel: "#allex-staging-alerts-k8s"` is present
- [ ] The lookup simulation script returns correct team assignments for all test cases
