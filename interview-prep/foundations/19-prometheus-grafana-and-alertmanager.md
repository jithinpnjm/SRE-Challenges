# Prometheus, Grafana, and Alertmanager

## What It Is and Why It Matters

Prometheus is a pull-based metrics collection and storage system built for dynamic cloud-native environments. Grafana is the visualization and dashboarding layer. Alertmanager handles alert routing, deduplication, and notification delivery.

Together, these three tools form the de-facto standard observability stack for Kubernetes and cloud-native systems. They are installed by default in most managed Kubernetes environments, used in Google, Netflix, Cloudflare, and virtually every large-scale infrastructure team.

Understanding this stack deeply — not just querying pre-built dashboards, but writing PromQL, designing recording rules, structuring Alertmanager routing, scaling Prometheus, and debugging cardinality — is a core SRE competency.

---

## Mental Model

**Prometheus scrapes metrics on a schedule.** Every 15-30 seconds, it connects to each target's HTTP endpoint (`/metrics`) and reads the current values. It stores these as time series in its local TSDB.

**Grafana queries Prometheus.** Grafana sends PromQL queries and renders results as time series graphs, heatmaps, gauges, and tables. Grafana does not store metrics — it is a view layer.

**Alertmanager receives alerts from Prometheus.** When a PromQL expression evaluates to true for longer than `for:` duration, Prometheus sends a firing alert to Alertmanager. Alertmanager routes, deduplicates, and delivers notifications.

```
Services → /metrics endpoint (Prometheus format)
     ↑
Prometheus (scrapes every 15s)
     |→ TSDB (local storage, 2-week default retention)
     |→ Alertmanager (alerts when rules fire)
          |→ PagerDuty / Slack / email / webhook
     ↑
Grafana (queries, visualizes)
```

---

## Core Concepts

### The /metrics Exposition Format

Every Prometheus target exposes metrics on an HTTP endpoint in a plain-text format:

```
# HELP http_requests_total Total HTTP requests by method and status code
# TYPE http_requests_total counter
http_requests_total{method="GET", status="200"} 1234
http_requests_total{method="GET", status="500"} 7
http_requests_total{method="POST", status="200"} 456
http_requests_total{method="POST", status="429"} 23

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05"} 800
http_request_duration_seconds_bucket{le="0.1"} 1050
http_request_duration_seconds_bucket{le="0.25"} 1200
http_request_duration_seconds_bucket{le="0.5"} 1220
http_request_duration_seconds_bucket{le="1.0"} 1234
http_request_duration_seconds_bucket{le="+Inf"} 1234
http_request_duration_seconds_sum 87.3
http_request_duration_seconds_count 1234

# HELP process_resident_memory_bytes Current RSS in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 52428800
```

Key points:
- `# HELP` is the description
- `# TYPE` declares the metric type
- Labels are key=value pairs in `{}`
- Counters should never decrease (unless process restarts)
- The `+Inf` bucket in histograms must always equal `_count`

### The Four Metric Types in Detail

**Counter:** Monotonically increasing. Only goes up (or resets to 0 on process restart). Always use `rate()` or `increase()` when querying — the raw value is meaningless without context.

```promql
# Raw value (meaningless by itself)
http_requests_total

# Per-second rate over last 5 minutes
rate(http_requests_total[5m])

# Total increase over last hour
increase(http_requests_total[1h])
```

**Gauge:** Current value, goes up or down. Direct value is meaningful.

```promql
# Current memory usage
process_resident_memory_bytes

# Rate of change (useful for trending)
deriv(process_resident_memory_bytes[10m])
```

**Histogram:** Records observations in configurable buckets. Enables quantile calculation.

```promql
# P99 latency from histogram
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# P99 per service
histogram_quantile(0.99,
  sum by (service, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

**Summary:** Client-side computed quantiles. Unlike histograms, summaries cannot be aggregated across instances — use histograms for services with multiple replicas.

```promql
# This CANNOT be meaningfully aggregated across replicas
rpc_duration_seconds{quantile="0.99"}
```

### Scrape Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s          # default scrape interval
  evaluation_interval: 15s      # how often to evaluate rules
  scrape_timeout: 10s

scrape_configs:
  # Static targets
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node1:9100', 'node2:9100', 'node3:9100']

  # Kubernetes auto-discovery — scrape all pods with annotation
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Only scrape pods with annotation prometheus.io/scrape: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      # Use custom port if annotation exists
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (\d+)
        replacement: $1
      # Expose pod name as a label
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      # Expose namespace as a label
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

  # Kubernetes service endpoints (for services with prometheus.io/scrape annotation)
  - job_name: 'kubernetes-service-endpoints'
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

---

## PromQL — The Query Language

### Selectors and Matchers

```promql
# Exact match
http_requests_total{job="api"}

