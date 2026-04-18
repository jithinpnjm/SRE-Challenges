---
title: "AIOPS 08 Elasticsearch Context"
description: "AIOPS 08 Elasticsearch Context"
slug: "/aiops-08-elasticsearch-context"
---

# AIOPS-08: Add Elasticsearch Log Context Retrieval

**Epic:** AI-Assisted Alert Enrichment & Routing
**Sprint:** Week 2
**Type:** Service Build
**Risk:** Low — Elasticsearch query failure must not block alert delivery; 3-second timeout with skip-on-failure
**Estimated effort:** 3 hours
**Dependencies:** AIOPS-07 (OpenAI enrichment must exist to inject log context into prompt)

---

## Objective

Before calling Azure OpenAI, the `ai-alert-router` queries Elasticsearch for the most recent error logs from the affected namespace and service. This gives GPT-4o real evidence about what was happening at alert time — container crash reasons, connection errors, exception stack traces — instead of relying solely on the PromQL expression and static annotations. The query is capped at 3 seconds; if Elasticsearch is slow or unavailable, enrichment continues without log context.

---

## Prerequisites

- AIOPS-07 complete: OpenAI enrichment is working and log context field exists in the prompt template
- Elasticsearch is reachable from within the `monitoring` namespace (verify the Fluentd sink URL — typically `http://elasticsearch.monitoring.svc.cluster.local:9200` or similar)
- Fluentd is shipping logs with `kubernetes.namespace_name` and `kubernetes.container_name` metadata fields (confirmed in `kubernetes-resources/releases/kube-system/fluentd/fluentd-config.yaml`)

---

## Background

### Fluentd log metadata

Fluentd (`kubernetes-resources/releases/kube-system/fluentd/fluentd-config.yaml` (`../../kubernetes-resources/releases/kube-system/fluentd/fluentd-config.yaml`)) enriches all container logs with Kubernetes metadata before shipping to Elasticsearch:

- `kubernetes.namespace_name` — the pod's namespace
- `kubernetes.pod_name` — the pod name
- `kubernetes.container_name` — the container name

This means we can filter Elasticsearch logs by `kubernetes.namespace_name` to scope the context query to the alerting namespace.

### Index pattern

Fluentd ships to Elasticsearch with a `logstash-*` index pattern (the standard fluentd-elasticsearch plugin default). Verify the actual index name on your cluster:

```bash
# From a pod in the monitoring namespace, or via kubectl port-forward:
curl -s http://<elasticsearch-url>:9200/_cat/indices?v | head -20
```

If the index uses a different prefix (e.g., `kubernetes-*` or `fluentd-*`), update `ELASTICSEARCH_INDEX_PATTERN` accordingly.

### Error log detection

Fluentd normalises log severity differently depending on the log format. The query filters on multiple possible severity field names:
- `level: error` or `level: ERROR`
- `severity: error` or `severity: ERROR`
- `log` field containing the substring `error` or `ERROR` (fallback)

---

## Implementation Steps

### Step 1: Define the Elasticsearch query

The query fetches the last 15 minutes of error logs for a given namespace, sorted newest-first, limited to 10 documents:

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "term": { "kubernetes.namespace_name": "<namespace>" }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "now-15m",
              "lte": "now"
            }
          }
        }
      ],
      "should": [
        { "term": { "level": "error" } },
        { "term": { "level": "ERROR" } },
        { "term": { "severity": "error" } },
        { "term": { "severity": "ERROR" } },
        { "match_phrase": { "log": "ERROR" } },
        { "match_phrase": { "log": "Exception" } },
        { "match_phrase": { "log": "Error:" } }
      ],
      "minimum_should_match": 1
    }
  },
  "sort": [{ "@timestamp": { "order": "desc" } }],
  "size": 10,
  "_source": ["@timestamp", "log", "kubernetes.pod_name", "kubernetes.container_name", "level", "severity", "message"]
}
```

### Step 2: Test the query with curl

Before writing code, verify the query works against your Elasticsearch cluster:

```bash
# Port-forward to Elasticsearch (adjust service name/port as needed)
kubectl port-forward -n monitoring svc/elasticsearch-master 9200:9200 &

# Run test query for the allex-redis namespace
curl -s -X GET "http://localhost:9200/logstash-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"term": {"kubernetes.namespace_name": "allex-redis"}},
          {"range": {"@timestamp": {"gte": "now-15m", "lte": "now"}}}
        ],
        "should": [
          {"term": {"level": "error"}},
          {"term": {"level": "ERROR"}},
          {"match_phrase": {"log": "ERROR"}}
        ],
        "minimum_should_match": 1
      }
    },
    "sort": [{"@timestamp": {"order": "desc"}}],
    "size": 10,
    "_source": ["@timestamp", "log", "kubernetes.pod_name", "kubernetes.container_name"]
  }' | python3 -m json.tool | head -60
