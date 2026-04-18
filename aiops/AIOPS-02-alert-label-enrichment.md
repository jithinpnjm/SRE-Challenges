# AIOPS-02: Enrich Alert Rules with Team/Service Metadata Labels

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 1
**Type:** Configuration
**Risk:** Low — label-only changes; no alert expression or threshold modifications
**Estimated effort:** 3 hours
**Dependencies:** None (can be done in parallel with AIOPS-01)

---

## Objective

Add structured metadata labels (`team`, `service`, `component`, `environment`) and enriched annotations (`business_impact`, `runbook_url`, `suggested_query`) to the 8 pilot alert rules in `allex-prometheus-alerts.yaml`. These labels give the `ai-alert-router` structured, unambiguous inputs instead of forcing the LLM to infer team ownership from raw namespace names or pod labels. They also surface in the Prometheus/Alertmanager UI for immediate human readability.

---

## Prerequisites

- No running tasks required first — this is a pure PrometheusRule YAML edit
- Prometheus Operator is running in the `monitoring` namespace and watching PrometheusRules
- The file `kubernetes-resources/releases/monitoring/prometheus/allex-prometheus-alerts.yaml` is in scope

---

## Background

### Why label enrichment matters for AI routing

The `ai-alert-router` receives raw Alertmanager webhook payloads. Without enrichment labels, the service must parse alert names and namespace strings to determine team ownership — which is fragile and wrong when alert names don't encode team information. With explicit `team` labels, the lookup is a direct map read from the team-ownership ConfigMap (AIOPS-03).

Labels also pass through to Slack notifications, Grafana alert annotations, and any future SIEM integration. Adding them at the PrometheusRule layer is the single-source-of-truth approach.

### Current label state

All 8 pilot alerts currently have only:
```yaml
labels:
  severity: critical  # or warning
```

### Target label schema

```yaml
labels:
  severity: <critical|warning>   # existing — do not remove
  team: <platform|business|data>
  service: <logical-service-name>
  component: <subsystem-within-service>
  environment: staging
```

### Target annotation additions

```yaml
annotations:
  summary: <existing — keep>
  description: <existing — keep if present>
  impact: <existing — keep if present>
  business_impact: "<human-readable business consequence>"
  runbook_url: "https://wiki.allex.ai/runbooks/<service>/<alert-name>"
  suggested_query: "<PromQL or Kibana query to start investigation>"
```

> **Note:** `runbook_url` uses placeholder URLs in the format `https://wiki.allex.ai/runbooks/<service>/<alert-name>`. Replace these with actual runbook URLs once your wiki pages are created.

---

## Implementation Steps

Open [`kubernetes-resources/releases/monitoring/prometheus/allex-prometheus-alerts.yaml`](../../kubernetes-resources/releases/monitoring/prometheus/allex-prometheus-alerts.yaml) and apply each diff below.

### Alert 1: KubernetesPodCrashLooping

**Ownership:** team: platform, service: kubernetes, component: pod-lifecycle

**Before:**
```yaml
        - alert: KubernetesPodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total[1m]) > 3
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: Kubernetes pod crash looping (instance {{ $labels.instance }})
            description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
```

**After:**
```yaml
        - alert: KubernetesPodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total[1m]) > 3
          for: 2m
          labels:
            severity: warning
            team: platform
            service: kubernetes
            component: pod-lifecycle
            environment: staging
          annotations:
            summary: Kubernetes pod crash looping (instance {{ $labels.instance }})
            description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
            business_impact: "Service availability degraded in namespace {{ $labels.namespace }}; dependent services may be experiencing errors or timeouts."
            runbook_url: "https://wiki.allex.ai/runbooks/kubernetes/KubernetesPodCrashLooping"
            suggested_query: "increase(kube_pod_container_status_restarts_total{namespace=\"{{ $labels.namespace }}\",pod=\"{{ $labels.pod }}\"}[10m])"
```

---

### Alert 2: RedisDown

