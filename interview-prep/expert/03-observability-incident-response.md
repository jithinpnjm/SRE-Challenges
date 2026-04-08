# Expert: Observability, Reliability Strategy, And Incidents

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
