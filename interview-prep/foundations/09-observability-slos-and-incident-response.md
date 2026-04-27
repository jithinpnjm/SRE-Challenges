# Observability, SLOs, and Incident Response

Observability is how you understand the hidden state of a production system through the signals it emits.

Monitoring tells you **that** something looks wrong.
Observability helps you understand **why** it is wrong.

The easiest way to remember this discipline is to think like emergency medicine.

---

## What This Foundation Must Help You Do

By the end of this guide, you should be able to:

- identify user-impacting incidents quickly
- separate symptoms from causes
- design SLIs, SLOs, alerts, and dashboards that matter
- use metrics, logs, traces, and profiles together
- lead or support incidents calmly
- explain reliability tradeoffs in interviews

---

## Memory Palace: Observability Is An Emergency Room

Imagine your production platform as a hospital emergency department.

| Observability concept | Emergency room analogy | Production meaning |
|---|---|---|
| Metrics | Vital signs monitor | Continuous health signals |
| Logs | Patient chart / nurse notes | Event history |
| Traces | Patient movement through departments | Request path across services |
| Profiles | MRI / deep scan | CPU or memory hotspots |
| Alert | Alarm bell | Immediate attention needed |
| Dashboard | ICU monitor wall | Fast situational awareness |
| SLI | Meaningful health measurement | User-facing quality metric |
| SLO | Healthy operating range | Reliability target |
| Error budget | Acceptable treatment risk window | Allowed unreliability |
| On-call engineer | Emergency responder | First operator engaged |
| Incident commander | Lead doctor | Coordinates response |
| Mitigation | Stabilize patient | Reduce user impact first |
| Root cause | Diagnosis | Underlying mechanism |
| Postmortem | Case review | Learn and improve system |

### Story: Alarm Bells Ringing

A junior responder says: “CPU is high, that must be the incident.”

A senior responder asks:

1. Are users actually in pain? Errors, latency, availability.
2. Which vital sign moved first?
3. Is this one patient or many? Scope/blast radius.
4. Do we stabilize first or investigate first?
5. Which signal proves recovery?

Technical translation:

- internal metrics can be noisy without user impact
- page on symptoms, investigate causes
- mitigation often matters before perfect diagnosis
- recovery should be measured, not assumed

---

## Senior Mental Model

During an incident, think in this order:

1. **User impact** — who is affected and how badly?
2. **Scope** — one service, one region, one dependency, or global?
3. **Trajectory** — getting worse, stable, or improving?
4. **Fast mitigation** — rollback, route around, scale, disable feature, rate limit.
5. **Evidence path** — metrics, logs, traces, deploy history, config changes.
6. **Communication** — clear updates on cadence.

A senior operator does not chase every graph. They find the smallest set of signals that explain user pain.

---

## Core Signals: The Four Golden Signals

| Signal | ER analogy | Meaning |
|---|---|---|
| Latency | Time until treatment | How long requests take |
| Traffic | Number of incoming patients | Demand/load |
| Errors | Failed treatments | Failed requests/events |
| Saturation | Beds/staff almost full | Capacity pressure |

If these four look healthy, users are often healthy.

---

## SLI, SLO, SLA, Error Budget

## SLI: Meaningful Health Measurement

Examples:

- fraction of checkout requests completed under 500ms with 2xx
- fraction of DNS queries answered under 10ms
- fraction of jobs completed successfully

Bad examples:

- CPU utilization alone
- “service up” binary only
- internal queue depth without user mapping

## SLO: Healthy Operating Range

Example:

> 99.9% of checkout requests succeed within 500ms over 28 days.

## SLA: External Promise

Usually looser than internal SLO.

## Error Budget: Acceptable Risk Window

For 99.9% monthly availability, you can spend ~43 minutes of downtime per 30 days.

Use it to answer:

- Can we deploy aggressively right now?
- Should we pause features and improve reliability?
- Is this risk worth spending budget on?

---

## Metrics, Logs, Traces, Profiles

## Metrics = Vital Signs

Good for trends, alerting, rates, percentiles, saturation.

Examples:

- request rate
- p95 / p99 latency
- error rate
- CPU / memory / queue depth

## Logs = Patient Chart

Good for exact events and narratives.

Use structured logs with:

- timestamp
- level
- service
- trace_id
- request_id
- meaningful message

## Traces = Patient Journey

Good for distributed latency.

Example:

Frontend request = 800ms total
- auth = 5ms
- inventory = 15ms
- payment = 760ms

Now you know where time was spent.

## Profiles = Deep Scan

Good for CPU hotspots, memory leaks, allocator pressure.

---

## Fast Incident Triage Flow

## 1. Confirm Real User Impact

```bash
# examples
error-rate dashboard
latency dashboard
synthetic probe status
```

Ask:

- are users failing?
- how many?
- where?

## 2. Check Recent Changes

