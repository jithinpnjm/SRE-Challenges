# Observability, SLOs, and Incident Response

## What Is Observability and Why It Matters

Observability is the ability to understand what a system is doing internally by examining its external outputs — without having to modify or redeploy the system. The term comes from control theory: a system is observable if its internal state can be inferred from its outputs.

In practice, observability answers questions that monitoring cannot:

- Why is P99 latency high only for users in one region?
- Which specific service in this 40-node call graph is slow?
- Did this deploy cause the memory increase or was it already trending up?
- Is this alert caused by a real user-facing problem or an internal metric artifact?

**The difference between monitoring and observability:**
- Monitoring tells you *when* something is wrong (via thresholds on known metrics)
- Observability tells you *why* something is wrong (by letting you ask novel questions about system state)

The three pillars of observability are metrics, logs, and traces. Each answers a different question:

| Pillar | Question | Example |
|--------|----------|---------|
| Metrics | How much / how fast / how many | request rate, latency P99, error rate, CPU% |
| Logs | What happened, in what order | "user 1234 failed auth due to expired token" |
| Traces | Where in the call graph is time being spent | request took 800ms: 600ms in DB query |

A fourth signal — profiles — shows where CPU/memory time is spent inside a process. Useful for optimization, less useful for incident response.

---

## Mental Model: The Four Golden Signals

Google SRE defined four signals that matter for any user-facing service:

1. **Latency** — how long requests take (distinguish successful vs error latency)
2. **Traffic** — how much demand the system is receiving (requests/sec, queries/sec)
3. **Errors** — rate of requests that fail (5xx, timeouts, business logic errors)
4. **Saturation** — how full the service is (CPU%, queue depth, memory usage %)

If all four are fine, users are probably fine. If any one is anomalous, you have a starting point.

The USE method (Brendan Gregg) covers *infrastructure* resources:
- **U**tilization — how busy is the resource (%)
- **S**aturation — how much work is queued waiting
- **E**rrors — error events for that resource

The RED method (Tom Wilkie) covers *services*:
- **R**ate — requests per second
- **E**rrors — errors per second
- **D**uration — latency distribution

Use USE for nodes, disks, CPUs, network interfaces. Use RED for HTTP endpoints, gRPC services, database queries.

---

## Core Concepts — SLIs, SLOs, and SLAs

### SLI — Service Level Indicator

An SLI is a specific, measurable metric that represents a dimension of service quality from the user's perspective.

Good SLIs:
- Are proportions (fraction of events that were "good")
- Have a clear definition of "good"
- Are measured from the user's perspective, not the service's internal state

Examples:
```
SLI: fraction of HTTP requests to /api/checkout that returned 2xx within 500ms
SLI: fraction of DNS queries answered within 10ms
SLI: fraction of background jobs completed without error
```

Bad SLIs:
- CPU utilization (not directly user-facing)
- "Service is up" binary (too coarse)
- Internally-visible queue depth (not user-visible)

### SLO — Service Level Objective

An SLO is a target for an SLI over a time window.

```
SLO: 99.9% of checkout requests return 2xx within 500ms over a 28-day rolling window
SLO: DNS queries answered within 10ms for 99.5% of requests over 7 days
```

The SLO defines when you have a problem worth paging someone about. If your SLI is meeting the SLO, you should not be woken up at 3am — even if something looks slightly off.

**The SLO window matters:**
- Short windows (1 hour) are noisy — a single bad minute blows your budget
- Long windows (90 days) are slow to signal — a steady degradation takes months to alert
- 28-30 day rolling windows are the most common in production

### SLA — Service Level Agreement

An SLA is a contractual commitment between a service provider and a customer, with defined consequences (credits, refunds) if the SLA is violated. SLAs are always looser than SLOs — the SLO is your internal target, the SLA is your external commitment.

```
SLO: 99.9% availability (internal target, what team aims for)
SLA: 99.5% availability (external commitment, what you promise customers)
```

### Error Budget

The error budget is the allowable amount of unreliability derived from the SLO:

```
SLO: 99.9% over 28 days
Error budget: 0.1% × 28 days × 24h × 60min = 40.3 minutes/month

SLO: 99.99%
Error budget: 4.3 minutes/month
```

Error budgets shift the conversation:
- "Can we deploy on Friday?" → "How much error budget do we have left this month?"
- "Why do we need reliability work?" → "We spent our error budget 3 weeks into the month for 2 consecutive months"
- "Is this risk worth taking?" → "This feature deploy risks 2 minutes of downtime; we have 38 minutes left"

When error budget is exhausted: freeze new feature deploys, focus on reliability. When error budget is healthy: deploy faster, take more risk.

---

## Metrics Deep Dive

### Prometheus Data Model

Prometheus stores time series: metric name + label set + timestamp + float64 value.

```
http_requests_total{method="POST", status="500", service="checkout"} 42
node_cpu_seconds_total{cpu="0", mode="idle"} 12345.6
```

Four metric types:
- **Counter** — monotonically increasing (requests, errors, bytes). Use `rate()` or `increase()` to query.
- **Gauge** — current value, can go up or down (memory usage, queue depth, temperature)
- **Histogram** — samples observations into configurable buckets. Enables quantile approximation.
- **Summary** — client-side computed quantiles. Less flexible than histogram for aggregation.

### Writing Useful PromQL

```promql
# Error rate over 5 minutes
rate(http_requests_total{status=~"5.."}[5m])

# Error ratio (fraction of requests that failed)
rate(http_requests_total{status=~"5.."}[5m])
  /
rate(http_requests_total[5m])

# P99 latency from histogram
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket[5m])
)

# Per-service P99 latency
histogram_quantile(0.99,
  sum by (service, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# SLO compliance: fraction of requests completing within 200ms
sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m]))
  /
sum(rate(http_request_duration_seconds_count[5m]))

# Error budget burn rate (28-day window)
# If this exceeds 1.0, you're burning budget faster than the SLO allows
(
  1 - (
    sum(rate(http_requests_total{status!~"5.."}[1h]))
    / sum(rate(http_requests_total[1h]))
  )
) / (1 - 0.999)   # 0.999 = SLO target
```

### Histogram Buckets

Prometheus histograms need buckets configured to match your latency distribution. If your P99 is 200ms, you need buckets at 50ms, 100ms, 200ms, 500ms — not just 1s, 5s, 10s.

```yaml
# Good bucket configuration for a fast API
buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
```

Rule: the bucket containing the Nth percentile must exist, or `histogram_quantile` will return an inaccurate estimate.

---

## Logging

### Structured Logging

Plain-text logs are hard to search at scale. Structured JSON logs are machine-parseable, filterable, and aggregatable:

```json
{
  "timestamp": "2024-01-15T10:23:45.123Z",
  "level": "error",
  "service": "checkout",
  "trace_id": "abc123def456",
  "user_id": "u-789",
  "message": "payment gateway timeout",
  "duration_ms": 5023,
  "gateway": "stripe",
  "retry_count": 3
}
```

Key fields every log should carry:
- `trace_id` / `span_id` — link log to the trace
- `service` — which service emitted this
- `level` — debug/info/warn/error
- `timestamp` — RFC3339 or ISO8601, always UTC

### Log Levels in Production

In production, only emit `info` and above by default. Enable `debug` per-request via header or sampling — never enable debug globally in production (disk saturation, I/O impact).

```
DEBUG: internal state, function entry/exit, loop iterations
INFO:  significant events (request received, job started, config loaded)
WARN:  unexpected but recoverable (retry succeeded, fallback triggered)
ERROR: request-level failure (transaction failed, external service error)
FATAL: process-level failure (cannot connect to database at startup)
```

### Log Aggregation Pipeline

Typical flow:
```
Application stdout
    → Container runtime (Docker, containerd)
    → Log collector (Fluentd, Fluent Bit, Vector)
    → Log storage (Elasticsearch, Loki, CloudWatch, GCS)
    → Query/UI (Kibana, Grafana/Loki, CloudWatch Insights)
```

