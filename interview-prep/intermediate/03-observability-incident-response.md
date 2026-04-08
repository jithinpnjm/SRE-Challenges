# Intermediate: Observability, Alerting, SLOs, And Incident Response

This file is where observability becomes operational design and incident response becomes structured coordination.

## Mentor Mode

You are now expected to talk about:

- alert quality
- SLO-driven detection
- blackbox versus whitebox tradeoffs
- incident roles and communication
- postmortem action quality

## Where To Study And Simulate

Official references:

- Google incident management guide: https://sre.google/resources/practices-and-processes/incident-management-guide/
- Google SRE workbook, incident response: https://sre.google/workbook/incident-response/
- Google SRE book, postmortem culture: https://sre.google/sre-book/postmortem-culture/
- Google Cloud operational excellence: https://cloud.google.com/architecture/framework/operational-excellence
- Prometheus overview: https://prometheus.io/docs/introduction/overview/
- Prometheus alerting: https://prometheus.io/docs/alerting/latest/overview/
- Alertmanager docs: https://prometheus.io/docs/alerting/latest/alertmanager/
- OpenTelemetry docs: https://opentelemetry.io/docs/
- Elastic Observability: https://www.elastic.co/guide/en/observability/current/index.html

## Challenge 1: Build A Production Alert Strategy

Scenario: You inherit 250 Prometheus alerts, and only a small fraction are actionable.

Your task:

- define how you would classify and reduce them
- explain the difference between ticket alerts, page alerts, and dashboard-only alerts
- describe how Alertmanager grouping and inhibition should be used

Mentor hints:

- one useful outcome is fewer, better alerts
- duplicate paging is reliability debt

## Challenge 2: Multi-Window Burn Rate

Prompt:

- explain why multi-window, multi-burn-rate alerting is useful for SLOs
- describe an example for a user-facing API
- explain what mistakes make SLO alerts too slow or too noisy

## Challenge 3: Blackbox Versus Whitebox Signals

Scenario: A service team only wants internal metrics because "they are more precise."

Your task:

- explain the value of blackbox probing
- explain what each approach misses
- propose a balanced monitoring strategy

## Challenge 4: Incident Commander Under Ambiguity

Scenario: Several services show elevated latency, but no single team owns the full request path. Leadership asks for ETA in the first 10 minutes.

Your task:

- explain how you would structure roles and updates
- explain what you would say and what you would not say in the first status message
- explain how you keep engineers evidence-driven under pressure

Mentor hints:

- do not promise ETA before you have causal footing
- say what is known, unknown, and being tested

## Challenge 5: Better Dashboards For Troubleshooting

Scenario: Dashboards show aggregated success rate and average latency, but engineers still need to open raw logs immediately in every incident.

Your task:

- explain what is missing
- propose dashboard improvements for high-cardinality breakdowns, saturation, dependency views, and rollout correlation
- explain how to avoid making dashboards unusably noisy

## Challenge 6: Postmortem Quality Check

Prompt:

- review a hypothetical weak action item such as "improve monitoring"
- rewrite it into measurable engineering work
- explain how you would connect postmortem actions to reliability goals rather than paperwork

## Challenge 7: Rollout Correlation

Your task:

- explain how you would make dashboards clearly show deployment events, config changes, and feature flag flips

## Challenge 8: Synthetic Monitoring

Your task:

- explain what synthetic checks catch that internal metrics may miss
- explain what synthetic checks can still fail to tell you

## Challenge 9: ELK Versus Metrics-First Monitoring

Scenario: A company has strong log search through Elastic but weak metric and trace design.

Your task:

- explain what this helps with
- explain what it leaves weak
- explain how you would rebalance the stack

## Challenge 10: Incident Program Design

Scenario: A growing platform has inconsistent incident practice across teams.

Your task:

- explain the minimum standard you would establish for on-call, alerting, roles, communication, and postmortems
