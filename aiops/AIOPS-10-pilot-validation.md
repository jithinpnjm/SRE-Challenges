# AIOPS-10: Run Pilot Validation and Evaluate Results

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 2
**Type:** Validation
**Risk:** Low — pilot is read-only from an alert-delivery perspective; original routing is unchanged
**Estimated effort:** 2 hours structured evaluation + ongoing observation during Week 2
**Dependencies:** AIOPS-01 through AIOPS-09 (all prior tasks complete)

---

## Objective

Run a structured 2-week pilot with 5 alert types routed through the `ai-alert-router`. Collect quantitative metrics (latency, accuracy) and qualitative feedback from on-call engineers. Use the results to decide whether the system is ready to expand to Phase 2 (per-team Slack channels, all alerts). Document failures and tuning decisions.

---

## Prerequisites

- All AIOPS-01 through AIOPS-09 tasks are complete
- `#allex-aiops-test` Slack channel is active and visible to all on-call engineers
- At least 2 engineers are subscribed to `#allex-aiops-test` and have agreed to provide feedback
- The service is running with `SHADOW_MODE=false` and `PILOT_MODE=true`
- Grafana dashboard showing ai-alert-router latency metrics (or log-based monitoring) is available

---

## Background

### Pilot scope

| Dimension | Constraint |
|-----------|-----------|
| Alert types | 5: `KubernetesPodCrashLooping`, `RedisDown`, `RedisRejectedConnections`, `FailedAsyncJobs`, `TooManyPendingMessagesNotifications` |
| Output channel | `#allex-aiops-test` only (not team channels) |
| Duration | 2 weeks (2026-04-07 to 2026-04-21) |
| Fallback | `#allex-staging-alerts-k8s` remains active — no alert is ever only in `#allex-aiops-test` |

### What we're measuring

1. **Team classification accuracy** — Does the `team` label match who actually owns the issue?
2. **Probable cause relevance** — Are the AI-suggested causes plausible given what actually happened?
3. **Enrichment latency** — Does the end-to-end enrichment complete in < 10 seconds?
4. **Engineer utility** — Did the on-call engineer find the enriched message more useful than the raw alert?
5. **Zero-loss guarantee** — Were there any cases where the AI router caused an alert NOT to be delivered?

---

## Validation Checklist

For every alert event that fires during the pilot, complete a row in the following table. Keep this as a running log in a shared document or Confluence page.

| # | Date | Alert Name | Namespace | Team (AI) | Team (Actual) | Team Correct? | Probable Cause Relevant? | Latency < 10s? | Engineer Found Useful? | Notes |
|---|------|------------|-----------|-----------|---------------|---------------|--------------------------|----------------|----------------------|-------|
| 1 | | | | | | Y/N | Y/N/Partial | Y/N | Y/N | |
| 2 | | | | | | Y/N | Y/N/Partial | Y/N | Y/N | |
| 3 | | | | | | Y/N | Y/N/Partial | Y/N | Y/N | |
| ... | | | | | | | | | | |

**Note:** "Team Correct?" means the AI-assigned team matches the team who actually investigated/resolved the alert. "Probable Cause Relevant?" is a post-hoc assessment after the incident is resolved.

---

## How to Find Enriched Alerts in Logs

### Stream live logs from the ai-alert-router

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router -f | \
  python3 -u -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    try:
        obj = json.loads(line)
        if obj.get('event') in ('alert_processed', 'enrichment_complete', 'slack_message_sent', 'enrichment_fallback', 'openai_timeout', 'openai_call_success'):
            print(json.dumps(obj, indent=2))
            print('---')
    except:
        pass
"
```

### Query logs for a specific alert fingerprint

```bash
# Get recent logs for a specific alert
ALERT_NAME="RedisDown"
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=500 | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('alert_name') == '$ALERT_NAME':
            print(json.dumps(obj, indent=2))
    except:
        pass
"
```

### Check enrichment latency from logs

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=1000 | \
  python3 -c "
import sys, json
latencies = []
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('event') == 'enrichment_complete' and 'latency_ms' in obj:
            latencies.append(obj['latency_ms'])
    except:
        pass
if latencies:
    latencies.sort()
    n = len(latencies)
    print(f'Count: {n}')
    print(f'p50:   {latencies[n//2]}ms')
    print(f'p95:   {latencies[int(n*0.95)]}ms')
    print(f'p99:   {latencies[int(n*0.99)]}ms')
    print(f'Max:   {max(latencies)}ms')
else:
    print('No enrichment_complete events found')
"
```

### Check OpenAI token usage (cost monitoring)

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=1000 | \
  python3 -c "
import sys, json
total_prompt = 0; total_completion = 0; count = 0
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('event') == 'openai_call_success':
            total_prompt += obj.get('prompt_tokens', 0)
            total_completion += obj.get('completion_tokens', 0)
            count += 1
    except:
        pass