# Regex match
http_requests_total{status=~"5.."}   # any 5xx

# Negative match
http_requests_total{status!="200"}

# Negative regex
http_requests_total{status!~"2.."}   # not 2xx

# Time range vector (for rate/increase/etc)
http_requests_total[5m]              # values over last 5 minutes
```

### Aggregation Operators

```promql
# Sum across all instances of a job
sum(rate(http_requests_total[5m]))

# Sum, preserving the "service" label
sum by (service) (rate(http_requests_total[5m]))

# Sum, removing the "instance" label (keep everything else)
sum without (instance) (rate(http_requests_total[5m]))

# Max across all pods
max by (service) (rate(http_requests_total[5m]))

# Count of time series (useful for capacity questions)
count by (service) (up{job="api"})

# 95th percentile of a gauge across all nodes
quantile(0.95, node_memory_MemFree_bytes)
```

### Rate vs Increase vs Irate

```promql
# rate(): per-second average over the window — smoothed, handles counter resets
rate(http_requests_total[5m])

# increase(): total increase over the window (= rate * window seconds)
increase(http_requests_total[1h])

# irate(): per-second rate using only the last two samples — instant rate, noisy
# Use irate only for high-resolution dashboards, not for alerts
irate(http_requests_total[5m])
```

Rule of thumb: **use `rate()` for alerts and dashboards**, use `irate()` only when you need instant reaction to spikes in dashboards.

### Arithmetic and Comparisons

```promql
# Error ratio
rate(http_requests_total{status=~"5.."}[5m])
  /
rate(http_requests_total[5m])

# Memory usage percentage
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# CPU usage percentage
(1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100

# Threshold comparison (returns matching time series when condition is true)
rate(http_requests_total{status=~"5.."}[5m]) > 0.01
```

### Joins Between Metrics

```promql
# Join: add service name from one metric to another
# Both metrics must have matching label sets or use "on" clause
http_requests_total * on (pod) group_left (service)
  kube_pod_labels{label_app!=""}

# Unless: only return first metric where second metric has no matching series
# Useful for "show me pods that don't have a corresponding service"
kube_pod_info unless on (pod) kube_pod_labels{label_monitored="true"}
```

### Recording Rules

Recording rules pre-compute expensive PromQL expressions and store the result as a new metric. This speeds up dashboards and reduces query load.

```yaml
# prometheus-rules.yml
groups:
  - name: slo_recording_rules
    interval: 30s
    rules:
      # Pre-compute error rate per service
      - record: job:http_errors:rate5m
        expr: |
          sum by (job) (
            rate(http_requests_total{status=~"5.."}[5m])
          )

      # Pre-compute request rate per service
      - record: job:http_requests:rate5m
        expr: |
          sum by (job) (
            rate(http_requests_total[5m])
          )

      # Pre-compute error ratio (uses recorded metrics above)
      - record: job:http_error_ratio:rate5m
        expr: |
          job:http_errors:rate5m
          /
          job:http_requests:rate5m
```

Use recording rules for:
- Any expression that appears in multiple alert rules or dashboards
- Histogram quantile computations (expensive to repeat)
- Cross-dimensional aggregations for SLO tracking

---

## Alert Rules

### Alert Rule Structure

```yaml
groups:
  - name: service_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{status=~"5.."}[5m])
            / rate(http_requests_total[5m])
          ) > 0.01
        for: 5m          # must be true for 5 consecutive minutes before firing
        labels:
          severity: page
          team: platform
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: |
            Error rate is {{ $value | humanizePercentage }} on {{ $labels.service }}.
            Current value: {{ $value }}
          runbook_url: "https://wiki.internal/runbooks/high-error-rate"

      - alert: SloBurnRateCritical
        expr: |
          (
            (
              1 - (
                sum(rate(http_requests_total{status!~"5.."}[1h]))
                / sum(rate(http_requests_total[1h]))
              )
            ) / 0.001
          ) > 14
          and
          (
            (
              1 - (
                sum(rate(http_requests_total{status!~"5.."}[6h]))
                / sum(rate(http_requests_total[6h]))
              )
            ) / 0.001
          ) > 14
        for: 2m
        labels:
          severity: page
        annotations:
          summary: "SLO burn rate critical — budget depleting fast"