- deploys
- config flips
- infra changes
- traffic spikes
- dependency incidents

## 3. Stabilize First

Typical mitigation order:

1. rollback recent deploy
2. disable feature flag
3. route around bad zone/node
4. scale out
5. shed load / rate limit
6. restart only when justified

## 4. Investigate Root Cause Signals

Use:

- metrics for scope and timing
- logs for errors
- traces for latency path
- infra metrics for resource pressure

## 5. Communicate On Cadence

Every 15–30 minutes during active incidents.

---

## Alert Design: Alarm Bells That Matter

## Page On Symptoms

Good paging alerts:

- error rate above threshold with user impact
- p99 latency above SLO threshold
- SLO burn rate too high
- synthetic checkout/login failing

## Warn On Causes

Good non-paging alerts:

- disk at 80%
- CPU elevated
- pod restarts increasing
- queue growing slowly

## Burn Rate Thinking

If you burn your monthly budget 14x faster than allowed, that deserves immediate action.

This connects alerts to business commitments instead of arbitrary thresholds.

---

## Dashboard Design

A good dashboard answers one question in under 10 seconds.

Recommended layout:

1. Top row: rate, errors, latency, availability
2. Second row: CPU, memory, restarts, saturation
3. Third row: dependencies (DB/cache/external API)
4. Bottom row: recent logs and deploy markers

Bad dashboards try to show everything.

---

## Real Incident Stories

## Scenario 1: CPU Is High But Users Fine

Wrong assumption: page the team.

Better path:

- check errors and latency first
- if users healthy, create warning not page
- investigate batch jobs or autoscaling lag

## Scenario 2: P50 Looks Fine But Complaints Continue

Wrong assumption: no incident.

Better path:

- inspect p95/p99/p99.9
n- segment by region/user cohort/path
- inspect traces for slow outliers

Likely cause:

Long-tail latency hurting a minority of users.

## Scenario 3: Error Spike After Deploy

Wrong assumption: keep debugging new metrics forever.

Better path:

- compare deploy time with signal change
- rollback first if confidence high
- confirm recovery with metrics

## Scenario 4: Internal Metrics Healthy, Checkout Broken

Wrong assumption: false report.

Better path:

- check synthetic transaction
- inspect DNS/TLS/external dependencies
- verify real user path end-to-end

---

## Incident Roles

| Role | Responsibility |
|---|---|
| Incident Commander | Coordinate response and decisions |
| Technical Lead | Run investigation and mitigation |
| Communications Lead | Stakeholder/status updates |
| Scribe | Timeline capture |

Small incidents may combine roles.

---

## Postmortem Thinking

A useful review includes:

1. what happened
2. impact and duration
3. timeline
4. root cause chain
5. what mitigated it
6. what prevents recurrence
7. owners and deadlines

Blameless does not mean careless. It means optimize the system, not punish hindsight.

---

## Command / Tool Interpretation Table

| Tool | What it answers | Bad signs | Next step |
|---|---|---|---|
| Metrics dashboard | Are users hurting now? | errors/latency spike | scope + mitigation |
| Logs query | What exact failures occur? | repeated exceptions/timeouts | correlate deploy/dependency |
| Trace search | Where is time spent? | one span dominates | inspect dependency |
| Alertmanager/Pager | What fired and when? | repeated flaps | tune alerts |
| Synthetic probe | Can real path complete? | login/checkout fail | inspect path components |
| Deploy history | What changed? | signal shift after release | rollback/canary compare |

---

## Kubernetes / Cloud Connection

- Pod restarts without impact should not always page.
- One bad AZ can show regional symptoms first.
- DNS, TLS, or LB failures may bypass app metrics.
- Autoscaling lag appears as saturation then latency.
- Service mesh traces help isolate cross-service delays.

---

## Hands-On Drill

Pick one service dashboard and answer:

1. What metric would wake you at 3am?
2. What metric should only create a ticket?
3. What graph proves user recovery?
4. What panel is missing?

Then simulate an incident and narrate response steps.

---

## Interview Answer Shape

If asked, “How would you design observability for a checkout API?” a strong answer is:

> I would begin with user-facing SLIs: success rate and latency for the checkout path. I’d define an SLO and alert on burn rate or sustained user-impacting errors rather than raw CPU. Then I’d instrument RED metrics, structured logs with trace IDs, distributed tracing across payment and inventory dependencies, and synthetic checkout probes. Dashboards would show rate, errors, duration, saturation, dependencies, and deploy markers so responders can move from symptom to cause quickly.

---

## Recall Prompts

- In the ER model, what is an SLO?
- Why should high CPU not always trigger a page?
- Why can p50 look healthy while users complain?
- What does a trace reveal that logs may not?
- What metric confirms mitigation worked?

---

## What To Study Next

- Prometheus, Grafana, and Alertmanager
- Linux and network administration
- Kubernetes troubleshooting
- DevOps troubleshooting and security errors