**Ownership:** team: platform, service: redis, component: cache

**Before:**
```yaml
        - alert: RedisDown
          expr: redis_up == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: Redis down (instance {{ $labels.instance }})
            description: "Redis instance is down\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
```

**After:**
```yaml
        - alert: RedisDown
          expr: redis_up == 0
          for: 5m
          labels:
            severity: critical
            team: platform
            service: redis
            component: cache
            environment: staging
          annotations:
            summary: Redis down (instance {{ $labels.instance }})
            description: "Redis instance is down\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
            business_impact: "All services using Redis for caching, session storage, and message streaming are unavailable. Affects async job processing, notifications, and real-time features."
            runbook_url: "https://wiki.allex.ai/runbooks/redis/RedisDown"
            suggested_query: "redis_up{instance=\"{{ $labels.instance }}\"}"
```

---

### Alert 3: RedisRejectedConnections

**Ownership:** team: platform, service: redis, component: cache

**Before:**
```yaml
        - alert: RedisRejectedConnections
          expr: increase(redis_rejected_connections_total[1m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: Redis rejected connections (instance {{ $labels.instance }})
            description: "Some connections to Redis has been rejected\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
```

**After:**
```yaml
        - alert: RedisRejectedConnections
          expr: increase(redis_rejected_connections_total[1m]) > 0
          for: 5m
          labels:
            severity: critical
            team: platform
            service: redis
            component: cache
            environment: staging
          annotations:
            summary: Redis rejected connections (instance {{ $labels.instance }})
            description: "Some connections to Redis has been rejected\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
            business_impact: "Application services are being denied Redis connections, causing cascading failures in async processing, notifications, and real-time message delivery."
            runbook_url: "https://wiki.allex.ai/runbooks/redis/RedisRejectedConnections"
            suggested_query: "increase(redis_rejected_connections_total{instance=\"{{ $labels.instance }}\"}[5m])"
```

---

### Alert 4: FailedAsyncJobs

**Ownership:** team: business, service: job-executor, component: async-queue

**Before:**
```yaml
        - alert: FailedAsyncJobs
          expr: redis_dead_letter_stream_messages_count{streamName="ASYNC_JOBS"} > 0
          for: 20m
          labels:
            severity: warning
          annotations:
            summary: "A message in the dead letter stream {{ $labels.streamName }} in namespace {{ $labels.namespace }}"
            impact: "Some async jobs may fail repeatedly to process, in this case they are sent to the dead letter stream for investigation. After investigation they must be manually removed from the stream."
```

**After:**
```yaml
        - alert: FailedAsyncJobs
          expr: redis_dead_letter_stream_messages_count{streamName="ASYNC_JOBS"} > 0
          for: 20m
          labels:
            severity: warning
            team: business
            service: job-executor
            component: async-queue
            environment: staging
          annotations:
            summary: "A message in the dead letter stream {{ $labels.streamName }} in namespace {{ $labels.namespace }}"
            impact: "Some async jobs may fail repeatedly to process, in this case they are sent to the dead letter stream for investigation. After investigation they must be manually removed from the stream."
            business_impact: "Background jobs (data exports, scheduled tasks, bulk operations) are silently failing and accumulating in the dead-letter queue. Manual intervention required to prevent data loss."
            runbook_url: "https://wiki.allex.ai/runbooks/job-executor/FailedAsyncJobs"
            suggested_query: "redis_dead_letter_stream_messages_count{streamName=\"ASYNC_JOBS\", namespace=\"{{ $labels.namespace }}\"}"
```

---

### Alert 5: TooManyPendingMessagesNotifications

**Ownership:** team: business, service: notifications, component: message-queue

**Before:**
```yaml
        - alert: TooManyPendingMessagesNotifications
          expr: redis_stream_messages_pending{streamName="NOTIFICATIONS_COMMANDS"} > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "More than 5 pending messages in stream {{ $labels.streamName }} for consumer group {{ $labels.consumerGroupName }} in namespace {{ $labels.namespace }}"
            impact: "Users are not receiving emails/notifications"
```

