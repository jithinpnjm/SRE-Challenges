# Foundations: Prometheus, Grafana, And Alertmanager Zero To Hero

Prometheus, Grafana, and Alertmanager are the practical toolchain behind many Kubernetes and SRE observability systems.

Prometheus collects and evaluates metrics. Grafana visualizes them. Alertmanager routes alerts to humans and systems.

This guide is designed as a complete path:

- Beginner: what each tool does and how metrics work
- Intermediate: PromQL, dashboards, alert rules, exporters
- Advanced: recording rules, cardinality, Alertmanager routing, Thanos, scaling
- SRE Level: debug missing metrics, noisy alerts, high-cardinality incidents, broken dashboards
- Interview Level: explain how a production metrics stack should be designed and operated

---

# Part 1: The Mental Model

```text
Applications / nodes / exporters expose /metrics
Prometheus scrapes targets on a schedule
Prometheus stores time series locally
Prometheus evaluates rules
Alertmanager receives firing alerts and routes notifications
Grafana queries Prometheus and renders dashboards
```

| Tool | Responsibility |
|---|---|
| Prometheus | scrape, store, query, evaluate alerts |
| Grafana | visualize and explore data |
| Alertmanager | group, deduplicate, silence, inhibit, route alerts |
| Exporters | expose metrics for systems that do not speak Prometheus natively |

---

# Part 2: Prometheus Metrics Format

Targets expose metrics over HTTP, usually at `/metrics`.

```text
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="GET",status="500"} 7
```

Metric = name + labels + value + timestamp.

Labels create dimensions. Too many label combinations create cardinality problems.

---

# Part 3: Metric Types

| Type | Meaning | Query pattern |
|---|---|---|
| Counter | only increases | `rate()` / `increase()` |
| Gauge | current value | direct query |
| Histogram | bucketed observations | `histogram_quantile()` |
| Summary | client-side quantiles | avoid for aggregation |

Examples:

