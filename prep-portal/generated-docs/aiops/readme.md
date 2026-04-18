---
title: "README"
description: "README"
slug: "/readme"
---

# AIOps: AI-Assisted Alert Enrichment & Routing

**Epic:** AI-Assisted Alert Enrichment & Routing
**Status:** Active — Sprint 1 starting 2026-04-07
**Owner:** DevOps / Platform Engineering

---

## Project Summary

The AIOps initiative enriches raw Prometheus/Alertmanager notifications with contextual intelligence before they reach on-call engineers. Today, every alert fired in the staging GKE cluster is delivered as a flat text message to `#allex-staging-alerts-k8s` with no team attribution, no probable cause, and no recommended actions. Engineers spend the first few minutes of every incident simply understanding _what_ is broken and _who owns it_ before they can begin remediation.

This project inserts an `ai-alert-router` service between Alertmanager and Slack. The service receives alert webhooks, looks up team ownership from a ConfigMap, retrieves recent error logs from Elasticsearch, calls Azure OpenAI (GPT-4o) to generate a structured incident summary, and routes the enriched notification to the appropriate team Slack channel. The entire chain is designed to be non-blocking: if any enrichment step fails, the original alert is still delivered to the fallback `#allex-staging-alerts-k8s` channel unchanged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GKE Cluster (staging)                        │
│                                                                     │
│  Prometheus ──► PrometheusRule (allex-prometheus-alerts)            │
│       │                                                             │
│       ▼                                                             │
│  Alertmanager ──────────────────────────────────────────────────┐  │
│       │                                                         │  │
│       │  child route (pilot alerts only)    fallback route      │  │
│       ▼                                                         │  │
│  ai-alert-router (Pod: monitoring ns)                           │  │
│       │                                                         │  │
│       ├──► Team Ownership ConfigMap                             │  │
│       │    (kubernetes-resources/releases/monitoring/           │  │
│       │     ai-alert-router/team-ownership-config.yaml)         │  │
│       │                                                         │  │
│       ├──► Elasticsearch (logstash-* index)                     │  │
│       │    Last 15 min errors for namespace/service             │  │
│       │                                                         │  │
│       └──► Azure OpenAI GPT-4o                                  │  │
│            (allex-openai-rg.openai.azure.com)                   │  │
│                 │                                               │  │
│                 ▼                                               │  │
│         EnrichedIncident JSON                                   │  │
│                 │                                               │  │
└─────────────────┼───────────────────────────────────────────────┘  │
                  │                                               │
                  ▼                                               ▼
          #allex-aiops-test              #allex-staging-alerts-k8s
          (enriched alerts)                (fallback / raw alerts)

Phase 2 (post-pilot):
          #allex-platform-alerts
          #allex-data-alerts
          #allex-business-alerts
