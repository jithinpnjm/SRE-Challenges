# Expert: Observability, Reliability Strategy, Incident Management, And Learning Systems

This file is for staff-level reliability thinking across services and teams, not just one service dashboard or one incident.

## Mentor Mode

At this level, you are designing reliability behavior across the organization.

That means:

- SLOs shape engineering tradeoffs
- alert policy shapes on-call pain and response quality
- incident management shapes coordination under pressure
- postmortems shape whether reliability actually improves

## Where To Study And Simulate

Official references:

- Google incident management guide: https://sre.google/resources/practices-and-processes/incident-management-guide/
- Google SRE workbook, incident response: https://sre.google/workbook/incident-response/
- Google SRE book, postmortem culture: https://sre.google/sre-book/postmortem-culture/
- Google Cloud operational excellence: https://cloud.google.com/architecture/framework/operational-excellence
- Prometheus alerting docs: https://prometheus.io/docs/alerting/latest/overview/
- Alertmanager docs: https://prometheus.io/docs/alerting/latest/alertmanager/
- OpenTelemetry docs: https://opentelemetry.io/docs/
- Elastic Observability: https://www.elastic.co/guide/en/observability/current/index.html

## Challenge 1: Executive Reliability Strategy

Scenario: Leadership wants fewer incidents, but teams already complain about alert fatigue and reliability work competing with product delivery.

Your task:

- explain how SLOs, error budgets, and reliability ownership can align engineering priorities
- explain what not to measure
- explain how you would prevent the program from becoming vanity reporting

## Challenge 2: Global Incident With Partial Visibility

Scenario: Customer reports indicate global slowness, but your telemetry is patchy in one region and a tracing backend is degraded.

Your task:

- explain how you operate with incomplete observability
- explain what fallback signals matter
- explain how to communicate uncertainty without freezing action

Mentor hints:

- graceful observability degradation is itself part of senior design

## Challenge 3: Alert Architecture Review

Scenario: A platform spans infrastructure alerts, service alerts, synthetic checks, and SLO burn alerts. Different teams page for the same event.

Your task:

- design a cleaner alert ownership model
- explain routing, deduplication, inhibition, and escalation principles
- explain how you reduce duplicate paging without hiding real risk

## Challenge 4: Postmortem At Scale

Scenario: Multiple serious incidents recur with different technical triggers but similar organizational failure patterns.

Your task:

- explain how you would mine postmortems for cross-cutting themes
- explain how to prioritize actions across teams
- explain how to verify that reliability actually improves

## Challenge 5: Low-Latency Observability

Scenario: You support a latency-sensitive path where adding too much instrumentation can itself become a problem.

Your task:

- explain what telemetry you would keep hot-path, sampled, deferred, or removed
- explain how to preserve debuggability without destroying performance

## Challenge 6: Incident Commander Pressure Test

Prompt:

- describe how you would run a severe incident bridge with strong personalities, incomplete data, and frequent leadership pings
- explain how you protect the technical work while maintaining trust

## Challenge 7: Telemetry Budget

Your task:

- explain how you decide what telemetry is worth paying for in cardinality, CPU, and storage

## Challenge 8: Cross-Team Alert Ownership

Your task:

- explain how you would assign ownership for alerts on shared services and platform dependencies

## Challenge 9: OpenTelemetry And ELK Strategy

Scenario: The company uses multiple telemetry tools, some teams love Elastic, some want OpenTelemetry everywhere, and leadership wants one coherent observability story.

Your task:

- explain where standardization matters
- explain where multiple backends may still be acceptable
- explain how you would keep instrumentation, schema, and routing sane

## Challenge 10: Staff-Level Reliability Review

Scenario: You inherit a platform with many dashboards, many alerts, inconsistent on-call quality, weak SLOs, and recurring multi-team incidents.

Your task:

- identify the largest reliability-program gaps
- explain what you would standardize first
- explain how you would show measurable improvement in six months