```promql
rate(http_requests_total[5m])
process_resident_memory_bytes
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

---

# Part 4: PromQL Basics

## Selectors

```promql
http_requests_total{job="api"}
http_requests_total{status=~"5.."}
http_requests_total{status!~"2.."}
```

## Rate

```promql
rate(http_requests_total[5m])
increase(http_requests_total[1h])
```

Use `rate()` for alerts and dashboards. Use `irate()` only for very spiky instant dashboards.

## Aggregation

```promql
sum(rate(http_requests_total[5m]))
sum by (service) (rate(http_requests_total[5m]))
avg by (instance) (node_load1)
```

---

# Part 5: Useful SRE PromQL

## Error Rate

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

## P99 Latency

```promql
histogram_quantile(0.99,
  sum by (le, service) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

## CPU Usage

```promql
100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))
```

## Memory Usage

```promql
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
```

## Pod Restarts

```promql
increase(kube_pod_container_status_restarts_total[15m])
```

---

# Part 6: Histograms And Percentiles

Histograms estimate percentiles from buckets.

Important:

- buckets must match expected latency range
- aggregate with `sum by (le, ...)` before `histogram_quantile`
- do not average percentiles

Bad:

```promql
avg(http_request_duration_seconds{quantile="0.99"})
```

Better:

```promql
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
)
```

---

# Part 7: Scraping And Service Discovery

Static scrape:

```yaml
scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["node1:9100", "node2:9100"]
```

Kubernetes discovery commonly scrapes:

- pods
- services
- endpoints
- nodes
- kube-state-metrics
- node-exporter

If a target is down, query:

```promql
up == 0
```

Then check Prometheus Targets UI.

---

# Part 8: Exporters

Common exporters:

| Exporter | Purpose |
|---|---|
| node_exporter | Linux host metrics |
| kube-state-metrics | Kubernetes object state |
| blackbox_exporter | HTTP/TCP/DNS probes |
| postgres_exporter | PostgreSQL metrics |
| redis_exporter | Redis metrics |
| nginx exporter | NGINX metrics |
| DCGM exporter | NVIDIA GPU metrics |

Exporter rule:

> Exporters expose system facts. Alerts must still map to user impact or clear operational action.

---

# Part 9: Recording Rules

Recording rules precompute expensive or repeated PromQL.

```yaml
groups:
  - name: service-recording-rules
    rules:
      - record: service:http_requests:rate5m
        expr: sum by (service) (rate(http_requests_total[5m]))
```

Use for:

- repeated dashboard queries
- SLO calculations
- expensive histogram queries
- long retention/global aggregation

---

# Part 10: Alert Rules

```yaml
groups:
  - name: service-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: page
          team: platform
        annotations:
          summary: "High error rate"
          runbook_url: "https://runbooks/high-error-rate"
```

`for:` prevents noisy alerts from short spikes.

Good alerts include:

- severity
- owner/team
- summary
- runbook
- impact description

---

# Part 11: SLO Burn Rate Alerts

Burn rate connects alerts to error budgets.

```promql
(
  1 - (
    sum(rate(http_requests_total{status!~"5.."}[1h]))
    /
    sum(rate(http_requests_total[1h]))
  )
) / 0.001 > 14
```

For a 99.9% SLO, allowed error rate is `0.001`.

Multi-window alerts reduce false positives.

---

# Part 12: Alertmanager

Alertmanager does not decide alert conditions. Prometheus does.

Alertmanager handles:

- grouping
- deduplication
- routing
- silences
- inhibition
- notification delivery

Routing example:

```yaml
route:
  group_by: ["alertname", "service"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: slack-default
  routes:
    - matchers:
        - severity="page"
      receiver: pagerduty
```

---

# Part 13: Silences And Inhibition

Silence planned maintenance:

```bash
amtool silence add alertname="NodeDown" node="node1" --duration=2h --comment="maintenance"
```

Inhibition example:

> If `NodeDown` fires, suppress pod alerts from that node.

This prevents alert storms.

---

# Part 14: Grafana Dashboard Design

A good dashboard answers one question quickly.

Service dashboard layout:

1. Rate, errors, duration
2. saturation/resources
3. dependencies
4. recent deploy markers/log links

Useful panels:

- time series
- stat
- gauge
- table
- heatmap
- logs panel
- alert list

Use variables:

```text
$service
$namespace
$cluster
$env
```

---

# Part 15: Cardinality

Cardinality = number of unique time series.

Bad label examples:

- user_id
- request_id
- trace_id
- full URL with IDs
- pod UID where not needed

Diagnose:

```promql
topk(10, count by (__name__) ({__name__=~".+"}))
count(http_requests_total)
```

High cardinality causes memory pressure, slow queries, and TSDB growth.

---

# Part 16: Scaling Prometheus

Single Prometheus is simple but limited.

Scaling options:

- vertical scaling
- federation
- functional sharding
- Thanos
- Cortex/Mimir

Thanos adds:

- object storage retention
- global query
- deduplication
- downsampling

---

# Part 17: Troubleshooting By Symptom

## Grafana Shows No Data

Check:

- PromQL directly in Prometheus
- time range
- label selectors
- scrape target status

## Target `up == 0`

Check:

- target reachable from Prometheus
- port/path correct
- network policy/firewall
- service discovery labels

## Prometheus Memory High

Likely:

- high cardinality
- expensive queries
- too many targets

Check:

```promql
prometheus_tsdb_head_series
prometheus_engine_query_duration_seconds
```

## Alert Did Not Page

Check:

- Prometheus rule state
- Alertmanager received alert
- routing labels
- silence/inhibition
- receiver config

---

# Part 18: Real Incident Stories

## User ID Label Took Down Prometheus

Cause:

- application exported user_id label
- millions of active series

Fix:

- remove unbounded label
- relabel/drop at scrape temporarily
- restart/scale Prometheus if needed

## Alert Storm During Node Failure

Cause:

- no inhibition rules

Fix:

- node-level alert inhibits child pod alerts

## Dashboard Hid Latency Problem

Cause:

- average latency panel only

Fix:

- p95/p99 histogram panels
- dependency latency panels

---

# Part 19: Labs

## Beginner

- run node_exporter
- scrape with Prometheus
- query `up`
- create Grafana panel

## Intermediate

- write service error-rate query
- create alert rule
- route warning to Slack/mock receiver
- build RED dashboard

## Advanced

- create recording rules
- simulate high cardinality
- build SLO burn alert
- configure Alertmanager inhibition

---

# Part 20: Interview Questions

- Why Prometheus pull model?
- Counter vs gauge?
- Why use `rate()`?
- How does `histogram_quantile` work?
- What causes high cardinality?
- What does Alertmanager do?
- How do you design a useful dashboard?
- How would you scale Prometheus?

---

# Part 21: Senior Answer Shape

> I design Prometheus around actionable service and infrastructure signals. Services expose low-cardinality metrics with counters, gauges, and histograms. Prometheus scrapes and evaluates rules, Grafana visualizes RED/USE dashboards, and Alertmanager routes only actionable alerts with clear ownership and runbooks. I control cardinality, precompute expensive SLO queries with recording rules, and use burn-rate alerts for paging instead of arbitrary thresholds.

---

# Recall Prompts

- Why should counters use `rate()`?
- Why is `user_id` a dangerous label?
- What does `for:` do in an alert rule?
- What is the difference between silence and inhibition?
- Why should dashboards start with RED metrics?