if count:
    print(f'Total calls: {count}')
    print(f'Total prompt tokens: {total_prompt} (avg {total_prompt//count}/call)')
    print(f'Total completion tokens: {total_completion} (avg {total_completion//count}/call)')
    print(f'Estimated GPT-4o cost at \$5/1M prompt + \$15/1M completion: \${(total_prompt*5 + total_completion*15)/1000000:.4f}')
"
```

---

## How to Simulate Alerts for Testing

### Method 1: amtool (recommended — uses real Alertmanager routing)

```bash
# Install amtool (matches your Alertmanager version)
# Then port-forward Alertmanager:
kubectl port-forward -n monitoring svc/prometheus-operated 9093:9093 &

# Fire each pilot alert type
amtool --alertmanager.url=http://localhost:9093 alert add \
  alertname=KubernetesPodCrashLooping severity=warning \
  namespace=allex-notifications pod=notifications-7f9d-xyz \
  team=business service=notifications component=processing environment=staging

amtool --alertmanager.url=http://localhost:9093 alert add \
  alertname=RedisDown severity=critical \
  namespace=allex-redis instance=redis-cache:6379 \
  team=platform service=redis component=cache environment=staging

amtool --alertmanager.url=http://localhost:9093 alert add \
  alertname=RedisRejectedConnections severity=critical \
  namespace=allex-redis instance=redis-cache:6379 \
  team=platform service=redis component=cache environment=staging

amtool --alertmanager.url=http://localhost:9093 alert add \
  alertname=FailedAsyncJobs severity=warning \
  namespace=allex-job-executor streamName=ASYNC_JOBS \
  team=business service=job-executor component=async-queue environment=staging

amtool --alertmanager.url=http://localhost:9093 alert add \
  alertname=TooManyPendingMessagesNotifications severity=warning \
  namespace=allex-notifications streamName=NOTIFICATIONS_COMMANDS \
  team=business service=notifications component=message-queue environment=staging
```

### Method 2: curl directly to ai-alert-router webhook

Use this to test the service without involving Alertmanager (useful for unit testing the enrichment logic):

```bash
kubectl port-forward -n monitoring svc/ai-alert-router 3000:3000 &

curl -s -X POST http://localhost:3000/webhook/alertmanager \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "4",
    "groupKey": "pilot-test-001",
    "truncatedAlerts": 0,
    "status": "firing",
    "receiver": "ai-enricher",
    "groupLabels": {"namespace": "allex-redis"},
    "commonLabels": {
      "namespace": "allex-redis",
      "severity": "critical",
      "team": "platform",
      "service": "redis",
      "component": "cache",
      "environment": "staging"
    },
    "commonAnnotations": {
      "summary": "Redis instance is down",
      "business_impact": "Cache and stream processing unavailable",
      "runbook_url": "https://wiki.allex.ai/runbooks/redis/RedisDown"
    },
    "externalURL": "http://alertmanager.monitoring:9093",
    "alerts": [{
      "status": "firing",
      "labels": {"alertname": "RedisDown"},
      "annotations": {},
      "startsAt": "2026-04-07T10:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "http://prometheus.monitoring:9090",
      "fingerprint": "pilot-test-fingerprint-001"
    }]
  }'
```

### Method 3: Resolve a test alert

```bash
amtool --alertmanager.url=http://localhost:9093 alert expire pilot-test-fingerprint-001
```

Or send a webhook with `status: resolved` and a past `endsAt` timestamp.

---

## Success Criteria for Phase 2

All of the following must be met before enabling per-team routing (Phase 2):

| Criterion | Threshold | How to Measure |
|-----------|-----------|----------------|
| Team classification accuracy | ≥ 80% (of all pilot alert events) | Validation checklist: count `Team Correct? = Y` / total |
| Enrichment latency p95 | < 10 seconds | Log analysis command above |
| Engineer utility score | At least 3 of 5 on-call engineers confirm enriched alerts are more useful than raw | Slack poll or 1:1 feedback |
| Zero alert loss | 0 cases where alert appeared in `#allex-aiops-test` but NOT in `#allex-staging-alerts-k8s` | Cross-reference both channels |
| Service uptime | ≥ 99% during the 2-week pilot | `kubectl get pod -n monitoring -l app.kubernetes.io/name=ai-alert-router` — count restarts |
| No OpenAI cost overrun | < $5 total during 2-week pilot | Token usage command above |

---

## What to Tune Based on Results

### If team classification accuracy < 80%

1. Check which alerts were misclassified: are they in namespaces not covered by the ConfigMap?
2. Update `kubernetes-resources/releases/monitoring/ai-alert-router/team-ownership-config.yaml` to add missing namespace-to-team mappings
3. If the `service` label enrichment (AIOPS-02) was not applied correctly, re-check the PrometheusRule labels