```

### The `for:` Clause

The `for:` clause prevents false positives from momentary spikes. During the pending period, the alert has state `PENDING`. After `for:` duration elapses while still true, it becomes `FIRING`.

- Too short (`for: 1m`): noisy, paging on transient blips
- Too long (`for: 30m`): slow to fire during real incidents
- Common values: `5m` for standard alerts, `2m` for critical SLO burn rate alerts

### Alert Labels and Routing

Labels on alerts drive Alertmanager routing. Key convention:
- `severity: page` — wakes someone up (PagerDuty)
- `severity: warning` — Slack channel
- `severity: ticket` — JIRA or similar
- `team: platform` — routes to platform team's routing tree

---

## Alertmanager Deep Dive

### Configuration Structure

```yaml
global:
  resolve_timeout: 5m                   # how long before resolved alerts are marked inactive
  smtp_smarthost: 'smtp.gmail.com:587'

route:
  group_by: ['alertname', 'cluster']    # group alerts with same labels together
  group_wait: 30s                       # wait before sending first notification (collects more alerts)
  group_interval: 5m                    # wait between notifications for same group
  repeat_interval: 4h                   # re-notify if alert still firing after this
  receiver: 'slack-default'

  routes:
    # Critical alerts go to PagerDuty, with shorter repeat
    - matchers:
        - severity="page"
      receiver: pagerduty-critical
      group_wait: 0s
      repeat_interval: 30m
      continue: false     # stop processing further routes

    # Platform team warnings
    - matchers:
        - severity="warning"
        - team="platform"
      receiver: slack-platform
      continue: true      # continue to also send to default

inhibit_rules:
  # If a critical alert fires, silence warnings for the same service
  - source_matchers:
      - severity="page"
    target_matchers:
      - severity="warning"
    equal: ['service']    # only inhibit if service labels match

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: '<pagerduty-integration-key>'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          description: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: slack-platform
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#platform-alerts'
        title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          *Runbook:* {{ .Annotations.runbook_url }}
          {{ end }}
        send_resolved: true

  - name: slack-default
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts-all'
```

### Silences

Silences suppress alerts for a time window. Use during planned maintenance, known incidents, or after deploy to prevent noise.

```bash
# Create a silence via amtool
amtool silence add --alertmanager.url=http://alertmanager:9093 \
  --author="jithin" \
  --comment="planned maintenance window" \
  --duration=2h \
  alertname="DiskSpaceWarning" cluster="prod"

# List active silences
amtool silence --alertmanager.url=http://alertmanager:9093

# Expire a silence
amtool silence expire --alertmanager.url=http://alertmanager:9093 <silence-id>
```

### Inhibition Rules

Inhibition prevents alert storms. If a datacenter is down, you don't want 200 individual service alerts — just the datacenter alert.

```yaml
inhibit_rules:
  # NodeDown inhibits all alerts from that node
  - source_matchers:
      - alertname="NodeDown"
    target_matchers:
      - alertname!="NodeDown"
    equal: ['node']

  # Cluster-level alert inhibits service-level alerts
  - source_matchers:
      - alertname="ClusterNetworkPartition"
    target_matchers:
      - severity=~"warning|page"
    equal: ['cluster']
```

---

## Grafana

### Data Sources

Grafana connects to Prometheus via a data source. Common configuration:

```
URL: http://prometheus:9090
Access: Server (backend)
Scrape interval: 15s
Query timeout: 60s
```

For high-availability Prometheus with multiple replicas, use a load balancer in front, or configure Grafana to use Thanos as the data source.

### Dashboard JSON and Provisioning

Grafana dashboards can be provisioned as code (GitOps):

```yaml
# grafana/provisioning/dashboards/dashboard.yaml
apiVersion: 1
providers:
  - name: 'default'
    orgId: 1
    folder: 'SRE'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

Then mount dashboard JSON files at that path. Changes in Git automatically propagate to Grafana.

### Useful Panel Types

| Panel Type | Best For |
|-----------|----------|
| Time series | Rate/gauge metrics over time |
| Stat | Current value with threshold coloring |
| Gauge | Current % value (CPU, disk, error budget) |
| Table | Multi-metric comparison across services |
| Heatmap | Latency distribution over time (histogram data) |
| Logs panel | Recent error logs from Loki |
| Alert list | Current firing alerts |

### Template Variables

```
# Define variables in dashboard settings → Variables
Name: service
Type: Query
Data source: Prometheus
Query: label_values(http_requests_total, service)

Name: env
Type: Custom
Values: prod,staging,dev

Name: interval
Type: Interval
Values: 1m,5m,15m,1h
```

Use in panels:
```promql
rate(http_requests_total{service="$service", env="$env"}[$interval])
```

### Exemplars

