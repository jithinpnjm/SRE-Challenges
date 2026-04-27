# Foundations: Observability, SLOs, And Incident Response Zero To Hero

Reliable systems are built by seeing clearly, deciding calmly, and learning continuously.

Observability gives visibility into behavior. SLOs define reliability targets. Incident response restores service under pressure.

This guide is designed as a complete path:

- Beginner: metrics, logs, traces, alerts
- Intermediate: SLIs, SLOs, dashboards, runbooks
- Advanced: burn-rate alerts, tracing strategy, incident command
- SRE Level: outages, mitigations, postmortems, alert quality
- Interview Level: explain reliability tradeoffs like a senior engineer

---

# Part 1: Memory Palace — Hospital Emergency Room

| Reliability concept | Hospital analogy | Meaning |
|---|---|---|
| Metrics | Vital signs | Quantitative health signals |
| Logs | Doctor notes | Event evidence |
| Traces | Patient journey | Request path |
| Alert | Emergency alarm | Needs action now |
| SLO | Treatment target | Reliability objective |
| Error budget | Spare risk capacity | Allowed unreliability |
| Incident Commander | Lead doctor | Coordinates response |
| Runbook | Emergency procedure | Known response steps |
| Postmortem | Case review | Learn and improve |

Senior question first:

- Are users hurting?
- How many?
- Getting worse?
- Fastest safe mitigation?

---

# Part 2: Monitoring vs Observability

Monitoring asks:

> Did a known bad thing happen?

Observability asks:

> Why is the system behaving this way?

Three core signals:

- Metrics = trends and alerting
- Logs = exact events
- Traces = distributed latency path

---

# Part 3: Golden Signals / RED / USE

## Golden Signals

- Latency
- Traffic
- Errors
- Saturation

## RED

- Rate
- Errors
- Duration

## USE

- Utilization
- Saturation
- Errors

Use RED for services. USE for infrastructure.

---

# Part 4: Metrics Foundations

Track:

- requests/sec
- error rate
- p95/p99 latency
- queue depth
- CPU/memory
- disk/network pressure

Important truth:

> Average latency can look fine while p99 is painful.

Metric types:

- Counter
- Gauge
- Histogram
- Summary

---

# Part 5: Logging Foundations

Use structured logs.

```json
{"level":"error","service":"checkout","trace_id":"abc123","message":"payment timeout"}
```

Include:

- timestamp UTC
- level
- service
- trace/request id
- useful context

Never leak secrets.

---

# Part 6: Tracing Foundations

Trace path example:

```text
frontend -> api -> auth -> payments -> db
```

Use tracing for:

- where time is spent
- failing downstream call
- user-path debugging across services

Sampling:

- 100% of errors
- reduced sampling for healthy traffic

---

# Part 7: SLI / SLO / SLA

## SLI

Measured user experience.

Example:

fraction of checkout requests succeeding under 500ms.

## SLO

99.9% over rolling 28 days.

## SLA

External commercial promise.

Usually looser than SLO.

---

# Part 8: Error Budgets

99.9% means 0.1% failure allowance.

Use it to decide risk:

- healthy budget -> ship faster
- exhausted budget -> prioritize reliability

---

# Part 9: Alerting Philosophy

Page humans only for actionable user-impacting issues.

Good pages:

- sustained error spike
- sustained p99 breach
- severe burn rate
- synthetic checkout failing

Bad pages:

- one pod restart
- CPU briefly high
- disk 70%

Alert on symptoms. Investigate causes.

---

# Part 10: Burn Rate Thinking

- 14x burn = active severe issue
- 3x burn = meaningful degradation
- 1x burn = on target

Burn-rate alerts map signals to commitments.

---

# Part 11: Dashboards That Help

Top row:

1. request rate
2. error rate
3. p95/p99 latency
4. saturation

Second row:

- pods/restarts
- CPU/memory
- queue depth

Third row:

- dependencies
- deploy markers

A dashboard should answer a question in under 10 seconds.

---

# Part 12: Incident Lifecycle

## Detect

Alert, user report, synthetic probe.

## Triage

- how many users?
- what scope?
- worsening or stable?

## Mitigate

1. rollback
2. disable feature
3. reroute traffic
4. scale out
5. shed load
6. restart last

## Communicate

Clear regular updates.

## Resolve

Metrics normal and understood.

## Learn

Postmortem with owners.

---

# Part 13: Incident Roles

| Role | Responsibility |
|---|---|
| IC | coordination |
| Tech Lead | debugging/mitigation |
| Comms | stakeholder updates |
| SMEs | focused expertise |

---

# Part 14: Real Incident Stories

## CPU High, Users Fine

Observe first. Do not auto-page.

## Errors After Deploy

Rollback quickly if confidence high.

## Users Slow, Metrics Fine

Check p99/p999, region split, traces, synthetic flows.

## Nightly Noisy Alerts

Fix alerts, not people.

---

# Part 15: Postmortems

Include:

- timeline
- impact
- root cause chain
- what mitigated it
- prevention actions
- owners + due dates

Blameless means improve systems, not ignore accountability.

---

# Part 16: Tools To Know

- Prometheus
- Grafana
- Alertmanager
- Loki
- OpenSearch/Elasticsearch
- OpenTelemetry
- Jaeger / Tempo
- PagerDuty / Opsgenie

---

# Part 17: Interview Questions

- Monitoring vs observability?
- Good SLI for checkout?
- Why averages mislead?
- Why burn-rate alerts?
- How run a SEV1?
- How reduce alert fatigue?

---

# Part 18: Labs

## Beginner

- build one service dashboard
- add latency/error alerts
- add structured logs

## Intermediate

- define SLO + budget
- add synthetic probe
- trace slow endpoint

## Advanced

- burn-rate alerts
- mock incident drill
- write postmortem
- remove 50% noisy alerts

---

# Part 19: Senior Answer Shape

> I page only on user-impacting symptoms tied to SLO risk, then use metrics, logs, and traces to narrow blast radius quickly. During incidents I prioritize mitigation over elegant root-cause hunting, communicate clearly, and convert outages into tracked reliability improvements.

---

# Recall Prompts

- Why is p99 often better than average?
- Why should alerts map to actions?
- What does error budget buy you?
- Why rollback before deep debugging sometimes?
- Why do postmortems need owners?