### If enrichment latency p95 > 10 seconds

1. Check `prompt_tokens` average — if > 600, shorten the prompt template in `src/enrichment/prompt.ts`
2. Reduce `OPENAI_TIMEOUT_MS` to 4000 to fail faster
3. Check if Elasticsearch context retrieval is slow: look for `event: elasticsearch_query_success` with `query_time_ms > 2000` and reduce `ES_TIMEOUT_MS`
4. Consider caching OpenAI responses for identical alert fingerprints (5-minute TTL)

### If probable causes are not relevant

1. Add more context to the prompt: include the PromQL expression (`suggestedQuery` annotation)
2. Review the `temperature: 0.1` setting — if responses are too conservative, try `0.2`
3. Add explicit examples in the system prompt for the most common alert types (few-shot prompting)
4. Check if Elasticsearch context is being included — if `log_context_available: false` is frequent, the ES query may be misconfigured

### If on-call engineers find the format unhelpful

1. Survey what fields they look at first: reorder the Block Kit blocks accordingly
2. Consider adding a "What changed recently?" section using recent deployments from FluxCD HelmRelease events
3. Shorten the `recommended_actions` to max 3 items

---

## Known Failure Modes

| Failure Mode | Symptom | Detection | Mitigation |
|---|---|---|---|
| OpenAI API outage | All alerts unenriched, fallback messages in Slack | `event: openai_call_error` in logs, no `event: enrichment_complete` | Fallback path already handles this; no action needed during pilot |
| Alertmanager webhook timeout | Alertmanager logs `context deadline exceeded`, alert delayed | Alertmanager pod logs: `kubectl logs -n monitoring -l app.kubernetes.io/component=alertmanager` | Ensure service returns 200 before any async work (already implemented) |
| ConfigMap mount stale | Service uses wrong team mappings after ConfigMap update | Logs show old team for namespace that was just remapped | Restart pod: `kubectl rollout restart deployment -n monitoring -l app.kubernetes.io/name=ai-alert-router` |
| Elasticsearch index pattern mismatch | `hits_count: 0` for all queries | Log: `event: elasticsearch_query_success` with `hits_count: 0` for known-active namespaces | Update `ELASTICSEARCH_INDEX_PATTERN` env var |
| Duplicate Slack messages | Same alert appears multiple times in `#allex-aiops-test` | Count messages per fingerprint in Slack | Check `group_interval` in Alertmanager; ensure `continue: true` on child route doesn't re-fire unnecessarily |
| GPT-4o JSON refusal | `event: openai_response_schema_error` in logs | Log analysis for schema errors | Strengthen system prompt: add "You MUST output JSON, no other text" |
| Pod OOM kill | `OOMKilled` in pod events | `kubectl describe pod -n monitoring -l app.kubernetes.io/name=ai-alert-router` | Increase memory limit in HelmRelease from 256Mi to 384Mi |

---

## Phase 2 Readiness Checklist

Before opening Phase 2 (per-team routing, all alert types):

- [ ] All Phase 1 success criteria met (see table above)
- [ ] `pilot_mode: false` tested in staging with `#allex-aiops-test` pointing to the correct team channel for a sample alert
- [ ] New GCP secrets created for each team's Slack webhook (if using separate incoming webhooks per team)
- [ ] ExternalSecrets created for each new Slack webhook secret
- [ ] Team-ownership ConfigMap updated: `pilot_mode: false`
- [ ] AIOPS-02 labels verified on all alert rules (not just the pilot 5)
- [ ] On-call rotation updated — engineers know to check their team channel instead of `#allex-staging-alerts-k8s` for enriched alerts
- [ ] Runbook pages created for all alerts with valid URLs replacing the placeholder `https://wiki.allex.ai/runbooks/...` URLs
- [ ] Grafana dashboard created showing `enrichment_latency_ms`, `prompt_tokens`, `confidence` over time
- [ ] Cost budget confirmed with engineering lead (GPT-4o token usage at expected alert volume)
- [ ] Incident retrospective held to review pilot results and document lessons learned

---

## Acceptance Criteria

- [ ] Pilot validation log table completed with at least 10 real alert events (not just synthetic tests)
- [ ] Team classification accuracy ≥ 80% measured over the pilot period
- [ ] Enrichment latency p95 < 10 seconds confirmed from log analysis
- [ ] At least 3 on-call engineers have provided written feedback (Slack thread, email, or Confluence comment)
- [ ] Zero cases of alert loss documented (every alert in `#allex-aiops-test` also appeared in `#allex-staging-alerts-k8s`)
- [ ] All known failure modes in the table above have been observed at least once and confirmed to behave as described
- [ ] Phase 2 readiness checklist either completed or documented as blocked with owners assigned
- [ ] Pilot retrospective meeting held and notes captured