Grafana and Prometheus support exemplars: specific trace IDs attached to metric data points. When you see a latency spike in Grafana, click on the spike and it shows exemplar trace IDs — one click to the trace in Jaeger/Tempo.

Requires histogram metrics with exemplar support (Go clients support this natively in Prometheus 2.26+).

---

## Prometheus Scaling

### The Single-Node Limit

A single Prometheus instance can handle roughly 1M active time series at roughly 10GB RAM. Beyond that, you need federation, sharding, or a remote storage backend.

### Federation

Federation lets one Prometheus scrape summary metrics from other Prometheus instances:

```yaml
# Top-level "global" Prometheus federates from region-level instances
scrape_configs:
  - job_name: 'federate'
    scrape_interval: 60s            # scrape less frequently than local
    honor_labels: true
    metrics_path: '/federate'
    params:
      match[]:
        - '{job="important-service"}'       # only federate matching metrics
        - 'up'
    static_configs:
      - targets:
          - 'prometheus-us:9090'
          - 'prometheus-eu:9090'
```

Federation is simple but has limitations: you only get pre-aggregated data, not raw series.

### Thanos

Thanos extends Prometheus with:
- **Sidecar**: uploads Prometheus blocks to object storage (S3/GCS), enables long-term retention
- **Store**: serves historical data from object storage back to Thanos Query
- **Query**: global query layer that fans out to multiple Prometheus/Sidecars/Stores
- **Compactor**: downsamples historical data (2h to 6h to 1d resolution)
- **Ruler**: runs recording and alert rules on the global view

```
Prometheus (local, 2-week retention)
    + Thanos Sidecar
        → S3/GCS bucket (unlimited retention)
            → Thanos Store
                → Thanos Query (global view, deduplicated)
                    → Grafana
```

### Cardinality — The Most Common Scaling Problem

Cardinality = number of unique label value combinations. High cardinality destroys Prometheus performance.

Bad pattern — unbounded label:
```go
// DO NOT DO THIS
http_requests_total.WithLabelValues(userID)  // millions of users = millions of series
```

Good pattern:
```go
// Use coarse labels only
http_requests_total.WithLabelValues(method, statusCode, endpoint)
// endpoint should be a pattern like "/api/users/{id}", not the actual user ID
```

Diagnosing cardinality issues:
```promql
# Top 10 metrics by cardinality
topk(10, count by (__name__) ({__name__=~".+"}))

# Series count for a specific metric
count(http_requests_total)
```

When a metric has more than 10,000 series, investigate whether labels have unbounded values.

---

## Common Exporters

| Exporter | What It Monitors | Port |
|---------|-----------------|------|
| node_exporter | Linux host: CPU, memory, disk, network | 9100 |
| kube-state-metrics | Kubernetes object state: pod/node/deployment | 8080 |
| blackbox_exporter | HTTP/TCP/DNS probes | 9115 |
| postgres_exporter | PostgreSQL metrics | 9187 |
| redis_exporter | Redis metrics | 9121 |
| nginx-prometheus-exporter | NGINX status | 9113 |
| nvidia-dcgm-exporter | GPU metrics (via DCGM) | 9400 |
| pushgateway | Batch jobs that can't be scraped | 9091 |

### When to Use Pushgateway

Pushgateway is for batch jobs that exist for shorter than the scrape interval (5-minute jobs, cron jobs). The job pushes its final metrics before exiting:

```python
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway
import time

registry = CollectorRegistry()
job_duration = Gauge('batch_job_duration_seconds', 'Duration of batch job', registry=registry)
job_success = Gauge('batch_job_success', '1 if job succeeded', registry=registry)

start = time.time()
try:
    run_job()
    job_success.set(1)
except Exception:
    job_success.set(0)
    raise
finally:
    job_duration.set(time.time() - start)
    push_to_gateway('pushgateway:9091', job='nightly-backup', registry=registry)
```

Warning: Pushgateway does not expire stale metrics automatically. A failed job can leave stale "success" metrics. Always push a `0` explicitly on failure.

---

## Common Failure Modes

**Alert fires but clears before on-call responds:** The `for:` duration is short, and the condition is transient. Either increase `for:` duration, or verify this is a real symptom that needs fixing. If it's always transient, the alert may be wrong.

**Prometheus TSDB out of disk:** Default retention is 15 days. At high cardinality, this consumes hundreds of GB. Monitor `prometheus_tsdb_storage_blocks_bytes` and set retention via `--storage.tsdb.retention.time` or `--storage.tsdb.retention.size`.

**Scrape target `up` metric is 0:** The target is not reachable. Check: network connectivity, firewall rules, port, path. Use `curl http://target:9090/metrics` from the Prometheus pod to verify.