```

---

## Component Inventory

| Component | Technology | Location | Responsibility |
|-----------|-----------|----------|----------------|
| Prometheus | Prometheus Operator | `monitoring` ns | Evaluates alert rules, fires alerts |
| PrometheusRule | `allex-prometheus-alerts` | `kubernetes-resources/releases/monitoring/prometheus/allex-prometheus-alerts.yaml` | Defines all alert expressions and labels |
| Alertmanager | kube-prometheus-stack | `monitoring` ns | Groups, inhibits, routes alerts |
| Alertmanager config | ExternalSecret | `kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml` | Manages routing/receiver config via GCP secret template |
| ai-alert-router | Node.js/TypeScript service | `monitoring` ns | Receives webhooks, enriches with AI, routes to Slack |
| Team Ownership ConfigMap | Kubernetes ConfigMap | `kubernetes-resources/releases/monitoring/ai-alert-router/team-ownership-config.yaml` | Maps namespaces/services to teams and Slack channels |
| Azure OpenAI | External API (GPT-4o) | `allex-openai-rg.openai.azure.com` | Generates structured incident summaries |
| Elasticsearch | Elasticsearch cluster | Internal cluster service | Provides recent error log context |
| Fluentd | DaemonSet | `kube-system` ns | Ships all container logs to Elasticsearch |
| Grafana | Grafana | `grafana.staging.allex.ai` | Dashboards, alert visualization |
| FluxCD | flux-system | `flux-system` ns | GitOps reconciliation of all Kubernetes resources |

---

## 2-Week Sprint Plan

### Week 1: Foundation

| Day | Task | AIOPS ID | Owner | Est. |
|-----|------|----------|-------|------|
| Mon | Add enrichment labels to all 8 pilot alert rules | AIOPS-02 | Platform Eng | 3h |
| Mon | Create team ownership ConfigMap in GitOps repo | AIOPS-03 | Platform Eng | 2h |
| Tue | Add `ai-enricher` webhook receiver to Alertmanager config | AIOPS-01 | Platform Eng | 2h |
| Tue | Create ExternalSecrets for OpenAI key and Slack webhook | AIOPS-06 | Platform Eng | 1h |
| Wed | Scaffold `allex-ai-alert-router` TypeScript service (shadow mode) | AIOPS-04 | Backend Eng | 4h |
| Thu | Write unit tests, shadow mode validation | AIOPS-04 | Backend Eng | 3h |
| Fri | Deploy service to GKE via FluxCD HelmRelease | AIOPS-05 | Platform Eng | 3h |
| Fri | Verify shadow-mode logs with test webhook payload | AIOPS-05 | Platform Eng | 1h |

### Week 2: AI Enrichment & Pilot Validation

| Day | Task | AIOPS ID | Owner | Est. |
|-----|------|----------|-------|------|
| Mon | Add Azure OpenAI enrichment with timeout + fallback | AIOPS-07 | Backend Eng | 4h |
| Mon | Add Elasticsearch log context retrieval | AIOPS-08 | Backend Eng | 3h |
| Tue | Implement Slack Block Kit message formatter | AIOPS-09 | Backend Eng | 3h |
| Tue | Route enriched alerts to `#allex-aiops-test` | AIOPS-09 | Backend Eng | 2h |
| Wed-Thu | Run pilot: fire test alerts, collect feedback from on-call engineers | AIOPS-10 | All teams | ongoing |
| Fri | Evaluate pilot metrics, decide Phase 2 readiness | AIOPS-10 | Engineering Lead | 2h |

---

## Task Index

| File | AIOPS ID | Title | Sprint | Type |
|------|----------|-------|--------|------|
| [AIOPS-01](./aiops-01-alertmanager-webhook-receiver) | AIOPS-01 | Add Alertmanager Webhook Receiver | Week 1 | Configuration |
| [AIOPS-02](./aiops-02-alert-label-enrichment) | AIOPS-02 | Enrich Alert Rules with Team/Service Labels | Week 1 | Configuration |
| [AIOPS-03](./aiops-03-team-ownership-configmap) | AIOPS-03 | Create Team Ownership ConfigMap | Week 1 | Configuration |
| [AIOPS-04](./aiops-04-service-build) | AIOPS-04 | Build ai-alert-router Service (Shadow Mode) | Week 1 | Service Build |
| [AIOPS-05](./aiops-05-gitops-deployment) | AIOPS-05 | Deploy ai-alert-router via FluxCD | Week 1 | Infrastructure |
| [AIOPS-06](./aiops-06-azure-openai-secret) | AIOPS-06 | Create ExternalSecrets for AI Router | Week 1 | Configuration |
| [AIOPS-07](./aiops-07-openai-enrichment) | AIOPS-07 | Add Azure OpenAI Enrichment | Week 2 | Service Build |
| [AIOPS-08](./aiops-08-elasticsearch-context) | AIOPS-08 | Add Elasticsearch Log Context | Week 2 | Service Build |
| [AIOPS-09](./aiops-09-slack-routing) | AIOPS-09 | Route Enriched Alerts to Slack | Week 2 | Service Build |
| [AIOPS-10](./aiops-10-pilot-validation) | AIOPS-10 | Run Pilot Validation & Evaluate Results | Week 2 | Validation |