**Loki vs Elasticsearch:**
- Loki: index labels only (not full text), very cheap storage, tight Grafana integration
- Elasticsearch: full text index, rich query language, higher cost and complexity
- Loki is better for high-volume structured logs where you query by label; ES is better for full-text search

---

## Distributed Tracing

### What Traces Capture

A trace is a record of a single request as it travels through multiple services. Each unit of work is a **span**. Spans form a tree: the root span is the user-facing request, child spans are downstream calls.

```
trace_id: abc123
├── span: frontend.handle_checkout (800ms)
│   ├── span: auth.validate_token (5ms)
│   ├── span: inventory.check_stock (15ms)
│   └── span: payment.charge (775ms)        ← bottleneck
│       ├── span: payment.validate (3ms)
│       └── span: stripe.api_call (768ms)   ← external call slow
```

From this trace, you can immediately see: the 800ms request is caused by the Stripe API call taking 768ms.

### OpenTelemetry

OpenTelemetry (OTel) is the CNCF standard for instrumentation. It provides:
- SDKs for traces, metrics, and logs in 10+ languages
- A vendor-neutral protocol (OTLP)
- The OpenTelemetry Collector as a sidecar/agent for processing and routing telemetry

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

def process_payment(amount, user_id):
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("payment.amount", amount)
        span.set_attribute("user.id", user_id)
        result = stripe_client.charge(amount)
        span.set_attribute("payment.result", result.status)
        return result
```

### Sampling Strategy

You cannot afford to store every trace. Common strategies:

- **Head-based sampling**: decide at the start of the trace whether to sample (simple, but you'll miss rare errors)
- **Tail-based sampling**: buffer traces, decide after completion (captures 100% of errors, higher complexity)
- **Rate limiting**: keep N traces/second regardless of traffic level
- **Adaptive sampling**: sample at higher rate when error rate is high

For most services: always sample errors (100%), sample successes at 1-5%.

---

## Alert Design

### Symptom-Based vs Cause-Based Alerts

**Cause-based alerts** fire when a specific component is in a bad state:
```
Alert: disk_usage > 85%
Alert: pod restart count > 5 in 10 minutes
Alert: CPU > 90% for 5 minutes
```

Problems: cause-based alerts are noisy (CPU can spike without user impact), create alert fatigue, and miss problems you haven't thought of.

**Symptom-based alerts** fire when users are experiencing problems:
```
Alert: error rate > 1% for 5 minutes  (users getting errors)
Alert: P99 latency > 2 seconds for 5 minutes  (users experiencing slowness)
Alert: SLO burn rate > 14x for 1 hour  (error budget depleting fast)
```

The principle: **alert on symptoms, investigate causes.**

A cause-based alert (high disk) can be a useful warning (not yet paging) or an aid to diagnosis during an incident. It should not page on-call at 3am unless disk full directly causes user impact.

### Multi-Window Alert for SLO Burn Rate

The Google SRE Workbook defines a multi-window, multi-burn-rate alert that catches problems fast when severe and slowly when mild:

```yaml
# Short window: catches fast burns (spending budget quickly)
# Long window: confirms the burn is sustained, not a blip

# Tier 1: Critical (page immediately)
# Burn rate 14x = consuming 14x the allowed error rate
# At 14x burn: 1-hour window consumes 1.4% of monthly budget
# Long window confirms this is real, not a 1-minute spike
alert: SLO_BurnRate_Critical
expr: |
  (
    error_rate_1h > 14 * (1 - slo_target)
    and
    error_rate_6h > 14 * (1 - slo_target)
  )
for: 2m
severity: page

# Tier 2: Warning (ticket, not page)
# Burn rate 3x = consuming 3x allowed, budget gone in 10 days
alert: SLO_BurnRate_Warning
expr: |
  (
    error_rate_6h > 3 * (1 - slo_target)
    and
    error_rate_24h > 3 * (1 - slo_target)
  )