```

If you get hits, proceed. If you get 0 hits, check the index pattern: try replacing `logstash-*` with `kubernetes-*` or look at the actual index names.

### Step 3: Implement the Elasticsearch log context client

Create `src/context/elasticsearchClient.ts`:

```typescript
const ES_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch.monitoring.svc.cluster.local:9200';
const ES_INDEX = process.env.ELASTICSEARCH_INDEX_PATTERN || 'logstash-*';
const ES_TIMEOUT_MS = parseInt(process.env.ES_TIMEOUT_MS || '3000', 10);
const MAX_LOG_LINES = 10;
const MAX_CHARS_PER_LINE = 200;
const LOOKBACK_WINDOW = '15m';

export interface RawLogLine {
  timestamp: string;
  pod: string;
  container: string;
  message: string;
}

export interface SummarisedLogContext {
  topErrors: Array<{ message: string; count: number; example: string }>;
  rawLines: RawLogLine[];
  queryTimeMs: number;
  available: boolean;
  error?: string;
}

function buildQuery(namespace: string): object {
  return {
    query: {
      bool: {
        must: [
          { term: { 'kubernetes.namespace_name': namespace } },
          { range: { '@timestamp': { gte: `now-${LOOKBACK_WINDOW}`, lte: 'now' } } },
        ],
        should: [
          { term: { level: 'error' } },
          { term: { level: 'ERROR' } },
          { term: { severity: 'error' } },
          { term: { severity: 'ERROR' } },
          { match_phrase: { log: 'ERROR' } },
          { match_phrase: { log: 'Exception' } },
          { match_phrase: { log: 'Error:' } },
        ],
        minimum_should_match: 1,
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
    size: MAX_LOG_LINES,
    _source: ['@timestamp', 'log', 'message', 'kubernetes.pod_name', 'kubernetes.container_name'],
  };
}

function extractMessage(hit: any): string {
  // Fluentd may put the message in 'log' or 'message' depending on the parser
  const raw: string = hit._source?.log || hit._source?.message || '';
  return raw.slice(0, MAX_CHARS_PER_LINE).replace(/\s+/g, ' ').trim();
}

function summariseLogLines(lines: RawLogLine[]): Array<{ message: string; count: number; example: string }> {
  // Group identical messages (normalise whitespace for grouping)
  const groups = new Map<string, { count: number; example: string }>();
  for (const line of lines) {
    const key = line.message.replace(/\d+/g, 'N').replace(/[0-9a-f]{8,}/gi, '<id>');
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { count: 1, example: line.message });
    }
  }
  // Return top 3 by count
  return Array.from(groups.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 3)
    .map(([message, { count, example }]) => ({ message, count, example }));
}