---

## Guardrails

These constraints are non-negotiable throughout the implementation:

1. **No alert loss.** The `default-receiver` routing to `#allex-staging-alerts-k8s` must remain active at all times. The AI enrichment path is always additive, never a replacement during the pilot.

2. **Non-blocking AI calls.** Alertmanager expects a `200 OK` from the webhook within its configured timeout. The `ai-alert-router` must return `200` immediately and perform all enrichment asynchronously. If OpenAI or Elasticsearch calls fail or time out, the original alert is forwarded to fallback without delay.

3. **No secrets in logs or prompts.** The service must never log full alert payloads if they contain credentials or PII. Structured logging of metadata (alertname, namespace, latency) is fine.

4. **GitOps only.** All Kubernetes resources are managed via FluxCD from this repository. Do not apply resources with `kubectl apply` directly in production without also committing them to the repo.

5. **Pilot scope is limited.** Only the 5 pilot alerts listed in AIOPS-01 are routed through the AI enrichment path during Week 1-2. Other alerts continue flowing to `#allex-staging-alerts-k8s` unchanged.

6. **Monitoring-stack node pool.** The `ai-alert-router` pod must run on the `monitoring-stack` node pool (toleration: `nodepool_type: monitoring-stack`) to co-locate with Prometheus/Alertmanager and reduce cross-pool latency.

---

## How to Use These Docs

Each file in this directory is a **self-contained SOP** mapped to a single Jira task (AIOPS-XX). You can open any file and begin work without reading the others, as long as you have completed the listed Prerequisites.

**File structure within each SOP:**
- **Objective** — What this task accomplishes and why it matters.
- **Prerequisites** — What must already be done before you start.
- **Background** — Relevant context from the existing repo so you don't have to go looking.
- **Implementation Steps** — Numbered steps with exact YAML, commands, and code. Follow them in order.
- **Verification** — Commands to confirm the change is working before you close the task.
- **Rollback** — How to undo if something goes wrong.
- **Acceptance Criteria** — Checkboxes to tick before marking the Jira ticket Done.

**Key repo paths referenced throughout:**
- Alertmanager config: `kubernetes-resources/secrets/monitoring/Prometeus/alertmanager-prom-stack-secret.yaml`
- Alert rules: `kubernetes-resources/releases/monitoring/prometheus/allex-prometheus-alerts.yaml`
- AI Assistant (reference pattern): `kubernetes-resources/releases/allex-ai-assistant/`
- Monitoring releases: `kubernetes-resources/releases/monitoring/`
- Monitoring secrets: `kubernetes-resources/secrets/monitoring/`

---

## Working In This Repo

This `aiops/` area is intentionally kept separate from the interview-prep track.

Use it as:

- an implementation plan for AI-assisted incident enrichment
- a platform design and delivery reference
- a reviewable operational project area alongside `mlops/`

## Suggested Reading Order

1. [AIOPS-01](./aiops-01-alertmanager-webhook-receiver)
2. [AIOPS-02](./aiops-02-alert-label-enrichment)
3. [AIOPS-03](./aiops-03-team-ownership-configmap)
4. [AIOPS-04](./aiops-04-service-build)
5. [AIOPS-05](./aiops-05-gitops-deployment)
6. [AIOPS-06](./aiops-06-azure-openai-secret)
7. [AIOPS-07](./aiops-07-openai-enrichment)
8. [AIOPS-08](./aiops-08-elasticsearch-context)
9. [AIOPS-09](./aiops-09-slack-routing)
10. [AIOPS-10](./aiops-10-pilot-validation)

## Local Workflow Notes

If you want to review this area from the repo root:

```bash
cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges
```

Open the docs portal for cleaner navigation:

```bash
cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/prep-portal
npm start
```

Then use the dedicated `AIOps` section from the landing page.