for: 15m
severity: ticket
```

In concrete PromQL for a 99.9% SLO:

```promql
# error_rate_1h
(
  1 - (
    sum(rate(http_requests_total{status!~"5.."}[1h]))
    / sum(rate(http_requests_total[1h]))
  )
) > 14 * 0.001
```

### Alert Routing with Alertmanager

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'service']
  group_wait: 30s       # wait 30s before sending first notification (group more alerts)
  group_interval: 5m    # wait 5m before sending new notifications for existing group
  repeat_interval: 4h   # re-notify if still firing after 4h
  receiver: slack-ops

  routes:
    - match:
        severity: page
      receiver: pagerduty
      continue: false

    - match:
        severity: ticket
      receiver: jira-webhook

receivers:
  - name: pagerduty
    pagerduty_configs:
      - service_key: '<key>'

  - name: slack-ops
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

---

## Incident Response Lifecycle

### Phase 1 — Detection

An incident begins when something alerts or when a user reports a problem. Early detection sources:
- Automated alerts (Alertmanager, PagerDuty, CloudWatch)
- User reports (support tickets, status page comments)
- Internal reports (engineer notices anomaly)
- Synthetic monitoring (probe fails from external location)

When you receive an alert, the first question is: **is this a real user-facing incident?**
Check: error rate, latency P99, user-facing dashboards. Do not start an incident war room because disk is at 82%.

### Phase 2 — Triage

Triage answers three questions:
1. **Severity**: How many users are affected? Is it complete outage or degradation?
2. **Scope**: Which services, regions, user segments are affected?
3. **Trajectory**: Is it getting worse, stable, or improving?

**Incident severity levels (common model):**

| Level | Definition | Response |
|-------|-----------|---------|
| SEV1 | Complete outage, all users affected | Immediate all-hands |
| SEV2 | Significant degradation or partial outage | On-call team engaged now |
| SEV3 | Minor degradation, workaround available | Fix during business hours |
| SEV4 | Cosmetic or non-impactful | Next sprint |

### Phase 3 — Response and Mitigation

Mitigation is stopping the bleeding. Root cause can come later.

**Mitigation actions (in order of preference):**
1. Rollback the last deploy (most reliable, if a deploy caused it)
2. Feature flag disable (if the feature is behind a flag)
3. Route traffic around bad nodes/pods
4. Scale out (if traffic increase is the cause)
5. Shed load / rate limit (buy time while you investigate)
6. Restart pods / services (last resort — you lose state and logs)

**The Incident Commander role:**
In a large incident, one person coordinates. They do not debug — they delegate. Roles:
- **Incident Commander (IC)**: coordinates, makes decisions, communicates status
- **Tech Lead**: leads technical investigation
- **Comms Lead**: updates status page, talks to stakeholders

### Phase 4 — Communication

During an incident:
- Post an update every 15-30 minutes, even if it just says "still investigating"
- Update the status page before internal stakeholders start asking
- Be specific: "We are seeing 12% error rate on /api/checkout for users in US-East, investigating database connection pool" is better than "We are experiencing issues"

### Phase 5 — Resolution

An incident is resolved when:
- User-facing metrics return to baseline
- SLO burn rate returns to normal
- You can explain what happened (even if a full RCA is pending)

Do not close an incident just because metrics look OK — you must understand why it happened, or it will recur.

### Phase 6 — Post-Mortem

A post-mortem (or "post-incident review") documents:
1. What happened (timeline)
2. Why it happened (root cause chain — use 5 Whys)
3. What mitigated it
4. What actions prevent recurrence

**Post-mortem template:**
```markdown
## Incident Summary
- Date: 2024-03-15
- Duration: 47 minutes (14:23 – 15:10 UTC)
- Severity: SEV2
- Impact: 8% error rate on checkout service, ~3,200 users affected

## Timeline
- 14:23 — Alert fired: checkout error rate > 1% (was 8%)
- 14:25 — On-call engineer acknowledged, started investigation
- 14:31 — Identified: connection pool exhaustion on checkout→payments DB
- 14:38 — Increased pool size via config change, deployed
- 15:10 — Error rate returned to baseline
- 15:15 — Incident closed

## Root Cause
Connection pool was sized for 100 concurrent connections. Traffic increased after a
marketing campaign drove 4x normal checkout volume. Pool exhausted → requests queued
→ timeouts → 5xx errors.