export async function getRecentErrorLogs(namespace: string): Promise<SummarisedLogContext> {
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ES_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${ES_URL}/${ES_INDEX}/_search`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildQuery(namespace)),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const queryTimeMs = Date.now() - startTime;

    if (!response.ok) {
      console.error(JSON.stringify({
        event: 'elasticsearch_query_error',
        namespace,
        status: response.status,
        query_time_ms: queryTimeMs,
      }));
      return { topErrors: [], rawLines: [], queryTimeMs, available: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json() as any;
    const hits = data?.hits?.hits || [];

    const rawLines: RawLogLine[] = hits.map((hit: any) => ({
      timestamp: hit._source?.['@timestamp'] || '',
      pod: hit._source?.kubernetes?.pod_name || hit._source?.['kubernetes.pod_name'] || 'unknown',
      container: hit._source?.kubernetes?.container_name || hit._source?.['kubernetes.container_name'] || 'unknown',
      message: extractMessage(hit),
    }));

    const topErrors = summariseLogLines(rawLines);

    console.log(JSON.stringify({
      event: 'elasticsearch_query_success',
      namespace,
      hits_count: hits.length,
      top_error_count: topErrors.length,
      query_time_ms: queryTimeMs,
    }));

    return { topErrors, rawLines, queryTimeMs, available: true };

  } catch (err) {
    clearTimeout(timeoutId);
    const queryTimeMs = Date.now() - startTime;
    const isTimeout = String(err).includes('abort') || String(err).includes('AbortError');

    console.error(JSON.stringify({
      event: isTimeout ? 'elasticsearch_timeout' : 'elasticsearch_error',
      namespace,
      error: String(err),
      query_time_ms: queryTimeMs,
    }));

    return {
      topErrors: [],
      rawLines: [],
      queryTimeMs,
      available: false,
      error: isTimeout ? 'Elasticsearch query timed out' : String(err),
    };
  }
}

/**
 * Formats the log context summary into a string suitable for injection into the OpenAI prompt.
 * Caps total length to avoid inflating token count.
 */
export function formatLogContextForPrompt(context: SummarisedLogContext): string | null {
  if (!context.available || context.topErrors.length === 0) {
    return null;
  }

  const lines = context.topErrors.map(
    (e, i) => `${i + 1}. [x${e.count}] ${e.example}`
  );
  return lines.join('\n').slice(0, 1000); // Hard cap at 1000 chars for prompt injection
}
```

### Step 4: Integrate log context into the webhook handler

In `src/routes/webhook.ts`, add the Elasticsearch query before the OpenAI call:

```typescript
import { getRecentErrorLogs, formatLogContextForPrompt } from '../context/elasticsearchClient';

// Inside the alert processing loop, before the OpenAI call:
let recentLogContext: string | null = null;
let logContextAvailable = false;

if (!shadowMode) {
  const logResult = await getRecentErrorLogs(alert.namespace);
  logContextAvailable = logResult.available;
  recentLogContext = formatLogContextForPrompt(logResult);

  if (!logResult.available) {
    console.log(JSON.stringify({
      event: 'log_context_unavailable',
      alert_name: alert.alertName,
      namespace: alert.namespace,
      reason: logResult.error,
    }));
  }
}

// Then pass recentLogContext to enrichAlert():
enrichmentResult = await enrichAlert(alert, payload.alerts.length, recentLogContext);
```

Update the `EnrichedIncident` construction to populate the log context fields:

```typescript
recentLogContext: logResult?.rawLines.slice(0, 5).map(l => ({
  timestamp: l.timestamp,
  message: l.message,
  count: 1,
})) || null,
logContextAvailable,
```

### Step 5: Add environment variables to the HelmRelease

In `kubernetes-resources/releases/monitoring/ai-alert-router/helm-release.yaml`, add:

```yaml
      - name: ELASTICSEARCH_URL
        value: "http://elasticsearch-master.monitoring.svc.cluster.local:9200"
      - name: ELASTICSEARCH_INDEX_PATTERN
        value: "logstash-*"
      - name: ES_TIMEOUT_MS
        value: "3000"
```

> **Note:** Verify the correct Elasticsearch service name in your cluster:
> ```bash
> kubectl get svc -n monitoring | grep -i elastic
> ```
> Update the `ELASTICSEARCH_URL` value accordingly.

---

## Verification

### Verify Elasticsearch is reachable from the monitoring namespace

```bash
kubectl run -it --rm es-test --image=curlimages/curl:latest --restart=Never -n monitoring -- \
  curl -s http://elasticsearch-master.monitoring.svc.cluster.local:9200/_cluster/health | python3 -m json.tool
```

Expected: `{"status":"green",...}` or `{"status":"yellow",...}`

### Test the query manually

```bash
# Port-forward Elasticsearch
kubectl port-forward -n monitoring svc/elasticsearch-master 9200:9200 &

# Check available indices
curl -s http://localhost:9200/_cat/indices/logstash-*?v | head -5

# Run the test query
curl -s -X POST "http://localhost:9200/logstash-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"term": {"kubernetes.namespace_name": "allex-notifications"}},
          {"range": {"@timestamp": {"gte": "now-15m"}}}
        ],
        "should": [
          {"term": {"level": "error"}},
          {"match_phrase": {"log": "ERROR"}}
        ],
        "minimum_should_match": 1
      }
    },
    "sort": [{"@timestamp": {"order": "desc"}}],
    "size": 5,
    "_source": ["@timestamp", "log", "kubernetes.pod_name"]
  }' | python3 -m json.tool
```

### Verify log context appears in pod logs

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=ai-alert-router --tail=50 | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('event') in ('elasticsearch_query_success', 'elasticsearch_timeout', 'log_context_unavailable'):
            print(json.dumps(obj, indent=2))
    except:
        pass
"
```

### Test the timeout fallback

```bash
# Set ES_TIMEOUT_MS to 1ms locally to force timeout
export ES_TIMEOUT_MS=1
# Send a test webhook — should see event: elasticsearch_timeout in logs
# Enrichment should still proceed (with recentLogContext=null)
```

---

## Rollback

Elasticsearch context is purely additive. If it causes problems, set `ES_TIMEOUT_MS=1` in the HelmRelease to effectively disable it (all queries will time out immediately and proceed without context). Or set a flag `ES_ENABLED=false` in the service code to skip the query entirely.

---

## Acceptance Criteria

- [ ] `event: elasticsearch_query_success` appears in logs when the service processes an alert with `SHADOW_MODE=false`
- [ ] `hits_count` and `top_error_count` fields are present in the success log
- [ ] When Elasticsearch is unreachable or `ES_TIMEOUT_MS=1`, `event: elasticsearch_timeout` appears and enrichment continues without crashing
- [ ] `log_context_available: false` is correctly set in the EnrichedIncident when ES is unavailable
- [ ] Log lines in the context are truncated to 200 characters
- [ ] At most 3 deduplicated error groups are injected into the OpenAI prompt
- [ ] Prompt injection is capped at 1000 characters total
- [ ] `GET /health` returns 200 regardless of Elasticsearch availability
- [ ] No log line content (user data, PII) appears in structured log events