**After:**
```yaml
        - alert: TooManyPendingMessagesNotifications
          expr: redis_stream_messages_pending{streamName="NOTIFICATIONS_COMMANDS"} > 5
          for: 5m
          labels:
            severity: warning
            team: business
            service: notifications
            component: message-queue
            environment: staging
          annotations:
            summary: "More than 5 pending messages in stream {{ $labels.streamName }} for consumer group {{ $labels.consumerGroupName }} in namespace {{ $labels.namespace }}"
            impact: "Users are not receiving emails/notifications"
            business_impact: "End users are not receiving email notifications and in-app alerts. Notification backlog is growing; messages may expire or be lost if the consumer does not recover."
            runbook_url: "https://wiki.allex.ai/runbooks/notifications/TooManyPendingMessagesNotifications"
            suggested_query: "redis_stream_messages_pending{streamName=\"NOTIFICATIONS_COMMANDS\", namespace=\"{{ $labels.namespace }}\"}"
```

---

### Alert 6: NotificationsProcessingSlowProduction

**Ownership:** team: business, service: notifications, component: processing

**Before:**
```yaml
        - alert: NotificationsProcessingSlowProduction
          expr: histogram_quantile(0.8, sum(rate(processing_messages_duration_seconds_bucket{app_kubernetes_io_name='notifications', environment='production'}[1m])) by (le)) > 600
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "20% of the notifications are taking longer than 10 minutes"
            impact: "Users are not receiving emails/notifications"
```

**After:**
```yaml
        - alert: NotificationsProcessingSlowProduction
          expr: histogram_quantile(0.8, sum(rate(processing_messages_duration_seconds_bucket{app_kubernetes_io_name='notifications', environment='production'}[1m])) by (le)) > 600
          for: 1m
          labels:
            severity: warning
            team: business
            service: notifications
            component: processing
            environment: staging
          annotations:
            summary: "20% of the notifications are taking longer than 10 minutes"
            impact: "Users are not receiving emails/notifications"
            business_impact: "Notification processing latency is critically high. 20% of users will experience delays exceeding 10 minutes for emails and in-app notifications in the production environment."
            runbook_url: "https://wiki.allex.ai/runbooks/notifications/NotificationsProcessingSlowProduction"
            suggested_query: "histogram_quantile(0.8, sum(rate(processing_messages_duration_seconds_bucket{app_kubernetes_io_name='notifications'}[5m])) by (le))"
```

---

### Alert 7: TooManyKafkaErrors

**Ownership:** team: data, service: search-ingestor, component: kafka-consumer

**Before:**
```yaml
        - alert: TooManyKafkaErrors
          expr: kafka_error > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Search ingestor can not pull data from kafka and can not send it to elastic search namespace {{ $labels.namespace }}"
            impact: "Elastic Search out of sync and will search services."
```

**After:**
```yaml
        - alert: TooManyKafkaErrors
          expr: kafka_error > 5
          for: 5m
          labels:
            severity: warning
            team: data
            service: search-ingestor
            component: kafka-consumer
            environment: staging
          annotations:
            summary: "Search ingestor can not pull data from kafka and can not send it to elastic search namespace {{ $labels.namespace }}"
            impact: "Elastic Search out of sync and will search services."
            business_impact: "Search index is falling behind real-time data. Users will see stale or incomplete search results. Kafka consumer lag will grow until the ingestor recovers."
            runbook_url: "https://wiki.allex.ai/runbooks/search-ingestor/TooManyKafkaErrors"
            suggested_query: "kafka_error{namespace=\"{{ $labels.namespace }}\"} and kafka_consumergroup_lag{consumergroup!~\"test-consumer-group\"}"
```

---

### Alert 8: Neo4jClusterLeaderCount

**Ownership:** team: platform, service: neo4j, component: cluster