## 5 Whys
1. Why did requests fail? → connection pool exhausted
2. Why was pool exhausted? → pool size was static, traffic grew
3. Why was pool size not adjusted? → no process to review pool sizing when traffic forecasts change
4. Why no process? → infrastructure was originally sized for B2B, consumer traffic patterns not anticipated
5. Why not anticipated? → business model change happened faster than infra capacity review cycle

## Action Items
| Action | Owner | Due |
|--------|-------|-----|
| Add connection pool metrics and alert when pool is >80% utilized | Platform | 2024-03-22 |
| Implement dynamic pool sizing (PgBouncer) | DB team | 2024-04-01 |
| Add traffic growth threshold that triggers infra review | Capacity | 2024-03-29 |
```

**Post-mortem culture:**
- No blame — the goal is system improvement, not individual punishment
- Every incident should produce at least 1 action item
- Action items must be tracked to completion (not just written and forgotten)
- Blameless does not mean consequence-free — just means the process is about learning

---

## Grafana Dashboards

### Dashboard Design Principles

A good dashboard answers a specific question in under 10 seconds. Bad dashboards show everything; good dashboards show what matters.

Structure for a service dashboard:
1. **Top row**: RED metrics (rate, errors, duration) — service health at a glance
2. **Second row**: Resource metrics (CPU, memory, pod restarts) — infrastructure health
3. **Third row**: Dependency health (database latency, external API error rate)
4. **Bottom**: Logs panel (recent errors from Loki)

```json
// Example Grafana panel for error rate
{
  "title": "Error Rate",
  "type": "timeseries",
  "targets": [{
    "expr": "rate(http_requests_total{status=~'5..', service='checkout'}[5m]) / rate(http_requests_total{service='checkout'}[5m])",
    "legendFormat": "error rate"
  }],
  "fieldConfig": {
    "defaults": {
      "unit": "percentunit",
      "thresholds": {
        "steps": [
          {"color": "green", "value": 0},
          {"color": "yellow", "value": 0.001},
          {"color": "red", "value": 0.01}
        ]
      }
    }
  }
}
```

### Useful Dashboard Variables

Use Grafana template variables for environment, service, and time range so one dashboard serves all services:

```
Variable: service
Type: query
Query: label_values(http_requests_total, service)

Variable: env
Type: custom
Values: prod,staging,dev
```

Then use `$service` and `$env` in all panel queries.

---

## Synthetic Monitoring and Probes

Metrics and logs are internal signals. Synthetic monitoring tests from outside:

- **Blackbox exporter** (Prometheus): HTTP, TCP, ICMP, DNS probes from external locations
- **Uptime checks** (GCP/AWS): multi-region HTTP probes with alerting
- **End-to-end synthetic transactions**: simulate a user login, checkout flow, etc.

Synthetic monitoring catches:
- DNS failures (your metrics might be fine but DNS is broken)
- TLS certificate expiry (your service is up, but browsers reject the cert)
- Geographic routing failures (US works, EU doesn't)
- CDN misconfiguration

```yaml
# blackbox_exporter probe
scrape_configs:
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://api.example.com/health
          - https://api.example.com/checkout
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

---

## Common Failure Modes

**Alert fatigue:** Too many low-signal alerts → on-call ignores them → real incidents missed. Fix: audit alerts regularly, delete any alert that fired 5 times without causing a page-worthy incident.

**Missing the user-facing symptom:** All internal metrics look fine but users can't checkout. This happens when internal metrics don't cover the actual user path. Fix: always have a synthetic transaction probe that tests the real user flow.

**P99 hiding P999:** P99 latency is 200ms, looks fine. But 0.1% of requests (your P999) take 30 seconds. If you have 10,000 users, 10 are suffering. Fix: alert on P99 and inspect P999 dashboards during incidents.

**SLO window mismatch:** Alert fires immediately on a 1-minute window, but SLO is measured over 28 days. The alert causes panic for a problem that consumed 0.001% of the error budget. Fix: use burn rate alerts, not threshold alerts on short windows.

**Log without context:** "Error processing request" with no trace ID, no user ID, no request details. You know something went wrong but cannot diagnose it. Fix: enforce structured logging standards with required fields.