**High memory usage in Prometheus:** Usually cardinality. Check `prometheus_tsdb_head_series` — if this is in the millions, find and fix high-cardinality metrics.

**Alertmanager not routing correctly:** Use the `/api/v2/alerts` API to see what Alertmanager received. Use amtool to test routing: `amtool config routes test --alertmanager.url=http://alertmanager:9093 alertname="TestAlert" severity="page"`.

**Grafana shows "No data":** The metric name or label selector is wrong, or the time range is outside available data. Verify with a direct Prometheus query first.

---

## Key Questions and Answers

**Q: Why does Prometheus use a pull model instead of push?**

Pull-based scraping means Prometheus controls the collection rate and can detect when a target goes down (the `up` metric becomes 0). With push, a target that silently stops sending metrics looks identical to one sending at low rate. Pull also means Prometheus doesn't need to know in advance how to receive metrics — it just needs a list of endpoints. For short-lived jobs that can't be scraped, the Pushgateway bridges push into pull.

**Q: What is the difference between a counter and a gauge, and why does it matter for querying?**

A counter only goes up. Its raw value is meaningless without context — you care about the rate of change. Always use `rate()` or `increase()` on counters. A gauge is the current value, queried directly. Using `rate()` on a gauge makes no sense. Misusing these leads to wrong graphs that look plausible but mislead.

**Q: Your Prometheus is slow and using too much memory. How do you investigate?**

Check `prometheus_tsdb_head_series` — high series count is the most common cause. Then: `topk(10, count by (__name__) ({__name__=~".+"}))` to find the top cardinality metrics. Inspect those metrics' labels for unbounded values (user IDs, request IDs, trace IDs in labels). The fix is either dropping those labels at scrape time with `relabel_configs`, or fixing the application. Also check query load: `prometheus_engine_query_duration_seconds` shows query execution time.

**Q: What happens when Alertmanager goes down during an incident?**

Prometheus continues collecting metrics and evaluating rules. Firing alerts are queued. When Alertmanager comes back up, Prometheus re-sends all currently-firing alerts. You may get duplicate notifications for alerts that were already sent before downtime. For high availability, run Alertmanager in a cluster (2-3 replicas with gossip protocol). Prometheus must be configured with all Alertmanager replicas in `alerting.alertmanagers`.

**Q: How do you write an alert that fires when a service goes down?**

```promql
# "up" metric is 1 when scrape succeeds, 0 when it fails
alert: ServiceDown
expr: up{job="my-service"} == 0
for: 2m
```

But this is cause-based. Better is to also alert on symptom: if the service is down but traffic is being absorbed by other replicas with no user impact, you may not need to page. Layer both: `up == 0` as a warning, high error rate as the page.

**Q: How does histogram_quantile work and what are its limitations?**

`histogram_quantile(p, metric_bucket)` interpolates the p-th percentile from the bucket counts. It assumes values are uniformly distributed within each bucket. If your P99 falls in the "0.1 to 0.5 second" bucket, it returns a value somewhere in that range — not the exact P99. The accuracy depends on bucket granularity. Also: `histogram_quantile` is accurate per-metric-source but should not be averaged across many instances — use `sum by (le)` first, then apply `histogram_quantile`.

---

## Points to Remember

- Prometheus pulls; targets expose `/metrics` in plain-text format
- Four metric types: counter (rate it), gauge (read it), histogram (quantile it), summary (don't aggregate)
- `rate()` for alerts and dashboards; `irate()` only for instant dashboards
- Always use `for:` on alert rules to prevent false positives from transient spikes
- Recording rules pre-compute expensive expressions for faster dashboards
- Alertmanager deduplicates, groups, and routes — it does not fire alerts (Prometheus does)
- `group_wait` lets Alertmanager collect related alerts before sending
- Inhibition silences child alerts when parent alert fires
- Cardinality kills Prometheus — never use unbounded label values (user IDs, trace IDs)
- Thanos adds long-term retention and global query across multiple Prometheus instances
- Federation is simpler than Thanos but only gives pre-aggregated data
- Grafana is a view layer — it stores nothing, it queries Prometheus
- Template variables make one dashboard serve all environments and services

## What to Study Next

- [Observability, SLOs, and Incident Response](./observability-slos-and-incident-response) — SLO design and alert strategy
- [Kubernetes GPU and AI Platforms](./kubernetes-gpu-ai-platforms-and-operators) — GPU-specific monitoring with DCGM exporter
- [Linux and Network Administration](./linux-and-network-administration) — host-level metrics interpretation