**Before:**
```yaml
        - alert: Neo4jClusterLeaderCount
          expr: count(neo4j_causal_clustering_core_is_leader == 1) < 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "No leader node in the neo4j cluster"
            impact: "Service is not available."
```

**After:**
```yaml
        - alert: Neo4jClusterLeaderCount
          expr: count(neo4j_causal_clustering_core_is_leader == 1) < 1
          for: 5m
          labels:
            severity: critical
            team: platform
            service: neo4j
            component: cluster
            environment: staging
          annotations:
            summary: "No leader node in the neo4j cluster"
            impact: "Service is not available."
            business_impact: "All graph-dependent features are unavailable: activity timelines, planning objects relationships, resource hierarchy, permissions resolution. This is a P1 outage for core platform functionality."
            runbook_url: "https://wiki.allex.ai/runbooks/neo4j/Neo4jClusterLeaderCount"
            suggested_query: "count(neo4j_causal_clustering_core_is_leader == 1) and count(neo4j_causal_clustering_core_is_leader)"
```

---

### Step 9: Commit and push

```bash
git add kubernetes-resources/releases/monitoring/prometheus/allex-prometheus-alerts.yaml
git commit -m "feat(aiops): add team/service/component labels and enriched annotations to 8 pilot alert rules"
git push origin master
```

---

## Verification

### Check PrometheusRule is picked up by Prometheus

```bash
# Verify the PrometheusRule resource has been applied
kubectl get prometheusrule -n monitoring allex-prometheus-alerts -o yaml | grep -A 10 "KubernetesPodCrashLooping"
```

### Check labels appear in the Prometheus UI

1. Open `https://prometheus.staging.allex.ai` (or port-forward: `kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090`)
2. Navigate to **Alerts**
3. Find `KubernetesPodCrashLooping` — click to expand
4. Confirm labels `team: platform`, `service: kubernetes`, `component: pod-lifecycle`, `environment: staging` are present

### Check labels via PromQL

```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Query active alerts with the new labels
curl -s 'http://localhost:9090/api/v1/rules' | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for group in data['data']['groups']:
    for rule in group['rules']:
        if rule.get('name') == 'KubernetesPodCrashLooping':
            print(json.dumps(rule['labels'], indent=2))
"
```

Expected output includes:
```json
{
  "severity": "warning",
  "team": "platform",
  "service": "kubernetes",
  "component": "pod-lifecycle",
  "environment": "staging"
}
```

### Verify no alert rules were accidentally broken

```bash
# Check all rules load without errors
curl -s 'http://localhost:9090/api/v1/rules' | python3 -c "
import json, sys
data = json.load(sys.stdin)
errors = [r for g in data['data']['groups'] for r in g['rules'] if r.get('health') == 'err']
print(f'Rules with errors: {len(errors)}')
for e in errors:
    print(e['name'], e.get('lastError'))
"
```

---

## Rollback

Because this change only adds labels and annotations to existing rules (no expression changes, no threshold changes, no new rules), rollback is:

```bash
git revert HEAD
git push origin master
```

Prometheus Operator will reload the PrometheusRule within ~1 minute of Flux reconciling the revert. There is no alert downtime — the rules remain active throughout the rollback, just without the enrichment labels.

---

## Acceptance Criteria

- [ ] All 8 alert rules in the pilot set have `team`, `service`, `component`, and `environment` labels added
- [ ] All 8 alert rules have `business_impact`, `runbook_url`, and `suggested_query` annotations added
- [ ] No existing `severity`, `summary`, `description`, or `impact` labels/annotations were removed or modified
- [ ] Prometheus UI shows the new labels on each alert rule (Alerts page)
- [ ] `kubectl get prometheusrule -n monitoring allex-prometheus-alerts` shows `AGE` has refreshed (rule was re-applied)
- [ ] No rules show `health: err` in the Prometheus API response
- [ ] At least one team member has verified the `suggested_query` for each alert fires a valid PromQL expression in the Prometheus UI