**Trace sampling drops the failing request:** Error rate is 1%, sampling rate is 1%, probability that you sample a failing request is 0.01%. You have metrics showing errors but no traces to debug. Fix: always sample traces that resulted in errors (100% error trace sampling).

---

## Key Questions and Answers

**Q: What is the difference between an SLI, SLO, and SLA?**

An SLI is the metric itself — the measured signal (e.g., "fraction of requests completing in under 200ms"). An SLO is the target for that metric over a time window ("99.9% of requests complete in under 200ms over 28 days"). An SLA is the business contract — the externally-promised level, always set looser than the SLO so internal incidents don't automatically trigger SLA violations.

**Q: Why use error budget burn rate alerts instead of threshold alerts?**

A threshold alert like "error rate > 1%" doesn't account for how long it's been happening or how much of your SLO budget it's consuming. A burn rate of 14x means you're burning through your entire monthly error budget in ~2 days — that warrants immediate action. A burn rate of 1x means you're exactly on target — no action needed. Burn rate connects operational signals directly to business commitments.

**Q: How do you design an on-call rotation that doesn't burn out engineers?**

Ensure alerts are actionable — every page requires a human decision, nothing automatic. Measure and limit interrupt load (pager volume per shift). Rotate frequently so no one is permanently on-call. Conduct a weekly on-call review to fix flapping or noisy alerts. Give engineers time-in-lieu or comp time for overnight pages. The goal is that on-call is boring — if it's not boring, you have too many incidents.

**Q: Your P50 latency is fine but users are complaining about slowness. What do you look at?**

P50 being fine means the median request is fast. If users complain, check P95, P99, and P99.9 — long-tail latency often affects a small fraction but is highly visible. Also check: are complaints from a specific user segment (geographic region, authenticated users, large request payloads)? Use traces filtered to slow requests to find where time is spent. Look at request rate — are you hitting a resource limit that only affects heavy users?

**Q: What is the difference between a runbook and a post-mortem?**

A runbook is a pre-written procedure for a known failure mode: "if alert X fires, do steps 1, 2, 3". A post-mortem is a retrospective analysis of an actual incident: what happened, why, and how to prevent it. Runbooks are preventive (before/during incidents); post-mortems are corrective (after incidents). Good runbooks are generated from post-mortem action items.

**Q: How do you decide what SLO to set for a new service?**

Start with: what reliability do users actually need? Survey or analyze historical tolerance — how often do users retry, how often do they churn after errors? For internal services, negotiate with dependent teams. Set SLOs lower than your actual capability (leave a buffer). For a new service, start with a loose SLO (99.5%) and tighten it as you learn the system's actual failure modes. Never set a 99.99% SLO on a service that runs on a single VM.

---

## Points to Remember

- Observability = ability to ask novel questions about system state; monitoring = alerting on known conditions
- Four Golden Signals: latency, traffic, errors, saturation
- SLI measures, SLO targets, SLA commits
- Error budget = allowed unreliability; when exhausted, freeze features, fix reliability
- Histogram quantiles (P99) require appropriate bucket configuration
- Structured JSON logs are mandatory at scale — always include trace_id
- Alert on symptoms (user impact), not causes (internal metrics)
- Multi-window burn rate alerts: fast burn at 14x, slow burn at 3x
- Incident phases: detect → triage → mitigate → communicate → resolve → post-mortem
- Mitigation first (stop the bleeding), root cause second
- Blameless post-mortems: goal is system improvement, not individual accountability
- Synthetic probes catch failures your internal metrics cannot see
- Always sample 100% of error traces, sample successes at lower rate

## What to Study Next

- [Prometheus, Grafana, and Alertmanager](./prometheus-grafana-and-alertmanager) — deep dive on the tools
- [Linux and Network Administration](./linux-and-network-administration) — system-level debugging during incidents
- [Kubernetes GPU and AI Platforms](./kubernetes-gpu-ai-platforms-and-operators) — GPU-specific observability (DCGM, XID errors)
- [Devops Troubleshooting and Security Errors](./devops-troubleshooting-and-security-errors) — structured debugging playbook
